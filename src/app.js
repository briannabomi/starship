import { loadState, resetState, saveState } from "./state.js";
import {
  approveActionCandidate,
  approveInsightCandidate,
  archiveClient,
  archiveChallenge,
  blockChallenge,
  buildCoachAttentionRows,
  completeAction,
  createClient,
  createChallenge,
  createRelationshipWorkspace,
  getActiveClientWorkspace,
  getChallenges,
  getClient,
  getCurrentWeeklyCheckIn,
  getJournalForAssignment,
  getRecommendedVideos,
  getSubmittedCheckIns,
  getWorkspace,
  mockExtractCall,
  reopenChallenge,
  resolveChallenge,
  restoreChallenge,
  setChallengeStatus,
  setSessionClient,
  submitAssignment,
  submitCheckIn,
  submitRelationshipCheckIn,
  unarchiveClient,
  updateClient,
  unblockChallenge,
  updateRelationshipIssueStatus,
  updateRelationshipTaskStatus,
  upsertJournal,
} from "./domain.js";

let state = loadState();
const app = document.querySelector("#app");
let lastDialogTrigger = null;
let pendingFocusId = null;
let statusMessage = "";

function persist() {
  saveState(state);
  render();
}

function setRole(role) {
  state.session.role = role;
  persist();
}

function selectClient(clientId) {
  setSessionClient(state, clientId);
  persist();
}

function actorId() {
  return state.session.role === "coach" ? "coach-bri" : state.session.clientId;
}

function clientItems(collection) {
  return collection.filter((item) => item.clientId === state.session.clientId);
}

function driveSourceFor(clientId = state.session.clientId) {
  return state.googleDriveSources?.find((source) => source.clientId === clientId);
}

function clientWorkspaces(clientId = state.session.clientId) {
  const workspace = getActiveClientWorkspace(state, clientId);
  return workspace ? [workspace] : [];
}

function activeWorkspaceForView() {
  if (state.session.role === "coach") return getWorkspace(state);
  return getActiveClientWorkspace(state, state.session.clientId);
}

function announce(message) {
  statusMessage = message;
}

function dateLabel(value) {
  if (!value) return "Not scheduled";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return String(value);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "#";
  } catch {
    return "#";
  }
}

function labelize(value) {
  return String(value || "").replaceAll("_", " ");
}

function statusClass(status) {
  return `pill ${String(status).replaceAll("_", "-")}`;
}

function emptyState(message) {
  return `<p class="empty">${message}</p>`;
}

function dueCue(dateValue) {
  const today = new Date().toISOString().slice(0, 10);
  if (!dateValue) return "No due date";
  if (dateValue < today) return `Overdue since ${dateValue}`;
  if (dateValue === today) return "Due today";
  return `Due ${dateValue}`;
}

function completionCue(item) {
  if (item.status === "done") return `Completed ${item.completedAt || "recently"}`;
  if (item.status === "blocked") return "Blocked - bring this to the next call";
  return dueCue(item.dueAt);
}

