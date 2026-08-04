# Client Portal, Challenge Backlog, and Weekly History Implementation Plan

Date: 2026-07-13  
Scope: the client-facing experience in the existing single-page, local-first Starship MVP

## Outcome

Give every client a calm **My Dashboard** with a private open-challenge backlog and durable weekly tracker history. Give linked clients a clearly separate relationship workspace where either participant can add and manage shared challenges. Keep **Video Library** prominent and keep private and shared audiences unmistakable.

This plan is based on:

- `planning/requirements-transcript.md`, including the Relationship / Couple Tracking and Challenge Backlog / Check-In History addenda.
- `planning/research/challenge-backlogs-best-practices.md`.
- `planning/research/checkin-history-coach-dashboard-best-practices.md`.
- `planning/research/client-portal-shared-workspace-best-practices.md`.
- The current `src/app.js`, `src/styles.css`, `src/state.js`, `src/domain.js`, and `tests/domain.test.mjs` implementation.

## MVP Boundaries

This iteration remains a browser-only demo persisted to `localStorage`. It must model scope and membership correctly in domain functions even though production authentication and server-side authorization are deferred. UI filtering is not a production security boundary.

Implement now:

- Client navigation for **My Dashboard**, conditional **Relationship**, and **Video Library**.
- Personal and relationship-scoped challenges using one record shape.
- Challenge create, status change, block/unblock, resolve/reopen, and archive/restore behavior.
- A current weekly tracker draft plus immutable submitted snapshots and client-visible history.
- Explicit audience text on pages, forms, and cards.
- Accessible modal/form behavior, status announcements, and responsive list layouts.

Defer:

- Drag-and-drop boards and arbitrary backlog reordering.
- Sharing/copying a personal challenge into a relationship workspace.
- Comments, full activity-feed UI, file attachments, pagination, and concurrent-edit conflict UI.
- Real invitations, membership acknowledgment, revocation, authentication, APIs, and database enforcement.
- Video playback/watch history; the MVP library remains a browsable catalog.

## Current-State Gaps to Replace

- `clientDashboard()` renders one long page rather than three client destinations.
- `clientWorkspaces()` treats membership as `workspace.clientIds.includes(clientId)` and does not check an active workspace/membership state.
- `relationshipIssues` approximates shared challenges, but there is no personal challenge collection or shared challenge creation flow.
- `relationshipClientView()` exposes shared tasks and a relationship check-in but not the shared challenge backlog.
- `weeklyCheckIns` has one mutable record per client. `submitCheckIn()` overwrites it, so historical submissions are lost.
- The tracker has no explicit “support wanted” field or audience label.
- The Video Library is rendered at the bottom of the dashboard instead of as a primary client destination.
- Blocked styling exists, but cards do not consistently show a block reason, a second non-color cue, or an unblock action.
- Re-rendering after an operation removes the originating dialog and focus context unless explicitly restored.

## Information Architecture and Client Navigation

Add `state.session.clientView` with allowed values `dashboard`, `relationship`, and `library`; migrate missing values to `dashboard`.

Render a client-only `<nav aria-label="Client portal">` immediately below the top bar:

1. **My Dashboard** — always present.
2. **Relationship** — present only when the selected client belongs to an active relationship workspace.
3. **Video Library** — always present.

Use buttons in this single-page MVP, with `aria-current="page"` on the selected destination. Keep labels and ordering identical on desktop and mobile. Do not render a disabled Relationship item for unlinked clients. If a stale session points to `relationship` after membership disappears, normalize it to `dashboard` before rendering.

Change the client top-level heading from `Client workspace` to the selected destination name. Keep the identity band client-specific. On the relationship destination, replace the private “Current focus” identity value with shared workspace context so the page cannot be mistaken for a private view.

View composition:

- `clientPortal()` chooses one of `myDashboardView()`, `relationshipWorkspaceView()`, or `libraryView()`.
- `myDashboardView()` contains, in order: current weekly tracker/status, personal blocked challenges, personal open challenge backlog, next assignment/action summary, tracker history, and secondary personal resources.
- `relationshipWorkspaceView()` contains a shared-audience banner, blocked shared challenges, shared open challenge backlog, then the existing shared tasks/desires/check-in material.
- `libraryView()` becomes the entire Video Library destination, with recommended videos first and all resources second.

Do not blend relationship challenges into the personal backlog. My Dashboard may show a small relationship summary/link when membership exists, but it must say `Shared` and navigate to Relationship rather than reproducing shared content in a private list.

