# Starship Architecture, Data, and Security Implementation Plan

Planning Agent 1  
Date: 2026-07-08  
Inputs:

- `planning/requirements-transcript.md`
- `planning/research/product-ux-best-practices.md`
- `planning/research/integrations-automation-best-practices.md`
- `planning/research/data-privacy-security-best-practices.md`
- `planning/research/ai-insights-metrics-library-best-practices.md`

## Executive Direction

Build Starship as a local-first web MVP with a durable canonical data model, privacy-sensitive defaults, and integration pipelines that can start manually or through automation but always normalize into Starship-owned records.

The MVP should not be a thin Zapier dashboard, a generic task manager, or a video folder wrapper. It should be a secure coaching workspace where clients can reflect, complete assignments, prepare for calls, see progress, receive humane accountability, and revisit teachings. Coaches should get an attention system: what changed, what needs review, what is due, and what matters for the next call.

Primary architecture principles:

- Sensitive personal data by default.
- Local-first development in this repo, production-ready boundaries later.
- Tenant-aware from day one, even if the first workspace has one coach.
- Role and relationship-based permissions, not role-only access.
- Explicit consent, audit, retention, and export/deletion as product infrastructure.
- Source artifacts and AI-derived interpretations stored separately.
- Human review before AI changes roadmap state, creates client-visible insights, or sends SMS.
- SMS contains nudges and secure links, not sensitive content.

## MVP Technical Shape

Recommended implementation shape for the first build:

- Web app: Next.js or another full-stack React framework already chosen by the implementation lead.
- Database: relational database with migrations, preferably PostgreSQL for production; SQLite can be used for early local-only development if the ORM supports a clean PostgreSQL path.
- ORM/schema layer: Prisma or equivalent typed migration system.
- Authentication: mature auth provider/library, not custom password handling.
- Background jobs: lightweight local worker first; queue-backed worker in production.
- Object storage: local private file storage in development; S3-compatible private buckets later.
- Notifications: in-app first, email/SMS provider adapters behind one notification service.
- Integrations: ingestion endpoints and manual import screens first; Zapier/Make can feed the endpoints until native connectors are ready.
- AI: structured extraction jobs behind a review queue; no automatic publishing in MVP.

Local-first means the app can be developed and demonstrated from this repo with seeded synthetic data. It does not mean client data should remain only in browser storage. The canonical MVP should still use server-side authorization and a database so permissions, audit logs, imports, and background processing are designed correctly.

## Suggested Future Repository Structure

If using Next.js:

```text
app/
  (client)/
    home/
    assignments/
    journal/
    weekly-check-in/
    roadmap/
    library/
    calls/
    settings/
  (coach)/
    roster/
    attention/
    clients/[clientId]/
    review-queue/
    templates/
  api/
    integrations/
      fathom/v1/
      google/v1/
      twilio/v1/
    webhooks/
components/
  domain/
  forms/
  navigation/
  status/
lib/
  auth/
  authorization/
  audit/
  consent/
  db/
  encryption/
  integrations/
    fathom/
    google/
    twilio/
  notifications/
  privacy/
  roadmap/
  review/
  scheduler/
  search/
  validation/
workers/
  jobs/
  queues/
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  authz/
  integration-fixtures/
  privacy/
  workflows/
planning/
```

Important module boundaries:

- `lib/authorization`: all role, relationship, and object visibility checks.
- `lib/audit`: metadata-only privacy/security event recording.
- `lib/consent`: consent state, withdrawal checks, and processing gates.
- `lib/notifications`: event-to-channel routing with quiet hours and opt-out logic.
- `lib/integrations`: provider-specific adapters only, never product business logic.
- `lib/review`: AI/import candidate approval, edit, reject, merge, and publish flows.
- `workers/jobs`: async imports, AI extraction, reminder scheduling, retention, export.

## Core Domain Model

Use tenant-aware IDs on all core records:

