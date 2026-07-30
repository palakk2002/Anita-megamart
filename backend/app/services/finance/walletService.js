import Wallet from "../../models/wallet.js";
import Payout from "../../models/payout.js";
import Order from "../../models/order.js";
import User from "../../models/customer.js";
import Transaction from "../../models/transaction.js";
import Notification from "../../models/notification.js";
import FinanceAuditLog from "../../models/financeAuditLog.js";
import {
  LEDGER_DIRECTION,
  LEDGER_TRANSACTION_TYPE,
  FINANCE_AUDIT_ACTION,
  ORDER_PAYMENT_STATUS,
  OWNER_TYPE,
  PAYOUT_STATUS,
  PAYOUT_TYPE,
  WALLET_STATUS,
} from "../../constants/finance.js";
import { addMoney, clampMoney, roundCurrency } from "../../utils/money.js";
import { createLedgerEntry } from "./ledgerService.js";

function normalizeOwnerId(ownerType, ownerId) {
  if (ownerType === OWNER_TYPE.ADMIN) return null;
  return ownerId || null;
}

function assertPositiveAmount(amount) {
  const normalized = roundCurrency(amount);
  if (normalized <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  return normalized;
}

/**
 * Phase 4 P4-3 — keep the legacy `User.walletBalance` field in sync with
 * the canonical `Wallet({ownerType:"CUSTOMER"})` document whenever the
 * wallet is mutated for a customer.
 *
 * Old code paths that directly mutate `User.walletBalance` (e.g.
 * `orderPlacementService` line ~445 — wallet redemption at checkout) are
 * NOT affected by this helper; they continue to update the User document
 * themselves. Phase 4b will migrate those call sites to walletService and
 * the User-side write will then be the only authority.
 *
 * Callers that already mutate User.walletBalance can opt out by passing
 * `syncUserWalletBalance: false` to avoid double-counting.
 */
async function maybeSyncUserWalletBalance({
  ownerType,
  ownerId,
  signedDelta,
  syncUserWalletBalance,
  session,
}) {
  if (syncUserWalletBalance === false) return;
  if (ownerType !== OWNER_TYPE.CUSTOMER) return;
  if (!ownerId) return;
  if (!signedDelta || !Number.isFinite(signedDelta)) return;

  const inc = roundCurrency(signedDelta);
  if (inc === 0) return;

  // Use $inc so concurrent wallet movements compose correctly without
  // a read-modify-write race. We deliberately do NOT throw if the user
  // doesn't exist — the canonical Wallet write has already succeeded
  // and a missing user row is a pre-existing data anomaly that should
  // not abort the money flow.
  try {
    await User.updateOne(
      { _id: ownerId },
      { $inc: { walletBalance: inc } },
      session ? { session } : {},
    );
  } catch (error) {
    // Surface as a soft log only — the wallet (canonical) is already
    // correct. Drift will be caught by the P2-9 verifier.
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[walletService] User.walletBalance sync failed; canonical Wallet is authoritative",
        { userId: String(ownerId), inc, error: error.message },
      );
    }
  }
}

/**
 * Phase 2 P2-1: helper that creates a paired LedgerEntry for a wallet
 * movement. Callers can opt-in by passing `ledgerType`. When `ledgerType`
 * is omitted the helper is a no-op so legacy callers (e.g. orderFinanceService
 * which writes its own ledger row right after the wallet save) keep working.
 *
 * Every field after `ledgerType` is optional and only forwarded if present.
 */
async function maybeWriteLedgerEntry({
  wallet,
  ownerType,
  ownerId,
  before,
  after,
  amount,
  direction,
  ledgerType,
  ledgerStatus,
  ledgerReference,
  ledgerDescription,
  orderId,
  payoutId,
  paymentMode,
  metadata,
  idempotencyKey,
  correlationId,
  session,
}) {
  if (!ledgerType) return null;
  return createLedgerEntry(
    {
      orderId: orderId || null,
      payoutId: payoutId || null,
      walletId: wallet?._id || null,
      actorType: ownerType,
      actorId: ownerId || null,
      type: ledgerType,
      direction,
      amount,
      ...(ledgerStatus ? { status: ledgerStatus } : {}),
      paymentMode: paymentMode || null,
      metadata: metadata || {},
      description: ledgerDescription || "",
      reference: ledgerReference || "",
      balanceBefore: before,
      balanceAfter: after,
      idempotencyKey: idempotencyKey || null,
      correlationId: correlationId || null,
    },
    { session },
  );
}

