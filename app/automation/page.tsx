import { Zap } from "lucide-react";

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">n8n and internal automation workflows.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center">
        <Zap className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))]" />
        <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
          No automation workflows configured yet.
        </p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          Configure N8N_BASE_URL and N8N_WEBHOOK_SECRET to connect n8n.
        </p>
      </div>
    </div>
  );
}
