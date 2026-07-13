import { loadState, resetState, saveState } from "./state.js";
import {
  approveActionCandidate,
  approveInsightCandidate,
  completeAction,
  getClient,
  getJournalForAssignment,
  getRecommendedVideos,
  getWorkspace,
  mockExtractCall,
  setSessionClient,
  submitAssignment,
  submitCheckIn,
  submitRelationshipCheckIn,
  updateRelationshipIssueStatus,
  updateRelationshipTaskStatus,
  upsertJournal,
} from "./domain.js";

let state = loadState();
const app = document.querySelector("#app");

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

function clientItems(collection) {
  return collection.filter((item) => item.clientId === state.session.clientId);
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
  const workspace = getWorkspace(state);
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Starship Tracker MVP</p>
        <h1>${state.session.role === "coach" ? "Coach command center" : "Client workspace"}</h1>
      </div>
      <div class="top-actions">
        <button class="${state.session.role === "coach" ? "active" : ""}" data-action="role" data-role="coach">Coach</button>
        <button class="${state.session.role === "client" ? "active" : ""}" data-action="role" data-role="client">Client</button>
        <button data-action="reset">Reset demo</button>
      </div>
    </header>
    <main>
      <section class="client-switcher">
        ${state.clients
          .map(
            (item) => `
              <button class="${item.id === state.session.clientId ? "active" : ""}" data-action="select-client" data-id="${item.id}">
                ${item.name}
              </button>
            `,
          )
          .join("")}
        <a href="${state.backendConfig.dummyDriveFolderUrl}" target="_blank" rel="noreferrer">Dummy Drive folder</a>
      </section>
      <section class="identity-band">
        <div>
          <span class="label">Selected client</span>
          <strong>${client.name}</strong>
        </div>
        <div>
          <span class="label">Client focus</span>
          <strong>${client.focus}</strong>
        </div>
        <div>
          <span class="label">Relationship workspace</span>
          <strong>${workspace?.name || "Individual"}</strong>
        </div>
      </section>
      ${content}
    </main>
  `;
}

function coachDashboard() {
  const pendingInsights = state.insightCandidates.filter((item) => item.reviewStatus === "candidate");
  const pendingActions = state.actionItemCandidates.filter((item) => item.reviewStatus === "candidate");
  const reviewedInsights = state.insightCandidates.filter((item) => item.reviewStatus !== "candidate").slice(0, 3);
  const reviewedActions = state.actionItemCandidates.filter((item) => item.reviewStatus !== "candidate").slice(0, 3);
  const checkIn = clientItems(state.weeklyCheckIns)[0];
  return shell(`
    <section class="grid two">
      <article class="panel">${clientRosterView()}</article>
      <article class="panel">${relationshipDashboard()}</article>
    </section>

    <section class="grid two">
      <article class="panel">
        <div class="panel-title">
          <h2>Attention queue</h2>
          <span class="pill">${state.alerts.filter((alert) => !alert.read).length} unread</span>
        </div>
        ${state.alerts.length ? state.alerts
          .map((alert) => `<div class="row"><span class="${statusClass(alert.type)}">${alert.type.replaceAll("_", " ")}</span><p>${alert.message}</p></div>`)
          .join("") : emptyState("No alerts yet. Completed assignments, stuck check-ins, and approved imports will appear here.")}
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Call imports</h2>
          <span class="pill">review first</span>
        </div>
        ${state.calls.length ? state.calls
          .map(
            (call) => `
              <div class="row tall">
                <div>
                  <strong>${call.title}</strong>
                  <p>${call.transcript}</p>
                  <small>${call.happenedAt || "Recent"} · ${labelize(call.status)} · extracted items stay private until approved</small>
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
      <article class="panel">${deliveriesView()}</article>
      <article class="panel">${auditView()}</article>
    </section>
  `);
}

function clientDashboard() {
  const assignments = clientItems(state.assignments);
  const checkIn = clientItems(state.weeklyCheckIns)[0];
  const nextAssignment = assignments.find((item) => item.status !== "submitted") || assignments[0];
  const recommendedVideos = getRecommendedVideos(state, state.session.clientId);
  return shell(`
    <section class="grid two">
      <article class="panel hero-panel">
        <p class="eyebrow">Next best step</p>
        ${nextAssignment ? `
          <h2>${nextAssignment.title}</h2>
          <p>${nextAssignment.prompt}</p>
          <span class="${statusClass(nextAssignment.status)}">${labelize(nextAssignment.status)}</span>
          <small>${dueCue(nextAssignment.dueAt)}</small>
        ` : `<h2>You are current</h2><p>No active assignments are waiting right now.</p>`}
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Recommended now</h2>
          <span class="pill">topic match</span>
        </div>
        ${recommendedVideos.length ? recommendedVideos.map((video) => videoCard(video, recommendationReason(video))).join("") : emptyState("No video recommendations yet. Roadmap focus will power this list.")}
      </article>
    </section>
    <section class="grid two">
      <article class="panel">${assignments.length ? assignments.map(assignmentEditor).join("") : emptyState("No journal prompts assigned yet.")}</article>
      <article class="panel">${weeklyTracker(checkIn)}</article>
    </section>
    <section class="grid two">
      <article class="panel">${actionItemsView()}</article>
      <article class="panel">${roadmapView()}</article>
    </section>
    <section class="panel">${relationshipClientView()}</section>
    <section class="grid two">
      <article class="panel">${journalArchiveView()}</article>
      <article class="panel">${progressEvidenceView()}</article>
    </section>
    <section class="panel">${libraryView()}</section>
  `);
}

function clientRosterView() {
  return `
    <div class="panel-title"><h2>Client dashboard</h2><span class="pill">${state.clients.length} client logins</span></div>
    ${state.clients
      .map((client) => {
        const assignments = state.assignments.filter((item) => item.clientId === client.id);
        const actions = state.actionItems.filter((item) => item.clientId === client.id && item.status !== "done");
        const checkIn = state.weeklyCheckIns.find((item) => item.clientId === client.id);
        return `
          <div class="row tall">
            <div>
              <strong>${client.name}</strong>
              <p>${client.email} · ${client.phone}</p>
              <small>${assignments.length} prompts · ${actions.length} open actions · tracker ${labelize(checkIn?.status || "not_scheduled")}</small>
            </div>
            <button data-action="select-client" data-id="${client.id}">${client.id === state.session.clientId ? "Viewing" : "View"}</button>
          </div>
        `;
      })
      .join("")}
  `;
}

function relationshipDashboard() {
  const workspace = getWorkspace(state);
  const issues = relationshipItems(state.relationshipIssues);
  const tasks = relationshipItems(state.relationshipTasks);
  const desires = relationshipItems(state.relationshipDesires);
  const fights = relationshipItems(state.fights);
  const openIssues = issues.filter((item) => item.status !== "closed");
  const blockedTasks = tasks.filter((item) => item.status === "blocked");
  return `
    <div class="panel-title"><h2>${workspace?.name || "Relationship workspace"}</h2><span class="pill">${openIssues.length} open problems</span></div>
    <p>${workspace?.focus || "Track shared relationship work."}</p>
    <small>Drive source: ${workspace?.sourceFolderUrl || state.backendConfig.dummyDriveFolderUrl}</small>
    <div class="metric-strip">
      <span><strong>${tasks.filter((item) => item.status === "open").length}</strong> open tasks</span>
      <span><strong>${blockedTasks.length}</strong> blocked</span>
      <span><strong>${desires.length}</strong> desires tracked</span>
      <span><strong>${fights.length}</strong> fights logged</span>
    </div>
    <h3>Open problems</h3>
    ${openIssues.map(relationshipIssueCard).join("") || emptyState("No open relationship problems.")}
    <h3>Shared tasks</h3>
    ${tasks.map(relationshipTaskCard).join("") || emptyState("No shared tasks yet.")}
  `;
}

function relationshipClientView() {
  const workspace = getWorkspace(state);
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
  return `
    <form class="relationship-checkin-form" data-action="relationship-checkin" data-id="${checkIn.id}">
      <div class="panel-title"><h3>Relationship check-in</h3><span class="${statusClass(checkIn.status)}">${labelize(checkIn.status)}</span></div>
      <small>${dueCue(checkIn.dueAt)}</small>
      <label>Shared question<textarea name="sharedQuestion">${escapeHtml(checkIn.sharedQuestion)}</textarea></label>
      <label>Client A input<textarea name="clientAInput">${escapeHtml(checkIn.clientAInput)}</textarea></label>
      <label>Client B input<textarea name="clientBInput">${escapeHtml(checkIn.clientBInput)}</textarea></label>
      <label>Stuck point<textarea name="stuck">${escapeHtml(checkIn.stuck)}</textarea></label>
      <button type="submit">Submit relationship check-in</button>
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
  return (collection || []).filter((item) => item.workspaceId === state.session.workspaceId);
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
  if (!checkIn) return emptyState("No weekly tracker is scheduled yet.");
  const openActions = clientItems(state.actionItems).filter((item) => item.status !== "done");
  const filledFields = ["focus", "questions", "alive", "completed", "stuck"].filter((field) => checkIn[field]?.trim()).length;
  return `
    <form class="checkin-form" data-action="checkin" data-id="${checkIn.id}">
      <div class="panel-title"><h2>Weekly tracker</h2><span class="${statusClass(checkIn.status)}">${labelize(checkIn.status)}</span></div>
      <small>${dueCue(checkIn.dueAt)} · ${filledFields}/5 prompts filled · ${openActions.length} open action items to scan before the call</small>
      <label>Focus for next call<textarea name="focus">${escapeHtml(checkIn.focus)}</textarea></label>
      <label>Questions<textarea name="questions">${escapeHtml(checkIn.questions)}</textarea></label>
      <label>What felt alive or important?<textarea name="alive">${escapeHtml(checkIn.alive)}</textarea></label>
      <label>Completed<textarea name="completed">${escapeHtml(checkIn.completed)}</textarea></label>
      <label>Stuck point<textarea name="stuck">${escapeHtml(checkIn.stuck)}</textarea></label>
      <button type="submit">Submit weekly tracker</button>
    </form>
  `;
}

function insightCard(item) {
  return `
    <div class="candidate">
      <span class="${statusClass(item.type)}">${item.type.replaceAll("_", " ")}</span>
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
      <small>${Math.round((item.confidence || 0) * 100)}% confidence · ${labelize(item.visibility)} · not client-visible until approved</small>
      <blockquote>${item.evidence}</blockquote>
      <button data-action="approve-insight" data-id="${item.id}">Approve insight</button>
    </div>
  `;
}

function actionCandidateCard(item) {
  return `
    <div class="candidate">
      <span class="pill">action item</span>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <small>${dueCue(item.dueAt)} · ${Math.round((item.confidence || 0) * 100)}% confidence · SMS draft below</small>
      <blockquote>${item.clientMessageDraft}</blockquote>
      <button data-action="approve-action" data-id="${item.id}">Approve and queue SMS</button>
    </div>
  `;
}

function reviewedCandidateRow(item) {
  return `<div class="row"><span class="${statusClass(item.reviewStatus)}">${labelize(item.reviewStatus)}</span><p>${item.title}</p></div>`;
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
            ` : `<small>${item.reminder === "sms" ? "SMS reminder enabled" : "No reminder"}</small>`}
          </div>
        `,
      )
      .join("") : emptyState("No action items yet. Approved call actions will appear here.")}
  `;
}

