import nodemailer from "nodemailer";
import logger from "./logger.js";

let cachedTransporter = null;

export function useRealEmailOTP() {
  return (
    process.env.USE_REAL_EMAIL_OTP === "true" ||
    process.env.USE_REAL_EMAIL_OTP === "1"
  );
}

function parseSmtpPort() {
  return parseInt(process.env.SMTP_PORT || "587", 10);
}

function parseSmtpSecure(port) {
  if (process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1") {
    return true;
  }

  if (process.env.SMTP_SECURE === "false" || process.env.SMTP_SECURE === "0") {
    return false;
  }

  return port === 465;
}

function getMailFrom() {
  const fromAddress = String(process.env.MAIL_FROM || "").trim();
  const fromName = String(process.env.MAIL_FROM_NAME || "").trim();

  if (!fromAddress) {
    const error = new Error("MAIL_FROM is required for email OTP delivery");
    error.statusCode = 500;
    throw error;
  }

  return fromName ? `${fromName} <${fromAddress}>` : fromAddress;
}

function getTransportConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = parseSmtpPort();
  const secure = parseSmtpSecure(port);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host) {
    const error = new Error("SMTP_HOST is required for email OTP delivery");
    error.statusCode = 500;
    throw error;
  }

  if (!Number.isFinite(port) || port <= 0) {
    const error = new Error("SMTP_PORT must be a valid number");
    error.statusCode = 500;
    throw error;
  }

  if ((user && !pass) || (!user && pass)) {
    const error = new Error("SMTP_USER and SMTP_PASS must be provided together");
    error.statusCode = 500;
    throw error;
  }

  return {
    host,
    port,
    secure,
    ...(user && pass
      ? {
          auth: {
            user,
            pass,
          },
        }
      : {}),
  };
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(getTransportConfig());
  }

  return cachedTransporter;
}

export async function sendSellerVerificationOtpEmail({
  email,
  otp,
  expiresInMinutes,
}) {
  if (!useRealEmailOTP()) {
    logger.info("Seller email OTP generated in mock mode", {
      email,
      otp,
      mode: "mock",
    });
    return {
      delivered: false,
      mode: "mock",
    };
  }

  const appName = String(process.env.APP_NAME || "Anita Mega Mart").trim();

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getMailFrom(),
    to: email,
    subject: `${appName} — Your Verification Code is ${otp}`,
    text: `Hi,\n\nYour ${appName} seller signup verification code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\n${appName} Team`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #7c3aed; padding: 28px 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">${appName}</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 36px 32px 24px;">
                    <p style="margin: 0 0 8px; color: #374151; font-size: 15px;">Hi there,</p>
                    <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                      Use the following code to verify your seller account signup. This code is valid for <strong>${expiresInMinutes} minutes</strong>.
                    </p>
                    <div style="text-align: center; margin: 0 0 28px;">
                      <span style="display: inline-block; background-color: #f3f0ff; border: 2px dashed #7c3aed; border-radius: 10px; padding: 16px 40px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #7c3aed;">${otp}</span>
                    </div>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  return {
    delivered: true,
    mode: "real",
  };
}

export function __resetEmailTransportForTests() {
  cachedTransporter = null;
}
