const jwt = require("jsonwebtoken");
const ParentUser = require("../models/ParentUser");

const parentAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await ParentUser.findById(payload.parentId).lean();
    if (!user) {
      return res.status(401).json({ error: "Invalid token user" });
    }

    req.parent = { id: user._id.toString(), email: user.email, fullName: user.fullName };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = parentAuth;
