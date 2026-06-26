import dotenv from "dotenv";
import mongoose from "mongoose";
import Payment from "./app/models/payment.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const p = await Payment.findOne({ paymentType: "WALLET_RECHARGE" }).sort({ createdAt: -1 }).lean();
    console.log("Last Wallet Recharge Payment Record:", JSON.stringify(p, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
