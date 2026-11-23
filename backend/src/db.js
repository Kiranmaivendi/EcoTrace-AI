import mongoose from "mongoose";
import { config } from "./config.js";

export const dbState = {
  status: "unconfigured",
  detail: "MONGODB_URI is not configured"
};

export async function connectDatabase() {
  if (!config.mongoUri) {
    dbState.status = "unavailable";
    dbState.detail = "MONGODB_URI is not configured";
    return false;
  }
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    dbState.status = "ready";
    dbState.detail = "MongoDB connected";
    return true;
  } catch (error) {
    dbState.status = "unavailable";
    dbState.detail = "MongoDB connection failed";
    console.error("MongoDB connection failed:", error.message);
    return false;
  }
}

export function isDatabaseAvailable() {
  return dbState.status === "ready" && mongoose.connection.readyState === 1;
}
