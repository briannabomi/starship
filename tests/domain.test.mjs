import assert from "node:assert/strict";
import { createSeedState, migrateState, migrateVisibleLanguage } from "../src/state.js";
import {
  approveActionCandidate,
  approveInsightCandidate,
  archiveChallenge,
  completeAction,
  archiveClient,
  blockChallenge,
  buildCoachAttentionRows,
  createChallenge,
  createClient,
  createRelationshipWorkspace,
  createWeeklyCheckIn,
  getChallengeActivity,
  getChallenges,
  getLatestSubmittedCheckIn,
  getRecommendedVideos,
  getSubmittedCheckIns,
  mockExtractCall,
  queueSms,
  reopenChallenge,
  resolveChallenge,
  restoreChallenge,
  saveCheckInDraft,
  setSessionClient,
  setChallengeStatus,
  submitAssignment,
  submitCheckIn,
  submitRelationshipCheckIn,
  unblockChallenge,
  unarchiveClient,
  updateChallenge,
  updateRelationshipIssueStatus,
  updateRelationshipTaskStatus,
  upsertJournal,
} from "../src/domain.js";

function freshState() {
  return createSeedState();
}

function countBy(collection, predicate) {
  return collection.filter(predicate).length;
}

{
  const state = freshState();
  state.relationshipWorkspaces[0].focus = "Track open problems, shared commitments, desires, fights, blocks, and repair.";
  state.relationshipCheckIns[0].focus = "What problem do we want to repair before the next call?";
  migrateVisibleLanguage(state);
  assert.match(state.relationshipWorkspaces[0].focus, /open challenges/);
  assert.match(state.relationshipCheckIns[0].focus, /What challenge/);
}

{
  const state = freshState();

  const draft = upsertJournal(state, "assignment-2", "I noticed the old yes trying to protect the old identity.");
  assert.equal(draft.visibility, "private_draft");
  assert.equal(state.assignments.find((item) => item.id === "assignment-2").status, "draft");
  assert.equal(countBy(state.alerts, (alert) => alert.type === "assignment_submitted"), 0);

  assert.equal(submitAssignment(state, "assignment-2"), true);
  assert.equal(state.assignments.find((item) => item.id === "assignment-2").status, "submitted");
  assert.equal(state.alerts[0].type, "assignment_submitted");
  assert.equal(state.completionEvents[0].targetType, "assignment");

  const alertCount = state.alerts.length;
  assert.equal(submitAssignment(state, "assignment-2"), true);
  assert.equal(state.alerts.length, alertCount, "resubmitting an already submitted assignment should not duplicate alerts");
}

{
  const state = freshState();

  assert.equal(submitAssignment(state, "assignment-2"), false);
  assert.equal(state.assignments.find((item) => item.id === "assignment-2").status, "not_started");
  assert.equal(state.auditLog[0].event, "assignment.submit_failed");

  assert.equal(upsertJournal(state, "missing-assignment", "body"), null);
  assert.equal(state.auditLog[0].event, "journal.draft_failed");
}

{
  const state = freshState();

  const original = state.weeklyCheckIns.find((item) => item.id === "checkin-1");
  assert.equal(
    submitCheckIn(state, "checkin-1", {
      focus: "The offer page",
      supportRequested: "Help me make the decision concrete",
      questions: "Where am I externalizing?",
      alive: "Naming the truth",
      completed: "Drafted the outline",
      stuck: "I keep waiting for permission",
      ratings: { clarity: 4 },
    }),
    true,
  );
  assert.equal(original.status, "submitted");
  assert.equal(original.ratings.energy, 3, "partial ratings update should preserve existing ratings");
  assert.equal(original.ratings.clarity, 4);
  assert.equal(original.supportRequested, "Help me make the decision concrete");
  assert.equal(state.alerts[0].type, "checkin_stuck");
  assert.equal(state.completionEvents[0].targetType, "weekly_check_in");

  const frozenSnapshot = structuredClone(original);
  const alertCount = state.alerts.length;
  const completionCount = state.completionEvents.length;
  assert.equal(submitCheckIn(state, "checkin-1"), true, "an unchanged resubmission should be idempotent");
  assert.deepEqual(original, frozenSnapshot);
  assert.equal(state.alerts.length, alertCount);
  assert.equal(state.completionEvents.length, completionCount);
  assert.equal(submitCheckIn(state, "checkin-1", { stuck: "changed after submission" }), false);
  assert.deepEqual(original, frozenSnapshot, "submitted check-ins are immutable");
  assert.equal(state.auditLog[0].event, "checkin.amendment_required");
  assert.equal(submitCheckIn(state, "missing-checkin", {}), false);
}

{
  const state = freshState();

  assert.equal(mockExtractCall(state, "call-1"), true);
  assert.equal(countBy(state.insightCandidates, (item) => item.reviewStatus === "candidate"), 2);
  assert.equal(countBy(state.actionItemCandidates, (item) => item.reviewStatus === "candidate"), 1);
  assert.equal(countBy(state.roadmapUpdateCandidates, (item) => item.reviewStatus === "candidate"), 1);
  assert.equal(state.calls[0].status, "extracted");
  assert.equal(state.alerts[0].type, "review_queue");

  const candidateCounts = {
    insights: state.insightCandidates.length,
    actions: state.actionItemCandidates.length,
    roadmap: state.roadmapUpdateCandidates.length,
  };
  assert.equal(mockExtractCall(state, "call-1"), false);
  assert.equal(state.insightCandidates.length, candidateCounts.insights);
  assert.equal(state.actionItemCandidates.length, candidateCounts.actions);
  assert.equal(state.roadmapUpdateCandidates.length, candidateCounts.roadmap);
}

