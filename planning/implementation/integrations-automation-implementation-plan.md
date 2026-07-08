# Starship Integrations And Automation Implementation Plan

Planning Agent 3 output. Created 2026-07-08.

## Purpose

This plan turns the requirements transcript and research briefs into a concrete implementation path for Starship's integration and automation layer.

The MVP should be local-first, mockable, and product-shaped before it depends on live third-party systems. Starship's own database and domain events must become the source of truth. Fathom, Google Sheets, Google Drive, Google Calendar, Twilio, Zapier, and Make are source/delivery providers, not the product brain.

## Source Inputs

- `planning/requirements-transcript.md`
- `planning/research/integrations-automation-best-practices.md`
- `planning/research/ai-insights-metrics-library-best-practices.md`
- `planning/research/data-privacy-security-best-practices.md`
- `planning/research/product-ux-best-practices.md`

## Design Principles

1. **Mock first, provider second.** Every integration must run against local fixtures before real credentials exist.
2. **Store raw before normalizing.** Raw provider payloads, source hashes, and received timestamps must be preserved for replay and audit.
3. **Return webhooks quickly.** Webhook endpoints validate, persist, enqueue, and return. Long work runs in background jobs.
4. **Review before client impact.** AI-derived action items, roadmap updates, internal-world insights, and SMS content require coach review in the MVP.
5. **Consent-aware delivery.** SMS, transcript processing, AI extraction, and Google/Fathom imports must check consent records before processing or notifying.
6. **Secure links over sensitive SMS.** Text messages should contain short nudges and app links, not private journal content, transcript excerpts, or sensitive insight labels.
7. **Version all contracts.** Provider payloads and internal integration contracts must be versioned so automation mappings can evolve safely.

## Proposed Application Modules

Assume the web MVP uses a server-side app with a local database, background worker, and scheduled jobs. Exact framework can be chosen by the implementation team, but the module boundaries should remain stable.

### `src/integrations/core`

Shared integration primitives.

- `IntegrationProvider`: enum for `mock`, `fathom`, `google_sheets`, `google_drive`, `google_calendar`, `twilio`, `zapier`, `make`.
- `IntegrationConnection`: organization/client/provider connection metadata, mode, status, scopes, token reference, last sync state.
- `RawIntegrationEvent`: append-only record of inbound provider events and manual/mock imports.
- `IntegrationJob`: queued normalization/sync/delivery work with attempts, backoff, status, error, and dead-letter reason.
- `ExternalIdentityMap`: maps provider object IDs to Starship domain object IDs.
- `WebhookVerifier`: shared signature/token verification utilities.
- `IdempotencyService`: deduplicates by provider event ID, source object ID, content hash, and idempotency key.

### `src/integrations/mock`

Local-first provider simulation.

- Fixture loader for Fathom transcript payloads, action items, summaries, Google Sheet exports, Calendar events, Drive files, and Twilio callbacks.
- Admin/test endpoints to replay fixtures into the same ingestion paths used by production providers.
- Mock delivery adapter that records outbound SMS/email/in-app messages without sending them.
- Scenario fixtures:
  - transcript with internal/external insights and action items
  - transcript without explicit action-item owners
  - Legacy Roadmap sheet import with valid rows
  - malformed roadmap sheet
  - weekly tracker reminder due
  - Twilio STOP/START inbound message

### `src/integrations/fathom`

Fathom transcript, recording, summary, and action-item ingestion.

- MVP provider path: Zapier/Make sends Fathom artifacts to Starship webhooks.
- Production path: direct Fathom API/webhook adapter if available for the account and artifact types needed.
- Supported inbound artifacts:
  - transcript
  - AI summary
  - recording link
  - action-item list
  - participant metadata
  - meeting metadata
- Normalized domain objects:
  - `CallSession`
  - `CallArtifact`
  - `TranscriptSegment`
  - `InsightCandidate`
  - `ActionItemCandidate`
  - `RoadmapUpdateCandidate`

### `src/integrations/google`

Google Sheets, Drive, and Calendar integration.

