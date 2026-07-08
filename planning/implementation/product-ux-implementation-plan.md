# Starship Product UX Implementation Plan

Planning Agent 2  
Date: 2026-07-08  
Scope: user experience and product flows for the local-first Starship web MVP.

## Inputs Read

- `planning/requirements-transcript.md`
- `planning/research/product-ux-best-practices.md`
- `planning/research/integrations-automation-best-practices.md`
- `planning/research/data-privacy-security-best-practices.md`
- `planning/research/ai-insights-metrics-library-best-practices.md`
- `planning/project-plan.md`
- `planning/context-synthesis.md`
- `planning/open-questions.md`

## Product Assumption

Build Starship first as a local-first web MVP with a durable product model, not as a chain of automations. The first usable version should work with manually entered or fixture-imported data, while preserving clear extension points for later Fathom, Google Sheets, Google Drive, calendar, AI extraction, SMS, and email integrations.

The MVP experience should feel like a private coaching workspace:

- Clients see what to do next, what they have reflected on, what they committed to, where they are progressing, and which resources support the current moment.
- Coaches see who needs attention, what has been completed, what is ready for review, what is overdue, and what should shape the next call.
- Sensitive material is clearly labeled by visibility and review state.
- AI/imported content is treated as draft until reviewed.
- Notifications are designed as touchpoints inside the product first, with external delivery stubbed or simulated until consent and provider integrations are ready.

## UX Principles

1. One next step beats a crowded dashboard.
2. Private draft and submitted work must be visually distinct.
3. Completion is a workflow state, not a single checkbox.
4. Coach attention should be triaged, not turned into another inbox.
5. Progress should be backed by evidence and narrative, not just percentages.
6. SMS/email copy should stay minimal and point back to the secure app.
7. The client should not need to know whether data came from Fathom, Google Sheets, AI, or manual coach entry.

## MVP Roles

### Client

The client can:

- View active assignments, due dates, action items, check-ins, and recommendations.
- Draft and submit journal responses.
- Complete weekly check-ins and pre-call questions.
- Mark action items done, blocked, or needing discussion.
- Review roadmap progress and supporting evidence.
- Browse and search the video library.
- See privacy/visibility labels for their own content.
- Adjust notification preferences in local MVP form state.

### Coach

The coach can:

- View a roster and attention queue.
- Create and assign journal prompts with due dates.
- Review submitted assignments and check-ins.
- See completion alerts and blocked/stuck signals.
- Create or edit action items.
- Review draft imported insights/action items in a future-ready queue.
- Update roadmap progress and attach evidence.
- Recommend videos to clients.
- Configure weekly tracker cadence and reminder templates.

### Admin/Owner

For MVP, this can be a lightweight settings surface or seeded role. The owner can:

- Manage clients and coach-client relationships.
- Manage video resources and tags.
- Manage roadmap dimension templates.
- See integration readiness states.

## Information Architecture

### Client Navigation

- Home
- Assignments
- Journal
- Weekly Tracker
- Action Items
- Roadmap
- Library
- Calls
- Settings

### Coach Navigation

- Dashboard
- Clients
- Attention Queue
- Assignments
- Check-Ins
- Action Items
- Roadmap
- Call Recaps
- Library
- Settings

## Screen Inventory

### 1. Client Home

Purpose: give the client a calm, current answer to "what needs my attention?"

Primary modules:

- Next best step: one prominent assignment, check-in, or action item.
- Upcoming call prep: next call date, check-in status, pre-call question prompt.
- Due soon: assignments and action items sorted by due date.
- Progress snapshot: current roadmap focus, gap being closed, latest evidence.
- Recommended resource: one video or chapter, with reason.
- Recent reflections: last submitted or saved journal entries.

States:

- Empty new client: show first assigned prompt or onboarding reminder.
- No active tasks: show recent progress and library recommendation.
- Due soon: calm due date emphasis.
- Overdue: recovery actions such as "ask for more time", "mark blocked", "open assignment".
- Submitted pending coach review: confirmation and review status.

Interactions:

- Open next best step.
- Mark small action item done.
- Start or continue weekly tracker.
- Open roadmap evidence.
- Save recommended video.

