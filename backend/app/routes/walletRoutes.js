import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { paymentRouteRateLimiter } from "../middleware/securityMiddlewares.js";
import {
  createRechargeOrder,
  handleWalletWebhook,
  getWalletBalance,
  getWalletTransactions,
} from "../controller/walletController.js";

const walletRoute = express.Router();

walletRoute.post(
  "/create-recharge-order",
  verifyToken,
  paymentRouteRateLimiter,
  createRechargeOrder,
);

walletRoute.post(
  "/payment-webhook",
  express.raw({ type: "application/json" }),
  handleWalletWebhook,
);

walletRoute.get("/balance", verifyToken, getWalletBalance);
walletRoute.get("/transactions", verifyToken, getWalletTransactions);

export default walletRoute;
