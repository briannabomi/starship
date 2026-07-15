import assert from "node:assert/strict";
import { QUIZ_CONFIG } from "../src/quiz/quiz-config.js";
import { createQuizSession, generateResult, validateAnswer } from "../src/quiz/quiz-domain.js";

assert.equal(QUIZ_CONFIG.questions.length, 11);
assert.equal(new Set(QUIZ_CONFIG.questions.map((q) => q.id)).size, 11);
assert.deepEqual(createQuizSession().answers, {});
const values = QUIZ_CONFIG.questions.find((q) => q.id === "partnership_values");
assert.equal(validateAnswer(values, ["honesty"]).valid, false);
assert.equal(validateAnswer(values, ["honesty", "reliability", "growth"]).valid, true);
assert.equal(validateAnswer(values, ["honesty", "reliability", "growth", "play"]).valid, false);

const answers = {
  foundation_feeling: "seen", partnership_values: ["honesty", "emotional_presence", "spiritual_connection"], relationship_container: "container_1",
  receiving_care: "listen", space_and_closeness: "balanced", shared_responsibility: "adjusted", conflict_repair: "repair_3", decision_pattern: "pattern_1",
  sexual_connection_role: "sexual_role_2", sexual_communication: "sexual_talk_3", affection_rhythm: "affection_4",
};
const result = generateResult(answers);
assert.equal(result.orientationId, "depth");
assert.equal(result.dimensions.vitality_intimacy.status, "available");
assert.equal("totalScore" in result, false);
assert.equal(generateResult(answers, { skipIntimacy: true }).dimensions.vitality_intimacy.status, "insufficient");
assert.match(result.curiosity, /actions/i);
console.log("Quiz domain tests passed");