{
  const state = freshState();
  state.clients[0].aiConsent = false;

  assert.equal(mockExtractCall(state, "call-1"), false);
  assert.equal(state.insightCandidates.length, 0);
  assert.equal(state.actionItemCandidates.length, 0);
  assert.equal(state.auditLog[0].event, "call.extract_blocked");
}

{
  const state = freshState();
  mockExtractCall(state, "call-1");

  const internalCandidate = state.insightCandidates.find((item) => item.type === "internal_world");
  assert.equal(approveInsightCandidate(state, internalCandidate.id), true);
  assert.equal(state.insights[0].source, "mock_call_reviewed");
  assert.equal(state.insights[0].createdFromCandidateId, internalCandidate.id);
  assert.equal(state.roadmapEvents[0].sourceType, "approved_insight");
  assert.equal(state.metricSnapshots[0].gap, state.metricSnapshots[0].targetValue - state.metricSnapshots[0].currentValue);

  const insightCount = state.insights.length;
  assert.equal(approveInsightCandidate(state, internalCandidate.id), true);
  assert.equal(state.insights.length, insightCount, "approving an insight twice should not duplicate the durable insight");

  assert.equal(approveInsightCandidate(state, "missing-candidate"), false);
}

{
  const state = freshState();
  mockExtractCall(state, "call-1");

  const actionCandidate = state.actionItemCandidates[0];
  assert.equal(approveActionCandidate(state, actionCandidate.id), true);
  assert.equal(state.actionItems[0].source, "mock_call_reviewed");
  assert.equal(state.actionItems[0].createdFromCandidateId, actionCandidate.id);
  assert.equal(state.deliveries[0].channel, "sms_mock");
  assert.match(state.deliveries[0].body, /Starship action item/);
  assert.equal(state.auditLog[0].event, "action.approved");

  const actionCount = state.actionItems.length;
  const deliveryCount = state.deliveries.length;
  assert.equal(approveActionCandidate(state, actionCandidate.id), true);
  assert.equal(state.actionItems.length, actionCount);
  assert.equal(state.deliveries.length, deliveryCount);

  assert.equal(approveActionCandidate(state, "missing-candidate"), false);
}

{
  const state = freshState();
  state.clients[0].smsConsent = false;
  mockExtractCall(state, "call-1");

  assert.equal(approveActionCandidate(state, state.actionItemCandidates[0].id), true);
  assert.equal(state.deliveries.length, 0, "approved actions should not text clients without consent");
  assert.equal(state.auditLog[0].event, "action.approved");
  assert.equal(state.auditLog[1].event, "sms.skipped");
}

{
  const state = freshState();

  assert.equal(queueSms(state, "client-a", "Your internal_world transcript journal is ready", "sensitive-1"), true);
  assert.equal(state.deliveries[0].body, "You have a Starship update ready. Open Starship to review your next step.");

  state.clients[0].smsOptOut = true;
  assert.equal(queueSms(state, "client-a", "Open Starship", "after-stop"), false);
}

{
  const state = freshState();
  assert.equal(completeAction(state, "action-1"), true);
  assert.equal(state.actionItems[0].status, "done");
  assert.equal(state.alerts[0].type, "action_completed");
  assert.equal(state.roadmapEvents[0].sourceType, "action_item_completion");
  assert.equal(state.completionEvents[0].targetType, "action_item");

  const alertCount = state.alerts.length;
  assert.equal(completeAction(state, "action-1"), true);
  assert.equal(state.alerts.length, alertCount, "completing an already done action should not duplicate alerts");
  assert.equal(completeAction(state, "missing-action"), false);
}

{
  const state = freshState();
  const recommendations = getRecommendedVideos(state, "client-b");
  assert.equal(recommendations[0].topic, "Embodiment");
  assert.ok(recommendations.length >= 1);
}

{
  const state = freshState();
  assert.equal(setSessionClient(state, "client-b"), true);
  assert.equal(state.session.clientId, "client-b");
  assert.equal(setSessionClient(state, "missing-client"), false);
}

{
  const state = freshState();
  const client = createClient(state, {
    name: "Client D",
    email: "client.d@example.test",
    phone: "+15550101004",
    focus: "Test new client intake",
    nextCallAt: "2026-07-20",
    folderUrl: "https://drive.google.com/mock-client-d",
  });
  assert.equal(client.name, "Client D");
  assert.equal(state.session.clientId, client.id);
  assert.equal(state.users.some((user) => user.id === client.id), true);
  assert.equal(state.weeklyCheckIns.some((checkIn) => checkIn.clientId === client.id), true);
  assert.equal(state.googleDriveSources.find((source) => source.clientId === client.id).status, "mock_ready");

  assert.equal(archiveClient(state, client.id), true);
  assert.equal(state.clients.find((item) => item.id === client.id).archivedAt.length, 10);
  assert.notEqual(state.session.clientId, client.id);
  assert.equal(setSessionClient(state, client.id), false, "archived clients should not become the active session client");
  assert.equal(archiveClient(state, client.id), false);
  assert.equal(unarchiveClient(state, client.id), true);
  assert.equal(state.clients.find((item) => item.id === client.id).archivedAt, null);
  assert.equal(state.clients.find((item) => item.id === client.id).status, "active");
  assert.equal(state.users.find((item) => item.id === client.id).status, "active");
  assert.equal(setSessionClient(state, client.id), true, "unarchived clients should become selectable again");
  assert.equal(unarchiveClient(state, client.id), false);
  assert.equal(createClient(state, { name: "" }), null);
}

