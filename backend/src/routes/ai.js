import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireDatabase } from "../middleware/auth.js";
import { memoryImageUpload, uploadsDirectory, validateImageContent } from "../middleware/upload.js";
import ProductPassport from "../models/ProductPassport.js";
import Product from "../models/Product.js";
import Manufacturer from "../models/Manufacturer.js";
import { aiAvailable, groundedCompletion, passportFacts, compareProductImages, visionAvailable } from "../services/ai.js";
import { errorResponse, zodDetails } from "../utils/errors.js";
import fs from "node:fs/promises";
import path from "node:path";

const router = Router();

router.use(requireDatabase);

router.post("/assistant", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      passportId: z.string().trim().min(1).max(200),
      question: z.string().trim().min(1).max(3000)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid assistant request", zodDetails(parsed.error));
    if (!aiAvailable()) return errorResponse(res, 503, "AI_UNAVAILABLE", "AI API key is not configured");
    const passport = await ProductPassport.findOne({ passportId: parsed.data.passportId });
    if (!passport) return errorResponse(res, 404, "NOT_FOUND", "Passport not found");
    const product = await Product.findById(passport.product);
    if (!product) return errorResponse(res, 404, "NOT_FOUND", "Passport product not found");
    const manufacturer = await Manufacturer.findById(product.manufacturer).select("name");
    const facts = passportFacts(passport, product, manufacturer);
    const answer = await groundedCompletion(parsed.data.question, facts);
    res.json({ answer, factsUsed: facts, disclaimer: "Answers are grounded only in stored passport facts." });
  } catch (error) {
    if (error.code === "AI_UNAVAILABLE") return errorResponse(res, 503, "AI_UNAVAILABLE", error.message);
    next(error);
  }
});

router.post("/counterfeit", requireAuth, memoryImageUpload.single("image"), validateImageContent, async (req, res, next) => {
  try {
    const schema = z.object({
      passportId: z.string().trim().min(1).max(200)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid screening request", zodDetails(parsed.error));
    if (!req.file) return errorResponse(res, 400, "IMAGE_REQUIRED", "Upload a product image to screen");
    const passport = await ProductPassport.findOne({ passportId: parsed.data.passportId });
    const product = passport ? await Product.findById(passport.product) : null;
    if (!product) {
      return res.status(422).json({
        status: "insufficient-reference-data",
        assessment: "not-assessed",
        confidence: null,
        message: "No product passport was found for this ID."
      });
    }
    const manufacturer = await Manufacturer.findById(product.manufacturer);
    const reference = manufacturer?.referenceData;
    if (!reference?.verifiedAt || !reference.referenceImageUrl) {
      return res.status(422).json({
        status: "insufficient-reference-data",
        assessment: "not-assessed",
        confidence: null,
        message: "A verified manufacturer reference image is not available. No authenticity assessment was made."
      });
    }
    if (!visionAvailable()) return errorResponse(res, 503, "AI_UNAVAILABLE", "Vision analysis is not configured");
    const referencePath = path.resolve(uploadsDirectory, path.basename(reference.referenceImageUrl));
    const referenceBuffer = await fs.readFile(referencePath);
    const summary = await compareProductImages(
      { buffer: req.file.buffer, mimeType: req.file.mimetype },
      { buffer: referenceBuffer, mimeType: reference.referenceImageMimeType || `image/${path.extname(referencePath).slice(1)}` }
    );
    return res.json({
      status: "visual-screening",
      assessment: "visual-comparison-only",
      summary,
      confidence: null,
      disclaimer: "AI visual screening is not forensic verification and does not determine authenticity."
    });
  } catch (error) {
    if (error.code === "AI_UNAVAILABLE") return errorResponse(res, 503, "AI_UNAVAILABLE", error.message);
    next(error);
  }
});

export default router;
