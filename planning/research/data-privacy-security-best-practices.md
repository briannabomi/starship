# Starship Research: Data Model, Privacy, Security, and Compliance Best Practices

Research Agent 3  
Date: 2026-07-08  
Input: `planning/requirements-transcript.md`

## Executive Summary

Starship will handle unusually sensitive coaching data: private journal entries, pre-call reflections, meeting transcripts, AI-derived insights, action items, SMS reminders, Legacy Roadmap progress, and potentially video recordings or links. Even if the service is not medical care and should not be positioned as medical, therapy, or HIPAA-covered treatment, the product should be designed with a "sensitive personal data by default" posture.

The recommended MVP architecture is a secure, tenant-aware web app with strong role-based and relationship-based access controls, encrypted storage, minimal SMS content, explicit client consent for recording/transcript/AI processing, auditable data access, and clear retention/deletion workflows. The system should store source artifacts and AI-derived outputs separately so consent, provenance, correction, deletion, and model-processing boundaries remain manageable.

## Key Sources Reviewed

- [NIST Privacy Framework](https://www.nist.gov/privacy-framework): voluntary framework for identifying and managing privacy risk in products and services.
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework): voluntary framework for trustworthy AI design, development, use, and evaluation.
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/): open standard for secure web application controls and verification.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): least privilege, deny-by-default, per-request authorization, and ABAC/ReBAC guidance.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): application security logging, audit trails, and data exclusion guidance.
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/): AI-specific risks such as prompt injection, sensitive information disclosure, insecure output handling, and excessive agency.
- [FTC Mobile Health App Interactive Tool](https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool): useful boundary guidance for apps that may collect health or wellness-adjacent data, even when not medical devices.
- [HHS HIPAA Covered Entities and Business Associates](https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html): official HIPAA scope reference.
- [Fathom Privacy Policy](https://www.fathom.ai/privacy): confirms meeting content can include recordings, transcripts, notes, attendee data, and AI training/use settings that must be understood before integration.
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy): minimum scopes, clear disclosure, limited use, secure handling, and human-access restrictions for Google user data.
- [Twilio Security Docs](https://www.twilio.com/docs/usage/security): HTTPS/TLS, webhook validation, media access protection, and credential handling for SMS/webhook integrations.

## Data Sensitivity Classification

Treat the following as high-sensitivity client data:

- Journal entries and assignment responses.
- Pre-call questions and weekly tracker inputs.
- Call transcripts, recordings, clips, notes, speaker labels, attendee identities, and summaries.
- AI-derived insights about the client's internal world, thought models, goals, gaps, or behavior.
- Legacy Roadmap workbook data and progress metrics.
- Coach notes and admin notes.
- SMS message content, phone numbers, delivery status, and opt-in/opt-out history.

Treat the following as system-sensitive data:

- OAuth tokens for Fathom, Google, Zoom, or calendar/sheet integrations.
- SMS provider credentials and webhook secrets.
- AI provider API keys.
- Audit logs and access logs.
- Data export files and backups.

Recommendation: classify every table, object store bucket, and integration payload by sensitivity before implementation. This keeps the MVP from quietly mixing private journal content, operational logs, and low-risk metadata in the same places.

## Recommended Domain Data Model

Use a tenant-aware model even if MVP starts with one coach. Coaching businesses often expand to assistants, guest practitioners, clients, cohorts, and contractors.

Core entities:

- `Organization`: the coaching business or workspace.
- `User`: login identity.
- `ClientProfile`: client-specific profile, linked to one or more users if needed.
- `Membership`: relationship between user and organization, with role and status.
- `ClientCoachRelationship`: explicit relationship granting a coach access to a specific client.
- `ConsentRecord`: recording consent, SMS consent, AI-processing consent, Google/Fathom import consent, privacy policy acceptance, terms acceptance.
- `Assignment`: prompt, due date, creator, client, status, visibility.
- `JournalEntry`: assignment response or free-form reflection; versioned or append-only edits are preferred for trust.
- `CompletionEvent`: when a client marks an assignment complete, with actor, timestamp, notification state.
- `PreCallInput`: questions, focus areas, weekly tracker responses, due date, linked call/session.
- `CallSession`: date, participants, source meeting identifiers, status.
- `CallArtifact`: transcript, recording link, imported notes, Fathom source metadata, storage pointer, retention state.
- `Insight`: AI or human-created insight, with type such as internal-world, external-world, thought-model, roadmap-update.
- `ActionItem`: task extracted from call or assigned manually; owner, due date, source, delivery status.
- `MetricDefinition`: metric name, scale, calculation method, source.
- `MetricSnapshot`: client's current state, target state, gap state, timestamp, provenance.
- `LegacyRoadmapItem`: workbook row/module/objective imported from Google Sheets or future app.
- `ResourceVideo`: framework/cosmology video metadata, topic tags, permissions, source URL or storage pointer.
- `Notification`: email/SMS/in-app event with content category and delivery state.
- `AuditEvent`: security and privacy event trail.

Important modeling choices:

- Separate raw source artifacts from derived outputs. Store `CallArtifact` separately from `Insight` and `ActionItem`, with provenance links.
- Store SMS content separately from tasks. The action item can contain the meaningful instruction; the SMS should usually contain a short reminder and secure deep link.
- Model consent as a first-class object, not a boolean on the user.
- Store external IDs from Fathom/Google/Twilio in dedicated integration tables, not scattered across domain tables.
- Use soft deletion for short operational recovery windows, then hard deletion or cryptographic erasure according to retention policy.
- Add `created_by`, `updated_by`, `source_type`, `source_id`, `visibility`, `retention_policy`, and `deleted_at` fields to sensitive records.

## Access Control Best Practices

Use a combination of role-based access control and relationship-based checks.

Recommended roles:

- `owner`: manages organization, billing, integrations, retention defaults, staff.
- `coach`: sees assigned clients and their coaching data.
- `assistant`: limited operational role, configurable access to scheduling and completion status.
- `client`: sees only their own assignments, entries, resources, roadmap, tasks, and consent settings.
- `auditor/admin`: read-only security/compliance access if needed later.

Required access rules:

- Deny by default.
- Check authorization on every request, including API routes, background jobs, exports, and file downloads.
- Use relationship checks, not role checks alone. A coach role should not automatically see every client unless explicitly assigned.
- Prevent horizontal access: client A must never be able to infer or access client B's records by changing IDs in URLs or API calls.
- Store object permissions server-side. Do not rely on client-side filtering.
- Use short-lived signed URLs for recordings, exports, and file downloads.
- Review staff access periodically to prevent privilege creep.

Requirement mapping:

- Journals, assignments, pre-call inputs: client and assigned coach only.
- Fathom recordings/transcripts: only users with explicit call/session access and required consent.
- Legacy Roadmap workbook: client-specific slices only unless owner/coach has explicit access.
- Video library: generally lower sensitivity, but watch history and personalized recommendations are client data.
- Completion alerts: coaches receive status/event metadata; avoid sending journal content in alerts.

## Authentication and Account Security

MVP recommendations:

- Use a mature identity provider or framework rather than building authentication from scratch.
- Require email verification.
- Support MFA for owners, coaches, and assistants before production use.
- Use secure, HTTP-only cookies for browser sessions.
- Enforce strong password hashing if passwords are stored directly.
- Rate-limit login, password reset, magic link, SMS opt-in, and invitation endpoints.
- Use invitation-based onboarding for clients to reduce account confusion.
- Log authentication successes/failures and privilege changes.

Do not put sensitive data in URLs, query strings, browser local storage, or analytics events.

## Consent, Notice, and Client Trust

Consent should be granular and auditable. Recommended consent records:

- Recording/transcription consent for calls.
- AI processing consent for transcripts, journal entries, and roadmap data.
- SMS consent for reminders/action item nudges, including opt-out instructions.
- Google Sheets import consent if the client or coach connects a workbook.
- Fathom import consent and notice that meeting content may include other participants.
- Privacy policy and terms acceptance.

Consent screens should say:

- What data is collected.
- Why it is collected.
- Who can see it.
- Which third-party processors receive it.
- Whether AI is used.
- Whether outputs are human-reviewed.
- How to withdraw consent.
- What happens to already-created derived insights if consent is withdrawn.

Recording-specific note: Fathom's own policy warns that some jurisdictions require all-party consent for audio/video recording. Starship should not silently import or process meeting content unless the business has verified recording consent. The app should record consent metadata for each call or require the coach to attest that consent was obtained.

## Privacy and Compliance Posture

### HIPAA-Adjacent But Do Not Assume HIPAA

The requirements sound like coaching, journaling, accountability, thought models, and legacy planning. Do not position Starship as diagnosis, therapy, medical treatment, mitigation, cure, prevention, or clinical decision support unless legal counsel designs that posture.

HIPAA usually applies to covered entities and business associates, not every app with sensitive personal reflections. However, HIPAA can become relevant if Starship serves a covered healthcare provider or handles protected health information on behalf of one. HHS's covered entity/business associate guidance should be used during customer qualification.

Practical recommendation:

- Add an onboarding question for the organization: "Will this workspace be used by a HIPAA covered entity or to provide medical, mental-health, or clinical services?"
- For MVP, explicitly prohibit regulated medical use in terms unless the architecture, vendors, contracts, and BAAs are upgraded.
- If future HIPAA support is desired, choose vendors that sign BAAs, isolate HIPAA workspaces, disable non-compliant processors, and conduct a formal HIPAA risk analysis.

### FTC / Consumer Protection

The FTC is relevant even when HIPAA is not. Privacy promises must match actual data flows. Avoid overclaiming "secure", "private", "anonymous", "HIPAA compliant", or "AI does not learn from you" unless each claim is documented and verified.

Recommended baseline:

- Publish a clear privacy policy before real client data is entered.
- Maintain a data inventory and vendor list.
- Avoid secondary use of client content for marketing, model training, or product analytics without explicit consent.
- Provide access, correction, deletion, and export workflows.

### Children and Minors

Do not support minors in MVP unless the business intentionally designs COPPA/minor consent workflows. Use an 18+ requirement by default.

## AI Processing Boundaries

Starship's AI use cases are high value but high sensitivity:

- Summarize Fathom recordings.
- Extract internal-world and external-world insights.
- Extract action items.
- Map insights to thought models and Legacy Roadmap updates.
- Recommend videos by topic.
- Generate progress narratives.

Best practices:

- Use AI as assistive, not authoritative. Label AI-generated insights and let coaches review before client-facing use.
- Store prompt, model, version, source artifact IDs, and output confidence where feasible.
- Keep raw journal entries and transcripts out of general analytics pipelines.
- Prefer providers/settings that do not train on customer data by default.
- Do not send more source text than needed. Use scoped excerpts when possible.
- Redact or minimize unnecessary personal data before AI processing when the task allows it.
- Protect against prompt injection from transcripts, journal content, workbook cells, or video metadata.
- Treat AI output as untrusted until validated; do not let it directly update roadmap states, send SMS, or notify clients without policy checks.
- Add a human review queue for extracted action items before first production launch, especially before SMS delivery.
- Allow clients/coaches to correct AI-derived insights and keep correction history.

AI anti-patterns:

- Sending every journal entry and transcript to an AI vendor by default.
- Using client content for model training without explicit consent.
- Letting AI-generated action items send automatically by SMS without review.
- Hiding that AI touched a reflection, transcript, or metric.
- Collapsing raw source and generated interpretation into one field with no provenance.

## SMS Privacy and Notification Design

SMS is useful for accountability but should be treated as an insecure, high-leakage channel. Phones can be shared, locked-screen previews expose content, carriers and providers process message metadata, and message content may be retained by vendors.

Recommendations:

- Use SMS for nudges, not sensitive content.
- Default SMS copy: "You have a Starship action item due today. Open your dashboard: [secure link]".
- Do not include journal text, transcript excerpts, sensitive insights, or "internal-world" labels in SMS.
- Include opt-out handling: STOP, HELP, consent history.
- Store SMS consent, phone verification, opt-out state, and message templates.
- Validate inbound SMS/webhooks using provider signatures.
- Use HTTPS/TLS for webhooks and avoid self-signed certificates in production.
- Redact message bodies in provider logs if supported by the SMS vendor.
- Avoid logging full SMS bodies in Starship application logs.

Requirement mapping:

- "Clients are texted what they're supposed to do": implement as a privacy-preserving reminder with task title only if non-sensitive, otherwise link to authenticated app.
- Weekly tracker reminders: SMS can safely say "Your weekly tracker is ready" with a link.
- Completion alerts to coach: use in-app/email notification; avoid sending client reflection content.

## Encryption, Storage, and Secrets

Baseline MVP:

- Enforce TLS for all app traffic and webhooks.
- Encrypt databases and object storage at rest.
- Use field-level encryption or envelope encryption for the most sensitive content: journal body, transcript body, coach notes, AI insight text, phone numbers, OAuth tokens.
- Keep encryption keys in a managed key service or secrets manager, not in source code or environment files committed to Git.
- Separate file storage buckets by sensitivity: public/static, private videos, private client artifacts, exports.
- Use short-lived signed URLs for private media.
- Encrypt backups and restrict restore access.
- Rotate integration secrets and API keys.
- Never commit secrets, sample tokens, transcript exports, production database dumps, or client journals to the repo.

Secure MVP architecture:

- Web app/API server with server-side authorization.
- Managed relational database with row-level tenant fields and encryption at rest.
- Private object storage for recordings/transcripts/exports.
- Background worker for imports, AI extraction, SMS scheduling, reminders.
- Queue for idempotent jobs and retry handling.
- Secrets manager for OAuth, Fathom, Google, Twilio, AI provider credentials.
- Audit log table or append-only log service.
- Centralized error monitoring with sensitive-data scrubbing.

## Audit Logs and Monitoring

Log security and privacy events, not private content.

Events to capture:

- Login success/failure and MFA changes.
- Password reset or magic link events.
- User invitation, role change, client assignment, staff removal.
- Consent granted, withdrawn, or policy accepted.
- Journal entry created, updated, completed, deleted.
- Transcript/recording imported, viewed, summarized, deleted.
- AI processing job requested, completed, failed, or manually approved.
- SMS consent changes, reminder sent, opt-out received.
- Google/Fathom integration connected, token refreshed, revoked, import run.
- Data export requested/downloaded.
- Retention/deletion job executed.
- Authorization failures and suspicious ID access attempts.

Audit log fields:

- Actor user ID.
- Organization ID.
- Client/profile ID where applicable.
- Action.
- Target resource type and ID.
- Timestamp.
- IP/device/session.
- Result.
- Reason/failure category.
- Request/job correlation ID.

Do not log:

- Journal body.
- Transcript body.
- Full AI prompts or completions if they contain client content.
- Full SMS body.
- OAuth tokens, API keys, signed URLs, reset tokens.

## Retention, Deletion, and Export

Retention should be configurable per organization and visible to clients.

Recommended MVP defaults:

- Journal entries: retained while client account is active, exportable, deletable by policy.
- Assignments/action items: retained while active plus defined archive period.
- Fathom transcripts/recording pointers: import only when needed; keep raw transcript for the shortest useful period if AI-derived structured notes are sufficient.
- Recordings/videos: prefer storing references to source systems or private video library assets rather than duplicating call recordings in MVP.
- SMS logs: keep delivery metadata; minimize body retention.
- Audit logs: keep longer than user content for security accountability, but exclude content.
- Backups: define deletion lag, such as "deleted from active systems immediately and from backups on normal backup expiry."

Deletion workflow:

- Client requests deletion or workspace owner deletes client.
- App shows what will be deleted, retained, or anonymized.
- Revoke external tokens if applicable.
- Delete active records or anonymize where legal/security logs require retention.
- Queue object storage deletion.
- Queue AI/vector index deletion if embeddings or retrieval indexes exist.
- Record deletion completion in audit log without retaining deleted content.

Export workflow:

- Export client-readable data: assignments, journal entries, roadmap progress, action items, and selected insights.
- Avoid exporting internal coach notes unless policy says clients can access them.
- Require recent authentication before export.
- Create export as encrypted/private file with short expiry.

## Third-Party Integrations

### Fathom

Before building:

- Confirm available API scopes, webhook capabilities, rate limits, and terms.
- Confirm whether the workspace's Fathom settings allow model training on de-identified meeting content and whether it can be disabled.
- Confirm deletion behavior for meeting content, transcripts, clips, and derived summaries.
- Confirm sharing defaults, because Fathom may share meeting copies according to user settings.

Implementation guidance:

- Import metadata first, not full transcripts by default.
- Pull transcripts only for selected sessions after consent.
- Preserve source IDs and import timestamp.
- Store a processing state: `not_imported`, `metadata_imported`, `transcript_imported`, `processed`, `deleted`.
- Provide manual re-sync and deletion.

### Google Sheets / Legacy Roadmap

Google's user data policy strongly favors clear disclosure, minimum relevant permissions, limited use, secure handling, and no surprising secondary uses.

Implementation guidance:

- Request the narrowest Google scopes possible.
- Prefer file-specific access or user-selected picker flows over broad Drive access.
- Disclose exactly which workbook/sheet is read and why.
- Store imported normalized roadmap data separately from Google raw data.
- Avoid letting staff manually read connected Google data unless the user has affirmatively allowed it or it is needed for support/security.
- Support token revocation and re-sync status.

### SMS Provider

Implementation guidance:

- Validate webhook signatures.
- Store provider message IDs and delivery states.
- Maintain opt-in/opt-out state.
- Use templates with sensitive-content controls.
- Do not let arbitrary AI output become SMS body text.

## Requirement-by-Requirement Mapping

| Requirement | Privacy/security recommendation |
| --- | --- |
| House journal entries | Encrypt body content, restrict to client and assigned coach, log metadata-only access, support export/deletion. |
| Coach creates prompt and due date | Assignment table with visibility and due-date fields; role/relationship check for creation. |
| Client marks complete and coach alerted | CompletionEvent plus Notification; alert should contain assignment/status metadata, not journal text. |
| Pull key insights from Fathom recordings | Require recording/transcript/AI consent; import minimum necessary transcript; store raw artifact separately from AI insight. |
| Internal-world and external-world insights | Treat both as sensitive inferred personal data; label AI-generated/human-reviewed status. |
| Thought models and Legacy Roadmap updates | Use provenance links to source transcript/journal/roadmap item; require coach review before updating client-visible roadmap. |
| Extract action items from Fathom | Human review before SMS in MVP; store action item separately from transcript source. |
| Text clients what to do | Send non-sensitive reminder/link; maintain SMS consent and opt-out; avoid reflective or transcript content in SMS. |
| Metric system for current/future/gaps | Store metric definitions and snapshots with provenance; avoid making clinical or diagnostic claims. |
| Pre-call questions/focus areas | Treat like journal data; use due reminders, encryption, and assigned-coach access only. |
| Weekly tracker reminders | SMS/email/in-app reminders with minimal content; log reminder delivery metadata. |
| Input Legacy Roadmap workbook | Narrow Google scopes; clear consent; normalized import; revoke/re-sync support. |
| House framework/cosmology videos | Store video metadata and permissions; use signed URLs/private hosting if paid/private content. |
| Point clients to videos by topic | Recommendations should not expose sensitive labels in notifications; keep recommendation provenance. |

## Anti-Patterns to Avoid

- Treating coaching data as ordinary SaaS content.
- Giving every coach/admin access to every client by default.
- Storing raw transcripts, journals, and AI summaries in the same unclassified table.
- Sending sensitive reflections, insights, or transcript excerpts over SMS.
- Making HIPAA-compliance claims without legal review, vendor BAAs, and a formal risk program.
- Importing all Google Drive files or all Fathom meetings when only one workbook/session is needed.
- Logging full request bodies for journal, transcript, SMS, and AI endpoints.
- Using analytics/session replay tools on pages that display sensitive client content.
- Allowing AI output to directly mutate roadmap progress or send client messages without guardrails.
- Keeping recordings/transcripts indefinitely because storage is cheap.
- Building custom authentication, password reset, and permissions when mature tools exist.
- Using production client data in development, demos, screenshots, or test fixtures.

## Secure MVP Recommendation

For the first production-capable MVP:

1. Build core journaling, assignments, completion alerts, pre-call inputs, action items, and roadmap snapshots in the app.
2. Add privacy policy, terms, consent records, SMS opt-in/out, and data export/deletion workflows before real clients use it.
3. Use a mature auth provider with MFA for staff.
4. Use a relational database with organization/client relationship checks and encrypted sensitive fields.
5. Keep Fathom and Google ingestion manual or semi-manual at first: selected call, selected workbook, explicit consent.
6. Add AI extraction behind a coach review queue.
7. Keep SMS reminders minimal and link back to authenticated app pages.
8. Add audit logs from day one.
9. Do not claim HIPAA compliance in MVP.
10. Do not store duplicate video/recording files unless private storage, signed URLs, and retention policies are ready.

## Open Questions for Product/Legal/Architecture

- Will Starship ever be used by licensed mental-health, healthcare, or therapy providers?
- Are all clients adults?
- Is the business willing to prohibit medical/therapy use in MVP terms?
- Should clients be able to delete journal entries unilaterally, or request deletion?
- Are coach notes visible to clients?
- Who owns the data: client, coach/business, or both by contract?
- What retention period does the coaching business want for journals, transcripts, and recordings?
- Which AI vendors are acceptable, and do their terms prohibit training on customer data by default?
- Does Fathom API access support the needed transcript and recording controls?
- Should raw transcripts be retained after insights/action items are extracted?
- Should clients approve transcript imports from calls they attended?
- What exact SMS content is acceptable to the brand and privacy posture?
- Is the Legacy Roadmap workbook client-owned, coach-owned, or shared?
- Will video content be public, paid, private, or client-specific?

## Handoff Notes for Implementation Planners

- Plan the data model around provenance, consent, and relationship-based access before UI flows.
- Treat "client privacy settings" and "coach operational visibility" as first-class product areas.
- Build integration imports as isolated pipelines with review states, not as invisible background magic.
- Make "minimum necessary content in notifications" a product rule, not just a copywriting preference.
- Use audit logs as an implementation acceptance criterion for every sensitive feature.
- Create seed/test data that is synthetic and clearly fake; never use copied client reflections or transcript content.
