# Starship Product/UX Best Practices Research

Research Agent 1  
Date: 2026-07-08  
Scope: product and UX design for a coaching client tracking app, based on `planning/requirements-transcript.md`.

## Executive Summary

Starship should be designed as a secure, reflective coaching workspace, not as a generic task manager. The app needs to help clients prepare, reflect, complete assignments, revisit prior insights, and understand progress without feeling watched or judged. The coach experience should surface only the most useful signals: what is due, what is completed, what needs attention, what themes are emerging, and what should shape the next call.

The most important product principle is "humane accountability": reminders, due dates, completion states, and progress metrics should support autonomy, competence, and relatedness. That means clients should understand why a task matters, have lightweight ways to complete or revise it, see their progress in language connected to their own roadmap, and control the rhythm and channel of reminders where possible.

Recommended MVP UX pillars:

1. Client Home: a calm dashboard with next assignment, upcoming call prep, weekly tracker, action items, and progress snapshot.
2. Coach Workspace: a triage dashboard for due/completed assignments, unanswered pre-call prompts, and notable client progress or risk signals.
3. Journal + Assignments: prompt-based entries with due dates, draft states, private/shared visibility, completion, and coach alerts.
4. Weekly Check-In: recurring lightweight form for questions, focus area, progress, obstacles, and support needed.
5. Progress Roadmap: simple milestones and gap-closing indicators tied to the Legacy Roadmap rather than abstract gamification.
6. Reflection Library: searchable archive of entries, call insights, action items, and recommended videos/frameworks.

## Source Base

This research uses the Starship transcript plus reputable public guidance and research from UX, health portals, behavior change, accessibility, journaling, notifications, and dashboard design.

- Starship requirements transcript: `/Users/brilee/Documents/Codex/Starship/planning/requirements-transcript.md`
- GOV.UK design principles and design system patterns: https://www.gov.uk/guidance/government-design-principles and https://design-system.service.gov.uk/
- W3C WCAG 2.2 accessibility standard: https://www.w3.org/TR/WCAG22/
- Behavior Change Technique Taxonomy project: https://www.bct-taxonomy.com/
- Persuasive Systems Design model paper: https://doi.org/10.17705/1CAIS.02428
- Self-Determination Theory overview: https://selfdeterminationtheory.org/theory/
- Dashboard Design Patterns research and pattern library: https://dashboarddesignpatterns.github.io/ and https://arxiv.org/abs/2205.00757
- Healthcare dashboard evaluation framework: https://arxiv.org/abs/2009.04792
- Patient portal overview and engagement patterns, HealthIT.gov: https://www.healthit.gov/faq/what-patient-portal
- Patient portal education effectiveness systematic review: https://academic.oup.com/jamiaopen/article/6/1/ooad002/6997023
- Mental health app privacy investigation: https://arxiv.org/abs/2201.09006
- 2026 mental health/life-coaching app privacy analysis: https://arxiv.org/abs/2605.02016
- MindfulDiary LLM journaling study: https://arxiv.org/abs/2310.05231
- Apple Journal announcement and privacy framing: https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/
- Day One privacy/encryption reference: https://dayoneapp.com/guides/day-one-sync/end-to-end-encryption-faq/
- Twilio messaging compliance guidance: https://www.twilio.com/docs/messaging/compliance
- Fathom product reference: https://fathom.video/

## Starship Requirements Mapping

