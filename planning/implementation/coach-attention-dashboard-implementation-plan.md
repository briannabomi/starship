# Coach Attention Dashboard Implementation Plan

Planning specialist: coach command center  
Date: 2026-07-13  
Scope: replace the top coach experience with an active-client weekly attention overview while preserving the existing selected-client detail experience. This plan does not implement application code.

## Inputs Read

- `planning/requirements-transcript.md`, including the relationship and challenge/check-in/dashboard addenda
- `planning/research/challenge-backlogs-best-practices.md`
- `planning/research/checkin-history-coach-dashboard-best-practices.md`
- `planning/research/client-portal-shared-workspace-best-practices.md`
- Current `src/app.js`, `src/state.js`, `src/domain.js`, `src/styles.css`, and `tests/domain.test.mjs`
- Existing product plan conventions in `planning/implementation/product-ux-implementation-plan.md`

## Outcome

The first content in the coach command center will be one scannable, privacy-minimized row/card per active client. Without opening a client, Bri can answer:

- What is this client focused on now?
- What support did the client explicitly request?
- Is the current weekly check-in submitted, due, missing, or stale, and how much history exists?
- How many unresolved individual and relationship-shared challenges exist, and how many are blocked?
- When is the next call?
- Why is this client currently elevated in the order?

Selecting **View [client name] details** will keep the overview in place and move focus to the existing selected-client detail panels. Archived clients will not appear in the overview. The Add Client, Archive, Unarchive, and manual relationship-link workflows will remain available without competing with weekly triage.

## Research Decisions Applied

1. Treat the command center as an attention index, not a file browser or a dump of complete check-in responses.
2. Derive its rows from durable check-in and challenge records; do not make a second editable copy of focus, support, or blocked state.
3. Keep individual and relationship scopes separate in the projection, even when their counts appear together in one client row.
4. Show bounded client-authored focus/support excerpts only. Show challenge counts and scope labels, not sensitive challenge titles, descriptions, journal content, transcript text, partner-private content, or coach-only notes.
5. Use factual, explainable ordering rather than a composite health/risk score.
6. Reserve red for an explicit blocked condition. Missing/stale check-ins and upcoming calls use amber/neutral attention styling, never red.
7. Convey every status in text and structure as well as color.
8. Keep archived clients out of the active projection and relationship-link choices while retaining their history and Unarchive action.

## Current-State Gaps

- `shell()` renders `.client-switcher` first for coaches, including the visible **Dummy Drive folder** shortcut. It does not provide weekly cross-client context.
- `clientRosterView()` lists active clients, contact details, prompt/action counts, and one mutable tracker status. It does not show current submitted focus, explicit support request, freshness/history, challenge scope/counts, next call, or an attention reason.
- `coachDashboard()` immediately mixes roster administration and relationship setup, then selected-client content. The boundary between portfolio-level triage and selected-client detail is unclear.
- `weeklyCheckIns` currently seed one mutable object per client and have no explicit `supportRequested` field. The check-in/history implementation must supply durable submissions before this overview can accurately show history.
- The forthcoming unified challenge collection is not present. Current relationship challenges are stored as `relationshipIssues`; individual challenges do not exist. The dashboard projection must consume the unified challenge contract from the challenge implementation, not add another parallel challenge model.
- `setSessionClient()` changes `session.clientId` but does not align or clear `session.workspaceId`. Selecting unlinked Client C can therefore leave the Client A + Client B workspace selected in coach detail.
- Dynamic text in several current coach views is interpolated without consistently applying `escapeHtml`. The new high-density overview must escape all excerpts and labels.
- Existing `.blocked` styling supplies color and badge text but no dedicated structural cue on the containing row and no block reason/action contract.

## Required Data Contracts

This plan depends on the check-in/history and challenge-backlog implementations using the following minimum fields. If their final plans use different names, adapt the projection at one selector boundary rather than changing the UI contract.

### Weekly check-in source

For every client and reporting period, the command center needs:

```text
WeeklyCheckIn
  id
  clientId
  periodStart
  periodEnd
  dueAt
  status                 not_started | draft | submitted | amended | reviewed
  focus
  supportRequested       explicit client-authored response
  submittedAt
  authoredAt             optional
  supersedesCheckInId    optional
```