function roadmapView() {
  const items = clientItems(state.roadmap);
  return `
    <div class="panel-title"><h2>Legacy Roadmap</h2><span class="pill">gap tracking</span></div>
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
          </div>
        `;
      })
      .join("") : emptyState("No Legacy Roadmap dimensions have been imported or seeded yet.")}
  `;
}

function libraryView() {
  const recommended = getRecommendedVideos(state, state.session.clientId);
  return `
    <div class="panel-title"><h2>Framework and cosmology library</h2><span class="pill">${state.videos.length} videos</span></div>
    ${recommended.length ? `<h3>Recommended for your current gap</h3><div class="library-grid">${recommended.map((video) => videoCard(video, recommendationReason(video))).join("")}</div>` : ""}
    <h3>All resources</h3>
    ${state.videos.length ? `<div class="library-grid">${state.videos.map((video) => videoCard(video)).join("")}</div>` : emptyState("No videos have been added to the library yet.")}
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
  return `
    <div class="panel-title"><h2>Pre-call check-in</h2><span class="${statusClass(checkIn?.status || "not_opened")}">${labelize(checkIn?.status || "not_opened")}</span></div>
    ${checkIn ? `
      <div class="row tall"><div><strong>Client focus</strong><p>${escapeHtml(checkIn.focus) || "No focus submitted yet."}</p><small>${dueCue(checkIn.dueAt)}${checkIn.submittedAt ? ` · submitted ${checkIn.submittedAt}` : ""}</small></div></div>
      <div class="row tall"><div><strong>Questions</strong><p>${escapeHtml(questions) || "No questions submitted yet."}</p></div></div>
      <div class="row tall"><div><strong>Stuck or blocked</strong><p>${escapeHtml(stuck) || "No stuck point submitted yet."}</p></div></div>
      <div class="row tall"><div><strong>Open commitments</strong><p>${openActions.length ? openActions.map((item) => `${item.title} (${labelize(item.status)})`).join("; ") : "No open action items."}</p></div></div>
    ` : emptyState("No weekly tracker is scheduled yet.")}
  `;
}

