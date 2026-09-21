# Project Planner — Research & Build Plan

## Context

You want to build a public SaaS product (under Qyroxis.ai) that does two things at once: helps someone decide **what tech stack to use** for a new project, and then lets them **manage and track progress** on that project — tightly linked, so the stack decision actually shapes the work plan (not two bolted-together tools). It needs to start as a single web-app MVP but be architected so a desktop app and a CLI can be added later without a rewrite.

The monorepo scaffold, Drizzle schema, and the deterministic stack-scoring engine (with passing unit tests) are already built and verified — see "What's already built" below. Scope of this revision: **only** the stack-advisor's AI rationale call changes, from the Anthropic API (a paid key with rate limits and usage conditions attached) to a small open-weight model running **in-process via transformers.js** (no separate server, no external API). Supabase (Postgres + Auth), the rest of the tech stack, and the data model are unchanged from the original plan — no broader rebuild.

Note on how we got here: the first self-hosted attempt was Ollama, but its Windows installer is distributed via a GitHub release CDN that's unreachable from this network (confirmed with repeated `winget` and direct `curl` failures — connection timeouts to `release-assets.githubusercontent.com`). Hugging Face's CDN, by contrast, is reachable (verified by downloading a real 73MB ONNX weight file successfully). transformers.js pulls model weights from Hugging Face and runs the model directly inside the Node/tRPC process — no separate binary to install at all, sidestepping the blocked CDN entirely.

### What's already built (unaffected by this change)
- `packages/db` — Drizzle schema for projects, `StackDecision` (versioned), `StackOption`/`TaskTemplate` catalogs, milestones, tasks
- `packages/api` — deterministic stack-scoring engine (`scoring.ts`, 10-option catalog in `catalog.ts`, 4 passing Vitest tests) + a tRPC router
- `apps/web` — Next.js 16 app with a working questionnaire → recommendation demo page, verified end-to-end (dev server, tRPC call, rendered page, lint all clean)

What changes: only how the stack-advisor's rationale text gets generated (`ANTHROPIC_API_KEY` → an in-process transformers.js call, model configurable via `LOCAL_MODEL`, defaulting to `onnx-community/Qwen2.5-0.5B-Instruct`). `DATABASE_URL`, Supabase Auth, and everything else stay as originally planned.

### Market research findings
- No direct competitor combines a tech-stack advisor with integrated project tracking. Tools like StackShare are read-only stack *directories* (and its public API is effectively dead); project trackers (ClickUp, Backlog, Linear, Jira) have no stack-decision layer at all. **The integration is the differentiator** — worth protecting as the core design principle, not an afterthought.
- Generic "AI stack recommender" tools exist (e.g. brilworks, ai-autosite) but are one-shot questionnaires disconnected from any follow-through — they recommend and abandon you.
- 2026 consensus for a SaaS MVP stack is converging hard on **TypeScript + Next.js + Postgres (Supabase) + Tailwind + Stripe + Resend, hosted on Vercel** — "boring by design," well-documented, fast to hire for.
- For shipping the same product as web → desktop, **Tauri has overtaken Electron** as the default recommendation (smaller binaries, reuses a React/Svelte frontend, Rust shell instead of bundling Chromium).

