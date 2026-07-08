# Starship Implementation Plan: AI Insights, Metrics, Roadmap, and Video Library

Planning Agent 4 output.  
Created: 2026-07-08  
Source requirements: `planning/requirements-transcript.md`  
Research inputs:

- `planning/research/ai-insights-metrics-library-best-practices.md`
- `planning/research/product-ux-best-practices.md`
- `planning/research/data-privacy-security-best-practices.md`
- `planning/research/integrations-automation-best-practices.md`

## Scope

This plan covers the Starship MVP areas related to:

- Fathom transcript and recording intelligence.
- Internal-world and external-world insight extraction.
- Action item extraction, review, approval, and client-facing publication.
- Legacy Roadmap progression and gap tracking.
- Progress metrics that show current state, desired state, closed gaps, and next movement.
- Framework/cosmology video library, topic tagging, search, and recommendations.
- Seed data and deterministic mock extraction for a local-first web MVP.

This plan intentionally does not edit or redefine the source context files under `context/source`.

## Product Direction

Build the MVP as a local-first web app that proves the full coaching workflow with deterministic fixtures before adding live AI or third-party integrations.

The first working version should let a coach import or select a mock call transcript, generate structured candidate insights/action items through a deterministic extractor, review each candidate, approve or edit records, and see those approved records feed the client progress view and video recommendations.

The app should feel like a coaching workspace, not an analytics system. Every metric needs a human explanation and visible evidence. Every AI-derived output needs provenance and review state.

## Guiding Rules

- Raw artifacts are never the source of truth for coaching records.
- AI or mock extraction creates candidates, not final client-facing records.
- Action items, roadmap updates, metric changes, and sensitive internal-world insights require human approval.
- SMS-ready copy must be short, non-sensitive, and separate from the full action item text.
- Legacy Roadmap progress is append-only and evidence-backed; do not silently overwrite past states.
- Video recommendations must explain why they were suggested.
- Seed and fixture data must be synthetic and clearly fake.

## Recommended MVP Modules

### 1. Transcript Intelligence Module

Purpose: ingest a transcript-like artifact, segment it, run deterministic mock extraction, and create reviewable candidates.

Suggested source paths once the app exists:

- `src/features/transcripts`
- `src/features/ai-extraction`
- `src/data/fixtures/transcripts`
- `src/lib/mock-extractors`

Core screens:

- Coach call artifact list.
- Call artifact detail.
- Extraction results review queue.
- Candidate evidence panel with timestamp and speaker.

Core services:

- `transcriptRepository`: stores meetings, raw transcript text, segments, and source metadata.
- `transcriptSegmenter`: splits transcript into timestamped speaker turns or topic windows.
- `mockExtractionService`: deterministically returns candidates from fixture transcripts.
- `candidateRepository`: stores extracted candidates with evidence and review state.

### 2. Review and Approval Module

Purpose: turn extracted candidates into trusted coaching records.

Suggested source paths:

- `src/features/review-queue`
- `src/features/action-items`
- `src/features/insights`
- `src/features/roadmap-review`

Core screens:

- Coach review queue grouped by call and client.
- Candidate detail with source evidence.
- Edit/approve/dismiss/merge controls.
- Approved item history.

Core services:

- `reviewQueueService`: lists candidates by impact, type, and status.
- `approvalService`: validates and promotes candidates to durable records.
- `auditEventService`: records creation, review, edit, approval, dismissal, and publication events.

### 3. Metrics and Gap Tracking Module

Purpose: show current state, desired state, gaps, closed gaps, and evidence over time.

Suggested source paths:

- `src/features/progress`
- `src/features/metrics`
- `src/features/evidence`

Core screens:

- Client progress overview.
- Coach roadmap/progress editor.
- Goal detail with evidence timeline.
- Gap detail view.

Core services:

- `metricDefinitionRepository`: manages stable metric/rubric definitions.
- `metricSnapshotRepository`: stores dated client metric states.
- `progressNarrativeService`: builds plain-language progress summaries from snapshots and evidence.
- `evidenceLinkService`: links journals, call insights, action items, and roadmap events to progress.

### 4. Legacy Roadmap Module

