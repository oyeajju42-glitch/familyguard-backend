const express = require("express");
const parentAuth = require("../middleware/parentAuth");
const ChildDevice = require("../models/ChildDevice");
const LocationLog = require("../models/LocationLog");
const ScreenTimeLog = require("../models/ScreenTimeLog");
const AppUsageLog = require("../models/AppUsageLog");
const InstalledAppsSnapshot = require("../models/InstalledAppsSnapshot");
const ContactsSnapshot = require("../models/ContactsSnapshot");
const SmsSnapshot = require("../models/SmsSnapshot");
const DeviceActivityLog = require("../models/DeviceActivityLog");
const NotificationLog = require("../models/NotificationLog");
const RemoteCommand = require("../models/RemoteCommand");

const router = express.Router();
router.use(parentAuth);

const toPublic = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    ...Object.fromEntries(Object.entries(doc).filter(([key]) => key !== "_id" && key !== "__v")),
  };
};

const toPublicList = (items) => items.map((item) => toPublic(item));

const belongsToParent = async (deviceId, parentId) => {
  return ChildDevice.findOne({ _id: deviceId, parentId }).lean();
};

router.get("/me", (req, res) => {
  res.json({ parent: req.parent });
});

router.get("/devices", async (req, res) => {
  const devices = await ChildDevice.find({ parentId: req.parent.id }).sort({ updatedAt: -1 }).lean();
  res.json({
    devices: devices.map((d) => ({
      id: d._id.toString(),
      childName: d.childName,
      deviceLabel: d.deviceLabel,
      platformVersion: d.platformVersion,
      lastSyncAt: d.lastSyncAt,
      isActive: d.isActive,
      createdAt: d.createdAt,
    })),
  });
});

router.get("/devices/:deviceId/overview", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const [latestLocation, todayScreenTime, topApps, latestActivities, latestNotifications] = await Promise.all([
    LocationLog.findOne({ deviceId: device._id }).sort({ capturedAt: -1 }).lean(),
    ScreenTimeLog.findOne({ deviceId: device._id, dateKey: new Date().toISOString().slice(0, 10) }).lean(),
    AppUsageLog.find({ deviceId: device._id, dateKey: new Date().toISOString().slice(0, 10) })
      .sort({ usageMinutes: -1 })
      .limit(5)
      .lean(),
    DeviceActivityLog.find({ deviceId: device._id }).sort({ capturedAt: -1 }).limit(10).lean(),
    NotificationLog.find({ deviceId: device._id }).sort({ capturedAt: -1 }).limit(10).lean(),
  ]);

  res.json({
    overview: {
      device: {
        id: device._id.toString(),
        childName: device.childName,
        deviceLabel: device.deviceLabel,
        platformVersion: device.platformVersion,
      },
      latestLocation: toPublic(latestLocation),
      todayScreenTime: toPublic(todayScreenTime),
      topApps: toPublicList(topApps),
      latestActivities: toPublicList(latestActivities),
      latestNotifications: toPublicList(latestNotifications),
    },
  });
});

router.get("/devices/:deviceId/location", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const logs = await LocationLog.find({ deviceId: device._id }).sort({ capturedAt: -1 }).limit(100).lean();
  res.json({ logs: toPublicList(logs) });
});

router.get("/devices/:deviceId/installed-apps", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const snapshot = await InstalledAppsSnapshot.findOne({ deviceId: device._id }).sort({ capturedAt: -1 }).lean();
  res.json({ snapshot: toPublic(snapshot) });
});

router.get("/devices/:deviceId/contacts", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const snapshot = await ContactsSnapshot.findOne({ deviceId: device._id }).sort({ capturedAt: -1 }).lean();
  res.json({ snapshot: toPublic(snapshot) });
});

router.get("/devices/:deviceId/sms", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const snapshot = await SmsSnapshot.findOne({ deviceId: device._id }).sort({ capturedAt: -1 }).lean();
  res.json({ snapshot: toPublic(snapshot) });
});

router.get("/devices/:deviceId/activity", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const logs = await DeviceActivityLog.find({ deviceId: device._id }).sort({ capturedAt: -1 }).limit(200).lean();
  res.json({ logs: toPublicList(logs) });
});

router.get("/devices/:deviceId/notifications", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const logs = await NotificationLog.find({ deviceId: device._id }).sort({ capturedAt: -1 }).limit(200).lean();
  res.json({ logs: toPublicList(logs) });
});

router.post("/devices/:deviceId/lock", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const command = await RemoteCommand.create({
    deviceId: device._id,
    commandType: "LOCK_DEVICE",
    issuedBy: req.parent.id,
    status: "QUEUED",
  });

  res.status(201).json({
    message: "Lock command queued",
    command: { id: command._id.toString(), status: command.status },
  });
});

router.get("/devices/:deviceId/reports/daily", async (req, res) => {
  const device = await belongsToParent(req.params.deviceId, req.parent.id);
  if (!device) return res.status(404).json({ error: "Device not found" });

  const dateKey = req.query.date || new Date().toISOString().slice(0, 10);
  const [screenTime, topApps, activityCount, notificationCount, locationCount] = await Promise.all([
    ScreenTimeLog.findOne({ deviceId: device._id, dateKey }).lean(),
    AppUsageLog.find({ deviceId: device._id, dateKey }).sort({ usageMinutes: -1 }).limit(10).lean(),
    DeviceActivityLog.countDocuments({
      deviceId: device._id,
      capturedAt: {
        $gte: new Date(`${dateKey}T00:00:00.000Z`),
        $lte: new Date(`${dateKey}T23:59:59.999Z`),
      },
    }),
    NotificationLog.countDocuments({
      deviceId: device._id,
      capturedAt: {
        $gte: new Date(`${dateKey}T00:00:00.000Z`),
        $lte: new Date(`${dateKey}T23:59:59.999Z`),
      },
    }),
    LocationLog.countDocuments({
      deviceId: device._id,
      capturedAt: {
        $gte: new Date(`${dateKey}T00:00:00.000Z`),
        $lte: new Date(`${dateKey}T23:59:59.999Z`),
      },
    }),
  ]);

  res.json({
    report: {
      dateKey,
      device: { id: device._id.toString(), childName: device.childName, deviceLabel: device.deviceLabel },
      screenTime: screenTime ? toPublic(screenTime) : { dateKey, totalMinutes: 0, appForegroundMinutes: 0 },
      topApps: toPublicList(topApps),
      counts: {
        activityEvents: activityCount,
        notificationEvents: notificationCount,
        locationPings: locationCount,
      },
    },
  });
});

module.exports = router;
