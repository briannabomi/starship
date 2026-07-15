# Aligned Partner quiz experience implementation plan

**Status:** implementation-ready plan; no app code changed  
**Prepared:** 2026-07-15  
**Primary inputs:** all `planning/research/aligned-partner-*.md` reports, the Sacred Audit Partners workbook synthesis, `Citizen.md`, `WorldCode_Bri.md`, `NorthStar.MD`, the requirements transcript, and the current vanilla JavaScript Starship app.

## 1. Outcome and product boundary

Build a public, mobile-first lead-magnet quiz that helps an adult name current relationship preferences, partner behaviors they may value, likely friction topics, and useful conversation prompts. It should feel direct, warm, discerning, private, and finishable in about three minutes.

The product is a **reflection profile**, not an assessment of a partner and not a clinical, attachment, safety, libido, or compatibility diagnostic. It must not produce a soulmate verdict, compatibility percentage, prediction of relationship success, or an explanation for why a relationship stopped having sex.

The primary happy path is:

`Landing → 8 general questions → intimacy notice → 3 optional intimacy questions → immediate result → optional email/report → optional offer`

The result is visible without providing an email. Marketing consent is separate and unchecked. Raw quiz answers remain in the browser for the MVP and are never added to analytics, URLs, the existing coaching state, email provider fields, or CRM fields.

## 2. Fit with the current app

The repository is a dependency-free, single-page vanilla JavaScript app. `src/app.js` currently renders either the coach or client portal into `#app`, and `src/state.js` persists coaching data to local storage under `starship-tracker-state-v1`. The quiz should be isolated from that authenticated/demo coaching state.

Use a query-driven public entry point for the MVP:

- `/index.html?experience=aligned-partner` renders only the public quiz shell.
- The existing URL without that query continues to render the Starship tracker unchanged.
- A later deployment may map a friendly route such as `/aligned-partner` to the same entry point.
- Do not show demo role controls, client names, coaching data, or tracker navigation in quiz mode.

### Concrete file plan

| File | Change |
|---|---|
| `index.html` | Update the generic title/description safely; the quiz renderer should set the quiz-specific document title at runtime. Add no third-party scripts. |
| `src/app.js` | Add the top-level experience switch before coaching state is rendered; import and initialize the quiz controller only for quiz mode. Keep existing tracker behavior intact. |
| `src/aligned-partner/quiz-data.js` | New: versioned content schema, question definitions, dimension metadata, result orientations, conversation prompts, and exact UI copy. No rendering logic. |
| `src/aligned-partner/quiz-domain.js` | New: pure functions for validation, branching, scoring, missing-answer handling, result selection, result view model, safe share text, and email-request payload creation. |
| `src/aligned-partner/quiz-state.js` | New: ephemeral session state, consented local draft persistence, expiry, reset/delete behavior, and experiment variant. Use a quiz-specific storage key. |
| `src/aligned-partner/quiz-view.js` | New: quiz shell and screen renderers, event binding, focus management, status announcements, navigation, email form, feedback, and CTA interactions. |
| `src/aligned-partner/quiz.css` | New: scoped `.aligned-quiz` styles, mobile-first layout, answer controls, progress, result charts, responsive rules, forced-colors, reduced-motion, and print styles. Import it from `src/styles.css` or link it conditionally. |
| `src/aligned-partner/quiz-analytics.js` | New: first-party event adapter with a strict allowlist. MVP may log to an in-memory test sink; do not call an external vendor until privacy review. |
| `tests/aligned-partner-quiz-domain.test.mjs` | New: scoring, missing data, branching, orientation tie-breaks, payload redaction, versioning, and reset tests. |
| `tests/aligned-partner-quiz-accessibility.test.mjs` | New or manual-test manifest: semantic and keyboard assertions feasible without adding a framework; keep the full assistive-technology checklist in QA. |
| `package.json` | Extend `test`/`check` to run both existing domain tests and quiz tests. |

Do not store leads in `src/state.js` or seed them as coaching clients. Production email delivery needs a separate server/API implementation and privacy review; the public UI can use a mock adapter until that is available.