export async function getOrCreateWallet(ownerType, ownerId, { session } = {}) {
  const normalizedOwnerId = normalizeOwnerId(ownerType, ownerId);
  const query = {
    ownerType,
    ownerId: normalizedOwnerId,
  };
  const options = {};
  if (session) options.session = session;

  let wallet = await Wallet.findOne(query, null, options);
  if (!wallet) {
    wallet = await Wallet.create(
      [
        {
          ownerType,
          ownerId: normalizedOwnerId,
          availableBalance: 0,
          pendingBalance: 0,
          cashInHand: 0,
          totalCredited: 0,
          totalDebited: 0,
          status: WALLET_STATUS.ACTIVE,
        },
      ],
      options,
    );
    wallet = wallet[0];
  }
  return wallet;
}

export async function creditWallet({
  ownerType,
  ownerId,
  amount,
  bucket = "available",
  session,
  // Phase 2 P2-1: opt-in ledger metadata. When `ledgerType` is provided
  // we emit a LedgerEntry inside the same session so the wallet save
  // and the ledger row commit (or roll back) together.
  ledgerType = null,
  ledgerStatus = null,
  ledgerReference = "",
  ledgerDescription = "",
  orderId = null,
  payoutId = null,
  paymentMode = null,
  metadata = null,
  idempotencyKey = null,
  correlationId = null,
  // Phase 4 P4-3: dual-write to legacy `User.walletBalance`. Default ON
  // (additive — no caller relied on the old behaviour); flip to `false`
  // if the caller already writes User.walletBalance directly.
  syncUserWalletBalance = true,
}) {
  const normalizedAmount = assertPositiveAmount(amount);
  const wallet = await getOrCreateWallet(ownerType, ownerId, { session });

  if (wallet.status !== WALLET_STATUS.ACTIVE) {
    throw new Error("Wallet is not active");
  }

  const before = wallet[`${bucket}Balance`];
  wallet[`${bucket}Balance`] = addMoney(before, normalizedAmount);
  wallet.totalCredited = addMoney(wallet.totalCredited, normalizedAmount);

  await wallet.save({ session });

  const beforeRounded = roundCurrency(before);
  const afterRounded = roundCurrency(wallet[`${bucket}Balance`]);

  const ledgerEntry = await maybeWriteLedgerEntry({
    wallet,
    ownerType,
    ownerId,
    before: beforeRounded,
    after: afterRounded,
    amount: normalizedAmount,
    direction: LEDGER_DIRECTION.CREDIT,
    ledgerType,
    ledgerStatus,
    ledgerReference,
    ledgerDescription,
    orderId,
    payoutId,
    paymentMode,
    metadata,
    idempotencyKey,
    correlationId,
    session,
  });

  // Phase 4 P4-3: legacy mirror. Only applies for the `available` bucket
  // since User.walletBalance only ever represented the available balance.
  if (bucket === "available") {
    await maybeSyncUserWalletBalance({
      ownerType,
      ownerId,
      signedDelta: normalizedAmount,
      syncUserWalletBalance,
      session,
    });
  }

  return {
    wallet,
    amount: normalizedAmount,
    before: beforeRounded,
    after: afterRounded,
    bucket,
    ledgerEntry,
  };
}

export async function debitWallet({
  ownerType,
  ownerId,
  amount,
  bucket = "available",
  session,
  ledgerType = null,
  ledgerStatus = null,
  ledgerReference = "",
  ledgerDescription = "",
  orderId = null,
  payoutId = null,
  paymentMode = null,
  metadata = null,
  idempotencyKey = null,
  correlationId = null,
  // Phase 4 P4-3: dual-write to legacy `User.walletBalance`. See creditWallet.
  syncUserWalletBalance = true,
}) {
  const normalizedAmount = assertPositiveAmount(amount);
  const wallet = await getOrCreateWallet(ownerType, ownerId, { session });

  if (wallet.status !== WALLET_STATUS.ACTIVE) {
    throw new Error("Wallet is not active");
  }

  const field = `${bucket}Balance`;
  const before = roundCurrency(wallet[field] || 0);
  if (before < normalizedAmount) {
    throw new Error(`Insufficient ${bucket} balance`);
  }

  wallet[field] = roundCurrency(before - normalizedAmount);
  wallet.totalDebited = addMoney(wallet.totalDebited, normalizedAmount);
  await wallet.save({ session });

  const afterRounded = roundCurrency(wallet[field]);

  const ledgerEntry = await maybeWriteLedgerEntry({
    wallet,
    ownerType,
    ownerId,
    before,
    after: afterRounded,
    amount: normalizedAmount,
    direction: LEDGER_DIRECTION.DEBIT,
    ledgerType,
    ledgerStatus,
    ledgerReference,
    ledgerDescription,
    orderId,
    payoutId,
    paymentMode,
    metadata,
    idempotencyKey,
    correlationId,
    session,
  });

  if (bucket === "available") {
    await maybeSyncUserWalletBalance({
      ownerType,
      ownerId,
      signedDelta: -normalizedAmount,
      syncUserWalletBalance,
      session,
    });
  }

  return {
    wallet,
    amount: normalizedAmount,
    before,
    after: afterRounded,
    bucket,
    ledgerEntry,
  };
}

