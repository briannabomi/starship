import assert from "node:assert/strict";
import { createSeedState } from "../src/state.js";
import {
  approveActionCandidate,
  approveInsightCandidate,
  completeAction,
  getRecommendedVideos,
  mockExtractCall,
  queueSms,
  submitAssignment,
  submitCheckIn,
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

  assert.equal(
    submitCheckIn(state, "checkin-1", {
      focus: "The offer page",
      questions: "Where am I externalizing?",
      alive: "Naming the truth",
      completed: "Drafted the outline",
      stuck: "I keep waiting for permission",
      ratings: { clarity: 4 },
    }),
    true,
  );
  assert.equal(state.weeklyCheckIns[0].status, "submitted");
  assert.equal(state.weeklyCheckIns[0].ratings.energy, 3, "partial ratings update should preserve existing ratings");
  assert.equal(state.weeklyCheckIns[0].ratings.clarity, 4);
  assert.equal(state.alerts[0].type, "checkin_stuck");
  assert.equal(state.completionEvents[0].targetType, "weekly_check_in");

  const alertCount = state.alerts.length;
  assert.equal(submitCheckIn(state, "checkin-1", { stuck: "" }), true);
  assert.equal(state.alerts.length, alertCount, "resubmitting check-in edits should not duplicate coach alerts");
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
  assert.equal(state.insights[0].source, "mock_fathom_reviewed");
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
  assert.equal(state.actionItems[0].source, "mock_fathom_reviewed");
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

  assert.equal(queueSms(state, "client-alex", "Your internal_world transcript journal is ready", "sensitive-1"), true);
  assert.equal(state.deliveries[0].body, "You have a Starship update ready. Open Starship to review your next step.");

  state.clients[0].smsOptOut = true;
  assert.equal(queueSms(state, "client-alex", "Open Starship", "after-stop"), false);
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
  const recommendations = getRecommendedVideos(state, "client-alex");
  assert.equal(recommendations[0].topic, "Embodiment");
  assert.ok(recommendations.length >= 1);
}

console.log("Starship domain workflow tests passed.");
