# Client Portal and Shared Relationship Workspace Best Practices

Research date: 2026-07-13  
Scope: client-facing information architecture for a personal coaching dashboard, an optional shared relationship workspace, weekly tracker history, personal and shared challenge backlogs, and a video library.

## Executive Summary

Starship should treat the client portal as three deliberately separate product spaces:

1. **My Dashboard** is private to the signed-in client and their authorized coach. It contains the client's weekly tracker, tracker history, personal open challenges, call preparation, assignments, journal links, and other individual coaching information.
2. **Relationship Workspace** is a distinct shared container. It exists only after the coach creates a relationship and both intended participants have active membership. Every record created there is visibly shared with both participants and the coach.
3. **Video Library** is a learning resource surface. It is available without revealing information about other clients or relationships; recommendations and watch history remain personal unless deliberately shared.

The most important architectural rule is that a relationship workspace must not be a joined view of two personal profiles. Shared challenges, tasks, notes, and repair items should be new records owned by the relationship workspace. Private journal entries, weekly check-ins, coach notes, personal challenges, call artifacts, and roadmap details must never become partner-visible merely because two people are linked.

This boundary should be enforced in server-side authorization, database queries, exports, notifications, search, and file access—not only by hiding UI. OWASP recommends deny-by-default authorization, relationship- or attribute-based checks, and permission validation on every request. Those practices fit this domain better than a single broad `client` role ([OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)).

## Requirements Interpreted from the Transcript

The latest requirements extend `planning/requirements-transcript.md` with these client-facing needs:

- Every client has a private dashboard.
- Every client can maintain a backlog of personal open challenges.
- Every client is prompted to submit a weekly tracker and can review submission history.
- A relationship workspace appears only for clients whom the coach has explicitly linked.
- Relationship participants can see shared challenges and progress back and forth.
- The relationship workspace can support shared challenges, blocks, tasks, desires, fights, and repair status without exposing individual coaching records.
- The client navigation remains intentionally narrow: personal dashboard, conditional relationship workspace, and video library.

The coach command-center requirements are researched elsewhere, but they affect one boundary here: the coach may administer relationship membership while still being unable to silently convert private client content into shared content.

## Recommended Information Architecture

### Primary navigation

For a client without an active relationship membership:

- **My Dashboard**
- **Video Library**
- Account/profile controls

For a client with an active relationship membership:

- **My Dashboard**
- **Relationship** (or a neutral workspace name agreed by the participants)
- **Video Library**
- Account/profile controls

Do not show a disabled relationship tab to every client. Conditional navigation is both simpler and less revealing. It avoids suggesting that a relationship record exists when the current user has no active membership. GOV.UK's service-navigation guidance recommends limiting navigation to the most important top-level sections and explicitly notes that navigation is not a site map ([GOV.UK, Navigate a service](https://design-system.service.gov.uk/patterns/navigate-a-service/)).

Use the same labels and ordering on desktop and mobile. The current location must be visually and programmatically identifiable. Page headings should repeat the destination name so a deep-linked client can tell whether they are in a personal or shared space.

### My Dashboard

The dashboard should answer “What needs my attention now?” before presenting history. Recommended order:

1. Current weekly tracker and next-call focus.
2. Personal open challenges, blockers, and next actions.
3. Upcoming assignments or call items.
4. Recent weekly tracker submissions.
5. Personal progress or recently recommended video.

The personal challenge backlog belongs here, not inside the relationship workspace. A personal challenge can have status, owner, focus area, next action, blocker, target/review date, and history. Its default audience is the client and authorized coach.

Weekly tracker history should be chronological and client-scoped. Each submission should be immutable as a historical snapshot after submission, with corrections represented as a new version or an explicit amendment. The current tracker may be editable as a draft; prior submissions should not silently change when question templates evolve.

### Relationship Workspace

The shared workspace should have a persistent context banner such as:

> Shared workspace · Visible to Alex, Jordan, and Bri

Recommended sections:

- Shared open challenges
- Blocked items needing attention
- Shared tasks, including owner: participant A, participant B, both, or coach
- Desires or intended outcomes
- Conflict/repair items with explicit status
- Shared activity/history

Every card should show its author, audience, owner, status, and last update. Do not reproduce personal weekly tracker answers or personal challenge cards here. If a participant wants to bring a private topic into the relationship space, use a deliberate “Create shared item” flow that creates a new shared record and previews exactly what will be shared.

### Video Library

The library can be a common catalog, but access must still be scoped to resources the current client is entitled to view. Topic recommendations, completion, favorites, and watch history are personal records. If a video is recommended to a relationship, model that recommendation as a shared relationship record referencing the common video; do not merge the participants' personal watch histories.

