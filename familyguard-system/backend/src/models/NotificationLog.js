const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    appName: { type: String, required: true },
    packageName: { type: String, required: true },
    title: { type: String, default: "" },
    text: { type: String, default: "" },
    capturedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
