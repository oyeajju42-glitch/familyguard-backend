const express = require("express");
const { z } = require("zod");
const deviceAuth = require("../middleware/deviceAuth");
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

const touchDevice = async (deviceId) => {
  await ChildDevice.findByIdAndUpdate(deviceId, { lastSyncAt: new Date() });
};

const emitToParent = (req, event, payload) => {
  const io = req.app.get("io");
  io.to(`parent:${req.device.parentId}`).emit(event, payload);
};

router.post("/enroll", async (req, res) => {
  try {
    const payload = z
      .object({
        parentId: z.string(),
        childName: z.string().min(1),
        deviceLabel: z.string().min(1),
        platformVersion: z.string().min(1),
        transparencyNoticeVersion: z.string().min(1),
        consentAcceptedAt: z.string(),
        pairingCode: z.string().min(4),
      })
      .parse(req.body);

    if (payload.pairingCode !== process.env.PAIRING_CODE) {
      return res.status(401).json({ error: "Invalid pairing code" });
    }

    const deviceToken = `${payload.parentId.slice(0, 6)}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    const created = await ChildDevice.create({
parentId: payload.parentId || "default-parent",
      childName: payload.childName,
      deviceLabel: payload.deviceLabel,
      platformVersion: payload.platformVersion,
      consentAcceptedAt: new Date(payload.consentAcceptedAt),
      transparencyNoticeVersion: payload.transparencyNoticeVersion,
      deviceToken,
    });

    return res.status(201).json({
      deviceId: created._id.toString(),
      deviceToken: created.deviceToken,
      message: "Device enrolled successfully",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid enrollment payload", details: error.issues });
    }
    return res.status(500).json({ error: "Enrollment failed" });
  }
});

router.post("/location", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        lat: z.number(),
        lng: z.number(),
        accuracyMeters: z.number().default(0),
        capturedAt: z.string().datetime(),
      })
      .parse(req.body);

    await LocationLog.create({ deviceId: req.device.id, ...payload, capturedAt: new Date(payload.capturedAt) });
    await touchDevice(req.device.id);
    emitToParent(req, "location:update", { deviceId: req.device.id, ...payload, childName: req.device.childName });
    return res.status(201).json({ message: "Location synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid location payload", details: error.issues });
    }
    return res.status(500).json({ error: "Location sync failed" });
  }
});

router.post("/screen-time", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        dateKey: z.string(),
        totalMinutes: z.number().nonnegative(),
        appForegroundMinutes: z.number().nonnegative().default(0),
      })
      .parse(req.body);

    await ScreenTimeLog.findOneAndUpdate(
      { deviceId: req.device.id, dateKey: payload.dateKey },
      { ...payload },
      { upsert: true, new: true }
    );
    await touchDevice(req.device.id);
    emitToParent(req, "screen-time:update", { deviceId: req.device.id, ...payload });
    return res.json({ message: "Screen time synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid screen time payload", details: error.issues });
    }
    return res.status(500).json({ error: "Screen time sync failed" });
  }
});

router.post("/app-usage", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        dateKey: z.string(),
        apps: z.array(
          z.object({
            packageName: z.string(),
            appName: z.string(),
            usageMinutes: z.number().nonnegative(),
            launches: z.number().nonnegative().default(0),
          })
        ),
      })
      .parse(req.body);

    const operations = payload.apps.map((app) => ({
      updateOne: {
        filter: { deviceId: req.device.id, dateKey: payload.dateKey, packageName: app.packageName },
        update: {
          $set: {
            appName: app.appName,
            usageMinutes: app.usageMinutes,
            launches: app.launches,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length) {
      await AppUsageLog.bulkWrite(operations);
    }

    await touchDevice(req.device.id);
    emitToParent(req, "app-usage:update", { deviceId: req.device.id, dateKey: payload.dateKey });
    return res.json({ message: "App usage synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid app usage payload", details: error.issues });
    }
    return res.status(500).json({ error: "App usage sync failed" });
  }
});

router.post("/installed-apps", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        capturedAt: z.string().datetime(),
        apps: z.array(
          z.object({
            packageName: z.string(),
            appName: z.string(),
            firstInstallTime: z.number(),
            updateTime: z.number(),
          })
        ),
      })
      .parse(req.body);

    await InstalledAppsSnapshot.create({
      deviceId: req.device.id,
      apps: payload.apps,
      capturedAt: new Date(payload.capturedAt),
    });

    await touchDevice(req.device.id);
    emitToParent(req, "installed-apps:update", { deviceId: req.device.id, count: payload.apps.length });
    return res.status(201).json({ message: "Installed apps synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid installed apps payload", details: error.issues });
    }
    return res.status(500).json({ error: "Installed apps sync failed" });
  }
});

router.post("/contacts", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        capturedAt: z.string().datetime(),
        contacts: z.array(z.object({ displayName: z.string(), phoneNumber: z.string() })),
      })
      .parse(req.body);

    await ContactsSnapshot.create({
      deviceId: req.device.id,
      contacts: payload.contacts,
      capturedAt: new Date(payload.capturedAt),
    });
    await touchDevice(req.device.id);
    return res.status(201).json({ message: "Contacts backup synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid contacts payload", details: error.issues });
    }
    return res.status(500).json({ error: "Contacts sync failed" });
  }
});

router.post("/sms", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        capturedAt: z.string().datetime(),
        messages: z.array(
          z.object({
            address: z.string(),
            body: z.string(),
            type: z.string(),
            timestamp: z.string().datetime(),
          })
        ),
      })
      .parse(req.body);

    await SmsSnapshot.create({
      deviceId: req.device.id,
      capturedAt: new Date(payload.capturedAt),
      messages: payload.messages.map((item) => ({ ...item, timestamp: new Date(item.timestamp) })),
    });
    await touchDevice(req.device.id);
    return res.status(201).json({ message: "SMS backup synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid SMS payload", details: error.issues });
    }
    return res.status(500).json({ error: "SMS sync failed" });
  }
});

router.post("/activity", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        category: z.string(),
        message: z.string(),
        meta: z.record(z.any()).default({}),
        capturedAt: z.string().datetime(),
      })
      .parse(req.body);

    await DeviceActivityLog.create({
      deviceId: req.device.id,
      category: payload.category,
      message: payload.message,
      meta: payload.meta,
      capturedAt: new Date(payload.capturedAt),
    });
    await touchDevice(req.device.id);
    emitToParent(req, "activity:update", { deviceId: req.device.id, category: payload.category, message: payload.message });
    return res.status(201).json({ message: "Activity log synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid activity payload", details: error.issues });
    }
    return res.status(500).json({ error: "Activity sync failed" });
  }
});

router.post("/notifications", deviceAuth, async (req, res) => {
  try {
    const payload = z
      .object({
        entries: z.array(
          z.object({
            appName: z.string(),
            packageName: z.string(),
            title: z.string().optional(),
            text: z.string().optional(),
            capturedAt: z.string().datetime(),
          })
        ),
      })
      .parse(req.body);

    if (payload.entries.length) {
      await NotificationLog.insertMany(
        payload.entries.map((entry) => ({ ...entry, deviceId: req.device.id, capturedAt: new Date(entry.capturedAt) }))
      );
    }

    await touchDevice(req.device.id);
    emitToParent(req, "notifications:update", { deviceId: req.device.id, total: payload.entries.length });
    return res.status(201).json({ message: "Notifications synced" });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid notifications payload", details: error.issues });
    }
    return res.status(500).json({ error: "Notifications sync failed" });
  }
});

router.get("/commands", deviceAuth, async (req, res) => {
  const commands = await RemoteCommand.find({ deviceId: req.device.id, status: "QUEUED" })
    .sort({ createdAt: 1 })
    .limit(10);

  await RemoteCommand.updateMany(
    { _id: { $in: commands.map((item) => item._id) } },
    { status: "DELIVERED", deliveredAt: new Date() }
  );

  return res.json({
    commands: commands.map((item) => ({ id: item._id.toString(), commandType: item.commandType, createdAt: item.createdAt })),
  });
});

router.post("/commands/:commandId/ack", deviceAuth, async (req, res) => {
  const payload = z
    .object({ status: z.enum(["EXECUTED", "FAILED"]), failureReason: z.string().optional() })
    .parse(req.body);

  await RemoteCommand.findOneAndUpdate(
    { _id: req.params.commandId, deviceId: req.device.id },
    {
      status: payload.status,
      executedAt: new Date(),
      failureReason: payload.failureReason,
    }
  );

  return res.json({ message: "Command status updated" });
});

module.exports = router;