## 3. Content and data model

Export one immutable `QUIZ_DEFINITION` object from `quiz-data.js`:

```js
{
  id: "aligned-partner-reflection",
  version: "1.0.0",
  estimatedMinutes: 3,
  questions: [],
  dimensions: {},
  orientations: [],
  copy: {},
  methodologyUrl: null,
  privacyUrl: null,
  supportResources: []
}
```

Each question includes:

```js
{
  id,
  section,                 // foundation | relating | intimacy
  prompt,
  helperText,
  required,                // intimacy questions are false
  responseType,            // single | ranked-choice
  options: [{ id, label, scores, tags }],
  missingOptions: ["not_sure", "not_applicable", "prefer_not_to_answer"],
  primaryConstruct,
  resultPurpose,
  sensitive,
  workbookSource
}
```

Rules:

- Every option has a stable opaque ID; never use display copy as a score key.
- `prefer_not_to_answer`, `not_applicable`, and skipped questions have no score and never become zero or midpoint.
- Do not collect free-text intimate disclosures in v1.
- Do not infer gender, orientation, relationship structure, trauma, abuse, diagnosis, or current partnership status.
- Record `quiz_version` with any aggregate outcome or email request so copy/scoring changes remain auditable.

## 4. Exact experience and copy

### Screen 0: landing

**Eyebrow:** `A 3-minute relationship reflection`  
**H1:** `The relationship you want needs language.`  
**Body:** `Name the values, rhythms, and partner behaviors that may help you feel understood, desired, and free to be yourself.`  
**Trust line:** `Your answers stay in this browser unless you choose to email your report. For self-reflection—not therapy, diagnosis, or a prediction of compatibility.`  
**Primary CTA:** `Start my relationship profile`  
**Secondary link:** `How this works` opens an inline disclosure, not a modal trap.

Disclosure copy:

> You will answer 8 short relationship questions, then choose whether to answer 3 questions about affection and sexual connection. You can go back, skip sensitive questions, and see your result without subscribing. Your result reflects what you choose today and may change.

Below the CTA, include `Questions → your profile → optional next steps` so the email and offer are not surprise steps.

### Question-screen frame

- Header: wordmark/text `Aligned Partner Reflection` and `Exit` link.
- Progress: visual bar plus text `Question {position} of 11`; if the intimacy section is skipped, update to `Core questions complete` rather than pretending 11 were answered.
- Helper above options: `Choose the answer that feels true, not impressive.` on Q1 only.
- Native `fieldset` and `legend`; full-row radio labels; explicit `Next` button; never auto-advance.
- `Back` is available after Q1 and preserves the answer.
- Required unanswered state: `Choose one answer to continue.` adjacent to the fieldset and linked with `aria-describedby`.
- Selecting `Exit` opens a simple confirmation: `Leave this reflection? Your answers will be cleared unless you chose “save on this device.”` Buttons: `Keep going` and `Clear and leave`.

### Exact question sequence

The v1 sequence has 11 questions. It adapts the ten workbook prompts while adding a needed conflict/repair construct and avoiding sensitive free text.

#### Q1 — desired relationship feeling (`foundation_feeling`, required)

**Prompt:** `At this point in your life, what do you most want partnership to feel like?`

- `Steady and dependable` → stability
- `Deeply seen and emotionally close` → depth
- `Spacious and freedom-supporting` → sovereignty
- `Alive, playful, and exploratory` → vitality
- `Purposeful—like we are building something together` → co_creation
- `I’m still discovering what I want` → missing/reflective tag only

Purpose: warm opener and primary orientation signal.

#### Q2 — values (`partnership_values`, required, ranked-choice)

**Prompt:** `Which three values matter most in a partnership?`  
**Helper:** `Choose up to three. The limit makes your priorities visible; it does not make the others unimportant.`

Options: `Honesty`, `Emotional presence`, `Freedom`, `Reliability`, `Growth`, `Play`, `Shared purpose`, `Affection`, `Spiritual connection`, `Family or community`.