| Transcript need | UX interpretation | Product surface |
| --- | --- | --- |
| House journal entries from prompts | Guided reflection system, not blank notes only | Journal assignment detail page; journal archive |
| Prompt due dates | Visible due dates, reminders, overdue state, extension/reschedule flow | Assignment card; client home; coach dashboard |
| Place to reflect and revisit information | Searchable, filterable personal archive | Reflection Library |
| Coach alerted when complete | Coach notification and triage queue | Coach Workspace |
| Pull key insights from Fathom recordings | Imported call insights need review, attribution, and user trust | Call Recap page; insight cards |
| Track Fathom action items and text them | Action items should be confirmed before becoming reminders | Action Item Inbox; SMS/email reminders |
| Metric system from now to destination | Progress should connect current state, desired state, gap, and next action | Progress Roadmap |
| Questions/focus before calls | Pre-call intake should be low-friction and recurring | Weekly Check-In; Upcoming Call Prep |
| Reminder to fill weekly tracker | Gentle reminder cadence with opt-out/channel controls | Notification settings; weekly tracker |
| Input Legacy Roadmap workbook | Imported roadmap stages/milestones become the client's journey map | Roadmap Progress view |
| House framework/cosmology videos | Searchable learning library tied to client topics | Video Library; recommendations |

## Product Model

### Recommended Core Objects

- Client: profile, goals, coaching program, preferred reminder channel, privacy settings.
- Coach: client roster, notification preferences, assignment templates.
- Assignment: prompt, due date, status, visibility, completion timestamp, coach comments.
- Journal Entry: linked assignment, draft/submitted state, optional tags, share/private setting.
- Weekly Check-In: recurring form, call date, client questions, desired focus, self-rating, blockers.
- Call Recap: imported from Fathom or transcript, coach-reviewed status, internal insights, external insights, action items.
- Action Item: owner, due date, source call, reminder channel, status.
- Roadmap Item: Legacy Roadmap milestone, current status, evidence, gap description, next step.
- Video Resource: title, topic tags, framework/cosmology category, recommended-for links.
- Alert: event, recipient, priority, read/resolved state.

### Recommended Information Architecture

Client side:

- Home
- Assignments
- Journal
- Weekly Check-In
- Roadmap
- Library
- Calls
- Settings

Coach side:

- Client Roster
- Attention Queue
- Client Profile
- Assignments
- Call Recaps
- Roadmap Review
- Library Recommendations
- Templates
- Settings

## Best Practices And Recommendations

### 1. Design Around User Needs, Not Feature Buckets

Best practice: GOV.UK's service principles emphasize starting with user needs, doing the hard work to make things simple, building digital services rather than brochure-like websites, and iterating with real user data.

Recommendation for Starship:

- Organize the client experience around recurring jobs to be done: "What do I need to do before my next call?", "What am I reflecting on?", "What did I commit to?", "How am I changing?", and "Where can I revisit the teachings?"
- Avoid exposing the full back-office model to clients. A client should not need to understand whether something came from a Fathom import, a workbook import, a coach template, or a video database to know what to do next.
- Use one prominent "Next best step" on the home screen, with secondary items below.

Maps to:

- Journaling assignments
- Pre-call check-ins
- Weekly trackers
- Action item reminders
- Video recommendations

Anti-patterns:

- Dashboard with 12 equal-weight widgets.
- Navigation based on internal systems: "Fathom", "Google Sheets", "Assets", "Automations".
- Making clients hunt through a library to find the one thing their coach wanted them to watch.

### 2. Build A Calm Client Home, Not A Data Cockpit

Best practice: Dashboard research distinguishes operational, analytical, narrative, and embedded dashboards. Coaching clients need an operational/narrative hybrid: what needs attention now, plus a clear sense of forward movement. Healthcare dashboard evaluation literature also warns that dashboards can fail when they create information overload or do not match the user's workflow.

Recommendation for Starship:

- Client Home should show:
  - Next assignment due.
  - Weekly tracker status.
  - Upcoming call prep.
  - Open action items.
  - One progress snapshot tied to the Legacy Roadmap.
  - Recently added insight or recommended video.
- Use progressive disclosure: clicking a card opens detail. Do not place full journal entries, full metric charts, and full video lists on the home screen.
- Use clear status language: Not started, Draft, Submitted, Complete, Needs coach review, Reviewed.

Maps to:

- Due dates
- Completion states
- Weekly tracker
- Progress metrics
- Video library surfacing

Anti-patterns:

- "Analytics wall" with many charts and no obvious next action.
- Streak pressure as the main motivator.
- Red-heavy overdue design that shames clients instead of helping them recover.

