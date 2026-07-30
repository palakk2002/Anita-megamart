import handleResponse from "../../utils/helper.js";
import {
  getUserWalletSummary,
  getUserWalletHistory,
  adminCreditCoins,
  adminDebitCoins,
} from "../../services/finance/walletService.js";

/**
 * GET /admin/users/:id/wallet
 * Returns current balance, available coins, used coins, expired coins, total earned, and summary.
 */
export const getUserWalletDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return handleResponse(res, 400, "User ID is required");
    }

    const walletData = await getUserWalletSummary(id);
    return handleResponse(res, 200, "User wallet details fetched successfully", walletData);
  } catch (error) {
    console.error("getUserWalletDetails error:", error);
    return handleResponse(res, 500, error.message || "Failed to fetch user wallet details");
  }
};

/**
 * GET /admin/users/:id/wallet/history
 * Returns full wallet history for the specified user with pagination.
 */
export const getUserWalletHistoryController = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    if (!id) {
      return handleResponse(res, 400, "User ID is required");
    }

    const history = await getUserWalletHistory(id, { page, limit });
    return handleResponse(res, 200, "User wallet history fetched successfully", history);
  } catch (error) {
    console.error("getUserWalletHistoryController error:", error);
    return handleResponse(res, 500, error.message || "Failed to fetch wallet history");
  }
};

/**
 * POST /admin/wallet/add-coins
 * Body: { userId, coins, reason, remarks, expiryDate }
 * Credits coins to user wallet and records audit transaction.
 */
export const addCoinsController = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { userId, coins, reason, remarks, expiryDate } = req.body || {};

    if (!userId) {
      return handleResponse(res, 400, "User ID is required");
    }

    const coinsNum = Number(coins);
    if (!coins || isNaN(coinsNum) || coinsNum <= 0) {
      return handleResponse(res, 400, "Coins must be a positive number");
    }

    if (!reason || !reason.trim()) {
      return handleResponse(res, 400, "Reason is required for crediting coins");
    }

    const result = await adminCreditCoins({
      userId,
      coins: coinsNum,
      reason: reason.trim(),
      remarks: remarks ? remarks.trim() : "",
      expiryDate,
      adminId,
    });

    return handleResponse(res, 200, result.message, result);
  } catch (error) {
    console.error("addCoinsController error:", error);
    return handleResponse(res, 400, error.message || "Failed to credit coins to user wallet");
  }
};

/**
 * POST /admin/wallet/remove-coins
 * Body: { userId, coins, reason, remarks }
 * Debits coins from user wallet and records audit transaction.
 */
export const removeCoinsController = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { userId, coins, reason, remarks } = req.body || {};

    if (!userId) {
      return handleResponse(res, 400, "User ID is required");
    }

    const coinsNum = Number(coins);
    if (!coins || isNaN(coinsNum) || coinsNum <= 0) {
      return handleResponse(res, 400, "Coins must be a positive number");
    }

    if (!reason || !reason.trim()) {
      return handleResponse(res, 400, "Reason is required for debiting coins");
    }

    const result = await adminDebitCoins({
      userId,
      coins: coinsNum,
      reason: reason.trim(),
      remarks: remarks ? remarks.trim() : "",
      adminId,
    });

    return handleResponse(res, 200, result.message, result);
  } catch (error) {
    console.error("removeCoinsController error:", error);
    return handleResponse(res, 400, error.message || "Failed to debit coins from user wallet");
  }
};
