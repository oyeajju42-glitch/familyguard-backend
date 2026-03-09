const mongoose = require("mongoose");

const childDeviceSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParentUser",
      required: true,
      index: true,
    },
    childName: { type: String, required: true },
    deviceLabel: { type: String, required: true },
    platformVersion: { type: String, required: true },
    consentAcceptedAt: { type: Date, required: true },
    transparencyNoticeVersion: { type: String, required: true },
    deviceToken: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChildDevice", childDeviceSchema);
