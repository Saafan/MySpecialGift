import { z } from "zod";

/**
 * Environment validation, checked once at first import.
 * V1 fell back to a published "dev-secret-key" when JWT_SECRET was unset (SEC-05);
 * V2 has no fallback secrets — a misconfigured environment fails loudly at boot.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  STORAGE_DIR: z.string().default(".data/uploads"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