{
  const state = freshState();
  assert.equal(archiveClient(state, "client-c"), true);
  assert.equal(createRelationshipWorkspace(state, "client-a", "client-c"), null, "archived clients cannot be linked");
}

{
  const state = freshState();
  assert.equal(state.relationshipWorkspaces.some((workspace) => workspace.clientIds.includes("client-c")), false);

  const workspace = createRelationshipWorkspace(state, "client-a", "client-c");
  assert.equal(workspace.name, "Client A + Client C");
  assert.equal(workspace.clientIds.includes("client-c"), true);
  assert.equal(state.session.workspaceId, workspace.id);
  assert.equal(state.relationshipCheckIns.some((checkIn) => checkIn.workspaceId === workspace.id), true);

  const duplicate = createRelationshipWorkspace(state, "client-c", "client-a");
  assert.equal(duplicate.id, workspace.id, "creating the same pair should select the existing workspace");
  assert.equal(createRelationshipWorkspace(state, "client-a", "client-a"), null);
}

{
  const state = freshState();
  assert.equal(updateRelationshipTaskStatus(state, "rel-task-1", "done"), true);
  assert.equal(state.relationshipTasks.find((item) => item.id === "rel-task-1").status, "done");
  assert.equal(state.alerts[0].type, "relationship_task_done");

  assert.equal(updateRelationshipTaskStatus(state, "rel-task-2", "open"), true);
  assert.equal(state.relationshipTasks.find((item) => item.id === "rel-task-2").status, "open");
  assert.equal(updateRelationshipTaskStatus(state, "rel-task-2", "invalid"), false);

  assert.equal(updateRelationshipIssueStatus(state, "issue-1", "repair_in_progress"), true);
  assert.equal(state.relationshipIssues.find((item) => item.id === "issue-1").status, "repair_in_progress");
  assert.equal(updateRelationshipIssueStatus(state, "issue-1", "invalid"), false);
}

{
  const state = freshState();
  assert.equal(
    submitRelationshipCheckIn(state, "rel-checkin-1", {
      sharedQuestion: "What repair matters most?",
      clientAInput: "I want a cleaner ask.",
      clientBInput: "I want less correction.",
      stuck: "We still loop on logistics.",
    }),
    true,
  );
  assert.equal(state.relationshipCheckIns[0].status, "submitted");
  assert.equal(state.alerts[0].type, "relationship_checkin_submitted");
  assert.equal(submitRelationshipCheckIn(state, "missing-checkin", {}), false);
}

// Version 4 data migrates in place without dropping unrelated records, and a
// repeated migration does not duplicate deterministic issue projections.
{
  const legacy = structuredClone(freshState());
  legacy.version = 4;
  delete legacy.challenges;
  delete legacy.challengeActivities;
  delete legacy.session.coachAttentionSort;
  legacy.clients[2].archivedAt = "2026-07-01";
  legacy.clients[2].status = "archived";
  legacy.weeklyCheckIns = [
    {
      id: "legacy-submitted-checkin",
      clientId: "client-a",
      dueAt: "2026-07-12",
      status: "submitted",
      focus: "Keep this exact legacy focus",
      questions: "Keep this question",
      alive: "Keep this reflection",
      completed: "Keep this completion",
      stuck: "Keep this stuck point",
      ratings: { energy: 2, clarity: 3, alignment: 4, progress: 1 },
      submittedAt: "2026-07-11T15:00:00.000Z",
    },
  ];
  legacy.relationshipIssues = [
    {
      id: "legacy-open-issue",
      workspaceId: "workspace-couple-ab",
      title: "Open legacy challenge",
      description: "Preserve the source repair record",
      desiredRepair: "A clear repair",
      status: "open",
      severity: "high",
      ownerClientId: "client-a",
      createdAt: "2026-07-01",
    },
    {
      id: "legacy-blocked-issue",
      workspaceId: "workspace-couple-ab",
      title: "Blocked legacy challenge",
      description: "Fallback reason",
      latestSignal: "Explicit migration block reason",
      status: "blocked",
      severity: "medium",
      ownerClientId: "client-b",
      createdAt: "2026-07-02",
    },
    {
      id: "legacy-closed-issue",
      workspaceId: "workspace-couple-ab",
      title: "Closed legacy challenge",
      status: "closed",
      severity: "low",
      ownerClientId: null,
      createdAt: "2026-07-03",
    },
  ];
  const assignmentIds = legacy.assignments.map((item) => item.id);
  const workspaceIds = legacy.relationshipWorkspaces.map((item) => item.id);

  const migrated = migrateState(legacy) || legacy;
  assert.equal(migrated.version, 5);
  assert.deepEqual(migrated.assignments.map((item) => item.id), assignmentIds);
  assert.deepEqual(migrated.relationshipWorkspaces.map((item) => item.id), workspaceIds);
  assert.equal(migrated.clients.find((item) => item.id === "client-c").archivedAt, "2026-07-01");
  assert.equal(migrated.relationshipIssues.length, 3, "repair sources are retained");

  const migratedCheckIn = migrated.weeklyCheckIns.find((item) => item.id === "legacy-submitted-checkin");
  assert.equal(migratedCheckIn.focus, "Keep this exact legacy focus");
  assert.equal(migratedCheckIn.submittedAt, "2026-07-11T15:00:00.000Z");
  assert.equal(migratedCheckIn.supportRequested, "");
  assert.equal(migratedCheckIn.questionnaireVersion, 1);
  assert.ok(migratedCheckIn.periodStart && migratedCheckIn.periodEnd);
  assert.deepEqual(migratedCheckIn.createdChallengeIds, []);
  assert.deepEqual(migratedCheckIn.linkedChallengeIds, []);

  const openProjection = migrated.challenges.find((item) => item.sourceId === "legacy-open-issue");
  const blockedProjection = migrated.challenges.find((item) => item.sourceId === "legacy-blocked-issue");
  const closedProjection = migrated.challenges.find((item) => item.sourceId === "legacy-closed-issue");
  assert.equal(openProjection.scopeType, "relationship");
  assert.equal(openProjection.scopeId, "workspace-couple-ab");
  assert.equal(openProjection.status, "backlog");
  assert.equal(blockedProjection.status, "in_focus");
  assert.equal(blockedProjection.blockedReason, "Explicit migration block reason");
  assert.equal(closedProjection.status, "resolved");

  const beforeSecondMigration = {
    challengeIds: migrated.challenges.map((item) => item.id),
    activityIds: migrated.challengeActivities.map((item) => item.id),
  };
  migrateState(migrated);
  assert.deepEqual(migrated.challenges.map((item) => item.id), beforeSecondMigration.challengeIds);
  assert.deepEqual(migrated.challengeActivities.map((item) => item.id), beforeSecondMigration.activityIds);
}