`supportRequested` must be added to the weekly tracker prompt with a visible label such as **Where do you most want Bri's support this week?** Do not infer a support request from `questions`, `stuck`, sentiment, action status, or AI output. Existing records with no value display **No support request submitted**.

The durable check-in/history implementation owns migration from the current mutable records. The coach projection must never edit a submitted record.

### Challenge source

Use the unified `Challenge` collection planned by the challenge backlog team:

```text
Challenge
  id
  scopeType              client | relationship
  scopeId                client ID | relationship workspace ID
  status                 backlog | in_focus | resolved
  blockedAt              nullable; blocked when present on an unresolved item
  blockedReason          nullable
  archivedAt             nullable
  updatedAt
```

For a row belonging to client X:

- Individual challenges are records where `scopeType === "client"` and `scopeId === X.id`.
- Shared challenges are records where `scopeType === "relationship"` and the matching active workspace's `clientIds` contains X.id.
- Count only records that are not archived and whose status is not `resolved`.
- A shared challenge contributes once to each authorized member's overview row. It is not duplicated within one row if data contains repeated workspace references.
- `blocked` is computed as an unresolved record with `blockedAt`; if the challenge plan temporarily uses `status === "blocked"`, normalize it in the selector until migration is complete.
- Do not count `actionItems`, relationship tasks, fights, desires, or a free-text `stuck` response as challenges. Those remain visible in selected-client detail.

### Derived row view model

Add one pure domain selector, recommended name `buildCoachAttentionRows(state, options)`, which returns presentation-safe facts and no full source objects:

```text
CoachAttentionRow
  clientId
  clientName
  focusExcerpt
  focusSource             latest_checkin | client_profile
  supportExcerpt
  latestCheckInId         nullable
  latestSubmittedAt       nullable
  checkInState            submitted | due | missing | stale | not_scheduled
  checkInLabel
  checkInHistoryCount
  individualOpenCount
  individualBlockedCount
  sharedOpenCount
  sharedBlockedCount
  totalOpenCount
  totalBlockedCount
  nextCallAt              nullable
  nextCallLabel
  attentionReasons[]      ordered factual labels
  primaryAttentionKind    blocked | support | upcoming_call | missing_checkin | none
```

The selector should accept `options.today` as a `YYYY-MM-DD` test clock and `options.sort` so tests do not depend on the machine date. It must start from `state.clients.filter(client => !client.archivedAt)` and must not return an archived row under any sort mode.

## Projection Semantics

### Latest focus and support

1. Select the newest valid submitted/amended check-in for the client. Compare ISO `submittedAt`; break ties by `periodEnd`, then ID for deterministic output.
2. Use the latest submitted check-in's non-empty `focus`; otherwise use `client.focus` and label the source **Client profile**.
3. Use only the latest submitted check-in's non-empty `supportRequested`. There is no profile fallback for support.
4. Normalize whitespace and truncate each portfolio excerpt at 120 characters on a word boundary. Append an ellipsis when truncated. Do not put the untruncated value in `title`, `aria-label`, data attributes, logs, or analytics.
5. Return plain strings from the selector and HTML-escape them at rendering. Do not return markup.

### Check-in freshness and history

Use the current reporting-period record when the history implementation provides `periodStart`/`periodEnd`. Until then, use the latest scheduled check-in by `dueAt` as a compatibility path.

- **Submitted [date]**: current period has a submitted/amended/reviewed record.
- **Due [date]**: current period is not submitted and `dueAt >= today`.
- **Missing this period**: current period is not submitted and `dueAt < today`.
- **Stale - last submitted [date]**: no current-period submission exists and the latest durable submission predates the current period. This is an amber attention state, not blocked.
- **Not scheduled**: no current or scheduled record exists.

Show a second factual history signal: **N prior submissions** (count durable submitted/amended records without double-counting amendments of the same period) or **No submission history**. The history detail implementation owns the link target; the row can link to it when available.

Missing and stale are mutually exclusive display labels: use `missing` when there is an overdue current instance, otherwise `stale` when only an old submission exists. Never derive a crisis/blocked state from non-submission.