### 2. Client Assignment Detail

Purpose: let a client respond to a coach prompt, save privately, and submit clearly.

Content:

- Assignment title and coach-authored prompt.
- Due date and current status.
- Visibility label: private draft, submitted to coach, coach reviewed.
- Journal editor.
- Optional linked resources.
- Optional related roadmap area.
- Activity trail: created, draft saved, submitted, reviewed.

States:

- Not started.
- Draft saved.
- Submitted.
- Coach reviewed.
- Reopened by coach or client.
- Overdue.
- Blocked.

Interactions:

- Save draft.
- Submit to coach.
- Mark blocked or ask a question.
- Reopen draft before coach review if policy allows.
- View coach response.

UX requirement:

- The submit action must explicitly say that the journal response will be shared with the coach.
- Saving a draft must not trigger coach alerts.

### 3. Client Journal Archive

Purpose: make prior reflections searchable and revisitable.

Content:

- Search bar.
- Filters: assignment/free reflection, status, roadmap area, tag, date.
- Entry list with title, date, status, visibility, linked evidence.
- Detail view with version/activity trail.

States:

- Empty archive.
- Search no results.
- Private-only entries.
- Submitted/reviewed entries.

Interactions:

- Search/filter.
- Open entry.
- Continue draft.
- Export selected entry placeholder for later export workflow.

### 4. Weekly Tracker / Pre-Call Check-In

Purpose: support recurring accountability and call preparation in under five minutes.

Recommended MVP fields:

- What do you want to focus on in the next call?
- What questions do you want to bring?
- What felt most alive or important this week?
- What did you complete?
- Where are you stuck?
- Optional ratings: energy, clarity, alignment, progress.
- Inline status update for open action items.

States:

- Not opened.
- In progress.
- Submitted.
- Submitted late.
- Used in call.

Interactions:

- Save and return.
- Submit.
- Update linked action items.
- Add a question for coach.

Notification touchpoints:

- Reminder scheduled before call or weekly cadence.
- Coach alert on submission.
- Coach high-priority alert if client marks stuck/blocked.

### 5. Client Action Items

Purpose: show commitments from calls and coach assignments.

Content:

- Open action items grouped by due date.
- Source: coach assigned, call recap, roadmap, assignment.
- Due date, owner, reminder status, status.
- Minimal source context and secure link to related call or assignment.

States:

- Open.
- Due soon.
- Overdue.
- Done.
- Blocked.
- Needs discussion.
- Awaiting coach verification.

Interactions:

- Mark done.
- Mark blocked.
- Ask a question.
- Change reminder preference for this item.

SMS rule:

- The UI can show full task detail, but external reminders should use minimal content and link back to Starship.

### 6. Client Roadmap Progress

Purpose: make the transformation visible as "now, destination, gap, next movement, evidence."

Content:

- Roadmap dimensions or phases.
- Current focus area.
- Current state.
- Desired state.
- Gap statement.
- Next movement.
- Evidence timeline.
- Progress indicator per dimension.

Recommended visual forms:

- Before / Now / Next cards.
- Milestone checklist.
- Gap-closing timeline.
- Evidence chips linking to journals, check-ins, calls, action items, coach notes.

States:

- No roadmap imported.
- Roadmap manually seeded.
- Roadmap imported from sheet but not reviewed.
- In progress.
- Evidence added.
- Coach reviewed.

Interactions:

- Open dimension.
- View evidence.
- Add reflection to roadmap area.
- Request coach review.

Guardrail:

- Do not present one global transformation score. Use dimensions with plain-language meaning.

### 7. Client Video Library

Purpose: help clients revisit frameworks and cosmology teachings by topic and moment of need.

Content:

- Search.
- Topic filters.
- Framework/cosmology categories.
- Roadmap-stage filters.
- Recommended for me section.
- Video cards with title, description, duration, tags, watched/saved status, why recommended.
- Detail page with embedded/link video, transcript/captions placeholder, chapters, related prompts.

States:

- Empty library.
- No search results.
- Recommended but unwatched.
- Watched.
- Saved.
- Reflected.

