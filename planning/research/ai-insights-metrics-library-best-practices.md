# AI Insights, Metrics, and Video Library Best Practices

Research Agent 4 summary for Starship.

Source requirement file: `planning/requirements-transcript.md`  
Research date: 2026-07-08

## Scope

This brief covers best practices for:

- Pulling call recordings/transcripts from Fathom or adjacent meeting-intelligence tools.
- Extracting action items and coaching insights from transcripts.
- Classifying insights as internal-world, external-world, thought-model related, or Legacy Roadmap related.
- Routing AI outputs through human-in-the-loop review before clients are notified or records are updated.
- Designing transformation metrics, gap tracking, and visible progress models.
- Building a recorded video knowledge library with tagging, search, topic recommendations, transcripts, and chapters.

## Executive Recommendations

1. Treat meeting intelligence as a reviewed evidence pipeline, not an autopilot.
   Ingest transcript, summary, recording metadata, and action items; extract structured candidates; preserve source timestamps; then require coach review for anything that changes a client roadmap, creates an accountability item, or sends a message.

2. Use strict structured output schemas for extraction.
   OpenAI's Structured Outputs guidance states that schema-constrained outputs are designed to adhere to developer-supplied JSON Schema, while JSON mode only guarantees valid JSON. Starship should use schemas for action items, insights, roadmap updates, thought model links, and confidence/evidence fields. Source: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

3. Separate "insights" from "decisions" from "tasks."
   A coaching call can produce reflective insight, contextual fact, a possible roadmap change, a coach decision, and a client task. These should be separate objects with explicit links instead of one flattened call summary.

4. Use a transformation metric model based on current state, desired state, gap, evidence, and trend.
   Avoid a single vague progress score. Use goal-attainment style scales for individualized goals, plus recurring rubric dimensions that can be compared over time.

5. Build video search from metadata plus transcripts plus human curation.
   Each video should have title, description, framework/topic tags, audience stage, transcript, AI-generated chapters, coach-approved topic summary, and vector-search embeddings. Recommendations should be explainable: "recommended because your current focus is X and this segment covers Y."

6. Build evals and audit logs from day one.
   OpenAI's eval guidance frames evaluations as a way to test outputs against expected style/content criteria and iterate. Starship should keep a gold set of reviewed transcripts and measure extraction precision, recall, false task creation, incorrect owner assignment, and roadmap-link accuracy. Source: [OpenAI Evals](https://developers.openai.com/api/docs/guides/evals).

7. Apply AI risk management proportional to impact.
   NIST's AI RMF is intended to improve trustworthiness considerations in the design, development, use, and evaluation of AI systems, and NIST released a generative AI profile in 2024. For Starship, higher-impact outputs need stronger human review. Source: [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework).

## Requirements Mapping

