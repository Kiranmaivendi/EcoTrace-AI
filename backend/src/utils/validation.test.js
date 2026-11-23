import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema, productSchema, otpSchema, passwordSchema } from "./validation.js";

test("registration requires manufacturer name for manufacturers", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: "USER@example.com",
    password: "secure-pass",
    role: "manufacturer"
  });
  assert.equal(result.success, false);
});

test("registration normalizes a valid email", () => {
  const result = registerSchema.parse({
    name: "Test User",
    email: "USER@example.com",
    password: "secure-pass",
    role: "consumer"
  });
  assert.equal(result.email, "user@example.com");
});

test("product facts preserve EcoTrace field names and default no verification fields", () => {
  const product = productSchema.parse({
    name: "Reusable Bottle",
    manufacturingLocation: "Bengaluru",
    manufacturingDate: "2026-01-15",
    materialComposition: [{ material: "Steel", percentage: 90 }],
    warrantyDetails: { duration: "2 years", terms: "Registered warranty" },
    environmentalInformation: { carbonFootprint: 12.5, carbonUnit: "kg CO2e", source: "Manufacturer data" }
  });
  assert.equal(product.manufacturingLocation, "Bengaluru");
  assert.equal(product.environmentalInformation.carbonFootprint, 12.5);
});

test("carbon footprints require a source and client-supplied verification fields are discarded", () => {
  const missingSource = productSchema.safeParse({
    name: "Reusable Bottle",
    environmentalInformation: { carbonFootprint: 12.5 }
  });
  assert.equal(missingSource.success, false);

  const product = productSchema.parse({
    name: "Reusable Bottle",
    verificationStatus: "verified",
    carbonVerified: true,
    productId: "ATTACKER-SET-ID"
  });
  assert.equal("verificationStatus" in product, false);
  assert.equal("carbonVerified" in product, false);
  assert.equal("productId" in product, false);
});

test("OTP and password validation are strict", () => {
  assert.equal(otpSchema.safeParse("12345").success, false);
  assert.equal(otpSchema.safeParse("123456").success, true);
  assert.equal(passwordSchema.safeParse("short").success, false);
});
