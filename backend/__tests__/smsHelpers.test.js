import { buildMessage } from "../app/utils/smsHelpers.js";

describe("smsHelpers.js - buildMessage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("replaces variables in default template", () => {
    process.env.SMS_INDIA_HUB_TEMPLATE_TEXT = "Your OTP is {{OTP}}. Valid for {{MINUTES}} minutes.";
    process.env.OTP_EXPIRY_MINUTES = "5";
    const msg = buildMessage("1234");
    expect(msg).toBe("Your OTP is 1234. Valid for 5 minutes.");
  });

  it("handles template with a single generic placeholder by replacing it with OTP", () => {
    process.env.SMS_INDIA_HUB_TEMPLATE_TEXT = "Dear Customer,your OTP for Anita Mega Mart login is ##var##. Do not share this OTP with anyone.Valid for 10 minutes.ANAMGM";
    process.env.OTP_EXPIRY_MINUTES = "10";
    const msg = buildMessage("5678");
    expect(msg).toBe("Dear Customer,your OTP for Anita Mega Mart login is 5678. Do not share this OTP with anyone.Valid for 10 minutes.ANAMGM");
  });

  it("handles template with two generic placeholders by replacing them with OTP and minutes", () => {
    process.env.SMS_INDIA_HUB_TEMPLATE_TEXT = "Your code is ##var##. Expires in ##var## mins.";
    process.env.OTP_EXPIRY_MINUTES = "15";
    const msg = buildMessage("1122");
    expect(msg).toBe("Your code is 1122. Expires in 15 mins.");
  });
});
