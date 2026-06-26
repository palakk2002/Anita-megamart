import Joi from "joi";

export const walletRechargeSchema = Joi.object({
  amount: Joi.number().min(1).required(),
});
