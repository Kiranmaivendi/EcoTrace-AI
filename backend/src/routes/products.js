import { Router } from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { requireAuth, authorize, requireDatabase } from "../middleware/auth.js";
import { imageUpload, validateImageContent } from "../middleware/upload.js";
import Product from "../models/Product.js";
import ProductPassport from "../models/ProductPassport.js";
import ProductActivity from "../models/ProductActivity.js";
import ProductIssue from "../models/ProductIssue.js";
import Manufacturer from "../models/Manufacturer.js";
import { productSchema } from "../utils/validation.js";
import { errorResponse, zodDetails } from "../utils/errors.js";
import { config } from "../config.js";

const router = Router();

router.use(requireDatabase);

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = String(req.query.category).slice(0, 100);
    if (req.query.q) {
      const escaped = String(req.query.q).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { brand: { $regex: escaped, $options: "i" } },
        { productId: { $regex: escaped, $options: "i" } }
      ];
    }
    const products = await Product.find(filter)
      .select("productId name brand category verificationStatus")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ products });
  } catch (error) { next(error); }
});

router.get("/mine", requireAuth, authorize("manufacturer", "admin"), async (req, res, next) => {
  try {
    const query = req.user.role === "manufacturer" ? { manufacturer: req.user.manufacturer } : {};
    const products = await Product.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ products });
  } catch (error) { next(error); }
});

router.post("/:productId/issues", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(["incorrect-information", "suspected-counterfeit", "other"]),
      description: z.string().trim().min(5).max(3000)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid issue report", zodDetails(parsed.error));
    const product = await Product.findOne({ productId: req.params.productId }).select("_id");
    if (!product) return errorResponse(res, 404, "NOT_FOUND", "Product not found");
    const issue = await ProductIssue.create({ ...parsed.data, product: product._id, reporter: req.user._id });
    await ProductActivity.create({ product: product._id, user: req.user._id, type: "issue-reported", details: { issueId: issue._id } });
    res.status(201).json({ issue });
  } catch (error) { next(error); }
});

router.post("/", requireAuth, authorize("manufacturer", "admin"), imageUpload.single("image"), validateImageContent, async (req, res, next) => {
  try {
    let body = req.body;
    for (const field of ["materialComposition", "warrantyDetails", "environmentalInformation"]) {
      if (typeof body[field] === "string") {
        try { body[field] = JSON.parse(body[field]); } catch { /* handled by zod */ }
      }
    }
    if (typeof body.manufacturingDate === "string" && !body.manufacturingDate) delete body.manufacturingDate;
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid product data", zodDetails(parsed.error));

    let manufacturer;
    if (req.user.role === "admin" && req.body.manufacturerId) {
      manufacturer = await Manufacturer.findById(req.body.manufacturerId);
    } else {
      manufacturer = await Manufacturer.findById(req.user.manufacturer);
    }
    if (!manufacturer) return errorResponse(res, 403, "MANUFACTURER_REQUIRED", "A manufacturer profile is required");

    const data = { ...parsed.data, manufacturer: manufacturer._id, verificationStatus: "unverified", carbonVerified: false };
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;
    const product = await Product.create(data);
    const passportId = product.productId;
    const publicUrl = `${config.publicAppUrl.replace(/\/$/, "")}/passport/${passportId}`;
    const qrDataUrl = await QRCode.toDataURL(publicUrl);
    const passport = await ProductPassport.create({
      product: product._id,
      passportId,
      publicUrl,
      qrDataUrl,
      verificationStatus: "unverified",
      carbonVerified: false
    });
    await ProductActivity.create({ product: product._id, user: req.user._id, type: "created", details: { passportId } });
    res.status(201).json({ product, passport });
  } catch (error) { next(error); }
});

router.get("/:productId", requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) return errorResponse(res, 404, "NOT_FOUND", "Product not found");
    if (req.user.role === "manufacturer" && product.manufacturer.toString() !== req.user.manufacturer?.toString()) {
      return errorResponse(res, 403, "FORBIDDEN", "You cannot access this product");
    }
    const passport = await ProductPassport.findOne({ product: product._id });
    res.json({ product, passport });
  } catch (error) {
    if (error.name === "CastError") return errorResponse(res, 404, "NOT_FOUND", "Product not found");
    next(error);
  }
});

