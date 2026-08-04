# Weekly Check-In History and Coach Command Center Best Practices

Research date: 2026-07-13  
Scope: the new client-portal and coach command-center requirements supplied in the 2026-07-13 product transcript, interpreted alongside `planning/requirements-transcript.md`, `planning/research/product-ux-best-practices.md`, `planning/research/data-privacy-security-best-practices.md`, `planning/implementation/product-ux-implementation-plan.md`, and `planning/implementation/architecture-data-security-plan.md`.

## Executive Summary

Starship should treat each weekly check-in as a dated submission, not as one mutable “current tracker.” A submitted check-in should remain available in a chronological history with its reporting period, submission time, status, focus, support request, and challenges as they were at submission. Corrections should create an amendment or a new version with provenance rather than silently rewriting history. The client gets a readable timeline; the coach gets the current signal first and can drill into prior submissions when context is needed.

The coach command center should be an attention index across active clients. One row or compact card per client should answer, without opening the profile: What is this client focused on now? What support do they explicitly want? Did they submit this week? Is anything blocked? When is the next call? The default order should elevate actionable attention, but it should retain accessible sort and filter controls and never make lower-priority clients undiscoverable.

Red is appropriate only for a concrete, actionable blocked or critical condition. It should not mean merely “old,” “incomplete,” “worth noticing,” or “emotionally difficult.” Every red state must also have a visible text label such as **Blocked**, an icon or structural cue, sufficient contrast, and a clear recovery action. W3C explicitly prohibits conveying information by color alone.

Individual and relationship records must remain distinct. A client’s individual check-in, personal challenges, and support request should be visible to that client and their authorized coach by default. A partner sees only records explicitly created in or shared to the relationship workspace. The cross-client coach dashboard should show the minimum excerpt necessary for triage, with full sensitive responses behind client-level authorization and drill-down.

## Requirements Interpreted from the Transcript

The supplied transcript adds or clarifies these product needs:

- Every client is prompted to submit a recurring weekly tracker/check-in.
- Clients can see the history of their prior submissions.
- Individual clients can maintain a backlog of open challenges.
- Linked clients can maintain shared open challenges in a relationship workspace.
- The coach command center replaces the dummy folder-oriented surface with a cross-client operational dashboard.
- The command center summarizes each active client’s current weekly focus and requested coach support.
- The coach can drill from the roster into an individual client’s fuller detail.
- Blocked items are visually prominent for both coach and client.
- A client portal exposes the logged-in client’s dashboard, an authorized relationship space when one exists, and the Video Library.

These needs extend, rather than replace, the existing `WeeklyCheckIn`, `Challenge`, client/coach, relationship-workspace, archive, and visibility concepts in the planning documents.

## Source Base and How It Applies