## State Model and Migration

Increment `STATE_VERSION`. Add/migrate these collections and fields in `src/state.js`.

### Challenges

Replace `relationshipIssues` as the active source with `challenges`. Migrate each existing relationship issue once; do not retain two independently editable sources.

```js
{
  id,
  scopeType: "client" | "relationship",
  scopeId,                         // client ID or workspace ID
  title,                           // required
  description: "",
  desiredOutcome: "",
  status: "backlog" | "in_focus" | "resolved",
  priority: "none" | "low" | "medium" | "high" | "urgent",
  ownerType: "unassigned" | "client" | "both_clients" | "coach",
  ownerClientId: null,
  createdByUserId,
  createdAt,
  updatedAt,
  blockedAt: null,
  blockedByUserId: null,
  blockedReason: null,
  resolvedAt: null,
  archivedAt: null,
  sourceType: "manual" | "weekly_tracker" | "coach",
  sourceId: null
}
```

Blocking is orthogonal to workflow status. A blocked in-focus challenge remains `status: "in_focus"` and has non-null block fields. For migrated `relationshipIssues`:

- `open` -> `backlog`.
- `repair_in_progress` -> `in_focus`.
- `closed` -> `resolved` with `resolvedAt` set to the best available update date.
- `blocked` -> `in_focus`, with `blockedAt` set to `updatedAt || createdAt` and a migration-safe reason such as `Reason not yet recorded`.
- `workspaceId` -> `scopeType: "relationship"`, `scopeId: workspaceId`.
- Preserve title, description, desired repair as `desiredOutcome`, severity mapped to priority, owner, and dates.

Seed at least:

- One private challenge for Client A.
- One blocked private challenge for Client C.
- The two existing Client A + Client B shared examples after migration.
- No private challenge belonging to one linked client visible in the other's test fixtures.

Add `challengeActivities` entries for create, status change, block/unblock, resolve/reopen, archive/restore, and challenge creation from a tracker. Each entry stores IDs and changed-field metadata, not duplicated sensitive body text.

### Weekly trackers

Keep `weeklyCheckIns` as the editable/current tracker records for the least disruptive MVP migration, but stop treating submitted records as editable drafts. Add:

```js
weeklyCheckIns[]: {
  ...existingFields,
  periodStart,
  periodEnd,
  questionnaireVersion: 1,
  supportWanted: "",
  visibility: "individual"
}

weeklyCheckInSubmissions[]: {
  id,
  sourceCheckInId,
  clientId,
  periodStart,
  periodEnd,
  questionnaireVersion,
  answersSnapshot: { focus, supportWanted, questions, alive, completed, stuck, ratings },
  createdChallengeIds: [],
  linkedChallengeIds: [],
  submittedAt,
  authoredByUserId,
  status: "submitted" | "amended",
  amendsSubmissionId: null,
  reviewedAt: null
}
```

On first submission:

1. Validate the current draft.
2. Append a new immutable snapshot to `weeklyCheckInSubmissions`.
3. Mark the current record submitted and point it to `latestSubmissionId`.
4. Create the normal completion, alert, and metadata-only audit entries.
5. Create a fresh next-period tracker record for that client, or have a `getCurrentWeeklyCheckIn()` projection return the next draft. Do not mutate the snapshot when the next tracker is edited.

For this MVP, disallow editing a submitted snapshot and label it read-only. Amendment creation can remain deferred, but the data model must permit it. Migrate a currently submitted legacy tracker into one snapshot; leave unsubmitted records as current drafts.

## Domain API Plan

Add pure, scope-checking helpers to `src/domain.js` and call these from the UI instead of mutating collections in `app.js`.

### Membership and view helpers

- `getActiveClientWorkspace(state, clientId)`: returns a workspace only when it contains the client, is not archived/paused, and both referenced clients are active. For legacy records with no state, treat them as active.
- `canAccessChallenge(state, challenge, actor)`: in the MVP, coach can access all in-scope records; a client can access `client` scope only when `scopeId === actor.clientId`, and `relationship` scope only through active workspace membership.
- `getChallengesForScope(state, scopeType, scopeId, actor, options)`: validates access, excludes archived by default, and returns blocked first, then in-focus, then backlog, then newest update.
- `getWeeklyCheckInHistory(state, clientId, actor)`: validates self/coach access and returns immutable submissions newest first.

Even in a local demo, reject crafted `scopeId`, `ownerClientId`, and challenge IDs that are outside the actor's accessible scope. This makes the domain layer portable to a future API.

