import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, required: true, trim: true },
  details: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.models.ProductActivity || mongoose.model("ProductActivity", activitySchema);