- `google/auth`: OAuth connection, token storage references, reconnect/revocation state.
- `google/sheets`: Legacy Roadmap import and snapshot sync.
- `google/drive`: video/resource library metadata sync.
- `google/calendar`: call schedule sync and pre-call workflow anchoring.
- `google/webhooks`: Drive and Calendar push-notification receiver for production mode.
- `google/mapping`: explicit configurable mapping from sheet tabs/ranges/columns to Starship roadmap concepts.

### `src/notifications`

Event-driven notification and reminder system.

- `DomainEvent`: normalized product event stream.
- `NotificationRule`: maps events to recipients, channels, cadence, and templates.
- `NotificationPreference`: per-user/channel/category quiet hours and opt-in state.
- `NotificationEvent`: generated notification before delivery.
- `MessageDelivery`: provider delivery state and callback history.
- Adapters:
  - `InAppNotificationAdapter`
  - `EmailAdapter` or mock placeholder
  - `SmsAdapter` using Twilio in production and mock in local mode

### `src/automations`

Scheduled and event-triggered workflows.

- `Scheduler`: local cron/worker clock for reminders and sync jobs.
- `ReminderPlanner`: creates due reminders for weekly trackers, pre-call forms, assignments, and action items.
- `CoachAlertPlanner`: creates coach alerts when clients complete assignments, submit check-ins, ask pre-call questions, or approve-worthy call outputs arrive.
- `AutomationRun`: audit record for each automation execution.

### `src/review`

Human-in-the-loop queues for AI and imported data.

- Candidate queue for transcript-derived action items, insights, roadmap updates, and video recommendations.
- Review actions: approve, edit, dismiss, merge, mark sensitive, request clarification.
- Approval events trigger downstream notifications and client-visible records.

## Data Model Additions

The implementation team should create migrations for these records. Names can adjust to framework style, but the concepts should stay separate.

### Integration Tables

- `integration_connections`
  - `id`, `organization_id`, `client_id`, `provider`, `mode`, `status`, `scopes`, `token_ref`, `external_account_id`, `last_sync_at`, `sync_cursor`, `created_at`, `updated_at`
- `raw_integration_events`
  - `id`, `organization_id`, `client_id`, `provider`, `event_type`, `external_event_id`, `external_object_id`, `payload_json`, `payload_hash`, `headers_json`, `received_at`, `status`, `error_message`
- `integration_jobs`
  - `id`, `raw_event_id`, `job_type`, `status`, `attempt_count`, `run_after`, `locked_at`, `completed_at`, `error_message`, `dead_lettered_at`
- `external_identity_maps`
  - `id`, `provider`, `external_object_type`, `external_object_id`, `starship_object_type`, `starship_object_id`, `organization_id`, `client_id`

### Call/Fathom Tables

- `call_sessions`
  - `id`, `client_id`, `coach_id`, `calendar_event_id`, `provider`, `external_meeting_id`, `title`, `scheduled_start`, `scheduled_end`, `actual_start`, `actual_end`, `status`
- `call_artifacts`
  - `id`, `call_session_id`, `artifact_type`, `source_url`, `storage_ref`, `source_hash`, `source_status`, `retention_state`, `created_at`
- `transcript_segments`
  - `id`, `call_artifact_id`, `speaker_label`, `speaker_user_id`, `start_seconds`, `end_seconds`, `text`, `topic_label`
- `action_item_candidates`
  - `id`, `call_session_id`, `client_id`, `owner_type`, `owner_user_id`, `task_title`, `task_description`, `due_date`, `due_date_basis`, `evidence_ref`, `confidence`, `review_status`, `client_message_draft`
- `insight_candidates`
  - `id`, `call_session_id`, `client_id`, `insight_type`, `title`, `summary`, `evidence_ref`, `sensitivity`, `client_visibility`, `confidence`, `review_status`
- `roadmap_update_candidates`
  - `id`, `call_session_id`, `client_id`, `roadmap_dimension_id`, `current_state_before`, `current_state_after`, `evidence`, `change_type`, `confidence`, `review_status`

