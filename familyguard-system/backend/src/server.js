if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const { connectDb } = require("./config/db");
const { setupSocket } = require("./socket");
const authRoutes = require("./routes/auth.routes");
const deviceRoutes = require("./routes/device.routes");
const parentRoutes = require("./routes/parent.routes");

const requiredEnv = ["PORT", "MONGO_URI", "JWT_SECRET", "CORS_ORIGIN", "PAIRING_CODE"];
for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`Missing required env var: ${envName}`);
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
});

app.set("io", io);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 600,
    standardHeaders: true,
  })
);

app.get("/health", (_, res) => res.json({ status: "ok", service: "familyguard-backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/parent", parentRoutes);

setupSocket(io);

connectDb(process.env.MONGO_URI)
  .then(() => {
    server.listen(process.env.PORT, "0.0.0.0", () => {
      console.log(`FamilyGuard backend running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("Startup failure", error);
    process.exit(1);
  });
