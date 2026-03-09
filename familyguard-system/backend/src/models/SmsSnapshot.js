const mongoose = require("mongoose");

const smsSnapshotSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    messages: [
      {
        address: String,
        body: String,
        type: String,
        timestamp: Date,
      },
    ],
    capturedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsSnapshot", smsSnapshotSchema);
