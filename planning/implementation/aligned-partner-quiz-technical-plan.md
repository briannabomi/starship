# Aligned-partner quiz technical integration plan

Date: 2026-07-15  
Status: implementation-ready plan; no application code changed by this document

## Outcome and boundaries

Add a public, low-resistance relationship-preference quiz to the existing vanilla HTML/CSS/JavaScript application without disturbing the dirty tracker work currently present in `src/app.js`, `src/domain.js`, `src/state.js`, `src/styles.css`, and `tests/domain.test.mjs`. The quiz produces a multidimensional reflection profile, not a compatibility percentage, diagnosis, partner verdict, or prediction.

The first release should:

- work without authentication and without requiring email;
- use one decision per screen, visible progress, Back, Skip for sensitive items, refresh recovery, and an editable result;
- score independent domains and explicitly represent insufficient coverage;
- keep sensitive answers on the device by default;
- present a useful result before an optional, separately consented email/marketing step;
- be fully usable by keyboard, screen reader, touch, at 200% zoom, and on narrow screens;
- preserve the tracker and its existing `starship-tracker-state-v1` storage record unchanged.

This plan operationalizes the four aligned-partner research reports in `planning/research/`: relationship science, assessment ethics, quiz UX, and source/brand synthesis.

## Current architecture and integration constraint

The repository is a dependency-free ESM application. `index.html` loads `src/app.js`; that module loads/migrates/saves the entire tracker state through `src/state.js`, renders HTML strings into `#app`, and rebinds DOM listeners after each render. Navigation is stored in `state.session` rather than represented in the URL. Domain mutations live mostly in `src/domain.js`. Tests are direct Node assertions in `tests/domain.test.mjs`. Styles are global in `src/styles.css`, with existing focus-visible, forced-colors, and responsive rules.

The worktree contains user/agent changes in all four app files and the current domain test. Implementation must not replace, revert, reformat, or broadly refactor those files. Prefer additive files and the smallest possible integration edits. Before every implementation phase, record `git status --short` and inspect the diff for every shared file; stage only quiz-specific paths/hunks.

## Proposed file and module layout

Add these files:

| File | Responsibility |
|---|---|
| `src/quiz/quiz-config.js` | Versioned construct map, questions, option IDs, sensitivity/required flags, score contributions, result copy keys, and validation assertions. No HTML. |
| `src/quiz/quiz-domain.js` | Pure state transitions, answer validation, branch resolution, coverage/scoring, result selection, submission idempotency, and redacted event construction. |
| `src/quiz/quiz-state.js` | Quiz-only session persistence, schema migration, expiry, deletion, and storage-failure fallback. Must not import tracker state. |
| `src/quiz/quiz-view.js` | Public quiz renderer, delegated events, focus management, live announcements, and optional lead form adapter. |
| `src/quiz/quiz-entry.js` | Route bootstrap: initializes the quiz view only on the quiz route and exposes no tracker data. |
| `src/quiz/quiz.css` | Quiz-scoped styles under `.aligned-quiz`; responsive, reduced-motion, forced-colors, and print/result rules. |
| `tests/quiz-domain.test.mjs` | Pure domain/config/migration/scoring/privacy tests runnable in Node. |
| `tests/quiz-browser-checklist.md` | Manual browser and assistive-technology matrix until browser automation is added. |

The preferred isolation is a dedicated `quiz.html` entry point loading `quiz-entry.js` and `quiz.css`, available at `/quiz.html` initially and rewritten by hosting to `/aligned-partner-quiz` in production. This avoids running `loadState()` or rendering coach/client UI for cold visitors and minimizes merge risk in `src/app.js`. If deployment cannot rewrite routes, keep `/quiz.html` canonical for release one. Do not implement a hash route inside the tracker.

Minimal existing-file edits later:

