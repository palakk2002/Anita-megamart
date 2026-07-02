import Razorpay from "razorpay";
import { PAYMENT_STATUS, PAYMENT_GATEWAY } from "../../../constants/payment.js";
import { PaymentProviderPort } from "../ports/paymentProviderPort.js";

let _razorpayClient = null;

function getRazorpayClient() {
  if (_razorpayClient) return _razorpayClient;
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }
  _razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  return _razorpayClient;
}

export class RazorpayAdapter extends PaymentProviderPort {
  get providerName() {
    return PAYMENT_GATEWAY.RAZORPAY;
  }

  async initiatePayment({ merchantOrderId, amountPaise, redirectUrl }) {
    const client = getRazorpayClient();
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: merchantOrderId,
    };
    const response = await client.orders.create(options);
    return {
      redirectUrl: "", // Standard Checkout flow opens modal via frontend
      gatewayResponse: response,
    };
  }

  async getPaymentStatus({ merchantOrderId }) {
    const client = getRazorpayClient();
    const response = await client.orders.fetch(merchantOrderId);
    return {
      state: response.status,
      transactionId: response.id,
      responseCode: response.status,
      gatewayResponse: response,
    };
  }

  async validateWebhook({ rawBody, authorization }) {
    return false;
  }

  async decodeWebhookPayload({ rawBody }) {
    throw new Error("Webhook processing not supported for Razorpay");
  }

  mapStatusToInternal(gatewayState) {
    const normalized = String(gatewayState || "").toLowerCase();
    if (normalized === "paid" || normalized === "captured") return PAYMENT_STATUS.CAPTURED;
    if (normalized === "attempted") return PAYMENT_STATUS.PENDING;
    if (normalized === "created") return PAYMENT_STATUS.PENDING;
    return PAYMENT_STATUS.FAILED;
  }
}

export default RazorpayAdapter;