Purpose: represent the workbook as normalized roadmap dimensions, milestones, snapshots, and progression events.

Suggested source paths:

- `src/features/legacy-roadmap`
- `src/data/fixtures/roadmap`
- `src/lib/roadmap-import`

Core screens:

- Client roadmap overview.
- Roadmap dimension detail.
- Coach import/seed preview.
- Roadmap update candidate review.

Core services:

- `roadmapImportService`: imports deterministic mock workbook rows from local JSON/CSV.
- `roadmapSnapshotRepository`: stores client roadmap snapshots.
- `roadmapEventRepository`: stores append-only changes and evidence.
- `roadmapDeltaService`: compares snapshots and proposes progression events.

### 5. Framework and Cosmology Library Module

Purpose: house framework/cosmology videos as structured learning resources with tags, chapters, search, and recommendations.

Suggested source paths:

- `src/features/library`
- `src/features/recommendations`
- `src/data/fixtures/videos`
- `src/data/fixtures/taxonomy`

Core screens:

- Client video library.
- Video detail with chapters, transcript, tags, and related roadmap dimensions.
- Coach video catalog manager.
- Recommendation panel on client home, roadmap detail, and call recap.

Core services:

- `videoRepository`: stores video metadata, transcripts, chapters, and visibility.
- `taxonomyService`: manages controlled topic tags and synonyms.
- `videoSearchService`: keyword search for MVP.
- `recommendationService`: deterministic topic/rule-based recommendations.

## Data Model

Use a local database or local JSON-backed repository for the earliest prototype, but model the entities as if they will move to a relational database. Every sensitive or derived object should carry provenance fields.

### Meeting and Transcript Entities

`MeetingSource`

- `id`
- `clientId`
- `coachId`
- `provider`: `manual_mock | fathom | google_drive`
- `externalId`
- `title`
- `startedAt`
- `endedAt`
- `participants`
- `recordingUrl`
- `transcriptUrl`
- `sourceHash`
- `ingestionStatus`: `draft | imported | segmented | extracted | reviewed | archived`
- `createdAt`
- `updatedAt`

`TranscriptSegment`

- `id`
- `meetingSourceId`
- `segmentIndex`
- `speakerLabel`
- `timestampStart`
- `timestampEnd`
- `text`
- `topicLabel`
- `sourceHash`

### Candidate Entities

`InsightCandidate`

- `id`
- `clientId`
- `meetingSourceId`
- `sourceSegmentIds`
- `timestampStart`
- `timestampEnd`
- `evidenceExcerpt`
- `title`
- `summary`
- `insightType`: `internal_world | external_world | thought_model | roadmap | relationship_system | practice_observation`
- `clientVisibility`: `private_to_coach | shareable_with_client | needs_review`
- `sensitivity`: `low | medium | high`
- `linkedThoughtModelIds`
- `linkedRoadmapDimensionIds`
- `suggestedMetricImpacts`
- `confidence`
- `reviewStatus`: `candidate | approved | edited | dismissed | merged`
- `reviewRequiredReason`
- `reviewNotes`
- `createdBy`: `mock_extractor | ai | coach`
- `createdAt`
- `reviewedAt`
- `reviewedBy`

`ActionItemCandidate`

- `id`
- `clientId`
- `meetingSourceId`
- `sourceSegmentIds`
- `timestampStart`
- `timestampEnd`
- `evidenceExcerpt`
- `taskTitle`
- `taskDescription`
- `ownerType`: `client | coach | shared | unknown`
- `ownerPersonId`
- `dueDate`
- `dueDateBasis`: `explicit | inferred | needs_review`
- `priority`: `low | normal | high`
- `clientMessageDraft`
- `sensitivity`: `low | medium | high`
- `confidence`
- `reviewStatus`: `candidate | approved | edited | dismissed | merged`
- `reviewRequiredReason`
- `createdAt`
- `reviewedAt`
- `reviewedBy`

`RoadmapUpdateCandidate`