Interactions:

- Search/filter.
- Play/open video.
- Save.
- Mark watched.
- Start reflection from video.

MVP implementation note:

- Use metadata and external links first. Do not duplicate large video files unless private storage and signed URLs are implemented.

### 8. Client Calls

Purpose: give clients access to reviewed call outputs without exposing raw AI drafts.

Content:

- Upcoming call with prep status.
- Past calls with coach-approved recap.
- Approved action items.
- Approved insights.
- Recommended resources.

States:

- Upcoming.
- Awaiting recap.
- Coach reviewing imported insights.
- Recap published.

Interactions:

- Fill pre-call check-in.
- Review recap.
- Open action item.
- Open recommended resource.

### 9. Client Settings

Purpose: make privacy and reminders visible.

Content:

- Profile basics.
- Notification preferences: in-app, email placeholder, SMS placeholder.
- Quiet hours and timezone.
- Consent center placeholder.
- Data export/delete placeholders.

States:

- SMS not enabled.
- SMS consent pending.
- SMS enabled.
- SMS opted out.

Interactions:

- Update preferences locally.
- Simulate opt-in/out state.
- View what coach can see.

### 10. Coach Dashboard

Purpose: give the coach a decision-ready view of client attention.

Primary modules:

- Attention queue.
- Upcoming calls requiring prep.
- Recently submitted assignments.
- Weekly check-ins submitted.
- Clients overdue or blocked.
- Imported items needing review.
- Roadmap changes needing review.

States:

- No urgent attention.
- Multiple clients needing review.
- Integration/import queue present.
- Failed notification or import warning.

Interactions:

- Open client.
- Review submission.
- Resolve alert.
- Create assignment.
- Recommend resource.

### 11. Coach Client Profile

Purpose: provide a single workspace for one client.

Content:

- Client summary.
- Current roadmap focus.
- Open assignments.
- Open action items.
- Recent check-ins.
- Recent journal submissions.
- Recent insights.
- Recommended videos.
- Notification and consent status.

Interactions:

- Create assignment.
- Review assignment.
- Create action item.
- Update roadmap.
- Recommend video.
- Open call prep.

### 12. Coach Assignment Builder

Purpose: create prompts with due dates and optional supporting resources.

Fields:

- Client.
- Title.
- Prompt.
- Due date.
- Related roadmap area.
- Linked video/resource.
- Visibility/sharing instructions.
- Reminder rule.

States:

- Draft assignment.
- Scheduled/assigned.
- Client started.
- Submitted.
- Reviewed.
- Closed.

Interactions:

- Save as template.
- Assign now.
- Schedule due date.
- Preview client view.

### 13. Coach Review Submission

Purpose: review submitted assignments and check-ins.

Content:

- Submission content.
- Visibility and activity trail.
- Linked roadmap/action items.
- Coach response editor.
- Review status.

Interactions:

- Mark reviewed.
- Respond.
- Create action item.
- Add roadmap evidence.
- Recommend resource.
- Flag for next call.

### 14. Coach Call Prep

Purpose: turn weekly tracker answers and current state into a useful session view.

Content:

- Next call date.
- Client-submitted focus/questions.
- Open action items.
- Recent completions.
- Stuck/blocked signals.
- Latest roadmap gap.
- Suggested topics/resources.

Interactions:

- Mark item for call agenda.
- Create note.
- Create follow-up action.
- Link call recap after session.

### 15. Coach Imported Insights Review Queue

Purpose: prepare the UX contract for Fathom/AI outputs even if MVP starts with mock/manual import.

Content:

- Candidate action items.
- Candidate internal-world insights.
- Candidate external-world insights.
- Candidate roadmap updates.
- Candidate video recommendations.
- Source call metadata and timestamp/evidence snippet.
- Confidence/review required reason.

States:

- Candidate.
- Approved.
- Edited.
- Dismissed.
- Merged.
- Published to client.

Interactions:

- Approve.
- Edit.
- Dismiss.
- Mark sensitive.
- Convert to action item.
- Attach to roadmap.
- Publish recap.

Guardrail:

