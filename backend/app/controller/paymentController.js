import handleResponse from "../utils/helper.js";
import {
  createPaymentOrderForOrderRef,
  verifyPhonePePaymentStatus,
  processPhonePeWebhook,
  resolvePaymentTarget,
  validatePaymentEligibility,
  getPayableAmountPaise,
  transitionPaymentState,
  handleOrderSideEffectsFromPaymentStatus,
} from "../services/paymentService.js";
import {
  createPaymentOrderSchema,
  verifyPaymentClientSchema,
  validateSchema,
} from "../validation/paymentValidation.js";
import logger from "../services/logger.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/payment.js";
import { PAYMENT_STATUS, PAYMENT_GATEWAY, PAYMENT_EVENT_SOURCE } from "../constants/payment.js";

function resolvePaymentErrorMessage(error) {
  const directMessage = String(error?.message || "").trim();
  if (directMessage) return directMessage;

  const responseStatusText = String(error?.response?.statusText || "").trim();
  if (responseStatusText) return `PhonePe gateway error: ${responseStatusText}`;

  const causeCode = String(error?.cause?.code || error?.code || "").trim();
  if (causeCode) return `PhonePe gateway request failed (${causeCode})`;

  return "Unable to initiate payment with PhonePe right now";
}

export const createPaymentOrder = async (req, res) => {
  try {
    const payload = validateSchema(createPaymentOrderSchema, req.body || {});
    const result = await createPaymentOrderForOrderRef({
      orderRef: payload.orderRef || payload.orderId,
      userId: req.user?.id,
      idempotencyKey: req.headers["idempotency-key"] || null,
      correlationId: req.correlationId || null,
    });

    return handleResponse(
      res,
      result.duplicate ? 200 : 201,
      result.duplicate ? "Re-using existing payment" : "Payment initiated",
      {
        payment: result.payment,
        redirectUrl: result.redirectUrl,
        merchantOrderId: result.payment.gatewayOrderId,
      },
    );
  } catch (error) {
    logger.error("createPaymentOrder failed", {
      scope: "PaymentController.createPaymentOrder",
      message: error?.message,
      statusCode: error?.statusCode || error?.status || 500,
      code: error?.code || error?.cause?.code || null,
      responseStatus: error?.response?.status || null,
      responseStatusText: error?.response?.statusText || null,
      orderRef: req.body?.orderRef || req.body?.orderId || null,
      userId: req.user?.id || null,
      correlationId: req.correlationId || null,
    });
    return handleResponse(
      res,
      error.statusCode || error.status || 500,
      resolvePaymentErrorMessage(error),
    );
  }
};