- `id`
- `clientId`
- `meetingSourceId`
- `roadmapDimensionId`
- `currentStateBefore`
- `currentStateAfter`
- `changeType`: `new_information | progress | blocker | reframe | completed | needs_followup`
- `evidenceExcerpt`
- `confidence`
- `reviewStatus`
- `createdAt`
- `reviewedAt`
- `reviewedBy`

`VideoRecommendationCandidate`

- `id`
- `clientId`
- `sourceType`: `call_insight | roadmap_gap | pre_call_focus | journal_theme | coach_manual`
- `sourceId`
- `videoId`
- `chapterId`
- `topicTagIds`
- `reason`
- `suggestedPrompt`
- `recommendationStrength`: `light | normal | strong`
- `reviewStatus`: `candidate | approved | dismissed`
- `createdAt`
- `reviewedAt`

### Approved Record Entities

`Insight`

- Approved or coach-created version of an `InsightCandidate`.
- Required fields: `clientId`, `title`, `summary`, `insightType`, `sensitivity`, `visibility`, `evidenceLinks`, `linkedThoughtModelIds`, `linkedRoadmapDimensionIds`, `createdFromCandidateId`, `approvedBy`, `approvedAt`.

`ActionItem`

- Approved task object.
- Required fields: `clientId`, `ownerType`, `ownerPersonId`, `title`, `description`, `dueDate`, `status`, `sourceMeetingId`, `evidenceLinks`, `clientMessage`, `notificationPolicy`, `createdFromCandidateId`, `approvedAt`.

`RoadmapEvent`

- Append-only progress/change event.
- Required fields: `clientId`, `roadmapDimensionId`, `eventType`, `previousState`, `newState`, `evidenceLinks`, `coachNotes`, `createdFromCandidateId`, `approvedAt`.

### Metrics Entities

`MetricDefinition`

- `id`
- `name`
- `description`
- `roadmapDimensionId`
- `scaleType`: `goal_attainment_5_point | percent | checklist | narrative`
- `behavioralAnchors`
- `createdBy`
- `status`: `draft | active | archived`

`MetricSnapshot`

- `id`
- `clientId`
- `metricDefinitionId`
- `capturedAt`
- `currentValue`
- `targetValue`
- `baselineValue`
- `currentStateNarrative`
- `desiredStateNarrative`
- `gapStatement`
- `closedGapNarrative`
- `nextSmallestStep`
- `evidenceLinks`
- `provenance`: `coach_entry | approved_insight | roadmap_import | action_item_completion | mock_seed`
- `reviewStatus`: `draft | approved`

`ProgressEvidenceLink`

- `id`
- `clientId`
- `targetType`: `metric_snapshot | roadmap_event | goal | roadmap_dimension`
- `targetId`
- `evidenceType`: `journal_entry | insight | action_item | coach_note | roadmap_import | video_reflection`
- `evidenceId`
- `summary`
- `createdAt`

### Roadmap Entities

`RoadmapDimension`

- `id`
- `name`
- `description`
- `phase`
- `sortOrder`
- `defaultMetricDefinitionIds`
- `relatedThoughtModelIds`
- `relatedTopicTagIds`

`RoadmapSnapshot`

- `id`
- `clientId`
- `sourceType`: `mock_seed | google_sheet | manual`
- `sourceId`
- `capturedAt`
- `status`
- `dimensions`
- `sourceHash`

`RoadmapMilestone`

- `id`
- `roadmapDimensionId`
- `title`
- `description`
- `sortOrder`
- `completionCriteria`
- `relatedMetricDefinitionIds`

### Video Library Entities

`TopicTag`

- `id`
- `canonicalName`
- `description`
- `parentTagId`
- `synonyms`
- `relatedThoughtModelIds`
- `relatedRoadmapDimensionIds`

`VideoResource`

- `id`
- `title`
- `description`
- `category`: `framework | cosmology | practice | roadmap_training`
- `speaker`
- `durationSeconds`
- `thumbnailUrl`
- `videoUrl`
- `visibility`: `all_clients | selected_clients | coach_only`
- `topicTagIds`
- `relatedThoughtModelIds`
- `relatedRoadmapDimensionIds`
- `prerequisiteVideoIds`
- `followUpPromptIds`
- `createdAt`
- `updatedAt`

