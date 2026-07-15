import { QUIZ_CONFIG } from "./quiz-config.js";

const byId = new Map(QUIZ_CONFIG.questions.map((question) => [question.id, question]));
const orientationOrder = ["stability", "depth", "sovereignty", "vitality", "co_creation"];

function values(answer) { return Array.isArray(answer) ? answer : answer == null ? [] : [answer]; }
function option(questionId, answer) { return byId.get(questionId)?.options.find((item) => item.id === values(answer)[0]); }
function answered(answers, ids) { return ids.filter((id) => values(answers[id]).length > 0); }

export function createQuizSession() { return { answers: {}, assessmentVersion: QUIZ_CONFIG.version }; }

export function validateAnswer(question, answer) {
  const selected = values(answer);
  const allowed = new Set(question.options.map((item) => item.id));
  if (selected.some((id) => !allowed.has(id))) return { valid: false, message: "Choose an available answer." };
  if (question.required !== false && selected.length < (question.minSelections ?? 1)) return { valid: false, message: `Choose ${question.minSelections ?? 1} answer${(question.minSelections ?? 1) > 1 ? "s" : ""} to continue.` };
  if (selected.length > (question.maxSelections ?? 1)) return { valid: false, message: `Choose no more than ${question.maxSelections ?? 1} answers.` };
  return { valid: true };
}

function chooseOrientation(answers) {
  const points = Object.fromEntries(orientationOrder.map((id) => [id, 0]));
  for (const id of ["foundation_feeling", "receiving_care", "shared_responsibility"]) {
    const tag = option(id, answers[id])?.orientation;
    if (tag) points[tag] += id === "foundation_feeling" ? 3 : 1;
  }
  const valueTags = { reliability: "stability", emotional_presence: "depth", freedom: "sovereignty", play: "vitality", affection: "vitality", shared_purpose: "co_creation", growth: "co_creation", spiritual_connection: "depth", family_or_community: "stability" };
  for (const id of values(answers.partnership_values)) if (valueTags[id]) points[valueTags[id]] += 1;
  return orientationOrder.reduce((best, id) => points[id] > points[best] ? id : best, orientationOrder[0]);
}

function dimension(label, ids, answers, summary, score = null, minimum = 2) {
  const count = answered(answers, ids).length;
  if (count < minimum) return { label, status: "insufficient", answeredCount: count };
  return { label, status: "available", summary, ...(Number.isFinite(score) ? { score } : {}) };
}

export function generateResult(answers = {}, { skipIntimacy = false } = {}) {
  const orientationId = chooseOrientation(answers);
  const orientation = QUIZ_CONFIG.orientations.find((item) => item.id === orientationId);
  const togetherness = option("space_and_closeness", answers.space_and_closeness)?.togetherness;
  const spaceSummary = Number.isFinite(togetherness) ? (togetherness >= 70 ? "More intertwined, with protected individuality" : togetherness <= 30 ? "More independent, with intentional connection" : "A balanced shared and separate life") : "Flexible with context";
  const intimacyIds = ["sexual_connection_role", "sexual_communication", "affection_rhythm"];
  const intimacyCount = skipIntimacy ? 0 : answered(answers, intimacyIds).length;
  const sexualPriority = option("sexual_connection_role", answers.sexual_connection_role)?.intensity;
  const topValues = values(answers.partnership_values).map((id) => byId.get("partnership_values").options.find((item) => item.id === id)?.label).filter(Boolean);
  const care = option("receiving_care", answers.receiving_care)?.label;
  const repair = option("conflict_repair", answers.conflict_repair)?.label;
  const responsibility = option("shared_responsibility", answers.shared_responsibility)?.label;
  const curiosityByPattern = {
    pattern_1: "Let actions—not potential—show you whether words become a reliable pattern.", pattern_2: "Keep checking whether chemistry is joined by shared values and direction.",
    pattern_3: "Notice whether there is room to name a need or boundary without becoming smaller.", pattern_4: "Protect the parts of your identity and life that make you feel most like yourself.",
    pattern_5: "Your instinct to slow down is a strength; keep giving behavior time to become a pattern.", pattern_6: "Stay curious without forcing a problem story. Let behavior over time give you evidence.",
  };
  return {
    assessmentVersion: QUIZ_CONFIG.version, orientationId, orientation, topValues,
    dimensions: {
      connection: dimension("Connection and care", ["foundation_feeling", "receiving_care", "partnership_values"], answers, care || "Care that is explicit, responsive, and mutual"),
      autonomy_togetherness: dimension("Space and togetherness", ["space_and_closeness"], answers, spaceSummary, null, 1),
      communication_repair: dimension("Communication and repair", ["receiving_care", "conflict_repair"], answers, repair || "A clear path back to connection"),
      shared_life: dimension("Building a shared life", ["partnership_values", "shared_responsibility"], answers, responsibility || "Agreements shaped and maintained together"),
      vitality_intimacy: intimacyCount < 2 ? { label: "Affection and sexual connection", status: "insufficient", answeredCount: intimacyCount } : { label: "Affection and sexual connection", status: "available", summary: Number.isFinite(sexualPriority) ? (sexualPriority >= 70 ? "A meaningful or central form of connection" : sexualPriority <= 30 ? "Not central; other forms of intimacy may lead" : "A meaningful connection whose importance may vary") : "Best understood through an open, consent-centered conversation" },
    },
    partnerSignals: [care && `responds to stress by choosing to ${care.charAt(0).toLowerCase()}${care.slice(1)}`, repair && `helps repair tension by choosing to ${repair.charAt(0).toLowerCase()}${repair.slice(1)}`, responsibility && `makes contribution explicit: ${responsibility.charAt(0).toLowerCase()}${responsibility.slice(1)}`].filter(Boolean),
    curiosity: curiosityByPattern[values(answers.decision_pattern)[0]] || "Let attraction unfold alongside observation. Give actions enough time to become a pattern.",
    intimacySummary: intimacyCount >= 2 ? "Your answers suggest that affection and sexual connection deserve explicit, pressure-free language rather than assumptions." : "Not enough answers yet to map this part of your profile.",
  };
}
