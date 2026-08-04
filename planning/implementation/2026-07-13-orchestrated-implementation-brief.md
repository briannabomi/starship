# 2026-07-13 Orchestrated Implementation Brief

This brief reconciles the three detailed plans for the local-first MVP implementation. The detailed research and plans remain the source for rationale and acceptance criteria; this file resolves overlapping data/API recommendations so parallel implementers use one contract.

## Chosen Contracts

- Use the scope-explicit `Challenge` and append-only `ChallengeActivity` shapes from `challenges-checkin-history-implementation-plan.md`.
- Keep `relationshipIssues` as repair/conflict records. Migrate each existing issue once into a linked relationship-scoped challenge; do not keep the two records synchronized.
- Store current and historical weekly tracker periods together in `state.weeklyCheckIns`. A submitted record is immutable. Do not add a competing `weeklyCheckInSubmissions` collection.
- Use the field name `supportRequested` everywhere.
- `getSubmittedCheckIns()` and `getLatestSubmittedCheckIn()` are the only sources for tracker history/latest submitted projections.
- Use the challenge command names and actor-last signatures from `challenges-checkin-history-implementation-plan.md`.
- Use `buildCoachAttentionRows(state, { today, sort })` from `coach-attention-dashboard-implementation-plan.md` as the coach overview's sole projection.
- Add `session.clientView` (`dashboard`, `relationship`, `library`) and `session.coachAttentionSort` (`attention`, `next_call`, `latest_checkin`, `client_name`).

## Client Experience

- Client navigation is My Dashboard, conditional Relationship, and Video Library.
- My Dashboard leads with the current-period weekly tracker, private challenge backlog, recent submitted tracker history, and compact personal next steps/recommendation.
- Relationship renders only for an active linked workspace and contains the shared challenge backlog plus existing shared tasks/desires/check-in content.
- Challenge creation uses native dialogs with explicit private/shared audience text. Blocking requires a reason.
- Blocked presentation uses red as a structural cue plus visible `Blocked` text, a warning symbol, reason, and recovery action.
- Submitted trackers are read-only and appear newest first in history. The MVP does not implement amendments or automatic challenge creation from narrative answers.

## Coach Experience

- Remove the coach client-switcher strip and visible Dummy Drive folder shortcut.
- Render Weekly client attention first, with one active-client card containing privacy-minimized focus/support excerpts, tracker freshness/history count, separate individual/shared open and blocked counts, next call, and explainable attention reasons.
- Preserve Add Client, Archive/Unarchive, and relationship linking below the overview.
- Descriptive View actions select and align the client/workspace, then focus the selected-client detail heading.

## Verification Gate

- Expanded domain tests cover migration idempotence, scope isolation, challenge lifecycle/activity, tracker immutability/history, attention projection/sorts, archive filtering, and workspace alignment.
- Browser verification covers all three seeded clients, private/shared creation and block flows, tracker submission/history, conditional navigation, coach sorting/drill-down, Add Client, archive/unarchive, 320px reflow, keyboard/modal behavior, and console errors.
- The audit/revise log records findings and fixes. Completion requires `npm test`, `npm run check`, `git diff --check`, source-language checks, and clean browser acceptance flows.