// Private scopes remain private while relationship-scoped work is shared only
// with active workspace members. Coach reads retain explicit scope metadata.
{
  const state = freshState();
  state.challenges = [];
  state.challengeActivities = [];

  const privateA = createChallenge(
    state,
    { scopeType: "client", scopeId: "client-a", title: "A private challenge" },
    "client-a",
  );
  const privateB = createChallenge(
    state,
    { scopeType: "client", scopeId: "client-b", title: "B private challenge" },
    "client-b",
  );
  const sharedAB = createChallenge(
    state,
    { scopeType: "relationship", scopeId: "workspace-couple-ab", title: "A and B shared challenge" },
    "client-a",
  );
  assert.ok(privateA && privateB && sharedAB);

  assert.deepEqual(
    getChallenges(state, {}, "client-a").map((item) => item.id).sort(),
    [privateA.id, sharedAB.id].sort(),
  );
  assert.deepEqual(
    getChallenges(state, {}, "client-b").map((item) => item.id).sort(),
    [privateB.id, sharedAB.id].sort(),
  );
  assert.deepEqual(getChallenges(state, {}, "client-c"), []);
  assert.deepEqual(getChallengeActivity(state, privateB.id, "client-a"), []);
  assert.equal(getChallengeActivity(state, privateA.id, "client-a").length, 1);
  assert.equal(getChallenges(state, {}, "coach-bri").length, 3);
  assert.ok(getChallenges(state, {}, "coach-bri").every((item) => item.scopeType && item.scopeId));

  const challengeCount = state.challenges.length;
  const activityCount = state.challengeActivities.length;
  assert.equal(
    createChallenge(state, { scopeType: "client", scopeId: "client-a", title: "Cross-client write" }, "client-b"),
    null,
  );
  assert.equal(
    createChallenge(
      state,
      {
        scopeType: "relationship",
        scopeId: "workspace-couple-ab",
        title: "Invalid owner",
        ownerType: "client",
        ownerId: "client-c",
      },
      "client-a",
    ),
    null,
  );
  assert.equal(state.challenges.length, challengeCount);
  assert.equal(state.challengeActivities.length, activityCount);

  assert.ok(resolveChallenge(state, privateA.id, "client-a"));
  assert.equal(getChallenges(state, { scopeType: "client", scopeId: "client-a" }, "client-a").length, 0);
  assert.equal(
    getChallenges(state, { scopeType: "client", scopeId: "client-a", includeResolved: true }, "client-a").length,
    1,
  );
  assert.ok(archiveChallenge(state, privateA.id, "client-a"));
  assert.equal(
    getChallenges(
      state,
      { scopeType: "client", scopeId: "client-a", includeResolved: true, includeArchived: true },
      "client-a",
    ).length,
    1,
  );
}

// Challenge lifecycle commands produce one ordered activity each, bump one
// version at a time, and preserve transition context without permitting scope edits.
{
  const state = freshState();
  state.challenges = [];
  state.challengeActivities = [];
  const challenge = createChallenge(
    state,
    { scopeType: "client", scopeId: "client-c", title: "Build a repeatable practice" },
    "client-c",
  );
  assert.equal(challenge.status, "backlog");
  assert.equal(challenge.version, 1);
  assert.equal(getChallengeActivity(state, challenge.id, "client-c")[0].eventType, "created");

  assert.ok(updateChallenge(state, challenge.id, { priority: "high", desiredOutcome: "A reliable cadence" }, "client-c"));
  assert.equal(challenge.version, 2);
  const scopeBefore = { scopeType: challenge.scopeType, scopeId: challenge.scopeId, version: challenge.version };
  assert.equal(updateChallenge(state, challenge.id, { scopeId: "client-a" }, "client-c"), null);
  assert.deepEqual(
    { scopeType: challenge.scopeType, scopeId: challenge.scopeId, version: challenge.version },
    scopeBefore,
  );

  assert.ok(setChallengeStatus(state, challenge.id, "in_focus", "client-c"));
  assert.equal(blockChallenge(state, challenge.id, "   ", "client-c"), null);
  assert.ok(blockChallenge(state, challenge.id, "Waiting for a decision", "client-c"));
  const blockedVersion = challenge.version;
  assert.equal(blockChallenge(state, challenge.id, "Waiting for a decision", "client-c"), null);
  assert.equal(challenge.version, blockedVersion);
  assert.ok(unblockChallenge(state, challenge.id, "client-c"));
  assert.ok(blockChallenge(state, challenge.id, "A dependency is unresolved", "client-c"));
  assert.ok(resolveChallenge(state, challenge.id, "client-c"));
  assert.equal(challenge.status, "resolved");
  assert.equal(challenge.blockedAt, null);
  assert.equal(challenge.blockedReason, null);
  assert.equal(blockChallenge(state, challenge.id, "Should fail", "client-c"), null);
  assert.ok(reopenChallenge(state, challenge.id, "client-c"));
  assert.equal(challenge.status, "backlog");
  assert.ok(archiveChallenge(state, challenge.id, "client-c"));
  const archivedVersion = challenge.version;
  assert.equal(archiveChallenge(state, challenge.id, "client-c"), null);
  assert.equal(resolveChallenge(state, challenge.id, "client-c"), null);
  assert.equal(challenge.version, archivedVersion);
  assert.ok(restoreChallenge(state, challenge.id, "client-c"));

  const activities = getChallengeActivity(state, challenge.id, "client-c");
  assert.deepEqual(
    activities.map((item) => item.eventType),
    ["created", "edited", "focused", "blocked", "unblocked", "blocked", "resolved", "reopened", "archived", "restored"],
  );
  const resolvedActivity = activities.find((item) => item.eventType === "resolved");
  assert.equal(resolvedActivity.fieldChanges.blockedReason.from, "A dependency is unresolved");
  assert.equal(challenge.version, activities.length);
}