export const verifyPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantOrderId = id || req.query.merchantOrderId;
    
    if (!merchantOrderId) {
        return handleResponse(res, 400, "merchantOrderId is required");
    }

    const verification = await verifyPhonePePaymentStatus({
      merchantOrderId,
      userId: req.user?.id,
      correlationId: req.correlationId || null,
    });

    return handleResponse(res, 200, "Payment status verified", {
      status: verification.status,
      payment: verification.payment,
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const handlePhonePeWebhook = async (req, res) => {
  try {
    const authorization = req.headers["x-verify"] || req.headers["authorization"];
    const rawBody = req.body;

    if (!authorization) {
        logger.warn("PhonePe webhook missing verification header", {
          scope: "PaymentController.handlePhonePeWebhook",
          correlationId: req.correlationId || null,
          ip: req.ip,
        });
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
    logger.error("PhonePe webhook processing failed", {
      scope: "PaymentController.handlePhonePeWebhook",
      correlationId: req.correlationId || null,
      message: error?.message,
      error,
    });
    return res.status(500).send("Internal Server Error");
  }
};

export const getPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const merchantOrderId = id;
    
        const verification = await verifyPhonePePaymentStatus({
          merchantOrderId,
          userId: req.user?.id,
          correlationId: req.correlationId || null,
        });
    
        return handleResponse(res, 200, "Payment status retrieved", {
          status: verification.status,
          merchantOrderId: verification.payment.gatewayOrderId,
          amount: verification.payment.amount,
          currency: verification.payment.currency,
        });
      } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
      }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderRef, orderId } = req.body;
    const ref = orderRef || orderId;
    if (!ref) {
      return handleResponse(res, 400, "orderRef or orderId is required");
    }

    const target = await resolvePaymentTarget(ref);
    validatePaymentEligibility(target, req.user?.id);

    const primaryOrder = target.primaryOrder;
    const paymentScopeQuery = target.checkoutGroupId
      ? { checkoutGroupId: target.checkoutGroupId }
      : { order: primaryOrder._id };

    // Check for existing open payment
    const existingOpenPayment = await Payment.findOne({
      ...paymentScopeQuery,
      status: {
        $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING],
      },
    }).sort({ createdAt: -1 });

    if (existingOpenPayment && existingOpenPayment.gatewayName === PAYMENT_GATEWAY.RAZORPAY) {
      return handleResponse(res, 200, "Re-using existing payment", {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: existingOpenPayment.gatewayOrderId,
        amount: existingOpenPayment.amount,
        currency: existingOpenPayment.currency,
        merchantOrderId: existingOpenPayment.gatewayOrderId,
      });
    }

    const amountPaise = getPayableAmountPaise(target);
    const currency = String(primaryOrder?.paymentBreakdown?.currency || "INR").toUpperCase();
    
    // Generate standard merchantOrderId
    const attemptCount = (await Payment.countDocuments(paymentScopeQuery)) + 1;
    const receiptId = `RP-${target.checkoutGroupId || target.publicOrderRef || crypto.randomUUID()}`.slice(0, 40);

    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    const razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: amountPaise,
      currency,
      receipt: receiptId,
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    const paymentData = {
      order: primaryOrder._id,
      orderIds: target.orders.map((order) => order._id),
      checkoutGroupId: target.checkoutGroupId || null,
      publicOrderId: target.publicOrderRef,
      customer: primaryOrder.customer,
      gatewayName: PAYMENT_GATEWAY.RAZORPAY,
      gatewayOrderId: razorpayOrder.id,
      amount: amountPaise,
      currency,
      status: PAYMENT_STATUS.PENDING,
      attemptCount,
      correlationId: req.correlationId || null,
      rawGatewayResponse: razorpayOrder,
      statusHistory: [
        {
          fromStatus: PAYMENT_STATUS.CREATED,
          toStatus: PAYMENT_STATUS.PENDING,
          source: PAYMENT_EVENT_SOURCE.SYSTEM,
          reason: "Razorpay order created",
        },
      ],
    };

    const payment = await Payment.create(paymentData);

    logger.info("razorpay_payment_order_created", {
      correlationId: req.correlationId || null,
      publicOrderId: payment.publicOrderId,
      paymentId: payment._id.toString(),
      gatewayOrderId: payment.gatewayOrderId,
      amount: payment.amount,
    });

    return handleResponse(res, 201, "Payment initiated", {
      key: keyId,
      orderId: razorpayOrder.id,
      amount: amountPaise,
      currency,
    });
  } catch (error) {
    logger.error("createRazorpayOrder failed", {
      scope: "PaymentController.createRazorpayOrder",
      message: error?.message || error?.error?.description,
      statusCode: error?.statusCode || 500,
    });
    const errorMsg = error?.error?.description || error?.description || error?.message || "Failed to initiate Razorpay order";
    return handleResponse(res, error.statusCode || 500, errorMsg);
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return handleResponse(res, 400, "Missing required Razorpay parameters");
    }

    const payment = await Payment.findOne({ gatewayOrderId: razorpay_order_id });
    if (!payment) {
      return handleResponse(res, 404, "Payment attempt not found");
    }

    if (String(payment.customer) !== String(req.user?.id)) {
      return handleResponse(res, 403, "Not authorized to verify this payment");
    }

    if (payment.status === PAYMENT_STATUS.CAPTURED) {
      return handleResponse(res, 200, "Payment already verified", {
        status: payment.status,
        payment,
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      logger.error("Razorpay signature verification failed", {
        scope: "PaymentController.verifyRazorpayPayment",
        razorpay_order_id,
        razorpay_payment_id,
      });

      await transitionPaymentState(payment, {
        nextStatus: PAYMENT_STATUS.FAILED,
        source: PAYMENT_EVENT_SOURCE.CLIENT_VERIFY,
        reason: "Razorpay signature verification failed",
        gatewayPaymentId: razorpay_payment_id,
        rawGatewayResponse: req.body,
      });

      await handleOrderSideEffectsFromPaymentStatus(payment, PAYMENT_STATUS.FAILED, "Signature verification failed");

      return handleResponse(res, 400, "Invalid signature");
    }

    await transitionPaymentState(payment, {
      nextStatus: PAYMENT_STATUS.CAPTURED,
      source: PAYMENT_EVENT_SOURCE.CLIENT_VERIFY,
      reason: "Razorpay payment verified successfully",
      gatewayPaymentId: razorpay_payment_id,
      rawGatewayResponse: req.body,
    });

    await handleOrderSideEffectsFromPaymentStatus(payment, PAYMENT_STATUS.CAPTURED, "Razorpay payment successful");

    logger.info("razorpay_payment_verified", {
      correlationId: req.correlationId || null,
      gatewayOrderId: razorpay_order_id,
      status: PAYMENT_STATUS.CAPTURED,
    });

    return handleResponse(res, 200, "Payment verified successfully", {
      status: PAYMENT_STATUS.CAPTURED,
      payment,
    });
  } catch (error) {
    logger.error("verifyRazorpayPayment failed", {
      scope: "PaymentController.verifyRazorpayPayment",
      message: error?.message,
      statusCode: error?.statusCode || 500,
    });
    return handleResponse(res, error.statusCode || 500, error.message || "Verification failed");
  }
};

