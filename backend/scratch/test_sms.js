import dotenv from "dotenv";
dotenv.config();
import { sendSmsIndiaHubOtp } from "../app/services/smsIndiaHubService.js";

async function run() {
  try {
    console.log("Testing SMS India Hub OTP send...");
    console.log("Config URL:", process.env.SMS_INDIA_HUB_URL);
    console.log("API Key:", process.env.SMS_INDIA_HUB_API_KEY);
    console.log("Sender ID:", process.env.SMS_INDIA_HUB_SENDER_ID);
    console.log("DLT Template ID:", process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID);

    const result = await sendSmsIndiaHubOtp({
      phone: "+916268423925", // Test phone number
      otp: "1234"
    });
    console.log("SMS Sent successfully!", result);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    if (error.providerRaw) {
      console.error("Provider Raw Response:", error.providerRaw);
    }
  }
  process.exit(0);
}

run();
