# Autonomous Business OS

> A real autonomous digital-business operating system — not a demo.

Autonomous Business OS is a Next.js + TypeScript application whose goal is to
discover opportunities, research demand, validate ideas, build digital products,
distribute them, track sales, learn from results, and repeat — entirely under
human-defined guardrails.

## Hard rules (non-negotiable)

1. **Zero automatic spending.** The AI is never allowed to spend money.
   Anything that costs money, touches a sensitive account, or is irreversible
   MUST be approved by a human first. This is enforced at runtime, not just
   documented.
2. **No fake AI.** If a model is not wired up, it is marked `NOT_CONNECTED`.
3. **No fake revenue.** The UI never displays made-up sales numbers.
4. **No fake integrations.** If Supabase, Groq, Gemini, n8n, GitHub, or
   payments are not actually connected, they are marked `NOT_CONNECTED`.

## Status of this commit

This repository contains the scaffolding and application shell only.

| Area                | Status         |
| ------------------- | -------------- |
| Project structure   | DONE           |
| TypeScript config   | DONE           |
| Tailwind + shadcn/ui tokens | DONE  |
| App shell + layout  | DONE           |
| Spending guardrail  | DONE (tested)  |
| Database            | PLANNED        |
| Supabase            | NOT_CONNECTED  |
| AI providers        | NOT_CONNECTED  |
| n8n automation      | NOT_CONNECTED  |
| GitHub automation   | NOT_CONNECTED  |
| Research agents     | PLANNED        |
| Decision engine     | PLANNED        |
| Product builder     | PLANNED        |
| Distribution        | PLANNED        |
| Sales tracking      | PLANNED        |

## Scripts

```bash
npm install
npm run dev        # start the Next.js dev server
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
```

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [SECURITY.md](./docs/SECURITY.md)
- [AUTOMATION.md](./docs/AUTOMATION.md)
- [AGENTS.md](./docs/AGENTS.md)

## Environment

Copy `.env.example` to `.env.local` and fill in values. See `.env.example` for
the full list. Never commit `.env.local`.