| Requirement | Research-backed recommendation |
| --- | --- |
| Pull key insights from Fathom recordings | Use connector-based ingestion first: Fathom transcript, AI summary, recording, and action-item triggers are available through Zapier templates. Store raw source artifacts and process into structured candidate records. |
| Capture internal and external insights | Maintain an insight taxonomy with `internal_world`, `external_world`, `thought_model`, `roadmap`, and `relationship/system` categories. Require evidence quotes/timestamps and reviewer confirmation. |
| Link insights to thought models and Legacy Roadmap updates | Build a controlled vocabulary for thought models and roadmap dimensions. Use AI to suggest links, but treat roadmap changes as review-required events. |
| Track action items from calls | Extract task candidates with owner, due date, source timestamp, exact evidence, status, reminder channel, and reviewer state. Do not text action items until approved. |
| Text clients what they are supposed to do | Use consent-based SMS with opt-in/opt-out handling. Twilio documents standard opt-out keyword handling for STOP/UNSUBSCRIBE/END/QUIT/etc. Source: [Twilio Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out). |
| Show current state, destination, and gaps being closed | Use per-goal current/target scores, milestone evidence, qualitative journal evidence, and trend over time. Goal Attainment Scaling is a useful model for individualized client progress. |
| House videos and point clients to topics | Use a video CMS-style model: metadata, transcript search, chapters/key moments, tags, collections, playlists, and recommendation reasons. Wistia emphasizes structured video metadata including title, description, thumbnail, captions/transcripts, duration, and chapters/key moments. Source: [Wistia Video SEO](https://wistia.com/learn/marketing/video-seo). |

## Fathom and Transcript Ingestion

### Best Practice

Start with an ingestion adapter layer rather than wiring business logic directly to Fathom. Starship should support:

- Fathom transcript file ingestion.
- Fathom AI summary ingestion.
- Fathom recording file or link ingestion.
- Fathom action item ingestion.
- Manual upload fallback for transcripts.
- Later direct API/webhook adapter if Fathom exposes the needed endpoints to the account.

Zapier currently lists Fathom workflows that create Google Docs from new transcripts, upload recordings/transcripts to Google Drive, create Notion items from new AI summaries, send Slack messages for AI summaries, and create Asana tasks for every new action item. Source: [Zapier Fathom integrations](https://zapier.com/apps/fathom/integrations).

### Recommended Data Flow

1. `meeting_source` record is created.
   Store provider, external id, title, participants, start/end time, recording URL, transcript URL, summary URL, and ingestion status.

2. Raw transcript is archived.
   Keep exact transcript text, speaker labels, timestamps when available, and source hash. This makes later audit and reprocessing possible.

3. AI extraction creates candidate objects.
   Candidate objects are not yet client-visible:
   - `action_item_candidate`
   - `insight_candidate`
   - `roadmap_update_candidate`
   - `thought_model_link_candidate`
   - `video_recommendation_candidate`

4. Human reviewer confirms, edits, rejects, or merges candidates.
   Confirmed records become durable coaching records and may trigger reminders/texts.

5. Notifications run from confirmed records.
   Clients should receive reviewed action items, not raw AI extraction.

### Transcript Chunking

Long calls should be split by topic, timestamp windows, and speaker turns. Research on meeting summarization repeatedly points to the challenge of long meeting transcripts and the usefulness of sectioning long meetings before producing final summaries or action-item-driven summaries. A practical Starship implementation should:

- Break transcripts into 5-12 minute windows or topic sections.
- Extract candidates per window.
- Merge duplicates across windows.
- Run a final pass that resolves cross-call context and contradictions.
- Preserve evidence at the smallest useful timestamp range.

Source context: [Action-Item-Driven Summarization of Long Meeting Transcripts](https://arxiv.org/abs/2312.17581).

## Structured Extraction Schema

### Action Item Candidate

Recommended fields:

- `source_meeting_id`
- `source_timestamp_start`
- `source_timestamp_end`
- `evidence_excerpt`
- `task_title`
- `task_description`
- `owner_type`: `client`, `coach`, `shared`, `unknown`
- `owner_person_id`
- `due_date`
- `due_date_basis`: `explicit`, `inferred`, `needs_review`
- `priority`: `low`, `normal`, `high`
- `status`: `candidate`, `approved`, `sent`, `completed`, `dismissed`
- `confidence`
- `review_required_reason`
- `client_message_draft`

Best practices:

- If no explicit owner exists, mark `unknown` and require review.
- If no explicit due date exists, do not invent one; use `needs_review`.
- Keep a separate client-facing message draft because transcript language may be too raw or intimate.
- Deduplicate by semantic similarity plus same owner/timeframe.

### Insight Candidate

Recommended fields:

- `source_meeting_id`
- `source_timestamp_start`
- `source_timestamp_end`
- `evidence_excerpt`
- `insight_title`
- `insight_summary`
- `insight_type`: `internal_world`, `external_world`, `thought_model`, `roadmap`, `relationship_system`, `practice_observation`
- `client_visibility`: `private_to_coach`, `shareable_with_client`, `needs_review`
- `sensitivity`: `low`, `medium`, `high`
- `linked_thought_model_ids`
- `linked_roadmap_dimension_ids`
- `suggested_metric_impacts`
- `confidence`
- `review_notes`

Best practices:

- Internal-world insights should be about beliefs, identity, emotional patterns, meaning-making, resistance, desire, or self-concept.
- External-world insights should be about circumstances, business/project facts, relationships, deadlines, behavior, resourcing, or environmental constraints.
- The same moment can produce both an internal and external insight. Store both but link them.
- Require coach review before labeling an insight as transformation evidence.

### Roadmap Update Candidate

Recommended fields:

- `legacy_roadmap_client_id`
- `dimension`
- `current_state_before`
- `current_state_after`
- `evidence`
- `change_type`: `new_information`, `progress`, `blocker`, `reframe`, `completed`, `needs_followup`
- `confidence`
- `review_status`

Best practices:

- Treat roadmap updates as versioned events.
- Do not overwrite old roadmap values; append a new dated state.
- Keep a "why this changed" evidence field.

## Human-in-the-Loop Review

### Review Queue Design

Use a queue with severity/impact levels:

- Low impact: video topic tags, non-sensitive summary improvements. Can be auto-approved after confidence threshold once mature.
- Medium impact: action items, due date inference, video recommendations tied to current focus. Coach review required in early product.
- High impact: roadmap updates, sensitive internal-world interpretations, texts to clients, metric score changes. Always require review.

NIST AI RMF emphasizes trustworthiness across design, development, use, and evaluation. OWASP's LLM Top 10 identifies prompt injection and insecure output handling as top risks. For Starship, this means raw transcripts and retrieved library content must be treated as untrusted input; AI output must be validated before it can update records or trigger messages. Sources: [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

### Review UI Requirements

The reviewer should see:

- The extracted candidate.
- The exact transcript evidence and timestamp.
- The relevant before/after roadmap context.
- Suggested client-facing wording.
- Confidence and why review is required.
- Buttons: approve, edit, dismiss, merge duplicate, mark sensitive, assign to client/coach.

### Audit Trail

Every AI-assisted record should include:

- Model/provider/version.
- Prompt/schema version.
- Source artifact hash.
- Generated timestamp.
- Reviewer id.
- Review action and timestamp.
- Final client-visible text.

This makes iteration, debugging, and coaching ethics easier.

## Metrics and Transformation Progress

### Best Practice

Use a layered progress model:

1. Individualized client goals.
   Each goal has a current state, target state, gap, evidence, next action, and confidence.

2. Stable roadmap dimensions.
   Each client can be compared against their own progression across dimensions from the Legacy Roadmap.

3. Behavioral/accountability metrics.
   Track completion rates, reflection frequency, pre-call check-in consistency, follow-through on action items, and response time.

4. Qualitative transformation evidence.
   Journal entries, call insights, coach observations, and milestone notes.

5. Narrative progress.
   A human-readable "what changed" timeline that clients can revisit.

Goal Attainment Scaling is a strong reference model because it supports individualized goals while making progress measurable with defined levels from below-baseline to better-than-expected outcomes. Source: [Goal Attainment Scaling overview](https://en.wikipedia.org/wiki/Goal_attainment_scaling).

ICF's coaching competencies emphasize translating insights into action steps, encouraging accountability, celebrating progress, helping clients set clear goals, and committing to specific actions. Starship's metrics should therefore make growth visible without making clients feel reduced to a score. Source: [ICF Core Competencies](https://coachingfederation.org/credentialing/coaching-competencies/icf-core-competencies/).

### Recommended Metric Objects

#### Goal

- `goal_title`
- `why_it_matters`
- `roadmap_dimension`
- `current_state`
- `desired_state`
- `gap_statement`
- `target_date`
- `status`
- `owner`
- `evidence_records`

#### Goal Scale

Use a 5-point scale inspired by Goal Attainment Scaling:

- `-2`: baseline or regressed state
- `-1`: early movement
- `0`: expected milestone
- `+1`: ahead of expected milestone
- `+2`: integrated or better-than-expected milestone

Each level needs plain-language behavioral anchors written for that client. Example:

- `-2`: avoids the weekly focus conversation.
- `-1`: identifies the topic but does not choose a next action.
- `0`: chooses and completes one aligned action this week.
- `+1`: completes the action and reflects on the internal pattern it revealed.
- `+2`: repeats the behavior without external prompting and updates the roadmap with evidence.

#### Progress Snapshot

- `now`: latest score and narrative.
- `destination`: target state and why it matters.
- `gap`: remaining distance, blockers, next smallest step.
- `closed_gap`: what has visibly changed since baseline.
- `evidence`: journal entries, calls, tasks, coach notes.

### Anti-Patterns

- One global "transformation score" with no evidence.
- AI-scored emotional/identity labels with no coach review.
- Overweighting task completion while ignoring qualitative insight.
- Showing clients raw confidence percentages as if they are objective truth.
- Changing roadmap status silently without showing why.

## Video Knowledge Library

### Best Practice

Treat videos as first-class learning objects, not files in a folder. A useful Starship video object should include:

- Title.
- Short description.
- Framework/cosmology topic tags.
- Audience/stage tags.
- Transcript.
- Chapters/key moments.
- Thumbnail.
- Duration.
- Speaker/teacher.
- Related thought models.
- Related roadmap dimensions.
- Prerequisites.
- Follow-up practices or journal prompts.
- Visibility/permission group.
- Recommendation rules.

Wistia's video guidance highlights the importance of structured metadata such as title, description, thumbnail, captions/transcripts, duration, upload date, and chapters/key moments. Starship can adapt these same practices for internal discovery, not only public SEO. Source: [Wistia Video SEO](https://wistia.com/learn/marketing/video-seo).

### Tagging Model

Use three layers:

1. Controlled taxonomy.
   Examples: `legacy_roadmap`, `identity`, `offers`, `resistance`, `cosmology`, `relationship`, `visibility`, `money`, `decision_making`, `practice`.

2. AI-suggested tags.
   Generated from transcript and chapter summaries.

3. Human-approved tags.
   Coach or content owner approves tags that affect recommendations.

Each tag should have:

- Canonical name.
- Synonyms.
- Description.
- Parent tag.
- Related thought models.
- Related roadmap dimensions.

### Search

Support both:

- Keyword search over title, description, transcript, tags, speaker, and chapter text.
- Semantic search over transcript chunks and summaries.

Search results should show:

- Why the video matched.
- Relevant chapter timestamp.
- Topic tags.
- Estimated time commitment.
- Whether the coach recommended it.

### Recommendations

Recommendation inputs:

- Client's current focus area.
- Pre-call questions.
- Recent call insights.
- Current roadmap gap.
- Journal themes.
- Incomplete assignments.
- Coach-selected topics.

Recommendation outputs:

- Video or chapter.
- Reason for recommendation.
- Suggested prompt or practice.
- Whether it should be required or optional.
- Expiration/relevance window.

Best practice: recommend short chapters when possible rather than full long videos. This reduces overwhelm and makes the library feel personally useful.

## Security, Privacy, and Consent Considerations

Starship will hold intimate coaching data, transcripts, journal entries, and transformation notes. Best practices:

- Store raw transcripts and generated insights separately from client-facing summaries.
- Use role-based access: client, coach, admin, content manager.
- Require consent for recording ingestion and SMS reminders.
- Preserve SMS opt-out support before sending texts. Twilio documents default handling for standard opt-out keywords such as STOP, UNSUBSCRIBE, END, QUIT, STOPALL, REVOKE, OPTOUT, and CANCEL. Source: [Twilio Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out).
- Redact or minimize sensitive transcript snippets in logs.
- Never send sensitive internal-world interpretations over SMS.
- Keep client-facing notifications short and link back to the secure app.
- Validate AI outputs before using them in downstream systems, aligning with OWASP concerns around insecure output handling. Source: [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

## Evaluation Plan

Create a reviewed benchmark set:

- 20-50 past call transcripts, if available and permitted.
- Human-labeled action items.
- Human-labeled internal/external insights.
- Human-labeled roadmap changes.
- Human-labeled thought model links.
- Human-labeled ideal video recommendations.

Track:

- Action item precision: approved action items / generated action items.
- Action item recall: found action items / true action items.
- Owner accuracy.
- Due date accuracy.
- Internal vs external classification accuracy.
- Roadmap link accuracy.
- False sensitive inference count.
- Reviewer edit distance.
- Text notification approval rate.
- Video recommendation acceptance/usefulness.

OpenAI's eval guidance recommends testing outputs against specified criteria, analyzing results, and iterating prompts or models. This should become a normal release gate for extraction changes. Source: [OpenAI Evals](https://developers.openai.com/api/docs/guides/evals).

## Implementation Notes for Future Agents

### Minimum Viable AI Pipeline

1. Manual or Zapier-based transcript ingestion.
2. Store raw transcript and meeting metadata.
3. Run structured extraction for action items and insights.
4. Show coach review queue.
5. Approve action items.
6. Send approved reminders through SMS/app notification.
7. Convert approved insights into progress evidence.
8. Recommend library videos manually or semi-automatically from approved tags.

### Data Model Priorities

Build these first:

- `client`
- `meeting`
- `transcript`
- `action_item`
- `insight`
- `roadmap_dimension`
- `roadmap_event`
- `thought_model`
- `metric_snapshot`
- `video`
- `video_chapter`
- `tag`
- `recommendation`
- `review_event`
- `notification`

### Workflow Priorities

1. Coach reviews extracted call outputs.
2. Client sees approved action items.
3. Client receives reminder texts.
4. Client marks action item complete.
5. Coach receives completion alert.
6. Progress timeline updates with evidence.
7. Client can search or receive recommended videos.

## Anti-Patterns to Avoid

- Sending AI-extracted action items directly to clients without review.
- Using raw Fathom summaries as the system of record.
- Treating transcript snippets as always accurate; speaker diarization and transcription can be wrong.
- Inventing due dates, owners, or commitments not present in the call.
- Auto-labeling sensitive psychological interpretations as fact.
- Flattening all insights into one "summary" field.
- Letting tags sprawl without a controlled taxonomy.
- Recommending entire hour-long videos when a 4-minute segment is enough.
- Hiding why a metric changed.
- Building progress metrics before defining what each metric means behaviorally.
- Ignoring SMS consent, opt-out, and message logs.
- Reprocessing old transcripts without tracking prompt/model/schema version.

## Source Links

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Evals](https://developers.openai.com/api/docs/guides/evals)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Zapier Fathom Integrations](https://zapier.com/apps/fathom/integrations)
- [Twilio Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out)
- [ICF Core Competencies](https://coachingfederation.org/credentialing/coaching-competencies/icf-core-competencies/)
- [Wistia Video SEO and Metadata Guidance](https://wistia.com/learn/marketing/video-seo)
- [Action-Item-Driven Summarization of Long Meeting Transcripts](https://arxiv.org/abs/2312.17581)
- [Meeting Action Item Detection with Regularized Context Modeling](https://arxiv.org/abs/2303.16763)
- [Goal Attainment Scaling overview](https://en.wikipedia.org/wiki/Goal_attainment_scaling)
