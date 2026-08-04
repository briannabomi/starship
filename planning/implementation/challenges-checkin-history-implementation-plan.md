# Challenges and Weekly Check-In History Implementation Plan

Planning agent: data/domain specialist  
Date: 2026-07-13  
Scope: local-first MVP data model, migration, domain operations, and domain tests for individual/shared challenges and immutable individual weekly check-in history.

## Inputs Read

- `planning/requirements-transcript.md`, including the 2026-07-13 Challenge Backlog, Check-In History, and Dashboard Addendum
- `planning/research/challenge-backlogs-best-practices.md`
- `planning/research/client-portal-shared-workspace-best-practices.md`
- `planning/research/checkin-history-coach-dashboard-best-practices.md`
- `src/state.js`
- `src/domain.js`
- `tests/domain.test.mjs`

## Outcome and MVP Boundary

Add one independently stored `Challenge` model with an explicit `client` or `relationship` scope, an append-only user-visible activity collection, and one durable `WeeklyCheckIn` record per client/reporting period. A submitted check-in becomes an immutable historical snapshot. Current dashboard values are derived from the latest submitted record; submitting a later week never overwrites an earlier week.

This is a local-first, single-browser MVP. Domain functions must validate actors, scope, membership, lifecycle transitions, and link targets so the UI cannot accidentally mix private and shared data. This is useful defense in depth and makes production policies testable, but it is not a production authorization boundary: the entire state object is present in the browser and direct JavaScript mutation remains possible.

Production backend work is explicitly deferred: authenticated per-request authorization; database row constraints and transactions; explicit relationship-membership invitations/acknowledgment/revocation; organization and coach assignment checks; optimistic concurrency across devices; durable append-only audit storage; retention/export/deletion workflows; server-created IDs/timestamps; recurrence jobs and reminders; and pagination/indexes. The production schema should preserve the same scope, lifecycle, provenance, and immutable-submission semantics defined here.

## Domain Decisions

### 1. Challenge is a separate, scope-explicit entity

Add top-level `state.challenges` and `state.challengeActivities` arrays. Do not embed challenge arrays inside clients or workspaces. Do not use a nullable `clientId` to infer audience.

Each challenge has this MVP shape:

```js
{
  id,
  scopeType: "client" | "relationship",
  scopeId, // a client id or relationship workspace id
  title,
  description: "",
  desiredOutcome: "",
  status: "backlog" | "in_focus" | "resolved",
  priority: "none" | "low" | "medium" | "high" | "urgent",
  rank, // numeric ordering within one scope; new records use current max + 1000
  ownerType: "unassigned" | "client" | "both_clients" | "coach",
  ownerId: null, // populated only when ownerType === "client"
  createdByUserId,
  createdAt, // ISO date-time
  updatedAt, // ISO date-time
  targetDate: null,
  blockedAt: null,
  blockedByUserId: null,
  blockedReason: null,
  resolvedAt: null,
  resolvedByUserId: null,
  archivedAt: null,
  archivedByUserId: null,
  sourceType: "manual" | "weekly_tracker" | "migration",
  sourceId: null,
  version: 1,
}
```

Required invariants:

- `scopeType + scopeId` is immutable after creation. The MVP does not implement moving or copying private challenges into a relationship. A future share flow must create a new shared record after explicit audience confirmation.
- `title` is the only required content field and is trimmed; blank titles fail without mutation.
- A client scope must identify an existing client. A relationship scope must identify an existing workspace.
- An archived client cannot create/edit a personal challenge and cannot be selected as a new owner. A relationship containing an archived client is retained for coach history, but clients cannot create/edit it while a participant is archived.
- Personal challenges permit `unassigned`, that client, or coach ownership. Relationship challenges permit `unassigned`, either active participant, both clients, or coach ownership.
- `blocked` is not a status. Only unresolved challenges may be blocked; blocking requires a nonblank reason. Resolving clears current block fields after recording their prior values in activity. Reopening returns to `backlog`.
- `archivedAt` is a soft-archive flag, not a workflow status. Archived records are excluded from default active queries and cannot be edited except by restore.
- Every successful mutation increments `version`, updates `updatedAt`, and appends exactly one challenge activity. No-op/idempotent repeats append nothing.

### 2. Relationship issues remain repair/conflict records

Keep `state.relationshipIssues`; do not rename it to `challenges` or make it the long-term challenge store. Its `repair_in_progress` lifecycle and repair-specific fields are different from backlog state. New UI must read `state.challenges` for shared open challenges and treat `relationshipIssues` as repair/conflict records.

