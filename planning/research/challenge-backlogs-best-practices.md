# Open-Challenge Backlogs: Industry Best Practices

Research date: 2026-07-13  
Scope: individual-client and shared-relationship challenge backlogs in the Starship coaching/client portal

## Executive summary

Starship should adapt proven issue-tracking patterns without making intimate coaching work feel like software delivery. The strongest pattern is a single `Challenge` concept with an explicit scope: either one client's private coaching space or one manually created relationship workspace. Scope is a security boundary, not merely a filter. The server must derive access from the authenticated user, the challenge's scope, and current workspace membership on every request.

The recommended MVP workflow is deliberately small:

`Backlog` -> `In focus` -> `Resolved`

`Blocked` should be modeled as an attention condition on an unresolved challenge, with a required reason and timestamp, rather than as a terminal state. It can still appear as a board lane or filtered view. A resolved challenge can be reopened. Archiving removes an item from current work without deleting its history.

Every challenge needs a concise title, optional description, scope, creator, timestamps, state, optional priority, optional owner, and activity history. Relationship challenges are visible to both linked clients and the coach; personal challenges are visible only to that client and the coach. Moving a personal challenge into a relationship space should require explicit confirmation because it widens disclosure.

For the client experience, use a compact ordered list as the accessible, mobile-friendly default and offer a board as a secondary view. Creation should be fast, with only a title required. Details, ownership, priority, desired outcome, and target date can be added progressively. Weekly tracker submissions should create immutable historical snapshots and may link to newly created or existing challenges; they should not overwrite prior submissions or silently duplicate challenges.

For the coach command center, show challenge counts and the top attention signals by client: blocked first, then high-priority or stale in-focus work. Red may reinforce blocked status but cannot be the only cue; pair it with the word "Blocked," an icon, and accessible text.

## Requirements interpreted from the transcript

The supplied requirements add the following product behavior to the existing Starship plan:

- An individual client can maintain an open-challenge backlog.
- A manually linked pair can maintain a shared relationship-challenge backlog visible to both participants.
- Individual records remain separate from shared relationship records.
- Weekly tracker submissions are recurring for all clients and their submission history remains reviewable.
- The coach command center summarizes each client's current focus, requested support, and blocked items, while client detail retains richer context.
- Blocked work is visually prominent for coach and client.
- Client navigation remains constrained to the client's dashboard, linked relationship space when one exists, and Video Library.

This research complements the broader guidance in `planning/research/product-ux-best-practices.md` and the relationship addendum in `planning/requirements-transcript.md`.

## Evidence base

The recommendations below draw primarily from standards and first-party product guidance:

