import { loadState, resetState, saveState } from "./state.js";
import {
  approveActionCandidate,
  approveInsightCandidate,
  completeAction,
  getClient,
  getJournalForAssignment,
  getRecommendedVideos,
  mockExtractCall,
  submitAssignment,
  submitCheckIn,
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

function clientItems(collection) {
  return collection.filter((item) => item.clientId === state.session.clientId);
}

function statusClass(status) {
  return `pill ${String(status).replaceAll("_", "-")}`;
}

function shell(content) {
  const client = getClient(state);
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
      <section class="identity-band">
        <div>
          <span class="label">Client</span>
          <strong>${client.name}</strong>
        </div>
        <div>
          <span class="label">Current focus</span>
          <strong>${client.focus}</strong>
        </div>
        <div>
          <span class="label">Next call</span>
          <strong>${client.nextCallAt}</strong>
        </div>
      </section>
      ${content}
    </main>
  `;
}

function coachDashboard() {
  const pendingInsights = state.insightCandidates.filter((item) => item.reviewStatus === "candidate");
  const pendingActions = state.actionItemCandidates.filter((item) => item.reviewStatus === "candidate");
  return shell(`
    <section class="grid two">
      <article class="panel">
        <div class="panel-title">
          <h2>Attention queue</h2>
          <span class="pill">${state.alerts.filter((alert) => !alert.read).length} unread</span>
        </div>
        ${state.alerts
          .map((alert) => `<div class="row"><span class="${statusClass(alert.type)}">${alert.type.replaceAll("_", " ")}</span><p>${alert.message}</p></div>`)
          .join("")}
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Mock Fathom import</h2>
          <span class="pill">review first</span>
        </div>
        ${state.calls
          .map(
            (call) => `
              <div class="row tall">
                <div>
                  <strong>${call.title}</strong>
                  <p>${call.transcript}</p>
                </div>
                <button data-action="extract" data-id="${call.id}">Extract</button>
              </div>
            `,
          )
          .join("")}
      </article>
    </section>

    <section class="grid two">
      <article class="panel">
        <div class="panel-title">
          <h2>Insight review</h2>
          <span class="pill">${pendingInsights.length} candidates</span>
        </div>
        ${pendingInsights.length ? pendingInsights.map(insightCard).join("") : `<p class="empty">No insight candidates waiting.</p>`}
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Action review</h2>
          <span class="pill">${pendingActions.length} candidates</span>
        </div>
        ${pendingActions.length ? pendingActions.map(actionCandidateCard).join("") : `<p class="empty">No action candidates waiting.</p>`}
      </article>
    </section>

    <section class="grid two">
      <article class="panel">${assignmentManager()}</article>
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
  return shell(`
    <section class="grid two">
      <article class="panel hero-panel">
        <p class="eyebrow">Next best step</p>
        <h2>${nextAssignment.title}</h2>
        <p>${nextAssignment.prompt}</p>
        <span class="${statusClass(nextAssignment.status)}">${nextAssignment.status.replaceAll("_", " ")}</span>
      </article>
      <article class="panel">
        <div class="panel-title">
          <h2>Recommended now</h2>
          <span class="pill">topic match</span>
        </div>
        ${getRecommendedVideos(state, state.session.clientId).map(videoCard).join("")}
      </article>
    </section>
    <section class="grid two">
      <article class="panel">${assignments.map(assignmentEditor).join("")}</article>
      <article class="panel">${weeklyTracker(checkIn)}</article>
    </section>
    <section class="grid two">
      <article class="panel">${actionItemsView()}</article>
      <article class="panel">${roadmapView()}</article>
    </section>
    <section class="panel">${libraryView()}</section>
  `);
}

function assignmentManager() {
  return `
    <div class="panel-title"><h2>Assignments and journals</h2><span class="pill">coach view</span></div>
    ${clientItems(state.assignments)
      .map((assignment) => {
        const entry = getJournalForAssignment(state, assignment.id);
        return `<div class="row tall"><div><strong>${assignment.title}</strong><p>${assignment.prompt}</p><small>Due ${assignment.dueAt} · ${assignment.status.replaceAll("_", " ")}</small>${entry ? `<blockquote>${entry.body}</blockquote>` : ""}</div></div>`;
      })
      .join("")}
  `;
}

function assignmentEditor(assignment) {
  const entry = getJournalForAssignment(state, assignment.id) || { body: "" };
  return `
    <form class="assignment-form" data-action="journal" data-id="${assignment.id}">
      <div class="panel-title">
        <h2>${assignment.title}</h2>
        <span class="${statusClass(assignment.status)}">${assignment.status.replaceAll("_", " ")}</span>
      </div>
      <p>${assignment.prompt}</p>
      <small>Due ${assignment.dueAt} · Drafts stay private until submitted.</small>
      <textarea name="body" rows="6">${escapeHtml(entry.body)}</textarea>
      <div class="button-row">
        <button type="submit">Save draft</button>
        <button type="button" data-action="submit-assignment" data-id="${assignment.id}">Submit to coach</button>
      </div>
    </form>
  `;
}

function weeklyTracker(checkIn) {
  return `
    <form class="checkin-form" data-action="checkin" data-id="${checkIn.id}">
      <div class="panel-title"><h2>Weekly tracker</h2><span class="${statusClass(checkIn.status)}">${checkIn.status.replaceAll("_", " ")}</span></div>
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
      <small>Due ${item.dueAt}</small>
      <blockquote>${item.clientMessageDraft}</blockquote>
      <button data-action="approve-action" data-id="${item.id}">Approve and queue SMS</button>
    </div>
  `;
}

function actionItemsView() {
  return `
    <div class="panel-title"><h2>Action items</h2><span class="pill">${clientItems(state.actionItems).filter((item) => item.status === "open").length} open</span></div>
    ${clientItems(state.actionItems)
      .map(
        (item) => `
          <div class="row">
            <div><strong>${item.title}</strong><p>${item.source} · due ${item.dueAt}</p></div>
            <button data-action="complete-action" data-id="${item.id}" ${item.status === "done" ? "disabled" : ""}>${item.status === "done" ? "Done" : "Mark done"}</button>
          </div>
        `,
      )
      .join("")}
  `;
}

function roadmapView() {
  return `
    <div class="panel-title"><h2>Legacy Roadmap</h2><span class="pill">gap tracking</span></div>
    ${clientItems(state.roadmap)
      .map((item) => {
        const closed = Math.round((item.current / item.target) * 100);
        return `
          <div class="roadmap-item">
            <div class="panel-title"><h3>${item.name}</h3><strong>${item.current} / ${item.target}</strong></div>
            <div class="meter"><span style="width:${closed}%"></span></div>
            <p>${item.gapLabel}</p>
            <small>Evidence: ${item.evidence.slice(0, 2).join("; ")}</small>
          </div>
        `;
      })
      .join("")}
  `;
}

function libraryView() {
  return `
    <div class="panel-title"><h2>Framework and cosmology library</h2><span class="pill">${state.videos.length} videos</span></div>
    <div class="library-grid">${state.videos.map(videoCard).join("")}</div>
  `;
}

function videoCard(video) {
  return `
    <div class="video-card">
      <span class="video-thumb">${video.title.slice(0, 1)}</span>
      <div>
        <h3>${video.title}</h3>
        <p>${video.description}</p>
        <small>${video.duration} · ${video.tags.join(", ")}</small>
      </div>
    </div>
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
}

function render() {
  app.innerHTML = state.session.role === "coach" ? coachDashboard() : clientDashboard();
  bindEvents();
}

render();