- No imported or AI-derived item should text a client, change roadmap progress, or become client-visible before review in the MVP.

### 16. Coach Roadmap Editor

Purpose: update or review roadmap progress.

Content:

- Roadmap dimensions.
- Current/desired/gap/next movement fields.
- Evidence list.
- Metric/rubric scale where relevant.
- Import status if using Google Sheet later.

Interactions:

- Edit roadmap state.
- Add evidence.
- Review imported update.
- Publish progress snapshot.

### 17. Coach Library Manager

Purpose: keep the video library usable and recommendable.

Content:

- Video/resource list.
- Tags.
- Roadmap dimensions.
- Visibility.
- Recommended clients.

Interactions:

- Add resource link.
- Edit metadata.
- Tag resource.
- Recommend to client.
- Create playlist.

## Core Product Flows

### Flow A: Coach Assigns Journal Prompt

1. Coach opens client profile.
2. Coach selects "New assignment."
3. Coach writes or selects prompt, sets due date, adds optional roadmap area and video.
4. Assignment appears on Client Home and Assignments.
5. Client opens assignment and writes a private draft.
6. Client submits, explicitly sharing with coach.
7. System creates completion/submission event.
8. Coach receives in-app alert and assignment appears in Attention Queue.
9. Coach reviews and optionally responds, creates action item, adds roadmap evidence, or recommends resource.
10. Client sees reviewed state and response.

Acceptance criteria:

- Client can save a draft without coach alert.
- Client can submit and see confirmation.
- Coach can find the submission from Dashboard, Attention Queue, and Client Profile.
- Assignment state is visible on both sides.

### Flow B: Weekly Tracker and Pre-Call Check-In

1. System creates weekly tracker instance based on coach/client cadence or upcoming call.
2. Client sees tracker on Home.
3. Reminder appears in in-app notification center; external delivery is simulated in MVP.
4. Client answers focus, questions, progress, completion, and stuck fields.
5. Client can update open action items inline.
6. Client submits.
7. Coach receives alert.
8. Coach reviews in Call Prep screen.
9. After call, coach can mark tracker "used in call."

Acceptance criteria:

- Tracker is completable on mobile-oriented layout in under five minutes.
- Stuck/blocked answer produces higher-priority coach alert.
- Submitted tracker is visible in call prep without opening multiple screens.

### Flow C: Action Item Lifecycle

1. Coach manually creates action item or approves imported candidate.
2. Action item appears in client Action Items and Home if due soon.
3. Notification service creates reminder event according to preferences.
4. Client marks done, blocked, or needs discussion.
5. Coach receives status event in Attention Queue.
6. Coach verifies/discusses if needed.
7. Completed action item can become roadmap evidence.

Acceptance criteria:

- Action item has owner, due date, status, source, and reminder status.
- External reminder content is minimal in template preview.
- Done and blocked states are distinct.

### Flow D: Progress and Gap Tracking

1. Coach creates or imports roadmap dimensions.
2. Coach sets current state, desired state, gap, and next movement.
3. Client sees roadmap snapshot.
4. Submissions, call insights, action items, and coach notes can be attached as evidence.
5. Coach reviews roadmap changes.
6. Client sees timeline of what changed and why.

Acceptance criteria:

- Every visible roadmap progress change has evidence or coach note.
- Client can understand now, destination, gap, and next movement without internal jargon.
- Progress view does not rely on a single unexplained score.

### Flow E: Video Recommendation and Browsing

1. Coach adds video metadata and tags.
2. Coach recommends video to client from Library Manager or assignment/call/roadmap screen.
3. Client sees recommendation on Home and Library.
4. Client opens video/resource detail.
5. Client can save, mark watched, or start a reflection.
6. Watched/reflected state can appear as light evidence, not punitive compliance.

Acceptance criteria:

- Videos are searchable and filterable by topic/tag.
- Recommendation includes a human-readable reason.
- Empty and no-result states help the user recover.

### Flow F: Imported Call Insights Review

