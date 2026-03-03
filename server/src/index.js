import "dotenv/config";
import http from "http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes.js";
import salonRoutes from "./routes/salon.routes.js";
import queueRoutes from "./routes/queue.routes.js";
import barberRoutes from "./routes/barber.routes.js";
import chairRoutes from "./routes/chair.routes.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { configureSocket } from "./socket/socket.handler.js";
import { initRedis } from "./services/redis.service.js";
import { hydrateRedisFromPostgres } from "./services/queue.service.js";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(apiLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/salons", salonRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/barber", barberRoutes);
app.use("/api/barber", chairRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL },
});
app.set("io", io);
configureSocket(io);

const port = Number(process.env.PORT || 5000);
const start = async () => {
  await initRedis();
  await hydrateRedisFromPostgres();
  server.listen(port, () => {
    console.log(`NextCut server running on port ${port}`);
  });
};

start();
