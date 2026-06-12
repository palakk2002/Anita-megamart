import mongoose from "mongoose";

const deviceClaimSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    fingerprint: {
      type: Object,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DeviceClaim", deviceClaimSchema);
