import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { dbState, isDatabaseAvailable } from "./db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import dashboardRoutes from "./routes/dashboard.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";
import { errorResponse } from "./utils/errors.js";
import { uploadsDirectory } from "./middleware/upload.js";
import { config } from "./config.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = new Set([
      process.env.FRONTEND_URL,
      process.env.RENDER_EXTERNAL_URL,
      config.publicAppUrl,
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://192.168.29.155:5173",
      "https://127.0.0.1:5173",
      "https://localhost:5173",
      "https://192.168.29.155:5173"
    ]);
    if (allowedOrigins.has(origin) || /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/.test(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV === "development" && /^https:\/\/.+\.ngrok-free\.(app|dev)$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed"));
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

fs.mkdirSync(uploadsDirectory, { recursive: true });
app.use("/uploads", express.static(uploadsDirectory));

app.get("/api/health/live", (req, res) => {
  res.json({ status: "alive" });
});
app.get("/api/health", (req, res) => {
  const database = isDatabaseAvailable()
    ? { status: "ready", detail: "MongoDB connected" }
    : { status: dbState.status, detail: dbState.detail };
  res.status(database.status === "ready" ? 200 : 503).json({
    status: database.status === "ready" ? "ready" : "unavailable",
    database
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

if (process.env.NODE_ENV === "production") {
  const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
  const frontendDirectory = path.resolve(backendDirectory, "../../frontend/dist");
  app.use(express.static(frontendDirectory));
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return next();
    return res.sendFile(path.join(frontendDirectory, "index.html"));
  });
}

app.use((req, res) => errorResponse(res, 404, "NOT_FOUND", "Endpoint not found"));

app.use((error, req, res, _next) => {
  if (error?.code === "INVALID_IMAGE_TYPE") {
    return errorResponse(res, 415, "INVALID_IMAGE_TYPE", error.message);
  }
  if (error?.code === "LIMIT_FILE_SIZE") {
    return errorResponse(res, 413, "FILE_TOO_LARGE", "Image exceeds 5 MB");
  }
  if (error?.name === "MulterError") {
    return errorResponse(res, 400, "UPLOAD_ERROR", error.message);
  }
  if (error?.name === "CastError") {
    return errorResponse(res, 404, "NOT_FOUND", "Resource not found");
  }
  console.error(error);
  return errorResponse(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
});

export default app;