// Period records are unique, drafts validate atomically, submissions are
// immutable, and history remains private to the owner and coach.
{
  const state = freshState();
  state.weeklyCheckIns = [];
  state.challenges = [];
  state.challengeActivities = [];
  state.alerts = [];
  state.completionEvents = [];

  const first = createWeeklyCheckIn(
    state,
    "client-a",
    { periodStart: "2026-06-29", periodEnd: "2026-07-05", dueAt: "2026-07-05" },
    "client-a",
  );
  const duplicate = createWeeklyCheckIn(
    state,
    "client-a",
    { periodStart: "2026-06-29", periodEnd: "2026-07-05", dueAt: "2026-07-06" },
    "client-a",
  );
  assert.equal(duplicate.id, first.id);
  assert.equal(state.weeklyCheckIns.length, 1);
  assert.ok(saveCheckInDraft(state, first.id, { focus: "First period", ratings: { clarity: 4 } }, "client-a"));
  assert.equal(first.ratings.energy, 3);
  const draftSnapshot = structuredClone(first);
  assert.equal(saveCheckInDraft(state, first.id, { ratings: { unknown: 2 } }, "client-a"), null);
  assert.equal(saveCheckInDraft(state, first.id, { ratings: { energy: 6 } }, "client-a"), null);
  assert.deepEqual(first, draftSnapshot);

  assert.ok(
    submitCheckIn(
      state,
      first.id,
      { supportRequested: "Help identifying the next concrete step", completed: "Closed the first loop" },
      [],
      "client-a",
    ),
  );
  const immutableFirst = structuredClone(first);
  const alertCount = state.alerts.length;
  const completionCount = state.completionEvents.length;
  assert.ok(submitCheckIn(state, first.id, {}, [], "client-a"));
  assert.equal(submitCheckIn(state, first.id, { focus: "Rewrite history" }, [], "client-a"), false);
  assert.deepEqual(first, immutableFirst);
  assert.equal(state.alerts.length, alertCount);
  assert.equal(state.completionEvents.length, completionCount);
  assert.equal(state.auditLog[0].event, "checkin.amendment_required");

  const second = createWeeklyCheckIn(
    state,
    "client-a",
    { periodStart: "2026-07-06", periodEnd: "2026-07-12", dueAt: "2026-07-12" },
    "coach-bri",
  );
  assert.ok(submitCheckIn(state, second.id, { focus: "Second period", supportRequested: "Review the plan" }, [], "client-a"));
  assert.deepEqual(first, immutableFirst, "submitting a later period cannot mutate earlier history");
  assert.deepEqual(getSubmittedCheckIns(state, "client-a", "client-a").map((item) => item.id), [second.id, first.id]);
  assert.equal(getLatestSubmittedCheckIn(state, "client-a", "coach-bri"), second);
  assert.deepEqual(getSubmittedCheckIns(state, "client-a", "client-b"), []);
  assert.deepEqual(getSubmittedCheckIns(state, "client-a", "client-c"), []);
}

