import multer from "multer";
import path from "path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import fs from "node:fs/promises";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));
export const uploadsDirectory = path.resolve(backendRoot, "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDirectory),
  filename: (req, file, cb) => {
    const ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.mimetype];
    cb(null, `${randomUUID()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
    cb(Object.assign(new Error("Only JPEG, PNG, and WebP images are supported"), { code: "INVALID_IMAGE_TYPE" }));
    return;
  }
  cb(null, true);
};

const limits = { fileSize: 5 * 1024 * 1024, files: 1 };

export const imageUpload = multer({
  storage,
  limits,
  fileFilter
});

export const memoryImageUpload = multer({
  storage: multer.memoryStorage(),
  limits,
  fileFilter
});

export async function validateImageContent(req, res, next) {
  if (!req.file) return next();
  try {
    const buffer = req.file.buffer || await fs.readFile(req.file.path);
    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    const matchesMime = (req.file.mimetype === "image/png" && isPng)
      || (req.file.mimetype === "image/jpeg" && isJpeg)
      || (req.file.mimetype === "image/webp" && isWebp);
    if (!matchesMime) {
      if (req.file.path) await fs.unlink(req.file.path);
      return next(Object.assign(new Error("Uploaded file content is not a supported image"), { code: "INVALID_IMAGE_TYPE" }));
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
