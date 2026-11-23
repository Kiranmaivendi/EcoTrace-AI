import mongoose from "mongoose";

const referenceSchema = new mongoose.Schema({
  serialNumbers: [{ type: String, trim: true }],
  modelCodes: [{ type: String, trim: true }],
  referenceImageUrl: { type: String, trim: true },
  referenceImageMimeType: { type: String, trim: true },
  verifiedAt: Date,
  source: { type: String, trim: true }
}, { _id: false });

const manufacturerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isVerified: { type: Boolean, default: false },
  referenceData: referenceSchema
}, { timestamps: true });

export default mongoose.models.Manufacturer || mongoose.model("Manufacturer", manufacturerSchema);
