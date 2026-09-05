# Architecture

## High-level

```
                ┌─────────────────────────────────────────────┐
                │            Next.js (App Router)             │
                │                                             │
   Browser ───► │   app/ (pages, layouts, server actions)     │
                │                                             │
                │   components/  (UI, shadcn-style)          │
                │                                             │
                │   server/      (server-only logic)         │
                │   ├─ agents/   (agent orchestrator)        │
                │   ├─ research/ (demand research)           │
                │   ├─ decision-engine/                      │
                │   └─ automation/                           │
                │                                             │
                │   lib/        (typed helpers)              │
                │   security/   (guardrails, policies)       │
                │   database/   (DB client, migrations)       │
                │   types/      (shared types)               │
                │   config/     (env validation)             │
                └─────────────────────────────────────────────┘
                              │                │
                              ▼                ▼
                    ┌──────────────────┐  ┌────────────────┐
                    │ PostgreSQL /     │  │ n8n (NOT_CONN) │
                    │ Supabase (NOT_)  │  └────────────────┘
                    └──────────────────┘
```

## Folder responsibilities

- **app/** — Next.js routes, layouts, server actions, API handlers.
- **components/** — Reusable React UI (shadcn/ui style, Tailwind tokens).
- **lib/** — Pure, typed helpers (formatting, ids, errors, etc.).
- **server/** — Server-only business logic; never imported by client code.
  - **agents/** — Autonomous agents (currently PLANNED).
  - **research/** — Demand research (currently PLANNED).
  - **decision-engine/** — Opportunity scoring (currently PLANNED).
  - **automation/** — n8n / GitHub automation (currently NOT_CONNECTED).
- **security/** — Policies and guards. The `SpendingPolicy` here is the
  single source of truth for the ₹0 limit.
- **database/** — DB client factory and migrations. Real client wiring is
  PLANNED; the file currently exposes a typed contract and a stub client.
- **types/** — Shared TypeScript types and Zod schemas.
- **config/** — Environment variable parsing + validation (Zod).
- **tests/** — Vitest tests for pure logic (policies, env parsing).
- **docs/** — Project documentation.

## Request lifecycle (target)

1. UI / scheduled trigger initiates an `OpportunityPipeline`.
2. `agents/orchestrator` calls `research/*` to collect raw demand signals.
3. `decision-engine` scores candidates against policies.
4. If the decision requires any side effect, it is funnelled through
   `security/policy.ts` — which blocks spending by default.
5. Approved, non-financial side effects go to `automation/*`.
6. All actions are logged to the database for later learning.

## Boundaries

- Client code may import from: `components`, `lib`, `types`, `app`.
- Client code MUST NOT import from: `server`, `security`, `database`,
  `agents`, `research`, `decision-engine`, `automation`, `config`.
- Only `config/env.public.ts` (or anything explicitly `NEXT_PUBLIC_*`) is
  browser-safe. Server-only env lives in `config/env.server.ts`.

## Why "server-only" modules?

Every module under `server/`, `database/`, `agents/`, `research/`,
`decision-engine/`, `automation/`, and `config/env.server.ts` is marked with
the `server-only` package guard so a client import fails the build instead
of leaking a secret at runtime.