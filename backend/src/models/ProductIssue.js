import mongoose from "mongoose";

const productIssueSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["incorrect-information", "suspected-counterfeit", "other"], required: true },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ["open", "reviewing", "resolved"], default: "open", index: true }
}, { timestamps: true });

export default mongoose.models.ProductIssue || mongoose.model("ProductIssue", productIssueSchema);
