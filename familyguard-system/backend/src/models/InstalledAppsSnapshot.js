const mongoose = require("mongoose");

const installedAppsSnapshotSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    apps: [
      {
        packageName: String,
        appName: String,
        firstInstallTime: Number,
        updateTime: Number,
      },
    ],
    capturedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InstalledAppsSnapshot", installedAppsSnapshotSchema);