// Tracker challenge actions are explicit, private, provenance-preserving, and
// validate the entire submission before committing any partial writes.
{
  const state = freshState();
  state.weeklyCheckIns = [];
  state.challenges = [];
  state.challengeActivities = [];
  const existing = createChallenge(
    state,
    { scopeType: "client", scopeId: "client-a", title: "Existing private backlog item" },
    "client-a",
  );
  const shared = createChallenge(
    state,
    { scopeType: "relationship", scopeId: "workspace-couple-ab", title: "Shared backlog item" },
    "client-a",
  );
  const checkIn = createWeeklyCheckIn(
    state,
    "client-a",
    { periodStart: "2026-07-06", periodEnd: "2026-07-12", dueAt: "2026-07-12" },
    "client-a",
  );
  assert.ok(
    submitCheckIn(
      state,
      checkIn.id,
      { stuck: "Sensitive narrative that must not become a challenge title" },
      [
        { type: "create", title: "Explicitly named next challenge", priority: "high" },
        { type: "link", challengeId: existing.id },
        { type: "link", challengeId: existing.id },
      ],
      "client-a",
    ),
  );
  assert.equal(checkIn.createdChallengeIds.length, 1);
  assert.deepEqual(checkIn.linkedChallengeIds, [existing.id]);
  const created = state.challenges.find((item) => item.id === checkIn.createdChallengeIds[0]);
  assert.equal(created.title, "Explicitly named next challenge");
  assert.equal(created.sourceType, "weekly_tracker");
  assert.equal(created.sourceId, checkIn.id);
  assert.notEqual(created.title, checkIn.stuck);
  assert.equal(
    state.challengeActivities.filter((item) => item.challengeId === existing.id && item.eventType === "linked_to_checkin").length,
    1,
  );

  const invalidCheckIn = createWeeklyCheckIn(
    state,
    "client-a",
    { periodStart: "2026-07-13", periodEnd: "2026-07-19", dueAt: "2026-07-19" },
    "client-a",
  );
  const beforeInvalid = {
    checkIn: structuredClone(invalidCheckIn),
    challenges: state.challenges.length,
    activities: state.challengeActivities.length,
  };
  assert.equal(
    submitCheckIn(
      state,
      invalidCheckIn.id,
      { focus: "This must not partially save" },
      [
        { type: "create", title: "Must not be created" },
        { type: "link", challengeId: shared.id },
      ],
      "client-a",
    ),
    false,
  );
  assert.deepEqual(invalidCheckIn, beforeInvalid.checkIn);
  assert.equal(state.challenges.length, beforeInvalid.challenges);
  assert.equal(state.challengeActivities.length, beforeInvalid.activities);
}

// The coach projection is deterministic, privacy-minimized, excludes archives,
// separates personal/shared counts, and supports every documented sort.
{
  const state = freshState();
  state.clients.find((item) => item.id === "client-a").nextCallAt = "2026-07-15";
  state.clients.find((item) => item.id === "client-b").nextCallAt = "2026-07-14";
  state.clients.find((item) => item.id === "client-c").nextCallAt = null;
  state.weeklyCheckIns = [
    {
      id: "attention-a-old",
      clientId: "client-a",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      dueAt: "2026-07-05",
      status: "submitted",
      focus: "Older focus",
      supportRequested: "",
      submittedAt: "2026-07-05T12:00:00.000Z",
    },
    {
      id: "attention-a-current",
      clientId: "client-a",
      periodStart: "2026-07-06",
      periodEnd: "2026-07-13",
      dueAt: "2026-07-13",
      status: "submitted",
      focus: "  A current focus with   normalized whitespace  ",
      supportRequested: "Please help me decide this week",
      submittedAt: "2026-07-13T12:00:00.000Z",
    },
    {
      id: "attention-a-newer-draft",
      clientId: "client-a",
      periodStart: "2026-07-14",
      periodEnd: "2026-07-20",
      dueAt: "2026-07-20",
      status: "draft",
      focus: "A draft must not replace the latest submitted focus",
      supportRequested: "Draft support must not leak",
      submittedAt: null,
    },
    {
      id: "attention-b-overdue",
      clientId: "client-b",
      periodStart: "2026-07-06",
      periodEnd: "2026-07-12",
      dueAt: "2026-07-12",
      status: "draft",
      focus: "",
      supportRequested: "",
      submittedAt: null,
    },
    {
      id: "attention-c-old",
      clientId: "client-c",
      periodStart: "2026-06-22",
      periodEnd: "2026-06-28",
      dueAt: "2026-06-28",
      status: "submitted",
      focus: "Client C older submitted focus",
      supportRequested: "",
      submittedAt: "2026-06-28T12:00:00.000Z",
    },
  ];
  state.challenges = [
    {
      id: "attention-private-a-blocked",
      scopeType: "client",
      scopeId: "client-a",
      status: "in_focus",
      blockedAt: "2026-07-12T12:00:00.000Z",
      blockedReason: "A private reason that must never enter the row",
      archivedAt: null,
      title: "A private title that must never enter attention reasons",
    },
    {
      id: "attention-private-a-resolved",
      scopeType: "client",
      scopeId: "client-a",
      status: "resolved",
      blockedAt: null,
      archivedAt: null,
    },
    {
      id: "attention-shared-ab",
      scopeType: "relationship",
      scopeId: "workspace-couple-ab",
      status: "backlog",
      blockedAt: null,
      archivedAt: null,
    },
    {
      id: "attention-shared-ab-archived",
      scopeType: "relationship",
      scopeId: "workspace-couple-ab",
      status: "in_focus",
      blockedAt: "2026-07-12T12:00:00.000Z",
      archivedAt: "2026-07-12T13:00:00.000Z",
    },
  ];

  const attentionRows = buildCoachAttentionRows(state, { today: "2026-07-13", sort: "attention" });
  assert.deepEqual(attentionRows.map((row) => row.clientId), ["client-a", "client-b", "client-c"]);
  const rowA = attentionRows.find((row) => row.clientId === "client-a");
  const rowB = attentionRows.find((row) => row.clientId === "client-b");
  const rowC = attentionRows.find((row) => row.clientId === "client-c");
  assert.equal(rowA.focusExcerpt, "A current focus with normalized whitespace");
  assert.equal(rowA.supportExcerpt, "Please help me decide this week");
  assert.equal(rowA.latestCheckInId, "attention-a-current");
  assert.equal(rowA.checkInHistoryCount, 2);
  assert.equal(rowA.individualOpenCount, 1);
  assert.equal(rowA.individualBlockedCount, 1);
  assert.equal(rowA.sharedOpenCount, 1);
  assert.equal(rowA.sharedBlockedCount, 0);
  assert.equal(rowB.sharedOpenCount, 1, "one shared challenge contributes once to each participant");
  assert.equal(rowC.sharedOpenCount, 0);
  assert.equal(rowB.checkInState, "missing");
  assert.notEqual(rowB.primaryAttentionKind, "blocked");
  assert.equal(rowC.checkInState, "stale");
  assert.ok(rowA.attentionReasons.some((reason) => /Blocked challenge/.test(reason)));
  assert.ok(rowA.attentionReasons.every((reason) => !reason.includes("private reason") && !reason.includes("private title")));

  assert.deepEqual(
    buildCoachAttentionRows(state, { today: "2026-07-13", sort: "next_call" }).map((row) => row.clientId),
    ["client-b", "client-a", "client-c"],
  );
  assert.deepEqual(
    buildCoachAttentionRows(state, { today: "2026-07-13", sort: "latest_checkin" }).map((row) => row.clientId),
    ["client-a", "client-c", "client-b"],
  );
  assert.deepEqual(
    buildCoachAttentionRows(state, { today: "2026-07-13", sort: "client_name" }).map((row) => row.clientId),
    ["client-a", "client-b", "client-c"],
  );

  state.clients.find((item) => item.id === "client-c").archivedAt = "2026-07-13";
  for (const sort of ["attention", "next_call", "latest_checkin", "client_name"]) {
    assert.equal(
      buildCoachAttentionRows(state, { today: "2026-07-13", sort }).some((row) => row.clientId === "client-c"),
      false,
    );
  }
}

