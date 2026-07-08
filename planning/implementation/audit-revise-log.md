# Starship Implementation Audit And Revise Log

Implementation Audit Agent 4  
Date: 2026-07-08  
Ownership: this file only

## Scope Reviewed

- Current app files: `index.html`, `package.json`, `src/app.js`, `src/domain.js`, `src/state.js`, `src/styles.css`, `tests/domain.test.mjs`, `tools/dev-server.mjs`
- Requirements transcript: `planning/requirements-transcript.md`
- Implementation plans:
  - `planning/implementation/architecture-data-security-plan.md`
  - `planning/implementation/product-ux-implementation-plan.md`
  - `planning/implementation/integrations-automation-implementation-plan.md`
  - `planning/implementation/ai-metrics-library-implementation-plan.md`

## Verification Performed

- Ran `npm test`
- Result: passing
- Test output: `Starship domain workflow tests passed.`

## Current Implementation Summary

The current implementation is a static, local-first browser MVP backed by seeded synthetic state in `localStorage`. It has a coach/client role toggle and demonstrates several core Starship workflows:

- Coach attention queue with alerts.
- Client assignments with prompts, due dates, journal draft saving, and submission.
- Coach alert when an assignment is submitted.
- Weekly tracker/pre-call check-in submission.
- Mock Fathom extraction from a seeded transcript.
- Review queue for extracted insight and action-item candidates.
- Approval of insight candidates into durable insight records.
- Approval of action-item candidates into open action items.
- Mock SMS delivery queue when action items are approved and the client has SMS consent.
- Client action-item completion with coach alert.
- Legacy Roadmap progress meters with evidence labels.
- Framework/cosmology video library with topic-based recommendations.
- Local audit trail for important events.

This is a useful product-shaped prototype. It proves the happy path and gives future agents a shared surface to iterate on.

## What Works

### Assignments And Journaling

- The client can write a journal response against a coach-created prompt.
- Draft saving keeps the journal entry in `private_draft` visibility.
- Submitting a journal changes the assignment and journal status to `submitted`.
- Submission creates a coach-facing alert.
- The UI copy clearly distinguishes private draft from submitting to the coach.

### Weekly Tracker And Pre-Call Input

- The weekly tracker captures focus, questions, aliveness/importance, completed items, and stuck points.
- Submitting the tracker creates a coach alert.
- A stuck point changes the alert type to `checkin_stuck`, which supports attention triage.

### Mock Call Intelligence

- A seeded transcript can be extracted into two insight candidates and one action-item candidate.
- The candidates distinguish internal-world and external-world insight types.
- Candidates stay in review state until the coach approves them.
- Duplicate extraction for the same call is guarded.

### Action Items And Mock SMS

- Approved action-item candidates become open action items.
- Approval queues a mock SMS delivery when `smsConsent` is true.
- The SMS copy is short and does not include sensitive transcript excerpts.
- Clients can mark action items done, which creates a coach alert and roadmap evidence.

### Metrics, Roadmap, And Library

- The roadmap displays current vs target values and gap labels.
- Approved insights and completed action items increment roadmap progress and append evidence.
- Recommended videos are selected from the lowest progress area.
- The library contains seeded framework/cosmology resources with tags and descriptions.

### Tests

- The existing domain test covers the main happy path:
  - save journal draft
  - submit assignment
  - submit weekly tracker
  - mock extract call
  - approve insight
  - approve action
  - queue mock SMS
  - complete action

## Gaps Against Requirements And Plans

### Architecture And Data

- The app is browser-only and `localStorage`-backed. The architecture plan calls for server-side authorization, a database, audit records, integration jobs, and provider adapters.
- There is no tenant-aware or relationship-based access model. Role switching is a UI toggle, not authorization.
- Sensitive fields are plain local JSON. There is no encryption boundary, consent gate service, retention policy, export, or deletion workflow.
- Audit log entries are useful for the prototype but not durable, metadata-safe, or tamper-resistant.
- IDs are generated from `Date.now()` plus occasional random suffixes, which is acceptable for a demo but not for durable records.

### Product UX

- The app has a single-dashboard experience rather than the full planned navigation: assignments, journal archive, weekly tracker, action items, roadmap, library, calls, settings, review queue, and client roster.
- Coach cannot create new prompts, set due dates, configure weekly cadence, recommend videos manually, or manage clients from the UI.
- Client cannot browse/search prior journal entries beyond the currently rendered assignments.
- Assignment states are minimal. Missing states include reviewed, reopened, blocked, overdue recovery, and ask-a-question.
- Weekly tracker ratings exist in seed data but are not rendered or editable.
- Action-item states are minimal. Missing states include blocked, needs discussion, awaiting coach verification, and reminder preference changes.
- There is no clear notification preferences/settings surface.

### Fathom, AI, And Review

- The mock extractor is hardcoded to one transcript and does not parse source text or fixture variants.
- There is no raw artifact model, transcript segmentation, source hash, timestamp evidence, participant metadata, or replayable ingestion event.
- Review only supports approve. The plans call for approve, edit, dismiss, merge, sensitivity marking, and review notes.
- Approved roadmap progress is bumped automatically when insights are approved. The plans require human review before roadmap state changes, with append-only progression events and evidence.
- Insight candidates lack sensitivity, confidence display, review-required reason, linked thought models, linked roadmap dimensions, and client visibility controls in the UI.
- There is no distinction between AI-derived, imported, and coach-authored records beyond simple `source` strings.

### Integrations And Automation

