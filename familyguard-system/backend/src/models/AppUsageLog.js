const mongoose = require("mongoose");

const appUsageLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    dateKey: { type: String, required: true },
    packageName: { type: String, required: true },
    appName: { type: String, required: true },
    usageMinutes: { type: Number, required: true },
    launches: { type: Number, default: 0 },
  },
  { timestamps: true }
);

appUsageLogSchema.index({ deviceId: 1, dateKey: 1, packageName: 1 }, { unique: true });

module.exports = mongoose.model("AppUsageLog", appUsageLogSchema);