function blockActionItem(id) {
  const item = state.actionItems.find((action) => action.id === id);
  if (!item || item.status === "done") return;
  item.status = "blocked";
  item.blockedAt = new Date().toISOString().slice(0, 10);
  state.alerts.unshift({
    id: `alert-${Date.now()}`,
    clientId: item.clientId,
    type: "action_blocked",
    message: `${item.title} was marked blocked and needs discussion.`,
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  state.auditLog.unshift({
    id: `audit-${Date.now()}`,
    event: "action.blocked",
    actor: item.clientId,
    detail: item.title,
    createdAt: new Date().toISOString().slice(0, 10),
  });
}

function shell(content) {
  const client = getClient(state);
  const workspace = activeWorkspaceForView();
  const isCoachView = state.session.role === "coach";
  const requestedClientView = state.session.clientView || "dashboard";
  const clientView = requestedClientView === "relationship" && !workspace ? "dashboard" : requestedClientView;
  if (!isCoachView && clientView !== requestedClientView) state.session.clientView = clientView;
  const destinationTitle = { dashboard: "My Dashboard", relationship: "Relationship", library: "Resource Library" }[clientView] || "My Dashboard";
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Starship Tracker MVP</p>
        <h1>${isCoachView ? "Coach command center" : destinationTitle}</h1>
      </div>
      <div class="top-actions">
        <div class="demo-role-controls" role="group" aria-label="Demo role preview; production authentication is deferred">
          <span class="demo-role-label">Demo role preview · production authentication deferred</span>
          <button class="${state.session.role === "coach" ? "active" : ""}" data-action="role" data-role="coach">Coach</button>
          <button class="${state.session.role === "client" ? "active" : ""}" data-action="role" data-role="client">Client</button>
        </div>
        <button data-action="reset">Reset demo</button>
      </div>
    </header>
    <main>
      <div class="visually-hidden" aria-live="polite" id="app-status">${escapeHtml(statusMessage)}</div>
      ${!isCoachView ? `
      <nav class="client-portal-nav" aria-label="Client portal">
        <button data-action="client-view" data-view="dashboard" ${clientView === "dashboard" ? 'aria-current="page" class="active"' : ""}>My Dashboard</button>
        ${workspace ? `<button data-action="client-view" data-view="relationship" ${clientView === "relationship" ? 'aria-current="page" class="active"' : ""}>Relationship</button>` : ""}
        <button data-action="client-view" data-view="library" ${clientView === "library" ? 'aria-current="page" class="active"' : ""}>Resource Library</button>
      </nav>
      <section class="identity-band">
        <div>
          <span class="label">Your portal</span>
          <strong>${escapeHtml(client.name)}</strong>
        </div>
        <div>
          <span class="label">${clientView === "relationship" ? "Shared workspace" : "Current focus"}</span>
          <strong>${clientView === "relationship" ? escapeHtml(workspace?.focus || workspace?.name) : escapeHtml(client.focus)}</strong>
        </div>
        <div>
          <span class="label">${clientView === "relationship" ? "Participants" : "Next call"}</span>
          <strong>${clientView === "relationship" ? workspace.clientIds.map((id) => escapeHtml(getClient(state, id)?.name || id)).join(" + ") : dateLabel(client.nextCallAt)}</strong>
        </div>
      </section>
      ` : ""}
      ${content}
    </main>
  `;
}

function coachDashboard() {
  const selectedClientId = state.session.clientId;
  const selectedAlerts = state.alerts.filter((item) => item.clientId === selectedClientId);
  const selectedCalls = state.calls.filter((item) => item.clientId === selectedClientId);
  const pendingInsights = state.insightCandidates.filter((item) => item.clientId === selectedClientId && item.reviewStatus === "candidate");
  const pendingActions = state.actionItemCandidates.filter((item) => item.clientId === selectedClientId && item.reviewStatus === "candidate");
  const reviewedInsights = state.insightCandidates.filter((item) => item.clientId === selectedClientId && item.reviewStatus !== "candidate").slice(0, 3);
  const reviewedActions = state.actionItemCandidates.filter((item) => item.clientId === selectedClientId && item.reviewStatus !== "candidate").slice(0, 3);
  const checkIn = getCurrentWeeklyCheckIn(state, selectedClientId, actorId()) || getSubmittedCheckIns(state, selectedClientId, actorId())[0];
  return shell(`
    ${coachAttentionView()}

    <section class="selected-client-detail" aria-labelledby="selected-client-detail-title">
      <div class="detail-heading"><p class="eyebrow">Selected client detail</p><h2 id="selected-client-detail-title" tabindex="-1">${escapeHtml(getClient(state)?.name || "Client")} details</h2></div>

    <section class="grid two">
      <article class="panel">${relationshipDashboard()}</article>
      <article class="panel">${clientSourceView()}</article>
    </section>

    <section class="panel">${challengeSection("client", state.session.clientId)}</section>

    <section class="grid two">
      <article class="panel">
        <div class="panel-title">
          <h2>Attention queue</h2>
          <span class="pill">${selectedAlerts.filter((alert) => !alert.read).length} unread</span>
        </div>
        ${selectedAlerts.length ? selectedAlerts
          .map((alert) => `<div class="row"><span class="${statusClass(alert.type)}">${labelize(alert.type)}</span><p>${escapeHtml(alert.message)}</p></div>`)
          .join("") : emptyState("No alerts yet. Completed assignments, stuck check-ins, and approved imports will appear here.")}
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Call imports</h2>
          <span class="pill">review first</span>
        </div>
        ${selectedCalls.length ? selectedCalls
          .map(
            (call) => `
              <div class="row tall">
                <div>
                  <strong>${escapeHtml(call.title)}</strong>
                  <p>${escapeHtml(call.transcript)}</p>
                  <small>${escapeHtml(call.happenedAt || "Recent")} · ${labelize(call.status)} · extracted items stay private until approved</small>
                </div>
                <button data-action="extract" data-id="${call.id}" ${call.status === "extracted" ? "disabled" : ""}>${call.status === "extracted" ? "Extracted" : "Extract"}</button>
              </div>
            `,
          )
          .join("") : emptyState("No call recordings or transcripts have been imported yet.")}
      </article>
    </section>

    <section class="grid two">
      <article class="panel">
        <div class="panel-title">
          <h2>Insight review</h2>
          <span class="pill">${pendingInsights.length} candidates</span>
        </div>
        ${pendingInsights.length ? pendingInsights.map(insightCard).join("") : `<p class="empty">No insight candidates waiting.</p>`}
        ${reviewedInsights.length ? `<h3>Recently approved</h3>${reviewedInsights.map(reviewedCandidateRow).join("")}` : ""}
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Action review</h2>
          <span class="pill">${pendingActions.length} candidates</span>
        </div>
        ${pendingActions.length ? pendingActions.map(actionCandidateCard).join("") : `<p class="empty">No action candidates waiting.</p>`}
        ${reviewedActions.length ? `<h3>Recently approved</h3>${reviewedActions.map(reviewedCandidateRow).join("")}` : ""}
      </article>
    </section>

    <section class="grid two">
      <article class="panel">${assignmentManager()}</article>
      <article class="panel">${coachPrepView(checkIn)}</article>
    </section>

    <section class="grid two">
      <article class="panel">${actionItemsView("coach")}</article>
      <article class="panel">${roadmapView()}</article>
    </section>

    <section class="grid two">
      <article class="panel">${manualNotesView()}</article>
      <article class="panel">${auditView()}</article>
    </section>

    <section class="grid two coach-management" aria-label="Client management">
      <article class="panel">${clientRosterView({ managementOnly: true })}</article>
      <article class="panel">${relationshipBuilderView()}</article>
    </section>
    </section>
  `);
}

function clientDashboard() {
  const assignments = clientItems(state.assignments);
  const checkIn = getCurrentWeeklyCheckIn(state, state.session.clientId, actorId()) || getSubmittedCheckIns(state, state.session.clientId, actorId())[0];
  const nextAssignment = assignments.find((item) => item.status !== "submitted") || assignments[0];
  const recommendedVideos = getRecommendedVideos(state, state.session.clientId);
  const view = state.session.clientView || "dashboard";
  if (view === "library") return shell(`<section class="panel">${libraryView()}</section>`);
  if (view === "relationship" && activeWorkspaceForView()) return shell(relationshipWorkspaceView());
  return shell(`
    <section class="panel">${weeklyTracker(checkIn)}</section>
    <section class="panel">${challengeSection("client", state.session.clientId)}</section>
    <section class="grid two">
      <article class="panel">
        <div class="panel-title">
          <h2>Recommended now</h2>
          <span class="pill">topic match</span>
        </div>
        ${recommendedVideos.length ? recommendedVideos.map((video) => videoCard(video, recommendationReason(video))).join("") : emptyState("No video recommendations yet. Roadmap focus will power this list.")}
      </article>
    </section>
    <section class="grid two"><article class="panel">${assignments.length ? assignments.map(assignmentEditor).join("") : emptyState("No journal prompts assigned yet.")}</article><article class="panel">${weeklyHistoryView()}</article></section>
    <section class="panel">${actionItemsView()}</section>
    <section class="panel">${clientSourceView()}</section>
    <section class="grid two">
      <article class="panel">${journalArchiveView()}</article>
      <article class="panel">${progressEvidenceView()}</article>
    </section>
  `);
}

function coachAttentionView() {
  const sort = ["attention", "next_call", "latest_checkin", "client_name"].includes(state.session.coachAttentionSort)
    ? state.session.coachAttentionSort
    : "attention";
  const rows = buildCoachAttentionRows(state, { today: new Date().toISOString().slice(0, 10), sort });
  return `
    <section class="panel coach-attention" aria-labelledby="coach-attention-title">
      <div class="attention-header">
        <div><p class="eyebrow">Weekly overview</p><h2 id="coach-attention-title">Weekly client attention</h2><p>Current focus, requested support, check-in freshness, open challenges, and next calls.</p></div>
        <div class="attention-controls">
          <label for="attention-sort">Sort clients
            <select id="attention-sort" data-action="attention-sort">
              <option value="attention" ${sort === "attention" ? "selected" : ""}>Needs attention</option>
              <option value="next_call" ${sort === "next_call" ? "selected" : ""}>Next call</option>
              <option value="latest_checkin" ${sort === "latest_checkin" ? "selected" : ""}>Latest check-in</option>
              <option value="client_name" ${sort === "client_name" ? "selected" : ""}>Client name</option>
            </select>
          </label>
          <button data-action="open-add-client">Add Client</button>
        </div>
      </div>
      <p class="result-count" aria-live="polite">${rows.length} active client${rows.length === 1 ? "" : "s"}</p>
      ${rows.length ? `<ol class="attention-list">${rows.map(attentionCard).join("")}</ol>` : emptyState("No active clients. Add or unarchive a client to build the weekly overview.")}
      ${addClientDialog()}
    </section>
  `;
}

function attentionCard(row) {
  const blocked = row.totalBlockedCount > 0;
  return `
    <li><article class="attention-card ${blocked ? "has-blocked" : ""}">
      <div class="attention-card-heading">
        <h3>${escapeHtml(row.clientName)}</h3>
        ${blocked ? `<span class="blocked-badge"><span aria-hidden="true">!</span> Blocked · ${row.totalBlockedCount}</span>` : `<span class="pill">${escapeHtml(row.attentionReasons?.[0] || "No urgent attention signal")}</span>`}
      </div>
      <dl class="attention-facts">
        <div><dt>Current focus</dt><dd>${escapeHtml(row.focusExcerpt || "No focus recorded")}</dd><small>${labelize(row.focusSource || "client_profile")}</small></div>
        <div class="attention-focus"><dt>Coaching focus</dt><dd>${escapeHtml(row.supportExcerpt || "No coaching-focus answer submitted")}</dd></div>
        <div><dt>Check-in</dt><dd>${escapeHtml(row.checkInLabel || labelize(row.checkInState))}</dd><small>${row.checkInHistoryCount ? `${row.checkInHistoryCount} prior submission${row.checkInHistoryCount === 1 ? "" : "s"}` : "No submission history"}</small></div>
        <div><dt>Challenges</dt><dd>${row.individualOpenCount} individual open · ${row.individualBlockedCount} blocked</dd><small>${row.sharedOpenCount} shared open · ${row.sharedBlockedCount} blocked</small></div>
        <div><dt>Next call</dt><dd>${escapeHtml(row.nextCallLabel || dateLabel(row.nextCallAt))}</dd></div>
        <div><dt>Attention</dt><dd>${(row.attentionReasons || []).map((reason) => `<span class="reason-chip">${escapeHtml(reason)}</span>`).join(" ")}</dd></div>
      </dl>
      <div class="button-row attention-actions">
        <button data-action="view-client-detail" data-id="${escapeHtml(row.clientId)}">View ${escapeHtml(row.clientName)} details</button>
        <button class="secondary-button" data-action="archive-client" data-id="${escapeHtml(row.clientId)}">Archive</button>
      </div>
    </article></li>
  `;
}

function relationshipWorkspaceView() {
  const workspace = activeWorkspaceForView();
  const participantNames = workspace.clientIds.map((id) => getClient(state, id)?.name || id);
  return `
    <section class="audience-banner"><strong>Shared workspace</strong> · Visible to ${participantNames.map(escapeHtml).join(", ")}, and Bri</section>
    <section class="panel">${challengeSection("relationship", workspace.id)}</section>
    <section class="panel">${relationshipClientView()}</section>
  `;
}

function challengeSection(scopeType, scopeId) {
  const shared = scopeType === "relationship";
  const filterKey = shared ? "relationshipChallengeFilter" : "personalChallengeFilter";
  const filter = state.session[filterKey] || "open";
  const all = getChallenges(state, { scopeType, scopeId, includeResolved: true, includeArchived: true }, actorId());
  const challenges = all.filter((challenge) => {
    if (filter === "archived") return Boolean(challenge.archivedAt);
    if (challenge.archivedAt) return false;
    if (filter === "resolved") return challenge.status === "resolved";
    if (filter === "blocked") return challenge.status !== "resolved" && Boolean(challenge.blockedAt);
    return challenge.status !== "resolved";
  });
  const heading = shared ? "Shared open challenges" : "My open challenges";
  const audience = shared
    ? `Shared · Visible to ${activeWorkspaceForView().clientIds.map((id) => getClient(state, id)?.name || id).join(", ")}, and Bri`
    : state.session.role === "coach"
      ? `Private · Visible to ${getClient(state, scopeId)?.name || "this client"} and Bri`
      : "Private · Visible to you and Bri";
  const emptyMessages = {
    open: "You have no open challenges.",
    blocked: "Nothing is blocked right now.",
    resolved: "Resolved challenges will appear here.",
    archived: "No challenges are archived.",
  };
  return `
    <div class="panel-title challenge-title">
      <div><h2>${heading}</h2><p class="audience-label">${escapeHtml(audience)}</p></div>
      <div class="challenge-controls">
        <label>Show <select data-action="challenge-filter" data-filter-key="${filterKey}">
          ${["open", "blocked", "resolved", "archived"].map((value) => `<option value="${value}" ${filter === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}
        </select></label>
        <button data-action="open-challenge-dialog" data-scope-type="${scopeType}" data-scope-id="${scopeId}">${shared ? "Add shared challenge" : "Add challenge"}</button>
      </div>
    </div>
    <p class="result-count" aria-live="polite">${challenges.length} ${filter} challenge${challenges.length === 1 ? "" : "s"}</p>
    ${challenges.length ? `<ul class="challenge-list">${challenges.map((challenge) => challengeCard(challenge, shared)).join("")}</ul>` : emptyState(emptyMessages[filter])}
    ${challengeDialog(scopeType, scopeId, audience)}
    ${blockDialog(scopeType, scopeId, audience)}
  `;
}

function challengeCard(challenge, shared) {
  const owner = challenge.ownerType === "both_clients" ? "Both clients" : challenge.ownerId ? getClient(state, challenge.ownerId)?.name : labelize(challenge.ownerType);
  const blocked = Boolean(challenge.blockedAt && challenge.status !== "resolved");
  return `
    <li><article class="challenge-card ${blocked ? "has-blocked" : ""}" id="challenge-${escapeHtml(challenge.id)}" tabindex="-1">
      <div class="challenge-badges"><span class="pill">${shared ? "Shared" : "Private"}</span><span class="pill">${labelize(challenge.status)}</span>${blocked ? `<span class="blocked-badge"><span aria-hidden="true">!</span> Blocked</span>` : ""}</div>
      <h3>${escapeHtml(challenge.title)}</h3>
      ${challenge.description ? `<p>${escapeHtml(challenge.description)}</p>` : ""}
      ${challenge.desiredOutcome ? `<p><strong>Desired outcome:</strong> ${escapeHtml(challenge.desiredOutcome)}</p>` : ""}
      ${blocked ? `<div class="block-reason"><strong>What is blocking progress</strong><p>${escapeHtml(challenge.blockedReason || "Reason not yet recorded")}</p></div>` : ""}
      <p class="challenge-meta">Owner of next step: ${escapeHtml(owner || "Unassigned")} · ${challenge.priority !== "none" ? `${labelize(challenge.priority)} priority · ` : ""}Updated ${dateLabel(challenge.updatedAt)}</p>
      <div class="button-row challenge-actions">
        ${challenge.archivedAt ? `<button data-action="challenge-restore" data-id="${challenge.id}">Restore</button>` : challenge.status === "resolved" ? `<button data-action="challenge-reopen" data-id="${challenge.id}">Reopen</button><button data-action="challenge-archive" data-id="${challenge.id}">Archive</button>` : `
          <button data-action="challenge-status" data-id="${challenge.id}" data-status="${challenge.status === "in_focus" ? "backlog" : "in_focus"}">${challenge.status === "in_focus" ? "Return to backlog" : "Focus"}</button>
          ${blocked ? `<button data-action="challenge-unblock" data-id="${challenge.id}">Unblock</button>` : `<button data-action="open-block-dialog" data-id="${challenge.id}">Mark blocked</button>`}
          <button data-action="challenge-resolve" data-id="${challenge.id}">Resolve</button>
          <button data-action="challenge-archive" data-id="${challenge.id}">Archive</button>
        `}
      </div>
    </article></li>
  `;
}

function challengeDialog(scopeType, scopeId, audience) {
  const shared = scopeType === "relationship";
  const workspace = shared ? activeWorkspaceForView() : null;
  const key = `${scopeType}-${scopeId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const titleId = `challenge-dialog-title-${key}`;
  const audienceId = `challenge-dialog-audience-${key}`;
  const errorId = `challenge-dialog-error-${key}`;
  return `<dialog class="challenge-modal" data-dialog="challenge" aria-labelledby="${titleId}" aria-describedby="${audienceId} ${errorId}">
    <form class="challenge-form" data-scope-type="${scopeType}" data-scope-id="${scopeId}">
      <div class="modal-header"><h2 id="${titleId}">Add ${shared ? "shared" : "private"} challenge</h2><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close add challenge form">×</button></div>
      <p id="${audienceId}" class="audience-label">${escapeHtml(audience)}</p>
      <label>Title <input name="title" required autocomplete="off" aria-describedby="${errorId}" /></label>
      <label>Context <textarea name="description"></textarea></label>
      <label>What would feel different? <textarea name="desiredOutcome"></textarea></label>
      <label>Owner of next step <select name="owner">
        <option value="unassigned:">Unassigned</option>
        ${shared ? workspace.clientIds.map((id) => `<option value="client:${id}">${escapeHtml(getClient(state, id)?.name || id)}</option>`).join("") + '<option value="both_clients:">Both clients</option>' : `<option value="client:${state.session.clientId}">${escapeHtml(getClient(state)?.name || "Client")}</option>`}
        <option value="coach:coach-bri">Bri</option>
      </select></label>
      <label>Priority <select name="priority">${["none", "low", "medium", "high", "urgent"].map((value) => `<option value="${value}">${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}</select></label>
      <label>Initial status <select name="status"><option value="backlog">Backlog</option><option value="in_focus">In focus</option></select></label>
      <p class="form-error" id="${errorId}" role="alert"></p>
      <div class="modal-actions"><button type="button" data-action="close-dialog">Cancel</button><button type="submit">${shared ? "Add shared challenge" : "Add challenge"}</button></div>
    </form>
  </dialog>`;
}

function blockDialog(scopeType, scopeId, audience) {
  const scopeKey = `${scopeType}-${scopeId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const titleId = `block-dialog-title-${scopeKey}`;
  const contextId = `block-dialog-context-${scopeKey}`;
  const errorId = `block-dialog-error-${scopeKey}`;
  return `<dialog class="challenge-modal block-modal" data-dialog="block" aria-labelledby="${titleId}" aria-describedby="${contextId} ${errorId}">
    <form class="block-form"><div class="modal-header"><h2 id="${titleId}">Mark blocked</h2><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close block form">×</button></div>
      <p id="${contextId}"><strong data-block-title></strong><br><span class="audience-label">${escapeHtml(audience)}</span></p>
      <input type="hidden" name="challengeId" /><label>What is blocking progress? <textarea name="reason" required aria-describedby="${errorId}"></textarea></label>
      <p class="form-error" id="${errorId}" role="alert"></p><div class="modal-actions"><button type="button" data-action="close-dialog">Cancel</button><button type="submit">Mark blocked</button></div>
    </form>
  </dialog>`;
}

function weeklyHistoryView() {
  const history = getSubmittedCheckIns(state, state.session.clientId, actorId());
  return `<div class="panel-title"><h2 id="weekly-history-title" tabindex="-1">Accountability form history</h2><span class="pill">${history.length} submitted</span></div>
    ${history.length ? `<ol class="history-list">${history.map((item) => `<li><details><summary>Week ending ${dateLabel(item.periodEnd || item.dueAt)} · Submitted ${dateLabel(item.submittedAt)}</summary><article><p class="audience-label">Read-only · Private to you and Bri</p>${weeklyAnswerReview(item)}</article></details></li>`).join("")}</ol>` : emptyState("Your submitted accountability forms will appear here.")}`;
}

const DEFAULT_QUESTION_LABELS = {
  previousGoal: "What was the #1 goal you set for yourself last week?",
  completedPreviousGoal: "Did you complete the #1 goal you set last week?",
  alive: "What is your biggest win this past week?",
  focus: "What is the ONE thing that, if you did it this week, would move your relationship and/or life forward the most?",
  completed: "What specific steps do you need to take to make that a reality this week? List the steps in order.",
  questions: "What do you most want coaching on this week, and what would make this week's call feel like a win?",
  supportRequested: "Where do you most want Bri's support this week?",
  stuck: "Stuck point",
};
const WEEKLY_TRACKER_FIELDS = ["previousGoal", "completedPreviousGoal", "alive", "focus", "completed", "questions"];

function weeklyAnswerReview(checkIn) {
  const labels = { ...DEFAULT_QUESTION_LABELS, ...(checkIn.questionLabels || {}) };
  const answers = WEEKLY_TRACKER_FIELDS.map((key) => `
    <div class="review-answer"><h4>${escapeHtml(labels[key])}</h4><p>${escapeHtml(checkIn[key] || "No response submitted")}</p></div>
  `).join("");
  const ratings = Object.entries(checkIn.ratings || {}).map(([key, value]) => `<li>${escapeHtml(labelize(key))}: ${escapeHtml(value)}</li>`).join("");
  return `${answers}${ratings ? `<div class="review-answer"><h4>Ratings</h4><ul>${ratings}</ul></div>` : ""}`;
}

function relationshipBuilderView() {
  const active = getWorkspace(state);
  const defaultClientAId = state.session.clientId;
  const activeClients = state.clients.filter((client) => !client.archivedAt);
  const defaultClientBId = activeClients.find((client) => client.id !== defaultClientAId)?.id;
  return `
    <div class="panel-title"><h2>Manual relationship link</h2><span class="pill">coach only</span></div>
    <p>Create a shared workspace only when two clients are both in the program and you decide to connect them.</p>
    <form class="relationship-builder-form">
      <label>Client 1
        <select name="clientAId">
          ${activeClients.map((client) => `<option value="${escapeHtml(client.id)}" ${client.id === defaultClientAId ? "selected" : ""}>${escapeHtml(client.name)}</option>`).join("")}
        </select>
      </label>
      <label>Client 2
        <select name="clientBId">
          ${activeClients.map((client) => `<option value="${escapeHtml(client.id)}" ${client.id === defaultClientBId ? "selected" : ""}>${escapeHtml(client.name)}</option>`).join("")}
        </select>
      </label>
      <button type="submit">Create or select workspace</button>
    </form>
    <div class="row tall">
      <div>
        <strong>Active workspace</strong>
        <p>${active?.name || "None selected"}</p>
        <small>Client portals remain individual. Shared items appear only for linked members.</small>
      </div>
    </div>
  `;
}

function clientSourceView() {
  const source = driveSourceFor();
  const client = getClient(state);
  return `
    <div class="panel-title"><h2>Client source folder</h2><div class="button-row"><span class="pill">${source?.status ? labelize(source.status) : "not linked"}</span>${state.session.role === "coach" ? `<button data-action="open-edit-client">Edit client</button>` : ""}</div></div>
    <p>${escapeHtml(client.name)}'s MVP source of truth is their Google Drive folder. Journal prompts, submitted reflections, roadmap files, and resources can live there while the backend catches up.</p>
    ${source ? `
      <div class="row tall"><div><strong>Google Drive folder</strong><p>${escapeHtml(source.folderUrl)}</p><small>Single client source folder for this MVP</small></div><a href="${safeUrl(source.folderUrl)}" target="_blank" rel="noreferrer">Open Drive</a></div>
    ` : emptyState("No Google Drive source is linked to this client yet.")}
    ${state.session.role === "coach" ? editClientDialog(client, source) : ""}
  `;
}

function editClientDialog(client, source) {
  return `<dialog class="client-edit-modal" data-dialog="edit-client" aria-labelledby="edit-client-title">
    <form class="edit-client-form" data-id="${escapeHtml(client.id)}">
      <div class="modal-header"><div><p class="eyebrow">Client Dashboard</p><h2 id="edit-client-title">Edit ${escapeHtml(client.name)}</h2></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close edit client form">×</button></div>
      <label>Name<input name="name" value="${escapeHtml(client.name)}" required /></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(client.email || "")}" /></label>
      <label>Phone<input name="phone" type="tel" value="${escapeHtml(client.phone || "")}" /></label>
      <label>Current focus<input name="focus" value="${escapeHtml(client.focus || "")}" /></label>
      <label>Next call date<input name="nextCallAt" type="date" value="${escapeHtml(String(client.nextCallAt || "").slice(0, 10))}" /></label>
      <label>Google Drive folder<input name="folderUrl" type="url" value="${escapeHtml(source?.folderUrl || "")}" /></label>
      <div class="modal-actions"><button type="button" data-action="close-dialog">Cancel</button><button type="submit">Save client</button></div>
    </form>
  </dialog>`;
}

function addClientDialog() {
  return `<dialog class="client-modal" aria-labelledby="add-client-title">
    <form class="new-client-form">
      <div class="modal-header"><div><p class="eyebrow">Client Dashboard</p><h2 id="add-client-title">Add Client</h2></div><button class="icon-button" type="button" data-action="close-add-client" aria-label="Close add client form">×</button></div>
      <label>Name<input name="name" placeholder="Client name" autocomplete="name" required /></label>
      <label>Email<input name="email" type="email" placeholder="client@example.test" autocomplete="email" /></label>
      <label>Phone<input name="phone" type="tel" placeholder="+15550109999" autocomplete="tel" /></label>
      <label>Current focus<input name="focus" placeholder="What they are working on" /></label>
      <label>Next call date<input name="nextCallAt" type="date" /></label>
      <label>Google Drive folder<input name="folderUrl" type="url" placeholder="https://drive.google.com/..." /></label>
      <div class="modal-actions"><button type="button" data-action="close-add-client">Cancel</button><button type="submit">Create client</button></div>
    </form>
  </dialog>`;
}

function clientRosterView({ managementOnly = false } = {}) {
  const activeClients = state.clients.filter((client) => !client.archivedAt);
  const archivedClients = state.clients.filter((client) => client.archivedAt);
  return `
    <div class="panel-title">
      <div><h2>Client management</h2><span class="pill">${activeClients.length} active</span></div>
      ${managementOnly ? "" : '<button data-action="open-add-client">Add Client</button>'}
    </div>
    ${managementOnly ? "" : activeClients
      .map((client) => {
        const assignments = state.assignments.filter((item) => item.clientId === client.id);
        const actions = state.actionItems.filter((item) => item.clientId === client.id && item.status !== "done");
        const checkIn = state.weeklyCheckIns.find((item) => item.clientId === client.id);
        return `
          <div class="row tall">
            <div>
              <strong>${escapeHtml(client.name)}</strong>
              <p>${escapeHtml(client.email)} · ${escapeHtml(client.phone)}</p>
              <small>${assignments.length} prompts · ${actions.length} open actions · tracker ${labelize(checkIn?.status || "not_scheduled")}</small>
            </div>
            <div class="button-row">
              <button data-action="select-client" data-id="${client.id}">${client.id === state.session.clientId ? "Viewing" : "View"}</button>
              <button data-action="archive-client" data-id="${client.id}">Archive</button>
            </div>
          </div>
        `;
      })
      .join("")}
    ${archivedClients.length ? `
      <h3>Archived clients</h3>
      ${archivedClients.map((client) => `
        <div class="row">
          <div><span class="pill">archived</span><p>${escapeHtml(client.name)} · ${escapeHtml(client.email)}</p></div>
          <button data-action="unarchive-client" data-id="${client.id}">Unarchive</button>
        </div>
      `).join("")}
    ` : ""}
  `;
}

function relationshipDashboard() {
  const workspace = getWorkspace(state);
  if (!workspace) {
    return `
      <div class="panel-title"><h2>Relationship workspace</h2><span class="pill">none selected</span></div>
      ${emptyState("Use the manual relationship link tool to connect two clients into a shared workspace.")}
    `;
  }
  const issues = relationshipItems(state.relationshipIssues);
  const tasks = relationshipItems(state.relationshipTasks);
  const desires = relationshipItems(state.relationshipDesires);
  const fights = relationshipItems(state.fights);
  const openIssues = issues.filter((item) => item.status !== "closed");
  const blockedTasks = tasks.filter((item) => item.status === "blocked");
  return `
    <div class="panel-title"><h2>${workspace?.name || "Relationship workspace"}</h2><span class="pill">shared detail</span></div>
    <p>${workspace?.focus || "Track shared relationship work."}</p>
    <small>Drive source: ${workspace?.sourceFolderUrl || state.backendConfig.dummyDriveFolderUrl}</small>
    <div class="metric-strip">
      <span><strong>${tasks.filter((item) => item.status === "open").length}</strong> open tasks</span>
      <span><strong>${blockedTasks.length}</strong> blocked</span>
      <span><strong>${desires.length}</strong> desires tracked</span>
      <span><strong>${fights.length}</strong> fights logged</span>
    </div>
    <h3>Relationship repair records</h3>
    ${openIssues.map(relationshipIssueCard).join("") || emptyState("No open relationship repair records.")}
    <h3>Shared tasks</h3>
    ${tasks.map(relationshipTaskCard).join("") || emptyState("No shared tasks yet.")}
    <div class="embedded-challenges">${challengeSection("relationship", workspace.id)}</div>
  `;
}

function relationshipClientView() {
  const workspace = activeWorkspaceForView();
  if (!workspace) return "";
  const tasks = relationshipItems(state.relationshipTasks).filter(
    (task) => task.assignedClientIds?.includes(state.session.clientId) || task.assignedClientIds?.length > 1,
  );
  const desires = relationshipItems(state.relationshipDesires).filter((desire) => desire.clientId === state.session.clientId);
  const checkIn = relationshipItems(state.relationshipCheckIns)[0];
  return `
    <div class="panel-title"><h2>${workspace?.name || "Relationship tracker"}</h2><span class="pill">shared workspace</span></div>
    <section class="grid two">
      <div>
        <h3>Your desires</h3>
        ${desires.map((item) => `<div class="row tall"><div><strong>${item.title}</strong><p>${item.description}</p><small>${labelize(item.status)} · named ${item.lastNamedAt}</small></div></div>`).join("") || emptyState("No desires logged yet.")}
        <h3>Your shared tasks</h3>
        ${tasks.map(relationshipTaskCard).join("") || emptyState("No shared tasks assigned to you.")}
      </div>
      <div>${relationshipCheckInForm(checkIn)}</div>
    </section>
  `;
}

function relationshipCheckInForm(checkIn) {
  if (!checkIn) return emptyState("No relationship check-in scheduled.");
  const workspace = activeWorkspaceForView();
  const isClientA = workspace?.clientIds?.[0] === state.session.clientId;
  const ownField = isClientA ? "clientAInput" : "clientBInput";
  const partnerField = isClientA ? "clientBInput" : "clientAInput";
  const ownName = getClient(state, state.session.clientId)?.name || "Your";
  const partnerId = workspace?.clientIds?.find((id) => id !== state.session.clientId);
  const partnerName = getClient(state, partnerId)?.name || "Partner";
  return `
    <form class="relationship-checkin-form" data-action="relationship-checkin" data-id="${checkIn.id}" data-own-field="${ownField}">
      <div class="panel-title"><h3>Relationship check-in</h3><span class="${statusClass(checkIn.status)}">${labelize(checkIn.status)}</span></div>
      <small>${dueCue(checkIn.dueAt)}</small>
      <div class="read-only-field"><span class="label">Shared prompt</span><p>${escapeHtml(checkIn.focus || checkIn.sharedQuestion || "No shared prompt yet.")}</p></div>
      <label>${escapeHtml(ownName)} input<textarea name="${ownField}">${escapeHtml(checkIn[ownField])}</textarea></label>
      <label>${escapeHtml(partnerName)} input · read-only<textarea readonly aria-readonly="true">${escapeHtml(checkIn[partnerField])}</textarea></label>
      ${checkIn.stuck ? `<div class="read-only-field"><span class="label">Shared stuck point · read-only</span><p>${escapeHtml(checkIn.stuck)}</p></div>` : ""}
      <button type="submit">Submit your relationship check-in</button>
    </form>
  `;
}

function relationshipIssueCard(issue) {
  const owner = getClient(state, issue.ownerClientId)?.name || "Shared";
  return `
    <div class="candidate">
      <span class="${statusClass(issue.status)}">${labelize(issue.status)}</span>
      <h3>${issue.title}</h3>
      <p>${issue.description}</p>
      <small>${labelize(issue.severity)} · owner: ${owner} · opened ${issue.createdAt}</small>
      <blockquote>${issue.desiredRepair}</blockquote>
      <div class="button-row">
        <button data-action="issue-open" data-id="${issue.id}">Open</button>
        <button data-action="issue-blocked" data-id="${issue.id}">Blocked</button>
        <button data-action="issue-repair" data-id="${issue.id}">Repair</button>
        <button data-action="issue-closed" data-id="${issue.id}">Closed</button>
      </div>
    </div>
  `;
}

function relationshipTaskCard(task) {
  const assignees = task.assignedClientIds?.map((id) => getClient(state, id)?.name || id).join(" + ") || "Shared";
  return `
    <div class="row tall">
      <div>
        <strong>${task.title}</strong>
        <p>${task.description}</p>
        <small>${dueCue(task.dueAt)} · ${assignees}</small>
        <span class="${statusClass(task.status)}">${labelize(task.status)}</span>
      </div>
      <div class="button-row">
        <button data-action="rel-task-open" data-id="${task.id}" ${task.status === "open" ? "disabled" : ""}>Open</button>
        <button data-action="rel-task-blocked" data-id="${task.id}" ${task.status === "blocked" ? "disabled" : ""}>Blocked</button>
        <button data-action="rel-task-done" data-id="${task.id}" ${task.status === "done" ? "disabled" : ""}>Done</button>
      </div>
    </div>
  `;
}

function relationshipItems(collection) {
  const workspace = activeWorkspaceForView();
  return (collection || []).filter((item) => item.workspaceId === workspace?.id);
}

function assignmentManager() {
  const assignments = clientItems(state.assignments);
  return `
    <div class="panel-title"><h2>Assignments and journals</h2><span class="pill">coach view</span></div>
    ${assignments.length ? assignments
      .map((assignment) => {
        const entry = getJournalForAssignment(state, assignment.id);
        const visibleToCoach = entry?.visibility === "submitted_to_coach";
        return `
          <div class="row tall">
            <div>
              <strong>${assignment.title}</strong>
              <p>${assignment.prompt}</p>
              <small>${dueCue(assignment.dueAt)} · ${labelize(assignment.status)} · ${visibleToCoach ? "coach-visible submission" : "draft remains private"}</small>
              ${visibleToCoach ? `<blockquote>${escapeHtml(entry.body)}</blockquote>` : entry ? `<p>Draft saved ${entry.updatedAt}; waiting for client submission.</p>` : `<p>No journal entry started yet.</p>`}
            </div>
          </div>
        `;
      })
      .join("") : emptyState("No assignments have been created for this client yet.")}
  `;
}

function assignmentEditor(assignment) {
  const entry = getJournalForAssignment(state, assignment.id) || { body: "" };
  const visibility = entry.visibility || "private_draft";
  const hasBody = Boolean(entry.body?.trim());
  return `
    <form class="assignment-form" data-action="journal" data-id="${assignment.id}">
      <div class="panel-title">
        <h2>${assignment.title}</h2>
        <span class="${statusClass(assignment.status)}">${labelize(assignment.status)}</span>
      </div>
      <p>${assignment.prompt}</p>
      <small>${dueCue(assignment.dueAt)} · ${labelize(visibility)} · ${hasBody ? `Last saved ${entry.updatedAt || "recently"}` : "Not started"}</small>
      <textarea name="body" rows="6">${escapeHtml(entry.body)}</textarea>
      <div class="button-row">
        <button type="submit">Save draft</button>
        <button type="button" data-action="submit-assignment" data-id="${assignment.id}" ${hasBody ? "" : "disabled"}>Submit to coach</button>
      </div>
    </form>
  `;
}

function weeklyTracker(checkIn) {
  if (!checkIn) return emptyState("No accountability form is scheduled yet.");
  const openActions = clientItems(state.actionItems).filter((item) => item.status !== "done");
  const filledFields = WEEKLY_TRACKER_FIELDS.filter((field) => checkIn[field]?.trim()).length;
  if (["submitted", "amended", "reviewed"].includes(checkIn.status)) {
    return `<div class="submitted-tracker" aria-labelledby="submitted-tracker-title">
      <div class="panel-title"><h2 id="submitted-tracker-title">Accountability form submitted</h2><span class="${statusClass(checkIn.status)}">${labelize(checkIn.status)}</span></div>
      <p class="audience-label">Private · Visible to you and Bri · Read-only</p>
      <small>Week ending ${dateLabel(checkIn.periodEnd || checkIn.dueAt)} · Submitted ${dateLabel(checkIn.submittedAt)}</small>
      <p>Your form is in. Bri can now see what you most want coaching on this week.</p>
    </div>`;
  }
  return `
    <form class="checkin-form" data-action="checkin" data-id="${checkIn.id}">
      <div class="panel-title"><h2>Accountability form</h2><span class="${statusClass(checkIn.status)}">${labelize(checkIn.status)}</span></div>
      <p class="audience-label">Private · Visible to you and Bri</p>
      <div class="tracker-intro">
        <p>This check-in will take around 3-5 minutes.</p>
        <p>It's important you fill this out every week because it'll help us understand:</p>
        <ul>
          <li>Your progress.</li>
          <li>Any blockers.</li>
          <li>How we can best help you.</li>
        </ul>
        <p>If you skip this, we will show up at your doorstep and force you to fill it out.</p>
      </div>
      <small>${dueCue(checkIn.dueAt)} · ${filledFields}/${WEEKLY_TRACKER_FIELDS.length} prompts filled · ${openActions.length} open action items to scan before the call</small>
      <label>What was the #1 goal you set for yourself last week?<span class="required-marker">*</span><small>If this is your first accountability form, just put N/A.</small><textarea name="previousGoal" required>${escapeHtml(checkIn.previousGoal || "")}</textarea></label>
      <label>Did you complete the #1 goal you set last week?<select name="completedPreviousGoal"><option value="" ${!checkIn.completedPreviousGoal ? "selected" : ""}>Select one</option>${["Yes", "No", "Partially", "N/A - first form"].map((value) => `<option value="${value}" ${checkIn.completedPreviousGoal === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label>What is your biggest win this past week?<span class="required-marker">*</span><small>This could be a breakthrough moment, completed task, mindset shift, something from your personal life, etc.</small><textarea name="alive" required>${escapeHtml(checkIn.alive)}</textarea></label>
      <label>What is the ONE thing that, if you did it this week, would move your relationship and/or life forward the most?<small>Not three things. Not the easiest thing. The one that matters most. Be specific enough that you'll know by next week whether you did it or not.</small><textarea name="focus">${escapeHtml(checkIn.focus)}</textarea></label>
      <label>What specific steps do you need to take to make that a reality this week? List the steps in order.<small>Put these in your to-do list and calendar after so you have clarity going forward.</small><textarea name="completed">${escapeHtml(checkIn.completed)}</textarea></label>
      <label class="focus-question">What do you most want coaching on this week, and what would make this week's call feel like a win?<textarea name="questions">${escapeHtml(checkIn.questions)}</textarea></label>
      <p class="form-error" role="alert"></p>
      <button type="submit">Submit accountability form</button>
    </form>
  `;
}

function insightCard(item) {
  return `
    <div class="candidate">
      <span class="${statusClass(item.type)}">${labelize(item.type)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <small>${Math.round((item.confidence || 0) * 100)}% confidence · ${labelize(item.visibility)} · not client-visible until approved</small>
      <blockquote>${escapeHtml(item.evidence)}</blockquote>
      <button data-action="approve-insight" data-id="${item.id}">Approve insight</button>
    </div>
  `;
}

function actionCandidateCard(item) {
  return `
    <div class="candidate">
      <span class="pill">action item</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <small>${dueCue(item.dueAt)} · ${Math.round((item.confidence || 0) * 100)}% confidence · client-facing draft below</small>
      <blockquote>${escapeHtml(item.clientMessageDraft)}</blockquote>
      <button data-action="approve-action" data-id="${item.id}">Approve action item</button>
    </div>
  `;
}

function reviewedCandidateRow(item) {
  return `<div class="row"><span class="${statusClass(item.reviewStatus)}">${labelize(item.reviewStatus)}</span><p>${escapeHtml(item.title)}</p></div>`;
}

function actionItemsView(mode = "client") {
  const items = clientItems(state.actionItems);
  const openCount = items.filter((item) => item.status === "open").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  return `
    <div class="panel-title"><h2>Action items</h2><span class="pill">${openCount} open${blockedCount ? ` · ${blockedCount} blocked` : ""}</span></div>
    ${items.length ? items
      .map(
        (item) => `
          <div class="row">
            <div>
              <strong>${item.title}</strong>
              <p>${item.source} · ${completionCue(item)}</p>
              <span class="${statusClass(item.status)}">${labelize(item.status)}</span>
            </div>
            ${mode === "client" ? `
              <div class="button-row">
                <button data-action="block-action" data-id="${item.id}" ${item.status === "done" || item.status === "blocked" ? "disabled" : ""}>Mark blocked</button>
                <button data-action="complete-action" data-id="${item.id}" ${item.status === "done" ? "disabled" : ""}>${item.status === "done" ? "Done" : "Mark done"}</button>
              </div>
            ` : `<small>Visible as an action item</small>`}
          </div>
        `,
      )
      .join("") : emptyState("No action items yet. Approved call actions will appear here.")}
  `;
}

function roadmapView() {
  const items = clientItems(state.roadmap);
  const source = driveSourceFor();
  return `
    <div class="panel-title"><h2>Legacy Roadmap</h2><span class="pill">Drive or future app</span></div>
    ${source ? `<small>Source: ${source.roadmapLabel} in Google Drive for this MVP.</small>` : ""}
    ${items.length ? items
      .map((item) => {
        const closed = Math.round((item.current / item.target) * 100);
        const evidence = item.evidence.slice(0, 3);
        return `
          <div class="roadmap-item">
            <div class="panel-title"><h3>${item.name}</h3><strong>${item.current} / ${item.target}</strong></div>
            <div class="meter"><span style="width:${closed}%"></span></div>
            <p>${item.gapLabel}</p>
            <small>${closed}% toward target · Evidence: ${evidence.length ? evidence.join("; ") : "waiting for journals, actions, or call insights"}</small>
            ${item.sourceUrl ? `<p><a href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noreferrer">Open roadmap source</a></p>` : ""}
          </div>
        `;
      })
      .join("") : emptyState("No Legacy Roadmap dimensions have been imported or seeded yet.")}
  `;
}

function libraryView() {
  const recommended = getRecommendedVideos(state, state.session.clientId);
  return `
    <div class="panel-title"><h2>Resource Library</h2><span class="pill">${state.videos.length} resources</span></div>
    ${recommended.length ? `<h3>Recommended for your current gap</h3><div class="library-grid">${recommended.map((video) => videoCard(video, recommendationReason(video))).join("")}</div>` : ""}
    <h3>All resources</h3>
    ${state.videos.length ? `<div class="library-grid">${state.videos.map((video) => videoCard(video)).join("")}</div>` : emptyState("No resources have been added to the library yet.")}
  `;
}

function videoCard(video, reason = "") {
  return `
    <div class="video-card">
      <span class="video-thumb">${video.title.slice(0, 1)}</span>
      <div>
        <h3>${video.title}</h3>
        <p>${video.description}</p>
        <small>${video.duration} · ${video.topic} · ${video.tags.join(", ")}</small>
        ${reason ? `<p>${reason}</p>` : ""}
      </div>
    </div>
  `;
}

function recommendationReason(video) {
  const roadmap = clientItems(state.roadmap).find((item) => item.name === video.topic || video.tags.includes(item.name.toLowerCase()));
  return roadmap ? `Recommended because ${roadmap.name} is closing the gap: ${roadmap.gapLabel}.` : "Recommended from the current coaching focus.";
}

function coachPrepView(checkIn) {
  const stuck = checkIn?.stuck?.trim();
  const questions = checkIn?.questions?.trim();
  const openActions = clientItems(state.actionItems).filter((item) => item.status !== "done");
  const openChallenges = getChallenges(state, { scopeType: "client", scopeId: state.session.clientId }, actorId()).filter((item) => item.status !== "resolved");
  return `
    <div class="panel-title"><h2>Pre-call prep from accountability form</h2><span class="${statusClass(checkIn?.status || "not_opened")}">${labelize(checkIn?.status || "not_opened")}</span></div>
    ${checkIn ? `
      <div class="focus-highlight">
        <span class="label">Coach this</span>
        <strong>What they most want coaching on this week</strong>
        <p>${escapeHtml(questions) || "No coaching-focus answer submitted yet."}</p>
      </div>
      <div class="row tall"><div><strong>Client focus</strong><p>${escapeHtml(checkIn.focus) || "No focus submitted yet."}</p><small>${dueCue(checkIn.dueAt)}${checkIn.submittedAt ? ` · submitted ${checkIn.submittedAt}` : ""}</small></div></div>
      <div class="row tall"><div><strong>Stuck or blocked</strong><p>${escapeHtml(stuck) || "No stuck point submitted yet."}</p></div></div>
      <div class="row tall"><div><strong>Related challenges</strong><p>${openChallenges.length ? openChallenges.map((item) => `${item.title} (${labelize(item.status)})`).join("; ") : "No open challenges yet."}</p></div></div>
      <div class="row tall"><div><strong>Open action items</strong><p>${openActions.length ? openActions.map((item) => `${item.title} (${labelize(item.status)})`).join("; ") : "No open action items."}</p></div></div>
    ` : emptyState("No accountability form is scheduled yet.")}
  `;
}

function journalArchiveView() {
  const entries = clientItems(state.journalEntries).toSorted((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const source = driveSourceFor();
  return `
    <div class="panel-title"><h2>Journal archive</h2><span class="pill">${entries.length} entries</span></div>
    ${source ? `<p>Journal entries are mapped to <a href="${safeUrl(source.folderUrl)}" target="_blank" rel="noreferrer">${escapeHtml(source.journalFolderLabel)}</a> in the client Google Drive folder.</p>` : ""}
    ${entries.length ? entries
      .map((entry) => `
        <div class="row tall">
          <div>
            <strong>${entry.title}</strong>
            <p>${entry.body ? escapeHtml(entry.body) : "No reflection text saved yet."}</p>
            <small>${labelize(entry.status)} · ${labelize(entry.visibility)} · updated ${entry.updatedAt}</small>
          </div>
        </div>
      `)
      .join("") : emptyState("Saved drafts and submitted reflections will collect here over time.")}
  `;
}

function progressEvidenceView() {
  const insightEvidence = clientItems(state.insights).map((item) => ({ label: item.title, detail: item.evidence, source: labelize(item.source) }));
  const completedActions = clientItems(state.actionItems)
    .filter((item) => item.status === "done")
    .map((item) => ({ label: item.title, detail: `Completed ${item.completedAt || "recently"}`, source: labelize(item.source) }));
  const submittedJournals = clientItems(state.journalEntries)
    .filter((item) => item.status === "submitted")
    .map((item) => ({ label: item.title, detail: `Submitted ${item.updatedAt}`, source: "journal" }));
  const evidence = [...insightEvidence, ...completedActions, ...submittedJournals].slice(0, 6);
  return `
    <div class="panel-title"><h2>Progress evidence</h2><span class="pill">${evidence.length} signals</span></div>
    ${evidence.length ? evidence
      .map((item) => `<div class="row tall"><div><strong>${item.label}</strong><p>${item.detail}</p><small>${item.source}</small></div></div>`)
      .join("") : emptyState("Progress evidence will appear after submitted journals, approved insights, and completed action items.")}
  `;
}

function manualNotesView() {
  const notes = (state.coachNotes || []).filter((item) => item.clientId === state.session.clientId);
  return `
    <div class="panel-title"><h2>Manual notes</h2><span class="pill">${notes.length}</span></div>
    <form class="note-form">
      <label>Add a coach-only note<textarea name="body" rows="3" placeholder="Private note for this client"></textarea></label>
      <button type="submit">Add note</button>
    </form>
    ${notes.length ? notes.map((item) => `<div class="row tall"><div><small>${dateLabel(item.createdAt)} · coach only</small><p>${escapeHtml(item.body)}</p></div></div>`).join("") : `<p class="empty">No manual notes yet.</p>`}
  `;
}

function auditView() {
  return `
    <div class="panel-title"><h2>Audit trail</h2><span class="pill">local</span></div>
    ${state.auditLog.slice(0, 8).map((item) => `<div class="row"><small>${item.createdAt}</small><p>${item.event}: ${item.detail}</p></div>`).join("")}
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  app.querySelectorAll("[data-action='role']").forEach((button) => {
    button.addEventListener("click", () => setRole(button.dataset.role));
  });
  app.querySelectorAll("[data-action='select-client']").forEach((button) => {
    button.addEventListener("click", () => selectClient(button.dataset.id));
  });
  app.querySelectorAll("[data-action='view-client-detail']").forEach((button) => {
    button.addEventListener("click", () => {
      setSessionClient(state, button.dataset.id);
      pendingFocusId = "selected-client-detail-title";
      announce(`${getClient(state, button.dataset.id)?.name || "Client"} details selected`);
      persist();
    });
  });
  app.querySelectorAll("[data-action='client-view']").forEach((button) => {
    button.addEventListener("click", () => {
      state.session.clientView = button.dataset.view;
      persist();
    });
  });
  app.querySelector("[data-action='attention-sort']")?.addEventListener("change", (event) => {
    state.session.coachAttentionSort = event.target.value;
    persist();
  });
  app.querySelectorAll("[data-action='challenge-filter']").forEach((select) => {
    select.addEventListener("change", () => {
      state.session[select.dataset.filterKey] = select.value;
      persist();
    });
  });
  app.querySelectorAll("[data-action='archive-client']").forEach((button) => {
    button.addEventListener("click", () => {
      archiveClient(state, button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll("[data-action='unarchive-client']").forEach((button) => {
    button.addEventListener("click", () => {
      unarchiveClient(state, button.dataset.id);
      persist();
    });
  });
  const clientModal = app.querySelector(".client-modal");
  app.querySelectorAll("[data-action='open-add-client']").forEach((button) => button.addEventListener("click", () => {
    lastDialogTrigger = button;
    clientModal?.showModal();
    clientModal?.querySelector("input[name='name']")?.focus();
  }));
  app.querySelectorAll("[data-action='close-add-client']").forEach((button) => {
    button.addEventListener("click", () => {
      clientModal?.close();
      lastDialogTrigger?.focus();
    });
  });
  clientModal?.addEventListener("click", (event) => {
    if (event.target === clientModal) {
      clientModal.close();
      lastDialogTrigger?.focus();
    }
  });
  app.querySelectorAll("[data-action='open-edit-client']").forEach((button) => button.addEventListener("click", () => {
    lastDialogTrigger = button;
    const dialog = button.closest(".panel")?.querySelector("[data-dialog='edit-client']");
    dialog?.showModal();
    dialog?.querySelector("input[name='name']")?.focus();
  }));
  app.querySelectorAll("[data-action='open-challenge-dialog']").forEach((button) => {
    button.addEventListener("click", () => {
      lastDialogTrigger = button;
      const dialog = button.closest(".panel")?.querySelector("[data-dialog='challenge']");
      dialog?.showModal();
      dialog?.querySelector("input[name='title']")?.focus();
    });
  });
  app.querySelectorAll("[data-action='open-block-dialog']").forEach((button) => {
    button.addEventListener("click", () => {
      lastDialogTrigger = button;
      const dialog = button.closest(".panel")?.querySelector("[data-dialog='block']");
      const challenge = state.challenges.find((item) => item.id === button.dataset.id);
      dialog.querySelector("[name='challengeId']").value = button.dataset.id;
      dialog.querySelector("[data-block-title]").textContent = challenge?.title || "Challenge";
      dialog.showModal();
      dialog.querySelector("textarea[name='reason']")?.focus();
    });
  });
  app.querySelectorAll("[data-action='close-dialog']").forEach((button) => button.addEventListener("click", () => {
    button.closest("dialog")?.close();
    lastDialogTrigger?.focus();
  }));
  app.querySelectorAll(".challenge-modal").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
      lastDialogTrigger?.focus();
    }
  }));
  app.querySelectorAll("dialog").forEach((dialog) => {
    const closeFromKeyboard = (event) => {
      event.preventDefault();
      dialog.close();
      lastDialogTrigger?.focus();
    };
    dialog.addEventListener("cancel", closeFromKeyboard);
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeFromKeyboard(event);
    });
  });
  app.querySelectorAll(".challenge-form").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const [ownerType, ownerId] = String(data.get("owner")).split(":");
    const challenge = createChallenge(state, {
      scopeType: form.dataset.scopeType,
      scopeId: form.dataset.scopeId,
      title: data.get("title"),
      description: data.get("description"),
      desiredOutcome: data.get("desiredOutcome"),
      ownerType,
      ownerId: ownerId || null,
      priority: data.get("priority"),
      status: data.get("status"),
    }, actorId());
    if (!challenge) {
      const error = form.querySelector(".form-error");
      error.textContent = "Add a title and choose an available owner.";
      form.querySelector("[name='title']").setAttribute("aria-invalid", "true");
      form.querySelector("[name='title']").focus();
      return;
    }
    announce(form.dataset.scopeType === "relationship" ? "Shared challenge added" : "Challenge added to your private backlog");
    pendingFocusId = `challenge-${challenge.id}`;
    persist();
  }));
  app.querySelectorAll(".block-form").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const reason = String(data.get("reason") || "").trim();
    if (!reason || !blockChallenge(state, data.get("challengeId"), reason, actorId())) {
      form.querySelector(".form-error").textContent = "Tell us what is blocking progress.";
      form.querySelector("[name='reason']").setAttribute("aria-invalid", "true");
      form.querySelector("[name='reason']").focus();
      return;
    }
    announce("Challenge marked blocked");
    persist();
  }));
  const challengeActions = {
    "challenge-unblock": (id) => unblockChallenge(state, id, actorId()),
    "challenge-resolve": (id) => resolveChallenge(state, id, actorId()),
    "challenge-reopen": (id) => reopenChallenge(state, id, actorId()),
    "challenge-archive": (id) => archiveChallenge(state, id, actorId()),
    "challenge-restore": (id) => restoreChallenge(state, id, actorId()),
  };
  Object.entries(challengeActions).forEach(([action, command]) => app.querySelectorAll(`[data-action='${action}']`).forEach((button) => button.addEventListener("click", () => {
    if (command(button.dataset.id)) {
      announce("Challenge updated");
      persist();
    }
  })));
  app.querySelectorAll("[data-action='challenge-status']").forEach((button) => button.addEventListener("click", () => {
    if (setChallengeStatus(state, button.dataset.id, button.dataset.status, actorId())) {
      announce("Challenge status updated");
      persist();
    }
  }));
  app.querySelector("[data-action='reset']")?.addEventListener("click", () => {
    state = resetState();
    render();
  });
  app.querySelectorAll("[data-action='extract']").forEach((button) => {
    button.addEventListener("click", () => {
      mockExtractCall(state, button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll("[data-action='approve-insight']").forEach((button) => {
    button.addEventListener("click", () => {
      approveInsightCandidate(state, button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll("[data-action='approve-action']").forEach((button) => {
    button.addEventListener("click", () => {
      approveActionCandidate(state, button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll("[data-action='complete-action']").forEach((button) => {
    button.addEventListener("click", () => {
      completeAction(state, button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll("[data-action='block-action']").forEach((button) => {
    button.addEventListener("click", () => {
      blockActionItem(button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll("[data-action^='rel-task-']").forEach((button) => {
    button.addEventListener("click", () => {
      updateRelationshipTaskStatus(state, button.dataset.id, button.dataset.action.replace("rel-task-", ""));
      persist();
    });
  });
  app.querySelectorAll("[data-action^='issue-']").forEach((button) => {
    button.addEventListener("click", () => {
      const status = button.dataset.action.replace("issue-", "") === "repair" ? "repair_in_progress" : button.dataset.action.replace("issue-", "");
      updateRelationshipIssueStatus(state, button.dataset.id, status);
      persist();
    });
  });
  app.querySelectorAll(".assignment-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      upsertJournal(state, form.dataset.id, new FormData(form).get("body"));
      persist();
    });
  });
  app.querySelectorAll("[data-action='submit-assignment']").forEach((button) => {
    button.addEventListener("click", () => {
      submitAssignment(state, button.dataset.id);
      persist();
    });
  });
  app.querySelectorAll(".checkin-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const submitted = submitCheckIn(state, form.dataset.id, {
        previousGoal: data.get("previousGoal"),
        completedPreviousGoal: data.get("completedPreviousGoal"),
        focus: data.get("focus"),
        questions: data.get("questions"),
        alive: data.get("alive"),
        completed: data.get("completed"),
      }, [], actorId());
      if (submitted) {
        announce("Accountability form submitted");
        pendingFocusId = "weekly-history-title";
        persist();
      } else {
        form.querySelector(".form-error").textContent = "The accountability form could not be submitted. Review your responses and try again.";
        form.querySelector("textarea")?.focus();
      }
    });
  });
  app.querySelectorAll(".relationship-checkin-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const updates = { [form.dataset.ownField]: data.get(form.dataset.ownField) };
      if (submitRelationshipCheckIn(state, form.dataset.id, updates, actorId())) {
        announce("Your relationship check-in was submitted");
        persist();
      }
    });
  });
  app.querySelectorAll(".relationship-builder-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      createRelationshipWorkspace(state, data.get("clientAId"), data.get("clientBId"));
      persist();
    });
  });
  app.querySelectorAll(".new-client-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const client = createClient(state, {
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        focus: data.get("focus"),
        nextCallAt: data.get("nextCallAt"),
        folderUrl: data.get("folderUrl"),
      });
      if (!client) return;
      announce(`${client.name} added`);
      persist();
    });
  });
  app.querySelectorAll(".edit-client-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const updated = updateClient(state, form.dataset.id, {
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        focus: data.get("focus"),
        nextCallAt: data.get("nextCallAt"),
        folderUrl: data.get("folderUrl"),
      });
      if (!updated) return;
      announce("Client updated");
      persist();
    });
  });
  app.querySelectorAll(".note-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const body = String(new FormData(form).get("body") || "").trim();
      if (!body) {
        form.querySelector("textarea")?.focus();
        return;
      }
      if (!Array.isArray(state.coachNotes)) state.coachNotes = [];
      state.coachNotes.unshift({
        id: `note-${Date.now()}`,
        clientId: state.session.clientId,
        body,
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy: "coach-bri",
      });
      announce("Manual note added");
      persist();
    });
  });
}

function render() {
  app.innerHTML = state.session.role === "coach" ? coachDashboard() : clientDashboard();
  bindEvents();
  if (pendingFocusId) {
    const target = document.getElementById(pendingFocusId);
    pendingFocusId = null;
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
  }
}

render();