Implementation: checkbox group with a visible `0 of 3 selected` counter; require exactly three for scoring, with `I’m not sure yet` as a mutually exclusive unscored option. Present options in a fixed reviewed order for v1; do not randomize during initial validation.

#### Q3 — relationship container (`relationship_container`, required)

**Prompt:** `What kind of relationship agreement are you seeking or exploring?`

- `A mutually monogamous partnership`
- `A consensually non-monogamous or polyamorous partnership`
- `A flexible agreement we define together`
- `A committed partnership where sex is not central`
- `I’m exploring and do not want to define it yet`
- `Prefer not to answer`

This is displayed in results as context only. No option earns more “alignment.”

#### Q4 — appreciation (`receiving_care`, required)

**Prompt:** `When you are carrying a lot, what response helps you feel most cared for?`

- `Listen and understand before offering solutions` → depth
- `Offer practical help without taking over` → co_creation
- `Give clear reassurance and follow through` → stability
- `Give me room, then check back at an agreed time` → sovereignty + repair_space
- `Bring warmth, affection, or play when I welcome it` → vitality
- `It depends on the moment` → flexibility tag

Do not call these “love languages.”

#### Q5 — autonomy/togetherness (`space_and_closeness`, required)

**Prompt:** `What balance of closeness and independence feels most supportive?`

- `A highly shared life with frequent connection` → togetherness 100
- `Mostly shared, with protected individual time` → togetherness 75
- `An even balance of shared and separate worlds` → togetherness 50
- `Strong independence with intentional time together` → togetherness 25
- `My needs change a lot with context` → flexibility tag, no numeric score

Result display uses the neutral range `more independent ↔ more intertwined` and never labels either end healthier.

#### Q6 — contribution (`shared_responsibility`, required)

**Prompt:** `How do you want responsibility and contribution to work between partners?`

- `Clearly divided roles we both choose` → structure
- `Shared fairly and adjusted as life changes` → flexibility + co_creation
- `Each person leads in their strengths` → complementarity
- `Mostly independent, with explicit shared commitments` → sovereignty + clarity
- `I want to explore this together rather than decide now` → exploratory

Avoid provider/gender assumptions. Result copy should reflect the desired process, not prescribe who does what.

#### Q7 — repair (`conflict_repair`, required)

**Prompt:** `When tension rises, what helps you return to connection?`

- `Talk it through directly while it is fresh` → direct_repair
- `Take a short pause, with a clear time to reconnect` → repair_space
- `Begin with reassurance, then solve the issue` → reassurance
- `Write or reflect first, then talk` → reflective_repair
- `Use curiosity or gentle humor once we both feel ready` → playful_repair
- `I’m not sure yet` → missing

Result language describes a preference under stress; never assign an attachment style.

#### Q8 — discernment/pattern (`decision_pattern`, required)

**Prompt:** `When you feel strong chemistry, what are you most likely to overlook?`

- `Whether their actions match their words` → consistency_watch
- `Whether our values and direction actually align` → direction_watch
- `Whether I can name a need or boundary without shrinking` → voice_watch
- `Whether there is room for my own life and identity` → autonomy_watch
- `I tend to slow down and look at the whole pattern` → observation_strength
- `None of these / I’m not sure` → missing

This adapts fantasy-versus-seeing-clearly and repeating-pattern prompts without shame. The result says `One place to stay curious`, not `Your sabotage pattern`.

### Intimacy transition screen

After Q8, do not reveal Q9 without notice.

**H2:** `A note before the intimacy questions`  
**Body:** `The next three questions are about affection and sexual connection because these preferences can matter in partnership. Desire varies across people and across time. You can answer, skip any question, or skip this section. Skipping will not lower your result.`  
**Privacy line:** `We do not need explicit details or sexual history.`  
**Primary CTA:** `Continue to intimacy questions`  
**Secondary CTA:** `Skip this section`.

If skipped, mark the section `skipped`, show the other result dimensions, and display `Not enough answers yet` for the sexual-connection profile.

#### Q9 — role of sexual connection (`sexual_connection_role`, optional)