- `organizationId`
- `clientProfileId` where relevant
- `createdByUserId`
- `updatedByUserId`
- `sourceType`
- `sourceId`
- `visibility`
- `retentionPolicy`
- `deletedAt`

### Identity and Workspace

`Organization`

- Coaching business/workspace.
- Stores default timezone, retention defaults, notification defaults, privacy posture.

`User`

- Login identity.
- Email, name, auth provider ID, account status, last login metadata.

`Membership`

- Joins user to organization.
- Roles: `owner`, `coach`, `assistant`, `client`, `auditor`.
- Status: invited, active, suspended, removed.

`ClientProfile`

- Client-specific profile in an organization.
- Can link to one or more user accounts if needed.
- Stores timezone, reminder preferences, program status, current roadmap focus.

`ClientCoachRelationship`

- Explicitly grants a coach or assistant access to a client.
- Access level should distinguish full coaching access from limited operational access.

### Consent, Privacy, and Contact

`ConsentRecord`

- Type: recording, transcription, AI processing, SMS, Google import, Fathom import, privacy policy, terms.
- Scope: organization-wide, client, call, integration, or data category.
- Status: granted, withdrawn, expired.
- Actor, timestamp, consent copy/version, withdrawal timestamp, notes.

`ContactPoint`

- Email or phone number.
- Verification state, SMS opt-in state, opt-out state, consent link.

`NotificationPreference`

- Channel preferences by category.
- Quiet hours, timezone, cadence, digest preference.

### Assignments, Journals, and Weekly Tracking

`Assignment`

- Coach-created prompt with due date.
- Fields: title, prompt, dueAt, priority, status, visibility, templateId, clientProfileId.
- Status flow: `not_started -> draft -> submitted -> coach_reviewed -> closed`.

`JournalEntry`

- Reflection content linked to an assignment or free-form prompt.
- Fields: bodyEncrypted, title, draft/submitted state, visibility, submittedAt.
- Default visibility should be private draft until explicit submission/share.

`WeeklyCheckIn`

- Recurring pre-call tracker.
- Fields: focus area, questions, aliveness/importance, completed items, stuck points, optional ratings.
- Status flow: `not_opened -> in_progress -> submitted -> used_in_call`.

`CompletionEvent`

- Records meaningful completion transitions for assignments, check-ins, action items, videos, and roadmap items.
- Drives coach alerts and progress evidence.

### Calls, Fathom, AI, and Review

`CallSession`

- Scheduled or completed coaching call.
- Fields: coach, client, scheduledStart, scheduledEnd, calendar source, Fathom source, status.

`CallArtifact`

- Raw or source artifact: transcript, recording pointer, Fathom summary, imported notes.
- Store raw transcript separately from insights/action items.
- Fields: artifactType, provider, externalId, storagePointer, sourceHash, importedAt, retentionState.

`TranscriptSegment`

- Optional segmented transcript rows for AI and evidence linking.
- Fields: callArtifactId, speaker, startTime, endTime, textEncrypted, topicLabel.

`InsightCandidate`

- AI/import-proposed insight not yet trusted.
- Types: `internal_world`, `external_world`, `thought_model`, `roadmap`, `relationship_system`, `practice_observation`.
- Fields: title, summary, evidence references, sensitivity, confidence, clientVisibility, reviewRequiredReason.

`Insight`

- Reviewed, durable coaching insight.
- Links to source call/journal/roadmap evidence and reviewer.
- Maintains AI provenance when AI-assisted.

`ActionItemCandidate`

- Proposed action from Fathom/AI/manual import.
- Fields: task title, owner, due date, due date basis, evidence references, confidence, client message draft.

`ActionItem`

- Approved task visible to client/coach.
- Status flow: `open -> done -> verified_or_discussed`.
- Reminder state and notification preferences live separately from the task text.

`ReviewEvent`

- Records approve/edit/reject/merge/publish actions for candidates.
- Required for AI accountability and coach trust.