Provide captions for prerecorded video and a usable transcript when feasible. WCAG 2.2 requires captions for prerecorded synchronized media at Level A and provides the current baseline for accessible web content ([W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

## Private-versus-Shared Data Boundary

### Record ownership, not a presentation flag

Use separate ownership domains:

- `ClientPrivate`: one client profile plus authorized coaching staff.
- `RelationshipShared`: one relationship workspace plus its active participants and authorized coaching staff.
- `LibraryResource`: organization/client-entitlement scoped content.

A single generic record with a mutable `private/shared` switch is risky. It makes accidental audience expansion easy, complicates history, and invites authorization bugs. Prefer distinct record types or, at minimum, an immutable owner scope (`client_profile_id` XOR `relationship_workspace_id`) that cannot be changed after creation. “Share” should create a new shared object with provenance rather than reassigning the private source.

### Recommended visibility matrix

| Data | Client A | Client B | Assigned coach | Notes |
| --- | --- | --- | --- | --- |
| A's weekly tracker/history | Yes | No | Yes | Never copied automatically into relationship space |
| A's personal challenges | Yes | No | Yes | Default private coaching scope |
| B's weekly tracker/history | No | Yes | Yes | Symmetric rule |
| Relationship challenges/tasks | Yes, while active member | Yes, while active member | Yes | Owned by relationship workspace |
| Relationship conflict/repair items | Yes, while active member | Yes, while active member | Yes | Clearly labeled shared and sensitive |
| Coach-only note | No | No | Yes | Separate staff-only scope |
| Video catalog item | By entitlement | By entitlement | Yes | Catalog is not client data |
| Personal video history | Own only | Own only | Only if product policy explicitly allows | Do not make partner-visible |

The same matrix must apply to list views, individual API routes, search results, notifications, exports, background jobs, analytics events, and external file URLs.

## Relationship Membership and Authorization

### Membership lifecycle

Model the relationship and its memberships explicitly:

- `RelationshipWorkspace`: ID, organization, state, created-by, created-at, archived-at.
- `RelationshipMembership`: workspace ID, client user/profile ID, role, state, joined/acknowledged time, revoked time.
- Suggested membership states: `pending`, `active`, `paused`, `revoked`.
- Suggested workspace states: `draft`, `active`, `paused`, `archived`.

The coach can create the draft link required by the transcript, but the client-facing space should not activate until both intended accounts are unambiguously matched and each participant has received a plain-language notice of what will be shared. An invitation/acknowledgment step reduces wrong-account linking and creates an auditable boundary. Consent must not be implied by continued use or a preselected control; the FTC warns against interfaces that obscure or steer privacy choices ([FTC, Bringing Dark Patterns to Light](https://www.ftc.gov/reports/bringing-dark-patterns-light)).

If consent is the chosen legal basis in a relevant jurisdiction, it must be specific, informed, affirmative, documented, and easy to withdraw. The ICO's consent guidance provides a useful high bar even when UK GDPR is not directly applicable ([ICO, Guide to consent](https://ico.org.uk/media/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/consent-1-0.pdf)). Product counsel should determine the applicable legal basis and exact notice.

### Authorization policy

For every relationship-scoped operation, authorize against:

- authenticated user identity;
- active organization membership;
- active membership in the exact relationship workspace;
- requested action (`read`, `create`, `update`, `archive`, `export`);
- target record's immutable owner scope;
- any additional staff assignment or entitlement rules.

Do not trust workspace IDs, client IDs, hidden form fields, frontend routes, or dropdown filtering as proof of access. Return a non-enumerating not-found/forbidden response for records outside the current user's scope. Test URL/ID tampering and stale memberships. OWASP explicitly recommends relationship-based access control, least privilege, deny by default, and per-object checks on every request ([OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)).

### Pausing, unlinking, and withdrawal

On pause or revocation:

- remove the relationship navigation immediately for that participant;
- deny all new API, search, export, and file requests immediately;
- invalidate cached relationship responses and outstanding signed URLs;
- stop shared notifications;
- retain an audit event without copying shared content into logs;
- apply a documented retention/export policy to the existing shared record.

The business must decide before launch whether either participant may export shared history, request deletion, or retain a copy after a relationship ends. This is a governance decision with competing participant interests; it should not be improvised in UI code. A safe MVP can pause access and require coach/admin review while preserving an auditable record according to the published retention policy.

## Navigation, Disclosure, and Consent UX

### Persistent context cues

Users must not have to infer the audience from color or location alone. Use explicit text:

- “Private · Visible to you and Bri”
- “Shared · Visible to Alex, Jordan, and Bri”
- “Coach only” for staff surfaces

Repeat the audience close to every create/edit action, especially for emotionally sensitive challenge and repair content. Use participant names only after authorization has succeeded; do not expose names in page titles, browser history, email subjects, or URLs where avoidable.

### Safe publishing flow

For shared creation:

1. Start inside the Relationship Workspace.
2. Show the audience above the form.
3. Label the primary action **Add shared challenge** or **Post to relationship** rather than generic **Save**.
4. On success, announce the result and keep the audience visible.
5. Preserve author and timestamps in history.

For moving a private idea into the shared workspace, show a preview and require an affirmative action. Never preselect “share with partner,” never bulk-share private history, and never make relationship linking retroactively expand access. These recommendations follow the FTC's guidance to avoid defaults and interface interference that lead people to disclose more than expected ([FTC dark-pattern report](https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf)).

## Security and Privacy Baseline

Starship's journals, weekly trackers, challenges, conflict records, and coaching notes should be treated as sensitive personal data whether or not a particular healthcare law applies. NIST's Privacy Framework recommends managing privacy risk across the full data lifecycle and focusing on problems individuals may experience from data processing ([NIST Privacy Framework](https://www.nist.gov/privacy-framework), [NIST Getting Started](https://www.nist.gov/privacy-framework/getting-started-0)).

Minimum practices for this portal:

- Authenticate all users and use short-lived, secure browser sessions.
- Require MFA for coaches/admins before production; offer it to clients.
- Encrypt traffic and storage; use short-lived signed URLs for private files/video.
- Keep private and relationship owner scope in server-side data access paths.
- Minimize content in email/SMS/push previews; deep-link to the authenticated portal.
- Do not put relationship names, challenge text, tracker content, or tokens in URLs or analytics events.
- Record membership creation, acknowledgment, change, revocation, exports, authorization failures, and sensitive record mutations.
- Keep journal, challenge, tracker, and conflict content out of logs. OWASP recommends logging security/audit events while excluding or masking sensitive personal data, access tokens, secrets, and data for which consent has expired ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)).
- Rate-limit invitations and authentication endpoints; prevent account enumeration.
- Define retention, export, correction, and deletion behavior before real client data is stored.

## Empty, Loading, Error, and Permission States

Blank space can look like a broken product. An empty state should explain why no content appears and provide one relevant next action when the user can resolve it. This is consistent with established design-system guidance ([Stack Overflow Design System, Empty states](https://stackoverflow.design/system/components/empty-states)).

Recommended states:

| Context | Suggested message | Action |
| --- | --- | --- |
| No relationship membership | Do not show the relationship navigation | None; avoid implying another person's record exists |
| Relationship has no challenges | “No shared challenges are open.” | “Add shared challenge” |
| Personal challenge backlog empty | “You have no open challenges.” | “Add challenge” |
| No tracker history | “Your submitted weekly trackers will appear here.” | “Complete this week's tracker,” if available |
| Tracker complete | “This week's tracker is submitted.” | “View submission” |
| Video library empty | “No videos are available yet.” | None, or contact coach if useful |
| No search matches | “No videos match these filters.” | “Clear filters” |
| Unauthorized or revoked relationship | Generic unavailable/not-found state | Return to My Dashboard |
| Data failed to load | State that loading failed, not that no data exists | “Try again” |

Loading, empty, error, and unauthorized are different states and should not collapse into one “nothing here” message. Do not cache a previously authorized shared screen after membership revocation.

## Responsive and Accessibility Patterns

Target WCAG 2.2 AA and test complete client tasks with keyboard and screen-reader users, not only isolated components. Specific recommendations:

- Use semantic landmarks and headings. Personal and shared audience text must be available to assistive technology, not embedded only in visual badges. WCAG requires presented structure and relationships to be programmatically determinable ([WCAG 2.2, 1.3.1](https://www.w3.org/TR/WCAG22/#info-and-relationships)).
- Do not use red alone for blocked items. Add a “Blocked” label/icon and explanatory text. WCAG prohibits color as the only means of conveying information ([WCAG 2.2, 1.4.1](https://www.w3.org/TR/WCAG22/#use-of-color)).
- Reflow the dashboard and backlog to a single column at narrow widths. Avoid requiring two-dimensional scrolling at a 320 CSS-pixel equivalent width ([WCAG 2.2, 1.4.10](https://www.w3.org/TR/WCAG22/#reflow)).
- Provide buttons or menus for changing status/owner; if drag-and-drop is added later, retain a single-pointer and keyboard alternative. WCAG 2.2 requires a non-dragging alternative when dragging is not essential ([WCAG 2.2, 2.5.7](https://www.w3.org/TR/WCAG22/#dragging-movements)).
- Make touch targets at least 24 by 24 CSS pixels or meet the spacing exceptions; larger targets are preferable for primary actions ([WCAG 2.2, 2.5.8](https://www.w3.org/TR/WCAG22/#target-size-minimum)).
- Preserve visible focus, logical focus order, meaningful button names, and keyboard operation.
- Announce create/update/submission success with an accessible status message without unexpectedly moving focus ([WCAG 2.2, 4.1.3](https://www.w3.org/TR/WCAG22/#status-messages)).
- Label form fields and associate errors with fields; do not clear a long challenge or tracker draft after validation failure.
- For modal forms, move focus inside on open, trap `Tab` within the active modal, support `Escape`, provide a visible close control, and return focus to the invoking control after close. Use `role="dialog"`, `aria-modal="true"`, and an accessible name only when the background is genuinely inert ([W3C ARIA APG, Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- On mobile, prefer stacked cards or a list view over a wide project board. Keep author, owner, audience, status, and primary action visible without horizontal scrolling.
- Caption prerecorded videos and provide playback controls that work by keyboard.

## Testable Acceptance Guidance for the Planning Team

The implementation plan should include at least these tests:

### Authorization tests

- An unlinked client cannot discover relationship navigation, records, counts, names, or files.
- Client A cannot read Client B's tracker history, personal challenges, journal, calls, or coach notes by route or ID manipulation.
- Both active participants can read shared relationship records.
- A revoked/paused participant immediately loses relationship API, search, notification, export, and file access.
- A coach without assignment/organization access cannot read the relationship.
- Private records cannot be reassigned to shared scope through a crafted request.

### Disclosure tests

- Every shared create/edit form names the audience before submission.
- Shared cards identify author, audience/space, owner, status, and update time.
- Linking accounts does not reveal pre-existing private history.
- Creating a shared item from a private topic requires preview and affirmative confirmation.

### Navigation and state tests

- Navigation differs correctly for unlinked, pending, active, paused, and revoked memberships.
- Backlog, tracker history, and library distinguish loading, empty, filtered-empty, error, and unauthorized states.
- Deep links retain a clear personal-versus-shared page heading.

### Accessibility and responsive tests

- All dashboard, tracker-history, challenge, relationship, and library flows work by keyboard.
- Modal focus enters, stays within, escapes/closes, and returns correctly.
- Screen readers announce space/audience, field errors, status changes, and submission success.
- Blocked status remains understandable in grayscale and without CSS color.
- The portal reflows at 320 CSS pixels without loss of content/functionality.
- Challenge status/ownership can be changed without dragging.
- Video content has captions and usable controls.

## MVP Decisions and Deferred Questions

Recommended MVP decisions:

- Keep the navigation to My Dashboard, conditional Relationship, and Video Library.
- Store personal and shared challenges in separate owner scopes.
- Require explicit relationship membership records and participant acknowledgment.
- Make the coach the only relationship administrator for MVP.
- Use list/card backlog interactions; defer drag-and-drop boards.
- Preserve weekly submissions as historical snapshots.
- Hide—not disable—the relationship destination when there is no active membership.
- Treat shared challenge/repair text as sensitive data and keep it out of notifications and logs.

Decisions that require product/legal policy before production:

- Whether each participant can export the full shared workspace.
- What happens to shared history when either participant withdraws or the relationship ends.
- Whether the coach may share a private client insight into the relationship space, and what client confirmation is required.
- Whether personal video watch history is visible to the coach.
- Applicable lawful bases, notices, retention periods, and deletion rights by client jurisdiction.
- Whether one client can belong to multiple relationship workspaces in the future.

## Source Summary

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): least privilege, deny by default, ReBAC/ABAC, per-request and per-object checks, authorization testing.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): audit/security event coverage and exclusion of sensitive content/tokens from logs.
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework): privacy-risk management across products, services, and the data lifecycle.
- [NIST Privacy Framework Getting Started](https://www.nist.gov/privacy-framework/getting-started-0): privacy impacts to individuals and lifecycle-oriented risk assessment.
- [FTC Bringing Dark Patterns to Light](https://www.ftc.gov/reports/bringing-dark-patterns-light): avoiding manipulative defaults and obscured privacy choices.
- [ICO Guide to Consent](https://ico.org.uk/media/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/consent-1-0.pdf): specific, informed, affirmative, documented, withdrawable consent.
- [GOV.UK Navigate a service](https://design-system.service.gov.uk/patterns/navigate-a-service/): concise, task-oriented, consistent service navigation.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/): responsive, perceivable, operable, understandable, and robust accessibility baseline.
- [W3C ARIA APG Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): modal semantics, focus containment, keyboard behavior, and focus return.
- [Stack Overflow Design System Empty states](https://stackoverflow.design/system/components/empty-states): contextual empty-state explanation and one clear next action.

