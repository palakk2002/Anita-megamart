import dotenv from "dotenv";
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from "@phonepe-pg/pg-sdk-node";

dotenv.config();

const clientId = "M22VWKKRN1WGQ_2606251616";
const clientSecret = "YmM1NGY5MzItNTg1Mi00ZDVkLTk4MTQtMDM1NTIyMGY3NDBl";
const clientVersion = 1;
const isProd = false;

console.log("Credentials:", { clientId, clientSecret, clientVersion, isProd });

try {
  const client = StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    clientVersion,
    isProd ? Env.PRODUCTION : Env.SANDBOX
  );

  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId("TEST-RECH-ORDER-12345")
    .amount(100 * 100) // ₹100
    .redirectUrl("http://localhost:5173/wallet")
    .build();

  console.log("Initiating PhonePe payment request...");
  client.pay(request)
    .then(response => {
      console.log("Success! Response:", response);
      process.exit(0);
    })
    .catch(err => {
      console.error("PhonePe Pay Error:", err);
      process.exit(1);
    });
} catch (e) {
  console.error("Initialization Error:", e);
  process.exit(1);
}