`VideoChapter`

- `id`
- `videoId`
- `title`
- `summary`
- `timestampStart`
- `timestampEnd`
- `topicTagIds`
- `transcriptExcerpt`

`VideoTranscriptChunk`

- `id`
- `videoId`
- `chapterId`
- `timestampStart`
- `timestampEnd`
- `text`
- `topicTagIds`

`VideoRecommendation`

- Approved recommendation visible to client.
- Required fields: `clientId`, `videoId`, `chapterId`, `reason`, `sourceType`, `sourceId`, `requiredOrOptional`, `status`, `expiresAt`, `approvedBy`, `approvedAt`.

## Deterministic Mock Extraction

The first implementation should avoid live AI calls. Use deterministic pattern and fixture based extraction so agents can build the full flow locally and write stable tests.

### Fixture Format

Create transcript fixtures with embedded markers in natural-ish text. Example:

```json
{
  "id": "mock-call-legacy-focus-001",
  "clientId": "client-ava",
  "coachId": "coach-bri",
  "title": "Legacy Roadmap focus call",
  "segments": [
    {
      "speakerLabel": "Client",
      "timestampStart": "00:04:20",
      "timestampEnd": "00:05:10",
      "text": "I keep noticing that when I talk about visibility, I immediately shrink back. [[insight:internal_world|identity,visibility|medium]]"
    },
    {
      "speakerLabel": "Coach",
      "timestampStart": "00:18:05",
      "timestampEnd": "00:18:50",
      "text": "Before next week, draft the first version of your offer story and bring it back. [[action:client|2026-07-15|normal|offers]]"
    }
  ]
}
```

Markers should be stripped from displayed transcript text and used only by the mock extractor.

### Mock Extractor Rules

- `[[insight:internal_world|tag1,tag2|sensitivity]]` creates an `InsightCandidate` with `insightType=internal_world`.
- `[[insight:external_world|tag1,tag2|sensitivity]]` creates an `InsightCandidate` with `insightType=external_world`.
- `[[thought_model:model_slug|tag1,tag2]]` creates an `InsightCandidate` with `insightType=thought_model`.
- `[[roadmap:dimension_slug|change_type|after_state]]` creates a `RoadmapUpdateCandidate`.
- `[[action:owner|due_date|priority|tag1,tag2]]` creates an `ActionItemCandidate`.
- `[[recommend:topic_slug|video_slug|chapter_slug]]` creates a `VideoRecommendationCandidate`.

### Later AI Replacement Boundary

The production AI extractor should implement the same interface as the mock extractor:

- Input: `MeetingSource` plus `TranscriptSegment[]`.
- Output: `InsightCandidate[]`, `ActionItemCandidate[]`, `RoadmapUpdateCandidate[]`, `VideoRecommendationCandidate[]`.
- Constraints: schema validated, provenance required, no direct publication.

This lets the team swap deterministic extraction for structured AI extraction without rewriting the review UI.

## Insight Classification Plan

### Internal-World Insight

Use for beliefs, identity shifts, emotional patterns, resistance, desire, meaning-making, self-concept, fear, confidence, or energetic patterns.

Client-facing label should be gentle. Consider "inner pattern" or "reflection theme" instead of exposing "internal world" as a rigid label.

Approval requirements:

- Always requires coach review in MVP.
- High-sensitivity items default to coach-only until explicitly shared.
- Must include evidence excerpt and timestamp.

### External-World Insight

Use for business facts, relationship dynamics, deadlines, offers, delivery commitments, resources, constraints, observable behavior, and logistical updates.

Approval requirements:

- Requires coach review if it changes roadmap, creates a task, or affects metrics.
- May be shared with client after approval.

### Thought Model Link

Use for moments connected to named Starship/Citizen/WorldCode thought models or frameworks.

Approval requirements:

- Coach approves links that drive recommendations or roadmap interpretation.
- Store links separately from the insight summary so tags can be revised without rewriting the insight.

### Roadmap Insight

Use for evidence that a Legacy Roadmap dimension has moved, stalled, reframed, or needs attention.

Approval requirements:

- Always review-required.
- Creates a `RoadmapUpdateCandidate`, not a direct roadmap state change.

## Review Workflow

1. Coach opens a call artifact.
2. Coach runs or re-runs deterministic extraction.
3. System creates candidates and groups them by type and impact.
4. Coach reviews candidate card:
   - candidate title and summary
   - source timestamp
   - evidence excerpt
   - linked roadmap dimension or topic tags
   - suggested client-visible wording
   - sensitivity and review reason
5. Coach chooses one action:
   - approve
   - edit and approve
   - dismiss
   - merge duplicate
   - mark sensitive
   - assign owner or due date
6. Approved records become visible in downstream areas:
   - insights timeline
   - action item list
   - roadmap progress
   - metric evidence
   - video recommendation list
7. Every decision writes an audit event.

## Action Item Review Plan

Action item candidates should not become client tasks until approved.

Validation rules:

- Owner cannot be `unknown` at approval time.
- Due date is optional only if coach explicitly chooses "no due date".
- Inferred due dates must be shown as inferred and require confirmation.
- Client message must pass sensitivity checks before notification.
- SMS template may include only task count, safe title, or secure link.

Status flow:

- Candidate: `candidate -> approved | dismissed | merged`
- Approved action item: `open -> done | blocked | canceled -> reviewed`

Coach controls:

- Edit title.
- Edit client-facing description.
- Set owner.
- Set due date.
- Set reminder channel eligibility.
- Mark sensitive to force app-only notification.

Client controls:

- Mark done.
- Mark blocked.
- Ask a question.
- Open linked evidence or related video if visible.

## Metrics and Gap Visualization

### Metric Design

Use a layered model:

- Individual goals: current state, desired state, gap, next step.
- Legacy Roadmap dimensions: phase or milestone progress.
- Accountability signals: action item completion, weekly tracker completion, journal submission.
- Qualitative evidence: approved insights, journal entries, coach notes, roadmap events.
- Narrative timeline: what changed and why it matters.

Do not use one global transformation score.

### Goal Attainment Scale

For subjective transformation goals, use a 5-point scale:

- `-2`: baseline or regressed state
- `-1`: early movement
- `0`: expected milestone
- `+1`: ahead of expected milestone
- `+2`: integrated or better-than-expected milestone

Every scale must have client-specific behavioral anchors. Example:

- `-2`: Avoids choosing a visible offer direction.
- `-1`: Names the offer direction but does not act on it.
- `0`: Publishes or shares one aligned offer draft.
- `+1`: Shares the offer and reflects on the internal pattern it surfaced.
- `+2`: Repeats the behavior without prompting and updates the roadmap with evidence.

### Gap Visualization MVP

Build simple, explainable views:

- "Now" card: latest approved metric state and narrative.
- "Destination" card: target state and why it matters.
- "Gap" card: remaining gap, blocker, or open question.
- "Closed gap" timeline: approved evidence of movement.
- Roadmap dimension progress bars or milestone checklists.

Avoid complex charts until real usage validates what is useful.

### Evidence Linking

Every progress change should link to at least one evidence item:

- approved insight
- action item completion
- journal entry
- coach note
- roadmap import snapshot
- video reflection

If a metric snapshot has no evidence, show it as draft or coach-entered, not as established progress.

## Legacy Roadmap Progression Plan

### MVP Import Strategy

Use seed files first, not live Google Sheets:

- `roadmap-dimensions.json`
- `roadmap-milestones.json`
- `client-roadmap-snapshot.json`
- `roadmap-import-deltas.json`

The import service should normalize seed data into the same shape expected from a future Google Sheet connector.

### Snapshot Strategy

Do not overwrite roadmap state in place. Store dated snapshots and append events.

Flow:

1. Import or seed a baseline `RoadmapSnapshot`.
2. User or mock extractor proposes `RoadmapUpdateCandidate`.
3. Coach reviews and approves the change.
4. System creates a `RoadmapEvent`.
5. System creates or updates a `MetricSnapshot`.
6. Client sees the updated roadmap with evidence and timeline.

### Future Google Sheets Boundary

The future Google Sheets connector should write into the same import boundary:

