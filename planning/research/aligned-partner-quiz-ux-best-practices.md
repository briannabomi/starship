# Aligned-Partner Quiz UX Best Practices

**Research date:** 2026-07-15  
**Scope:** A mobile-first lead-magnet quiz for cold social followers that returns a useful summary of relationship needs, desired partner qualities, mismatch risks, and intimacy patterns.

## Executive summary

The strongest implementation is a short, conversational, one-question-per-screen assessment that earns trust before asking about sex or relationship distress. It should give a credible time estimate, show meaningful progress, use plain and nonjudgmental language, allow people to go back, preserve answers, and make every response easy to select on a phone. The result should be immediately useful: a named pattern, a concise explanation, a few personalized partner-fit signals and mismatch risks, and one practical next step.

The email gate is a product hypothesis, not a settled “best practice.” For a cold audience, test two honest variants: (A) collect email immediately before the full result while showing a useful preview, and (B) show a meaningful result summary first, then offer the full report by email. Never imply that marketing consent is required merely to calculate a result. Separate delivery of a requested result from ongoing promotional consent where applicable.

Instrument the entire funnel at question-level granularity without sending intimate answers or free text to analytics vendors. Optimize for completed, consented, useful leads—not raw email count. Pretest the questionnaire qualitatively, launch with a small pilot, then run adequately powered experiments with one primary metric and guardrails.

## 1. Experience principles

### Minimize uncertainty before the first click

The landing screen should answer four questions without scrolling on a typical phone:

1. What will I learn? (“Discover the relationship dynamic and partner qualities that help you feel understood, desired, and secure.”)
2. How long will it take? Use a truthful estimate based on usability tests, such as “2–3 minutes.”
3. What happens with my answers? State whether answers are private, stored, used for personalization, or shared.
4. What is this not? For a relationship quiz, add a compact boundary such as “For self-reflection, not diagnosis or therapy.”

Use a specific CTA (“Start my relationship profile”), not a generic “Submit.” Avoid inflated promises, diagnostic claims, shame, or fear-based copy. Cold traffic has little trust; clarity is the conversion mechanism.

### Use one question or one decision per screen

