const SENSITIVE_SMS_PATTERNS = [/journal/i, /transcript/i, /internal[_ -]?world/i, /chest/i, /protector/i];

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function ensureList(state, key) {
  if (!Array.isArray(state[key])) state[key] = [];
  return state[key];
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addAudit(state, event, detail, actor = "coach-bri", metadata = {}) {
  const auditLog = ensureList(state, "auditLog");
  const safeDetail = String(detail || "").slice(0, 180);
  auditLog.unshift({
    id: makeId("audit"),
    event,
    actor,
    detail: safeDetail,
    metadata,
    createdAt: isoToday(),
  });
}

function pushAlert(state, clientId, type, message) {
  ensureList(state, "alerts").unshift({
    id: makeId("alert"),
    clientId,
    type,
    message,
    read: false,
    createdAt: isoToday(),
  });
}

function recordCompletion(state, clientId, targetType, targetId, summary) {
  ensureList(state, "completionEvents").unshift({
    id: makeId("completion"),
    clientId,
    targetType,
    targetId,
    summary,
    createdAt: isoToday(),
  });
}

function hasActiveConsent(client, consentType) {
  if (!client) return false;
  if (consentType === "sms") return client.smsConsent === true && client.smsOptOut !== true;
  if (consentType === "ai") return client.aiConsent === true;
  if (consentType === "recording") return client.recordingConsent === true;
  return true;
}

function alreadyPromoted(collection, sourceCandidateId) {
  return Array.isArray(collection) && collection.some((item) => item.createdFromCandidateId === sourceCandidateId);
}

function sanitizeSmsBody(body) {
  const text = String(body || "").trim();
  if (!text) return "";
  if (SENSITIVE_SMS_PATTERNS.some((pattern) => pattern.test(text))) {
    return "You have a Starship update ready. Open Starship to review your next step.";
  }
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export function getClient(state, clientId = state.session.clientId) {
  return state.clients.find((client) => client.id === clientId);
}

export function getJournalForAssignment(state, assignmentId) {
  return state.journalEntries.find((entry) => entry.assignmentId === assignmentId);
}

export function upsertJournal(state, assignmentId, body) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) {
    addAudit(state, "journal.draft_failed", "Draft save failed because assignment was not found", "system", { assignmentId });
    return null;
  }
  let entry = getJournalForAssignment(state, assignmentId);
  if (!entry) {
    entry = {
      id: makeId("journal"),
      assignmentId,
      clientId: assignment.clientId,
      title: assignment.title,
      body: "",
      status: "draft",
      visibility: "private_draft",
      updatedAt: isoToday(),
    };
    state.journalEntries.push(entry);
  }
  entry.body = String(body ?? "");
  entry.status = "draft";
  entry.visibility = "private_draft";
  entry.updatedAt = isoToday();
  assignment.status = "draft";
  addAudit(state, "journal.draft_saved", `Draft saved for ${assignment.title}`, assignment.clientId, {
    assignmentId,
    journalEntryId: entry.id,
  });
  return entry;
}

export function submitAssignment(state, assignmentId) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  const entry = getJournalForAssignment(state, assignmentId);
  if (!assignment || !entry || !entry.body.trim()) {
    addAudit(state, "assignment.submit_failed", "Assignment submission failed validation", "system", { assignmentId });
    return false;
  }
  if (assignment.status === "submitted" && entry.status === "submitted") return true;
  assignment.status = "submitted";
  entry.status = "submitted";
  entry.visibility = "submitted_to_coach";
  entry.submittedAt = isoToday();
  recordCompletion(state, assignment.clientId, "assignment", assignment.id, `${assignment.title} submitted`);
  pushAlert(state, assignment.clientId, "assignment_submitted", `${assignment.title} was submitted and is ready for review.`);
  addAudit(state, "assignment.submitted", `${assignment.title} submitted`, assignment.clientId, {
    assignmentId,
    journalEntryId: entry.id,
  });
  return true;
}

export function submitCheckIn(state, checkInId, updates) {
  const checkIn = state.weeklyCheckIns.find((item) => item.id === checkInId);
  if (!checkIn) {
    addAudit(state, "checkin.submit_failed", "Weekly tracker submission failed because check-in was not found", "system", { checkInId });
    return false;
  }
  const wasSubmitted = checkIn.status === "submitted";
  const nextRatings = updates?.ratings ? { ...(checkIn.ratings || {}), ...updates.ratings } : checkIn.ratings;
  Object.assign(checkIn, updates, { ratings: nextRatings, status: "submitted", submittedAt: isoToday() });
  if (!wasSubmitted) {
    recordCompletion(state, checkIn.clientId, "weekly_check_in", checkIn.id, "Weekly tracker submitted");
    pushAlert(
      state,
      checkIn.clientId,
      checkIn.stuck ? "checkin_stuck" : "checkin_submitted",
      checkIn.stuck ? "Weekly tracker submitted with a stuck point." : "Weekly tracker submitted.",
    );
  }
  addAudit(state, "checkin.submitted", "Weekly tracker submitted", checkIn.clientId, { checkInId });
  return true;
}