**Prompt:** `How important is sexual connection in the partnership you want?`

- `Central to how I experience closeness and aliveness`
- `Important, alongside other forms of intimacy`
- `Meaningful sometimes; my interest varies`
- `Not central to the partnership I want`
- `I’m unsure or exploring`
- `Prefer not to answer`

Score as a self-described priority only; do not label this libido or compare it to a norm.

#### Q10 — intimate communication (`sexual_communication`, optional)

**Prompt:** `When something intimate is not working for you, what partner response would help most?`

- `Listen with curiosity and no pressure to fix it immediately`
- `Talk plainly about wants, limits, and possible next steps`
- `Reassure me that a “not now” will be respected`
- `Make room for the conversation, then revisit it at an agreed time`
- `Explore other mutually wanted forms of closeness`
- `Not applicable / prefer not to answer`

Each scored answer contributes to a communication-preference tag. All result variants explicitly reinforce mutual consent and reciprocity.

#### Q11 — affection rhythm (`affection_rhythm`, optional)

**Prompt:** `What kind of affectionate connection helps you feel close?`

- `Frequent everyday touch and warmth`
- `Intentional, focused moments of affection`
- `Playful or spontaneous affection`
- `Affection that grows from emotional connection and context`
- `More space around touch, with clear invitation and consent`
- `It varies / not applicable / prefer not to answer`

Do not infer desired intercourse frequency from this answer.

### Calculation screen

Avoid fake waiting. Render for no more than the natural calculation time. Copy:

**H2:** `Bringing your priorities into one clear map…`  
**Status:** `Your profile is based only on the answers you chose today.`

If rendering is synchronous, use this as a brief transition only when reduced motion is not requested; otherwise go directly to the result.

## 5. Scoring and result selection

### Independent dimensions

Create these user-facing dimensions; do not average them into a total score:

1. `connection` — emotional presence and desired care.
2. `autonomy_togetherness` — neutral bipolar range.
3. `communication_repair` — preferred directness, pacing, reassurance, and repair.
4. `shared_life` — responsibility, reliability, purpose, and flexibility.
5. `vitality_intimacy` — affection/sexual-connection priority; only when enough optional answers exist.

Values, relationship container, boundaries/preferences, and discernment watch-outs remain categorical profile sections, not numeric scores.

For each numeric dimension:

- Sum option contributions and divide by the maximum possible score among answered items; transform to 0–100.
- Require at least two answered items for `connection`, `communication_repair`, and `shared_life`.
- Require at least two of Q9–Q11 for `vitality_intimacy`; otherwise show `Not enough answers yet` with no bar.
- For the bipolar `autonomy_togetherness` dimension, show the selected Q5 description instead of a pseudo-precise percentage until validation supports aggregation.
- Never impute missing answers.
- Put all score weights in the data file with comments linking each weight to its construct purpose.
- Add deterministic unit tests for every option and missing-state combination.

### Orientation title

The title is a memorable summary of current priorities, not a type. Choose the strongest orientation signal from Q1, Q2, Q4, and Q6. Resolve ties using Q1, then a fixed documented priority order. Do not use intimacy answers to name the person.

Initial titles and theses:

- **Grounded Builder:** `You may thrive when care is dependable, agreements are clear, and partnership is built through follow-through.`
- **Depth Seeker:** `You may thrive with a partner who stays emotionally present and is willing to know—and be known—over time.`
- **Sovereign Explorer:** `You may thrive where closeness and freedom strengthen each other instead of competing.`
- **Alive Connector:** `You may thrive where affection, play, curiosity, and honest desire have room to move.`
- **Devoted Co-Creator:** `You may thrive when partnership has shared direction and both people actively shape the life they are building.`

Always prefix the title area with `Based on your answers today` and follow it with: `You may recognize yourself in more than one orientation. Clarity is not a contract; you are allowed to evolve.`

## 6. Result presentation

The full result is available immediately, before email or offer.

### Result hierarchy and exact headings

1. **Hero**
   - Eyebrow: `Based on your answers today`
   - H1: orientation title
   - Thesis from the orientation map
   - Badge: `A current reflection—not a fixed type`

