export function addAudit(state, event, detail, actor = "coach-bri") {
  state.auditLog.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event,
    actor,
    detail,
    createdAt: new Date().toISOString().slice(0, 10),
  });
}

export function getClient(state, clientId = state.session.clientId) {
  return state.clients.find((client) => client.id === clientId);
}

export function getJournalForAssignment(state, assignmentId) {
  return state.journalEntries.find((entry) => entry.assignmentId === assignmentId);
}

export function upsertJournal(state, assignmentId, body) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  let entry = getJournalForAssignment(state, assignmentId);
  if (!entry) {
    entry = {
      id: `journal-${Date.now()}`,
      assignmentId,
      clientId: assignment.clientId,
      title: assignment.title,
      body: "",
      status: "draft",
      visibility: "private_draft",
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    state.journalEntries.push(entry);
  }
  entry.body = body;
  entry.status = "draft";
  entry.visibility = "private_draft";
  entry.updatedAt = new Date().toISOString().slice(0, 10);
  assignment.status = "draft";
  addAudit(state, "journal.draft_saved", `Draft saved for ${assignment.title}`, assignment.clientId);
  return entry;
}

export function submitAssignment(state, assignmentId) {
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  const entry = getJournalForAssignment(state, assignmentId);
  if (!assignment || !entry || !entry.body.trim()) return false;
  assignment.status = "submitted";
  entry.status = "submitted";
  entry.visibility = "submitted_to_coach";
  state.alerts.unshift({
    id: `alert-${Date.now()}`,
    clientId: assignment.clientId,
    type: "assignment_submitted",
    message: `${assignment.title} was submitted and is ready for review.`,
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  addAudit(state, "assignment.submitted", `${assignment.title} submitted`, assignment.clientId);
  return true;
}

export function submitCheckIn(state, checkInId, updates) {
  const checkIn = state.weeklyCheckIns.find((item) => item.id === checkInId);
  Object.assign(checkIn, updates, { status: "submitted", submittedAt: new Date().toISOString().slice(0, 10) });
  state.alerts.unshift({
    id: `alert-${Date.now()}`,
    clientId: checkIn.clientId,
    type: checkIn.stuck ? "checkin_stuck" : "checkin_submitted",
    message: checkIn.stuck ? "Weekly tracker submitted with a stuck point." : "Weekly tracker submitted.",
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  addAudit(state, "checkin.submitted", "Weekly tracker submitted", checkIn.clientId);
}

export function mockExtractCall(state, callId) {
  const call = state.calls.find((item) => item.id === callId);
  if (!call) return;
  if (state.insightCandidates.some((item) => item.callId === callId) || state.actionItemCandidates.some((item) => item.callId === callId)) {
    return;
  }
  state.insightCandidates.push(
    {
      id: `insight-candidate-${Date.now()}-1`,
      callId,
      clientId: call.clientId,
      type: "internal_world",
      title: "Chest tightness signals protector activation",
      summary: "The client described analysis and chest contraction as the internal pattern before delaying action.",
      evidence: "Internally, my chest gets tight and I go into analysis.",
      confidence: 0.89,
      reviewStatus: "candidate",
      visibility: "needs_review",
    },
    {
      id: `insight-candidate-${Date.now()}-2`,
      callId,
      clientId: call.clientId,
      type: "external_world",
      title: "Offer page delay is the outer-world symptom",
      summary: "The concrete external marker is delaying the offer page while waiting for more certainty.",
      evidence: "Externally, I keep delaying the offer page.",
      confidence: 0.84,
      reviewStatus: "candidate",
      visibility: "needs_review",
    },
  );
  state.actionItemCandidates.push({
    id: `action-candidate-${Date.now()}`,
    callId,
    clientId: call.clientId,
    title: "Draft the first version of the offer page",
    description: "Bring the messy truth to the next call instead of waiting for complete certainty.",
    dueAt: nextFriday(),
    clientMessageDraft: "You have one Starship action item ready: draft the first version before the next call.",
    confidence: 0.91,
    reviewStatus: "candidate",
  });
  call.status = "extracted";
  state.alerts.unshift({
    id: `alert-${Date.now()}`,
    clientId: call.clientId,
    type: "review_queue",
    message: "Mock Fathom extraction created insight and action candidates for review.",
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  addAudit(state, "call.extracted", `Mock extraction completed for ${call.title}`);
}

export function approveInsightCandidate(state, id) {
  const candidate = state.insightCandidates.find((item) => item.id === id);
  if (!candidate) return;
  candidate.reviewStatus = "approved";
  state.insights.unshift({
    id: `insight-${Date.now()}`,
    clientId: candidate.clientId,
    type: candidate.type,
    title: candidate.title,
    summary: candidate.summary,
    evidence: candidate.evidence,
    visibility: "shareable_with_client",
    source: "mock_fathom_reviewed",
  });
  const roadmap = candidate.type === "external_world" ? "roadmap-leadership" : "roadmap-embodiment";
  bumpRoadmap(state, roadmap, candidate.title);
  addAudit(state, "insight.approved", candidate.title);
}

export function approveActionCandidate(state, id) {
  const candidate = state.actionItemCandidates.find((item) => item.id === id);
  if (!candidate) return;
  candidate.reviewStatus = "approved";
  const action = {
    id: `action-${Date.now()}`,
    clientId: candidate.clientId,
    title: candidate.title,
    source: "mock_fathom_reviewed",
    dueAt: candidate.dueAt,
    status: "open",
    reminder: "sms",
  };
  state.actionItems.unshift(action);
  queueSms(state, candidate.clientId, candidate.clientMessageDraft, action.id);
  addAudit(state, "action.approved", candidate.title);
}

export function completeAction(state, id) {
  const item = state.actionItems.find((action) => action.id === id);
  if (!item) return;
  item.status = "done";
  item.completedAt = new Date().toISOString().slice(0, 10);
  state.alerts.unshift({
    id: `alert-${Date.now()}`,
    clientId: item.clientId,
    type: "action_completed",
    message: `${item.title} was marked done.`,
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  bumpRoadmap(state, "roadmap-embodiment", `Completed: ${item.title}`);
  addAudit(state, "action.completed", item.title, item.clientId);
}

export function queueSms(state, clientId, body, relatedId) {
  const client = getClient(state, clientId);
  if (!client?.smsConsent) return;
  state.deliveries.unshift({
    id: `delivery-${Date.now()}`,
    clientId,
    channel: "sms_mock",
    body,
    relatedId,
    status: "queued",
    createdAt: new Date().toISOString().slice(0, 10),
  });
}

function bumpRoadmap(state, roadmapId, evidence) {
  const item = state.roadmap.find((roadmap) => roadmap.id === roadmapId);
  if (!item) return;
  item.current = Math.min(item.target, item.current + 4);
  item.evidence.unshift(evidence);
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
    .toSorted((a, b) => a.current / a.target - b.current / b.target)[0];
  if (!lowest) return state.videos.slice(0, 1);
  return state.videos.filter((video) => video.topic === lowest.name || video.tags.includes(lowest.name.toLowerCase())).slice(0, 2);
}