### 3. Use Humane Accountability UX

Best practice: Self-Determination Theory suggests people engage better when experiences support autonomy, competence, and relatedness. Behavior-change taxonomies and persuasive systems design commonly use prompts/cues, self-monitoring, feedback on behavior, goal setting, action planning, reminders, tailoring, and review of goals. The key UX risk is shifting from support into control.

Recommendation for Starship:

- Autonomy: let clients choose reminder channel, quiet hours, and whether a journal entry is private, shared, or shared after submission.
- Competence: break assignments into doable steps: read prompt, draft reflection, submit/complete, review coach response.
- Relatedness: use coach-authored prompt framing and personal roadmap language so the app feels like an extension of the coaching relationship.
- Recovery: if overdue, offer "Need more time?", "Mark blocked", or "Ask coach a question" instead of only showing failure.
- Reflection: after a completion, show "What changed?" or "What do you want to carry into the next call?" rather than only a checkbox.

Maps to:

- Prompt due dates
- Weekly tracker reminders
- Completion states
- Coach alerts
- Progress metrics

Anti-patterns:

- Punitive overdue states.
- Public leaderboards, points, or badges for intimate coaching work.
- Daily notification spam.
- Completion without meaning, where the client can check a box without reflecting.

### 4. Make Journal Privacy Explicit And Granular

Best practice: Journaling apps are privacy-sensitive because entries can include deeply personal thoughts. Recent mental-health/life-coaching app privacy research highlights transparency gaps, hidden trackers, broad permissions, and unclear third-party AI processing as major risks. Modern journaling apps such as Apple Journal and Day One emphasize locking, encryption, reminders, and user trust.

Recommendation for Starship:

- Every journal entry should show its visibility state near the title:
  - Private draft
  - Shared with coach
  - Submitted assignment
  - Coach-reviewed
- Default new entries to "private draft" until the client submits or explicitly shares.
- If AI summarization is used, disclose where processing happens and whether the coach can see the summary, original entry, or both.
- Avoid unnecessary permissions. A web app should not ask for contacts, location, microphone, or camera unless a specific feature requires it.
- Provide export and deletion flows early, even if basic.
- Use a coach-access audit trail: client can see when an entry was submitted and when coach reviewed/responded.

Maps to:

- Journal entries
- Reflection archive
- Coach alerts
- AI/fathom-derived insights

Anti-patterns:

- Ambiguous "complete" button that silently shares private text.
- AI-generated emotional labels with no way to edit, reject, or hide them.
- Mixing private notes and submitted assignments in one feed without clear labels.
- Using third-party analytics that capture entry content or prompt responses.

### 5. Treat Completion As A State Machine

Best practice: Task-oriented systems work better when status is explicit, reversible where appropriate, and connected to notifications. Completion is not one thing in Starship: a client may complete a journal, submit a check-in, finish an action item, watch a video, or close a roadmap milestone.

Recommendation for Starship:

Use status states per object:

- Assignment: Not started -> Draft -> Submitted -> Coach reviewed -> Closed.
- Weekly Check-In: Not opened -> In progress -> Submitted -> Used in call.
- Action Item: Open -> Done -> Verified/Discussed.
- Roadmap Item: Not started -> In progress -> Evidence added -> Reviewed -> Integrated.
- Video: Recommended -> Saved -> Watched -> Reflected.

Coach alerts should fire on meaningful transitions:

- Assignment submitted.
- Weekly check-in submitted.
- Client asks a pre-call question.
- Client marks action item done.
- Roadmap evidence added.
- Client flags blocked/stuck.

Maps to:

- "hit complete in some form"
- Coach alerts
- Action item tracking
- Roadmap progress

Anti-patterns:

- One universal Complete boolean for every object.
- Alerts for every tiny edit, creating coach notification fatigue.
- No way to tell whether the coach has reviewed a submitted item.

### 6. Make Pre-Call Check-Ins Lightweight And Predictable