1. `package.json`: make `test`/`check` run both test files sequentially (or add `test:quiz` first, then fold into `test` after stability).
2. `README.md`: document the public route and commands.
3. `tools/dev-server.mjs`: only if it does not already serve arbitrary static HTML; add an explicit safe fallback for the clean route.
4. No quiz collections in `src/state.js`, no quiz mutations in `src/domain.js`, and no quiz rendering in `src/app.js` for release one.

## Route and view-state contract

Represent the public flow with an explicit finite state machine rather than scattered booleans:

```text
landing -> notice? -> question -> review -> result -> optional_lead
                 \-> neutral_exit
question <-> question (Back/Next; branch-aware)
result -> question (Edit answers) -> review -> result
```

`notice` is the advance content notice before the first sexual/intimacy item, not an age claim masquerading as legal compliance. If a legally reviewed adult gate is required, insert it before `landing` and store only its acknowledgement, never date of birth.

Use this UI state shape:

```js
{
  schemaVersion: 1,
  assessmentVersion: "aligned-partner-1.0.0",
  sessionId: "random opaque id",
  submissionId: null,
  screen: "landing", // landing|notice|question|review|result|optional_lead|neutral_exit
  activeQuestionId: null,
  visitedQuestionIds: [],
  answers: {},
  startedAt: null,
  completedAt: null,
  result: null,
  noticeAcknowledged: false,
  resultFeedback: null,
  updatedAt: "ISO timestamp"
}
```

Rules:

- The visible question order comes from `resolveQuestionPath(config, answers)`; Back uses `visitedQuestionIds`, never an assumed numeric index.
- Reload resumes at the last valid screen. If config/version changed incompatibly, preserve nothing silently: show a concise restart notice and begin a new session.
- Browser Back/Forward should work inside the flow without placing answers in URLs. On each screen transition, write a coarse history state `{ quiz: true, screen, questionId }`; handle `popstate` by validating the requested destination against current state. URL query/hash must never contain answers, result type, email, or sensitive flags.
- Deep-linking is supported only to landing and a non-personalized result explanation page. A personalized result requires valid local state.
- On every screen change set `document.title`, update the visible `<h1>`, move focus to that heading with `tabindex="-1"`, then announce progress through a polite live region. Do not announce the entire screen.

## Assessment configuration and data model

Every question must be a stable, versioned configuration object:

```js
{
  id: "q_conflict_reconnect",
  version: 1,
  construct: "communication_repair",
  prompt: "When tension comes up, I most want...",
  help: null,
  responseType: "single", // single|multi|priority|optional_text (avoid text in v1)
  required: true,
  sensitive: false,
  options: [{ id: "clear_reconnect_plan", label: "A clear plan to reconnect", scores: { ... } }],
  minSelections: 1,
  maxSelections: 1,
  branch: null,
  purpose: "Names preferred repair behavior",
  allowedResultClaims: ["prefers_explicit_reconnection"]
}
```

Initial independently scored dimensions should map the workbook into: connection/emotional presence; autonomy/togetherness; communication/repair; affection/sexual connection; commitment/relationship agreements; values/daily-life partnership; growth/exploration. Consent, boundaries, and safety are educational/routing concerns and must never increase or decrease an alignment/archetype score.

The configuration must preserve these distinctions:

- preference vs requirement vs true deal-breaker;
- desired relationship container vs health/rank;
- desired experience vs current experience (if both are asked, compute a labeled conversation gap, not a deficit);
- “not applicable,” “not sure,” and “prefer not to answer” as missing, not zero/midpoint;
- sexual connection, affection, and nonsexual intimacy as separate concepts;
- safety responses as an isolated, non-analytics route to a discreet support panel.

Avoid free text in v1. It raises privacy, moderation, analytics leakage, accessibility, and email/CRM risks while adding little to a short lead magnet. If a later optional self-description field is approved, it remains local-only, is never scored, and is excluded by construction from event/submission serializers.

Config acceptance checks should fail tests when IDs duplicate; an item lacks one primary construct/purpose; answer IDs are unstable; a required sensitive item exists; a scored option lacks an explicit contribution; or a result claim has no mapped items.

