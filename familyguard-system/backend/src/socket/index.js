const jwt = require("jsonwebtoken");

const setupSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Missing token"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.parentId = payload.parentId;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`parent:${socket.parentId}`);
    socket.emit("socket:ready", { connectedAt: new Date().toISOString() });

    socket.on("disconnect", () => {
      // no-op
    });
  });
};

module.exports = { setupSocket };
