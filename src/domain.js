function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isoNow() {
  return new Date().toISOString();
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

const QUESTION_LABELS = {
  previousGoal: "What was the #1 goal you set for yourself last week?",
  completedPreviousGoal: "Did you complete the #1 goal you set last week?",
  focus: "What is the ONE thing that, if you did it this week, would move your relationship and/or life forward the most?",
  supportRequested: "Where would you most like Bri's support?",
  questions: "What do you most want coaching on this week, and what would make this week's call feel like a win?",
  alive: "What is your biggest win this past week?",
  completed: "What specific steps do you need to take to make that a reality this week? List the steps in order.",
  stuck: "Where are you stuck?",
};
const ANSWER_FIELDS = ["previousGoal", "completedPreviousGoal", "focus", "supportRequested", "questions", "alive", "completed", "stuck"];
const RATING_FIELDS = ["energy", "clarity", "alignment", "progress"];
const PRIORITIES = ["none", "low", "medium", "high", "urgent"];
const PRIORITY_WEIGHT = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

export function getSessionActorId(state) {
  return state.session?.role === "coach" ? "coach-bri" : state.session?.clientId || null;
}

export function isCoach(state, actorId) {
  const user = ensureList(state, "users").find((item) => item.id === actorId);
  return Boolean(user && user.role === "coach" && user.status !== "archived" && user.active !== false);
}

export function isActiveClient(state, clientId) {
  return Boolean(ensureList(state, "clients").find((client) => client.id === clientId && !client.archivedAt));
}

export function getActiveClientWorkspace(state, clientId) {
  return ensureList(state, "relationshipWorkspaces")
    .filter((workspace) => {
      if (!(workspace.clientIds || []).includes(clientId)) return false;
      if (workspace.archivedAt || workspace.status === "archived" || workspace.status === "paused") return false;
      return (workspace.clientIds || []).every((id) => isActiveClient(state, id));
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] || null;
}

function isActiveWorkspace(state, workspaceId) {
  const workspace = ensureList(state, "relationshipWorkspaces").find((item) => item.id === workspaceId);
  return Boolean(
    workspace &&
      !workspace.archivedAt &&
      workspace.status !== "archived" &&
      workspace.status !== "paused" &&
      (workspace.clientIds || []).every((id) => isActiveClient(state, id)),
  );
}

export function canAccessScope(state, actorId, scopeType, scopeId, action = "read") {
  const actor = actorId || getSessionActorId(state);
  if (isCoach(state, actor)) {
    if (scopeType === "client") return action === "read" ? Boolean(getClient(state, scopeId)) : isActiveClient(state, scopeId);
    if (scopeType === "relationship") {
      const exists = Boolean(getWorkspace(state, scopeId));
      return action === "read" ? exists : isActiveWorkspace(state, scopeId);
    }
    return false;
  }
  if (!isActiveClient(state, actor)) return false;
  if (scopeType === "client") return scopeId === actor && isActiveClient(state, scopeId);
  if (scopeType !== "relationship" || !isActiveWorkspace(state, scopeId)) return false;
  const workspace = getWorkspace(state, scopeId);
  return Boolean(workspace?.clientIds?.includes(actor));
}

export function canReadCheckIn(state, actorId, checkIn) {
  const actor = actorId || getSessionActorId(state);
  return Boolean(checkIn && (isCoach(state, actor) || (actor === checkIn.clientId && isActiveClient(state, actor))));
}

function challengeById(state, challengeId) {
  return ensureList(state, "challenges").find((challenge) => challenge.id === challengeId);
}

function ownerIsValid(state, scopeType, scopeId, ownerType, ownerId) {
  if (ownerType === "unassigned" || ownerType === "coach") return ownerId == null;
  if (scopeType === "client") return ownerType === "client" && ownerId === scopeId && isActiveClient(state, ownerId);
  const workspace = getWorkspace(state, scopeId);
  if (ownerType === "both_clients") return ownerId == null && isActiveWorkspace(state, scopeId);
  return ownerType === "client" && Boolean(workspace?.clientIds?.includes(ownerId)) && isActiveClient(state, ownerId);
}

function appendChallengeActivity(state, challenge, actorUserId, eventType, fieldChanges, sourceType, sourceId) {
  ensureList(state, "challengeActivities").push({
    id: makeId("challenge-activity"),
    challengeId: challenge.id,
    actorUserId,
    eventType,
    occurredAt: isoNow(),
    fieldChanges,
    commentBody: null,
    sourceType: sourceType || "manual",
    sourceId: sourceId || null,
  });
}

function finalizeChallengeMutation(state, challenge, actorId, eventType, fieldChanges) {
  challenge.updatedAt = isoNow();
  challenge.version = Number(challenge.version || 0) + 1;
  appendChallengeActivity(state, challenge, actorId, eventType, fieldChanges, "manual", null);
  addAudit(state, `challenge.${eventType}`, "Challenge updated", actorId, {
    challengeId: challenge.id,
    scopeType: challenge.scopeType,
    scopeId: challenge.scopeId,
    status: challenge.status,
  });
}

function constructChallenge(state, input, actorId, sourceType = "manual", sourceId = null) {
  const scopeType = input.scopeType;
  const scopeId = input.scopeId;
  const title = String(input.title || "").trim();
  const ownerType = input.ownerType || "unassigned";
  const ownerId = input.ownerId ?? null;
  if (!title || !["client", "relationship"].includes(scopeType)) return null;
  if (!canAccessScope(state, actorId, scopeType, scopeId, "write")) return null;
  if (!ownerIsValid(state, scopeType, scopeId, ownerType, ownerId)) return null;
  const priority = PRIORITIES.includes(input.priority) ? input.priority : "none";
  const status = ["backlog", "in_focus"].includes(input.status) ? input.status : "backlog";
  const ranks = ensureList(state, "challenges")
    .filter((item) => item.scopeType === scopeType && item.scopeId === scopeId)
    .map((item) => Number(item.rank) || 0);
  const now = isoNow();
  return {
    id: makeId("challenge"),
    scopeType,
    scopeId,
    title,
    description: String(input.description || "").trim(),
    desiredOutcome: String(input.desiredOutcome || "").trim(),
    status,
    priority,
    rank: Number.isFinite(Number(input.rank)) ? Number(input.rank) : Math.max(0, ...ranks) + 1000,
    ownerType,
    ownerId,
    createdByUserId: actorId,
    createdAt: now,
    updatedAt: now,
    targetDate: input.targetDate || null,
    blockedAt: null,
    blockedByUserId: null,
    blockedReason: null,
    resolvedAt: null,
    resolvedByUserId: null,
    archivedAt: null,
    archivedByUserId: null,
    sourceType,
    sourceId,
    version: 1,
  };
}

export function getChallenges(state, filters = {}, actorId) {
  const actor = actorId || getSessionActorId(state);
  const activeWorkspaceIds = filters.clientId
    ? ensureList(state, "relationshipWorkspaces")
        .filter((workspace) => (workspace.clientIds || []).includes(filters.clientId) && isActiveWorkspace(state, workspace.id))
        .map((workspace) => workspace.id)
    : [];
  return ensureList(state, "challenges")
    .filter((challenge) => canAccessScope(state, actor, challenge.scopeType, challenge.scopeId, "read"))
    .filter((challenge) => filters.includeResolved || challenge.status !== "resolved")
    .filter((challenge) => filters.includeArchived || !challenge.archivedAt)
    .filter((challenge) => !filters.scopeType || challenge.scopeType === filters.scopeType)
    .filter((challenge) => !filters.scopeId || challenge.scopeId === filters.scopeId)
    .filter((challenge) => !filters.status || challenge.status === filters.status)
    .filter((challenge) => filters.blocked == null || Boolean(challenge.blockedAt) === Boolean(filters.blocked))
    .filter((challenge) => {
      if (!filters.clientId) return true;
      return (
        (challenge.scopeType === "client" && challenge.scopeId === filters.clientId) ||
        (challenge.scopeType === "relationship" && activeWorkspaceIds.includes(challenge.scopeId))
      );
    })
    .slice()
    .sort((a, b) =>
      Number(Boolean(b.blockedAt)) - Number(Boolean(a.blockedAt)) ||
      (PRIORITY_WEIGHT[a.priority] ?? 4) - (PRIORITY_WEIGHT[b.priority] ?? 4) ||
      Number(a.rank || 0) - Number(b.rank || 0) ||
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) ||
      String(a.id).localeCompare(String(b.id)),
    );
}

export function getChallengeActivity(state, challengeId, actorId) {
  const challenge = challengeById(state, challengeId);
  const actor = actorId || getSessionActorId(state);
  if (!challenge || !canAccessScope(state, actor, challenge.scopeType, challenge.scopeId, "read")) return [];
  return ensureList(state, "challengeActivities")
    .filter((activity) => activity.challengeId === challengeId)
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
}

export function createChallenge(state, input = {}, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = constructChallenge(state, input, actor, "manual", null);
  if (!challenge) return null;
  ensureList(state, "challenges").push(challenge);
  appendChallengeActivity(state, challenge, actor, "created", {}, challenge.sourceType, challenge.sourceId);
  addAudit(state, "challenge.created", "Challenge created", actor, {
    challengeId: challenge.id,
    scopeType: challenge.scopeType,
    scopeId: challenge.scopeId,
  });
  return challenge;
}

export function updateChallenge(state, challengeId, patch = {}, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = challengeById(state, challengeId);
  if (!challenge || challenge.archivedAt || !canAccessScope(state, actor, challenge.scopeType, challenge.scopeId, "write")) return null;
  const allowed = ["title", "description", "desiredOutcome", "priority", "ownerType", "ownerId", "targetDate", "rank"];
  if (Object.keys(patch).some((key) => !allowed.includes(key))) return null;
  const next = { ...challenge, ...patch };
  next.title = String(next.title || "").trim();
  next.description = String(next.description || "").trim();
  next.desiredOutcome = String(next.desiredOutcome || "").trim();
  next.rank = Number(next.rank);
  if (!next.title || !PRIORITIES.includes(next.priority) || !ownerIsValid(state, challenge.scopeType, challenge.scopeId, next.ownerType, next.ownerId)) return null;
  if (!Number.isFinite(next.rank)) return null;
  const changes = {};
  for (const key of allowed) {
    if (Object.hasOwn(patch, key) && next[key] !== challenge[key]) changes[key] = { from: challenge[key], to: next[key] };
  }
  if (!Object.keys(changes).length) return challenge;
  for (const key of Object.keys(changes)) challenge[key] = next[key];
  finalizeChallengeMutation(state, challenge, actor, "edited", changes);
  return challenge;
}

function editableChallenge(state, challengeId, actorId) {
  const challenge = challengeById(state, challengeId);
  return challenge && !challenge.archivedAt && canAccessScope(state, actorId, challenge.scopeType, challenge.scopeId, "write")
    ? challenge
    : null;
}

export function setChallengeStatus(state, challengeId, status, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = editableChallenge(state, challengeId, actor);
  if (!challenge || challenge.status === "resolved" || !["backlog", "in_focus"].includes(status)) return null;
  if (challenge.status === status) return true;
  const previous = challenge.status;
  challenge.status = status;
  finalizeChallengeMutation(state, challenge, actor, status === "in_focus" ? "focused" : "returned_to_backlog", {
    status: { from: previous, to: status },
  });
  return true;
}

export function blockChallenge(state, challengeId, reason, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = editableChallenge(state, challengeId, actor);
  const cleanReason = String(reason || "").trim();
  if (!challenge || challenge.status === "resolved" || !cleanReason || challenge.blockedAt) return null;
  const now = isoNow();
  const changes = {
    blockedAt: { from: null, to: now },
    blockedByUserId: { from: null, to: actor },
    blockedReason: { from: null, to: cleanReason },
  };
  if (challenge.status === "backlog") {
    changes.status = { from: "backlog", to: "in_focus" };
    challenge.status = "in_focus";
  }
  challenge.blockedAt = now;
  challenge.blockedByUserId = actor;
  challenge.blockedReason = cleanReason;
  finalizeChallengeMutation(state, challenge, actor, "blocked", changes);
  return true;
}

export function unblockChallenge(state, challengeId, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = editableChallenge(state, challengeId, actor);
  if (!challenge || !challenge.blockedAt) return null;
  const changes = {
    blockedAt: { from: challenge.blockedAt, to: null },
    blockedByUserId: { from: challenge.blockedByUserId, to: null },
    blockedReason: { from: challenge.blockedReason, to: null },
  };
  challenge.blockedAt = null;
  challenge.blockedByUserId = null;
  challenge.blockedReason = null;
  finalizeChallengeMutation(state, challenge, actor, "unblocked", changes);
  return true;
}

export function resolveChallenge(state, challengeId, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = editableChallenge(state, challengeId, actor);
  if (!challenge || challenge.status === "resolved") return null;
  const now = isoNow();
  const changes = {
    status: { from: challenge.status, to: "resolved" },
    resolvedAt: { from: null, to: now },
    resolvedByUserId: { from: null, to: actor },
  };
  if (challenge.blockedAt) {
    changes.blockedAt = { from: challenge.blockedAt, to: null };
    changes.blockedByUserId = { from: challenge.blockedByUserId, to: null };
    changes.blockedReason = { from: challenge.blockedReason, to: null };
  }
  Object.assign(challenge, {
    status: "resolved",
    resolvedAt: now,
    resolvedByUserId: actor,
    blockedAt: null,
    blockedByUserId: null,
    blockedReason: null,
  });
  finalizeChallengeMutation(state, challenge, actor, "resolved", changes);
  return true;
}

export function reopenChallenge(state, challengeId, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = editableChallenge(state, challengeId, actor);
  if (!challenge || challenge.status !== "resolved") return null;
  const changes = {
    status: { from: "resolved", to: "backlog" },
    resolvedAt: { from: challenge.resolvedAt, to: null },
    resolvedByUserId: { from: challenge.resolvedByUserId, to: null },
  };
  challenge.status = "backlog";
  challenge.resolvedAt = null;
  challenge.resolvedByUserId = null;
  finalizeChallengeMutation(state, challenge, actor, "reopened", changes);
  return true;
}

export function archiveChallenge(state, challengeId, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = editableChallenge(state, challengeId, actor);
  if (!challenge) return null;
  const now = isoNow();
  challenge.archivedAt = now;
  challenge.archivedByUserId = actor;
  finalizeChallengeMutation(state, challenge, actor, "archived", {
    archivedAt: { from: null, to: now },
    archivedByUserId: { from: null, to: actor },
  });
  return true;
}

export function restoreChallenge(state, challengeId, actorId) {
  const actor = actorId || getSessionActorId(state);
  const challenge = challengeById(state, challengeId);
  if (!challenge?.archivedAt || !canAccessScope(state, actor, challenge.scopeType, challenge.scopeId, "write")) return null;
  const changes = {
    archivedAt: { from: challenge.archivedAt, to: null },
    archivedByUserId: { from: challenge.archivedByUserId, to: null },
  };
  challenge.archivedAt = null;
  challenge.archivedByUserId = null;
  finalizeChallengeMutation(state, challenge, actor, "restored", changes);
  return true;
}

function periodStartFromEnd(periodEnd) {
  const date = new Date(`${periodEnd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function newCheckIn(clientId, input = {}) {
  const periodEnd = String(input.periodEnd || input.dueAt || isoToday());
  const periodStart = String(input.periodStart || periodStartFromEnd(periodEnd) || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || periodStart > periodEnd) return null;
  return {
    id: makeId("checkin"),
    clientId,
    periodStart,
    periodEnd,
    dueAt: String(input.dueAt || periodEnd),
    status: "not_opened",
    questionnaireVersion: 1,
    questionLabels: { ...QUESTION_LABELS },
    previousGoal: "",
    completedPreviousGoal: "",
    focus: "",
    supportRequested: "",
    questions: "",
    alive: "",
    completed: "",
    stuck: "",
    ratings: { energy: 3, clarity: 3, alignment: 3, progress: 2 },
    authoredAt: null,
    submittedAt: null,
    createdChallengeIds: [],
    linkedChallengeIds: [],
  };
}

export function createWeeklyCheckIn(state, clientId, input = {}, actorId) {
  const actor = actorId || getSessionActorId(state);
  if (!isActiveClient(state, clientId) || !(isCoach(state, actor) || actor === clientId)) return null;
  const candidate = newCheckIn(clientId, input);
  if (!candidate) return null;
  const existing = ensureList(state, "weeklyCheckIns").find(
    (item) => item.clientId === clientId && item.periodStart === candidate.periodStart && item.periodEnd === candidate.periodEnd,
  );
  if (existing) return existing;
  ensureList(state, "weeklyCheckIns").push(candidate);
  return candidate;
}

function validatedCheckInUpdates(checkIn, updates = {}) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) return null;
  if (Object.keys(updates).some((key) => !ANSWER_FIELDS.includes(key) && key !== "ratings")) return null;
  const normalized = {};
  for (const field of ANSWER_FIELDS) if (Object.hasOwn(updates, field)) normalized[field] = String(updates[field] ?? "");
  if (Object.hasOwn(updates, "ratings")) {
    if (!updates.ratings || typeof updates.ratings !== "object" || Array.isArray(updates.ratings)) return null;
    if (Object.keys(updates.ratings).some((key) => !RATING_FIELDS.includes(key))) return null;
    for (const value of Object.values(updates.ratings)) if (!Number.isInteger(value) || value < 1 || value > 5) return null;
    normalized.ratings = { ...(checkIn.ratings || {}), ...updates.ratings };
  }
  return normalized;
}

export function saveCheckInDraft(state, checkInId, updates = {}, actorId) {
  const actor = actorId || getSessionActorId(state);
  const checkIn = ensureList(state, "weeklyCheckIns").find((item) => item.id === checkInId);
  if (
    !checkIn || !isActiveClient(state, checkIn.clientId) ||
    ["submitted", "amended", "reviewed"].includes(checkIn.status) || !canReadCheckIn(state, actor, checkIn)
  ) return null;
  const normalized = validatedCheckInUpdates(checkIn, updates);
  if (!normalized) return null;
  Object.assign(checkIn, normalized, { status: "draft", authoredAt: isoNow() });
  return true;
}

export function getSubmittedCheckIns(state, clientId, actorId) {
  const actor = actorId || getSessionActorId(state);
  const probe = { clientId };
  if (!getClient(state, clientId) || !canReadCheckIn(state, actor, probe)) return [];
  return ensureList(state, "weeklyCheckIns")
    .filter((item) => item.clientId === clientId && ["submitted", "amended", "reviewed"].includes(item.status))
    .slice()
    .sort((a, b) =>
      String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")) ||
      String(b.periodEnd || "").localeCompare(String(a.periodEnd || "")) ||
      String(a.id).localeCompare(String(b.id)),
    );
}

export function getLatestSubmittedCheckIn(state, clientId, actorId) {
  return getSubmittedCheckIns(state, clientId, actorId)[0] || null;
}

export function getCurrentWeeklyCheckIn(state, clientId, actorId) {
  const actor = actorId || getSessionActorId(state);
  if (!canReadCheckIn(state, actor, { clientId })) return null;
  const records = ensureList(state, "weeklyCheckIns").filter(
    (item) => item.clientId === clientId && !["submitted", "amended", "reviewed"].includes(item.status),
  );
  return records.sort((a, b) => String(b.periodEnd || b.dueAt || "").localeCompare(String(a.periodEnd || a.dueAt || "")))[0] || null;
}

function submissionHasChanges(checkIn, updates, challengeActions) {
  if (challengeActions.length) return true;
  const normalized = validatedCheckInUpdates(checkIn, updates);
  if (!normalized) return true;
  return Object.entries(normalized).some(([key, value]) =>
    key === "ratings"
      ? RATING_FIELDS.some((rating) => value[rating] !== checkIn.ratings?.[rating])
      : value !== checkIn[key],
  );
}

export function submitCheckIn(state, checkInId, updates = {}, challengeActions = [], actorId) {
  const actor = actorId || getSessionActorId(state);
  const checkIn = ensureList(state, "weeklyCheckIns").find((item) => item.id === checkInId);
  if (!checkIn || !isActiveClient(state, checkIn.clientId) || !canReadCheckIn(state, actor, checkIn)) return false;
  if (!Array.isArray(challengeActions)) return false;
  if (["submitted", "amended", "reviewed"].includes(checkIn.status)) {
    if (!submissionHasChanges(checkIn, updates, challengeActions)) return true;
    addAudit(state, "checkin.amendment_required", "Submitted trackers are read-only", actor, { checkInId });
    return false;
  }
  const normalized = validatedCheckInUpdates(checkIn, updates);
  if (!normalized) return false;

  const creates = [];
  const links = [];
  for (const action of challengeActions) {
    if (!action || !["create", "link"].includes(action.type)) return false;
    if (action.type === "create") {
      const challenge = constructChallenge(
        state,
        { ...action, scopeType: "client", scopeId: checkIn.clientId },
        actor,
        "weekly_tracker",
        checkIn.id,
      );
      if (!challenge) return false;
      creates.push(challenge);
    } else {
      const challenge = challengeById(state, action.challengeId);
      if (
        !challenge || challenge.scopeType !== "client" || challenge.scopeId !== checkIn.clientId ||
        challenge.status === "resolved" || challenge.archivedAt || !canAccessScope(state, actor, "client", checkIn.clientId, "write")
      ) return false;
      if (!links.some((item) => item.id === challenge.id)) links.push(challenge);
    }
  }

  Object.assign(checkIn, normalized);
  checkIn.status = "submitted";
  checkIn.authoredAt ||= isoNow();
  checkIn.submittedAt = isoNow();
  checkIn.createdChallengeIds = creates.map((item) => item.id);
  checkIn.linkedChallengeIds = links.map((item) => item.id);
  for (const challenge of creates) {
    ensureList(state, "challenges").push(challenge);
    appendChallengeActivity(state, challenge, actor, "created", {}, "weekly_tracker", checkIn.id);
  }
  for (const challenge of links) {
    appendChallengeActivity(state, challenge, actor, "linked_to_checkin", {}, "weekly_tracker", checkIn.id);
  }
  recordCompletion(state, checkIn.clientId, "weekly_check_in", checkIn.id, "Accountability form submitted");
  pushAlert(state, checkIn.clientId, checkIn.stuck ? "checkin_stuck" : "checkin_submitted", "Accountability form submitted.");
  addAudit(state, "checkin.submitted", "Accountability form submitted", actor, { checkInId });
  return true;
}

export function getClient(state, clientId = state.session.clientId) {
  return state.clients.find((client) => client.id === clientId);
}

export function getWorkspace(state, workspaceId = state.session.workspaceId) {
  return state.relationshipWorkspaces?.find((workspace) => workspace.id === workspaceId);
}

export function setSessionClient(state, clientId) {
  const client = getClient(state, clientId);
  if (!client || client.archivedAt) return false;
  state.session.clientId = clientId;
  const currentWorkspace = getWorkspace(state, state.session.workspaceId);
  const currentIsActive = currentWorkspace?.clientIds?.includes(clientId) && isActiveWorkspace(state, currentWorkspace.id);
  state.session.workspaceId = currentIsActive ? currentWorkspace.id : getActiveClientWorkspace(state, clientId)?.id || null;
  addAudit(state, "session.client_selected", `Selected ${client.name}`, "coach-bri", { clientId });
  return true;
}

function alignSessionSelection(state, preferredClientId = state.session?.clientId) {
  state.session = state.session && typeof state.session === "object" ? state.session : {};
  const selectedClient = isActiveClient(state, preferredClientId)
    ? preferredClientId
    : ensureList(state, "clients").find((client) => !client.archivedAt)?.id || null;
  state.session.clientId = selectedClient;
  if (!selectedClient) {
    state.session.workspaceId = null;
    return;
  }
  const currentWorkspace = getWorkspace(state, state.session.workspaceId);
  state.session.workspaceId = currentWorkspace?.clientIds?.includes(selectedClient) && isActiveWorkspace(state, currentWorkspace.id)
    ? currentWorkspace.id
    : getActiveClientWorkspace(state, selectedClient)?.id || null;
}

export function createClient(state, input = {}) {
  const name = String(input.name || "").trim();
  if (!name) {
    addAudit(state, "client.create_failed", "Client creation failed because name is required", "system");
    return null;
  }
  const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
  let id = idBase.startsWith("client-") ? idBase : `client-${idBase}`;
  let suffix = 2;
  while (getClient(state, id)) {
    id = `${idBase}-${suffix}`;
    if (!id.startsWith("client-")) id = `client-${id}`;
    suffix += 1;
  }
  const email = String(input.email || `${id}@example.test`).trim();
  const phone = String(input.phone || "+15550109999").trim();
  const nextCallAt = String(input.nextCallAt || isoToday()).trim();
  const focus = String(input.focus || "New client onboarding").trim();
  const folderUrl = String(input.folderUrl || state.backendConfig?.dummyDriveFolderUrl || "").trim();
  const client = {
    id,
    name,
    email,
    phone,
    stage: "Sovereign Arc",
    focus,
    nextCallAt,
    smsConsent: true,
    aiConsent: true,
    recordingConsent: true,
    archivedAt: null,
    createdAt: isoToday(),
  };
  ensureList(state, "users").push({
    id,
    role: "client",
    name,
    email,
    phone,
    timezone: "America/New_York",
  });
  ensureList(state, "clients").push(client);
  createWeeklyCheckIn(state, id, { dueAt: nextCallAt }, "coach-bri");
  ensureList(state, "googleDriveSources").push({
    id: makeId("drive"),
    clientId: id,
    folderUrl,
    journalFolderLabel: "Journal Archive",
    roadmapLabel: "Legacy Roadmap",
    videoFolderLabel: "Resource Library",
    status: folderUrl ? "mock_ready" : "not_linked",
  });
  state.session.clientId = id;
  state.session.workspaceId = null;
  addAudit(state, "client.created", `Created ${name}`, "coach-bri", { clientId: id });
  return client;
}

export function updateClient(state, clientId, input = {}) {
  const client = getClient(state, clientId);
  if (!client || client.archivedAt) {
    addAudit(state, "client.update_failed", "Client update failed", "system", { clientId });
    return false;
  }
  const name = String(input.name ?? client.name).trim();
  if (!name) return false;
  client.name = name;
  client.email = String(input.email ?? client.email ?? "").trim();
  client.phone = String(input.phone ?? client.phone ?? "").trim();
  client.focus = String(input.focus ?? client.focus ?? "").trim();
  client.nextCallAt = String(input.nextCallAt ?? client.nextCallAt ?? "").trim();

  const user = ensureList(state, "users").find((item) => item.id === clientId);
  if (user) {
    user.name = client.name;
    user.email = client.email;
    user.phone = client.phone;
  }

  const source = ensureList(state, "googleDriveSources").find((item) => item.clientId === clientId);
  const folderUrl = String(input.folderUrl ?? source?.folderUrl ?? "").trim();
  if (source) {
    source.folderUrl = folderUrl;
    source.status = folderUrl ? "mock_ready" : "not_linked";
  } else if (folderUrl) {
    ensureList(state, "googleDriveSources").push({
      id: makeId("drive"),
      clientId,
      folderUrl,
      journalFolderLabel: "Journal Archive",
      roadmapLabel: "Legacy Roadmap",
      videoFolderLabel: "Resource Library",
      status: "mock_ready",
    });
  }

  addAudit(state, "client.updated", `Updated ${client.name}`, "coach-bri", { clientId });
  return true;
}

export function archiveClient(state, clientId) {
  const client = getClient(state, clientId);
  if (!client || client.archivedAt) {
    addAudit(state, "client.archive_failed", "Client archive failed", "system", { clientId });
    return false;
  }
  client.archivedAt = isoToday();
  client.status = "archived";
  const user = ensureList(state, "users").find((item) => item.id === clientId);
  if (user) user.status = "archived";
  alignSessionSelection(state, state.session.clientId === clientId ? null : state.session.clientId);
  addAudit(state, "client.archived", `Archived ${client.name}`, "coach-bri", { clientId });
  return true;
}

export function unarchiveClient(state, clientId) {
  const client = getClient(state, clientId);
  if (!client || !client.archivedAt) {
    addAudit(state, "client.unarchive_failed", "Client unarchive failed", "system", { clientId });
    return false;
  }
  client.archivedAt = null;
  client.status = "active";
  const user = ensureList(state, "users").find((item) => item.id === clientId);
  if (user) user.status = "active";
  addAudit(state, "client.unarchived", `Unarchived ${client.name}`, "coach-bri", { clientId });
  return true;
}

export function createRelationshipWorkspace(state, clientAId, clientBId) {
  const clientA = getClient(state, clientAId);
  const clientB = getClient(state, clientBId);
  if (!clientA || !clientB || clientA.archivedAt || clientB.archivedAt || clientAId === clientBId) {
    addAudit(state, "relationship_workspace.create_failed", "Relationship workspace creation failed validation", "system", {
      clientAId,
      clientBId,
    });
    return null;
  }
  const existing = ensureList(state, "relationshipWorkspaces").find((workspace) => {
    const ids = [...(workspace.clientIds || [])].sort().join(":");
    return ids === [clientAId, clientBId].sort().join(":") && isActiveWorkspace(state, workspace.id);
  });
  if (existing) {
    state.session.workspaceId = existing.id;
    if (!existing.clientIds.includes(state.session.clientId)) state.session.clientId = existing.clientIds[0];
    addAudit(state, "relationship_workspace.selected", `Selected ${existing.name}`, "coach-bri", { workspaceId: existing.id });
    return existing;
  }
  const workspace = {
    id: makeId("workspace"),
    name: `${clientA.name} + ${clientB.name}`,
    type: "couple",
    clientIds: [clientAId, clientBId],
    focus: "Coach-created shared workspace for open challenges, blocks, tasks, desires, fights, and repair.",
    nextCallAt: clientA.nextCallAt || clientB.nextCallAt,
    sourceFolderUrl: state.backendConfig?.dummyDriveFolderUrl,
    createdAt: isoToday(),
  };
  ensureList(state, "relationshipWorkspaces").push(workspace);
  ensureList(state, "relationshipCheckIns").push({
    id: makeId("rel-checkin"),
    workspaceId: workspace.id,
    dueAt: workspace.nextCallAt || isoToday(),
    status: "not_opened",
    focus: "What relationship issue should we bring to the next call?",
    sharedQuestion: "",
    clientAInput: "",
    clientBInput: "",
    stuck: "",
  });
  state.session.workspaceId = workspace.id;
  if (!workspace.clientIds.includes(state.session.clientId)) state.session.clientId = workspace.clientIds[0];
  addAudit(state, "relationship_workspace.created", `Created ${workspace.name}`, "coach-bri", {
    workspaceId: workspace.id,
    clientIds: workspace.clientIds,
  });
  return workspace;
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
      evidenceRef: { callId, timestampStart: null, source: "mock_call_transcript" },
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
      evidenceRef: { callId, timestampStart: null, source: "mock_call_transcript" },
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
    evidenceRef: { callId, timestampStart: null, source: "mock_call_transcript" },
    clientMessageDraft: "You have one Starship action item ready: draft the first version before the next call.",
    sensitivity: "low",
    confidence: 0.91,
    reviewStatus: "candidate",
    reviewRequiredReason: "Call-derived action requires coach approval before it becomes client-visible.",
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
  pushAlert(state, call.clientId, "review_queue", "Mock call transcript extraction created insight and action candidates for review.");
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
    source: "mock_call_reviewed",
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
    source: "mock_call_reviewed",
    dueAt: candidate.dueAt,
    status: "open",
    reminder: "none",
    evidenceRef: candidate.evidenceRef,
    priority: candidate.priority || "normal",
    clientMessage: String(candidate.clientMessageDraft || "").trim(),
    createdFromCandidateId: id,
    approvedAt: isoToday(),
  };
  ensureList(state, "actionItems").unshift(action);
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

export function updateRelationshipTaskStatus(state, taskId, status) {
  const task = ensureList(state, "relationshipTasks").find((item) => item.id === taskId);
  if (!task || !["open", "blocked", "done"].includes(status)) {
    addAudit(state, "relationship_task.update_failed", "Relationship task status update failed", "system", { taskId, status });
    return false;
  }
  if (task.status === status) return true;
  task.status = status;
  task.updatedAt = isoToday();
  if (status === "done") task.completedAt = isoToday();
  const workspace = getWorkspace(state, task.workspaceId);
  const clientId = workspace?.clientIds?.[0] || state.session.clientId;
  pushAlert(state, clientId, `relationship_task_${status}`, `${task.title} is now ${status}.`);
  addAudit(state, "relationship_task.status_updated", `${task.title} is now ${status}`, "coach-bri", {
    taskId,
    status,
    workspaceId: task.workspaceId,
  });
  return true;
}

export function updateRelationshipIssueStatus(state, issueId, status) {
  const issue = ensureList(state, "relationshipIssues").find((item) => item.id === issueId);
  if (!issue || !["open", "blocked", "repair_in_progress", "closed"].includes(status)) {
    addAudit(state, "relationship_issue.update_failed", "Relationship issue status update failed", "system", { issueId, status });
    return false;
  }
  if (issue.status === status) return true;
  issue.status = status;
  issue.updatedAt = isoToday();
  const workspace = getWorkspace(state, issue.workspaceId);
  const clientId = workspace?.clientIds?.[0] || state.session.clientId;
  pushAlert(state, clientId, `relationship_issue_${status}`, `${issue.title} moved to ${status}.`);
  addAudit(state, "relationship_issue.status_updated", `${issue.title} moved to ${status}`, "coach-bri", {
    issueId,
    status,
    workspaceId: issue.workspaceId,
  });
  return true;
}

export function submitRelationshipCheckIn(state, checkInId, updates, actorId) {
  const checkIn = ensureList(state, "relationshipCheckIns").find((item) => item.id === checkInId);
  const actor = actorId || getSessionActorId(state);
  const workspace = checkIn ? getWorkspace(state, checkIn.workspaceId) : null;
  const allowedFields = ["sharedQuestion", "clientAInput", "clientBInput", "stuck"];
  if (
    !checkIn || !workspace || !updates || typeof updates !== "object" || Array.isArray(updates) ||
    Object.keys(updates).some((key) => !allowedFields.includes(key))
  ) {
    addAudit(state, "relationship_checkin.submit_failed", "Relationship check-in submission failed", "system", { checkInId });
    return false;
  }
  let acceptedUpdates = updates;
  if (!isCoach(state, actor)) {
    if (!isActiveWorkspace(state, workspace.id)) return false;
    const memberIndex = workspace.clientIds.indexOf(actor);
    if (memberIndex < 0 || memberIndex > 1) return false;
    const ownField = memberIndex === 0 ? "clientAInput" : "clientBInput";
    if (Object.entries(updates).some(([key, value]) => key !== ownField && String(value ?? "") !== String(checkIn[key] ?? ""))) {
      return false;
    }
    acceptedUpdates = Object.hasOwn(updates, ownField) ? { [ownField]: updates[ownField] } : {};
  }
  const wasSubmitted = checkIn.status === "submitted";
  Object.assign(checkIn, acceptedUpdates, { status: "submitted", submittedAt: isoToday() });
  if (!wasSubmitted) {
    const clientId = workspace?.clientIds?.[0] || state.session.clientId;
    pushAlert(state, clientId, "relationship_checkin_submitted", `${workspace?.name || "Relationship"} check-in submitted.`);
  }
  addAudit(state, "relationship_checkin.submitted", "Relationship check-in submitted", actor, {
    checkInId,
    workspaceId: checkIn.workspaceId,
  });
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

function boundedExcerpt(value, limit = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit - 1);
  const boundary = slice.lastIndexOf(" ");
  return `${slice.slice(0, boundary > 60 ? boundary : limit - 1).trimEnd()}…`;
}

function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function dayDifference(from, to) {
  const a = parseCalendarDate(from);
  const b = parseCalendarDate(to);
  return a && b ? Math.round((b - a) / 86400000) : null;
}

function readableDate(value) {
  const date = parseCalendarDate(String(value || "").slice(0, 10));
  return date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date) : null;
}

function nextCallFacts(nextCallAt, today) {
  const date = String(nextCallAt || "").slice(0, 10);
  const difference = dayDifference(today, date);
  if (difference == null) return { label: "Not scheduled", difference: null };
  const relative = difference === 0 ? "Today" : difference === 1 ? "Tomorrow" : difference > 1 ? `In ${difference} days` : `${Math.abs(difference)} days ago`;
  return { label: `${readableDate(date)} · ${relative}`, difference };
}

function currentCheckInFacts(records, submitted, today) {
  const current = records
    .filter((item) => item.periodStart <= today && item.periodEnd >= today)
    .sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd)) || String(a.id).localeCompare(String(b.id)))[0];
  const scheduled = current || records
    .filter((item) => !["submitted", "amended", "reviewed"].includes(item.status))
    .sort((a, b) => String(b.dueAt || b.periodEnd || "").localeCompare(String(a.dueAt || a.periodEnd || "")))[0];
  if (current && ["submitted", "amended", "reviewed"].includes(current.status)) {
    return { state: "submitted", label: `Submitted ${readableDate(String(current.submittedAt || current.periodEnd).slice(0, 10))}`, current };
  }
  if (scheduled) {
    const due = String(scheduled.dueAt || scheduled.periodEnd || "").slice(0, 10);
    if (due < today) return { state: "missing", label: "Missing this period", current: scheduled };
    if (current || due >= today) return { state: "due", label: `Due ${readableDate(due)}`, current: scheduled };
  }
  if (submitted) {
    return {
      state: "stale",
      label: `Stale · last submitted ${readableDate(String(submitted.submittedAt || submitted.periodEnd).slice(0, 10))}`,
      current: null,
    };
  }
  return { state: "not_scheduled", label: "Not scheduled", current: null };
}

function compareNullableAsc(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return String(a).localeCompare(String(b));
}

export function buildCoachAttentionRows(state, { today = isoToday(), sort = state.session?.coachAttentionSort || "attention" } = {}) {
  const validSort = ["attention", "next_call", "latest_checkin", "client_name"].includes(sort) ? sort : "attention";
  const clients = Array.isArray(state.clients) ? state.clients : [];
  const relationshipWorkspaces = Array.isArray(state.relationshipWorkspaces) ? state.relationshipWorkspaces : [];
  const weeklyCheckIns = Array.isArray(state.weeklyCheckIns) ? state.weeklyCheckIns : [];
  const activeClientIds = new Set(clients.filter((client) => !client.archivedAt).map((client) => client.id));
  const activeWorkspaces = relationshipWorkspaces.filter(
    (workspace) =>
      !workspace.archivedAt && workspace.status !== "archived" && workspace.status !== "paused" &&
      (workspace.clientIds || []).every((id) => activeClientIds.has(id)),
  );
  const challenges = (Array.isArray(state.challenges) ? state.challenges : []).filter(
    (item) => !item.archivedAt && item.status !== "resolved",
  );
  const rows = clients.filter((client) => !client.archivedAt).map((client) => {
    const records = weeklyCheckIns.filter((item) => item.clientId === client.id);
    const submittedRecords = records
      .filter((item) => ["submitted", "amended", "reviewed"].includes(item.status))
      .slice()
      .sort((a, b) =>
        String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")) ||
        String(b.periodEnd || "").localeCompare(String(a.periodEnd || "")) ||
        String(a.id).localeCompare(String(b.id)),
      );
    const latest = submittedRecords[0] || null;
    const checkIn = currentCheckInFacts(records, latest, today);
    const currentSubmitted = checkIn.state === "submitted" ? checkIn.current : null;
    const hasCurrentSupport = Boolean(String(currentSubmitted?.questions || currentSubmitted?.supportRequested || "").trim());
    const workspaceIds = new Set(
      activeWorkspaces.filter((workspace) => (workspace.clientIds || []).includes(client.id)).map((workspace) => workspace.id),
    );
    const individual = challenges.filter((item) => item.scopeType === "client" && item.scopeId === client.id);
    const shared = challenges.filter((item) => item.scopeType === "relationship" && workspaceIds.has(item.scopeId));
    const individualBlockedCount = individual.filter((item) => item.blockedAt).length;
    const sharedBlockedCount = shared.filter((item) => item.blockedAt).length;
    const totalBlockedCount = individualBlockedCount + sharedBlockedCount;
    const totalOpenCount = individual.length + shared.length;
    const call = nextCallFacts(client.nextCallAt, today);
    const reasons = [];
    if (totalBlockedCount) reasons.push(`${totalBlockedCount === 1 ? "Blocked challenge" : `${totalBlockedCount} blocked challenges`}`);
    if (hasCurrentSupport) reasons.push("Coaching focus submitted");
    if (call.difference != null && call.difference >= 0 && call.difference <= 3) {
      reasons.push(call.difference === 0 ? "Call today" : call.difference === 1 ? "Call tomorrow" : `Call in ${call.difference} days`);
    }
    if (checkIn.state === "missing") reasons.push("Check-in missing");
    if (checkIn.state === "stale") reasons.push("Check-in stale");
    if (!reasons.length) reasons.push("No urgent attention signal");
    const primaryAttentionKind = totalBlockedCount
      ? "blocked"
      : hasCurrentSupport
        ? "support"
        : call.difference != null && call.difference >= 0 && call.difference <= 3
          ? "upcoming_call"
          : ["missing", "stale"].includes(checkIn.state)
            ? "missing_checkin"
            : "none";
    return {
      clientId: client.id,
      clientName: String(client.name || ""),
      focusExcerpt: boundedExcerpt(latest?.focus || client.focus || "No current focus submitted"),
      focusSource: String(latest?.focus || "").trim() ? "latest_checkin" : "client_profile",
      supportExcerpt: boundedExcerpt(latest?.questions || latest?.supportRequested || "No coaching-focus answer submitted"),
      latestCheckInId: latest?.id || null,
      latestSubmittedAt: latest?.submittedAt || null,
      checkInState: checkIn.state,
      checkInLabel: checkIn.label,
      checkInHistoryCount: new Set(submittedRecords.map((item) => `${item.periodStart}:${item.periodEnd}`)).size,
      individualOpenCount: individual.length,
      individualBlockedCount,
      sharedOpenCount: shared.length,
      sharedBlockedCount,
      totalOpenCount,
      totalBlockedCount,
      nextCallAt: parseCalendarDate(String(client.nextCallAt || "").slice(0, 10)) ? String(client.nextCallAt).slice(0, 10) : null,
      nextCallLabel: call.label,
      attentionReasons: reasons,
      primaryAttentionKind,
      _callDifference: call.difference,
      _hasSupport: hasCurrentSupport,
    };
  });

  const finalTie = (a, b) => a.clientName.localeCompare(b.clientName) || a.clientId.localeCompare(b.clientId);
  rows.sort((a, b) => {
    if (validSort === "client_name") return finalTie(a, b);
    if (validSort === "next_call") return compareNullableAsc(a.nextCallAt, b.nextCallAt) || finalTie(a, b);
    if (validSort === "latest_checkin") {
      if (!a.latestSubmittedAt && !b.latestSubmittedAt) return finalTie(a, b);
      if (!a.latestSubmittedAt) return 1;
      if (!b.latestSubmittedAt) return -1;
      return b.latestSubmittedAt.localeCompare(a.latestSubmittedAt) || finalTie(a, b);
    }
    const aUpcoming = a._callDifference != null && a._callDifference >= 0 && a._callDifference <= 3;
    const bUpcoming = b._callDifference != null && b._callDifference >= 0 && b._callDifference <= 3;
    const aCheck = a.checkInState === "missing" ? 0 : a.checkInState === "stale" ? 1 : 2;
    const bCheck = b.checkInState === "missing" ? 0 : b.checkInState === "stale" ? 1 : 2;
    return (
      Number(b.totalBlockedCount > 0) - Number(a.totalBlockedCount > 0) ||
      (a.totalBlockedCount && b.totalBlockedCount ? b.totalBlockedCount - a.totalBlockedCount : 0) ||
      Number(b._hasSupport) - Number(a._hasSupport) ||
      Number(bUpcoming) - Number(aUpcoming) ||
      (aUpcoming && bUpcoming ? a._callDifference - b._callDifference : 0) ||
      aCheck - bCheck ||
      compareNullableAsc(a.nextCallAt, b.nextCallAt) ||
      finalTie(a, b)
    );
  });
  return rows.map(({ _callDifference, _hasSupport, ...row }) => row);
}

export function getRecommendedVideos(state, clientId) {
  const lowest = state.roadmap
    .filter((item) => item.clientId === clientId)
    .slice()
    .sort((a, b) => a.current / a.target - b.current / b.target)[0];
  if (!lowest) return state.videos.slice(0, 1);
  return state.videos.filter((video) => video.topic === lowest.name || video.tags.includes(lowest.name.toLowerCase())).slice(0, 2);
}
