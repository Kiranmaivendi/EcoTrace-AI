import OpenAI from "openai";
import { config } from "../config.js";

export function aiAvailable() {
  return Boolean(config.openAiApiKey);
}

export function visionAvailable() {
  return Boolean(config.openAiApiKey && config.openAiVisionModel);
}

export function passportFacts(passport, product, manufacturer) {
  const env = product.environmentalInformation || {};
  return {
    passportId: passport.passportId,
    verificationStatus: passport.verificationStatus,
    carbonVerified: passport.carbonVerified,
    name: product.name,
    category: product.category || null,
    description: product.description || null,
    manufacturingLocation: product.manufacturingLocation || null,
    manufacturingDate: product.manufacturingDate || null,
    materialComposition: product.materialComposition || [],
    warrantyDetails: product.warrantyDetails || null,
    environmentalInformation: {
      carbonFootprint: env.carbonFootprint ?? null,
      carbonUnit: env.carbonUnit || null,
      recycledContentPercentage: env.recycledContentPercentage ?? null,
      source: env.source || null
    },
    repairInstructions: product.repairInstructions || null,
    recyclingInstructions: product.recyclingInstructions || null,
    manufacturer: manufacturer?.name || null
  };
}

export async function groundedCompletion(question, facts) {
  if (!aiAvailable()) {
    throw Object.assign(new Error("AI API key is not configured"), { code: "AI_UNAVAILABLE" });
  }
  const client = new OpenAI({ apiKey: config.openAiApiKey, baseURL: config.openAiBaseUrl });
  const completion = await client.chat.completions.create({
    model: config.openAiModel,
    temperature: 0,
    messages: [
      { role: "system", content: "Answer only from the supplied JSON passport facts. Do not infer or invent facts. Explicitly say when a fact is unavailable. Never present unverified carbon data as verified." },
      { role: "user", content: `Stored passport facts:\n${JSON.stringify(facts)}\n\nQuestion:\n${question}` }
    ]
  });
  return completion.choices?.[0]?.message?.content || "";
}

export async function compareProductImages(candidate, reference) {
  if (!visionAvailable()) {
    throw Object.assign(new Error("OPENAI_API_KEY and OPENAI_VISION_MODEL are required"), { code: "AI_UNAVAILABLE" });
  }
  const client = new OpenAI({ apiKey: config.openAiApiKey, baseURL: config.openAiBaseUrl });
  const response = await client.chat.completions.create({
    model: config.openAiVisionModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Compare the two product images only for visible similarities and differences. Do not claim that a product is authentic or counterfeit. Do not produce a confidence score. State limitations and that visual comparison is not forensic verification. Return a concise plain-text observation."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Image 1 is the manufacturer reference, which was marked verified by an administrator. Image 2 is the submitted image. Describe visible differences only." },
          { type: "image_url", image_url: { url: `data:${reference.mimeType};base64,${reference.buffer.toString("base64")}` } },
          { type: "image_url", image_url: { url: `data:${candidate.mimeType};base64,${candidate.buffer.toString("base64")}` } }
        ]
      }
    ]
  });
  return response.choices?.[0]?.message?.content || "The model returned no visual comparison.";
}