2. **What matters most to you**
   - Show the three selected values as text chips in selection order.
   - Show relationship-container selection as `The agreement you are seeking or exploring`, without scoring it.

3. **Your relationship map**
   - Render four or five stacked dimension rows with text summaries.
   - If a bar is used, include the plain-language value in visible text and `aria-valuetext`; never rely on color.
   - Use `Not enough answers yet` instead of a zero bar.

4. **Aligned partner signals**
   - Three observable behaviors generated from selected care, repair, responsibility, and intimacy communication options.
   - Intro: `You may appreciate a partner who is willing to…`
   - Examples: `reconnect at an agreed time after taking space`; `make needs explicit instead of expecting mind-reading`; `respect both interest and limits without pressure`.

5. **One place to stay curious**
   - Map Q8 to one conditional paragraph, e.g. `Strong chemistry may make consistency harder to evaluate. Give behavior enough time to become a pattern.`
   - Never accuse, diagnose, or tell the user to leave a partner.

6. **Your intimacy conversation**
   - If at least two intimacy questions were answered, summarize role, communication preference, and affection rhythm.
   - Fixed note: `Sexual connection can shift with stress, health, medication, caregiving, disability, life stage, safety, and relationship context. A difference in desire is a conversation signal—not proof that either person is broken.`
   - If skipped: `You chose not to map intimacy today. Your relationship profile is still complete.`

7. **Three conversations worth having**
   - `What helps each of us feel understood before we move into solutions?`
   - `How do we want to balance shared life with protected individual identity?`
   - `What does satisfying affection or sexual connection mean to each of us right now—and how will we respond when our answers differ?`
   - If intimacy was skipped, replace the third with `Which expectations feel essential, which are preferences, and which are open to negotiation?`

8. **A seven-minute next step**
   - `Finish this sentence privately: “I feel most like myself in partnership when…” Then name one observable behavior that would support it.`
   - This provides standalone value without purchase.

9. **Agency controls**
   - `Review my answers`
   - `Retake and clear this result`
   - `This doesn’t feel like me` feedback control with optional non-sensitive reason categories only: `title`, `dimension summary`, `language`, `other`; do not solicit intimate free text in v1.
   - `Print or save as PDF` using browser print; print stylesheet excludes email and offer modules.

10. **Scope reminder**
    - `Your result is a mirror, not a verdict. It summarizes your self-report; it does not evaluate a partner, override consent, or predict relationship success.`

### Share behavior

If a share button is included, generate only: orientation title, thesis, top three values, and the public quiz URL. Never include email, relationship container, discernment answer, intimacy result, raw answers, or a session/result identifier. Show the exact share preview before invoking the Web Share API and provide copy-to-clipboard fallback.

## 7. Email and CTA behavior

### Optional email module

Place after the complete result and before the commercial invitation.

**H2:** `Want a copy you can return to?`  
**Body:** `Email yourself this profile plus a one-page partner conversation guide.`  
**Field label:** `Email address`  
**Delivery CTA:** `Email my profile`  
**Delivery note:** `This sends the report you requested. It does not subscribe you to ongoing emails.`

Separate unchecked checkbox:

`Also send me occasional relationship insights and invitations from Bri. I can unsubscribe at any time.`

Include a nearby privacy link and concise copy naming the controller, purpose, retention, processors, deletion/contact method, and jurisdiction-appropriate rights before production launch. Ask for email only; do not collect a name until there is a defined use.

Behavior:

- Validate on submit and preserve the address on error.
- Use native `type="email"`, `autocomplete="email"`, `inputmode="email"`; avoid an overly restrictive custom regex.
- Delivery and marketing consent are separate fields and purposes.
- On confirmed server success: `Your profile is on its way. You can keep reading it here.`
- On failure: `We couldn’t send that yet. Your result is still here—try again when you’re ready.` Do not fire `generate_lead` on failure.
- Deduplicate retries with a random submission ID kept in memory/session state, not the URL.
- API payload contains email, delivery request, marketing-consent boolean/timestamp/text-version, quiz version, coarse result orientation if explicitly needed for template selection, and submission ID. It does **not** contain raw answers or intimate dimension values.
- Prefer server-rendering the report from a safe template token or sending a generic guide link. If a personalized report is sent, disclose that the orientation is included in the email and keep it out of subject lines.
- Provide a `Continue without email` path by making the module entirely optional; result access never changes.