### Challenge commands

- `createChallenge(state, actor, input)` requires a trimmed title. Derive `scopeId` from current authorized context rather than trusting an arbitrary hidden field. Relationship owner choices are limited to active participants, both, coach, or unassigned; personal ownership is the owning client, coach, or unassigned.
- `updateChallengeStatus(state, actor, challengeId, status)` permits only backlog/in-focus/resolved, clears block metadata on resolve, and appends activity/audit metadata.
- `blockChallenge(state, actor, challengeId, reason)` requires a non-empty trimmed reason, records actor/time, and moves backlog to in-focus.
- `unblockChallenge(...)` clears current block fields but retains the prior reason in activity.
- `reopenChallenge(...)` changes resolved to backlog and clears resolution fields.
- `archiveChallenge(...)` and `restoreChallenge(...)` soft-hide and restore without deleting history.
- Return `{ ok, value, error }` or another consistent result shape so forms can show validation without destroying entered values.

Do not overload relationship tasks, fights, desires, or actions as challenges. They remain separate records and may be linked later.

### Weekly tracker commands

- Replace direct overwrite semantics in `submitCheckIn()` with snapshot creation.
- Add `createChallengeFromSubmission(state, actor, submissionId, input)` only if the tracker-to-challenge option is included in this iteration. It must create a private challenge, write the new challenge ID into the snapshot, and append a challenge activity referencing the submission. Never infer or auto-create a challenge from narrative answers.
- The minimum UI can offer a post-submit action, `Add stuck point as a challenge`, which opens the private Add Challenge dialog prefilled from `stuck`; the client must confirm and can rewrite the title. It remains private and says who can see it.

## My Dashboard Plan

### Weekly tracker

Place the current tracker at the top of My Dashboard because every client is prompted weekly. Update prompts to include `What support would you most like from Bri this week?` as `supportWanted` immediately after `Focus for next call`.

Before the fields, show:

> Private · Visible to you and Bri

For a draft, show due date, completed field count, and `Continue weekly tracker`. For a submitted current period, show a confirmation summary and `View submission`; do not render editable inputs for that submission.

On submit:

- Keep all entered text after validation failure.
- Put a field-level message on the first invalid field and an error summary at the top when more than one field fails.
- On success, persist the snapshot, close any modal if used, render the success summary, announce `Weekly tracker submitted`, and focus the summary heading.
- Offer `Add stuck point as a challenge` only when `stuck` is non-empty.

### Personal challenge backlog

Heading: **My open challenges**. Supporting audience text:

> Private · Visible to you and Bri

Header controls:

- Primary `Add challenge` button.
- Filter select: `Open` (default), `Blocked`, `Resolved`, `Archived`.
- Result count exposed in visible text and an `aria-live="polite"` status region after filtering.

Use a semantic list of cards. Default order: blocked, in focus, backlog. Each card shows:

- Scope badge `Private`.
- Status label (`Backlog`, `In focus`, or `Resolved`).
- Visible `Blocked` label and warning icon when blocked.
- Title and optional description.
- Desired outcome when supplied.
- Owner of next step, priority when not `None`, updated date, and blocked duration/reason.
- Always-visible buttons or a visible actions menu for `Focus/Return to backlog`, `Mark blocked/Unblock`, `Resolve/Reopen`, and `Archive/Restore` as valid for its state.

Blocked cards get a red left border/background cue, but retain the word `Blocked`, warning icon, reason, and `Unblock`/`Ask Bri for support` action. Do not style missing trackers or ordinary backlog items red.

Empty states:

- Open: `You have no open challenges.` plus `Add challenge`.
- Blocked: `Nothing is blocked right now.`
- Resolved: `Resolved challenges will appear here.`
- Archived: `No challenges are archived.`

## Conditional Relationship Workspace Plan

Only render the Relationship nav and view for `getActiveClientWorkspace()`. An unlinked Client C sees no relationship name, count, placeholder, or disabled tab.

At the top of the relationship view, render a persistent audience banner assembled from authorized workspace membership:

> Shared workspace · Visible to Client A, Client B, and Bri

The shared challenge section is titled **Shared open challenges** and has `Add shared challenge`. Reuse the challenge list/card component, but every card says `Shared`, `Raised by …`, and `Owner of next step …`. Both participants see the same underlying status, block reason, and update time.

Creation from this view fixes `scopeType: "relationship"` and `scopeId` to the active workspace. Never show a private/shared toggle. Owner options are `Unassigned`, each active participant by name, `Both clients`, and `Bri`. The primary action says `Add shared challenge`, not `Save`.

