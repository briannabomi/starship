import assert from "node:assert/strict";
import { createSeedState } from "../src/state.js";
import {
  approveActionCandidate,
  approveInsightCandidate,
  completeAction,
  mockExtractCall,
  submitAssignment,
  submitCheckIn,
  upsertJournal,
} from "../src/domain.js";

const state = createSeedState();

upsertJournal(state, "assignment-2", "I noticed the old yes trying to protect the old identity.");
assert.equal(state.assignments.find((item) => item.id === "assignment-2").status, "draft");
assert.equal(submitAssignment(state, "assignment-2"), true);
assert.equal(state.alerts[0].type, "assignment_submitted");

submitCheckIn(state, "checkin-1", {
  focus: "The offer page",
  questions: "Where am I externalizing?",
  alive: "Naming the truth",
  completed: "Drafted the outline",
  stuck: "I keep waiting for permission",
});
assert.equal(state.weeklyCheckIns[0].status, "submitted");
assert.equal(state.alerts[0].type, "checkin_stuck");

mockExtractCall(state, "call-1");
assert.equal(state.insightCandidates.filter((item) => item.reviewStatus === "candidate").length, 2);
assert.equal(state.actionItemCandidates.filter((item) => item.reviewStatus === "candidate").length, 1);

approveInsightCandidate(state, state.insightCandidates[0].id);
assert.equal(state.insights[0].source, "mock_fathom_reviewed");

approveActionCandidate(state, state.actionItemCandidates[0].id);
assert.equal(state.actionItems[0].source, "mock_fathom_reviewed");
assert.equal(state.deliveries[0].channel, "sms_mock");

completeAction(state, state.actionItems[0].id);
assert.equal(state.actionItems[0].status, "done");
assert.equal(state.alerts[0].type, "action_completed");

console.log("Starship domain workflow tests passed.");
