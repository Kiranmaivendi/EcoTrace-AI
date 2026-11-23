import mongoose from "mongoose";

const passportSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
  passportId: { type: String, required: true, unique: true, index: true },
  qrDataUrl: { type: String },
  publicUrl: { type: String },
  carbonVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ["unverified", "pending", "verified"], default: "unverified" }
}, { timestamps: true });

export default mongoose.models.ProductPassport || mongoose.model("ProductPassport", passportSchema);
