# Nana Daily Brief Task Board

Update one row before starting and after stopping. Status values: `pending`, `in_progress`, `blocked`, `done`.

| ID | Task | Owner | Status | Allowed files | Depends on |
|---|---|---|---|---|---|
| NANA-01 | Pure Daily Brief domain types and Safe to Spend rules | Codex | done | `lib/nana/types.ts`, `lib/nana/safe-to-spend.ts`, `scripts/test-nana-safe-to-spend.mjs` | none |
| NANA-02 | Pure Banana Money Score and message priority rules | Codex | done | `lib/nana/money-score.ts`, `lib/nana/daily-brief-rules.ts`, `scripts/test-nana-daily-brief-rules.mjs` | NANA-01 |
| NANA-03 | Daily Brief migration and shared domain type | Codex | done | `supabase/migrations/20260601000003_create_daily_briefs.sql`, `lib/types.ts`, `scripts/test-nana-daily-brief-schema.mjs` | NANA-01 |
| NANA-04 | Daily Brief server orchestration and persistence | Antigravity | done | `app/actions/daily-brief.ts`, `scripts/test-nana-daily-brief-action.mjs` | NANA-01, NANA-02, NANA-03 |
| NANA-04B | Meaningful-event refresh hooks | Antigravity | done | `app/actions/transactions.ts`, `app/actions/fixed-costs.ts`, `scripts/test-nana-refresh-hooks.mjs` | NANA-04 |
| NANA-05 | Nana Home component set | Antigravity | done | `app/(dashboard)/overview/_components/nana/**`, `scripts/test-nana-home-components.mjs` | NANA-01, NANA-02 |
| NANA-06 | Nana copy keys | Antigravity | done | `lib/i18n/dictionaries/th.ts`, `lib/i18n/dictionaries/en.ts`, `scripts/test-nana-copy.mjs` | NANA-02 |
| NANA-07 | Home data integration | Antigravity | done | `app/actions/home.ts`, `app/(dashboard)/overview/page.tsx`, `scripts/test-nana-home-integration.mjs` | NANA-04, NANA-04B, NANA-05, NANA-06 |
| NANA-08 | Dashboard theme refinement | Antigravity | done | `app/globals.css`, `scripts/test-nana-theme.mjs` | NANA-05 |
| NANA-09 | Full local verification and visual QA | Antigravity | done | Read-only first; fixes assigned explicitly | NANA-07, NANA-08 |

## Shared-File Lock

Only the active lead edits shared integration files. If an agent needs a shared-file change, write the required patch description in `HANDOFF.md`.