- The [Scrum Guide](https://scrumguides.org/scrum-guide.html) defines a backlog as an emergent, ordered list and a single source of work.
- The [Kanban Guide (May 2025)](https://kanbanguides.org/the-kanban-guide/2025.5/pdf/kanban-guide.v2025.5.en.pdf) calls for explicit workflow states, definitions of started and finished, control of work in progress, and review of flow.
- Atlassian's [product backlog guidance](https://www.atlassian.com/agile/scrum/backlogs) recommends a single prioritized list, continuous refinement, clear descriptions, and ordering by value and urgency. Its [backlog refinement guidance](https://www.atlassian.com/agile/scrum/backlog-refinement) emphasizes recurring review, ranking, clarification, splitting, and removing duplicates.
- GitHub's [Projects best practices](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects) recommend one source of truth, small manageable items, explicit dependencies, structured fields, purpose-built views, and automation that keeps status current.
- Linear's [priority guidance](https://linear.app/docs/priority) intentionally uses only No priority, Low, Medium, High, and Urgent because excessive granularity makes prioritization harder.
- Linear's [issue creation guidance](https://linear.app/docs/creating-issues) requires only a title and status while treating other properties as optional, supporting progressive disclosure.
- Linear's [assignment guidance](https://linear.app/docs/assigning-issues) describes an activity feed that records assignment changes, reinforcing the value of attributable history.
- OWASP's [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) recommends least privilege, deny by default, and authorization checks on every request. The [Business Logic Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) specifically advises rechecking object ownership and deriving security-relevant values on the server.
- NIST SP 800-171r3's [Audit and Accountability guidance](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html) identifies useful audit content such as timestamps, user or process identifiers, and event descriptions.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) requires keyboard operation, programmatically determinable names/roles/states, and accessible status messages. W3C's explanation of [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) states that color cannot be the only means of conveying information.
- W3C's [modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) specifies focus placement, contained tab order, Escape behavior, an accessible name, and a visible close control for any dialog-based creation or editing flow.

## 1. Domain model

### 1.1 Use one challenge entity with an explicit scope

Use one domain entity for personal and relationship challenges so states, history, sorting, and accessibility behave consistently. Do not infer visibility from a nullable `clientId`, the current screen, or a front-end filter.

Recommended core shape:

```text
Challenge
  id
  scopeType                 client | relationship
  scopeId                   clientProfileId | relationshipWorkspaceId
  title                     required, concise
  description               optional
  desiredOutcome            optional
  status                    backlog | in_focus | resolved
  priority                  none | low | medium | high | urgent
  rank                      ordering within a scope/view
  ownerType                 unassigned | client | both_clients | coach
  ownerId                   optional when ownerType = client
  createdByUserId
  createdAt
  updatedAt
  targetDate                optional
  blockedAt                 nullable
  blockedByUserId           nullable
  blockedReason             nullable
  resolvedAt                nullable
  resolvedByUserId          nullable
  archivedAt                nullable
  sourceType                manual | weekly_tracker | call_review | coach
  sourceId                  nullable
  version                    optimistic-concurrency value
```

Supporting objects:

```text
ChallengeActivity
  id, challengeId, actorUserId, eventType, occurredAt,
  fieldChanges, commentBody, sourceType, sourceId

ChallengeParticipantSnapshot (optional, for durable audit context)
  challengeId, userId, roleAtEvent, relationshipWorkspaceId, capturedAt

WeeklyTrackerSubmission
  id, clientId, periodStart, periodEnd, submittedAt,
  answersSnapshot, createdChallengeIds, linkedChallengeIds
```

Why this structure:

- `scopeType + scopeId` makes the disclosure boundary explicit and testable.
- `createdBy` and `owner` answer different questions: who raised it versus who is taking the next step.
- A durable `rank` supports ordering without abusing priority as a precise score.
- Block metadata preserves why attention is needed and for how long.
- `sourceType/sourceId` provides traceability from a weekly tracker or reviewed call recap without copying an entire source record.
- `archivedAt` keeps the active view lean while retaining history.

### 1.2 Keep challenges distinct from tasks, fights, desires, and journal entries

A challenge describes an open area requiring attention. A task describes a concrete commitment. A fight/rupture, desire, journal entry, or call insight may be evidence or context, but each has different privacy and lifecycle rules.

Recommended relationships:

- Challenge can have zero or more linked tasks.
- Challenge can link to a relationship rupture/repair record.
- Challenge can cite a weekly tracker submission or coach-approved call insight as its source.
- Journal content should not be copied into a shared challenge automatically.

This follows GitHub's first-party recommendation to link related work and break larger issues into manageable sub-issues while maintaining a single source of truth. In Starship, the challenge is the source of truth for status; linked records retain their own source content.

### 1.3 Do not model the backlog as an array embedded in the client record

An embedded array is convenient for a mock but becomes fragile when ordering, concurrent edits, activity history, permissions, pagination, and relationship membership matter. Store each challenge as an independently addressable record with an index on scope and active status.

Useful query indexes later:

- `(scopeType, scopeId, archivedAt, status, rank)`
- `(scopeType, scopeId, blockedAt)`
- `(ownerId, status, archivedAt)`
- `(sourceType, sourceId)`
- activity by `(challengeId, occurredAt)`

## 2. Status and lifecycle design

### 2.1 Keep the workflow small and explicit

The Kanban Guide emphasizes explicit states and definitions of started and finished. For coaching, a minimal workflow is easier to understand than a software-style sequence with triage, selected, ready, testing, review, and done.

Recommended definitions:

| State | Meaning | Entry rule | Exit rule |
| --- | --- | --- | --- |
| Backlog | Acknowledged but not an active focus | A title and scope exist | Client/coach intentionally selects it for focus |
| In focus | The client or relationship is actively working with it | Owner or next step is encouraged | It is resolved, returned to backlog, or blocked/unblocked |
| Resolved | The desired outcome is met, intentionally released, or no longer relevant | Resolution note is encouraged | It may be reopened with an activity event |

`Archived` should be a visibility/lifecycle flag rather than a normal work column. Archive resolved or abandoned items to keep current views usable; allow restoration. Do not delete them merely to declutter.

### 2.2 Model blocking as orthogonal attention metadata

Treating `Blocked` as the only status discards whether the challenge was merely queued or actively being worked. Prefer:

- `status = in_focus`
- `blockedAt = timestamp`
- `blockedReason = "Waiting for both clients to agree on a repair conversation time"`

The UI may render a computed Blocked lane, chip, and coach queue. Unblocking clears the current blocking fields but creates an activity event preserving the old reason and duration.

If the MVP cannot support orthogonal metadata cleanly, `blocked` may temporarily be a state, but the transition model must preserve where the item returns after unblocking.

### 2.3 Make transitions attributable and reversible

Record create, edit, reorder, prioritize, assign, block, unblock, resolve, reopen, archive, restore, link, and unlink actions. At minimum store actor, timestamp, event, and changed fields. NIST's audit guidance supports these fields, and established issue trackers expose activity over time.

Reopening is important in coaching because a recurring challenge is not a data error. Reopen the same item when the underlying challenge is continuous; create a new linked occurrence when the context or desired outcome is materially different.

### 2.4 Apply light work-in-progress discipline

Do not prevent a client from recording a new challenge. Instead, limit or warn on too many `In focus` items. A coaching-friendly MVP could recommend no more than three active-focus challenges per client/workspace while allowing the backlog to grow. This applies Kanban's focus principle without turning a reflective tool into a rigid production system.

## 3. Ownership, participants, and visibility

### 3.1 Separate scope, reporter, owner, and viewer

These concepts must not be collapsed:

- Scope: where the challenge lives and which privacy rules apply.
- Reporter/creator: who first entered it.
- Owner: who has responsibility for a next step, if anyone.
- Viewer/editor: who may read or change it under authorization policy.

A challenge can be shared without assigning blame. Default relationship challenges to `unassigned`; let participants choose Client A, Client B, both, or coach only when responsibility is genuinely useful. Display "Raised by" separately from "Owner."

### 3.2 Recommended access matrix

| Action | Personal client challenge | Relationship challenge |
| --- | --- | --- |
| Owning client reads | Yes | Yes, if currently a workspace participant |
| Partner reads | No | Yes, if currently a workspace participant |
| Coach reads | Yes | Yes |
| Owning client creates/edits | Yes | Yes |
| Partner creates/edits | No access | Yes |
| Coach creates/edits | Yes | Yes |
| Client changes scope | Only through explicit share/move confirmation | Cannot move into another client's private space |
| Archived client participates | Existing historical access policy must be explicit; no new assignment or relationship linking | Exclude from new links/ownership choices |

The relationship workspace created by the coach is the grant boundary. A client-side `relationshipId` parameter is not proof of access. Following OWASP, default to denial and validate the authenticated user's current membership and permitted action on every read and write.

### 3.3 Make widening visibility an explicit disclosure action

Moving or copying a personal challenge into a relationship workspace exposes it to another person. The UI should state who will see it and require confirmation. Recommended choices:

- Keep personal and create a linked shared summary.
- Move to relationship space and show to both participants.
- Cancel.

Never copy private journal text, private call notes, or coach-only annotations into the relationship challenge. The person should author or approve the shared summary.

### 3.4 Define membership changes safely

If a relationship is unlinked, stop new shared edits and hide it from normal client navigation, but retain its records and participant/activity history for the coach under the product's retention policy. Decide explicitly whether former participants retain read-only access; do not let this be an accidental consequence of current membership queries.

## 4. Priority, ordering, and coach attention

### 4.1 Use ordering for "what next" and priority for exceptional importance

The backlog itself should be ordered. Priority is an optional coarse signal. Linear's deliberate five-level scheme shows why extra precision creates diminishing returns.

Recommended levels:

- None (default)
- Low
- Medium
- High
- Urgent

Reserve `Urgent` for a challenge requiring timely human attention, not for every emotionally important topic. Because coaching content can be sensitive, an urgent flag should not imply emergency-response coverage unless the service actually provides it. Display appropriate scope/care language if this product is not a crisis service.

### 4.2 Compute coach attention separately from client-entered priority

Coach dashboard ordering should use transparent signals rather than silently rewriting priority:

1. Blocked unresolved challenges.
2. Explicit urgent/high priority.
3. Challenges named in the latest weekly tracker as the requested focus.
4. In-focus items with no update beyond an agreed threshold.
5. Remaining in-focus and backlog items.

Keep the reason visible: `Blocked 6 days`, `Requested support this week`, or `No update in 21 days`. This is more actionable than an unexplained risk score.

### 4.3 Make drag-and-drop optional

Boards commonly support direct manipulation, but drag-only reordering is inaccessible and awkward on mobile. Provide keyboard-operable `Move up`, `Move down`, or `Set priority position` actions, and ensure the accessible list view exposes the same operations. WCAG requires all functionality to be keyboard operable.

## 5. Weekly tracker and history integration

### 5.1 Preserve every submission as an immutable snapshot

Weekly tracker history should be a list of submitted instances, not one record repeatedly overwritten. Each submission needs its reporting period and `submittedAt` timestamp. Corrections should append a revision event or create a new revision while retaining what was originally submitted.

Suggested history card:

- Week/period and submission time.
- Requested call focus.
- Requested coach support.
- Stuck/blocked answer.
- Challenges created that week.
- Existing challenges linked or updated.
- A label when the submission was used/reviewed in a call.

### 5.2 Offer explicit challenge actions during submission

For each open-focus or stuck answer, offer:

- `Create new challenge`
- `Link to an existing challenge`
- `Keep only in this weekly tracker`

Do not automatically create a duplicate challenge on every weekly submission. If the answer resembles an open item, suggest likely matches but let the client choose. The submission remains the historical snapshot; the linked challenge remains the current operational record.

### 5.3 Update history through domain events

When a weekly submission creates or links a challenge:

- Add the challenge ID to the submission.
- Add an activity event to the challenge referencing the submission ID.
- Do not mutate previous submission text when the challenge later changes.
- Show backlinks in both directions.

This preserves one source of truth for current challenge state while retaining the week-by-week narrative.

## 6. Interaction patterns

### 6.1 Default to a list; offer a board as a view

GitHub Projects supports table, board, and roadmap views for different questions. Starship needs fewer views:

- List (default): best for mobile, assistive technology, search, filtering, and history.
- Board (optional): Backlog, In focus, Blocked, Resolved for at-a-glance flow.
- History: resolved/archived items and weekly tracker-linked activity.

Filters should include open/blocked/resolved, priority, owner, source, and date updated. Relationship space may also filter `Raised by` without treating the creator as responsible.

### 6.2 Use progressive disclosure for creation

Following Linear's minimal issue creation pattern, require only:

- Challenge title.
- Destination/scope, only when the user has more than one eligible space.

Then allow optional detail:

- Description/context.
- Desired outcome or "what would feel different?"
- Owner.
- Priority.
- Target date.
- Links to a weekly tracker, task, or repair record.

After successful creation, place the item in Backlog, announce success to assistive technology, close the form/dialog if one was used, and move focus to the new item or a clear confirmation. Do not clear user input on validation failure.

### 6.3 Use calm, non-blaming relationship language

Prefer:

- "Challenge" over "problem" or "fault."
- "Raised by" over "reported against."
- "Owner of next step" over "person responsible" when appropriate.
- "Resolved" or "integrated" over "won."
- "What would repair look like?" as context, not as a required challenge field.

Keep challenges and concrete shared tasks visually distinct. A challenge card can show linked next actions without turning interpersonal tension into a checklist.

### 6.4 Make blocking actionable

`Mark blocked` should request a short reason and optionally what support is needed. Once blocked, show:

- Text label `Blocked`.
- An icon or shape in addition to color.
- Reason and blocked duration.
- Primary action: `Ask for support` or `Unblock`.
- Coach attention-queue link where applicable.

W3C's color guidance explicitly forbids color as the only cue. Red can reinforce the state, but never replace the label. Any dynamic success/error update should use an accessible status message per WCAG 4.1.3.

### 6.5 Accessibility requirements for forms, dialogs, lists, and boards

- Prefer native buttons, inputs, selects, headings, and lists; expose programmatic names and states.
- Ensure creation, editing, filtering, reordering, blocking, resolving, and reopening work from the keyboard.
- Retain a visible focus indicator and logical focus order.
- If using a modal: set an accessible dialog name, move focus inside on open, keep Tab/Shift+Tab within it, support Escape, provide a visible Close/Cancel button, make the page behind inert, and return focus to the trigger or new item on close per the W3C dialog pattern.
- Associate validation errors with their fields and provide an error summary for multi-field failure.
- Announce successful creation, status change, filter result counts, and errors without unnecessarily moving focus.
- Do not make hover the only way to find card actions.
- Avoid a drag-only board and preserve a semantically complete list/table alternative.

## 7. Audit, history, and retention

### 7.1 Distinguish user-visible activity from security audit logs

User-visible activity answers: "What changed in this challenge?" A security audit answers: "Who attempted or performed which operation, from which session/context, and was it allowed?" They may be written from the same domain event but should have different exposure and retention.

User-visible activity should show:

- Created by and time.
- Status, block, priority, rank, owner, and scope changes.
- Comments or update notes.
- Weekly tracker/call/task links.
- Resolution, reopening, archive, and restore.

Security audit should additionally capture authorization failures and administrative membership/scope changes. Avoid placing sensitive challenge bodies in infrastructure logs; log identifiers and event metadata unless content is genuinely necessary.

### 7.2 Prefer append-only events and soft archive

Do not erase history when a title, owner, priority, or status changes. Append an event with old/new values and update the current projection. Archive should hide from active views but permit restore, matching established project-management behavior such as GitHub Projects' ability to archive and later restore items.

For true deletion requests, use an explicit retention/deletion workflow that accounts for linked weekly submissions, activity, and relationship participants rather than cascading silently.

### 7.3 Handle concurrent relationship edits

Two clients and a coach may edit the same shared challenge. Use optimistic concurrency through a version or last-updated token. On conflict, retain both users' text and ask the later editor to reconcile rather than silently overwriting another participant's update.

## 8. Coach and client surfaces

### Client dashboard

- Show personal open challenges.
- If linked, show a clearly separate relationship-space entry and its shared challenges.
- Never blend shared challenges into the personal list without a scope label.
- Show latest weekly tracker status and submission history.
- Show blocked items with text/icon/color and a next action.
- Keep client navigation limited to permitted client surfaces; hiding links is helpful UX but authorization must enforce the same boundary.

### Relationship workspace

- Shared heading names both participants or the relationship workspace.
- Show who can see the space.
- Add challenge quickly, with relationship scope preselected.
- List open challenges, linked tasks, ownership of next steps, block reasons, and repair status where relevant.
- Provide activity history visible to both participants and the coach; keep coach-only notes elsewhere.

### Coach command center

- Summarize each active client with current focus, requested support, weekly tracker state, open-challenge count, and blocked count.
- Group a relationship workspace without hiding the two individual client records.
- Sort attention by blocked/requested-support signals and explain why each item is surfaced.
- Allow drill-down to a client or relationship workspace.
- Exclude archived clients from active roster, owner selectors, and new relationship links while retaining historical records.

## 9. Anti-patterns to avoid

- One global `relationshipIssues` list filtered only in the browser.
- A personal challenge becoming partner-visible because a relationship link was later added.
- Treating `createdBy`, `owner`, and `visibleTo` as the same field.
- A single `open/closed` boolean with no in-focus or blocked semantics.
- A blocked state with no reason, timestamp, or next action.
- Red-only blocked cards.
- Mandatory priority on every challenge or a 1-100 priority score.
- Auto-creating a new challenge from each weekly answer without confirmation.
- Overwriting the last weekly tracker submission in place.
- Copying private journal or call content into a shared challenge.
- Drag-and-drop as the only way to reorder or change status.
- Deleting resolved items to keep the dashboard tidy.
- Coach-only metadata rendered in a relationship activity feed.
- Trusting client-supplied `clientId`, `relationshipId`, `ownerId`, or visibility fields without server authorization.

## 10. MVP recommendation and acceptance criteria

### MVP slice

1. Add the scoped Challenge and ChallengeActivity models.
2. Implement per-request authorization for personal and relationship scopes.
3. Add create, edit, prioritize/order, focus, block/unblock, resolve/reopen, archive/restore.
4. Add client list view and relationship list view; defer drag-and-drop board if necessary.
5. Save immutable weekly tracker submissions and support create/link/skip challenge actions.
6. Add coach summary counts and explicit blocked attention cards.
7. Add accessible status announcements, keyboard operations, and non-color cues.

### Research-derived acceptance criteria

- A personal challenge cannot be read or edited by another client, including a linked partner.
- A relationship challenge can be read by both current participants and the coach, and its scope is explicit in data and UI.
- Moving personal content into a shared scope requires confirmation naming the new audience.
- A challenge is creatable with only a title; optional fields can be added later.
- Current views distinguish Backlog, In focus, Blocked, and Resolved using both text and visual treatment.
- Blocking records actor, time, and reason and creates a visible activity event.
- Resolving, reopening, archiving, and restoring preserve prior history.
- Weekly tracker submissions are individually addressable historical records and remain unchanged when linked challenges evolve.
- A weekly tracker answer can create a challenge, link an existing one, or remain tracker-only.
- Coach summary shows blocked and requested-support reasons, not only unexplained counts or scores.
- All challenge operations are keyboard accessible, and reordering has a non-drag alternative.
- Dynamic create/update/error feedback is announced programmatically.
- Archived clients are absent from active roster and new relationship/ownership selectors but their historical challenge events remain intact.

## 11. Decisions to confirm before production implementation

- Whether former relationship participants retain read-only access after unlinking.
- Whether clients may edit each other's relationship challenge text or instead append updates only.
- Whether coach-only relationship notes are needed; if so, they must be a separate record type and never leak into shared activity.
- The default maximum recommended `In focus` count (three is a reasonable starting hypothesis to test, not an industry mandate).
- Whether `Urgent` triggers a coach notification and what response expectation the service promises.
- Whether a resolved recurring challenge should reopen or create a linked recurrence; support both with clear guidance.
- Retention and deletion rules for relationship records when one participant requests deletion.

## Conclusion

The best-practice implementation is not a generic Kanban clone. It is a privacy-aware, scope-explicit coaching backlog with a small workflow, coarse optional priority, attributable activity, immutable weekly history, and accessible interaction. The key architectural decision is to make personal versus relationship scope a first-class authorization boundary. The key product decision is to keep capture lightweight while making focus, blocking, history, and who-can-see-this unmistakable.