For persisted version-4 data, migration creates a linked relationship-scoped challenge for every existing relationship issue so the shared backlog does not appear to lose the records previously presented as “open challenges.” It also retains the original issue as the repair source. Use deterministic challenge IDs such as `challenge-from-issue-1` and `migratedFromRelationshipIssueId` to make migration idempotent. Map statuses as follows:

| Legacy relationship issue | Challenge projection |
| --- | --- |
| `open` | `backlog`, unblocked |
| `repair_in_progress` | `in_focus`, unblocked |
| `blocked` | `in_focus`, blocked; use `latestSignal`, then `description`, as the migration-only block reason |
| `closed` | `resolved`, unblocked |

Copy title, description, desired repair to `desiredOutcome`, owner where the owner is a workspace participant, created date, and severity (`high` -> `high`, all others -> `medium` or `none`). Mark source as `migration`, source ID as the relationship issue ID, and create one `migrated` activity. Do not keep the two records synchronized after migration; UI should expose the challenge as backlog work and the original issue as linked repair context.

### 3. Challenge activity is append-only user-visible history

Each `state.challengeActivities` entry has:

```js
{
  id,
  challengeId,
  actorUserId,
  eventType, // created, edited, focused, returned_to_backlog, blocked,
             // unblocked, resolved, reopened, archived, restored,
             // linked_to_checkin, migrated
  occurredAt, // ISO date-time
  fieldChanges: { fieldName: { from, to } },
  commentBody: null,
  sourceType: "manual" | "weekly_tracker" | "migration",
  sourceId: null,
}
```

Only domain helpers append activity; never update or remove prior activity. Store enough old/new data to explain the transition, including the old block reason when unblocking/resolving. Do not duplicate whole check-in answers or private journal/call content into an activity. Existing `auditLog` remains the metadata-focused operational/security-style log; new challenge audit entries should use generic details such as “Challenge status updated” plus IDs/status in metadata, not challenge bodies.

### 4. Weekly check-ins are period records, not one mutable profile field

Continue using top-level `state.weeklyCheckIns`, but normalize every item to this shape:

```js
{
  id,
  clientId,
  periodStart, // YYYY-MM-DD in the client's configured timezone
  periodEnd,   // YYYY-MM-DD
  dueAt,
  status: "not_opened" | "draft" | "submitted",
  questionnaireVersion: 1,
  questionLabels: {
    focus: "What do you want to focus on in the next call?",
    supportRequested: "Where would you most like Bri's support?",
    questions: "What questions do you want to bring?",
    alive: "What felt most alive or important this week?",
    completed: "What did you complete?",
    stuck: "Where are you stuck?",
  },
  focus: "",
  supportRequested: "",
  questions: "",
  alive: "",
  completed: "",
  stuck: "",
  ratings: { energy, clarity, alignment, progress },
  authoredAt: null,
  submittedAt: null,
  createdChallengeIds: [],
  linkedChallengeIds: [],
}
```

The flat answer fields deliberately remain for this MVP so current rendering code needs a small adaptation rather than a wholesale questionnaire engine rewrite. `questionLabels` and `questionnaireVersion` freeze the prompt meaning alongside the answer. A later backend can normalize questionnaire definitions and response answers.

Rules:

- Enforce at most one check-in per `clientId + periodStart + periodEnd` through `createWeeklyCheckIn`; return the existing record idempotently rather than duplicate it.
- Drafts may be updated through `saveCheckInDraft`. A successful save sets `status: "draft"` and `authoredAt`; submitted records reject draft updates.
- `submitCheckIn` may merge final updates into a draft, validate all requested challenge actions, and then make one atomic in-memory commit. After submission, answer fields, ratings, labels, period, provenance, and challenge links do not change.
- Repeating `submitCheckIn` on an already submitted record with no updates/actions is an idempotent success with no extra alert, completion, audit, activity, or link. Attempting changed updates/actions fails with a `checkin.amendment_required` audit event and no mutation.
- Amendments are deferred. The UI should say submitted trackers are read-only. A production amendment flow will create a new version linked by `amendsCheckInId`; it must never rewrite the original.
- `getSubmittedCheckIns` returns authorized history newest first by `submittedAt`, then `periodEnd`. `getLatestSubmittedCheckIn` derives the current projection from that result and returns the source record, not a copied mutable summary.
- Individual weekly check-ins are visible only to the owning client and coach. A linked partner cannot read them. Relationship check-ins are outside this slice and remain unchanged.

### 5. Weekly tracker challenge linking is explicit and private by default

