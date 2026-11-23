import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const otpSchema = z.string().regex(/^\d{6}$/, "OTP must contain 6 digits");
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["consumer", "manufacturer"]).optional().default("consumer"),
  manufacturerName: z.string().trim().min(2).max(150).optional()
}).superRefine((value, context) => {
  if (value.role === "manufacturer" && !value.manufacturerName) {
    context.addIssue({ code: "custom", path: ["manufacturerName"], message: "Manufacturer name is required" });
  }
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).optional(),
  modelNumber: z.string().trim().max(200).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(4000).optional(),
  serialNumber: z.string().trim().min(1).max(200).optional(),
  manufacturingLocation: z.string().trim().max(300).optional(),
  manufacturingDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  materialComposition: z.array(z.object({
    material: z.string().trim().min(1).max(150),
    percentage: z.number().min(0).max(100).optional()
  })).optional(),
  warrantyDetails: z.object({
    duration: z.string().trim().max(200).optional(),
    terms: z.string().trim().max(3000).optional()
  }).optional(),
  environmentalInformation: z.object({
    carbonFootprint: z.number().min(0).optional(),
    carbonUnit: z.string().trim().max(50).optional(),
    recycledContentPercentage: z.number().min(0).max(100).optional(),
    source: z.string().trim().max(300).optional()
  }).optional().superRefine((value, context) => {
    if (value?.carbonFootprint !== undefined && !value.source) {
      context.addIssue({ code: "custom", path: ["source"], message: "A source is required when carbon footprint is provided" });
    }
  }),
  repairInstructions: z.string().trim().max(5000).optional(),
  recyclingInstructions: z.string().trim().max(5000).optional(),
});