export async function movePendingToAvailable({
  ownerType,
  ownerId,
  amount,
  session,
  ledgerType = null,
  ledgerStatus = null,
  ledgerReference = "",
  ledgerDescription = "",
  orderId = null,
  payoutId = null,
  paymentMode = null,
  metadata = null,
  idempotencyKey = null,
  correlationId = null,
  // Phase 4 P4-3: dual-write to legacy `User.walletBalance`. See creditWallet.
  syncUserWalletBalance = true,
}) {
  const normalizedAmount = assertPositiveAmount(amount);
  const wallet = await getOrCreateWallet(ownerType, ownerId, { session });

  if (wallet.pendingBalance < normalizedAmount) {
    throw new Error("Insufficient pending balance");
  }

  const pendingBefore = roundCurrency(wallet.pendingBalance);
  const availableBefore = roundCurrency(wallet.availableBalance);

  wallet.pendingBalance = roundCurrency(wallet.pendingBalance - normalizedAmount);
  wallet.availableBalance = roundCurrency(wallet.availableBalance + normalizedAmount);
  await wallet.save({ session });

  // Phase 4 P4-3: legacy mirror — pending→available is a net increase
  // to the available bucket which is what `User.walletBalance` tracks.
  await maybeSyncUserWalletBalance({
    ownerType,
    ownerId,
    signedDelta: normalizedAmount,
    syncUserWalletBalance,
    session,
  });

  const ledgerEntry = await maybeWriteLedgerEntry({
    wallet,
    ownerType,
    ownerId,
    // For a pending-to-available move we report the available-bucket
    // before/after — that's the bucket the customer/admin actually sees.
    before: availableBefore,
    after: roundCurrency(wallet.availableBalance),
    amount: normalizedAmount,
    direction: LEDGER_DIRECTION.CREDIT,
    ledgerType,
    ledgerStatus,
    ledgerReference,
    ledgerDescription,
    orderId,
    payoutId,
    paymentMode,
    metadata: {
      ...(metadata || {}),
      bucket: "pending->available",
      pendingBefore,
      pendingAfter: roundCurrency(wallet.pendingBalance),
    },
    idempotencyKey,
    correlationId,
    session,
  });

  return {
    wallet,
    amount: normalizedAmount,
    pendingBefore,
    pendingAfter: roundCurrency(wallet.pendingBalance),
    availableBefore,
    availableAfter: roundCurrency(wallet.availableBalance),
    ledgerEntry,
  };
}

export async function updateCashInHand({
  ownerType,
  ownerId,
  deltaAmount,
  session,
  ledgerType = null,
  ledgerStatus = null,
  ledgerReference = "",
  ledgerDescription = "",
  orderId = null,
  payoutId = null,
  paymentMode = null,
  metadata = null,
  idempotencyKey = null,
  correlationId = null,
}) {
  const wallet = await getOrCreateWallet(ownerType, ownerId, { session });
  const delta = roundCurrency(deltaAmount || 0);
  if (delta === 0) {
    return {
      wallet,
      before: roundCurrency(wallet.cashInHand || 0),
      after: roundCurrency(wallet.cashInHand || 0),
      delta: 0,
      ledgerEntry: null,
    };
  }

  const before = roundCurrency(wallet.cashInHand || 0);
  wallet.cashInHand = clampMoney(before + delta, 0);
  await wallet.save({ session });

  const afterRounded = roundCurrency(wallet.cashInHand);

  const ledgerEntry = await maybeWriteLedgerEntry({
    wallet,
    ownerType,
    ownerId,
    before,
    after: afterRounded,
    amount: Math.abs(delta),
    direction: delta >= 0 ? LEDGER_DIRECTION.CREDIT : LEDGER_DIRECTION.DEBIT,
    ledgerType,
    ledgerStatus,
    ledgerReference,
    ledgerDescription,
    orderId,
    payoutId,
    paymentMode,
    metadata: { ...(metadata || {}), bucket: "cashInHand", delta },
    idempotencyKey,
    correlationId,
    session,
  });

  return {
    wallet,
    before,
    after: afterRounded,
    delta,
    ledgerEntry,
  };
}