- Input: workbook rows/cells plus mapping configuration.
- Output: normalized dimensions, milestones, snapshots, and deltas.

The UI must never depend on loading the live sheet.

## Video Library Plan

### Taxonomy

Create a controlled starter taxonomy in seed data:

- `legacy_roadmap`
- `identity`
- `offers`
- `visibility`
- `resistance`
- `cosmology`
- `decision_making`
- `money`
- `relationship_systems`
- `practice`
- `integration`
- `creative_process`

Each tag needs:

- canonical name
- plain-language description
- synonyms
- parent tag if applicable
- related roadmap dimensions
- related thought models

### Video Metadata

Seed 8-12 synthetic videos. Include:

- title
- description
- category
- speaker
- duration
- tags
- chapters
- transcript chunks
- related roadmap dimensions
- suggested follow-up prompt

Use local placeholder URLs or safe external placeholders until real videos are available.

### Search

MVP search should be deterministic keyword search across:

- title
- description
- tag names and synonyms
- chapter titles and summaries
- transcript chunks
- related roadmap dimension names

Search results should show:

- title
- duration
- matching tags
- best matching chapter
- why it matched
- whether coach recommended it

### Recommendations

MVP recommendations should be rule-based:

- Current roadmap gap tag matches video tag.
- Approved insight tag matches video tag.
- Pre-call focus tag matches video tag.
- Incomplete action item tag matches video tag.
- Coach manually pins a video.

Recommendation output:

- video or chapter
- reason
- source item
- optional suggested reflection prompt
- required or optional
- expiration or relevance window

Prefer recommending a chapter over an entire long video when a chapter match exists.

## Seed Data Plan

Create synthetic seeds for local development:

- One organization: `WorldCode Studio` or neutral placeholder.
- One coach: `Bri`.
- Three clients with different roadmap stages.
- Three mock meeting transcripts with markers:
  - one offer/visibility call
  - one Legacy Roadmap progress call
  - one resistance/accountability call
- 12 transcript segments per call.
- 8-12 insight candidates generated from markers.
- 6-8 action item candidates.
- 4 roadmap update candidates.
- 8 roadmap dimensions.
- 20 roadmap milestones.
- 12 metric definitions.
- 15 metric snapshots across clients.
- 10 videos with 3 chapters each.
- 20 topic tags.
- 10 approved recommendations.

Seed content must be fake and must not copy private client reflections or real transcripts.

## Implementation Phases

### Phase 1: Local Data and Static Workflows

Build:

- Domain types/interfaces.
- Seed data.
- Repository layer.
- Transcript fixture loader.
- Mock extractor.
- Review queue list and detail screens.
- Basic approval and dismissal flow.

Acceptance criteria:

- Coach can open a mock call and see transcript segments.
- Coach can run mock extraction and see candidates.
- Candidate evidence links back to transcript segment and timestamp.
- Coach can approve, edit, or dismiss candidates.
- Approved records appear in the correct downstream collections.

### Phase 2: Action Items and Insight Timeline

Build:

- Approved action item list.
- Client action item view.
- Insight timeline.
- Sensitivity and visibility controls.
- Audit events for review actions.

Acceptance criteria:

- Unknown-owner action items cannot be approved.
- Due-date inference is visibly marked and must be confirmed.
- Sensitive insights default to coach-only.
- Client can see only approved, shareable insights.
- Audit log records candidate creation and review decisions.

### Phase 3: Roadmap and Metrics

Build:

- Roadmap overview.
- Dimension detail.
- Snapshot import from seed data.
- Roadmap update candidate approval.
- Metric snapshot creation from approved roadmap event.
- Progress evidence timeline.

Acceptance criteria:

- Client can see "now", "destination", "gap", and "closed gap" for at least one roadmap dimension.
- Roadmap changes are append-only events.
- Every approved metric snapshot displays evidence or shows as coach-entered draft.
- Progress UI avoids a single global score.

### Phase 4: Video Library and Recommendations

Build:

- Topic taxonomy.
- Video catalog.
- Video detail with chapters and transcript excerpts.
- Keyword search.
- Rule-based recommendation service.
- Coach approval for recommendation candidates.