Best practice: Form design guidance from public-sector design systems favors one primary question per step when cognitive load is high, plain labels, clear error messages, saved progress, and task-list patterns for multi-step flows. Coaching pre-call prep should be short enough that clients actually complete it.

Recommendation for Starship:

Weekly Check-In MVP fields:

- What do you want to focus on in our next call?
- What questions do you want to bring?
- What felt most alive or important this week?
- What did you complete?
- Where are you stuck?
- Optional rating: energy/clarity/alignment/progress.

UX details:

- Allow save-and-return.
- Show estimated time, ideally 3-5 minutes.
- Send reminder at a predictable time chosen by the coach/client.
- Pre-fill prior open action items so client can update them inline.
- Show submitted check-in on the coach's call prep view.

Maps to:

- Input questions before calls
- Area of focus before calls
- Weekly tracker reminders
- Accountability

Anti-patterns:

- Long weekly forms that feel like homework bureaucracy.
- Required numeric ratings without enough context.
- Sending reminders without a direct deep link to the form.

### 7. Use Notifications As A Triage System

Best practice: Notification research and messaging-compliance guidance point to a few consistent principles: get consent, respect opt-out, avoid overload, match urgency to channel, batch low-priority events, and make notification content actionable. SMS especially requires careful consent and opt-out handling.

Recommendation for Starship:

- Use in-app notifications for most activity.
- Use email for summaries and less urgent reminders.
- Use SMS only for client-consented due reminders and action item nudges.
- Add quiet hours and reminder windows.
- Bundle coach notifications into an Attention Queue where possible.
- Let coach set per-client reminder cadence.
- Include a direct link to the assignment/check-in/action item.
- Support STOP/HELP semantics and opt-out records if SMS is used through a provider such as Twilio.

Coach alert priorities:

- High: client says blocked/stuck; pre-call question submitted near call; overdue high-priority assignment.
- Medium: assignment/check-in submitted; action item done.
- Low: video watched; draft started; routine progress update.

Maps to:

- Coach alerted on completion
- Weekly tracker reminders
- Texting action items
- Accountability

Anti-patterns:

- Texting full sensitive action details without consent or privacy review.
- No opt-out or quiet hours.
- Coach alert feed filled with routine edits.
- Reminders that say "You are late" rather than "Ready to return to this?"

### 8. Make Progress Visible Through Evidence, Not Just Scores

Best practice: Self-monitoring and feedback are common behavior-change techniques, but progress dashboards can demotivate when metrics are opaque, overly reductive, or disconnected from personal goals. Coaching progress is often qualitative and developmental, so metrics should combine stage, evidence, and reflection.

Recommendation for Starship:

- Show "Current state", "Desired state", "Gap closing", and "Next movement" for each roadmap area.
- Tie progress to evidence:
  - journal entry submitted
  - insight captured from call
  - action item completed
  - coach note/review
  - roadmap workbook milestone updated
- Use a small set of coach-defined dimensions rather than many generic metrics.
- Prefer simple visual forms:
  - milestone checklist
  - progress bar per roadmap phase
  - before/now/next cards
  - gap-closing timeline
- Let clients click a progress item to see the supporting reflections and actions.

Maps to:

- "where they are now, to where they're going"
- "gaps that they're closing"
- Legacy Roadmap workbook progression

Anti-patterns:

- Treating transformation as a single percentage complete.
- Showing scores without explaining what changed.
- Over-reliance on streaks or vanity activity counts.
- Metrics that coach can manipulate but client cannot understand.

### 9. Design The Coach Workspace For Attention, Not Surveillance

Best practice: Operational dashboards should support decisions and workflow. Coaches need triage: who needs attention, what changed, and what should shape the next interaction.

Recommendation for Starship:

Coach Workspace should prioritize:

- Upcoming calls needing prep.
- Recently submitted assignments/check-ins.
- Clients with overdue or blocked items.
- Imported Fathom insights needing review.
- Action items due soon.
- Roadmap changes needing approval.

For each client, show:

- Next call date.
- Last contact / last completed assignment.
- Current roadmap focus.
- Open action items.
- Recent insight themes.
- Alerts requiring coach response.