### Roadmap and Metrics

`LegacyRoadmapSource`

- External source configuration for current Google Sheet or future app.
- Fields: provider, external file ID, mapping config, sync status, selected ranges, last sync.

`LegacyRoadmapItem`

- Canonical imported roadmap dimension, milestone, module, or objective.
- Do not make the client UI depend on live Google Sheets.

`RoadmapSnapshot`

- Versioned state of the roadmap at an import or review moment.
- Stores source hash, import timestamp, validation state, and deltas.

`RoadmapEvent`

- Appended progress/update event with evidence and reviewer.
- Never silently overwrite old roadmap states.

`MetricDefinition`

- Coach-defined dimension or goal scale.
- Include plain-language anchors for levels, not just numbers.

`MetricSnapshot`

- Current state, desired state, gap, closed gap, evidence, timestamp, provenance.
- Supports the "where they are now, where they are going, gaps closing" requirement.

### Video and Resource Library

`ResourceVideo`

- Title, description, source URL or storage pointer, thumbnail, duration, visibility, speaker, captions/transcript status.

`VideoChapter`

- Timestamped chapter, summary, transcript segment, tags.

`Tag`

- Controlled taxonomy with synonyms, parent tag, related thought models, related roadmap dimensions.

`ResourceRecommendation`

- Links video/chapter to client, assignment, action item, insight, or roadmap gap.
- Includes "why recommended", required/optional state, expiration/relevance window.

`ResourceEngagement`

- Saved, watched, reflected, completed.
- Keep lightweight and non-punitive.

### Integrations, Notifications, and Audit

`IntegrationConnection`

- Provider connection metadata for Fathom, Google, Twilio, calendar.
- OAuth token references should be encrypted or stored in a secrets manager, not raw columns.

`IntegrationEvent`

- Raw provider event log with redacted payload, headers needed for debugging, processing status, attempts, errors.

`NotificationEvent`

- Domain event to notification bridge.
- Examples: assignment submitted, check-in due, action item approved, roadmap update reviewed.

`MessageDelivery`

- Provider, provider message ID, channel, delivery state, retry count, error code.
- Avoid storing sensitive message bodies.

`AuditEvent`

- Append-only privacy/security log.
- Metadata only: actor, organization, client, action, target, timestamp, IP/session, result, reason, correlation ID.

## Permissions and Access Control

Use deny-by-default authorization with both role-based and relationship-based checks.

Roles:

- `owner`: organization settings, staff, integrations, retention defaults.
- `coach`: assigned clients and coaching data.
- `assistant`: limited operational access, configurable by owner.
- `client`: own assignments, entries, action items, roadmap, resources, consent, notifications.
- `auditor`: read-only security/compliance view if needed later.

Required rules:

- A coach role alone does not grant access to all clients; `ClientCoachRelationship` must permit access.
- A client can only access their own records.
- Staff roster and attention views must not expose journal/transcript bodies in list summaries.
- Journal drafts are private until submitted/shared.
- Coach completion alerts should include metadata and deep links, not journal text.
- Raw transcripts and recordings require explicit call/session access and applicable consent.
- AI candidates are staff/reviewer visible only until approved.
- Roadmap updates from AI/import require review before changing client-visible progress.
- Videos can be broadly visible, but watch history and recommendations are client-sensitive.
- Signed, short-lived URLs are required for private files, recordings, exports, and media.

Implementation acceptance for every API route:

- Authenticated user required unless route is a verified external webhook.
- Organization scope resolved server-side.
- Relationship check performed for client-scoped records.
- Visibility and consent gates checked for sensitive records.
- Audit event written for sensitive reads/writes/deletes/exports.

## Consent, Audit, Retention, and Deletion

### Consent Gates

Before real client data enters the system, implement these records and checks:

- SMS consent before reminder texts.
- Recording/transcription consent before processing call content.
- AI processing consent before transcript or journal AI use.
- Google import consent before connecting Legacy Roadmap sheets.
- Fathom import consent before importing meeting artifacts.
- Terms/privacy policy acceptance.

For each consent screen, record what data is collected, why, who can see it, which processors receive it, whether AI is used, how withdrawal works, and what happens to already-derived records.

### Audit Events

Log:

- Login and invitation events.
- Role, membership, and client relationship changes.
- Consent grants and withdrawals.
- Journal create/update/submit/delete.
- Assignment status changes.
- Transcript import/view/process/delete.
- AI job requested/completed/failed/reviewed.
- Action item approve/send/complete.
- SMS opt-in, opt-out, sent, failed.
- Google/Fathom connect/sync/revoke.
- Roadmap import, review, and update.
- Export and deletion jobs.
- Authorization failures.

Do not log:

- Journal body.
- Transcript body.
- Full AI prompts/completions containing client content.
- Full SMS body.
- OAuth tokens, API keys, signed URLs, reset tokens.

### Retention Defaults

MVP defaults should be visible and configurable later:

- Journals retained while account is active; exportable and deletable according to policy.
- Assignments/action items retained while active plus archive period.
- Raw transcripts retained for the shortest useful period; derived reviewed records can live longer.
- Recording files should remain in source system or private storage only when needed.
- SMS logs keep delivery metadata, not sensitive bodies.
- Audit logs retained longer than user content, without private content.
- Backups have a documented deletion lag.

### Export and Deletion

Client export should include:

- Assignments.
- Journal entries.
- Weekly check-ins.
- Action items.
- Roadmap progress.
- Approved client-visible insights.
- Resource recommendations and engagement.

Deletion workflow:

- Show what will be deleted, retained, or anonymized.
- Revoke relevant external tokens.
- Queue object storage deletion.
- Queue vector/search index deletion if used.
- Record deletion completion in audit logs without retaining deleted content.

## Primary Data Flows

### Assignment and Journal Flow

1. Coach creates assignment prompt with due date and visibility.
2. Client sees assignment on home and assignment list.
3. Client drafts journal entry as private draft.
4. Client submits or marks complete.
5. System creates `CompletionEvent`.
6. Notification service routes coach alert to attention queue/email according to preferences.
7. Coach reviews, comments, and closes or keeps open.
8. Progress evidence can link to the submitted entry without exposing it elsewhere.

### Weekly Check-In Flow

1. Scheduler creates or opens upcoming `WeeklyCheckIn`.
2. Reminder job checks due window, quiet hours, consent, and preferences.
3. Client submits focus area, questions, stuck points, and optional ratings.
4. Coach attention queue surfaces check-in for upcoming call.
5. Check-in can create action items, roadmap evidence, or call prep notes after coach review.

### Fathom/Transcript Flow

1. Fathom or Zapier/Make sends transcript/summary/action item payload to Starship ingestion endpoint, or coach manually imports transcript.
2. Webhook verifies source, stores raw redacted `IntegrationEvent`, returns quickly.
3. Worker normalizes into `CallSession`, `CallArtifact`, and optional `TranscriptSegment`.
4. Consent gates determine whether AI processing can run.
5. AI structured extraction creates candidates: insights, action items, roadmap updates, video recommendations.
6. Coach review queue shows candidates with evidence/timestamps.
7. Approved action items become client-visible and eligible for reminders.
8. Approved insights and roadmap updates become progress evidence.

### SMS Reminder Flow

1. Domain event or scheduler creates `NotificationEvent`.
2. Notification service checks recipient preferences, SMS consent, opt-out state, quiet hours, category rules, and sensitivity.
3. SMS template uses minimal content and secure link.
4. Provider adapter sends through Twilio or later SMS provider.
5. Delivery callback updates `MessageDelivery`.
6. Inbound STOP/HELP/START updates opt-out and audit state.

### Legacy Roadmap Flow