// Session client selection and archive fallback always align the relationship
// workspace with the selected active client.
{
  const state = freshState();
  assert.equal(setSessionClient(state, "client-c"), true);
  assert.equal(state.session.workspaceId, null);
  assert.equal(setSessionClient(state, "client-a"), true);
  assert.equal(state.session.workspaceId, "workspace-couple-ab");

  assert.equal(setSessionClient(state, "client-b"), true);
  const historyBeforeArchive = state.weeklyCheckIns.filter((item) => item.clientId === "client-b").map((item) => item.id);
  assert.equal(archiveClient(state, "client-b"), true);
  assert.notEqual(state.session.clientId, "client-b");
  if (state.session.workspaceId) {
    const selectedWorkspace = state.relationshipWorkspaces.find((item) => item.id === state.session.workspaceId);
    assert.ok(selectedWorkspace.clientIds.includes(state.session.clientId));
  }
  assert.equal(setSessionClient(state, "client-b"), false);
  assert.equal(unarchiveClient(state, "client-b"), true);
  assert.deepEqual(
    state.weeklyCheckIns.filter((item) => item.clientId === "client-b").map((item) => item.id),
    historyBeforeArchive,
  );
  assert.equal(setSessionClient(state, "client-b"), true);
  assert.equal(state.session.workspaceId, "workspace-couple-ab");
}

// Every transition that changes a selected client or workspace preserves the
// invariant that the selected workspace contains the selected active client.
{
  const state = freshState();
  assert.equal(setSessionClient(state, "client-c"), true);
  const created = createClient(state, { name: "Client D" });
  assert.equal(state.session.clientId, created.id);
  assert.equal(state.session.workspaceId, null);

  state.relationshipWorkspaces = [];
  assert.equal(setSessionClient(state, "client-c"), true);
  const workspace = createRelationshipWorkspace(state, "client-a", "client-b");
  assert.equal(state.session.workspaceId, workspace.id);
  assert.ok(workspace.clientIds.includes(state.session.clientId));

  for (const client of state.clients.filter((item) => !item.archivedAt).slice()) {
    assert.equal(archiveClient(state, client.id), true);
  }
  assert.equal(state.session.clientId, null);
  assert.equal(state.session.workspaceId, null);
}

// Migration accepts only explicitly supported versions, repairs stale session
// authorization context, and does not reuse colliding IDs or invalid owners.
{
  for (const version of [undefined, "junk", "4", 3, 6]) {
    const unsupported = freshState();
    unsupported.version = version;
    assert.equal(migrateState(unsupported), null);
  }

  const stale = freshState();
  stale.version = 4;
  stale.session.clientId = "client-c";
  stale.session.workspaceId = "workspace-couple-ab";
  stale.clients.find((item) => item.id === "client-c").archivedAt = "2026-07-01";
  migrateState(stale);
  assert.equal(stale.session.clientId, "client-a");
  assert.equal(stale.session.workspaceId, "workspace-couple-ab");

  const mismatched = freshState();
  mismatched.version = 4;
  mismatched.session.clientId = "client-c";
  mismatched.session.workspaceId = "workspace-couple-ab";
  migrateState(mismatched);
  assert.equal(mismatched.session.clientId, "client-c");
  assert.equal(mismatched.session.workspaceId, null);

  const collision = freshState();
  collision.version = 4;
  collision.challenges = [{
    id: "challenge-from-collision-issue",
    scopeType: "client",
    scopeId: "client-c",
    title: "Unrelated private challenge",
    status: "backlog",
  }];
  collision.challengeActivities = [{
    id: "activity-migrated-collision-issue",
    challengeId: "challenge-from-collision-issue",
    eventType: "created",
  }];
  collision.relationshipIssues = [{
    id: "collision-issue",
    workspaceId: "workspace-couple-ab",
    title: "Migrated relationship challenge",
    status: "open",
    ownerClientId: "client-c",
    createdAt: "2026-07-01",
  }];
  migrateState(collision);
  const migratedId = collision.relationshipIssues[0].linkedChallengeId;
  assert.notEqual(migratedId, "challenge-from-collision-issue");
  const migratedChallenge = collision.challenges.find((item) => item.id === migratedId);
  assert.equal(migratedChallenge.scopeType, "relationship");
  assert.equal(migratedChallenge.scopeId, "workspace-couple-ab");
  assert.equal(migratedChallenge.ownerType, "unassigned");
  assert.equal(migratedChallenge.ownerId, null);
  assert.equal(new Set(collision.challenges.map((item) => item.id)).size, collision.challenges.length);
  assert.equal(new Set(collision.challengeActivities.map((item) => item.id)).size, collision.challengeActivities.length);
  const snapshot = structuredClone(collision);
  migrateState(collision);
  assert.deepEqual(collision, snapshot);
}