Primary and authoritative sources were preferred:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and W3C’s [Understanding Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) establish that color cannot be the only means of conveying status, that normal text generally needs 4.5:1 contrast, that meaningful graphical/UI cues need 3:1 non-text contrast, and that dynamic status messages must be programmatically exposed.
- The U.S. Web Design System’s [state color tokens](https://designsystem.digital.gov/design-tokens/color/state-tokens/) distinguish information, warning, error, emergency, success, and disabled roles. This supports using semantic states intentionally rather than turning all attention signals red.
- The VA Design System’s [status-tag guidance](https://design.va.gov/components/tag/tag-status/) pairs semantic color with concise text and screen-reader context, recommends consistent placement, and warns against overwhelming a page with status indicators.
- The U.S. Web Design System’s [summary-box guidance](https://designsystem.digital.gov/components/summary-box/) recommends selecting, splitting, and sequencing the most critical information and limiting a summary to a few key details. This supports a small, scannable coach row rather than embedding complete submissions in the roster.
- The U.S. Web Design System’s [table guidance](https://designsystem.digital.gov/components/table/) supports tables for comparing structured records, while W3C’s [sortable-table example](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) shows native table structure, visible focus, full-cell sort targets, and `aria-sort` for accessible sorting. W3C cautions that examples must still be tested with target browsers and assistive technologies.
- The U.S. Web Design System’s [pagination guidance](https://designsystem.digital.gov/components/pagination/) explicitly identifies history and activity collections as suitable for pagination once they become large.
- USWDS guidance for [progressing through complex forms](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/) recommends progressive disclosure, small meaningful chunks, save-and-resume, transparency about data use, and trauma-informed design. These are directly applicable to recurring reflective check-ins.
- HL7 FHIR’s [QuestionnaireResponse definitions](https://hl7.org/fhir/R5/questionnaireresponse-definitions.html) provide a useful, transferable record-keeping pattern: distinguish when answers were authored from when a server record changed and retain response status/author/context. Starship is not being treated as a healthcare system; this source is used only as mature guidance for longitudinal questionnaire records.
- HL7 FHIR’s [Provenance](https://hl7.org/fhir/provenance.html) describes tracking the activity, agents, sources, and versions involved in creating, revising, or deleting a record. This supports trustworthy submission/amendment history without requiring Starship to adopt FHIR itself.
- The [NIST Privacy Framework](https://www.nist.gov/privacy-framework) provides a risk-based approach to privacy, while NIST’s [collection and data-minimization guidance](https://pages.nist.gov/800-63-4/sp800-63a/privacy/) emphasizes predictable processing, granular manageability, selective disclosure, and the risk created by unnecessary retention.
- The [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) recommends deny-by-default authorization, per-request object checks, least privilege, and attribute/relationship-based access where roles alone are insufficient.

## Best Practices for Weekly Check-In Submission History

### 1. Preserve a submission as a point-in-time record

A check-in answers “what was true for this person for this period?” It therefore needs business timestamps and state, not just a generic `updatedAt` field.

Recommended record semantics:

- `periodStart` and `periodEnd`, based on the client or organization timezone.
- `authoredAt` or `lastDraftedAt`, representing when the client supplied the answers.
- `submittedAt`, representing the explicit handoff to the coach.
- `status`: not started, draft, submitted, amended, reviewed/used in call, or superseded.
- `authorClientId` and the coach/workspace context receiving it.
- `questionnaireVersion` or schema version so old answers remain intelligible if prompts change later.
- `amendsCheckInId` or a version/provenance link for corrections.

The system may allow a client to edit a draft freely. After submission, either lock the response or make “Edit submitted check-in” create an explicitly labeled amendment. Do not silently replace the historical answers that the coach may already have reviewed.

### 2. Separate the latest operational projection from the history

The dashboard needs fast current answers; history needs durable records. Do not achieve the current dashboard by overwriting the only check-in record.

Use two conceptual views of the same domain data:

- **Submission history:** complete chronological records, newest first.
- **Latest check-in projection:** the most recent submitted record plus derived freshness, next-call relevance, blocked count, focus excerpt, and support-request excerpt.

The latest projection can be recomputed or cached. It should always point back to the source check-in ID and submission time. A coach must be able to tell whether “current focus” came from this week’s submission, a manually maintained client-profile field, or a relationship challenge.

### 3. Make the history readable, not merely stored

The client history should use a chronological list or timeline with:

- Reporting period and submitted date.
- Status, including late or amended where meaningful.
- Short focus and support-request summary.
- Count of open/blocked challenges linked at the time.
- A clear “View check-in” action.

On the detail page, show the complete response with its original question labels, submission metadata, amendment notices, and relevant challenge/action-item links. Filters should start modestly: date/year and status are enough for MVP. Add search or topic filters only after real histories become difficult to navigate. Paginate when the list grows; preserve the current filter and scroll context when returning from detail.

### 4. Keep recurrence humane and recoverable

Weekly trackers involve personal reflection, so optimize for completion without punitive pressure:

- Keep the core form short and place the questions most useful for the next call first.
- Save drafts and allow resume.
- State who will see the response before submission.
- Confirm submission and say what happens next.
- If a check-in is missing, offer “Start check-in” or “Ask for help,” not only an overdue warning.
- Treat “not submitted” separately from “blocked.” A missed form is not proof that the client is in crisis or that their work is blocked.
- If prompts evolve, version the form; do not relabel old answers under new questions.

### 5. Compare trends only when the data supports it

Narrative check-ins are not automatically metrics. Show longitudinal charts only for stable, consistently worded fields with a stable scale and clear meaning. Always retain exact dates and access to the source response. Avoid composite “client health” scores in the MVP: they can hide uncertainty, imply clinical precision, and encourage the coach to respond to an algorithm rather than the client’s stated needs.

Useful early trend cues are factual and reversible:

- Consecutive submitted/missed periods.
- Repeated support theme, labeled as a coach-reviewed tag rather than an AI conclusion.
- Open versus resolved challenge counts over time.
- Stable self-ratings shown individually, with no invented total score.

## Best Practices for the Coach Command Center

### 1. Make it an attention index across active clients

The primary coach job is triage: decide where to look and what to prepare for next. Replace the dummy folder tab rather than repurposing it. A file-system metaphor is not aligned to this job.

Recommended one-row/one-card roster fields:

| Field | Purpose | Display recommendation |
| --- | --- | --- |
| Client | Identity and drill-down | Name as a descriptive link to that client’s dashboard |
| Latest focus | What they are working on | One- or two-line bounded excerpt; show source/freshness |
| Support requested | What they want from Bri | Explicit client-authored excerpt; “No request submitted” rather than a blank |
| Check-in | Accountability/freshness | Submitted date or “Missing this period”; never color alone |
| Challenges | Work needing attention | Open count plus blocked count; distinguish individual and relationship scope |
| Next call | Preparation horizon | Localized date/time and relative cue such as “Tomorrow” |
| Attention reason | Why this row is elevated | Specific label: “Blocked challenge,” “Check-in missing,” or “Call tomorrow” |

The row should summarize, not reproduce, the full check-in. Long narrative answers belong in client detail. This reduces visual overload and limits unnecessary exposure of intimate content in a room where the coach dashboard may be visible.

### 2. Use an explainable priority order

A reasonable default sort is:

1. Explicit blocked challenges requiring coach action.
2. Direct support requests not yet acknowledged.
3. Upcoming calls needing preparation.
4. Missing or stale check-ins.
5. Remaining active clients by next call or name.

Every elevation must show its reason. Do not calculate an opaque risk score. Provide accessible controls for sorting by attention, next call, latest submission, or client name, and filtering by blocked, support requested, missing check-in, relationship workspace, and upcoming call. Show the active filter and result count, and provide “Clear filters.” Archived clients stay outside the active roster unless the coach intentionally opens the archive.

### 3. Use progressive drill-down with stable context

Recommended hierarchy:

`Coach command center -> Client dashboard -> Check-in/challenge detail`

- Level 1 answers who needs attention and why.
- Level 2 shows the selected client’s current focus, latest check-in, history, individual challenges, relationship link, calls, and other existing detail.
- Level 3 shows the exact submission or challenge with its history, ownership, privacy scope, and actions.

Use descriptive links such as “View Client A’s check-in” rather than repeated “View.” Back navigation should return to the same command-center filters, sort, and position. Relationship detail should be a clearly labeled separate scope, not a blended section that makes authorship or visibility ambiguous.

### 4. Let the client and coach see the same underlying status

When a challenge is blocked, the coach and authorized client views should share the same source status and updated time. They may offer role-specific actions, but they should not disagree about whether the item is blocked. A status change should record actor and timestamp. Resolution should remove the critical presentation while retaining the status history.

The client’s portal should remain calm and scoped:

- Their dashboard and weekly check-in/history.
- Their individual challenge backlog.
- A relationship workspace only when an active relationship link and access grant exist.
- The Video Library.

Coach-only notes, other clients, and unrelated relationship data must never be fetched and merely hidden in the browser.

## Red, Blocked, and Attention Semantics

The transcript asks for blocked items to be red. Implement that request as a semantic contract:

- **Red / Blocked:** work cannot move without intervention, or an explicit critical failure needs action.
- **Amber / Needs attention:** due soon, missing check-in, stale update, or support request awaiting review.
- **Neutral / Open:** active work that is progressing normally.
- **Green / Resolved:** use sparingly for a completed transition or confirmation, not as persistent decoration.

For every blocked presentation:

- Show the word **Blocked** and the reason if available.
- Pair color with an icon, left border, or status badge whose meaning does not depend on hue.
- Meet WCAG 2.2 AA text contrast (generally 4.5:1) and non-text/UI contrast (3:1 where applicable).
- Do not use pale red text on white or red-on-black combinations without verified contrast.
- Give a next action: “View challenge,” “Add unblock note,” “Request coach help,” or “Resolve block.”
- Use an accessible status announcement when a user changes the status dynamically; do not move focus unexpectedly for a routine update.
- Test at 200% zoom, keyboard-only, screen reader, high contrast/forced colors, and common color-vision-deficiency simulations.

Avoid making the whole dashboard red. Too many critical cues destroy prioritization and can turn an accountability tool into a shame signal. Reserve red for the subset of records where action is genuinely blocked.

## Privacy, Relationship Boundaries, and Data Handling

### Individual and shared are separate scopes

A relationship link grants access to a relationship workspace; it must not grant partner access to each client’s individual records. Model visibility on the record itself and enforce it server-side:

- `individual`: client subject plus explicitly assigned coach/staff.
- `relationship_shared`: both linked members plus explicitly assigned coach/staff.
- `coach_only`: authorized coach/staff only.

An individual check-in should default to `individual`. A user can create or explicitly share a challenge into `relationship_shared`, but changing visibility must be a deliberate action that names who will gain access. Prefer creating a shared challenge referencing the individual source, if appropriate, over broadening the visibility of a private narrative response.

### Minimize sensitive content on portfolio screens

The command center is a high-density surface with greater shoulder-surfing risk. It should show only what the coach needs to choose the next action:

- Bounded focus/support excerpts, not full journal or check-in bodies.
- Counts and named status reasons, not speculative emotional labels.
- No partner-private content inside a relationship summary.
- No SMS/email content, transcript passages, or private coach notes in the roster.

Consider a coach preference to hide sensitive excerpts and show only “Support requested” until opened. Regardless of UI choices, authorization must be checked on every underlying object request.

### Retention, provenance, and correction

- Record who submitted, amended, reviewed, changed visibility, blocked, or resolved a record and when.
- Keep security audit logs metadata-focused; do not copy response bodies into logs.
- Establish a documented retention period for check-ins and amendments, plus client export and deletion behavior.
- Make deletion consequences explicit where a check-in is linked to a shared challenge or coach record.
- Store the client/organization timezone used to define the weekly period.
- Treat archived clients as retained-but-inactive: their history remains authorized and searchable in the archive, but they stay out of the active command center and relationship-link selectors.

These controls align with NIST’s predictability/manageability goals and OWASP’s deny-by-default, per-object authorization guidance.

## Recommended MVP Decisions

1. Store one durable `WeeklyCheckIn` record per client per reporting period, with draft/submitted/amended/reviewed states and source timestamps.
2. Add a client-facing check-in history list and detail view; newest submissions first, with clear amendment labels.
3. Build a derived latest-check-in projection for the roster rather than mutating historical records.
4. Replace the dummy folder surface with an active-client attention index containing latest focus, explicit support request, check-in freshness, open/blocked challenge counts, next call, and an explainable attention reason.
5. Default-sort by actionable attention, with keyboard-accessible sort/filter controls and persistent navigation context.
6. Reserve red for `blocked`; use visible text and a second cue, verified contrast, and an unblock action.
7. Keep individual check-ins/challenges separate from relationship-shared challenges. A relationship link alone never shares private records.
8. Keep archived clients out of active roster queries and relationship-link candidates while preserving their authorized history.
9. Avoid composite health/risk scoring and AI-generated urgency in the MVP. Prioritize explicit client submissions and factual workflow states.
10. Test with Bri using realistic synthetic multi-client data: a blocked client, a support request, a missing check-in, an upcoming call, a linked relationship, an unlinked client, and an archived client.

## Research-Derived Acceptance Criteria for Planning

- A submitted check-in remains retrievable with its original period, questions, answers, author, and submission time after later check-ins are submitted.
- Editing a submitted check-in produces an explicit amendment/version or is disallowed; it never silently rewrites the historical record.
- A client can navigate from current check-in to prior submissions and back without losing context.
- The coach can identify each active client’s latest focus, support request, check-in freshness, next call, and blocked status from one command-center view.
- Every priority elevation explains why the client is elevated.
- Coach drill-down reaches the exact client and source submission/challenge; back navigation preserves roster state.
- A blocked status is conveyed by visible text plus a non-color cue and passes WCAG contrast checks.
- Missing, stale, overdue, and blocked are distinct states.
- An unlinked client cannot see another client or a relationship workspace.
- A linked partner can see relationship-shared challenges but cannot see the other partner’s individual check-ins or challenges.
- Archived clients are absent from the active roster and relationship-link dropdowns but remain available in an authorized archive and can be unarchived without losing history.
- Dashboard responses do not include unauthorized client records that are merely hidden by front-end filtering.
- No sensitive check-in bodies are written into application/security logs or external notification payloads.

## Anti-Patterns to Avoid

- One mutable weekly tracker record whose prior values disappear.
- A dashboard made of many equal-weight widgets or full response bodies.
- Sorting by an unexplained “risk” or “health” score.
- Red for every overdue, incomplete, or emotionally difficult item.
- Color-only status dots.
- Treating “no check-in” as “blocked.”
- Automatically sharing personal check-ins when two clients are linked.
- Combining personal and shared challenges without visible scope and authorship.
- Loading every client’s private detail into the browser and relying on CSS/front-end filtering.
- Leaving archived clients in active roster counts or link selectors.
- Renaming or restructuring prompts without retaining the version used for historical answers.