## Scoring and result generation

Implement scoring as pure, deterministic functions. For each answered item, add its documented option contribution to only its declared construct, then normalize to a 0–100 display range. Record `answeredCount`, `eligibleCount`, and `coverage` per dimension. Do not impute skipped/NA answers. A dimension below its documented minimum coverage returns `{ status: "insufficient" }` and displays “Not enough answers yet.”

Do not calculate a total compatibility score. Result data should be:

```js
{
  assessmentVersion,
  generatedAt,
  dimensions: { [id]: { status, score, band, answeredCount, eligibleCount } },
  orientationIds: ["grounded_builder"], // at most two, deterministic tie rule
  topValueOptionIds: [],
  requirements: [],
  preferences: [],
  dealBreakers: [],
  conversationGapIds: [],
  safetyPanel: null,
  copyVersion: "1.0.0"
}
```

Archetype/orientation selection is editorial summarization over the strongest one or two sufficiently covered dimensions. Ties use a documented stable priority solely for repeatability. Each result shows: “Based on your answers today”; strengths; what may support the respondent; neutral possible friction; three conversation prompts; one small step; boundaries/consent reminder; edit/retake/delete/result-does-not-fit actions; and the required non-diagnostic disclaimer. It says “you may appreciate partners who…” rather than “your ideal partner is…”.

Maintain fixture snapshots for each orientation and boundary case, but assert structured values and required/prohibited phrases rather than brittle full-page HTML.

## Persistence, privacy, and deletion

Use a quiz-specific key such as `starship-aligned-quiz-session-v1`; never reuse or migrate `starship-tracker-state-v1`. Access storage through an injected adapter so pure tests can use memory and browsers that block storage can still complete the current page session.

Release-one policy:

- persist locally only after Start, after each valid answer, and after screen transitions;
- expire unfinished sessions after 24 hours and completed/result sessions after 7 days (final retention requires product/legal approval);
- provide visible “Start over” and “Delete my quiz data” actions; deletion removes the quiz key, in-memory answers/result, any queued analytics association, and history state, then confirms in an assertive status message;
- do not synchronize quiz answers into tracker state, coach records, CRM, email provider, analytics, logs, or ad platforms;
- compute result client-side; if email delivery is later implemented, send a non-sensitive result document or one-time retrieval token, not raw answers;
- make email receipt and marketing consent separate. Marketing is unchecked by default and not required for result access;
- never include name/email, raw answers, exact sexual/relationship choices, safety responses, or result details in URLs, analytics, session replay, error objects, console logs, CRM fields, or email subject lines;
- mask or disable replay over the entire quiz; block ad pixels on quiz and result routes pending privacy review;
- use HTTPS, server-side validation, rate limiting, CSRF protection as applicable, encrypted storage, least privilege, explicit processors/retention/deletion, and idempotency for any future lead endpoint.

Lead endpoint contract, when authorized: `POST /api/quiz-leads` receives `{ submissionId, email, deliveryRequested, marketingConsent, privacyNoticeVersion, assessmentVersion }` only. It returns `{ accepted, leadReceiptId }`. `submissionId` is generated once on completion and reused on retry; the server enforces uniqueness. Fire `generate_lead` only after `accepted: true`. Never send the `answers` or `result` objects to this endpoint.

## Instrumentation seams

Create an injected `emitQuizEvent(name, safeParams)` adapter. Default development implementation stores nothing and logs nothing. The production adapter must allowlist event names and fields; it must drop unknown keys and reject strings matching email/long free text. Analytics consent and environment configuration gate network delivery.

Versioned event dictionary:

| Event | Trigger after successful state transition | Allowed parameters |
|---|---|---|
| `quiz_landing_view` | Landing first becomes visible | `quiz_version`, `source_bucket`, `device_class` |
| `quiz_start` | Session creation succeeds | `quiz_version`, `experiment_variant` |
| `quiz_question_view` | Active question renders | `question_id`, `position`, `branch_id` |
| `quiz_answer` | Valid answer saves | `question_id`, `position`; option ID only after explicit privacy approval |
| `quiz_back` | Back transition succeeds | `from_question_id`, `to_question_id` |
| `quiz_validation_error` | Next is blocked | `question_id`, `error_code` |
| `quiz_complete` | Required answers validate and result is generated | `quiz_version`, coarse `result_type`, `duration_bucket` |
| `email_gate_view` | Optional lead form renders | `gate_variant`, `result_preview_shown` |
| `generate_lead` | Server confirms acceptance | `lead_source`, `gate_variant` |
| `result_view` | Result successfully renders | coarse `result_type`, `delivery_mode` |
| `result_cta_click` | A result next step is activated | coarse `result_type`, allowlisted `cta_id` |

Use a per-session event ledger of dedupe keys in memory/local state for single-fire screen events. Never instrument safety-panel display, skip reasons, exact dimension values, deal-breaker choices, or deletion contents. Error reporting may include code/version/stack location, never state snapshots. Add unit tests around allowlisting, redaction, idempotency, offline failure, and “button click before server success does not emit conversion.”

## Accessible interaction contract (WCAG 2.2 AA target)

Use native HTML before ARIA:

- `<form>` with one `<fieldset>` and `<legend>` per question; native radio/checkbox controls remain in the accessibility tree;
- visible text labels with a minimum 24 by 24 CSS pixel target or sufficient spacing; make the whole answer card label clickable;
- a `<progress>` element or text equivalent such as “Question 3 of 8”; progress counts the resolved path and updates when branching changes;
- real `<button type="submit">` for Next and `<button type="button">` for Back/Skip; Enter submits only when focus is within the form, while Space retains native option behavior;
- no custom arrow-key behavior unless a true ARIA composite is introduced (not recommended for v1);
- validation summary/status linked with `aria-describedby`; focus the question legend/error on failed submit; identify the specific issue in text, not color alone;
- content notice contains Continue, Skip intimate section, and Exit with equal visibility and no focus trap;
- results use semantic headings and text alternatives for any bars. Score meaning must not depend on bar length/color;
- logical DOM/tab order; no positive `tabindex`; no focus loss after re-render; restore focus to the invoking control when closing any dialog (prefer avoiding dialogs in the linear quiz);
- persistent, high-contrast focus indicators that remain visible in forced colors; never hide outlines;
- respect `prefers-reduced-motion`; transitions are optional opacity changes, never required to understand state;
- support browser zoom/reflow at 320 CSS px without two-dimensional scrolling, except intrinsically tabular content (none expected);
- use `autocomplete="email"`, correct input type, persistent labels, and accessible consent descriptions in the optional lead form.

Focus sequence on Next/Back: commit transition, render, set the destination heading/legend `tabindex="-1"`, focus it with `preventScroll`, then scroll it into view only if needed. On refresh, focus the resumed screen heading and announce “Your saved progress was restored.” Deletion confirmation uses `role="status"`/assertive announcement without a timed disappearance.

## Responsive CSS contract

Scope all selectors below `.aligned-quiz` and define quiz tokens locally so existing tracker rules cannot leak. Do not change global button/input rules unless a shared change is independently justified and regression-tested.