- Fathom, Google Sheets, Google Drive, Google Calendar, SMS, and email integrations are not implemented beyond seeded/mock state.
- There are no webhook endpoints, raw integration events, idempotency checks, integration jobs, retry/dead-letter handling, or provider connection records.
- There is no Legacy Roadmap workbook import or Google Sheet mapping preview.
- There is no Drive/library sync or video asset management flow.
- There is no scheduler for weekly reminders, pre-call reminders, assignment reminders, or action-item reminders.
- Mock SMS deliveries are queued but never progress through sent/failed/status callback states.
- STOP/START/HELP SMS consent handling is not present.

### Metrics And Progress

- Roadmap movement is a simple numeric increment. It does not preserve snapshots, deltas, metric definitions, or evidence-backed progression events.
- There is no explicit "where they are now, where they are going, and gaps being closed" narrative beyond current/target meters and gap labels.
- There is no timeline of evidence across journals, calls, action items, and roadmap changes.
- There is no Legacy Roadmap workbook-shaped data model yet.

### Video Library

- The library lists videos, tags, and descriptions, but does not store video URLs, chapters, transcripts, visibility rules, watched state, or recommendation reasons.
- There is no search, filtering, folder/database structure, topic taxonomy management, or coach curation workflow.
- Recommendations are inferred only by the lowest roadmap ratio and do not account for call insights, pre-call focus, journal themes, or coach intent.

### Testing And Quality

- Current tests are valuable but narrow. They do not cover consent-denied branches, invalid assignment IDs, empty submissions, duplicate approvals, review idempotency, blocked/stuck states, roadmap bounds, or recommendation fallbacks.
- No UI/browser smoke test is present.
- No accessibility or responsive verification has been documented.
- `submitCheckIn` assumes the check-in exists; invalid IDs would throw.
- `upsertJournal` assumes the assignment exists; invalid IDs would throw.
- Approved candidates can likely be approved repeatedly if the same function is called again after approval, creating duplicate durable records.

## Risks

- The local prototype could be mistaken for a secure client-ready app. It is not ready for real client data.
- The role toggle makes it easy to view both coach and client surfaces without any permission boundary.
- Automatic roadmap bumps from approved insights may overstate progress and violate the planned human-reviewed roadmap workflow.
- Hardcoded extraction can hide the real complexity of Fathom transcript ingestion, evidence linking, and action-item ambiguity.
- Missing consent and opt-out handling is especially risky before any real SMS, recording, AI, or Google integration work.
- Browser `localStorage` can leak sensitive coaching data on shared devices and has no backup, access control, or retention controls.

## Recommended Revisions

### Revision 1: Stabilize Prototype Safety

- Add a visible local-demo/synthetic-data label.
- Add a privacy note in settings or footer stating that real client data should not be entered yet.
- Disable or clearly mark role switching as a demo affordance.
- Add defensive checks for missing assignments, check-ins, calls, candidates, and clients.
- Prevent duplicate approval of already-approved candidates.

### Revision 2: Expand Domain Test Coverage

- Add tests for:
  - SMS consent denied means no delivery is queued.
  - Empty assignment body cannot submit.
  - Missing assignment/check-in/candidate IDs fail safely.
  - Candidate approval is idempotent.
  - Roadmap progress never exceeds target.
  - Duplicate extraction remains idempotent.
  - Weekly tracker without stuck point creates normal alert.

### Revision 3: Upgrade Review Queue

- Add edit and dismiss actions for insight and action candidates.
- Add candidate metadata: sensitivity, confidence, review reason, source evidence, and visibility.
- Keep roadmap updates as separate candidates instead of directly bumping roadmap values from insight approval.
- Add review events to the audit trail for approve/edit/dismiss actions.

### Revision 4: Make Progress Evidence-Backed

- Introduce roadmap events or snapshots in state before adding more UI polish.
- Represent current state, target state, gap label, last movement, and evidence timeline separately.
- Show why a progress value changed and which journal/call/action item supports it.
- Avoid automatic progress increases unless tied to an explicit reviewed event.

### Revision 5: Build Mock Integration Contracts

- Add fixture files for Fathom transcript, action items, roadmap sheet export, Drive video list, and SMS callback scenarios.
- Add a small integration ingestion layer that stores raw mock events before normalization.
- Add idempotency keys/source hashes even in local mode.
- Keep provider-specific fields out of product records after normalization.

### Revision 6: Add Weekly Reminder And Notification Model

- Create a local notification preference model for client and coach.
- Add reminder categories for weekly tracker, pre-call questions, assignments, and action items.
- Add mock scheduled notifications and delivery states.
- Add STOP/START style consent simulation before any real SMS provider work.

### Revision 7: Improve Library Usefulness

- Add search and tag filters.
- Add recommendation reason text.
- Add video detail fields: URL, chapters, related roadmap dimensions, and visibility.
- Track watched/saved state separately from video metadata.

## Suggested Next Implementation Order

1. Safety guardrails and defensive domain behavior.
2. Broader domain tests.
3. Review queue edit/dismiss/idempotency.
4. Roadmap events and evidence timeline.
5. Mock integration fixtures and raw-event normalization.
6. Notification preferences, reminders, and SMS consent simulation.
7. Journal archive and library search.
8. Visual/browser smoke test once the UI stabilizes.

## Acceptance Bar For The Next Audit

The next audit should expect:

- Passing tests with expanded negative-path coverage.
- No duplicate durable records from repeated candidate approvals.
- A clearer separation between candidate review and roadmap mutation.
- At least one mock raw integration event flowing through normalization into candidates.
- A visible local-demo warning before any real client data is entered.
- Documented status for each transcript requirement: implemented, mocked, partial, or not started.