1. Coach connects or selects Google Sheet.
2. Starship stores source and explicit mapping.
3. Import job reads configured ranges only.
4. Validation checks expected shape and data types.
5. New `RoadmapSnapshot` is stored with deltas.
6. Coach reviews meaningful updates when needed.
7. Client roadmap reads Starship snapshots and events, not live Google Sheets.

### Video Library Flow

1. Coach/admin adds or syncs video metadata from Drive or a video host.
2. Resource is tagged using controlled taxonomy plus optional AI suggestions.
3. Coach approves tags that affect recommendations.
4. Client can search by title, topic, framework, roadmap stage, or transcript/chapter.
5. Coach or system recommends videos/chapters with an explicit reason.
6. Engagement states can become progress evidence only when useful.

## Implementation Phases

### Phase 0: Project Scaffold and Guardrails

Build:

- Web app scaffold.
- Database migrations.
- Auth shell.
- Organization/user/membership/client profile.
- Authorization helper and route middleware.
- Audit event writer.
- Synthetic seed data.

Acceptance criteria:

- Local app starts from README instructions.
- Seeded coach and client can log in or be simulated through dev auth.
- Client cannot access another client's records through URL/API ID changes.
- Sensitive route tests cover at least client, coach, assistant, and unauthorized cases.
- No source context files are modified.

### Phase 1: Core Coaching Workspace

Build:

- Client home.
- Coach roster and attention queue.
- Assignment creation.
- Journal draft/submit/review.
- Completion events.
- In-app notifications.
- Basic notification preferences.

Acceptance criteria:

- Coach can assign a prompt with due date.
- Client can draft privately, submit, and see status.
- Coach receives an attention item on submission.
- Journal body is not present in notification payloads or audit logs.
- Assignment status uses state transitions, not a single boolean.

### Phase 2: Weekly Check-In and Action Items

Build:

- Weekly check-in form.
- Scheduler/reminder state.
- Manual action item creation.
- Client action item list and completion.
- Coach alert on completion.

Acceptance criteria:

- Client can submit questions and focus area before a call.
- Coach sees submitted check-in in call prep context.
- Reminder logic respects timezone and quiet hours.
- Action item completion creates event and coach alert.

### Phase 3: Privacy Center, Consent, Export, Retention

Build:

- Consent records and settings UI.
- SMS consent model even if SMS sending is not live yet.
- Data export job.
- Deletion/anonymization workflow.
- Retention job skeleton.

Acceptance criteria:

- AI/transcript/SMS/Google/Fathom processing checks consent before running.
- Client can view consent history.
- Export produces client-readable data without internal coach-only notes unless policy allows.
- Deletion job removes or anonymizes expected records and logs metadata-only completion.

### Phase 4: Roadmap and Metrics

Build:

- Roadmap dimensions/items.
- Manual roadmap snapshots/events.
- Metric definitions with current/desired/gap/evidence.
- Client progress view.
- Coach progress editor.

Acceptance criteria:

- Client can see current state, desired state, gap, and closed-gap evidence.
- Coach can attach evidence from journal, check-in, call insight, or action item.
- Roadmap changes are append-only events with visible rationale.
- No opaque global transformation score is required.

### Phase 5: Library and Recommendations

Build:

- Resource video catalog.
- Tags and controlled taxonomy.
- Chapters.
- Search/filter.
- Coach recommendations.
- Engagement states.

Acceptance criteria:

- Client can browse and search videos by topic/framework/roadmap stage.
- Coach can recommend a video/chapter with a reason.
- Watch history and recommendations are treated as client-sensitive.
- Video links use permission checks.

### Phase 6: Integrations and AI Review Queue

Build:

- Integration event log.
- Fathom/Zapier ingestion endpoints.
- Manual transcript import fallback.
- Structured AI extraction jobs.
- Review queue for insights, action items, roadmap update candidates, video recommendations.
- Google Sheet import mapping and roadmap snapshot sync.
- Twilio status/inbound callbacks when SMS is enabled.