Extend `submitCheckIn` with an optional `challengeActions` array:

```js
[
  { type: "create", title, description?, desiredOutcome?, priority? },
  { type: "link", challengeId },
]
```

For the MVP, tracker actions may create or link only unarchived personal challenges where `scopeType === "client"` and `scopeId === checkIn.clientId`. A personal check-in cannot link a relationship challenge because that backlink could disclose private tracker context to the partner. “Keep only in this weekly tracker” is represented by omitting an action.

Validate every action, scope, title, target, and actor before mutating the check-in or any challenge. On success:

- `create` calls the same internal challenge-construction policy with `sourceType: "weekly_tracker"` and `sourceId: checkIn.id`, then records its ID in `createdChallengeIds`.
- `link` records the existing ID in `linkedChallengeIds` and appends one `linked_to_checkin` challenge activity with only the check-in ID.
- Deduplicate repeated link IDs and reject attempts to link another client's, relationship-scoped, resolved/archived, or missing challenges.
- Never automatically copy `stuck`, `supportRequested`, or any other answer into a challenge title/description. The client must provide the explicit shared operational summary.

## Local MVP Authorization Policy

Add small pure helpers in `src/domain.js` and use them for all challenge and check-in queries/mutations:

- `getSessionActorId(state)`: `coach-bri` for coach session, otherwise `state.session.clientId`.
- `isCoach(state, actorId)`: true only for an active user whose role is `coach`.
- `isActiveClient(state, clientId)`: existing client with no `archivedAt`.
- `canAccessScope(state, actorId, scopeType, scopeId, action)`: coach may read/write retained scopes; a client may read/write their active personal scope; a client may read/write an active relationship workspace only if included in `workspace.clientIds` and all required participants/workspace are active. Archived historical challenges remain coach-readable.
- `canReadCheckIn(state, actorId, checkIn)`: coach or the check-in's own client; no relationship-derived access.

Every exported operation accepts an optional final `actorId`, defaulting to `getSessionActorId(state)` for current UI compatibility. Tests should pass actors explicitly. This prevents accidental UI mixing, but production must derive actor and organization from an authenticated server session and must not accept actor, scope, owner, or visibility claims from the browser.

## Exact Domain API

Add or revise these exports in `src/domain.js`:

- `getChallenges(state, filters = {}, actorId)`: authorized list, default `includeResolved: false`, `includeArchived: false`; filters support `scopeType`, `scopeId`, `status`, `blocked`, and `clientId`. For coach `clientId` includes personal challenges for that client plus relationship challenges in active workspaces containing that client, but every result retains its explicit scope. Sort blocked first, then priority (`urgent` to `none`), rank, and updated time.
- `getChallengeActivity(state, challengeId, actorId)`: authorize against the target challenge and return activity chronological oldest-first.
- `createChallenge(state, input, actorId)`: validate scope/title/owner; append challenge, `created` activity, and metadata-only audit; return challenge or `null`.
- `updateChallenge(state, challengeId, patch, actorId)`: permit only title, description, desiredOutcome, priority, ownerType/ownerId, targetDate, and rank; reject attempts to patch scope, creator, lifecycle timestamps, source, or version. Append one `edited` activity containing only changed allowed fields.
- `setChallengeStatus(state, challengeId, status, actorId)`: accept `backlog` or `in_focus`; resolved records must use reopen. Append `focused` or `returned_to_backlog`.
- `blockChallenge(state, challengeId, reason, actorId)`: unresolved/unarchived only; require reason; append `blocked`.
- `unblockChallenge(state, challengeId, actorId)`: blocked only; clear current block fields after appending old values in `unblocked`.
- `resolveChallenge(state, challengeId, actorId)`: unresolved/unarchived only; set resolved metadata, clear block metadata, append `resolved`.
- `reopenChallenge(state, challengeId, actorId)`: resolved/unarchived only; set `backlog`, clear resolved metadata, append `reopened`.
- `archiveChallenge(state, challengeId, actorId)`: soft archive, append `archived`.
- `restoreChallenge(state, challengeId, actorId)`: coach or otherwise authorized active scope; clear archive metadata and append `restored`.
- `createWeeklyCheckIn(state, clientId, input, actorId)`: create/return one period draft after actor/client validation.
- `saveCheckInDraft(state, checkInId, updates, actorId)`: accept only answer fields and partial `ratings`; reject invalid rating keys/values and submitted records.
- `submitCheckIn(state, checkInId, updates = {}, challengeActions = [], actorId)`: replace the current in-place-overwrite behavior with validate-then-commit immutable submission behavior.
- `getSubmittedCheckIns(state, clientId, actorId)`: authorized immutable history, newest first.
- `getLatestSubmittedCheckIn(state, clientId, actorId)`: latest authorized submitted record or `null`.

