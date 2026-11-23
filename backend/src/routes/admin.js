import { Router } from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import ProductPassport from "../models/ProductPassport.js";
import ProductActivity from "../models/ProductActivity.js";
import ProductIssue from "../models/ProductIssue.js";
import Manufacturer from "../models/Manufacturer.js";
import { requireAuth, authorize, requireDatabase } from "../middleware/auth.js";
import { errorResponse, zodDetails } from "../utils/errors.js";
import { z } from "zod";
import { imageUpload, validateImageContent } from "../middleware/upload.js";

const router = Router();
router.use(requireDatabase, requireAuth, authorize("admin"));

router.get("/summary", async (req, res, next) => {
  try {
    const [users, manufacturers, products, passports, verifiedProducts] = await Promise.all([
      User.countDocuments(),
      Manufacturer.countDocuments(),
      Product.countDocuments(),
      ProductPassport.countDocuments(),
      Product.countDocuments({ verificationStatus: "verified" })
    ]);
    res.json({ users, manufacturers, products, passports, verifiedProducts });
  } catch (error) { next(error); }
});

router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("name email role isEmailVerified createdAt manufacturer").sort({ createdAt: -1 }).limit(200);
    res.json({ users });
  } catch (error) { next(error); }
});

router.patch("/users/:userId/role", async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(["consumer", "manufacturer"]),
      manufacturerName: z.string().trim().min(2).max(150).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid role update", zodDetails(parsed.error));
    const user = await User.findById(req.params.userId);
    if (!user) return errorResponse(res, 404, "NOT_FOUND", "User not found");
    if (parsed.data.role === "manufacturer" && !user.manufacturer) {
      if (!parsed.data.manufacturerName) return errorResponse(res, 400, "MANUFACTURER_NAME_REQUIRED", "Manufacturer name is required when promoting this user");
      const manufacturer = await Manufacturer.create({ name: parsed.data.manufacturerName, user: user._id });
      user.manufacturer = manufacturer._id;
    }
    user.role = parsed.data.role;
    await user.save();
    res.json({ user: { id: user._id, email: user.email, role: user.role, manufacturer: user.manufacturer } });
  } catch (error) { next(error); }
});

router.get("/manufacturers", async (req, res, next) => {
  try {
    const manufacturers = await Manufacturer.find().select("name isVerified referenceData createdAt").sort({ createdAt: -1 }).limit(200);
    res.json({ manufacturers });
  } catch (error) { next(error); }
});

router.patch("/manufacturers/:manufacturerId/reference-image", imageUpload.single("referenceImage"), validateImageContent, async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, "IMAGE_REQUIRED", "Upload a manufacturer reference image");
    const manufacturer = await Manufacturer.findById(req.params.manufacturerId);
    if (!manufacturer) return errorResponse(res, 404, "NOT_FOUND", "Manufacturer not found");
    manufacturer.referenceData = {
      ...(manufacturer.referenceData?.toObject?.() || {}),
      referenceImageUrl: `/uploads/${req.file.filename}`,
      referenceImageMimeType: req.file.mimetype,
      verifiedAt: null
    };
    manufacturer.isVerified = false;
    await manufacturer.save();
    res.json({ message: "Reference image uploaded and awaiting verification." });
  } catch (error) { next(error); }
});

router.patch("/manufacturers/:manufacturerId/verification", async (req, res, next) => {
  try {
    const schema = z.object({
      isVerified: z.boolean(),
      serialNumbers: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
      modelCodes: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
      source: z.string().trim().max(500).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid manufacturer reference data", zodDetails(parsed.error));
    const manufacturer = await Manufacturer.findById(req.params.manufacturerId);
    if (!manufacturer) return errorResponse(res, 404, "NOT_FOUND", "Manufacturer not found");
    manufacturer.isVerified = parsed.data.isVerified;
    const currentReference = manufacturer.referenceData?.toObject?.() || {};
    if (parsed.data.isVerified && (!currentReference.referenceImageUrl || !parsed.data.source)) {
      return errorResponse(res, 400, "REFERENCE_EVIDENCE_REQUIRED", "Upload a reference image and add its source before verification");
    }
    manufacturer.referenceData = {
      ...currentReference,
      serialNumbers: parsed.data.serialNumbers ?? currentReference.serialNumbers ?? [],
      modelCodes: parsed.data.modelCodes ?? currentReference.modelCodes ?? [],
      source: parsed.data.source ?? currentReference.source ?? "",
      verifiedAt: parsed.data.isVerified ? new Date() : null
    };
    await manufacturer.save();
    res.json({ manufacturer: { id: manufacturer._id, name: manufacturer.name, isVerified: manufacturer.isVerified } });
  } catch (error) { next(error); }
});

router.get("/products", async (req, res, next) => {
  try {
    const products = await Product.find().populate("manufacturer", "name").sort({ createdAt: -1 }).limit(200);
    res.json({ products });
  } catch (error) { next(error); }
});

router.get("/issues", async (req, res, next) => {
  try {
    const issues = await ProductIssue.find()
      .populate("product", "productId name")
      .populate("reporter", "name email")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ issues });
  } catch (error) { next(error); }
});

router.patch("/issues/:issueId", async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(["open", "reviewing", "resolved"]) }).safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid issue status", zodDetails(parsed.error));
    const issue = await ProductIssue.findByIdAndUpdate(req.params.issueId, { status: parsed.data.status }, { new: true, runValidators: true });
    if (!issue) return errorResponse(res, 404, "NOT_FOUND", "Issue not found");
    res.json({ issue });
  } catch (error) { next(error); }
});

router.patch("/products/:productId/verification", async (req, res, next) => {
  try {
    const schema = z.object({
      verificationStatus: z.enum(["unverified", "pending", "verified"]),
      carbonVerified: z.boolean().optional().default(false)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid product verification update", zodDetails(parsed.error));
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) return errorResponse(res, 404, "NOT_FOUND", "Product not found");
    const hasSourcedCarbonData = Number.isFinite(product.environmentalInformation?.carbonFootprint)
      && Boolean(product.environmentalInformation?.source);
    if (parsed.data.carbonVerified && !hasSourcedCarbonData) {
      return errorResponse(res, 400, "CARBON_EVIDENCE_REQUIRED", "Carbon data with a source is required before marking it verified");
    }
    product.verificationStatus = parsed.data.verificationStatus;
    product.carbonVerified = parsed.data.carbonVerified && parsed.data.verificationStatus === "verified";
    await product.save();
    const passport = await ProductPassport.findOne({ product: product._id });
    if (passport) {
      passport.verificationStatus = product.verificationStatus;
      passport.carbonVerified = product.carbonVerified;
      await passport.save();
    }
    await ProductActivity.create({ product: product._id, user: req.user._id, type: "verification-updated", details: { verificationStatus: product.verificationStatus, carbonVerified: product.carbonVerified } });
    res.json({ product, passport });
  } catch (error) { next(error); }
});

export default router;
