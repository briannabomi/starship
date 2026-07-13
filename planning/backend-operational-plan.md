# Starship Backend Operational Plan

Date: 2026-07-08

## Confirmed Decisions

- Hosting direction: Vercel + database.
- Roles for MVP: Bri as coach, clients as clients.
- Client access: each client has their own login.
- Client data source for MVP: a dummy Google Drive folder representing one client.
- Dummy Google Drive folder: `https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link`
- Vercel project start URL: `https://vercel.com/new?teamSlug=briannabomis-projects`
- Fake email/phone test data should be used for MVP back-and-forth testing.
- MVP also needs a couple/relationship workspace with Client A and Client B visible together on the coach dashboard.
- Product goal: move from local browser demo data to real persisted client records, with secure role-based access.

## Recommended Backend Shape

Use a Vercel-hosted app with a managed Postgres database.

Recommended database options:

- Vercel Postgres / Neon Postgres for the simplest Vercel-native path.
- Supabase Postgres only if we later want Supabase Auth, storage, or admin tooling.

For this MVP, the cleanest path is:

1. Vercel app hosting.
2. Postgres database.
3. Auth with invite-only client accounts.
4. Google Drive folder ingestion as a mockable integration.
5. Server-side API routes for assignments, journals, check-ins, roadmap, action items, library, and integration imports.

## MVP Identity Model

### Coach

Bri has a coach account with access to:

- All assigned clients.
- Client journal submissions.
- Weekly tracker submissions.
- Pre-call questions.
- Action item status.
- Call insights and review queues.
- Roadmap progression.
- Video library management.
- Alerts and audit trail.

### Client

Each client has a login and can access only their own:

- Assignments.
- Journal drafts and submissions.
- Weekly tracker.
- Pre-call focus/questions.
- Action items.
- Roadmap progress.
- Recommended videos/resources.
- Call insights that Bri has approved as client-visible.

Clients should not see:

- Other clients.
- Coach-only notes.
- Unreviewed AI/import candidates.
- Raw transcripts unless explicitly shared.
- Internal audit/security logs.

### Relationship / Couple Workspace

The MVP should support a shared workspace for two clients who may be a couple or relationship system.

For Client A and Client B, Bri needs to see:

- Both individual client profiles on one dashboard.
- Shared tasks assigned to one or both clients.
- Open relationship problems.
- Blocks.
- Fight/repair records.
- Desires named by each client.
- Status for each shared task or problem: open, blocked, repair in progress, done/closed.

Each individual client should still have their own login, journal, assignments, check-ins, action items, and roadmap. The relationship workspace is an additional shared layer, not a replacement for individual privacy.

Backend implications:

- Add `relationship_workspaces`.
- Add `relationship_workspace_members`.
- Add `relationship_issues`.
- Add `relationship_tasks`.
- Add `relationship_desires`.
- Add `relationship_fights`.
- Add `relationship_check_ins`.
- Shared records must define visibility and whether both clients can see them.
- Private individual journal entries should never automatically become shared relationship records.

## Database Tables Needed First

### Core Access

- `users`
- `organizations`
- `memberships`
- `client_profiles`
- `client_coach_relationships`

### Coaching Workflow

- `assignments`
- `journal_entries`
- `weekly_check_ins`
- `action_items`
- `alerts`
- `completion_events`
- `audit_events`
- `relationship_workspaces`
- `relationship_workspace_members`
- `relationship_issues`
- `relationship_tasks`
- `relationship_desires`
- `relationship_fights`
- `relationship_check_ins`

### Roadmap And Progress

- `roadmap_dimensions`
- `roadmap_snapshots`
- `roadmap_events`
- `evidence_links`

### Calls And Review

- `call_sessions`
- `call_artifacts`
- `transcript_segments`
- `insight_candidates`
- `insights`
- `action_item_candidates`
- `review_events`

### Resources

- `resource_items`
- `resource_tags`
- `resource_recommendations`

### Integrations And Consent

- `integration_connections`
- `raw_integration_events`
- `integration_jobs`
- `external_identity_maps`
- `consent_records`
- `contact_points`
- `notification_preferences`
- `notification_events`
- `message_deliveries`

## Google Drive Dummy Client Folder Mapping

The dummy Google Drive folder should represent one client workspace.

Recommended folder structure:

```text
Client Name - Starship MVP/
  01 Legacy Roadmap/
    Legacy Roadmap.xlsx or Google Sheet link
  02 Call Recordings and Transcripts/
    YYYY-MM-DD Call Transcript.txt or Fathom export
    YYYY-MM-DD Call Summary.md
  03 Journal Assignments/
    Prompt or response docs
  04 Framework and Cosmology Videos/
    Video links or metadata doc
  05 Client Notes/
    Any mock client context for this MVP
```

For the MVP, Starship should ingest or reference:

- Folder name as client display name or client source.
- Legacy Roadmap file as roadmap source.
- Transcript or summary files as call artifacts.
- Video links or metadata as resource library items.
- Optional docs as assignment or journal seed material.

## Backend Implementation Phases

### Phase 1: Convert Local MVP To App With Server Boundary

- Choose framework structure compatible with Vercel.
- Add server API routes.
- Keep the current UI but replace direct `localStorage` writes with a data service abstraction.
- Keep demo mode available for offline/local review.

### Phase 2: Add Database

- Create Postgres schema and migrations.
- Seed Bri as coach and one dummy client.
- Persist assignments, journals, check-ins, action items, roadmap, videos, alerts, and audit events.
- Add integration tables even if first integration is manual/mock.

### Phase 3: Add Authentication

- Add invite-only login.
- Create coach and client sessions.
- Enforce server-side access checks on every API route.
- Make client data invisible across accounts.

### Phase 4: Add Google Drive MVP Import

- Start with a manual import path using exported files or metadata from the dummy folder.
- Add folder mapping configuration.
- Normalize imported folder contents into Starship records.
- Preserve raw source records separately from interpreted records.

### Phase 5: Add Review And Notification Operations

- Make imported insights/action items draft candidates.
- Require Bri approval before client-visible publication.
- Add mock SMS first, then production SMS once Twilio consent and opt-out handling are ready.

## What I Need Next

### From Bri

- Dummy Google Drive folder link or exported folder contents.
- Preferred database provider inside the Vercel path: Vercel Postgres/Neon is the default recommendation.
- Confirmation of login style: invite-only magic link is the default recommendation.
- Whether the MVP should use the client's real email/phone or dummy contact data.

### From Vercel/Database

- Vercel project access or permission to create project config.
- Database connection string.
- Production app URL once created.
- Environment variable storage for secrets.

### Later For Integrations

- Google OAuth credentials or service-account strategy.
- Fathom export/API/Zapier/Make path.
- Twilio account and sending number.
- SMS consent language.

## Backend Acceptance Criteria

- Bri can log in as coach.
- A client can log in and only see their own workspace.
- Assignments and journal entries persist across devices/sessions.
- Weekly tracker submissions create coach alerts.
- Action item completion creates coach alerts and completion events.
- Roadmap progress persists as snapshots/events, not overwritten-only fields.
- Dummy Google Drive folder can seed or update one client workspace.
- Imported transcript outputs become review candidates, not automatically published.
- Audit events record meaningful data changes.
- No sensitive content is sent by SMS.