Do not render personal challenge titles, personal weekly submissions, journals, calls, or coach-only notes in the relationship view. Linking two clients does not migrate or expose any prior private records.

If a relationship workspace is absent or stale during an event, reject the command and return to My Dashboard with a generic `This relationship workspace is not available` status. Do not reveal participant names from an unauthorized stale object.

## Add Challenge and Block Dialogs

Reuse the native `<dialog>` pattern already used for Add Client, but create a reusable challenge dialog renderer.

### Add Challenge fields

Always visible:

- Title — required, autofocus, concise label.
- Audience statement — plain text, not editable.

Optional under a `More details` disclosure or in the form below the title:

- Description/context.
- Desired outcome (`What would feel different?`).
- Owner of next step.
- Priority (`None`, `Low`, `Medium`, `High`, `Urgent`).
- Initial status (`Backlog` default, `In focus`).

The dialog title and submit button are context-specific: `Add private challenge`/`Add challenge` or `Add shared challenge`/`Add shared challenge`.

### Block dialog

`Mark blocked` opens a small dialog with the challenge title, a required `What is blocking progress?` textarea, audience reminder, `Cancel`, and `Mark blocked`. Do not allow a reasonless blocked record.

### Dialog behavior

- Use `aria-labelledby`, `aria-describedby` for audience/context, native `showModal()`, a visible close button, and `method="dialog"` or explicit cancel handling.
- On open, store the trigger element and focus the title input or block-reason textarea.
- Native modal behavior contains focus; test Tab and Shift+Tab explicitly in target browsers. Escape and backdrop click cancel without saving.
- On validation failure, keep the dialog open, preserve values, associate the error with `aria-describedby`, set `aria-invalid="true"`, and focus the first error.
- On successful create, persist/render, close the dialog, announce `Challenge added to your private backlog` or `Shared challenge added`, then focus the new card heading. If focusing the card is not stable after render, return focus to the Add button and keep the status announcement.
- On cancel, return focus to the exact invoking button.

## Weekly Tracker History

On My Dashboard, show the latest three immutable submissions under **Weekly tracker history**, newest first, followed by `View all history` when more exist. Each row/card shows:

- Reporting period and submitted date.
- `Submitted` or `Amended` status.
- Focus excerpt.
- Support request excerpt or `No support request submitted`.
- Linked/created challenge count.
- `View check-in for [period]`.

Selecting a history item opens an in-page detail region or modal with the original question labels, answer snapshot, submission metadata, and challenge links. Prefer an in-page detail within the single-page view so browser Back is not simulated incorrectly. Add `Back to tracker history`, restoring focus to the originating history control.

Never bind history detail to mutable `weeklyCheckIns`. It reads only `weeklyCheckInSubmissions.answersSnapshot`. Do not relabel historic answers when prompt wording changes; use `questionnaireVersion` to render the correct labels.

If there is no history, show `Your submitted weekly trackers will appear here.` and link/focus the current tracker when available.

## Video Library Prominence

Make **Video Library** a top-level client navigation destination for every client. Remove the full catalog from the bottom of My Dashboard. Keep one compact `Recommended for you` card/link on My Dashboard only when a recommendation exists.

The Library destination should include:

- `Video Library` page heading and count.
- Recommended resources first, with the recommendation reason.
- All resources in the existing responsive grid.
- A meaningful action such as `View video details` only if a destination exists; do not render fake links.
- Empty copy: `No videos are available yet.`

In production, captions/transcripts and keyboard-operable media controls are required before embedding playback. The current text-only catalog must not claim playback accessibility it does not implement.

## CSS and Responsive Plan

Extend `src/styles.css` using existing tokens and components rather than introducing a second design system.

Add styles for:

- `.client-nav`, `.client-nav [aria-current="page"]`.
- `.audience-banner`, `.audience-private`, `.audience-shared` with text labels that remain meaningful without color.
- `.challenge-list`, `.challenge-card`, `.challenge-meta`, `.challenge-actions`.
- `.challenge-card.is-blocked` using a verified brick/red border and subtle background; include a visible icon/text row.
- `.tracker-history`, `.tracker-history-item`, `.status-region`, `.field-error`, `.error-summary`.
- `.challenge-modal` and `.block-modal`, sharing modal base styles with `.client-modal`.

