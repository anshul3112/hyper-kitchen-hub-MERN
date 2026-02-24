import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.CORS_ORIGIN, "http://localhost:5173"],
      credentials: true,
    },
  });

  // ── Auth middleware ─────────────────────────────────────────────────────────
  // Clients must send  { auth: { token: "<jwt>" } }  on connect.
  // Both user JWTs (staff/kitchen/outletAdmin) and kiosk JWTs are accepted.

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    try {
      // Try user JWT first
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.data.user = decoded;
      return next();
    } catch {
      // Fall through to kiosk JWT
    }

    try {
      const decoded = jwt.verify(token, process.env.KIOSK_TOKEN_SECRET);
      socket.data.kiosk = decoded;
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.data.user
      ? `user:${socket.data.user._id ?? socket.data.user.id}`
      : `kiosk:${socket.data.kiosk?._id}`;

    console.log(`[socket] connected  ${socket.id}  (${identity})`);


    socket.on("join:outlet", ({ outletId } = {}) => {
      if (!outletId) return;

      const userOutlet =
        socket.data.user?.outlet?.outletId?.toString() ||
        socket.data.kiosk?.outlet?.outletId?.toString();

      if (userOutlet && userOutlet !== outletId.toString()) {
        socket.emit("error", { message: "Not authorised for this outlet" });
        return;
      }

      socket.join(`outlet:${outletId}`);
      console.log(`[socket] ${socket.id} joined room outlet:${outletId}`);
      socket.emit("joined:outlet", { outletId });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected ${socket.id}  (${identity})`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialised — call initSocket() first");
  return io;
}

// ── Outlet-scoped helpers 

export function emitNewOrder(outletId, order) {
  getIO().to(`outlet:${outletId}`).emit("order:new", order);
}

export function emitOrderStatusUpdate(outletId, payload) {
  getIO().to(`outlet:${outletId}`).emit("order:status", payload);
}