router.patch("/:productId", requireAuth, authorize("manufacturer", "admin"), imageUpload.single("image"), validateImageContent, async (req, res, next) => {
  try {
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) return errorResponse(res, 404, "NOT_FOUND", "Product not found");
    if (req.user.role === "manufacturer" && product.manufacturer.toString() !== req.user.manufacturer?.toString()) {
      return errorResponse(res, 403, "FORBIDDEN", "You cannot update this product");
    }
    let body = req.body;
    const clearManufacturingDate = body.manufacturingDate === "";
    if (clearManufacturingDate) delete body.manufacturingDate;
    for (const field of ["materialComposition", "warrantyDetails", "environmentalInformation"]) {
      if (typeof body[field] === "string") {
        try { body[field] = JSON.parse(body[field]); } catch { /* handled by zod */ }
      }
    }
    const partial = productSchema.partial();
    const parsed = partial.safeParse(body);
    if (!parsed.success) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid product data", zodDetails(parsed.error));
    if (clearManufacturingDate) parsed.data.manufacturingDate = undefined;
    delete parsed.data.verificationStatus;
    delete parsed.data.carbonVerified;
    if (req.file) parsed.data.imageUrl = `/uploads/${req.file.filename}`;
    Object.assign(product, parsed.data);
    product.verificationStatus = "unverified";
    product.carbonVerified = false;
    await product.save();
    const passport = await ProductPassport.findOne({ product: product._id });
    if (passport) {
      passport.verificationStatus = "unverified";
      passport.carbonVerified = false;
      await passport.save();
    }
    await ProductActivity.create({ product: product._id, user: req.user._id, type: "updated", details: {} });
    res.json({ product, passport });
  } catch (error) {
    if (error.name === "CastError") return errorResponse(res, 404, "NOT_FOUND", "Product not found");
    next(error);
  }
});

router.get("/:productId/passport", async (req, res, next) => {
  try {
    let passport;
    let product;
    passport = await ProductPassport.findOne({ passportId: req.params.productId });
    if (passport) product = await Product.findById(passport.product);
    if (!product) {
      product = await Product.findOne({ productId: req.params.productId });
    }
    if (!product) return errorResponse(res, 404, "NOT_FOUND", "Passport not found");
    if (!passport) passport = await ProductPassport.findOne({ product: product._id });
    if (!passport) return errorResponse(res, 404, "NOT_FOUND", "Passport not found");
    const manufacturer = await Manufacturer.findById(product.manufacturer).select("name");
    res.json({
      passport: {
        passportId: passport.passportId,
        verificationStatus: passport.verificationStatus,
        carbonVerified: passport.carbonVerified,
        qrDataUrl: passport.qrDataUrl,
        publicUrl: passport.publicUrl
      },
      product: {
        name: product.name,
        productId: product.productId,
        brand: product.brand || null,
        modelNumber: product.modelNumber || null,
        serialNumber: product.serialNumber || null,
        category: product.category || null,
        description: product.description || null,
        manufacturingLocation: product.manufacturingLocation || null,
        manufacturingDate: product.manufacturingDate || null,
        materialComposition: product.materialComposition || [],
        warrantyDetails: product.warrantyDetails || null,
        environmentalInformation: product.environmentalInformation || null,
        repairInstructions: product.repairInstructions || null,
        recyclingInstructions: product.recyclingInstructions || null,
        imageUrl: product.imageUrl || null,
        verificationStatus: product.verificationStatus,
        carbonVerified: product.carbonVerified
      },
      manufacturer: manufacturer ? { name: manufacturer.name } : null
    });
  } catch (error) {
    if (error.name === "CastError") return errorResponse(res, 404, "NOT_FOUND", "Passport not found");
    next(error);
  }
});

export default router;
