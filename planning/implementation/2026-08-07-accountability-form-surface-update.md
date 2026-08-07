# Starship MVP Surface Update: Accountability Form and Coach Prep

Date: 2026-08-07

## Decisions

- Rename the client-facing weekly tracker to **Accountability Form**.
- After a client submits the current accountability form, remove the editable form and show only a simple submitted confirmation in the client portal. Full answers remain available in history and the coach view.
- Treat **What do you most want coaching on this week, and what would make this week's call feel like a win?** as the coach-facing priority signal.
- Highlight that answer in the coach command center and show it inside pre-call prep for the selected client.
- Connect pre-call prep to the selected client's open challenges so the coaching-focus answer can be reviewed next to current challenge context.
- Keep one client action surface: **Action items**. Remove competing “next best step” language and remove mock text-message delivery UI from the MVP demo.
- Rename **Video Library** to **Resource Library** for the client portal.
- Simplify **Client source folder** to a single Google Drive source link. Do not duplicate Journal Archive or Legacy Roadmap rows inside that panel.
- Keep **Journal Archive** and **Progress Evidence** as separate dashboard areas.
- Add coach-only **Manual notes** for quick context that does not need to be client-visible.
- Add an edit-client flow so the coach can update a selected client's name, contact info, current focus, next call, and Google Drive folder.

## Implementation Notes

- The current reviewable full MVP lives in the static demo files under `src/` and is exposed through `/demo`.
- The lighter database-facing `/coach` and `/portal` routes remain the backend shell. They should eventually receive the same accountability-form, challenge-linking, edit-client, and manual-notes functionality backed by Postgres.
- Texting/reminder delivery should not be reintroduced until the backend has explicit consent, notification settings, and delivery audit behavior.