Maps to:

- Coach alerts
- Pre-call questions
- Weekly tracker
- Fathom insights
- Roadmap updates

Anti-patterns:

- Coach feed sorted only by time, where high-importance items disappear.
- Showing too much private client text in a roster-level list.
- No review state for AI-imported insights.

### 10. Keep AI And Imported Insights Reviewable

Best practice: LLM meeting recap research shows promise for summaries, highlights, and action items, but also warns about personal relevance, missed details, and misattribution. Journaling LLM research suggests AI can help enrich records when constrained and designed with professional guidance, but it should not replace human judgment.

Recommendation for Starship:

- Treat Fathom imports as draft insights until coach review.
- Separate insight types:
  - Internal world: beliefs, emotions, identity, patterns, internal shifts.
  - External world: decisions, business/family/logistical events, commitments, milestones.
  - Roadmap update: change tied to Legacy Roadmap.
  - Action item: concrete next action with owner/due date.
- Show source snippets or timestamps where possible.
- Allow coach to edit, approve, reject, tag, and assign insights.
- Do not text action items until they have been confirmed by coach or client.
- Label AI-generated content clearly.

Maps to:

- Pull key insights from Fathom
- Thought models
- Legacy Roadmap updates
- Track action items
- Text clients what they are supposed to do

Anti-patterns:

- AI-generated insights appearing as facts.
- Assigning emotional interpretations without review.
- Misattributing action items to the client.
- Sending automated texts from raw transcript extraction.

### 11. Build The Library Around Topics And Moments Of Need

Best practice: Learning libraries are most useful when users can search, filter, and receive contextual recommendations. A coaching library should not be merely a file dump.

Recommendation for Starship:

- Organize videos by:
  - topic
  - framework
  - cosmology category
  - roadmap stage
  - recommended after specific prompts/action items
  - coach-curated playlists
- Provide resource cards with title, short description, duration, tags, and "why recommended".
- Let coaches attach videos to assignments, action items, roadmap stages, and call recaps.
- Track watched/saved/reflected states lightly, not as punitive compliance.

Maps to:

- Framework/cosmology video database
- Rewatchable library
- Pointed to different topics

Anti-patterns:

- Folder-only hierarchy with vague names.
- No search or tags.
- Auto-play or forced completion gates for reflective material.

### 12. Accessibility Is A Core Product Requirement

Best practice: WCAG 2.2 emphasizes perceivable, operable, understandable, and robust interfaces. Starship will include forms, status messages, reminders, videos, and potentially sensitive content, so accessibility affects trust and completion.

Recommendation for Starship:

- Meet WCAG 2.2 AA as a baseline.
- Provide captions/transcripts for videos.
- Make status changes screen-reader friendly.
- Use clear labels and error messages.
- Avoid color-only status indicators.
- Ensure keyboard navigation for forms and dashboards.
- Support mobile-first completion of check-ins and assignments.
- Avoid tiny tap targets, especially for completion and status actions.

Maps to:

- Journal assignments
- Weekly tracker
- Video library
- Progress view
- Completion states

Anti-patterns:

- Status only communicated by color.
- Video teachings without captions.
- Long unstructured text forms that lose draft content.
- Mobile layouts where due-date actions are hard to tap.

## MVP Product Recommendations

### MVP Client Experience

Build these first:

1. Client Home with next actions.
2. Assignment detail with prompt, due date, journal draft, submit/complete.
3. Journal archive with filters.
4. Weekly Check-In form and reminder state.
5. Action item list with due dates and completion.
6. Simple Roadmap progress view.
7. Video library with tags and coach recommendations.
8. Notification preferences.

### MVP Coach Experience

Build these first:

1. Client roster with attention indicators.
2. Assignment creation with prompt templates and due dates.
3. Submission alerts and review flow.
4. Weekly check-in review view.
5. Action item creation/editing.
6. Roadmap progress editor.
7. Library resource tagging/recommendation.
8. Notification settings and alert queue.

