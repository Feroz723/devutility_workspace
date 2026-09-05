export type ConnectionStatus = "CONNECTED" | "NOT_CONNECTED" | "PLANNED";

export type IntegrationKey =
  | "supabase"
  | "ai_provider"
  | "n8n"
  | "github"
  | "payments"
  | "browser_automation";

export interface IntegrationStatus {
  key: IntegrationKey;
  label: string;
  status: ConnectionStatus;
  notes?: string;
}

export const INTEGRATION_STATUSES: IntegrationStatus[] = [
  {
    key: "supabase",
    label: "Supabase / PostgreSQL",
    status: "NOT_CONNECTED",
    notes: "Schema and client will be wired in a later milestone."
  },
  {
    key: "ai_provider",
    label: "AI Provider (Groq / Gemini)",
    status: "NOT_CONNECTED",
    notes: "Provider selection and prompt engine planned; defaults to mock."
  },
  {
    key: "n8n",
    label: "n8n Automation",
    status: "PLANNED",
    notes: "Webhook contract drafted, dispatcher pending."
  },
  {
    key: "github",
    label: "GitHub",
    status: "PLANNED",
    notes: "Token reserved for future code-publishing agent."
  },
  {
    key: "payments",
    label: "Payments / Revenue Tracking",
    status: "NOT_CONNECTED",
    notes: "No revenue will be reported until a real integration ships."
  },
  {
    key: "browser_automation",
    label: "Browser Automation (Playwright)",
    status: "PLANNED",
    notes: "Only opt-in, rate-limited, and human-approved when used."
  }
];