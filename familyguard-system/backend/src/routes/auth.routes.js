const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const ParentUser = require("../models/ParentUser");

const router = express.Router();

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/register", async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existing = await ParentUser.findOne({ email: payload.email }).lean();
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await ParentUser.create({
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
    });

    return res.status(201).json({
      message: "Parent account created",
      parent: { id: user._id.toString(), fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid registration payload", details: error.issues });
    }
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const payload = z
      .object({ email: z.string().email(), password: z.string().min(8) })
      .parse(req.body);

    const user = await ParentUser.findOne({ email: payload.email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ parentId: user._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      token,
      parent: { id: user._id.toString(), fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid login payload", details: error.issues });
    }
    return res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