All failed operations return `null`/`false`, append a metadata-only failure audit where useful, and leave all target collections unchanged. Existing unrelated exports and behaviors remain intact.

## File-by-File Implementation

### `src/state.js`

1. Bump `STATE_VERSION` from 4 to 5; retain `STORAGE_KEY` so existing browser data can migrate.
2. Add `challenges: []` and `challengeActivities: []` to the seed, populated with realistic synthetic records: at least one personal Client C challenge, one personal Client A challenge, one shared Client A/B challenge, one blocked unresolved challenge with a reason/time, and matching creation/block activities. Keep personal and shared titles/content distinct.
3. Keep `relationshipIssues` as repair records. Add an optional link such as `linkedChallengeId` for seeded/migrated pairs.
4. Normalize seeded current check-ins with reporting periods, prompt snapshot/version, `supportRequested`, timestamp/link arrays, and unchanged IDs (`checkin-1`, etc.) to preserve current tests and selectors. Add at least two older submitted check-ins for one client and one submitted check-in for each other active client so history and latest-projection behavior can be demonstrated. Keep current period records as drafts/not-opened so every client still has a prompt.
5. Add `migrateState(state)` and make it idempotent. For version 4: initialize missing arrays; normalize every existing check-in without changing answers/IDs; convert already submitted records in place to immutable history records; derive a best-effort seven-day period ending at `dueAt` when period fields are absent; add question snapshot/version/link arrays; migrate relationship issues to linked challenges; retain all unrelated client, archive, workspace, integration, and history data; run `migrateVisibleLanguage`; set version 5 last.
6. Change `loadState` to accept and migrate structurally valid version-4 data instead of resetting whenever versions differ. Invalid JSON, missing core arrays, unsupported older shapes, or future versions may still fall back to seed. Never reset merely because optional version-5 collections are absent.
7. Keep migrations deterministic and duplication-safe so repeated `migrateState` calls do not add challenges or activity twice.

### `src/domain.js`

1. Add `isoNow()` for activity/submission timestamps while retaining date-only helpers where existing features expect them.
2. Add the authorization, scope-validation, owner-validation, change-diff, challenge lookup, activity append, and version-bump helpers described above.
3. Implement all challenge query/mutation APIs. Centralize mutation finalization so each successful mutation creates one activity and one generic audit record.
4. Implement weekly record creation, draft saving, history/latest queries, and validate-then-commit submission with explicit challenge actions.
5. Change `createClient` to use `createWeeklyCheckIn` (or the same normalized constructor) so every new client receives a fully shaped current-period prompt. Do not create history for a new client.
6. Preserve current first-submission completion and coach-alert behavior. Use `supportRequested` or `stuck` as attention metadata, but keep notification bodies generic. Do not duplicate alerts/completions on idempotent resubmission.
7. Do not alter `submitRelationshipCheckIn` in this slice.

### `tests/domain.test.mjs`

1. Import the migration, challenge, check-in draft/history, and query APIs.
2. Replace the test that currently expects a submitted check-in to be overwritten. Assert instead that idempotent no-argument resubmission succeeds without duplicates and changed resubmission fails without changing the stored snapshot.
3. Add focused test blocks listed below. Continue using fresh seed state; use explicit actor IDs for privacy tests.
4. Keep all existing unrelated assignment, AI review, SMS, client archive/unarchive, relationship, action, roadmap, and video tests passing.

## Domain Test Matrix

### Migration and seed compatibility

- A version-4 clone with existing clients, archive state, check-ins, relationship issues, and unrelated collections migrates to version 5 without losing IDs or records.
- Missing `challenges`, `challengeActivities`, period fields, support field, question snapshot, and link arrays are initialized.
- A submitted legacy check-in retains its original answers and submission date.
- Relationship issue status mappings produce correctly scoped challenge projections and retain original issues.
- Running migration twice produces identical challenge/activity counts and IDs.
- Existing visible “problems” strings still migrate to “challenges.”

### Scope and query isolation

- Client A can read Client A personal challenges and active workspace A/B challenges.
- Client A cannot read Client B or Client C personal challenges, including by exact ID/activity query.
- Client B cannot read Client A's individual check-in history.
- Client C sees no A/B relationship challenges.
- Coach can query both scopes, and every result keeps `scopeType`/`scopeId`.
- Default queries omit resolved/archived challenges; flags include them deliberately.
- Archived clients are excluded from new ownership and writes while coach history remains readable.

