const mongoose = require("mongoose");

const screenTimeLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    dateKey: { type: String, required: true },
    totalMinutes: { type: Number, required: true },
    appForegroundMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

screenTimeLogSchema.index({ deviceId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("ScreenTimeLog", screenTimeLogSchema);
