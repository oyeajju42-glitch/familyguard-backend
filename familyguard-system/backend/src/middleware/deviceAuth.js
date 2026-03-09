const ChildDevice = require("../models/ChildDevice");

const deviceAuth = async (req, res, next) => {
  const token = req.headers["x-device-token"];
  if (!token) {
    return res.status(401).json({ error: "Missing device token" });
  }

  const device = await ChildDevice.findOne({ deviceToken: token, isActive: true }).lean();
  if (!device) {
    return res.status(401).json({ error: "Invalid device token" });
  }

  req.device = {
    id: device._id.toString(),
    parentId: device.parentId.toString(),
    childName: device.childName,
    label: device.deviceLabel,
  };
  next();
};

module.exports = deviceAuth;