GOV.UK recommends starting with one thing per page because it improves focus, mobile use, error recovery, autosave, and question-level analytics. Apply that pattern here, with rare exceptions for tightly related, low-effort fields such as email plus first name. Every question must justify its existence either in scoring, branching, personalization, or an explicitly defined learning goal. Remove ornamental demographic questions. ([GOV.UK, “Structuring forms”](https://www.gov.uk/service-manual/design/form-structure))

### Make the interaction feel finite

Show progress after the quiz starts. Prefer a labeled bar plus step language such as “4 of 10” or “About 1 minute left”; do not show false precision when branching changes the number of questions. Announce progress changes to assistive technology without stealing focus. Preserve answers when moving back and when recovering from refresh if privacy expectations permit.

Do not use surprise extra steps. If email capture and report delivery follow the questions, include them in the stated flow (“Questions → your profile → optional next steps”).

## 2. Recommended sequence

The sequence should resemble a respectful conversation. Pew’s survey guidance recommends beginning with simple, interesting questions, grouping topics logically, avoiding several difficult questions in a row, and keeping demographics away from the beginning unless required for routing. Earlier questions can alter later answers, so stable order matters for scoring and longitudinal comparison. ([Pew Research Center, “Writing Survey Questions”](https://www.pewresearch.org/writing-survey-questions/))

Recommended order:

1. **Warm, easy opener:** desired feeling or relationship aspiration. This creates momentum and frames the quiz around what the person wants.
2. **Self-pattern questions:** communication, closeness/autonomy, conflict/repair, affection, priorities.
3. **Partner-fit questions:** behaviors and values that help the person thrive; concrete choices are better than abstract labels.
4. **Mismatch questions:** recurring friction, unmet needs, or boundaries, phrased without blaming either partner.
5. **Intimacy/sex questions:** only after trust and context exist. Introduce the topic (“The next questions are about affection and sexual connection because they can shape compatibility”). Offer “Prefer not to answer” or skip when the item is not essential. Avoid assuming partnership status, monogamy, gender, orientation, sexual activity, or dysfunction.
6. **Optional segmentation:** relationship status or life context only if it changes the result or follow-up.
7. **Email/result transition:** explain what is calculated and exactly what email provides.
8. **Result reveal and next step.**

Start with roughly 8–12 scored questions and validate the actual completion time. Add branching only when it shortens or materially personalizes the experience. Avoid long matrices on mobile.

## 3. Question and answer design

Pew recommends clear, specific, concrete language; exhaustive and mutually exclusive closed-ended options; one concept per question; and pretesting. It notes that response order can create primacy effects in self-administered surveys and generally avoids “select all that apply” when forced-choice formats produce better measurement, particularly for sensitive topics. ([Pew Research Center](https://www.pewresearch.org/writing-survey-questions/)) The U.S. Census Bureau likewise treats pretesting as critical for detecting content, order, skip, and formatting problems. ([U.S. Census Bureau, questionnaire testing standard](https://www.census.gov/about/policies/quality/standards/appendixa2.html))

Implementation rules:

- Ask one construct at a time. Split “I feel safe and desired” into separate safety and desire items.
- Ask about observable behavior or a bounded situation (“When tension comes up, I usually…”) rather than identity judgments (“I am emotionally unavailable”).
- Use neutral, parallel options that do not reveal the “good” answer.
- Use ordered scales in a stable logical order. Randomize only unordered choices when order bias matters, and record the presented order.
- Include a genuine “Not applicable” or “Prefer not to answer” where needed; do not collapse it into the midpoint.
- Keep question text short, but offer optional explanatory help where a term could be unclear.
- Avoid “always/never,” jargon, stereotypes, gendered assumptions, and pseudo-clinical labels.
- Do not force disclosure of trauma, abuse, sexual history, or medical information to receive a useful result.
- If a response suggests immediate safety concerns, do not score it as a personality trait. Provide a discreet, jurisdiction-appropriate support path; do not promise crisis monitoring unless it exists.

Run 5–8 moderated cognitive/usability sessions across relevant audiences before scoring is finalized. Ask participants to think aloud, paraphrase each question, explain how they chose an answer, and react to the result. Follow with a pilot that measures item skips, option distributions, completion time, and question-level abandonment. Re-test whenever wording, order, or scoring changes materially.

## 4. Mobile and accessible interaction

Target WCAG 2.2 AA for the complete process, not merely the landing page. WCAG requires keyboard-operable controls, visible focus, meaningful focus order, labels/instructions, text-described errors, sufficient contrast, reflow, programmatic names/roles/values, and status messages. Its AA minimum pointer target is 24×24 CSS pixels or sufficient spacing; for a touch-first quiz, use larger full-row answer targets (about 44–48 CSS pixels high) as a usability margin. ([W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/); [W3C, Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html))

Checklist:

- Use native radio buttons/checkboxes inside `fieldset` and `legend`, or an equally robust accessible pattern. Make the visible label part of the hit area.
- Never rely on color alone for selected, error, or progress states.
- Keep a strong visible keyboard focus ring. W3C describes a robust focus indicator as at least a 2 CSS-pixel perimeter-equivalent with 3:1 change contrast. ([W3C, Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html))
- Support browser zoom and 320 CSS-pixel widths without horizontal scrolling.
- Keep primary navigation reachable without sticky UI covering content or focus.
- After “Next,” move focus predictably to the new question heading; announce the question and progress. Respect `prefers-reduced-motion` and avoid celebratory motion that blocks interaction.
- Do not auto-advance on a radio selection unless usability and accessibility testing show it is safe. A visible Next button prevents accidental advancement and gives review time.
- Put validation next to the relevant field, describe the problem in text, and say how to fix it. Do not clear answers after an error. ([W3C, Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification))
- Use semantic headings, readable line length, at least 16px body text as a practical mobile baseline, and sufficient whitespace.
- Test VoiceOver/Safari, TalkBack/Chrome, keyboard-only desktop, 200% zoom, and real low-end phones on slow networks.

## 5. Email capture timing and consent

There is no universally correct gate. The optimal choice depends on whether the business values maximum list growth, user trust, result consumption, or qualified engagement. Test these variants:

### Variant A: preview, then email for full report

After the last answer, show that the profile is ready and reveal a real preview (profile name plus one sentence). Ask for email to send/save the full breakdown. This can increase lead capture because the user has invested effort, but the gate must have been disclosed before starting and must not create a bait-and-switch.

### Variant B: meaningful result first, email for expanded value

Reveal the core result immediately, then offer an expanded report, exercises, or a partner conversation guide by email. This better demonstrates reciprocity and lets the user judge value before sharing data, though it may reduce raw captures.

For either variant:

- Ask only for email unless first name has a defined personalization use.
- Explain delivery (“We’ll email your full profile”) and marketing separately (“Also send occasional relationship insights”).
- Make promotional consent a clear affirmative choice where required; no prechecked boxes. Consent should be freely given, specific, informed, unambiguous, and withdrawable. The ICO explicitly advises separating consent from privacy information and avoiding making marketing consent a condition of service in many cases. ([ICO, planning direct marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/plan-direct-marketing/); [ICO direct-marketing checklist](https://ico.org.uk/for-organisations/advice-for-small-organisations/getting-started-with-gdpr/data-protection-self-assessment-medium-businesses/direct-marketing-checklist/))
- Link a concise privacy notice at the field. State controller identity, purposes, retention, processors, rights, and any cross-border handling applicable to the launch jurisdictions.
- Validate gently, preserve the address on error, and accept internationalized/common valid formats rather than using an overly restrictive regex.
- Provide a “View result here” recovery path after delivery failure when feasible.

Legal requirements vary by jurisdiction; obtain jurisdiction-specific legal review before launch, especially because relationship and sexual answers can be highly sensitive.

## 6. Result reveal

The result must repay the participant’s attention before asking for a sales action. Recommended hierarchy:

1. **Profile name and plain-language thesis** — memorable but not diagnostic or deterministic.
2. **“What you tend to need”** — 3–5 personalized bullets connected to their answers.
3. **“Aligned partner signals”** — observable behaviors and values, not demographic prescriptions.
4. **“Potential mismatch patterns”** — conditional, compassionate language (“You may feel disconnected when…”), never “Your relationship will fail.”
5. **“Intimacy connection”** — discuss desire/sex as multifactorial; avoid implying that one quiz explains libido, health, trauma, medication, stress, or relationship safety.
6. **One next action** — a reflection prompt, conversation guide, or relevant resource.
7. **Optional offer** — a single, context-matched CTA; keep the result readable without purchase.

Show transparent caveats: results reflect self-reported answers, are a starting point for reflection, and can change with context. Let users revisit answers and regenerate the result. If sharing is offered, create a user-controlled summary that excludes intimate responses and email identifiers.

## 7. Analytics specification

Google Analytics automatically supports `form_start` and `form_submit` through enhanced measurement and recommends `generate_lead` when a person submits a form/request for information. Use the prescribed recommended event where possible and verify events in DebugView/Realtime. ([Google Analytics, lead-generation measurement](https://support.google.com/analytics/answer/12941105?hl=en); [GA4 recommended events](https://support.google.com/analytics/answer/9267735?hl=en-EN))

Suggested first-party event model:

| Event | Trigger | Safe parameters |
|---|---|---|
| `quiz_landing_view` | Landing content visible | `quiz_version`, `source_bucket`, `device_class` |
| `quiz_start` | Start CTA succeeds | `quiz_version`, `experiment_variant` |
| `quiz_question_view` | Question becomes active | `question_id`, `position`, `branch_id` |
| `quiz_answer` | Valid answer saved | `question_id`, `position`, `answer_option_id` only if approved; otherwise omit |
| `quiz_back` | Back used | `from_question_id`, `to_question_id` |
| `quiz_validation_error` | Validation blocks progress | `question_id`, `error_code` |
| `quiz_complete` | All required quiz answers valid | `quiz_version`, `result_type`, `duration_bucket` |
| `email_gate_view` | Email request visible | `gate_variant`, `result_preview_shown` |
| `generate_lead` | Email/result request successfully accepted server-side | `lead_source`, `gate_variant` |
| `result_view` | Result rendered successfully | `result_type`, `delivery_mode` |
| `result_cta_click` | Result CTA selected | `result_type`, `cta_id` |

Do not put email, name, free text, exact sexual/relationship responses, or other personal data in analytics parameters, URLs, logs, session replay, ad pixels, or data-layer debug output. Prefer coarse result categories and pseudonymous session IDs. Disable or mask replay on the entire quiz unless a documented privacy review approves it. Fire completion and lead events only after confirmed application/server success, not button clicks, and deduplicate retries with a submission ID held in first-party systems.

Core funnel metrics:

- Landing → start rate
- Start → quiz completion rate
- Question-level reach and abandonment
- Median completion time and back/error rate
- Quiz complete → email accepted rate
- Email accepted → result viewed/delivered rate
- Result view → meaningful next-action rate
- Unsubscribe, spam complaint, invalid-email, and consent-withdrawal rates
- Qualified downstream conversion, segmented by acquisition source and result type

Treat completion rate and qualified/consented lead rate as co-primary business signals. Use accessibility errors, opt-out/spam rates, result-view rate, and time-to-complete as guardrails so a higher email count does not conceal a worse experience.

## 8. Experimentation plan

Before A/B testing, fix obvious usability and accessibility failures. Then test one material hypothesis at a time:

1. Result-first vs preview-then-email gate
2. 8-question core vs a longer version only if incremental personalization is demonstrable
3. Numeric progress vs time-based progress
4. CTA/value proposition wording
5. Intimacy-topic introduction and optionality

Write the hypothesis, primary metric, guardrails, minimum detectable effect, allocation, and stopping rule before launch. Calculate sample size in advance for a fixed-horizon test and do not repeatedly stop when a result happens to look favorable; Optimizely’s current fixed-horizon guidance likewise requires predetermined sample size. ([Optimizely, fixed-horizon statistics](https://support.optimizely.com/hc/en-us/articles/39716446497549-Frequentist-Fixed-Horizon-statistics)) Segment only when planned and sufficiently powered. Keep scoring constant during a UX experiment, or version it explicitly.

## 9. Acceptance criteria for implementation planning

- The complete happy path can be finished with keyboard, screen reader, touch, and 200% zoom.
- Every question has a documented scoring/personalization purpose.
- Sensitive questions are introduced, neutral, optional unless essential, and never exposed to analytics.
- The first screen truthfully describes value, time, privacy, and the result/email arrangement.
- Progress, Back, persistence, validation, refresh recovery, and duplicate submission behavior are specified.
- Results contain specific value before a commercial CTA and avoid diagnosis or certainty claims.
- Email delivery and promotional consent are visibly distinct where required.
- Analytics has a versioned event dictionary, data classification, consent gating, and QA plan.
- A cognitive/usability pretest and pilot precede broad acquisition spend.
- Experiments have predeclared metrics, guardrails, sample size, and stopping rules.

## Sources

- [GOV.UK Service Manual — Structuring forms](https://www.gov.uk/service-manual/design/form-structure)
- [Pew Research Center — Writing Survey Questions](https://www.pewresearch.org/writing-survey-questions/)
- [U.S. Census Bureau — Questionnaire Testing and Evaluation Methods](https://www.census.gov/about/policies/quality/standards/appendixa2.html)
- [W3C — Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C — Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C — Understanding Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [W3C — Understanding Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification)
- [Google Analytics — How to generate more leads on your website](https://support.google.com/analytics/answer/12941105?hl=en)
- [Google Analytics — Recommended events](https://support.google.com/analytics/answer/9267735?hl=en-EN)
- [ICO — Plan direct marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/plan-direct-marketing/)
- [ICO — Direct marketing checklist](https://ico.org.uk/for-organisations/advice-for-small-organisations/getting-started-with-gdpr/data-protection-self-assessment-medium-businesses/direct-marketing-checklist/)
- [Optimizely — Frequentist fixed-horizon statistics](https://support.optimizely.com/hc/en-us/articles/39716446497549-Frequentist-Fixed-Horizon-statistics)