// Normalized challenge edits are true no-ops, while numeric rank edits retain
// the numeric storage invariant.
{
  const state = freshState();
  const challenge = state.challenges.find((item) => item.id === "challenge-client-a-1");
  const before = { version: challenge.version, activities: state.challengeActivities.length };
  assert.equal(updateChallenge(state, challenge.id, { title: `  ${challenge.title}  ` }, "client-a"), challenge);
  assert.equal(updateChallenge(state, challenge.id, { rank: String(challenge.rank) }, "client-a"), challenge);
  assert.equal(challenge.version, before.version);
  assert.equal(state.challengeActivities.length, before.activities);
  assert.ok(updateChallenge(state, challenge.id, { rank: "2000" }, "client-a"));
  assert.equal(challenge.rank, 2000);
  assert.equal(typeof challenge.rank, "number");
}

// Only a submitted current-period tracker can create a current-week support
// attention signal; old history remains available without driving triage.
{
  const state = freshState();
  state.challenges = [];
  state.weeklyCheckIns = [
    {
      id: "old-support",
      clientId: "client-c",
      periodStart: "2026-06-23",
      periodEnd: "2026-06-29",
      dueAt: "2026-06-29",
      status: "submitted",
      focus: "Historical focus",
      supportRequested: "Historical support request",
      submittedAt: "2026-06-29T12:00:00.000Z",
    },
    {
      id: "current-draft",
      clientId: "client-c",
      periodStart: "2026-07-13",
      periodEnd: "2026-07-19",
      dueAt: "2026-07-19",
      status: "draft",
      focus: "",
      supportRequested: "",
      submittedAt: null,
    },
  ];
  let row = buildCoachAttentionRows(state, { today: "2026-07-13" }).find((item) => item.clientId === "client-c");
  assert.equal(row.primaryAttentionKind, "none");
  assert.ok(!row.attentionReasons.includes("Support requested this week"));
  state.weeklyCheckIns[1].status = "submitted";
  state.weeklyCheckIns[1].supportRequested = "Current support request";
  state.weeklyCheckIns[1].submittedAt = "2026-07-13T12:00:00.000Z";
  row = buildCoachAttentionRows(state, { today: "2026-07-13" }).find((item) => item.clientId === "client-c");
  assert.equal(row.primaryAttentionKind, "support");
  assert.ok(row.attentionReasons.includes("Support requested this week"));
}

// Invalid call dates sort with unscheduled calls, and the projection remains a
// pure read even when optional source arrays are absent.
{
  const state = freshState();
  state.clients.find((item) => item.id === "client-a").nextCallAt = "not-a-date";
  state.clients.find((item) => item.id === "client-b").nextCallAt = "2026-07-14";
  state.clients.find((item) => item.id === "client-c").nextCallAt = "2026-02-31";
  assert.deepEqual(
    buildCoachAttentionRows(state, { today: "2026-07-13", sort: "next_call" }).map((item) => item.clientId),
    ["client-b", "client-a", "client-c"],
  );

  const partial = { session: { coachAttentionSort: "attention" }, clients: [{ id: "only", name: "Only", archivedAt: null }] };
  const before = structuredClone(partial);
  assert.equal(buildCoachAttentionRows(partial, { today: "2026-07-13" }).length, 1);
  assert.deepEqual(partial, before);
}

// Relationship check-ins permit each active client to change only the input
// assigned by workspace order; coach compatibility retains all shared fields.
{
  const state = freshState();
  const checkIn = state.relationshipCheckIns[0];
  assert.equal(
    submitRelationshipCheckIn(state, checkIn.id, {
      sharedQuestion: checkIn.sharedQuestion,
      clientAInput: "Client A contribution",
      clientBInput: checkIn.clientBInput,
      stuck: checkIn.stuck,
    }, "client-a"),
    true,
  );
  const afterA = structuredClone(checkIn);
  assert.equal(submitRelationshipCheckIn(state, checkIn.id, { clientAInput: "Cross-member edit" }, "client-b"), false);
  assert.deepEqual(checkIn, afterA);
  assert.equal(submitRelationshipCheckIn(state, checkIn.id, { clientBInput: "Client B contribution" }, "client-b"), true);
  assert.equal(checkIn.clientBInput, "Client B contribution");
  assert.equal(submitRelationshipCheckIn(state, checkIn.id, { sharedQuestion: "Client cannot rewrite shared prompt" }, "client-a"), false);
  assert.equal(
    submitRelationshipCheckIn(state, checkIn.id, {
      sharedQuestion: "Coach-authored shared prompt",
      clientAInput: "Coach may update A",
      clientBInput: "Coach may update B",
      stuck: "Coach may update shared block context",
    }, "coach-bri"),
    true,
  );
  assert.equal(checkIn.sharedQuestion, "Coach-authored shared prompt");
  archiveClient(state, "client-b");
  assert.equal(submitRelationshipCheckIn(state, checkIn.id, { clientAInput: "Inactive workspace edit" }, "client-a"), false);
}

console.log("Starship domain workflow tests passed.");
