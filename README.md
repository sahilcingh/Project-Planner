# Project Planner

A tool that helps you pick a tech stack for a new project and then tracks progress against it — the stack decision drives auto-generated starter milestones/tasks, instead of being a one-off questionnaire.

See [the build plan](./PLAN.md) for the full context, architecture, and roadmap.

## Structure

- `apps/web` — Next.js frontend + API (App Router, Tailwind, shadcn/ui)
- `packages/db` — Drizzle schema + Postgres client (targets Supabase)
- `packages/api` — tRPC routers, including the stack-advisor scoring engine

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + Anthropic credentials
pnpm db:push                 # push schema to your Postgres instance
pnpm dev
```

## Testing

```bash
pnpm test
```
