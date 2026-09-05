import { Bot } from "lucide-react";

const AGENTS = [
  { id: "discovery", name: "Discovery Agent", desc: "Find candidate opportunities from public sources.", status: "PLANNED" },
  { id: "research", name: "Research Agent", desc: "Validate demand and competitors for a candidate.", status: "PLANNED" },
  { id: "validator", name: "Validator Agent", desc: "Score a candidate against go/no-go rules.", status: "PLANNED" },
  { id: "builder", name: "Builder Agent", desc: "Generate a digital product.", status: "PLANNED" },
  { id: "distributor", name: "Distributor Agent", desc: "Push the product to free channels.", status: "PLANNED" },
  { id: "seller", name: "Seller Agent", desc: "Track sales, refunds, and conversion.", status: "PLANNED" },
  { id: "learner", name: "Learner Agent", desc: "Turn results into scoring rule updates.", status: "PLANNED" },
] as const;

const statusColors: Record<string, string> = {
  PLANNED: "text-amber-400 bg-amber-400/10",
  ACTIVE: "text-emerald-400 bg-emerald-400/10",
  DISABLED: "text-zinc-400 bg-zinc-400/10",
};

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Agent roster. All agents are PLANNED until implementation lands.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {AGENTS.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-4 hover:border-[hsl(var(--primary)_/_0.3)] transition-colors">
            <div>
              <p className="font-medium text-sm">{agent.name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{agent.desc}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[agent.status] ?? ""}`}>
              {agent.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
