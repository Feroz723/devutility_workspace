import { Settings as SettingsIcon, Compass } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">System configuration and operational parameters.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Research Engine Configuration */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="h-4 w-4 text-[hsl(var(--primary))]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Research Engine Policy</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Autonomous Schedule</span>
              <span className="font-semibold text-zinc-200">1 bounded cycle / day (default)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Minimum Confidence for Test</span>
              <span className="font-semibold text-emerald-400">60%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Default Providers</span>
              <span className="text-zinc-300">Hacker News, GitHub Issues, Reddit Public</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Paid Search APIs Required</span>
              <span className="font-bold text-emerald-400">No (100% Free Public Evidence)</span>
            </div>
          </div>
        </div>

        {/* Spending Policy */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Spending Policy</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Automatic spending limit</span>
              <span className="font-bold text-emerald-400">₹0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Human approval required for external actions</span>
              <span className="font-medium">Yes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Autonomy enabled</span>
              <span className="font-medium">No</span>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Environment</h2>
          <div className="mt-4 space-y-2">
            {[
              ["DATABASE_URL", process.env.DATABASE_URL ? "Set" : "Not set"],
              ["OWNER_TOKEN", "Protected"],
              ["AI_PROVIDER", process.env.AI_PROVIDER || "mock"],
              ["GROQ_API_KEY", process.env.GROQ_API_KEY ? "Configured" : "Not configured"],
              ["GEMINI_API_KEY", process.env.GEMINI_API_KEY ? "Configured" : "Not configured"],
              ["GITHUB_TOKEN", process.env.GITHUB_TOKEN ? "Configured (higher rate limits)" : "Unauthenticated (public)"],
              ["N8N_BASE_URL", process.env.N8N_BASE_URL || "Not configured"],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{key}</span>
                <span className="text-xs">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