### Next call

- Render the stored date in a readable local form and include a relative cue: **Today**, **Tomorrow**, **In N days**, **N days ago**, or **Not scheduled**.
- Define an upcoming-call attention window as today through three calendar days from today, inclusive.
- Parse date-only values as calendar dates, not browser UTC instants, to avoid an off-by-one day in America/Puerto_Rico and client timezones.

### Explainable attention reasons

Build ordered, non-sensitive labels from explicit facts:

1. `Blocked challenge` or `N blocked challenges` when `totalBlockedCount > 0`.
2. `Support requested this week` when `supportRequested` is non-empty in the latest current submission.
3. `Call today`, `Call tomorrow`, or `Call in N days` inside the three-day window.
4. `Check-in missing` or `Check-in stale` as applicable.
5. `No urgent attention signal` when none applies.

Display the primary reason prominently and the remaining reasons as compact text/badges. Never display an unexplained number, inferred emotional state, client-health score, AI urgency, or the blocked challenge's sensitive title as the reason.

## Default and Alternate Sorting

Default **Needs attention** sorting uses a stable lexicographic comparator; it does not sum weights:

1. Rows with blocked unresolved challenges first; within this tier, higher blocked count first.
2. Then rows with an explicit support request in the current/latest submitted tracker.
3. Then rows with a call in the next three days, earliest call first.
4. Then missing current-period check-ins, followed by stale check-ins.
5. Remaining clients by next call ascending, with unscheduled calls last.
6. Final tie-breaker: client name using `localeCompare`, then client ID.

Expose a labeled native `<select>` with these choices:

- Needs attention (default)
- Next call
- Latest check-in
- Client name

For **Next call**, sort valid dates ascending and unscheduled last. For **Latest check-in**, sort newest first and never-submitted last. For **Client name**, sort ascending. Store the selected value in `state.session.coachAttentionSort` (default `attention`) so re-rendering, selecting a client, and returning to the top do not reset the coach's context. Invalid stored values fall back to `attention`.

Filters are useful later but not required for this MVP slice. Do not ship half-working filter controls. A future filter layer can consume the same row view models for blocked, support requested, missing check-in, relationship workspace, and upcoming call.

## Coach Page Structure and Interaction

### Replace the current top strip

Refactor `shell()` so the coach version does not render `.client-switcher` or the coach `.identity-band` ahead of content. Remove the visible **Dummy Drive folder** anchor entirely. Keep per-client Drive links in selected-client source panels; this request does not require deleting the local backend configuration key while other seed/create flows still depend on it.

The client shell keeps its own identity band unchanged unless the client-portal plan alters it.

### New first section: Weekly client attention

Render a full-width `<section class="panel coach-attention" aria-labelledby="coach-attention-title">` before all selected-client panels.

Header:

- `h2`: **Weekly client attention**
- result count: **N active clients**
- helper text: **Current focus, requested support, check-in freshness, open challenges, and next calls.**
- labeled sort select
- existing **Add Client** button

Use a semantic `<ol class="attention-list">` of `<li><article>` cards rather than a wide table. This keeps the same reading order at 320 CSS pixels and supports long coaching excerpts without horizontal scrolling. Each card has a visible client heading and the following labeled grid cells:

- Current focus + source/freshness label
- Support requested
- Check-in + history count
- Challenges: `N individual open · N blocked` and `N shared open · N blocked`; omit neither scope, using zeroes so boundaries stay explicit
- Next call
- Attention reason(s)
- primary button **View [escaped client name] details**
- secondary **Archive** action, retaining the current behavior

Do not show email or phone in the weekly overview. Those details are not needed for triage and increase shoulder-surfing exposure.

When no active clients exist, show **No active clients. Add or unarchive a client to build the weekly overview.** with Add Client and the archived-management area still reachable.

### Preserve client administration without a duplicate roster

Retire the active-client portion of `clientRosterView()` so there are not two competing rosters. Keep the existing Add Client modal in the overview and extract archived clients into `archivedClientsView()` below the overview or in a clearly labeled disclosure section. Each archived record keeps **Unarchive**. Archived records never enter the attention projection, active count, top switching controls, or relationship dropdowns.