### Commercial invitation

Only one primary post-result offer:

**Eyebrow:** `Optional next step`  
**H2:** `Turn this reflection into a real relationship strategy.`  
**Body:** `In an Alignment Strategy Session with Bri, you can clarify what is essential, what is negotiable, and the conversation or decision in front of you. Bri’s approach integrates practical discernment with spiritual guidance; the session does not promise a particular partner or outcome.`  
**Primary CTA:** `Explore the Alignment Strategy Session`  
**Secondary:** `Not now` (equally legible; collapses the module without deleting the result).

Do not use countdowns, scarcity, confirm-shaming, fear about sex/relationship failure, or claim the quiz independently selected this offer. Label paid/free next steps clearly when pricing and destination exist.

## 8. State, privacy, and data handling

Default behavior is session-only. On landing, offer an unchecked `Save my progress on this device for 24 hours` control. If unchecked, keep answers only in memory. If checked, use `aligned-partner-quiz-draft-v1`, store only question IDs/options, screen position, quiz version, consent timestamp, and `expiresAt`; delete automatically after 24 hours or completion unless the user chooses to keep it for review.

Never use the existing Starship coaching storage key. Never put answers in query parameters, hashes, history state URLs, analytics payloads, error strings, console logs, or DOM data attributes. Disable session replay and advertising pixels on the quiz route until a privacy review explicitly approves them.

`Retake and clear this result` deletes the draft and result after confirmation. `Exit` clears in-memory data unless saved. Browser back/refresh should restore only when the user opted into device storage; otherwise show the landing screen with a truthful notice that unsaved answers were not retained.

Safety is not scored. V1 should not ask users to disclose coercion or violence. Add a discreet footer link, `Need relationship safety support?`, opening a hideable panel whose reviewed resources are localized for launch geography. Copy: `Pressure or fear is not a compatibility issue. You deserve support and can choose what happens next.` Include a rapid close/hide control and do not track link labels more granularly than `support_panel_open`.

## 9. Accessibility and interaction requirements

Target WCAG 2.2 AA across landing, questions, results, email, errors, and dialogs.

- Use semantic `main`, headings, form, `fieldset`, `legend`, native radio/checkbox/input/button elements, and real links.
- One H1 per experience; question prompts may be H2 plus legend or a visually unified legend without duplicated announcements.
- Full answer rows are at least 48 CSS px high with at least 8 px separation.
- All functions work with keyboard alone. Space selects a focused radio/checkbox; Tab moves through controls; Enter submits only the explicit current action.
- After Next/Back, focus the new screen heading with `tabindex="-1"`. Announce progress through the existing visually-hidden live-region pattern without moving focus to the live region.
- On validation failure, focus the error summary or first invalid field, connect error text via `aria-describedby`, and preserve all selections.
- Progress uses visible text and a semantic `<progress>` or equivalent with an accessible name. Color is never the only indicator.
- Dimension visuals include visible labels and values; use HTML, not canvas.
- Minimum body size is 16px; line length 45–70 characters; no horizontal scrolling at 320 CSS px or 200% zoom.
- Focus indicator is at least a 2px perimeter-equivalent with 3:1 contrast change. Add forced-colors rules.
- Respect `prefers-reduced-motion`; no required animation and no auto-advancement.
- Dialogs use native `<dialog>` only with tested focus return, Escape handling, and backdrop click behavior; an inline disclosure is preferable for noncritical help.
- Status and errors do not disappear on a timer.
- Page title updates by screen, e.g. `Question 4 of 11 — Aligned Partner Reflection` and `Your Grounded Builder profile — Aligned Partner Reflection`.
- Run VoiceOver/Safari, TalkBack/Chrome, keyboard-only, 200%/400% zoom, forced colors, reduced motion, and 320px reflow tests before release.

