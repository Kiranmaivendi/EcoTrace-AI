import { Router } from "express";
import Product from "../models/Product.js";
import ProductPassport from "../models/ProductPassport.js";
import ProductActivity from "../models/ProductActivity.js";
import User from "../models/User.js";
import { requireAuth, authorize, requireDatabase } from "../middleware/auth.js";

const router = Router();

router.get("/", requireDatabase, requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "manufacturer"
      ? { manufacturer: req.user.manufacturer }
      : req.user.role === "admin" ? {} : { _id: null };
    const products = await Product.find(filter).sort({ createdAt: -1 }).limit(100);
    const productIds = products.map((product) => product._id);
    const passports = await ProductPassport.find({ product: { $in: productIds } });
    const recentActivity = productIds.length
      ? await ProductActivity.find({ product: { $in: productIds } }).sort({ createdAt: -1 }).limit(10).lean()
      : [];
    res.json({
      summary: {
        productCount: products.length,
        passportCount: passports.length,
        verifiedProductCount: products.filter((p) => p.verificationStatus === "verified").length,
        carbonVerifiedCount: passports.filter((p) => p.carbonVerified).length
      },
      products,
      recentActivity
    });
  } catch (error) { next(error); }
});

router.get("/summary", requireDatabase, requireAuth, authorize("admin"), async (req, res, next) => {
  try {
    const [users, products, passports, verifiedProducts] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      ProductPassport.countDocuments(),
      Product.countDocuments({ verificationStatus: "verified" })
    ]);
    res.json({ users, products, passports, verifiedProducts });
  } catch (error) { next(error); }
});

export default router;