### Drill-down to existing details

After the overview, add a clear boundary:

```html
<section id="selected-client-detail" aria-labelledby="selected-client-detail-title">
  <h2 id="selected-client-detail-title">[Client name] details</h2>
  [selected-client identity band]
  [existing relationship, source, alerts, call review, assignment, pre-call,
   action, roadmap, delivery, and audit panels]
</section>
```

The overview remains visible after selection. Clicking a row's descriptive View button must:

1. call the domain client-selection function;
2. persist/re-render;
3. align `session.workspaceId` to an active workspace containing that client, or set it to `null` for an unlinked client;
4. scroll the detail heading into view using `scrollIntoView({ block: "start" })`; and
5. move keyboard focus to the detail heading (`tabindex="-1"`) after render.

This keeps the existing detailed panels rather than rebuilding them. Selecting Client C must never leave Client A + Client B's relationship detail visible. If a client has multiple active workspaces in future, choose the most recently selected authorized one for that client; for the current MVP, choose the first deterministic match by workspace ID.

Move `relationshipBuilderView()` out of the first grid and place it in a lower coach-management section. It remains coach-only and continues to list active clients only.

## Blocked and Red Accessibility Contract

- Add a structural `.has-blocked` treatment to the client card: a solid 4px left border plus a visible **Blocked** status badge. Do not tint the entire card red.
- Use a dark error foreground/background pairing that is verified to meet WCAG 2.2 AA: normal text at least 4.5:1; border/icon/UI cue at least 3:1 against adjacent colors.
- Pair the red cue with the word **Blocked**, a non-color icon such as `!` marked `aria-hidden="true"`, the blocked count, and a descriptive View action.
- Missing/stale check-ins use amber/neutral styling and explicit **Missing** or **Stale** text. Open uses neutral/blue; resolved is not included in overview counts.
- The card's accessible name/order must make the client, blocked count, and reason understandable when CSS is disabled or colors are indistinguishable.
- Add a reusable `.visually-hidden` utility if needed for screen-reader context.
- Status changes performed in selected detail should update the overview from the same source data after `persist()` and announce a short result in an `aria-live="polite"` status region. Routine updates must not steal focus.
- Test blocked presentation without color, in forced-colors/high-contrast mode, keyboard-only, and at 200% zoom.

## Privacy and Authorization Boundaries

For this local MVP, the selector itself should minimize data even though all data currently lives in browser state:

- Return excerpts and counts, not whole check-in or challenge records.
- Never include full response bodies, blocked reasons, journal text, transcript passages, contact information, partner-private content, private coach notes, SMS content, or Drive URLs in a row view model.
- Keep `individualOpenCount` and `sharedOpenCount` separate. A relationship link does not make either client's individual check-in or challenges partner-visible.
- Include shared counts only from active, authorized workspaces containing the client.
- Escape client names, excerpts, labels, and any other dynamic text before HTML interpolation.
- Audit selection/sort changes with identifiers and event metadata only if auditing is needed; do not copy excerpts into `auditLog`.
- In the future server-backed implementation, compute equivalent projections after per-object authorization and return only authorized rows. Do not fetch every client's private bodies and rely on CSS to hide them.

## File-by-File Implementation Tasks

### `src/state.js`

1. Coordinate with the check-in/history and challenge plans; consume their version bump and migrations rather than creating a competing migration.
2. Add `session.coachAttentionSort: "attention"` to seed state and normalize missing/invalid persisted values during migration/load.
3. Seed realistic synthetic conditions for browser verification without real personal data:
   - one client with a current support request and submitted history;
   - one client with blocked shared work;
   - one client with a missing/stale check-in;
   - staggered next-call dates;
   - one archived client excluded from active results.
4. Ensure seed data from the challenge plan contains both individual and shared open/blocked challenges so scope counts can be verified.
5. Do not remove `backendConfig.dummyDriveFolderUrl` in this slice unless all existing Drive-source fallbacks are migrated simultaneously. Only the visible top shortcut is required to disappear.

### `src/domain.js`

