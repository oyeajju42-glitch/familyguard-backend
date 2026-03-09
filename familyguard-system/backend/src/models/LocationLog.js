const mongoose = require("mongoose");

const locationLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracyMeters: { type: Number, default: 0 },
    capturedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LocationLog", locationLogSchema);