At `<= 880px`, stack card metadata and actions, keep audience text above the form, and make primary actions full width. At `<= 520px`, keep a one-column list, allow client nav to wrap or use equal-width buttons without horizontal scrolling, and make all touch targets at least 44px high where practical (never below WCAG's 24px minimum).

Acceptance at 320 CSS pixels:

- No horizontal page scroll.
- Challenge title, audience, status, owner, block reason, and every action remain visible.
- Dialog width fits the viewport and scrolls internally when needed.
- Video cards become one column.
- No hover-only controls.

Verify normal text at 4.5:1 contrast and UI/status boundaries at 3:1 where applicable. Test blocked rendering in grayscale and forced-colors mode; it must still read as blocked.

## Accessibility Contract

- Use semantic `<nav>`, headings in order, lists for backlogs/history, native form controls, and real buttons.
- All navigation, filtering, creation, status changes, history opening/closing, and library browsing work by keyboard without drag.
- Use one persistent `role="status" aria-live="polite" aria-atomic="true"` region for successful operations and filter counts. Use `role="alert"` only for errors requiring immediate attention.
- Never rely on red alone. Blocked means a visible word, warning icon/shape, block reason, and red treatment.
- Every form field has a visible label; required state and errors are programmatically associated.
- Do not clear form fields after validation failure.
- Disabled buttons are not the only status explanation; accompanying status text explains why an action is unavailable.
- Preserve focus across render-based updates using a small `pendingFocusTarget` strategy keyed to a stable challenge/submission ID.
- Respect `prefers-reduced-motion`; no workflow depends on animation.

## Exact Implementation Sequence

1. **State migration and seeds**
   - Increment version, add `session.clientView`, `challenges`, `challengeActivities`, and `weeklyCheckInSubmissions`.
   - Migrate `relationshipIssues` and submitted legacy check-ins.
   - Add private/blocked seed examples without weakening existing client isolation.

2. **Domain scope and challenge commands**
   - Add active membership/access helpers and challenge queries.
   - Add create/status/block/unblock/resolve/reopen/archive/restore functions with activity and audit metadata.
   - Remove direct challenge mutation from UI event handlers.

3. **Immutable check-in submission**
   - Add period/support fields and snapshot creation.
   - Make history query/readback immutable.
   - Add the optional confirmed tracker-to-challenge command.

4. **Client destination shell**
   - Add client nav, active destination state, conditional relationship item, and stale-view normalization.
   - Split the existing long client page into My Dashboard, Relationship, and Video Library view functions.

5. **Personal challenge UI**
   - Add backlog list/filter, add/block dialogs, card actions, empty states, audience labels, and status/focus management.

6. **Shared challenge UI**
   - Reuse the same components with relationship scope fixed by authorized context.
   - Add participant owner options, shared audience banner, raised-by attribution, and shared creation.

7. **Tracker/history UI**
   - Add support request, submitted-state confirmation, immutable history cards/detail, and optional confirmed challenge creation from the stuck response.

8. **Library prominence and dashboard cleanup**
   - Move the full catalog into its destination and leave only a compact recommendation on My Dashboard.

9. **Accessibility/responsive pass**
   - Add status/focus restoration, error association, dialog behavior, mobile stacking, contrast and forced-color treatment.

10. **Audit-revise loop**
    - Run domain tests, inspect persisted-state migration, run browser flows for all three clients, test keyboard/mobile/console behavior, repair findings, and rerun until clean.

## Automated Test Plan

Extend `tests/domain.test.mjs` with isolated seed-state tests.

### Challenge scope and lifecycle

- Client C can create a personal challenge with only a title; it defaults to backlog/private and writes activity.
- Client A cannot read/update Client B's personal challenge, even by known ID.
- Client A and Client B can read and update a shared challenge in their active workspace.
- Client C cannot read/create/update a challenge in Client A + Client B's workspace.
- Relationship challenge creation ignores/rejects a crafted unrelated workspace or owner ID.
- Block requires a reason, records actor/time, moves backlog to in focus, and preserves an activity event after unblock.
- Resolve/reopen and archive/restore preserve history.
- Archived clients cannot be new relationship owners/members, and their challenges remain retained.

### Weekly history

- Submitting creates one immutable snapshot with period, answers, support request, author, and submission date.
- Editing the next draft does not change the prior snapshot.
- Repeated submit does not accidentally duplicate the same period.
- Legacy submitted check-ins migrate once and do not duplicate on repeated load/migration.
- History is newest first and private to self/coach.
- Creating a challenge from a snapshot requires explicit command, remains private, and backlinks IDs in both records.

### Navigation/membership projections

- Client C has no active relationship destination.
- Client A and Client B resolve the same active workspace.
- Archived/paused/stale membership removes the client relationship view.
- A stale `session.clientView === "relationship"` normalizes to `dashboard` when no active workspace exists.

Run:

```sh
npm test
npm run build
git diff --check
```

Use the project's actual build script if named differently.

## Browser Acceptance Flows

Run the app at the local preview URL and execute every flow with browser console monitoring.

### Flow 1: Unlinked individual client

1. Reset demo, select Client C, switch to Client.
2. Confirm nav shows My Dashboard and Video Library only; Relationship and other client names/content are absent.
3. Confirm private audience text appears above tracker and personal backlog.
4. Add a challenge with title only. Confirm modal closes, success is announced, and focus reaches the new card or returns to Add challenge.
5. Mark it in focus, then block it. Confirm an empty reason is rejected without losing text; submit a reason.
6. Confirm card shows warning icon, `Blocked`, reason, red cue, and Unblock; verify status is understandable with styles/color disabled.
7. Unblock, resolve, reopen, archive, and restore; reload after each material transition to confirm persistence.

### Flow 2: Tracker submission and history

1. On Client C My Dashboard, fill focus, support wanted, and stuck point; submit.
2. Confirm success state is read-only and a new history item displays the exact submitted snapshot.
3. Open history detail and confirm original labels, audience, period, submitted time, and answers.
4. Return to history and confirm focus returns to the originating control.
5. Choose Add stuck point as a challenge, edit the prefilled title, confirm creation, and verify history/challenge backlink counts without changing historic answer text.
6. Start/edit the next draft and confirm the prior history detail remains unchanged after reload.

### Flow 3: Linked relationship participants

1. Select Client A and switch to Client. Confirm Relationship appears between My Dashboard and Video Library.
2. Open Relationship and confirm the shared audience banner names Client A, Client B, and Bri.
3. Add a shared challenge with an owner and optional desired outcome. Confirm the primary action says Add shared challenge and the card says Shared/Raised by/Owner.
4. Mark it blocked with a reason.
5. Switch to Client B and Relationship. Confirm the same challenge/status/reason/update time appears and Client A's private challenges/check-in history do not.
6. Update the shared challenge as Client B, switch back to Client A, and confirm a consistent source state.
7. Switch to Client C and verify the Relationship nav, workspace name, shared counts, and challenge are all absent.

### Flow 4: Video Library

1. For linked and unlinked clients, open Video Library from the top-level nav.
2. Confirm recommended and all resources render in a clear destination and the full catalog is absent from the bottom of My Dashboard.
3. At 320px width, confirm a single-column layout with no horizontal scroll.

### Flow 5: Keyboard, focus, and responsive behavior

1. Complete all navigation, challenge, block, tracker, history, and library flows using keyboard only.
2. Open each dialog; confirm initial focus, Tab/Shift+Tab containment, Escape cancellation, visible close control, and focus return.
3. Trigger validation errors; confirm first-error focus, associated messages, and retained form values.
4. Test at 200% zoom and 320 CSS pixels; confirm no content/action loss or two-dimensional scrolling.
5. Inspect accessibility tree for nav current state, dialog names, audience text, semantic lists, field errors, and live status messages.
6. Confirm no uncaught errors, warnings caused by invalid ARIA, or unauthorized data in rendered DOM.

## Definition of Done

- Every client has a private challenge backlog and can complete all challenge lifecycle actions without drag.
- Linked clients can both create and manage the same shared relationship challenge backlog; unlinked clients cannot discover it.
- Private and shared audience labels are present at page, form, and card level where disclosure could be ambiguous.
- Weekly submissions are immutable historical snapshots, and a client can view their history.
- The latest tracker includes an explicit coach-support request and a confirmed, never-automatic path to create a challenge.
- Video Library is a primary destination for every client.
- Blocked state is red plus text/icon/reason/action, and ordinary missing/due states are not red.
- Dialogs, errors, dynamic feedback, focus restoration, keyboard operation, and 320px reflow meet the stated accessibility contract.
- Automated tests, build, `git diff --check`, browser acceptance flows, and console inspection all pass.

## Production Follow-Up

Before real client data is used, move the same scope rules to authenticated server/database authorization with deny-by-default object checks. Add explicit relationship membership states and acknowledgment, retention/export/deletion policy, metadata-only security auditing, notification minimization, and optimistic concurrency for shared edits. Client-side visibility checks in this MVP are not sufficient protection for sensitive coaching records.