1. A call recap is manually added or imported from fixture/Fathom later.
2. Candidate insights/action items appear in coach review queue.
3. Coach reviews source evidence and edits wording.
4. Approved action items become client-visible.
5. Approved insights can be added to call recap or roadmap evidence.
6. Client sees only published recap content.

Acceptance criteria:

- Draft imported items are never visible to client by default.
- Coach can approve, edit, dismiss, or mark sensitive.
- Candidate has source/evidence metadata.

## State Model Summary

### Assignment

- `not_started`
- `draft`
- `submitted`
- `coach_reviewed`
- `closed`
- `overdue`
- `blocked`

### Journal Entry

- `private_draft`
- `submitted_to_coach`
- `coach_reviewed`
- `archived`

### Weekly Tracker

- `not_opened`
- `in_progress`
- `submitted`
- `submitted_late`
- `used_in_call`

### Action Item

- `open`
- `due_soon`
- `overdue`
- `done`
- `blocked`
- `needs_discussion`
- `verified`

### Roadmap Item

- `not_started`
- `in_progress`
- `evidence_added`
- `review_needed`
- `reviewed`
- `integrated`

### Video Resource

- `available`
- `recommended`
- `saved`
- `watched`
- `reflected`

### Imported Candidate

- `candidate`
- `approved`
- `edited`
- `dismissed`
- `merged`
- `published`

### Notification

- `queued`
- `in_app_visible`
- `sent`
- `delivered`
- `failed`
- `read`
- `resolved`
- `suppressed_by_preferences`

## Notification Touchpoints

### Client In-App Notifications

- Assignment created.
- Assignment due soon.
- Assignment overdue.
- Weekly tracker ready.
- Weekly tracker due soon.
- Action item assigned.
- Action item due soon.
- Coach reviewed submission.
- Video recommended.
- Roadmap updated.

### Client External Notification Templates

For MVP, render these as local preview records, not real SMS/email.

- Weekly tracker: "Your Starship weekly tracker is ready. Open it here: [link]"
- Assignment due: "You have a Starship reflection due soon. Open it here: [link]"
- Action item: "You have a Starship action item due today. Review it here: [link]"
- Coach response: "Your coach reviewed a Starship reflection. Open it here: [link]"

Rules:

- Do not include journal text, transcript excerpts, sensitive insight labels, or internal-world interpretations.
- Include opt-out/consent state before real SMS is enabled.
- Respect quiet hours and timezone in scheduling logic.

### Coach Alerts

High priority:

- Client marks stuck/blocked.
- Pre-call question submitted close to call.
- High-priority assignment overdue.
- Imported sensitive insight needs review.

Medium priority:

- Assignment submitted.
- Weekly tracker submitted.
- Action item marked done.
- Roadmap evidence added.

Low priority:

- Video watched.
- Draft started.
- Routine progress update.

Coach alert UX:

- Alerts appear in Attention Queue with client, event type, priority, timestamp, status, and primary action.
- Alerts can be marked resolved.
- Low-priority alerts can be batched in a digest view later.

## Local-First MVP Implementation Notes

### Seeded Data

Use synthetic seed data for:

- One coach.
- Three clients.
- Several assignments across states.
- Weekly trackers across states.
- Action items across states.
- Roadmap dimensions.
- Video library resources.
- Mock call recap candidates.
- Notification records.

Do not use real client journal entries, transcripts, or private content in fixtures.

### Data Ownership

Even locally, model organization, user, client profile, coach-client relationship, visibility, consent, source, and audit-style event fields. This prevents a prototype data shape that later has to be replaced for privacy.

### Integration Readiness

Screens should show integration status placeholders:

- Fathom: not connected / manual import / import ready.
- Google Sheets Roadmap: manual roadmap / sheet selected / sync pending.
- Video Drive folder: manual resource links / folder selected.
- SMS: disabled / consent pending / enabled.

These should not block the MVP UX.

## Acceptance Criteria

### Client Experience

- A client can tell the next thing to do from Home within five seconds.
- A client can create and save a private journal draft without sharing it.
- A client can submit an assignment and see that it was shared with coach.
- A client can see assignment due dates and overdue states.
- A client can complete a weekly tracker and submit questions/focus for the next call.
- A client can update action item status as done, blocked, or needs discussion.
- A client can see current state, desired state, gap, next movement, and evidence in the roadmap.
- A client can browse, search, save, and open recommended videos.
- A client can see notification preferences and SMS consent status, even if external SMS is disabled.