### Post-MVP

- Fathom API/integration automation.
- AI-assisted insight extraction.
- Coach approval workflow for imported call insights.
- SMS action item nudges.
- Deeper progress analytics.
- Google Sheets Legacy Roadmap sync.
- Advanced search across journal, calls, roadmap, and videos.

## Suggested UX Flows

### Flow: Coach Assigns Journal Prompt

1. Coach chooses client.
2. Coach selects or writes prompt.
3. Coach sets due date and optional recommended video/framework.
4. Client sees assignment on Home and Assignments.
5. Client drafts privately.
6. Client submits.
7. Coach gets alert.
8. Coach reviews and optionally responds.
9. Entry becomes part of client Reflection Library and, if relevant, Roadmap evidence.

### Flow: Weekly Check-In

1. System creates weekly check-in instance.
2. Reminder is sent based on preferences.
3. Client opens deep link.
4. Client answers focus/questions/progress/blockers.
5. Client submits.
6. Coach sees check-in in Upcoming Call Prep.
7. After call, coach can link insights/action items back to the check-in.

### Flow: Action Item From Call

1. Call recap is imported or created.
2. System/coach identifies possible action item.
3. Coach reviews owner, wording, due date, reminder channel.
4. Action item appears for client.
5. SMS/email/in-app reminder fires if consented.
6. Client marks done, blocked, or asks a question.
7. Coach sees status in Attention Queue.

### Flow: Roadmap Progress

1. Legacy Roadmap item is imported or manually created.
2. Coach assigns current stage/status.
3. Client sees current state, desired state, gap, and next movement.
4. Journal entries, call insights, and action items can be attached as evidence.
5. Coach reviews stage changes.
6. Client sees a narrative timeline of progress.

## Open Product Questions For Later Agents

- Who exactly can see journal entries: only assigned coach, all internal team members, or client-selected viewers?
- Does "complete" mean submitted to coach, personally done, or reviewed by coach?
- Are clients expecting SMS by default, or should SMS be opt-in only?
- What is the minimum useful Legacy Roadmap schema: phases, milestones, metrics, or workbook cells?
- How should Starship phrase "internal world" and "external world" in client-facing language?
- Are videos hosted in Starship, embedded from an existing platform, or referenced as external links?
- Is the first version a single-coach/single-practice tool or multi-coach organization platform?
- Should clients be able to comment back on coach reviews?
- Should coach alerts be real-time or batched digest by default?

## UX Acceptance Criteria For Implementation Agents

- A client can always tell what is due next.
- A client can save a journal draft without sharing it.
- A client can submit/complete an assignment and see confirmation.
- A coach can see completed assignments without scanning all client records.
- A weekly check-in can be completed on mobile in under five minutes.
- Reminder preferences include channel and quiet-hour controls before SMS is enabled.
- Progress view explains "now", "next", and "gap" in human language.
- Roadmap progress is backed by visible evidence or coach notes.
- AI/imported insights are labeled and reviewable before client-facing action.
- Video resources are searchable and taggable.
- Status is never communicated by color alone.
- Empty states explain what to do next without sounding like marketing copy.

## Risks To Track

- Privacy risk: journal entries and coaching reflections are highly sensitive.
- Trust risk: AI summaries or insight labels may feel invasive if not reviewed and transparent.
- Notification fatigue: reminders and alerts can become noise.
- Coach overload: too many alerts can make the system feel like another inbox.
- Metric distortion: over-quantifying personal transformation can reduce nuance.
- Library sprawl: videos become unusable if not tagged and recommended by context.
- Ambiguous completion: clients and coaches may mean different things by complete.
- Workbook dependency: Legacy Roadmap data may be hard to structure if the source sheet is inconsistent.

## Bottom Line

The best Starship UX is a guided coaching workspace with a small number of high-trust loops: assign, reflect, submit, review, extract insight, choose next action, track progress, revisit resources. The product should make accountability feel supportive and personal, with enough structure for coaches to act quickly and enough privacy/control for clients to feel safe using it honestly.