Acceptance criteria:

- Client can search by topic and find matching videos/chapters.
- Recommendation card explains why it was suggested.
- Coach can approve or dismiss recommendation candidates.
- Recommendations can be sourced from an approved insight, roadmap gap, or manual coach selection.

### Phase 5: Integration-Ready Boundaries

Build:

- Interfaces for future Fathom ingestion.
- Interfaces for future Google Sheet import.
- Interfaces for future AI structured extraction.
- Fixture tests that validate the interfaces.

Acceptance criteria:

- Mock extractor and future AI extractor share the same output contract.
- Mock roadmap import and future Google import share the same normalized output contract.
- No UI component depends directly on Fathom, Google Sheets, or a specific AI provider.

## Testing Plan

### Unit Tests

- Transcript marker parsing.
- Transcript segmentation.
- Candidate schema validation.
- Insight classification mapping.
- Action item approval validation.
- Roadmap snapshot delta generation.
- Metric snapshot evidence requirements.
- Topic tag matching.
- Video recommendation rules.

### Integration Tests

- Run extraction on fixture transcript and create expected candidates.
- Approve an action item and verify client task appears.
- Approve a roadmap update and verify roadmap event plus metric snapshot.
- Approve an insight and verify progress evidence link.
- Recommend video from roadmap gap and verify reason text.

### UI Acceptance Tests

- Coach review queue can complete a full review pass.
- Client progress page shows now/destination/gap/closed gap.
- Client library search returns relevant chapter-level results.
- Client cannot see dismissed candidates or coach-only insights.

## Acceptance Criteria Summary

- A mock call transcript can be ingested locally.
- Deterministic extraction creates insight, action item, roadmap update, and video recommendation candidates.
- Candidates include evidence excerpts, timestamps, confidence, sensitivity, and review status.
- Coach can approve, edit, dismiss, or merge candidates.
- Approved action items become client-visible tasks.
- Approved insights can become timeline entries and progress evidence.
- Approved roadmap updates append events; they do not overwrite history silently.
- Metrics show current state, desired state, gap, closed gap, next step, and evidence.
- Legacy Roadmap seed data renders as client progression.
- Video library supports tags, chapters, transcript excerpts, search, and recommendations.
- Recommendation cards explain why a video or chapter is being suggested.
- Sensitive or internal-world insights are never automatically client-visible.
- No SMS or external notification copy contains sensitive internal-world interpretation.
- All seed data is synthetic.

## Risks

- Insight labels may feel invasive if surfaced too bluntly.
- Coaches may be overloaded if every extraction creates too many candidates.
- Metric design may over-quantify personal transformation if evidence and narrative are weak.
- Roadmap imports may become brittle if the future workbook shape is inconsistent.
- Topic tags may sprawl without a controlled taxonomy and tag review process.
- Video recommendations may feel random unless they show a clear source and reason.
- Action items may be misassigned if transcript speaker labels are poor.
- Deterministic mock extraction could hide ambiguity that real AI will later introduce.
- Sensitive data could leak through notifications, logs, test fixtures, or screenshots if guardrails are not enforced.

## Open Questions

- What are the official Legacy Roadmap dimensions and milestone names?
- What client-facing language should replace or soften "internal world" and "external world"?
- Should clients see source transcript excerpts for approved insights, or only coach-written summaries?
- Should clients be able to reject or correct an approved insight?
- Which videos already exist, and where are they hosted?
- Which thought models should be part of the controlled vocabulary for the first seed taxonomy?
- Should video watching create progress evidence automatically, or only after a reflection prompt?
- Are roadmap metrics coach-only until reviewed in session, or client-visible as soon as approved?

## Handoff Notes For Implementers

Start by building the data contracts and seed-driven workflows. The highest-value vertical slice is:

1. Load one mock transcript.
2. Generate candidates.
3. Review and approve one internal insight, one external insight, one action item, one roadmap update, and one video recommendation.
4. Show the approved outputs in client action items, progress, roadmap, and library.

Once that loop works locally, future agents can replace fixtures with real Fathom, Google Sheets, SMS, and AI integrations without changing the user-facing workflow.