1. Add pure helpers for ISO date-only comparison, bounded excerpts, latest durable submission selection, current check-in state, active workspace lookup, challenge count aggregation, attention-reason derivation, and stable comparators.
2. Export `buildCoachAttentionRows(state, { today, sort } = {})` as the single UI selector.
3. Never mutate state while building rows; return newly created row objects/arrays.
4. Update `setSessionClient()` to set `session.workspaceId` to a workspace containing the selected active client or `null`. Reject archived clients as it does now.
5. Ensure `archiveClient()` also realigns `session.workspaceId` when it moves the selection to another active client; an archive action must not leave unrelated relationship detail selected.
6. Keep audit events metadata-only; the projection and sorting need no event containing focus/support text.

### `src/app.js`

1. Remove the coach `.client-switcher` and **Dummy Drive folder** shortcut from `shell()`.
2. Split identity rendering so the client portal keeps its band while the coach's selected-client band renders inside `#selected-client-detail`.
3. Add `coachAttentionDashboard()`, `coachAttentionCard(row)`, `selectedClientDetailHeader()`, and `archivedClientsView()` rendering helpers.
4. Make `coachDashboard()` render the attention dashboard first, followed by the selected-client detail boundary, then the existing detail panels.
5. Replace the current `clientRosterView()` active list with the new overview; reuse the existing Add Client dialog and archive/unarchive handlers rather than creating duplicate forms.
6. Move `relationshipBuilderView()` below the overview into coach management.
7. Bind the sort select to a validated `state.session.coachAttentionSort`, persist, and re-render.
8. Bind descriptive drill-down buttons and implement post-render scroll/focus without resetting the sort.
9. Escape every new dynamic value. Use the 120-character selector excerpts; do not add full values as tooltips.
10. Render zero/empty/error-compatible messages explicitly. Treat unavailable source data as **Not scheduled**/**No support request submitted**, not as blocked.
11. Keep the existing modal-close-after-create behavior. Because `createClient()` selects the new client, the new client should appear in the overview and its detail area should become selected after creation.

### `src/styles.css`

1. Remove obsolete `.client-switcher` rules after markup removal.
2. Add a responsive attention-card grid with stable label/value hierarchy and no horizontal page scroll at 320 CSS pixels.
3. Add `.has-blocked`, blocked badge/icon, amber missing/stale, neutral open, selected-card, attention-reason, detail-boundary, and `.visually-hidden` styles.
4. Reuse existing design tokens where contrast passes; introduce semantic `--error-*` and `--warning-*` tokens if necessary instead of overloading decorative brick/gold colors.
5. Keep focus rings clearly visible on sort, View, Archive, Add Client, and Unarchive controls.
6. At narrow breakpoints, stack card fields and keep the View action before the secondary Archive action in reading/tab order.
7. Verify 200% zoom and forced colors; use borders/text, not background color alone, for statuses.

### `tests/domain.test.mjs`

Add deterministic selector and workflow tests using an explicit `today`:

1. Archived clients are absent from every sort mode and active count.
2. Active clients remain present even with no check-in, no next call, no challenges, or no relationship.
3. The latest submitted/amended record wins over a newer draft, with deterministic tie-breaking.
4. Focus falls back to `client.focus`; support does not fall back to questions/stuck.
5. Excerpts normalize whitespace, truncate to 120 characters, and contain no markup supplied by the selector.
6. Current submitted, due, missing, stale, and not-scheduled check-in labels are distinct; missing/stale never produce a blocked reason.
7. History count does not double-count an amendment of one reporting period.
8. Individual and shared challenge counts are correct and separate; resolved and archived challenges are excluded.
9. One shared challenge counts once for each member and zero times for an unlinked client.
10. Blocked rows sort before support, upcoming call, missing/stale, and neutral rows under the default order.
11. Ties resolve by blocked count, next call, name, then ID exactly as specified.
12. Alternate next-call, latest-check-in, and name sorts handle null values deterministically.
13. Attention reasons name the factual trigger and never expose a challenge title or block reason.
14. Selecting Client C clears the Client A + Client B workspace; selecting A chooses an authorized A workspace.
15. Archiving the selected client selects another active client and aligns/clears its workspace; unarchiving restores overview eligibility without losing history.

## Browser Acceptance Criteria

Verify at `http://127.0.0.1:4173/` after implementation:

1. Coach mode opens with **Weekly client attention** as the first main content; no Dummy Drive shortcut or client-switcher strip is visible.
2. Each active client appears exactly once with focus, explicit support request/fallback, check-in freshness and history count, separate individual/shared open and blocked counts, next call, and a visible reason for its position.
3. The seeded blocked client is first in default sorting and has a red structural cue, visible **Blocked** text/icon/count, and a working detail action. Removing CSS color still leaves the state understandable.
4. Changing sort modes changes order according to the documented semantics and survives selecting a client and re-rendering.
5. An archived client is absent from the overview, active count, top navigation, and relationship-link dropdowns; it remains visible in Archived Clients and **Unarchive** returns it to the overview with history intact.
6. **Add Client** opens the existing modal. Creating a client closes the modal, adds exactly one overview row, selects that client, and does not display a dummy Drive shortcut.
7. **View Client C details** scrolls/focuses Client C's detail heading and shows no Client A + Client B relationship workspace. Viewing Client A shows only an authorized A workspace.
8. Blocking/unblocking or resolving a challenge in detail updates the overview count and styling from the same record after re-render.
9. The overview does not show email, phone, full check-in bodies, challenge titles/reasons, journals, transcript text, SMS content, or Drive URLs.
10. Keyboard-only navigation reaches sort, Add Client, every View/Archive action, archived disclosure, and Unarchive in a logical order. Focus is visible and lands on the selected detail heading after View.
11. At 320 CSS pixels and 200% zoom, all row content and actions reflow without horizontal scrolling, clipping, overlap, or lost functionality.
12. In high-contrast/forced-colors and a grayscale/color-vision simulation, blocked, missing/stale, open, and selected states remain distinguishable by text and borders.
13. Browser console has no errors during sort, select, archive, unarchive, client creation, and reset-demo flows.

## Automated Verification

Run:

```sh
npm test
npm run check
git diff --check
```

The implementation audit should also search rendered/source language for the removed shortcut and accidental sensitive fields:

```sh
rg -n "Dummy Drive folder|client-switcher" src
```

The expected result after implementation is no rendered shortcut and no obsolete switcher markup/styles. The backend key may still exist for compatibility, as noted above.

## Audit-Revise Loop

1. Implement the selector/data contracts first and make domain tests pass.
2. Render the overview and preserve client-management workflows.
3. Run browser acceptance with synthetic blocked, support, upcoming, missing/stale, linked, unlinked, and archived cases.
4. Audit privacy by inspecting the row view models and rendered HTML for full source objects or sensitive fields.
5. Audit accessibility with keyboard, no-color/grayscale, forced colors, and 200% zoom.
6. Audit state alignment by alternating A, B, C, archived, and newly created clients.
7. Revise any failed item, rerun automated tests and the focused browser flow, and record the result in `planning/implementation/audit-revise-log.md`.
8. Stop only when all automated checks and browser acceptance criteria pass without console errors.

## Coordination Boundaries

- The check-in/history team owns durable submission/version semantics, the client history UI, and the `supportRequested` prompt/storage. This dashboard consumes their projection-compatible records.
- The challenge team owns the unified individual/shared challenge entity, block/unblock lifecycle, activity, and client/relationship backlog UI. This dashboard consumes counts/status only.
- This dashboard implementation owns cross-client derivation, ordering, privacy-minimized rendering, coach drill-down, and the selected-workspace alignment fix.
- The orchestrator should merge data-model work before wiring dashboard UI, then run the combined audit loop because check-in freshness and challenge counts cannot be validated against placeholder models.

## Definition of Done

The feature is complete when the coach's first view is a deterministic, accessible, privacy-minimized attention index for all and only active clients; every elevation is explainable; blocked work is prominent without relying on color; current focus, explicit support, check-in history/freshness, scoped challenge counts, and next call are visible; View reliably reaches the correct existing client detail without leaking another relationship; client administration still works; the Dummy Drive shortcut is gone; and all automated/browser acceptance criteria pass.
