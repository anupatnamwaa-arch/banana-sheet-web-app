# Three-Agent Collaboration Guide

This workspace is shared by three AI agents. Work locally only until the user explicitly approves a commit, push, deploy, or pull request.

## Required Reading Order

Every agent reads:

1. `AGENTS.md`
2. `CONTEXT.md`
3. `docs/coordination/README.md`
4. `docs/coordination/TASKS.md`
5. `docs/coordination/HANDOFF.md`
6. The assigned task in `docs/superpowers/plans/2026-06-01-nana-daily-brief-home.md`
7. Only the implementation files needed for that task

Before editing Next.js code, read the relevant guides under `node_modules/next/dist/docs/`.

## Roles

| Agent | Primary ownership | Typical paths |
|---|---|---|
| Agent 1 | Pure Nana rules and focused tests | `lib/nana/`, `scripts/test-nana-*.mjs` |
| Agent 2 | Persistence and server orchestration | `supabase/migrations/`, `app/actions/daily-brief.ts` |
| Agent 3 | Home UI, Nana components, visual QA | `app/(dashboard)/overview/_components/nana/` |
| Active lead | Integration and verification | `app/actions/home.ts`, `app/(dashboard)/overview/page.tsx`, dictionaries, `app/globals.css` |

Any agent may become active lead after reading `HANDOFF.md`.

## Rules

- Claim one task in `TASKS.md` before editing.
- Do not edit files owned by another in-progress task.
- Update `HANDOFF.md` after each meaningful checkpoint or before stopping.
- Preserve unrelated dirty-worktree changes.
- Do not reopen approved product decisions. Read the spec and `DECISIONS.md`.
- Add focused tests before implementation changes.
- Run scoped lint and diff checks after each task.
- Keep summaries short: files changed, tests run, known issues, exact next action.

## Parallel Work

Parallel work is allowed only when file ownership does not overlap. Use separate worktrees if agents truly edit concurrently. Sequential token handoff may use this shared workspace.

Do not parallelize integration files:

- `app/actions/home.ts`
- `app/(dashboard)/overview/page.tsx`
- `lib/i18n/dictionaries/th.ts`
- `lib/i18n/dictionaries/en.ts`
- `app/globals.css`
- `lib/types.ts`

## Worker Prompt

```text
Read AGENTS.md, CONTEXT.md, docs/coordination/README.md,
docs/coordination/TASKS.md, docs/coordination/HANDOFF.md, and your assigned
task in docs/superpowers/plans/2026-06-01-nana-daily-brief-home.md.

Work locally only. Do not commit, push, deploy, create a PR, or edit files
owned by another in-progress task. Read relevant Next.js docs before editing
Next.js files. Use TDD. Update TASKS.md and HANDOFF.md before stopping.
```

## One-Line Resume Prompt

After the first agent has initialized the coordination files, any replacement
agent can be started with:

```text
Continue work from the last agent. Read AGENTS.md and
docs/coordination/HANDOFF.md first, then follow the required reading order in
docs/coordination/README.md. Resume the Exact Next Action. Work locally only:
no commit, push, deploy, or PR. Update TASKS.md and HANDOFF.md before stopping.
```

The incoming agent must treat `HANDOFF.md`, `TASKS.md`, tests, and workspace
files as the source of truth. It does not need the previous chat history.