export function mockExtractCall(state, callId) {
  const call = state.calls.find((item) => item.id === callId);
  if (!call) {
    addAudit(state, "call.extract_failed", "Mock extraction failed because call was not found", "system", { callId });
    return false;
  }
  const client = getClient(state, call.clientId);
  if (!hasActiveConsent(client, "recording") || !hasActiveConsent(client, "ai")) {
    addAudit(state, "call.extract_blocked", "Mock extraction blocked by consent settings", "system", { callId, clientId: call.clientId });
    return false;
  }
  if (
    ensureList(state, "insightCandidates").some((item) => item.callId === callId) ||
    ensureList(state, "actionItemCandidates").some((item) => item.callId === callId)
  ) {
    addAudit(state, "call.extract_skipped", "Mock extraction skipped because candidates already exist", "system", { callId });
    return false;
  }
  ensureList(state, "insightCandidates").push(
    {
      id: makeId("insight-candidate"),
      callId,
      clientId: call.clientId,
      type: "internal_world",
      title: "Chest tightness signals protector activation",
      summary: "The client described analysis and chest contraction as the internal pattern before delaying action.",
      evidence: "Internally, my chest gets tight and I go into analysis.",
      evidenceRef: { callId, timestampStart: null, source: "mock_fathom_transcript" },
      sensitivity: "medium",
      confidence: 0.89,
      reviewStatus: "candidate",
      visibility: "needs_review",
      reviewRequiredReason: "AI-derived internal-world insight requires coach review.",
      createdBy: "mock_extractor",
      createdAt: isoToday(),
    },
    {
      id: makeId("insight-candidate"),
      callId,
      clientId: call.clientId,
      type: "external_world",
      title: "Offer page delay is the outer-world symptom",
      summary: "The concrete external marker is delaying the offer page while waiting for more certainty.",
      evidence: "Externally, I keep delaying the offer page.",
      evidenceRef: { callId, timestampStart: null, source: "mock_fathom_transcript" },
      sensitivity: "low",
      confidence: 0.84,
      reviewStatus: "candidate",
      visibility: "needs_review",
      reviewRequiredReason: "AI-derived client-visible insight requires coach review.",
      createdBy: "mock_extractor",
      createdAt: isoToday(),
    },
  );
  ensureList(state, "actionItemCandidates").push({
    id: makeId("action-candidate"),
    callId,
    clientId: call.clientId,
    title: "Draft the first version of the offer page",
    description: "Bring the messy truth to the next call instead of waiting for complete certainty.",
    dueAt: nextFriday(),
    dueDateBasis: "inferred",
    ownerType: "client",
    priority: "normal",
    evidenceRef: { callId, timestampStart: null, source: "mock_fathom_transcript" },
    clientMessageDraft: "You have one Starship action item ready: draft the first version before the next call.",
    sensitivity: "low",
    confidence: 0.91,
    reviewStatus: "candidate",
    reviewRequiredReason: "Call-derived action requires coach approval before SMS delivery.",
    createdBy: "mock_extractor",
    createdAt: isoToday(),
  });
  ensureList(state, "roadmapUpdateCandidates").push({
    id: makeId("roadmap-candidate"),
    callId,
    clientId: call.clientId,
    roadmapId: "roadmap-leadership",
    changeType: "blocker",
    currentStateAfter: "Publishing is blocked by waiting for certainty.",
    evidence: "Externally, I keep delaying the offer page.",
    confidence: 0.8,
    reviewStatus: "candidate",
    createdBy: "mock_extractor",
    createdAt: isoToday(),
  });
  call.status = "extracted";
  pushAlert(state, call.clientId, "review_queue", "Mock Fathom extraction created insight and action candidates for review.");
  addAudit(state, "call.extracted", `Mock extraction completed for ${call.title}`, "system", { callId, clientId: call.clientId });
  return true;
}

export function approveInsightCandidate(state, id) {
  const candidate = state.insightCandidates.find((item) => item.id === id);
  if (!candidate) {
    addAudit(state, "insight.approve_failed", "Insight approval failed because candidate was not found", "system", { candidateId: id });
    return false;
  }
  if (candidate.reviewStatus === "approved" || alreadyPromoted(state.insights, id)) return true;
  candidate.reviewStatus = "approved";
  candidate.reviewedAt = isoToday();
  candidate.reviewedBy = "coach-bri";
  const visibility = candidate.sensitivity === "high" ? "coach_private" : "shareable_with_client";
  ensureList(state, "insights").unshift({
    id: makeId("insight"),
    clientId: candidate.clientId,
    type: candidate.type,
    title: candidate.title,
    summary: candidate.summary,
    evidence: candidate.evidence,
    visibility,
    source: "mock_fathom_reviewed",
    evidenceRef: candidate.evidenceRef,
    sensitivity: candidate.sensitivity || "medium",
    createdFromCandidateId: id,
    approvedBy: "coach-bri",
    approvedAt: isoToday(),
  });
  const roadmap = candidate.type === "external_world" ? "roadmap-leadership" : "roadmap-embodiment";
  bumpRoadmap(state, roadmap, candidate.title, candidate.clientId, "approved_insight", id);
  addAudit(state, "insight.approved", candidate.title, "coach-bri", { candidateId: id, clientId: candidate.clientId });
  return true;
}