## 10. Responsive visual direction

Keep the public quiz visually distinct from the dense coaching dashboard while reusing the existing warm neutral palette. Scope every new rule beneath `.aligned-quiz` to prevent tracker regressions.

- Mobile first: single centered column, `max-width: 680px`, 16px page gutters, question card with minimal chrome, and buttons full width below 520px.
- Tablet/desktop: 24–32px gutters, a quiet two-column result layout only where reading order remains logical; question screens remain a single column.
- Result profile dimensions use stacked rows, not a radar chart. Radar charts are harder to compare and explain accessibly.
- Use warm paper/panel surfaces, ink text, sage/blue accents, and brick only for errors/safety—not for low scores.
- Do not use gendered stock imagery, erotic imagery, pseudo-scientific seals, or “perfect match” graphics.
- On print, remove controls, email/offer modules, progress, and private intimacy detail if the user has not explicitly selected `Include intimacy section in print` (default unchecked).

## 11. Analytics allowlist

Create an adapter that accepts only allowlisted event names/parameters. No event may include email, free text, exact answers, relationship structure, intimacy state, safety-resource destination, or numeric dimension scores.

| Event | Allowed parameters |
|---|---|
| `quiz_landing_view` | `quiz_version`, `variant`, `source_bucket` |
| `quiz_start` | `quiz_version`, `variant` |
| `quiz_question_view` | `question_id`, `position`, `section` |
| `quiz_answer_saved` | `question_id`, `position`; omit option ID |
| `quiz_back` | `from_question_id`, `to_question_id` |
| `quiz_validation_error` | `question_id`, `error_code` |
| `quiz_section_skipped` | `section` only |
| `quiz_complete` | `quiz_version`, `orientation`, `duration_bucket` |
| `result_view` | `quiz_version`, `orientation` |
| `email_module_view` | `gate_variant: result_first` |
| `generate_lead` | `quiz_version`, `gate_variant`; only after confirmed API success |
| `result_cta_click` | `cta_id`, `orientation` |
| `support_panel_open` | `quiz_version` only |

Use a coarse acquisition `source_bucket` set server-side or from a strict allowlist; do not forward arbitrary UTM values. Unit-test that unexpected keys and sensitive values are rejected.

## 12. Implementation sequence

### Phase 0 — content validation before coding

1. Confirm the final workbook transcription and trace every v1 question to the source prompt and primary construct.
2. Have a relationship/sexual-health subject-matter reviewer and inclusive-language reviewer approve Q3 and Q9–Q11.
3. Confirm launch geography, adult-audience handling, privacy controller/contact, retention, support resources, email processor, and offer URL.
4. Run 5–8 cognitive interviews with representative users; revise confusing or morally loaded wording before freezing `1.0.0`.

### Phase 1 — pure domain and data

1. Add versioned `quiz-data.js` and schema validation.
2. Implement navigation/branching and independent scoring in `quiz-domain.js`.
3. Implement orientation tie-breaks and result view-model generation.
4. Add exhaustive tests before UI integration.

### Phase 2 — public flow

1. Add experience switch in `app.js` without changing tracker state behavior.
2. Build landing, question frame, intimacy transition, and result in `quiz-view.js`.
3. Add isolated state/persistence and delete/reset controls.
4. Implement focus/status/error behaviors while building each screen, not as a retrofit.

### Phase 3 — delivery and invitation

1. Add optional email form against a mock adapter.
2. Define the production API contract and privacy review separately; do not fake successful delivery in production.
3. Add commercial invitation only after the full result.
4. Add safe print and share previews.

### Phase 4 — instrumentation and pilot

1. Add allowlisted first-party analytics with test sink.
2. Verify that network requests, DOM, logs, URLs, and storage contain no prohibited values.
3. Pilot with small traffic; inspect completion time, item skips, abandonment, option distributions, result-fit feedback, accessibility issues, email delivery, unsubscribe, and complaint rates.
4. Version any material content/scoring change and re-test.

