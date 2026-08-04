# Starship Backend Foundation

This folder holds the first executable backend decisions for the Starship client portal.

## MVP Stack

- Hosting: Vercel
- App runtime: Next.js App Router
- Database: Neon Postgres
- Auth: Auth.js invite-only email magic links
- Email sender: Resend or Postmark
- Coach-owned integrations: Google Drive first, generic call import later

## Access Model

Starship should treat every request as scoped by the logged-in user:

- Bri logs in as `coach`.
- Each client logs in by email magic link.
- A client can only see their own client workspace.
- A client can see a relationship workspace only when Bri manually links them as a member.
- Archived clients are hidden from active coach rosters, relationship-link dropdowns, and client portal access.
- Google Drive files sync into Starship as `needs_review` and `coach_only` until Bri publishes them.

The pure permission helpers in `permissions.mjs` are intentionally framework-neutral so they can be reused inside Next.js server actions, API routes, and tests.

## Build Order

1. Create the Neon database and run `schema.sql`.
2. Configure Auth.js from `auth.config.example.ts`.
3. Add Vercel environment variables from `.env.example`.
4. Replace local demo role toggles with real session checks.
5. Move coach/client read and write actions behind server routes.
6. Sync Google Drive `resources` folder metadata into the `resources` table.
7. Add coach review/publish controls for resources.
8. Add generic call transcript/action-item import after Drive resources and auth are stable.
