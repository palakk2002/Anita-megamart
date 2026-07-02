import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log("Testing keys:", { keyId, keySecret });

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

try {
  const order = await razorpay.orders.create({
    amount: 100,
    currency: "INR",
    receipt: "test_receipt",
  });
  console.log("Success! Order created:", order);
} catch (error) {
  console.error("Error creating order:", error);
}