Do not A/B test an email gate in v1. Launch the trust-first result-first experience. If later testing is justified, predeclare the hypothesis, primary metric, guardrails, sample size, and stopping rule; never hide all useful results behind email.

## 13. Test plan and acceptance criteria

### Automated domain tests

- Every question ID and option ID is unique and every required field is present.
- Each scored option references a defined dimension/orientation.
- Missing/prefer-not/NA answers never contribute zero, midpoint, or orientation points.
- Skipping intimacy changes progress and result state without reducing any other score.
- Fewer than two intimacy answers yields `insufficient`, not a score.
- Orientation selection is deterministic for every tie.
- Editing an earlier answer regenerates all affected result copy.
- Email and analytics payload builders discard raw answers, intimacy values, and unexpected fields.
- Draft expiry, completion cleanup, and explicit deletion work.
- Existing `tests/domain.test.mjs` remains green.

### End-to-end/manual scenarios

1. Complete all questions with mouse/touch and receive a coherent result.
2. Complete the flow keyboard-only, including Back, validation, intimacy skip, result controls, email error, and reset.
3. Skip all intimacy questions and receive a complete non-intimacy profile with an honest insufficient state.
4. Use Back from Q11 to Q1; all answers remain selected and progress is correct.
5. Refresh with persistence off: no sensitive draft restores. Refresh with opt-in on: draft restores and expires at 24 hours.
6. Enter an invalid email, then a valid one; value is preserved on error and `generate_lead` fires only on confirmed success.
7. Simulate delivery failure; result remains visible and retry does not duplicate a successful request.
8. Print/share preview contains no email, raw answer, relationship structure, discernment, or intimacy detail by default.
9. Switch back to the normal app URL; coach/client tracker functionality and stored state remain unchanged.
10. Inspect network, URL, local/session storage, console, analytics sink, and DOM attributes for prohibited sensitive data.

### Release gates

- [ ] Landing truthfully communicates value, time, privacy, optional intimacy, result access, and non-diagnostic scope.
- [ ] Every item has a source trace, construct, result purpose, and reviewed neutral options.
- [ ] The quiz works at 320px, 200%/400% zoom, keyboard-only, VoiceOver/Safari, and TalkBack/Chrome.
- [ ] Intimacy has advance notice, skip controls, and no scoring penalty.
- [ ] Results expose dimensions and uncertainty; no total alignment/compatibility score exists.
- [ ] Result access is independent of email and marketing consent.
- [ ] No raw or sensitive responses reach analytics, URLs, logs, CRM, pixels, replay, or the coaching database.
- [ ] Privacy notice, deletion, retention, email processor, and localized support resources have named owners and have been tested.
- [ ] Copy has passed relationship-science, inclusive-language, trauma-informed, manipulation, legal/privacy, and brand review.
- [ ] Five to eight cognitive/usability sessions and a small pilot are documented before broad cold-traffic spend.
- [ ] Existing Starship tracker tests and new quiz tests pass together.

## 14. Decisions still requiring owner approval

These are implementation blockers only for production release, not for building the local prototype:

1. Final public quiz URL and whether the lead magnet is adults-only.
2. Privacy controller/contact, launch jurisdictions, retention period, processor list, and deletion mechanism.
3. Email delivery provider/API and whether the report includes the coarse orientation or only a generic guide link.
4. Current Alignment Strategy Session destination, pricing label, and substantiated offer claims.
5. Qualified reviewer-approved safety resources for the launch geography.
6. Final workbook transcription/provenance and permission to use/adapt its wording.
7. Whether users may opt into 24-hour on-device persistence; the recommended default is off.

## 15. Definition of done

The feature is done when a cold visitor can understand the offer, complete a respectful and accessible reflection in roughly three minutes, skip intimate content without penalty, receive an immediate multidimensional and non-diagnostic result, optionally email a safe report without being subscribed, decline the offer without friction, review or delete their data, and do all of this without exposing sensitive answers or disturbing the existing Starship coaching tracker.
