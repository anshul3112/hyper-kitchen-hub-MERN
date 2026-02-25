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
  // Accepted token types: user JWT, kiosk JWT, display JWT.

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
      // Fall through
    }

    try {
      // KIOSK_TOKEN_SECRET is shared by kiosk and display devices.
      // Distinguish by the role field in the payload.
      const decoded = jwt.verify(token, process.env.KIOSK_TOKEN_SECRET);
      if (decoded.role === "Display") {
        socket.data.display = decoded; // display screen device
      } else {
        socket.data.kiosk = decoded;   // ordering kiosk
      }
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.data.user
      ? `user:${socket.data.user._id ?? socket.data.user.id}`
      : socket.data.display
      ? `display:${socket.data.display._id}`
      : `kiosk:${socket.data.kiosk?._id}`;

    console.log(`[socket] connected  ${socket.id}  (${identity})`);


    socket.on("join:outlet", ({ outletId } = {}) => {
      if (!outletId) return;

      const userOutlet =
        socket.data.user?.outlet?.outletId?.toString() ||
        socket.data.kiosk?.outlet?.outletId?.toString() ||
        socket.data.display?.outlet?.outletId?.toString();

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

// Broadcast an inventory-level update (price / quantity / status) to every
// connected socket in the outlet room (kiosks + outlet admin screens).
export function emitInventoryUpdate(outletId, payload) {
  getIO().to(`outlet:${outletId}`).emit("inventory:update", payload);
}