export function approveActionCandidate(state, id) {
  const candidate = state.actionItemCandidates.find((item) => item.id === id);
  if (!candidate) {
    addAudit(state, "action.approve_failed", "Action approval failed because candidate was not found", "system", { candidateId: id });
    return false;
  }
  if (candidate.reviewStatus === "approved" || alreadyPromoted(state.actionItems, id)) return true;
  candidate.reviewStatus = "approved";
  candidate.reviewedAt = isoToday();
  candidate.reviewedBy = "coach-bri";
  const action = {
    id: makeId("action"),
    clientId: candidate.clientId,
    ownerType: candidate.ownerType || "client",
    title: candidate.title,
    description: candidate.description,
    source: "mock_fathom_reviewed",
    dueAt: candidate.dueAt,
    status: "open",
    reminder: "sms",
    evidenceRef: candidate.evidenceRef,
    priority: candidate.priority || "normal",
    clientMessage: sanitizeSmsBody(candidate.clientMessageDraft),
    createdFromCandidateId: id,
    approvedAt: isoToday(),
  };
  ensureList(state, "actionItems").unshift(action);
  queueSms(state, candidate.clientId, candidate.clientMessageDraft, action.id);
  addAudit(state, "action.approved", candidate.title, "coach-bri", { candidateId: id, actionId: action.id, clientId: candidate.clientId });
  return true;
}

export function completeAction(state, id) {
  const item = state.actionItems.find((action) => action.id === id);
  if (!item) {
    addAudit(state, "action.complete_failed", "Action completion failed because action was not found", "system", { actionId: id });
    return false;
  }
  if (item.status === "done") return true;
  item.status = "done";
  item.completedAt = isoToday();
  recordCompletion(state, item.clientId, "action_item", item.id, `${item.title} completed`);
  pushAlert(state, item.clientId, "action_completed", `${item.title} was marked done.`);
  bumpRoadmap(state, "roadmap-embodiment", `Completed: ${item.title}`, item.clientId, "action_item_completion", item.id);
  addAudit(state, "action.completed", item.title, item.clientId);
  return true;
}

export function queueSms(state, clientId, body, relatedId) {
  const client = getClient(state, clientId);
  if (!hasActiveConsent(client, "sms")) {
    addAudit(state, "sms.skipped", "SMS skipped because active consent is missing", "system", { clientId, relatedId });
    return false;
  }
  const safeBody = sanitizeSmsBody(body);
  if (!safeBody) return false;
  ensureList(state, "deliveries").unshift({
    id: makeId("delivery"),
    clientId,
    channel: "sms_mock",
    body: safeBody,
    relatedId,
    status: "queued",
    createdAt: isoToday(),
  });
  addAudit(state, "sms.queued", "Mock SMS queued", "system", { clientId, relatedId });
  return true;
}

function bumpRoadmap(state, roadmapId, evidence, clientId, sourceType = "manual", sourceId = null) {
  const item = state.roadmap.find((roadmap) => roadmap.id === roadmapId);
  if (!item) return false;
  const previous = item.current;
  item.current = Math.min(item.target, item.current + 4);
  item.evidence = [evidence, ...(item.evidence || [])];
  ensureList(state, "roadmapEvents").unshift({
    id: makeId("roadmap-event"),
    clientId: clientId || item.clientId,
    roadmapId,
    eventType: item.current > previous ? "progress" : "evidence_added",
    previous,
    current: item.current,
    evidence,
    sourceType,
    sourceId,
    createdAt: isoToday(),
  });
  ensureList(state, "metricSnapshots").unshift({
    id: makeId("metric-snapshot"),
    clientId: clientId || item.clientId,
    roadmapId,
    currentValue: item.current,
    targetValue: item.target,
    gap: Math.max(0, item.target - item.current),
    evidence,
    provenance: sourceType,
    reviewStatus: "approved",
    capturedAt: isoToday(),
  });
  return true;
}

function nextFriday() {
  const date = new Date();
  const day = date.getDay();
  const offset = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function getRecommendedVideos(state, clientId) {
  const lowest = state.roadmap
    .filter((item) => item.clientId === clientId)
    .slice()
    .sort((a, b) => a.current / a.target - b.current / b.target)[0];
  if (!lowest) return state.videos.slice(0, 1);
  return state.videos.filter((video) => video.topic === lowest.name || video.tags.includes(lowest.name.toLowerCase())).slice(0, 2);
}