Acceptance criteria:

- Webhooks validate source, store raw event, enqueue work, and return quickly.
- Duplicate events do not create duplicate calls/tasks.
- AI-generated candidates are not client-visible until reviewed.
- Approved action items can trigger privacy-preserving reminders.
- Roadmap import validates shape and stores snapshots/deltas.
- Provider failures retry with capped attempts and visible error states.

## Security Acceptance Criteria

Before any real client data:

- Authentication is not custom-built from scratch.
- Staff MFA is supported or clearly planned before production.
- Server-side authorization checks exist on every sensitive route.
- Relationship-based tests prevent horizontal access.
- Sensitive content is not stored in browser local storage.
- Secrets are excluded from Git.
- Logs scrub journal, transcript, SMS, token, and AI content.
- Private files require signed short-lived URLs.
- SMS opt-out works before production SMS.
- AI outputs cannot directly mutate roadmap state or send texts.
- Integration tokens are encrypted or stored through a secrets manager path.
- Privacy policy, terms, and consent language are drafted before real use.
- Test fixtures use synthetic data only.

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Coaching data is treated like ordinary SaaS data | Journals, transcripts, and internal-world insights are sensitive inferred personal data | Sensitive-by-default schema, authorization tests, audit logs, consent gates |
| Permission mistakes expose one client's records to another | Relationship privacy is foundational to trust | Deny-by-default authorization, server-side relationship checks, authz test suite |
| AI overreaches or mislabels inner-world material | Could create inaccurate or harmful interpretations | Candidate-only AI, evidence links, coach review, correction history |
| SMS leaks sensitive content | Lock screens and carriers are not private | Minimal SMS templates, secure links, opt-in/out, sensitivity checks |
| Zapier/Make becomes the source of truth | Business logic and lineage get scattered | Starship ingestion API and canonical data model from day one |
| Legacy Roadmap sheet shape changes | Imports can break or corrupt progress | Explicit mapping, validation, snapshots, review before publishing changes |
| Metrics become reductive or shaming | Transformation is qualitative and personal | Evidence-based current/desired/gap model, coach-defined anchors |
| Raw transcripts are retained forever | Higher privacy and legal risk | Retention policies, artifact separation, deletion jobs |
| Videos become an unsearchable folder dump | Clients cannot find the right teaching at the right moment | Controlled taxonomy, chapters, recommendation reasons |
| Production claims outrun controls | FTC/HIPAA-adjacent risk | Avoid HIPAA/security overclaims, document actual data flows, legal review before regulated use |

## Open Questions for Orchestrator

- Which frontend/backend framework should be used for the MVP?
- Should local development use SQLite first or PostgreSQL from the beginning?
- Which auth provider/library is acceptable for Bri's deployment target?
- Will the first version support real SMS, or only model the consent and notification records?
- Is the Legacy Roadmap one workbook per client, one shared workbook, or a copied template?
- Should clients be able to delete submitted journal entries unilaterally, or request deletion?
- Are coach notes ever client-visible?
- Which video source is first: Google Drive, hosted video platform, or manually entered links?
- Does Fathom access come through direct API, Zapier/Make, export files, or all of the above?
- Is Starship explicitly adults-only in MVP terms?

## Build-Ready Priority Order

1. Scaffold app, auth, database, seed data, and authorization.
2. Implement organizations, users, memberships, clients, and coach-client relationships.
3. Implement audit log and consent records before sensitive feature work.
4. Build assignments, journal entries, completion events, and coach attention queue.
5. Build weekly check-ins, manual action items, and notification events.
6. Build roadmap/metric model with evidence.
7. Build video/resource library with taxonomy and recommendations.
8. Add integration event log and manual import paths.
9. Add Fathom/Zapier endpoints, AI candidate extraction, and review queue.
10. Add SMS delivery, Google Sheet sync, and deeper automation only after consent and review flows are stable.
