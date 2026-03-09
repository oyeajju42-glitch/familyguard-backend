const mongoose = require("mongoose");

const remoteCommandSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    commandType: { type: String, required: true, enum: ["LOCK_DEVICE"] },
    status: {
      type: String,
      required: true,
      enum: ["QUEUED", "DELIVERED", "EXECUTED", "FAILED"],
      default: "QUEUED",
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParentUser",
      required: true,
    },
    deliveredAt: Date,
    executedAt: Date,
    failureReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("RemoteCommand", remoteCommandSchema);
