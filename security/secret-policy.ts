export interface SecretUsageAudit {
  name: string;
  usedIn: "server-only" | "client-only" | "shared";
  exposedToFrontend: boolean;
}

export const SERVER_ONLY_SECRETS: SecretUsageAudit[] = [
  { name: "DATABASE_URL", usedIn: "server-only", exposedToFrontend: false },
  { name: "SUPABASE_SERVICE_ROLE_KEY", usedIn: "server-only", exposedToFrontend: false },
  { name: "AI_API_KEY", usedIn: "server-only", exposedToFrontend: false },
  { name: "GROQ_API_KEY", usedIn: "server-only", exposedToFrontend: false },
  { name: "GEMINI_API_KEY", usedIn: "server-only", exposedToFrontend: false },
  { name: "N8N_WEBHOOK_SECRET", usedIn: "server-only", exposedToFrontend: false },
  { name: "GITHUB_TOKEN", usedIn: "server-only", exposedToFrontend: false }
];

export const FRONTEND_SAFE_ENVS: SecretUsageAudit[] = [
  { name: "NEXT_PUBLIC_APP_NAME", usedIn: "shared", exposedToFrontend: true }
];

export function assertNoSecretLeak(name: string): void {
  const upper = name.toUpperCase();
  const leaky = SERVER_ONLY_SECRETS.some((s) => s.name === upper);
  if (leaky) {
    throw new Error(
      `Refusing to expose server-only secret "${name}" to the frontend.`
    );
  }
}