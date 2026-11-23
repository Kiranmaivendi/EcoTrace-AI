import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ET-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
  },
  manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: "Manufacturer", required: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, trim: true },
  modelNumber: { type: String, trim: true },
  category: { type: String, trim: true },
  description: { type: String, trim: true },
  serialNumber: { type: String, trim: true },
  manufacturingLocation: { type: String, trim: true },
  manufacturingDate: { type: mongoose.Schema.Types.Mixed },
  materialComposition: [{ material: String, percentage: Number }],
  warrantyDetails: {
    duration: String,
    terms: String
  },
  environmentalInformation: {
    carbonFootprint: Number,
    carbonUnit: String,
    recycledContentPercentage: Number,
    source: String
  },
  repairInstructions: { type: String, trim: true },
  recyclingInstructions: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  carbonVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ["unverified", "pending", "verified"], default: "unverified" }
}, { timestamps: true });

productSchema.index({ manufacturer: 1, serialNumber: 1 });
export default mongoose.models.Product || mongoose.model("Product", productSchema);
