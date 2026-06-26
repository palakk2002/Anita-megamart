import handleResponse from "../utils/helper.js";
import { getOrCreateWallet, creditWallet, getCustomerBalance } from "../services/finance/walletService.js";
import { getActivePaymentProvider } from "../services/payment/providerRegistry.js";
import Payment from "../models/payment.js";
import { PAYMENT_STATUS, PAYMENT_EVENT_SOURCE } from "../constants/payment.js";
import { walletRechargeSchema } from "../validation/walletRechargeValidation.js";
import { validateSchema } from "../validation/paymentValidation.js";
import { LEDGER_TRANSACTION_TYPE, OWNER_TYPE } from "../constants/finance.js";
import Transaction from "../models/transaction.js";
import crypto from "crypto";

export const createRechargeOrder = async (req, res) => {
  try {
    console.log("createRechargeOrder config check:", {
      clientId: process.env.PHONEPE_CLIENT_ID,
      env: process.env.PHONEPE_ENV,
      port: process.env.PORT,
    });
    const { amount } = req.body || {};
    if (!amount || isNaN(amount) || Number(amount) < 1) {
      return handleResponse(res, 400, "Amount must be at least ₹1");
    }
    const amountNum = Number(amount);
    const userId = req.user?.id;

    if (!userId) {
      return handleResponse(res, 401, "Unauthorized");
    }

    const timestamp = Date.now();
    const merchantOrderId = `RECH-USR-${userId.toString().slice(-6)}-${timestamp}`;
    const provider = getActivePaymentProvider();
    const redirectUrl = `${process.env.FRONTEND_URL}/wallet?merchantOrderId=${merchantOrderId}`;

    const initResult = await provider.initiatePayment({
      merchantOrderId,
      amountPaise: amountNum * 100,
      redirectUrl,
    });

    const payment = await Payment.create({
      customer: userId,
      gatewayName: provider.providerName,
      gatewayOrderId: merchantOrderId,
      amount: amountNum * 100,
      currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      paymentType: "WALLET_RECHARGE",
      rawGatewayResponse: {
        redirectUrl: initResult.redirectUrl,
        merchantOrderId,
        amount: amountNum * 100,
      },
      statusHistory: [
        {
          fromStatus: PAYMENT_STATUS.CREATED,
          toStatus: PAYMENT_STATUS.PENDING,
          source: PAYMENT_EVENT_SOURCE.SYSTEM,
          reason: "Wallet recharge initiated",
        },
      ],
    });

    return handleResponse(res, 201, "Recharge initiated", {
      payment,
      redirectUrl: initResult.redirectUrl,
      merchantOrderId,
    });
  } catch (error) {
    console.error("createRechargeOrder failed:", error);
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return handleResponse(res, 401, "Unauthorized");
    }
    const balance = await getCustomerBalance(userId);
    return handleResponse(res, 200, "Wallet balance fetched", { balance });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return handleResponse(res, 401, "Unauthorized");
    }
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
    const perPage = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: userId, userModel: "User" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate("order", "orderId")
        .lean(),
      Transaction.countDocuments({ user: userId, userModel: "User" }),
    ]);

    const items = transactions.map((t) => ({
      _id: t._id,
      type: t.amount > 0 ? "credit" : "debit",
      title: t.type === "Refund" ? "Refund" : (t.type === "Bonus" ? "Welcome Bonus" : t.type),
      amount: Math.abs(t.amount),
      date: t.createdAt,
      reference: t.reference,
      orderId: t.order?.orderId,
    }));

    return handleResponse(res, 200, "Transactions fetched", {
      items,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / perPage) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const handleWalletWebhook = async (req, res) => {
  try {
    const { processPhonePeWebhook } = await import("../services/paymentService.js");
    const authorization = req.headers["x-verify"] || req.headers["authorization"];
    const rawBody = req.body;

    if (!authorization) {
      return res.status(401).send("Unauthorized");
    }

    const result = await processPhonePeWebhook({
      rawBody,
      authorization,
      correlationId: req.correlationId || null,
    });

    if (result.accepted) {
      return res.status(200).send("OK");
    }
    return res.status(400).send("Bad Request");
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
};