export async function getAdminFinanceSummary() {
  const adminWallet = await getOrCreateWallet(OWNER_TYPE.ADMIN, null);

  const [
    onlineCollection,
    codReconciled,
    adminEarning,
    pendingPayouts,
    systemFloatCOD,
    platformGross,
    bonusStats,
    redeemedStats,
  ] =
    await Promise.all([
      Order.aggregate([
        {
          $match: {
            paymentMode: "ONLINE",
            paymentStatus: ORDER_PAYMENT_STATUS.PAID,
          },
        },
        { $group: { _id: null, amount: { $sum: "$paymentBreakdown.grandTotal" } } },
      ]),
      Order.aggregate([
        { $match: { paymentMode: "COD" } },
        { $group: { _id: null, amount: { $sum: "$paymentBreakdown.codRemittedAmount" } } },
      ]),
      Order.aggregate([
        // Requirement: Total Admin Earning should not include COD orders.
        { $match: { status: "delivered", paymentMode: "ONLINE" } },
        { $group: { _id: null, amount: { $sum: "$paymentBreakdown.platformTotalEarning" } } },
      ]),
      Payout.aggregate([
        { $match: { status: { $in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PROCESSING] } } },
        { $group: { _id: "$payoutType", amount: { $sum: "$amount" } } },
      ]),
      // System Float (COD) should reflect "cash owed to the system" for COD orders, even before delivery.
      // - After cash is marked collected, we use the persisted `codPendingAmount` (net of remittances).
      // - Before collection, we estimate float from the order snapshot as: grandTotal - riderPayoutTotal.
      // This matches the admin UI expectation: show exposure as soon as a COD order is placed,
      // and reduce to 0 once the rider remits full amount.
      Order.aggregate([
        {
          $match: {
            paymentMode: "COD",
            status: { $ne: "cancelled" },
            orderStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: {
                $let: {
                  vars: {
                    collected: {
                      $ifNull: ["$financeFlags.codMarkedCollected", false],
                    },
                    pending: {
                      $ifNull: ["$paymentBreakdown.codPendingAmount", 0],
                    },
                    gross: { $ifNull: ["$paymentBreakdown.grandTotal", 0] },
                    rider: { $ifNull: ["$paymentBreakdown.riderPayoutTotal", 0] },
                  },
                  in: {
                    $cond: [
                      "$$collected",
                      "$$pending",
                      {
                        $max: [{ $subtract: ["$$gross", "$$rider"] }, 0],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ]),
      // Total Platform Earning card (UI label: "Total money collected") should reflect total checkout
      // value placed by customers across COD + ONLINE orders (regardless of remittance/capture).
      // This updates immediately on order placement.
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            orderStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            amount: {
              $sum: {
                $ifNull: ["$paymentBreakdown.grandTotal", "$pricing.total"],
              },
            },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { type: "Bonus", status: "Settled" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { type: "Wallet Payment", status: "Settled" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

  const sellerPendingPayouts =
    pendingPayouts.find((row) => row._id === PAYOUT_TYPE.SELLER)?.amount || 0;
  const riderPendingPayouts =
    pendingPayouts.find((row) => row._id === PAYOUT_TYPE.DELIVERY_PARTNER)?.amount || 0;

  const totalPlatformEarning = roundCurrency(platformGross[0]?.amount || 0);
  // "Available Balance" in the admin wallet UI is treated as a business-level net balance:
  // total checkout value placed by customers minus pending payout liabilities.
  // This makes the number update immediately on order placement (COD + ONLINE) and
  // automatically decreases as seller/rider payout requests are queued.
  const availableBalanceVirtual = roundCurrency(
    Math.max(
      totalPlatformEarning - roundCurrency(sellerPendingPayouts) - roundCurrency(riderPendingPayouts),
      0,
    ),
  );

  return {
    totalPlatformEarning,
    totalAdminEarning: roundCurrency(adminEarning[0]?.amount || 0),
    availableBalance: availableBalanceVirtual,
    walletAvailableBalance: roundCurrency(adminWallet.availableBalance || 0),
    systemFloatCOD: roundCurrency(systemFloatCOD[0]?.amount || 0),
    sellerPendingPayouts: roundCurrency(sellerPendingPayouts),
    deliveryPendingPayouts: roundCurrency(riderPendingPayouts),
    reconciledOnlineInflows: roundCurrency(onlineCollection[0]?.amount || 0),
    reconciledCODInflows: roundCurrency(codReconciled[0]?.amount || 0),
    totalWelcomeBonusesIssuedCount: bonusStats[0]?.count || 0,
    totalWelcomeBonusesIssuedAmount: bonusStats[0]?.total || 0,
    totalWalletAmountRedeemed: Math.abs(redeemedStats[0]?.total || 0),
  };
}

/**
 * Phase 4 P4-2 — canonical reader for "what's the customer's wallet
 * balance". Reads from the Wallet collection first (authoritative); if
 * no Wallet row exists yet for this user (legacy customers from before
 * the Wallet refactor), falls back to `User.walletBalance`.
 *
 * Returns 0 if neither source has a record. Never throws.
 *
 * Callers that previously read `user.walletBalance` directly can switch
 * to this helper; once every caller has migrated, the User.walletBalance
 * field can be removed (Phase 7).
 */
export async function getCustomerBalance(userId, { session } = {}) {
  if (!userId) return 0;
  try {
    const wallet = await Wallet.findOne(
      { ownerType: OWNER_TYPE.CUSTOMER, ownerId: userId },
      { availableBalance: 1 },
      session ? { session } : {},
    ).lean();
    if (wallet) return roundCurrency(wallet.availableBalance || 0);
  } catch {
    // fall through to legacy
  }

  try {
    const user = await User.findById(
      userId,
      { walletBalance: 1 },
      session ? { session } : {},
    ).lean();
    return roundCurrency(user?.walletBalance || 0);
  } catch {
    return 0;
  }
}

/**
 * Admin Wallet Management: Get full summary of user wallet
 */
export async function getUserWalletSummary(userId) {
  const currentBalance = await getCustomerBalance(userId);
  const transactions = await Transaction.find({ user: userId, userModel: "User" }).lean();

  let totalEarned = 0;
  let totalUsed = 0;
  let expiredCoins = 0;

  const now = new Date();

  transactions.forEach((tx) => {
    const amount = Number(tx.amount || 0);
    if (tx.status === "Expired" || (tx.expiryDate && new Date(tx.expiryDate) < now && amount > 0)) {
      expiredCoins += Math.abs(amount);
    } else if (amount > 0) {
      totalEarned += amount;
    } else if (amount < 0) {
      totalUsed += Math.abs(amount);
    }
  });

  return {
    currentBalance: roundCurrency(currentBalance),
    availableCoins: roundCurrency(currentBalance),
    totalEarned: roundCurrency(totalEarned),
    totalUsed: roundCurrency(totalUsed),
    expiredCoins: roundCurrency(expiredCoins),
    walletSummary: {
      currentBalance: roundCurrency(currentBalance),
      totalEarned: roundCurrency(totalEarned),
      totalUsed: roundCurrency(totalUsed),
      expiredCoins: roundCurrency(expiredCoins),
      totalTransactions: transactions.length,
    },
  };
}

/**
 * Admin Wallet Management: Get user wallet transaction history
 */
export async function getUserWalletHistory(userId, { page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [transactions, total] = await Promise.all([
    Transaction.find({ user: userId, userModel: "User" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("createdBy", "name email role")
      .populate("order", "orderId")
      .lean(),
    Transaction.countDocuments({ user: userId, userModel: "User" }),
  ]);

  const items = transactions.map((t) => ({
    _id: t._id,
    type: t.type || (t.amount > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT"),
    coins: Math.abs(t.amount || 0),
    amount: Math.abs(t.amount || 0),
    direction: t.amount >= 0 ? "CREDIT" : "DEBIT",
    reason: t.reason || t.meta?.description || t.type || "N/A",
    remarks: t.remarks || "",
    expiryDate: t.expiryDate || null,
    createdBy: t.createdBy ? (t.createdBy.name || t.createdBy.email) : "System",
    status: t.status || "Settled",
    date: t.createdAt || t.date,
    createdAt: t.createdAt || t.date,
    reference: t.reference,
    orderId: t.order?.orderId,
  }));

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

/**
 * Admin Wallet Management: Manually credit coins to user
 */
export async function adminCreditCoins({ userId, coins, reason, remarks, expiryDate, adminId }) {
  const normalizedCoins = roundCurrency(Number(coins));
  if (!normalizedCoins || normalizedCoins <= 0) {
    throw new Error("Coins amount must be greater than 0");
  }

  // 1. Credit wallet canonically
  await creditWallet({
    ownerType: OWNER_TYPE.CUSTOMER,
    ownerId: userId,
    amount: normalizedCoins,
    ledgerType: LEDGER_TRANSACTION_TYPE.ADMIN_CREDIT,
    ledgerDescription: reason || "Admin credited coins",
    metadata: { reason, remarks, adminId, expiryDate },
  });

  // 2. Create Transaction record
  const transaction = await Transaction.create({
    user: userId,
    userModel: "User",
    type: "ADMIN_CREDIT",
    amount: normalizedCoins,
    status: "Settled",
    reference: `ADM-CRED-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    reason: reason || "Admin Manual Credit",
    remarks: remarks || "",
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    createdBy: adminId || null,
    date: new Date(),
  });

  // 3. Store Finance Audit Log
  await FinanceAuditLog.create({
    action: FINANCE_AUDIT_ACTION.ADMIN_WALLET_CREDIT,
    actorType: OWNER_TYPE.ADMIN,
    actorId: adminId || null,
    metadata: { userId, coins: normalizedCoins, reason, remarks, expiryDate },
    note: `Admin credited ${normalizedCoins} coins to user ${userId}`,
  });

  // 4. Send notification to user
  await Notification.create({
    recipient: userId,
    recipientModel: "User",
    title: "Wallet Credited",
    message: `🎉 Admin has credited ${normalizedCoins} coins to your wallet.`,
    type: "system",
    data: { coins: normalizedCoins, reason, transactionId: transaction._id },
  });

  const walletSummary = await getUserWalletSummary(userId);
  return {
    success: true,
    message: `Successfully credited ${normalizedCoins} coins`,
    transaction,
    summary: walletSummary,
  };
}

/**
 * Admin Wallet Management: Manually debit coins from user
 */
export async function adminDebitCoins({ userId, coins, reason, remarks, adminId }) {
  const normalizedCoins = roundCurrency(Number(coins));
  if (!normalizedCoins || normalizedCoins <= 0) {
    throw new Error("Coins amount must be greater than 0");
  }

  const currentBalance = await getCustomerBalance(userId);
  if (currentBalance < normalizedCoins) {
    throw new Error(`Admin Debit cannot exceed available balance (Current available: ₹${currentBalance})`);
  }

  // 1. Debit wallet canonically
  await debitWallet({
    ownerType: OWNER_TYPE.CUSTOMER,
    ownerId: userId,
    amount: normalizedCoins,
    ledgerType: LEDGER_TRANSACTION_TYPE.ADMIN_DEBIT,
    ledgerDescription: reason || "Admin debited coins",
    metadata: { reason, remarks, adminId },
  });

  // 2. Create Transaction record
  const transaction = await Transaction.create({
    user: userId,
    userModel: "User",
    type: "ADMIN_DEBIT",
    amount: -normalizedCoins,
    status: "Settled",
    reference: `ADM-DEB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    reason: reason || "Admin Manual Debit",
    remarks: remarks || "",
    createdBy: adminId || null,
    date: new Date(),
  });

  // 3. Store Finance Audit Log
  await FinanceAuditLog.create({
    action: FINANCE_AUDIT_ACTION.ADMIN_WALLET_DEBIT,
    actorType: OWNER_TYPE.ADMIN,
    actorId: adminId || null,
    metadata: { userId, coins: normalizedCoins, reason, remarks },
    note: `Admin debited ${normalizedCoins} coins from user ${userId}`,
  });

  // 4. Send notification to user
  await Notification.create({
    recipient: userId,
    recipientModel: "User",
    title: "Wallet Updated",
    message: `Wallet updated. ${normalizedCoins} coins have been deducted.`,
    type: "system",
    data: { coins: normalizedCoins, reason, transactionId: transaction._id },
  });

  const walletSummary = await getUserWalletSummary(userId);
  return {
    success: true,
    message: `Successfully debited ${normalizedCoins} coins`,
    transaction,
    summary: walletSummary,
  };
}