Sources: [Best Tech Stack Recommender Tool](https://www.brilworks.com/tools/tech-stack-recommender/), [AI Stack Recommender Guide](https://ai-autosite.com/blog/ai-stack-recommender-guide), [StackShare Alternative](https://detectzestack.com/blog/stackshare-alternative), [SaaS MVP tech stack 2026 — boring by design](https://solvspot.com/blog/saas-mvp-tech-stack-2026), [Tauri v2 vs Electron 2026](https://www.buildmvpfast.com/blog/tauri-v2-vs-electron-desktop-apps-2026)

---

## Product shape

**Core loop:** create a project → answer a short questionnaire (goals, scale, team size, timeline/budget, platform targets, real-time needs, team's existing skills) → get a scored, explained stack recommendation with alternatives → accept it → the app auto-generates a starter milestone/task checklist tailored to that stack → track progress (kanban + milestones + % complete) as you build.

The stack decision is a **first-class, versioned record** on the project (not a one-time wizard you never see again) — you can revisit it, compare alternatives, or change your mind later, and that decision record is what drives the generated task templates.

### MVP scope (Phase 1 — web only)
- Auth (email + Google/GitHub OAuth)
- Create project → stack-advisor questionnaire → recommendation (scored rule-based engine + local-model-generated rationale/comparison of top 3 options)
- Accept/override recommendation → `StackDecision` saved, versioned
- Auto-generated starter checklist of milestones/tasks based on the chosen stack (from a curated template library, e.g. "Next.js + Supabase" → seed tasks: repo setup, auth config, schema design, CI, deploy)
- Kanban board (To Do / In Progress / Done) + manual task CRUD
- Milestones with due dates; project/milestone progress % auto-rolled up from task completion
- Single-owner projects (no team collaboration yet — keeps MVP data model and auth simple)

### Later phases (explicitly out of MVP scope, but the architecture below supports them without rework)
- **Phase 2:** teams/orgs, roles, invites, comments, notifications, Stripe billing tiers, GitHub issue sync
- **Phase 3:** Desktop app via Tauri, wrapping the same React frontend against the same API
- **Phase 4:** CLI (Node, `commander`/`oclif`) hitting the same API — for creating/updating tasks and viewing the stack recommendation from the terminal

---

## Recommended tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language across web/API/CLI/desktop shell logic; shared types |
| Monorepo | pnpm workspaces + Turborepo | Lets `apps/web`, `apps/cli`, `apps/desktop` share a `packages/api-client` and `packages/types` later, without restructuring |
| Web frontend | Next.js 16 (App Router) + Tailwind | Fastest path to a polished MVP; huge hiring pool; SSR for a marketing/landing page + app in one project |
| API layer | tRPC | End-to-end type safety between Next.js frontend and backend with zero codegen; CLI (Node) and Tauri (JS runtime) can both consume the same tRPC client later |
| Database | PostgreSQL via Supabase | Managed Postgres + Auth + Storage in one place; removes infra ops for a solo/early-stage build |
| ORM | Drizzle | Lightweight, fully typed, SQL-first — easy to reason about the schema as the data model evolves |
| Auth | Supabase Auth | Email + OAuth out of the box, integrates directly with Postgres row-level security if needed later for teams |
| AI reasoning | **transformers.js + a small local ONNX model** (`onnx-community/Qwen2.5-0.5B-Instruct` by default, configurable via `LOCAL_MODEL`), self-hosted, in-process | Runs directly inside the Node/tRPC process — no separate server, no API key, no per-call rate limit or usage tier. Model weights download once from Hugging Face's CDN (confirmed reachable) and cache locally. Powers the stack-advisor's rationale text; kept as a separate, optional call so the deterministic ranking works with zero AI dependency (already true today) |
| Hosting | Vercel (web+API) + Supabase (DB/auth) | Zero-ops deploy for MVP, scales fine into Phase 2 |
| Payments (Phase 2) | Stripe | Standard choice, defer until there's something to charge for |
| Email | Resend | Transactional email (invites, digests) |
| Testing | Vitest (unit) + Playwright (e2e) | Standard, fast |
| Desktop (Phase 3) | Tauri v2 | Wraps the existing Next.js/React frontend; smaller & more secure than Electron |
| CLI (Phase 4) | Node + commander, using the shared tRPC client | Reuses API layer, no new backend work |

This removes the one piece of the stack that had per-call rate limits and usage conditions attached, without introducing a new binary/service to install or manage. Everything else stays the "boring, proven" 2026 SaaS stack from the original plan.

---

## Core data model (MVP)

- **User** — Supabase Auth user
- **Project** — owner, name, description, status
- **StackDecision** — belongs to Project; questionnaire answers (JSON), recommended options (top 3, scored + rationale), chosen option, version number, created_at (new row per re-evaluation, so history is preserved)
- **StackOption** (seed/reference data) — curated catalog of stack combinations (frontend/backend/db/hosting/auth) with tags used for scoring (team size fit, budget tier, real-time support, mobile support, learning-curve, popularity/hireability)
- **TaskTemplate** (seed/reference data) — keyed by StackOption, produces seed Milestones/Tasks on project creation
- **Milestone** — belongs to Project; title, due_date, computed progress %
- **Task** — belongs to Milestone (or directly to Project); title, status (todo/in_progress/done), order

The stack-advisor "engine" is: a deterministic scoring pass over `StackOption` against the questionnaire answers (already built — fast, explainable, no AI dependency for the core ranking) + one in-process transformers.js call to turn the top-3 scored options into readable rationale/trade-off text. This keeps the ranking reproducible and free, while the explanation still feels intelligent — and if the local model fails to load or generate, the ranking still works, only the prose explanation is unavailable.

---

## Build order

1. ~~Scaffold monorepo~~ — done (`apps/web`, `packages/db`, `packages/api`)
2. ~~Stack-advisor scoring engine + demo~~ — done (`packages/api/src/stack-advisor/`, tRPC `recommend` procedure, working demo page)
3. ~~Stack-advisor rationale via transformers.js~~ — done (`packages/api/src/stack-advisor/rationale.ts`, tRPC `stackAdvisor.explain` mutation, "Generate explanation" button wired into the demo page); first real call downloads the model from Hugging Face, then caches it
4. ~~Auth~~ — done: Supabase Auth wired into Next.js via `@supabase/ssr` (`src/lib/supabase/{client,server}.ts`, `src/proxy.ts` for session refresh — Next 16 renamed the `middleware.ts` convention to `proxy.ts`, migrated), `/login` page (sign in/up), `AuthStatus`/`SignOutButton` components in the header. Verified against the live Supabase project: real signup/sign-in calls succeed.
5. ~~Data model + migrations~~ — done: schema pushed to Supabase Postgres (`pnpm db:push`, using `DIRECT_URL`/session pooler; `DATABASE_URL`/transaction pooler is for app runtime queries). Added `packages/db/src/sql/sync-auth-users.sql` — Supabase Auth writes to `auth.users`, which Drizzle doesn't manage, so a Postgres trigger mirrors each new row into `public.users` (the table `projects.owner_id` has a real FK to). Verified live: fresh signup → row appears in `public.users` automatically. `StackOption`/`TaskTemplate` catalog seed script still to do.
6. ~~Project tracking~~ — done: `project.create`/`generateRationale`/`acceptStack`/`list`/`get` + `task.updateStatus` tRPC procedures (`packages/api/src/routers/project.ts`, `task.ts`), `protectedProcedure` auth gate, `/projects/new` (questionnaire → recommendation → accept), `/projects/[id]` (milestone/task list with a status dropdown per task, progress bars)
7. ~~Dashboard~~ — done: `/projects` lists all of a user's projects with progress %, links into each
8. **Polish + deploy** — Vercel deploy, basic landing page, error states, empty states

### Step 6 design: schema simplification + persistence

While designing this, two schema tables turned out to be unnecessary complexity — flagging the change since it deviates from the original data-model doc above:

- **Dropping `stack_options` and `task_templates` as DB tables.** `STACK_CATALOG` (in `packages/api/src/stack-advisor/catalog.ts`) is static application data, not user data — there's no admin UI to edit it, so seeding it into Postgres and keeping two copies in sync (code catalog + DB rows) is pure overhead. `stack_decisions.chosen_stack_option_id` (a `uuid` FK) becomes `chosen_stack_slug` (`text`), referencing the catalog by slug directly.
- **`task_templates`' job becomes a pure function instead of seeded rows**: `generateStarterPlan(option: StackOptionSeed)` in `packages/api/src/stack-advisor/starter-plan.ts` derives milestone/task titles from the option's own `components` (e.g. "Initialize {frontend} project", "Configure {auth}") — deterministic and testable like `scoring.ts`, with no seed step to maintain.
- **`stack_decisions.recommendations` schema was already stale** — it said `{ stackOptionId, score, rationale }[]` but the real scoring engine produces `{ slug, score, reasons }[]` (see `scoring.ts`), and rationale is one combined AI-generated paragraph for the top pick, not per-option. Corrected shape: `rankedOptions: jsonb` (`{slug, score, reasons}[]`) + `rationale: text | null` (nullable — the AI call is optional, per the design principle above) + `chosenSlug: text | null`.

This means a follow-up `pnpm db:push` that drops two tables and alters `stack_decisions` — safe right now since neither table has real data (only my manual trigger-test rows, already cleaned up).

**New pure, unit-tested functions in `packages/api`** (same pattern as `scoring.ts`):
- `generateStarterPlan(option)` — stack → milestone/task list
- `computeProgress(tasks)` — `{done, total, percent}` roll-up, reused by both `project.list` (per-project %) and `project.get` (per-milestone %)

**New tRPC surface** (`packages/api/src/routers/project.ts`, `task.ts`):
- `trpc.ts` gains a `protectedProcedure` (requires `ctx.userId`, throws `UNAUTHORIZED` otherwise) — the tRPC context (built in `apps/web/src/app/api/trpc/[trpc]/route.ts`) reads the session via the existing `lib/supabase/server.ts` helper
- `project.create` — reuses `scoreStackOptions`/`topN` from `scoring.ts` (no new scoring logic), inserts `projects` + an initial `stack_decisions` row
- `project.generateRationale` — reuses the existing `generateRationale()` from `rationale.ts` as-is, just persists the result onto the stored decision instead of returning it standalone
- `project.acceptStack` — sets `chosenSlug`, runs `generateStarterPlan`, inserts the resulting `milestones`/`tasks` rows in one transaction
- `project.list` / `project.get` — read paths, using `computeProgress` for the rollup
- `task.updateStatus` — ownership-checked status update

**UI** (`apps/web/src/app/projects/...`): a `/projects` dashboard (list + progress, protected route), `/projects/new` (adapts the existing `StackAdvisorForm` — same questionnaire, but wired to `project.create`/`acceptStack` instead of the standalone demo procedures), `/projects/[id]` (task list grouped by milestone with a status control per task, plus progress bars). Scope cut: MVP ships a simple status dropdown per task, not drag-and-drop — a real kanban board is a fast-follow, not required to satisfy "track progress."

## Verification
- Vitest: 12/12 passing — scoring engine (5), `generateStarterPlan` (4), `computeProgress` (3, including the 0-tasks edge case)
- Schema migration applied via raw SQL (`packages/db/src/sql/simplify-stack-schema.sql`) after `drizzle-kit push`'s interactive rename-detection prompt turned out to not be scriptable even with `--force` — confirmed the live DB now matches the schema exactly (column-by-column) and both old tables are gone
- Full flow verified against the real Supabase DB via tRPC's `createCaller` (bypasses HTTP, exercises the actual router/DB code): create → list (0 tasks) → acceptStack (seeds 4 milestones / 9 tasks) → get (chosenSlug set, status "active") → task.updateStatus → get again (1/9 done) → list (reflects new count) → a second user is rejected with `NOT_FOUND` on someone else's project → an unauthenticated caller is rejected with `UNAUTHORIZED`
- `/projects`, `/projects/new`, `/login` all compile and serve 200 with no error markers in the rendered HTML; lint and `tsc --noEmit` clean across `packages/api` and `apps/web`
- Not yet done: a real click-through in an actual browser (only verified via the router/HTTP layer so far), Playwright e2e suite

## Verification
- Vitest unit tests on the scoring engine (5 passing, including a regression test for the mobile-tie-break bug found during manual testing) and progress roll-up math (to add)
- `stackAdvisor.explain` returns rationale text once the model finishes its first-run download; if the model fails to load, `stackAdvisor.recommend` still returns a full ranking (proves the AI dependency is truly optional) — verified live
- Auth verified live against the real Supabase project: signup creates a row in both `auth.users` and (via the trigger) `public.users`; sign-in works; unauthenticated visitors see a "Sign in" link, signed-in visitors see their email + sign-out
- Playwright e2e for the golden path: sign up → create project → answer questionnaire → accept recommendation → see seeded tasks → complete a task → progress % updates — not yet written
- Manually run `pnpm dev`, walk through the golden path in-browser before calling any milestone done