- Content column: `width: min(100% - 2rem, 44rem)`; use fluid spacing/type with `clamp()`.
- Answer list: single column by default. Only use two columns above 48rem when every label remains readable and DOM order matches visual order.
- Tap targets: at least 44px tall as the product default (exceeding WCAG's minimum where feasible), with 8px separation.
- Fixed/sticky footer is avoided on small viewports because keyboards and zoom can hide controls. Keep Back/Next in document flow.
- At `max-width: 32rem`, stack all actions full width, preserve Back before Next in DOM, and allow labels to wrap.
- At 200% zoom and 320px width, no clipped progress, option labels, disclaimers, consent copy, or CTA.
- Results bars use grid/flex with `minmax(0, 1fr)` and always include visible band text.
- Add `@media (forced-colors: active)` borders/focus treatment and `@media (prefers-reduced-motion: reduce)` to eliminate nonessential animation.
- Print stylesheet may format the result, but must omit email form, commercial CTA, session ID, controls, and any hidden/private metadata.

## Test strategy

### Pure automated tests (`tests/quiz-domain.test.mjs`)

1. Config integrity: stable unique question/option IDs, one construct/purpose, valid branches, no required sensitive items, complete result-claim mapping.
2. State machine: legal/illegal transitions, branch-aware Back, skip, neutral exit, edit result, restart, resume, and stale-version restart.
3. Validation: required unanswered, multi-select caps, malformed/unknown IDs, not-applicable/missing semantics.
4. Scoring: one fixture per dimension, reverse contributions if any, normalization boundaries, minimum coverage, missing data, deterministic ties, no total score, safety exclusion.
5. Result copy: required scope/disclaimer/consent language and prohibited claims (`perfect partner`, predictive certainty, diagnoses, health hierarchy).
6. Persistence: separate storage key, migration idempotency, TTL expiry, unavailable/quota storage fallback, deletion, and no writes to tracker key.
7. Privacy serializer: raw answers/email/free text/safety values cannot enter analytics or lead payloads; unknown event fields are dropped.
8. Events: exact transition triggers, dedupe, completion only after success, lead only after confirmed server acceptance.
9. Submission: stable idempotency key across retry and no duplicate accepted lead event.

Update `npm test` to run existing tracker tests first and quiz tests second. Existing tracker assertions must remain unchanged and green.

### Browser integration checks

Test Chrome, Safari, and Firefox desktop; Safari iOS and Chrome Android representative sizes. Cover fresh start, every branch, sensitive-section skip, validation recovery, refresh/resume, Back/Forward, edit answers, result generation, storage blocked, delete, offline optional-lead failure, retry, and duplicate submission.

Accessibility checks:

- keyboard-only full path and reverse path;
- VoiceOver/Safari and NVDA/Firefox (or the agreed equivalent) reading order, fieldset/legend announcements, errors, progress, focus after render, and result semantics;
- 200% and 400% zoom, 320px reflow, text spacing overrides, reduced motion, forced colors/high contrast;
- automated axe scan on every screen as a supplement, never a substitute for manual checks;
- touch target sizing and on-screen keyboard behavior.

Privacy/event QA uses a network inspector to prove that no request contains answers, email before explicit submission, result scores, safety state, or quiz local state. Verify the browser URL/referrer and console remain clean. Verify analytics-disabled and consent-denied paths make no analytics requests.

### Research and content validation before acquisition spend

Run expert content/inclusive-language review, then cognitive interviews and moderated usability sessions across genders, orientations, abilities, cultures, and relationship structures. Document item interpretation, distress/skip points, missingness, completion time, and result fit. Pilot before claiming reliability. Version config/scoring/copy after any material change; never call the assessment validated until evidence supports the intended population and interpretation.

## Phased implementation order

1. **Protect baseline:** capture worktree status/diffs; run current `npm test`; identify shared-file ownership; create quiz-only branch/commit boundaries without staging unrelated changes.
2. **Freeze content contract:** product owner and qualified relationship/sexual-health reviewer approve construct map, source-workbook traceability, item text, response sets, safety routing, claims, disclaimer, and result copy. Resolve launch geography before publishing safety links.
3. **Build pure core:** add config/domain tests first, then state machine, validation, scoring, result generation, and privacy serializers. No DOM or networking.
4. **Add isolated persistence:** quiz-only storage adapter, TTL/migrations/deletion, memory fallback, and tests proving tracker storage isolation.
5. **Build public entry/view:** add dedicated HTML/entry/view/scoped CSS; implement semantic forms, history state, progress, focus/live regions, sensitive notice, review, result, edit/retake/delete.
6. **Add event seam:** ship allowlist/dedupe/redaction with a no-op adapter; connect production analytics only after privacy/consent review.
7. **Add optional lead adapter:** only after endpoint, privacy notice, retention, processor, deletion, rate-limit, and consent requirements are approved. Result remains available without it.
8. **Integrate commands/docs:** minimally patch package scripts/server/docs, resolving against current dirty versions rather than overwriting them.
9. **Audit/revise loop:** automated tests -> browser functional audit -> accessibility audit -> privacy/network audit -> content/ethics audit -> fix -> repeat until no release-blocking findings remain.

## Rollout gates and audit checklist

### Block launch until all are true

- [ ] Every item has workbook provenance, construct, purpose, response semantics, scoring rule, and allowed result claim.
- [ ] Qualified reviewers approve inclusive, sexual-health, consent, trauma-informed, and safety language.
- [ ] No result claims diagnosis, unique partner fit, predictive compatibility, or a single cause of sexual disconnection.
- [ ] Results are visible without email or marketing consent; consent boxes are separate and unchecked.
- [ ] Sensitive items have advance notice, Skip section, Prefer not to answer, and neutral exit without penalty.
- [ ] Safety state is excluded from score, analytics, lead payload, logs, and result archetype.
- [ ] Privacy notice states fields, purposes, storage, retention, processors, deletion, and contact; deletion is tested end to end.
- [ ] Raw answers and sensitive/result detail are absent from network requests, URL/referrer, console, analytics, replay, pixels, CRM, and email subject.
- [ ] Happy path and recovery paths pass keyboard, screen reader, touch, 200%/400% zoom, 320px reflow, reduced-motion, and forced-colors checks.
- [ ] Current tracker tests plus quiz tests pass from a clean install; tracker behavior and `starship-tracker-state-v1` data remain unchanged.
- [ ] Refresh recovery, browser Back/Forward, branch-aware Back, result editing, storage failure, deletion, offline retry, and duplicate submission pass.
- [ ] Safety resources are current, discreet, geography-appropriate, and have a hide/exit affordance.
- [ ] Cognitive interviews/usability pilot and findings are recorded; material revisions increment versions.

### Staged release

1. Internal/staff fixture review with analytics no-op.
2. Small invited usability pilot; no paid traffic; inspect completion, skips, misunderstanding, distress reports, accessibility defects, and result-fit feedback.
3. Limited organic traffic with consented, coarse analytics. Treat completion and qualified/consented lead rate as co-primary; guardrails are abandonment by question, result-view success, accessibility errors, deletion failures, unsubscribe/spam, and complaints.
4. Only then consider a predeclared A/B test. Change one hypothesis at a time, calculate sample size/stopping rule in advance, and keep assessment/scoring version fixed during UX experiments.

Rollback is a route/feature-flag disable that leaves tracker code and storage untouched. If a privacy, safety, scoring, or accessibility incident occurs, disable the public route and lead/analytics adapters independently, preserve only the minimum incident evidence authorized by policy, and follow the documented incident/deletion procedure.

## Decisions required before implementation can be called production-ready

1. Final item wording/options and minimum coverage per dimension.
2. Launch geography and reviewed safety resources.
3. Canonical public URL and host rewrite capability.
4. Local retention durations and whether any server-side result/email storage is truly required.
5. Email provider, processor terms, privacy notice owner, deletion contact, and separate marketing-consent requirements by audience geography.
6. Analytics provider/consent mechanism and whether option IDs/result types are approved at all.
7. Result orientation/copy approval and commercial CTA disclosure.
8. Named reviewers and empirical pilot threshold for advancing rollout.

Until those decisions are approved, the safe implementation target is a standalone, client-side, local-only quiz with no live lead submission, analytics network adapter, ad pixels, or session replay.