### Challenge creation and ownership

- Title-only creation succeeds in backlog with defaults, rank, timestamps, version 1, one `created` activity, and one generic audit.
- Blank title, missing scope, cross-client actor, missing workspace, archived participant, and invalid owner fail with no challenge/activity append.
- Relationship owners may be A, B, both, coach, or unassigned; a nonparticipant owner is rejected.
- Scope and source fields cannot be changed through `updateChallenge`.

### Challenge lifecycle and activity

- Backlog -> in focus -> blocked -> unblocked -> resolved -> reopened -> archived -> restored yields the expected current projection and ordered activities.
- Blocking without a reason, blocking resolved/archived work, and resolving archived work fail without mutation.
- Resolve records actor/time, clears active block fields, and preserves the prior block reason in activity.
- Reopen returns to backlog and preserves old resolution in activity.
- Repeating the same status/block/archive operation is idempotent or fails consistently without duplicate activity.
- Every successful edit/transit increments version exactly once.

### Check-in periods, immutability, and history

- Creating the same client/period twice returns one record; a later period creates a second.
- Partial draft rating updates preserve other ratings; invalid keys/out-of-range values fail atomically.
- First submission freezes period, labels, answers, ratings, links, and `submittedAt`; creates one completion, one generic alert, and one audit.
- Submitting a later period leaves the prior object deeply equal to its pre-submission snapshot.
- History returns only submitted records, newest first; latest points to the same newest source record.
- An owner and coach can query history; a partner and unrelated client receive no data.
- No-update resubmission is idempotent; changed resubmission returns false, logs `checkin.amendment_required`, and leaves answers/alerts/completions/activity unchanged.

### Check-in/challenge linkage

- A submission can explicitly create a new personal challenge and records its ID in `createdChallengeIds` with weekly-tracker provenance.
- A submission can link an existing active personal challenge and creates one backlink activity.
- Omitting challenge actions keeps the response tracker-only.
- Duplicate links are deduplicated.
- Missing, resolved, archived, another-client, and relationship-scoped challenge links fail the whole submission without partial check-in/challenge/activity mutation.
- Tracker answer text is not automatically copied into the created challenge.

## Acceptance Tests for the Integrated Feature

The implementation is accepted when all of the following are true:

1. Client C can create, focus, block with a reason, unblock, resolve, reopen, archive, and restore a personal challenge, and the activity history explains each successful change.
2. Client A and Client B can each create/read shared challenges in their active A/B relationship workspace; Client C cannot discover them through domain queries.
3. A/B relationship membership never exposes A's or B's personal challenges or individual weekly tracker history to the partner.
4. Coach queries can derive each active client's personal open/blocked counts plus explicitly labeled shared relationship counts without merging ownership scopes.
5. A blocked record has `blockedAt`, `blockedByUserId`, and a nonblank `blockedReason`; resolving/unblocking retains the prior reason in activity.
6. Each client has one current-period tracker prompt and can retrieve multiple prior submitted periods newest first.
7. Submitting the current tracker does not modify any earlier submitted record; attempting to edit a submitted tracker is rejected with an amendment-required result.
8. Tracker submission supports explicit create, link, or tracker-only handling for a personal challenge and never auto-shares tracker text into a relationship space.
9. Version-4 localStorage migrates once to version 5 without erasing clients, archives, workspaces, existing check-ins, relationship repair records, or unrelated feature data.
10. `npm test` passes with the expanded domain suite and `git diff --check` reports no whitespace errors.

## Deferred Production Backend Checklist

Before real client data is used, move these policies behind authenticated server APIs and database transactions:

- Model immutable owner scope with a database check constraint enforcing exactly one client or relationship owner.
- Model explicit relationship memberships and states (`pending`, `active`, `paused`, `revoked`) instead of relying on `workspace.clientIds`.
- Enforce organization, assigned-coach, active-membership, and per-object authorization on every list/detail/write/export/file request; deny by default.
- Add unique `(client_id, period_start, period_end)` and challenge-scope/rank indexes.
- Use transactionally appended activity plus challenge/check-in projection updates.
- Use optimistic concurrency (`version`) and conflict handling for shared relationship edits.
- Create periods/reminders on the server using the client's timezone and an idempotency key.
- Implement explicit amendments/provenance, retention, export, deletion, unlink/revocation, and former-participant access policy.
- Keep sensitive content out of security/application logs and external notification bodies.