### Google/Roadmap Tables

- `roadmap_import_configs`
  - `id`, `client_id`, `connection_id`, `spreadsheet_id`, `spreadsheet_name`, `mapping_json`, `status`, `last_import_at`
- `roadmap_snapshots`
  - `id`, `client_id`, `import_config_id`, `source_hash`, `snapshot_json`, `imported_at`, `validated_at`, `validation_status`
- `roadmap_snapshot_deltas`
  - `id`, `from_snapshot_id`, `to_snapshot_id`, `change_type`, `dimension`, `before_json`, `after_json`, `created_at`
- `resource_library_sources`
  - `id`, `organization_id`, `connection_id`, `drive_folder_id`, `source_type`, `status`, `last_sync_at`
- `resource_items`
  - `id`, `organization_id`, `source_id`, `external_file_id`, `title`, `description`, `url`, `thumbnail_url`, `duration_seconds`, `topic_tags`, `visibility`, `updated_at`

### Notification Tables

- `consent_records`
  - `id`, `user_id`, `client_id`, `consent_type`, `status`, `source`, `granted_at`, `revoked_at`, `metadata_json`
- `contact_points`
  - `id`, `user_id`, `type`, `value_encrypted`, `verified_at`, `status`
- `notification_preferences`
  - `id`, `user_id`, `category`, `channel`, `enabled`, `quiet_hours_start`, `quiet_hours_end`, `timezone`, `cadence`
- `domain_events`
  - `id`, `organization_id`, `client_id`, `event_type`, `actor_user_id`, `object_type`, `object_id`, `payload_json`, `created_at`
- `notification_events`
  - `id`, `domain_event_id`, `recipient_user_id`, `category`, `channel`, `template_key`, `template_version`, `status`, `scheduled_for`, `sent_at`
- `message_deliveries`
  - `id`, `notification_event_id`, `provider`, `provider_message_id`, `status`, `error_code`, `status_payload_json`, `attempt_count`, `created_at`, `updated_at`

## API And Webhook Routes

All routes should validate tenant/client mapping, authenticate provider/source, persist raw events, enqueue jobs, and return quickly.

### Mock/Admin Routes

- `POST /api/mock/integrations/replay`
  - Body: `{ "fixture": "fathom/transcript-basic", "clientId": "...", "coachId": "..." }`
  - Creates a raw event using the selected fixture.
- `GET /api/mock/deliveries`
  - Lists SMS/email/in-app messages that would have been sent.

### Fathom/Zapier/Make Routes

- `POST /api/integrations/fathom/v1/transcript`
- `POST /api/integrations/fathom/v1/summary`
- `POST /api/integrations/fathom/v1/action-items`
- `POST /api/integrations/fathom/v1/recording`

MVP verification can use a shared webhook secret header from Zapier/Make. Production should use provider signatures if available.

### Google Routes

- `GET /api/integrations/google/oauth/start`
- `GET /api/integrations/google/oauth/callback`
- `POST /api/integrations/google/v1/sheets/import`
- `POST /api/integrations/google/v1/drive-notification`
- `POST /api/integrations/google/v1/calendar-notification`
- `POST /api/integrations/google/v1/reconnect`
- `POST /api/integrations/google/v1/revoke`

### Twilio Routes

- `POST /api/integrations/twilio/v1/status-callback`
- `POST /api/integrations/twilio/v1/inbound-message`

Inbound message route must handle STOP/START/HELP and update consent/contact status before any other processing.

### Internal Automation Routes

If the framework uses HTTP-triggered jobs locally:

- `POST /api/jobs/run-due`
- `POST /api/jobs/retry-dead-letter`
- `POST /api/automations/weekly-tracker/schedule`

These must be protected by internal job credentials in production.

## Environment Variables

Use local `.env` values for mock mode only. Do not commit real secrets.

### Core