### Coach Experience

- A coach can see a roster and attention queue.
- A coach can create an assignment with prompt and due date.
- A coach can review submitted assignments and weekly trackers.
- A coach receives visible in-app alerts when assignments/check-ins are submitted.
- A coach receives higher-priority alerts for blocked/stuck client states.
- A coach can create and manage action items.
- A coach can update roadmap progress and attach evidence.
- A coach can add video resources, tag them, and recommend them to clients.
- A coach can review imported candidate insights/action items before publishing.

### Privacy and Safety

- Private drafts are visually and functionally distinct from submitted content.
- Notification previews do not expose sensitive content.
- AI/imported items are labeled as draft/candidate before review.
- Client-visible roadmap changes show provenance.
- Status is not communicated by color alone.
- Empty states do not pressure or shame the client.

### Accessibility

- Forms have explicit labels and clear error messages.
- Status badges include text, not color alone.
- Keyboard navigation works for dashboard cards, forms, filters, and modals.
- Video resources support captions/transcript metadata fields.
- Mobile layouts preserve readable form controls and tap targets.

## Risks and Mitigations

### Privacy ambiguity

Risk: clients may not know whether a draft is private or shared.

Mitigation: persistent visibility labels, explicit submit copy, activity trail, and no coach alerts on draft save.

### Completion ambiguity

Risk: "complete" could mean drafted, submitted, reviewed, done, or integrated.

Mitigation: use object-specific state machines and plain-language labels.

### Coach alert fatigue

Risk: every small event becomes noise.

Mitigation: priority levels, attention queue, resolvable alerts, and later digesting.

### Over-metricizing transformation

Risk: personal growth feels reduced to a score.

Mitigation: use roadmap dimensions, narrative gaps, evidence, and next movement instead of a single transformation score.

### AI trust and misinterpretation

Risk: imported call insights may feel invasive or wrong.

Mitigation: candidate review queue, source evidence, coach approval, sensitivity labels, and editable wording.

### Notification privacy leakage

Risk: SMS/email exposes sensitive details on lock screens or vendor systems.

Mitigation: minimal notification templates and secure links; real SMS blocked until consent and provider controls exist.

### Library sprawl

Risk: videos become a folder dump.

Mitigation: required metadata, controlled tags, search, recommendations, and "why recommended" copy.

### Workbook dependency

Risk: the Legacy Roadmap Google Sheet has inconsistent structure.

Mitigation: local canonical roadmap model first; import mapping and reviewed sync later.

### Local MVP drift

Risk: local prototype ignores integration/privacy realities and becomes expensive to harden.

Mitigation: model consent, provenance, relationships, notification records, imported candidate states, and audit-style events from the start.

## Recommended Build Order

1. Shared app shell, role switcher, seeded synthetic data, and navigation.
2. Client Home, Coach Dashboard, and Attention Queue.
3. Assignments, journal draft/submit/review flow, and coach alerts.
4. Weekly Tracker and Call Prep flow.
5. Action Items with due dates, statuses, and notification previews.
6. Roadmap Progress view and Coach Roadmap Editor.
7. Video Library and Coach Library Manager.
8. Mock Call Recap / Imported Insights Review Queue.
9. Settings, notification preferences, consent placeholders, and integration readiness states.
10. End-to-end QA pass across client/coach flows, mobile layouts, accessibility, and empty/error states.

## Handoff Notes for Other Planning Agents

- Data/architecture agents should preserve the UX distinction between private draft, submitted content, reviewed content, and published imported content.
- Integration agents should emit product events into the same notification and review models instead of building feature-specific messaging paths.
- Implementation agents should avoid building the first screen as a landing page. The first screen after login should be the usable dashboard for the selected role.
- Audit/revision agents should test the whole loop: coach assigns, client drafts, client submits, coach alerts, coach reviews, roadmap evidence updates, client sees progress.
