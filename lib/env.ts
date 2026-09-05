import { z } from "zod";

const RawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").or(z.literal("")),
  SUPABASE_URL: z.string().url().or(z.literal("")).optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  AI_PROVIDER: z.enum(["groq", "gemini", "mock"]).default("mock"),
  AI_MODEL: z.string().default("llama-3.1-70b-versatile"),
  AI_API_KEY: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  N8N_BASE_URL: z.string().url().or(z.literal("")).optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),

  GITHUB_TOKEN: z.string().optional(),

  AUTONOMOUS_SPENDING_LIMIT_CENTS: z.coerce.number().int().nonnegative().default(0),
  AUTONOMOUS_REQUIRE_APPROVAL: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((v) => v === "true")
});

export type Env = z.infer<typeof RawEnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = RawEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isServerSide(): boolean {
  return typeof window === "undefined";
}