- `APP_ENV=local|test|staging|production`
- `APP_BASE_URL`
- `DATABASE_URL`
- `ENCRYPTION_KEY_REF`
- `INTEGRATION_MODE=mock|hybrid|production`
- `JOB_WORKER_MODE=inline|worker`
- `INTERNAL_JOB_SECRET`
- `WEBHOOK_BASE_URL`

### Fathom/Zapier/Make

- `FATHOM_PROVIDER_MODE=mock|zapier|make|direct`
- `FATHOM_WEBHOOK_SECRET`
- `FATHOM_API_BASE_URL`
- `FATHOM_API_KEY_REF`
- `ZAPIER_WEBHOOK_SECRET`
- `MAKE_WEBHOOK_SECRET`

### Google

- `GOOGLE_PROVIDER_MODE=mock|production`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET_REF`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_SCOPES`
- `GOOGLE_WEBHOOK_CHANNEL_SECRET`
- `GOOGLE_DRIVE_WATCH_ENABLED=false|true`
- `GOOGLE_CALENDAR_WATCH_ENABLED=false|true`
- `GOOGLE_SYNC_INTERVAL_MINUTES`

### Twilio/SMS

- `SMS_PROVIDER_MODE=mock|twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN_REF`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_STATUS_CALLBACK_URL`
- `TWILIO_INBOUND_WEBHOOK_SECRET`
- `SMS_DEFAULT_COUNTRY=US`
- `SMS_QUIET_HOURS_DEFAULT_START`
- `SMS_QUIET_HOURS_DEFAULT_END`

### AI Extraction Hook

Planning Agent 3 is not designing the full AI system, but integrations must expose clean handoff points.

- `AI_EXTRACTION_MODE=mock|disabled|production`
- `AI_EXTRACTION_QUEUE_ENABLED=false|true`
- `AI_PROVIDER_API_KEY_REF`
- `AI_MODEL_TRANSCRIPT_EXTRACTION`

## Implementation Phases

### Phase 0: Local Integration Skeleton

Goal: create the durable integration backbone before real providers are connected.

Build:

- Integration tables and domain event tables.
- Raw event store and idempotency service.
- Job queue abstraction with inline local execution.
- Mock fixture loader.
- Mock delivery adapter.
- Basic admin/debug screens for raw events, jobs, and mock deliveries.

Acceptance criteria:

- A fixture can be replayed into `raw_integration_events`.
- Duplicate fixture replay does not create duplicate domain records.
- A job failure is recorded and can be retried.
- Mock SMS messages are visible in the local app without contacting Twilio.

### Phase 1: Fathom Ingestion In Mock Mode

Goal: make transcript/action-item ingestion work end-to-end with fixtures.

Build:

- Fathom webhook route set.
- Fathom payload normalization into `CallSession` and `CallArtifact`.
- Transcript segmentation from fixture timestamps/speakers.
- Action-item candidate import from fixture payloads.
- Handoff job to AI extraction mock, returning insight/action/roadmap candidates.
- Review queue records for candidates.

Flow:

1. Replay a Fathom transcript fixture.
2. Store raw event.
3. Normalize meeting and transcript records.
4. Generate mock candidates.
5. Show candidates in coach review queue.
6. Approving an action item creates a real `ActionItem`.
7. Approved action item emits `action_item.approved`.

Acceptance criteria:

- Transcript payloads are stored raw and normalized.
- Action items are candidates until coach approval.
- Evidence references point back to transcript segment IDs or timestamps.
- Client-facing notification is not generated before approval.
- The system handles unknown owner or missing due date by marking review required.

### Phase 2: Notification And SMS Automation

Goal: centralize reminders, coach alerts, and SMS delivery behind consent-aware rules.

Build:

- Domain event emitter for:
  - `assignment.completed`
  - `weekly_tracker.due`
  - `weekly_tracker.submitted`
  - `pre_call_input.missing`
  - `pre_call_input.submitted`
  - `action_item.approved`
  - `action_item.due_soon`
  - `call.candidates_ready`
  - `roadmap.snapshot_imported`
- Notification rule engine.
- Consent checks for SMS.
- Quiet-hours and timezone scheduling.
- Mock SMS adapter.
- Twilio adapter behind `SMS_PROVIDER_MODE`.
- Twilio status callback ingestion.
- Twilio inbound STOP/START/HELP handling.

SMS content rules:

- Allowed: "Your weekly tracker is ready", "You have an action item due today", "Open Starship to review your next step".
- Avoid: journal text, transcript excerpts, internal-world labels, sensitive insight summaries, roadmap diagnoses.
- Include opt-out language where required.

Coach alert rules:

- In-app alert for assignment completion.
- In-app and optional email/SMS for weekly tracker submission.
- In-app alert when call candidates are ready for review.
- Digest option for lower-priority events.

Acceptance criteria:

- SMS is not generated without active consent and verified phone contact.
- Quiet hours delay messages instead of sending immediately.
- STOP updates consent and blocks future SMS.
- START restores SMS only after the expected confirmation path.
- Coach receives completion alerts with metadata but not private journal content.
- Failed deliveries are captured and visible for retry/review.

### Phase 3: Legacy Roadmap Google Sheets Import

Goal: import roadmap workbook data into Starship snapshots without making Sheets the runtime source of truth.

Build:

- Mock CSV/JSON sheet import first.
- `roadmap_import_configs` with explicit tab/range/column mapping.
- Validation layer for required tabs, columns, and value types.
- Snapshot creation and delta calculation.
- Manual "import now" action.
- Scheduled sync job.
- Production Google OAuth connection.
- Production Sheets read adapter.

MVP mapping strategy:

- Start with config-driven mappings checked into app seed/config data for the known workbook shape.
- Add an admin mapping editor later if the workbook varies across clients.

Flow:

1. Coach selects or configures a Legacy Roadmap source.
2. Starship imports configured ranges.
3. Validation errors are shown before client-facing updates.
4. Valid import creates a new snapshot.
5. Delta job compares latest snapshot to prior snapshot.
6. Progress UI reads from `roadmap_snapshots` and `roadmap_snapshot_deltas`.

Acceptance criteria:

- A valid fixture creates a roadmap snapshot.
- A malformed fixture fails validation and does not update client-facing progress.
- Import is idempotent when the source hash is unchanged.
- Snapshot deltas show what changed between imports.
- Client UI can render progress without reading live Google Sheets.

### Phase 4: Calendar And Pre-Call Workflows

Goal: anchor weekly trackers and pre-call reminders to real scheduled calls where possible.

Build:

- `CallSession` creation from mock calendar fixtures.
- Calendar event-to-client matching rules.
- Ambiguous match review queue.
- Pre-call input schedule generator.
- Reminder timing rules, for example:
  - create weekly tracker 72 hours before call
  - first reminder 48 hours before call
  - second reminder 24 hours before call
  - coach alert if not submitted 4 hours before call
- Production Google Calendar adapter and incremental sync.
- Calendar webhook receiver for production mode.

Matching rules:

- Prefer explicit Starship calendar event link.
- Then match by client email in event attendees.
- Then match by coach-selected client on call import.
- If multiple matches exist, require review.

Acceptance criteria:

- Upcoming call fixture creates a `CallSession`.
- Pre-call input is created for the client.
- Reminders respect timezone and quiet hours.
- Submitted pre-call input cancels "missing" reminders.
- Ambiguous calendar events do not trigger client reminders until resolved.

### Phase 5: Google Drive Resource Library Sync

Goal: index framework/cosmology videos and resources without exposing raw Drive folder sprawl.

Build:

- Mock Drive folder fixture with videos, descriptions, tags, thumbnails.
- `resource_library_sources` and `resource_items`.
- Drive metadata sync adapter.
- Topic tag normalization.
- Manual resync.
- Later: production Drive watch notifications.

Acceptance criteria:

- Resource fixture imports videos as searchable `resource_items`.
- Existing resource items update by stable Drive file ID.
- Deleted/unshared files are hidden rather than broken.
- Client sees curated metadata, not the raw Drive folder structure.

### Phase 6: Production Provider Activation

Goal: replace mock adapters one at a time without changing core product behavior.

Activation order:

1. Twilio SMS in staging with internal test numbers.
2. Google Sheets import for one test Legacy Roadmap workbook.
3. Google Calendar sync for one coach account.
4. Google Drive resource sync for one curated folder.
5. Fathom via Zapier/Make webhook.
6. Direct Fathom adapter only if required artifacts are available and stable.

Production gates:

- Secrets stored outside Git.
- Provider callback URLs use HTTPS.
- Consent and opt-out flows verified.
- At least one recorded fixture for each provider payload type.
- Dead-letter queue visible.
- Admin can disable each connection.
- Privacy policy/notice covers connected providers.

## MVP Mock Mode Versus Production Integrations

### Mock Mode

Mock mode must be fully useful for demos and development.

- Uses local fixtures and mock adapters.
- Sends no external SMS.
- Reads no live Google or Fathom data.
- Allows replay of expected and broken provider events.
- Supports implementation audit/revise loops without credentials.

### Hybrid Mode

Hybrid mode supports one live provider at a time.

- Example: real Twilio with mock Fathom and Google.
- Useful for staged rollout and isolating provider failures.
- All provider choices must be controlled by environment variables and connection settings.

### Production Mode

Production mode uses real providers with verification, consent, and audit logging.

- Real Fathom access may begin through Zapier/Make.
- Real Google access uses OAuth and least-privilege scopes.
- Real Twilio requires compliant sending setup, opt-out handling, and delivery callbacks.
- All production provider failures must degrade gracefully into reviewable errors.

## Testing Strategy

### Unit Tests

- Webhook verifier accepts valid signatures/tokens and rejects invalid ones.
- Idempotency service deduplicates by event ID and source hash.
- Fathom normalizer maps payloads into call artifacts and segments.
- Roadmap validator accepts valid mappings and rejects malformed ones.
- Notification rule engine selects correct recipients/channels.
- Quiet-hours scheduler computes correct send time across timezones.
- SMS content sanitizer blocks sensitive categories.

### Integration Tests

- Replay Fathom transcript fixture -> candidates appear in review queue.
- Approve action-item candidate -> action item created -> notification event scheduled.
- Weekly tracker due -> reminder generated -> mock SMS delivery recorded.
- STOP inbound fixture -> consent revoked -> future SMS skipped.
- Google Sheet fixture import -> snapshot and delta created.
- Calendar fixture -> pre-call input and reminders created.
- Twilio status callback fixture -> message delivery status updated.

### End-To-End Local Tests

- Coach creates/receives completion alert after client completes an assignment.
- Coach imports a mock call transcript, reviews action items, and client receives mock SMS.
- Coach imports a Legacy Roadmap fixture and client sees progress update.
- Calendar call fixture creates a weekly tracker reminder.
- Drive resource fixture populates the video library.

### Fixture And Contract Tests

- Keep provider payload examples under a test fixtures directory.
- Every provider adapter must have at least one happy-path, duplicate, malformed, and missing-field fixture.
- Zapier/Make mapping changes require fixture updates.
- Version webhook route contracts and keep old fixtures until retired.

### Security And Privacy Tests

- Client A cannot access Client B integration artifacts, messages, or snapshots.
- Coach only sees clients assigned through the relationship model.
- SMS does not include sensitive body text.
- Raw transcript access is protected server-side.
- Webhook routes do not accept unsigned/untrusted production payloads.
- Secrets are not present in repo files.

## Acceptance Criteria By Requirement

### Fathom Transcript/Recording Ingestion

- Starship can ingest mock Fathom transcript, summary, action-item, and recording payloads.
- Raw artifacts are preserved separately from derived insights and tasks.
- Duplicate payloads do not create duplicate calls or tasks.
- Extracted candidates stay in review until approved.
- Approved records preserve evidence links to call artifacts.

### Google Sheets / Legacy Roadmap Import

- Starship can import a Legacy Roadmap fixture into a validated snapshot.
- Starship can compute deltas between snapshots.
- Invalid workbook shapes are rejected with actionable errors.
- Client-facing progress is powered by Starship snapshots, not live Sheets reads.
- Production design supports OAuth, least-privilege scopes, and reconnect/revoke.

### SMS Action-Item Delivery And Reminders

- Clients can only receive SMS after explicit consent.
- SMS messages are generated from approved action items or reminder events.
- Messages avoid sensitive private content and link back to the app.
- STOP/START/HELP flows are handled.
- Delivery callbacks update Starship delivery records.

### Coach Alerts

- Coach is alerted when a client completes an assignment.
- Coach is alerted when weekly tracker/pre-call input is submitted.
- Coach is alerted when call-derived candidates are ready for review.
- Alerts include status and links, not sensitive journal content in external channels.
- Lower-priority alerts can be batched or digested.

### Calendar / Pre-Call Workflows

- Upcoming calls generate pre-call inputs and weekly tracker reminders.
- Reminders are tied to scheduled calls when calendar data exists.
- Ambiguous client matching requires review.
- Reminder state changes when the client submits the form.

### Webhook/API Abstractions

- Every external event is captured as a raw integration event.
- Processing is asynchronous, idempotent, retryable, and auditable.
- Provider adapters can be swapped between mock, Zapier/Make, and production modes.
- Webhook contracts are versioned.

## Risks And Mitigations

### Fathom API Availability

Risk: Direct Fathom API access may not expose all required artifacts.

Mitigation: Build provider-agnostic ingestion routes and start with Zapier/Make or manual export fixtures. Treat direct Fathom as an adapter, not a dependency.

### Sensitive Data In Automation Platforms

Risk: Zapier/Make may process private transcript or action-item content.

Mitigation: Use them only for MVP validation, document mappings, minimize payloads, and move sensitive/high-volume workflows into Starship code as soon as schemas stabilize.

### SMS Compliance And Privacy

Risk: Texting clients action items can expose sensitive content and create compliance issues.

Mitigation: Require opt-in, support opt-out, keep SMS generic, use secure app links, and complete production messaging registration before real client launch.

### Workbook Shape Drift

Risk: Legacy Roadmap sheet tabs, columns, or formulas may change.

Mitigation: Use explicit mappings, validation, snapshots, and admin-visible import errors. Do not update client progress from malformed imports.

### Calendar Matching Errors

Risk: Calendar attendees may not map cleanly to Starship clients.

Mitigation: Use explicit linking where possible, require review for ambiguous matches, and do not send reminders until a call-client relationship is confirmed.

### Notification Fatigue

Risk: Too many reminders or alerts could make accountability feel intrusive.

Mitigation: Centralize notification rules, add digesting, respect quiet hours, and route only meaningful state transitions.

### AI Overreach

Risk: AI-generated tasks, insights, or roadmap updates could be wrong or too sensitive.

Mitigation: Keep AI outputs as candidates, require coach review, preserve evidence, and block automated client delivery until approval.

### Provider Failure

Risk: Google, Twilio, Zapier, Make, or Fathom may be unavailable or rate-limited.

Mitigation: Use retries with backoff, dead-letter queues, integration health views, and manual replay/import fallbacks.

## Implementation Audit/Revise Loop

The orchestrator should run this loop for each phase:

1. Implement the smallest vertical slice.
2. Run unit and integration tests.
3. Replay mock fixtures through the local UI/API.
4. Inspect raw events, jobs, domain records, notifications, and audit logs.
5. Fix duplicate handling, missing authorization, privacy leakage, and failed states.
6. Add or update fixtures for every bug found.
7. Mark the phase complete only when acceptance criteria pass locally.

## First Build Slice Recommendation

Start with one complete local path:

1. Replay mock Fathom transcript.
2. Create call artifact and transcript segments.
3. Generate mock action-item candidate.
4. Coach approves candidate.
5. Approved action item emits domain event.
6. Notification service creates mock SMS, respecting consent.
7. Mock delivery appears in a local delivery log.

This slice proves the most important architecture: ingestion, normalization, review, eventing, consent, notification, and auditability.