function journalArchiveView() {
  const entries = clientItems(state.journalEntries).toSorted((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return `
    <div class="panel-title"><h2>Journal archive</h2><span class="pill">${entries.length} entries</span></div>
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

function deliveriesView() {
  return `
    <div class="panel-title"><h2>Mock SMS deliveries</h2><span class="pill">${state.deliveries.length}</span></div>
    ${state.deliveries.length ? state.deliveries.map((item) => `<div class="row"><span class="pill">${item.channel}</span><p>${item.body}</p></div>`).join("") : `<p class="empty">No queued SMS yet.</p>`}
  `;
}

function auditView() {
  return `
    <div class="panel-title"><h2>Audit trail</h2><span class="pill">local</span></div>
    ${state.auditLog.slice(0, 8).map((item) => `<div class="row"><small>${item.createdAt}</small><p>${item.event}: ${item.detail}</p></div>`).join("")}
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function bindEvents() {
  app.querySelectorAll("[data-action='role']").forEach((button) => {
    button.addEventListener("click", () => setRole(button.dataset.role));
  });
  app.querySelectorAll("[data-action='select-client']").forEach((button) => {
    button.addEventListener("click", () => selectClient(button.dataset.id));
  });
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
      submitCheckIn(state, form.dataset.id, {
        focus: data.get("focus"),
        questions: data.get("questions"),
        alive: data.get("alive"),
        completed: data.get("completed"),
        stuck: data.get("stuck"),
      });
      persist();
    });
  });
  app.querySelectorAll(".relationship-checkin-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      submitRelationshipCheckIn(state, form.dataset.id, {
        sharedQuestion: data.get("sharedQuestion"),
        clientAInput: data.get("clientAInput"),
        clientBInput: data.get("clientBInput"),
        stuck: data.get("stuck"),
      });
      persist();
    });
  });
}

function render() {
  app.innerHTML = state.session.role === "coach" ? coachDashboard() : clientDashboard();
  bindEvents();
}

render();
