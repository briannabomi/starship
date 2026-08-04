# Client Login Backend Execution

Date: 2026-08-04

## Decision

Starship should use invite-only magic-link login for the MVP. Bri creates the client first, then sends the login link. Clients cannot self-register.

## Implementation Slice Completed

- Added a Neon Postgres schema in `backend/schema.sql`.
- Added Auth.js magic-link configuration guidance in `backend/auth.config.example.ts`.
- Added pure permission helpers in `backend/permissions.mjs`.
- Added backend permission tests in `tests/backend-permissions.test.mjs`.
- Added environment variable template in `.env.example`.

## Backend Rules To Preserve

- A client portal session is valid only when the logged-in user maps to an active client.
- Archived clients are blocked from portal access.
- Archived clients are hidden from active rosters and relationship-link dropdowns.
- Coach can read archived history but cannot continue active workflows for archived clients.
- Relationship workspace access requires every linked client to be active.
- Resources sync from Google Drive as `needs_review` and `coach_only`.
- Clients see resources only after Bri publishes them as `client_visible` or `shared_workspace_visible`.
- Relationship language uses `challenges`, not `problems`.

## Next Implementation Step

Convert the static demo into a Next.js App Router project:

1. Install Next.js, React, Auth.js, database adapter, and email provider packages.
2. Move current static views into authenticated routes:
   - `/login`
   - `/coach`
   - `/portal`
   - `/portal/relationship`
3. Replace the demo role toggle with `auth()` session reads.
4. Add server actions for creating, archiving, unarchiving, and inviting clients.
5. Add the first Google Drive resource sync job for the existing `resources` folder.
6. Keep call imports generic; Fathom Recordings are no longer part of the MVP surface.
