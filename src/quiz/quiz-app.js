import * as configModule from "./quiz-config.js";
import * as domain from "./quiz-domain.js";

const root = document.querySelector("#quiz-app");
const config = configModule.QUIZ_CONFIG ?? configModule.QUIZ_DEFINITION ?? configModule.default;
const questions = config.questions;
const intimacyStart = questions.findIndex((question) => question.sensitive || question.section === "intimacy");
const STORAGE_KEY = "starship-aligned-quiz-session-v1";

let state = restoreState();
let announcement = state.restored ? "Your saved progress was restored." : "";
let validationMessage = "";
let emailStatus = "";
let showHowItWorks = false;
let showEmail = false;
let showOffer = true;
let exitPending = false;

function freshState() {
  const modelSession = domain.createQuizSession?.() ?? {};
  return {
    ...modelSession,
    assessmentVersion: config.version ?? config.assessmentVersion,
    screen: "landing",
    questionIndex: 0,
    answers: modelSession.answers ?? {},
    visitedQuestionIds: [],
    intimacySkipped: false,
    noticeAcknowledged: false,
    result: null,
  };
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const restored = raw ? JSON.parse(raw) : null;
    const isCurrent = restored?.assessmentVersion === (config.version ?? config.assessmentVersion);
    const expiresAt = Date.parse(restored?.updatedAt ?? "") + (restored?.completedAt ? 7 : 1) * 24 * 60 * 60 * 1000;
    if (restored && (!isCurrent || Date.now() > expiresAt)) localStorage.removeItem(STORAGE_KEY);
    return restored && isCurrent && Date.now() <= expiresAt ? { ...restored, restored: true } : freshState();
  } catch {
    return freshState();
  }
}

function persist() {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage is an enhancement. The current in-memory session remains usable.
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleForScreen() {
  if (state.screen === "question") return `${questions[state.questionIndex]?.prompt ?? "Question"} | Aligned Partner Reflection`;
  if (state.screen === "result") return "Your relationship profile | Aligned Partner Reflection";
  return "Aligned Partner Reflection";
}

function shell(content, { showHeader = true } = {}) {
  return `
    <a class="quiz-skip-link" href="#quiz-content">Skip to content</a>
    ${showHeader ? `<header class="quiz-header"><a class="quiz-wordmark" href="./quiz.html" data-action="home">Aligned Partner Reflection</a>${state.screen !== "landing" ? `<button class="quiz-link-button" type="button" data-action="exit">Exit</button>` : ""}</header>` : ""}
    <div id="quiz-content" class="quiz-content">${content}</div>
    <p class="sr-only" aria-live="polite" aria-atomic="true">${escapeHtml(announcement)}</p>
    <p class="sr-only" role="alert" aria-atomic="true">${escapeHtml(validationMessage)}</p>`;
}

function landingView() {
  return shell(`
    <section class="quiz-card quiz-landing">
      <p class="quiz-eyebrow">A 3-minute relationship reflection</p>
      <h1 tabindex="-1">The relationship you want needs language.</h1>
      <p class="quiz-lede">Name the values, rhythms, and partner behaviors that may help you feel understood, desired, and free to be yourself.</p>
      <p class="quiz-trust">Your answers stay in this browser unless you choose to email your report. For self-reflection—not therapy, diagnosis, or a prediction of compatibility.</p>
      <div class="quiz-actions quiz-actions-stack">
        <button type="button" data-action="start">Start my relationship profile</button>
        <button class="quiz-link-button" type="button" data-action="how" aria-expanded="${showHowItWorks}" aria-controls="how-it-works">How this works</button>
      </div>
      <div id="how-it-works" ${showHowItWorks ? "" : "hidden"}>
        <p>You will answer 8 short relationship questions, then choose whether to answer 3 questions about affection and sexual connection. You can go back, skip sensitive questions, and see your result without subscribing. Your result reflects what you choose today and may change.</p>
      </div>
      <p class="quiz-path" aria-label="Experience steps">Questions <span aria-hidden="true">→</span> your profile <span aria-hidden="true">→</span> optional next steps</p>
    </section>`, { showHeader: false });
}

function progressView() {
  const position = state.questionIndex + 1;
  const label = state.intimacySkipped ? "Core questions complete" : `Question ${position} of ${questions.length}`;
  return `<div class="quiz-progress"><p>${label}</p><progress value="${position}" max="${questions.length}">${label}</progress></div>`;
}

function normalizedAnswer(question) {
  const answer = state.answers[question.id];
  return Array.isArray(answer) ? answer : answer == null ? [] : [answer];
}

function questionView() {
  const question = questions[state.questionIndex];
  const selected = normalizedAnswer(question);
  const isMulti = question.responseType === "multi" || question.responseType === "ranked-choice" || (question.maxSelections ?? 1) > 1;
  const count = selected.length;
  const inputType = isMulti ? "checkbox" : "radio";
  const help = question.help ?? question.helperText;
  const describedBy = [help ? "question-help" : "", validationMessage ? "question-error" : ""].filter(Boolean).join(" ");
  return shell(`
    ${progressView()}
    <form class="quiz-card quiz-question" data-form="question" novalidate>
      <fieldset ${describedBy ? `aria-describedby="${describedBy}"` : ""}>
        <legend tabindex="-1">${escapeHtml(question.prompt)}</legend>
        ${state.questionIndex === 0 ? `<p id="question-help" class="quiz-helper">Choose the answer that feels true, not impressive.</p>` : help ? `<p id="question-help" class="quiz-helper">${escapeHtml(help)}</p>` : ""}
        ${isMulti ? `<p class="quiz-selection-count" aria-live="polite">${count} of ${question.maxSelections ?? 3} selected</p>` : ""}
        ${validationMessage ? `<p id="question-error" class="quiz-error">${escapeHtml(validationMessage)}</p>` : ""}
        <div class="quiz-options">
          ${question.options.map((option) => `<label class="quiz-option"><input type="${inputType}" name="answer" value="${escapeHtml(option.id)}" ${selected.includes(option.id) ? "checked" : ""}><span>${escapeHtml(option.label)}</span></label>`).join("")}
        </div>
      </fieldset>
      <div class="quiz-actions">
        ${state.questionIndex > 0 ? `<button class="quiz-secondary" type="button" data-action="back">Back</button>` : ""}
        ${question.required === false ? `<button class="quiz-secondary" type="button" data-action="skip-question">Prefer not to answer</button>` : ""}
        <button type="submit">Next</button>
      </div>
    </form>`);
}

function noticeView() {
  return shell(`
    ${progressView()}
    <section class="quiz-card quiz-notice">
      <h1 tabindex="-1">A note before the intimacy questions</h1>
      <p>The next three questions are about affection and sexual connection because these preferences can matter in partnership. Desire varies across people and across time. You can answer, skip any question, or skip this section. Skipping will not lower your result.</p>
      <p class="quiz-trust">We do not need explicit details or sexual history.</p>
      <div class="quiz-actions">
        <button class="quiz-secondary" type="button" data-action="back">Back</button>
        <button class="quiz-secondary" type="button" data-action="skip-intimacy">Skip this section</button>
        <button type="button" data-action="continue-intimacy">Continue to intimacy questions</button>
      </div>
    </section>`);
}

function resultFromModel() {
  if (state.result) return state.result;
  const generator = domain.generateResult ?? domain.scoreQuiz ?? domain.buildResult;
  state.result = generator ? generator(state.answers, { skipIntimacy: state.intimacySkipped }) : {};
  persist();
  return state.result;
}

function orientationFor(result) {
  const orientationId = result.orientationId ?? result.orientationIds?.[0] ?? result.orientation?.id;
  const orientations = config.orientations ?? [];
  return result.orientation ?? orientations.find((item) => item.id === orientationId) ?? {
    title: result.title ?? "Your relationship reflection",
    thesis: result.thesis ?? "Your answers point to the conditions that may help partnership feel more like your own.",
  };
}

function dimensionsView(result) {
  const dimensions = Object.entries(result.dimensions ?? {});
  if (!dimensions.length) return `<p>Your answers form a personal map of connection, shared life, communication, and space.</p>`;
  return `<div class="quiz-dimensions">${dimensions.map(([id, dimension]) => {
    const meta = config.dimensions?.[id] ?? {};
    const label = dimension.label ?? meta.label ?? id.replaceAll("_", " ");
    if (dimension.status === "insufficient") return `<div class="quiz-dimension"><h3>${escapeHtml(label)}</h3><p>Not enough answers yet</p></div>`;
    const value = dimension.summary ?? dimension.band ?? (Number.isFinite(dimension.score) ? `${Math.round(dimension.score)} out of 100` : "Reflected in your answers");
    return `<div class="quiz-dimension"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(value)}</p>${Number.isFinite(dimension.score) ? `<progress value="${dimension.score}" max="100" aria-label="${escapeHtml(label)}: ${escapeHtml(value)}">${escapeHtml(value)}</progress>` : ""}</div>`;
  }).join("")}</div>`;
}

function resultView() {
  const result = resultFromModel();
  const orientation = orientationFor(result);
  const valueQuestion = questions.find((question) => question.id === "partnership_values" || question.id.includes("value"));
  const values = result.topValues ?? result.topValueLabels ?? (result.topValueOptionIds ?? []).map((id) => valueQuestion?.options.find((option) => option.id === id)?.label ?? id);
  const partnerSignals = result.partnerSignals ?? result.alignedPartnerSignals ?? [];
  const curiosity = result.curiosity ?? result.watchOutCopy ?? "Let attraction unfold alongside observation. Give actions enough time to become a pattern.";
  return shell(`
    <article class="quiz-result">
      <section class="quiz-card quiz-result-hero">
        <p class="quiz-eyebrow">Based on your answers today</p>
        <h1 tabindex="-1">${escapeHtml(orientation.title)}</h1>
        <p class="quiz-lede">${escapeHtml(orientation.thesis)}</p>
        <p class="quiz-badge">A current reflection—not a fixed type</p>
        <p>You may recognize yourself in more than one orientation. Clarity is not a contract; you are allowed to evolve.</p>
      </section>
      <section class="quiz-card"><h2>What matters most to you</h2>${values.length ? `<ul class="quiz-chips">${values.map((value) => `<li>${escapeHtml(value.label ?? value)}</li>`).join("")}</ul>` : `<p>Your chosen values shape the rest of this profile.</p>`}</section>
      <section class="quiz-card"><h2>Your relationship map</h2>${dimensionsView(result)}</section>
      <section class="quiz-card"><h2>Aligned partner signals</h2><p>You may appreciate a partner who is willing to…</p>${partnerSignals.length ? `<ul>${partnerSignals.map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")}</ul>` : `<ul><li>make needs explicit instead of expecting mind-reading</li><li>follow through on the agreements you shape together</li><li>respect both interest and limits without pressure</li></ul>`}</section>
      <section class="quiz-card"><h2>One place to stay curious</h2><p>${escapeHtml(curiosity)}</p></section>
      <section class="quiz-card"><h2>Your intimacy conversation</h2>${state.intimacySkipped ? `<p>You chose not to map intimacy today. Your relationship profile is still complete.</p>` : `<p>${escapeHtml(result.intimacySummary ?? "Affection and sexual connection are things to name together, with room for difference, change, and mutual consent.")}</p><p>Sexual connection can shift with stress, health, medication, caregiving, disability, life stage, safety, and relationship context. A difference in desire is a conversation signal—not proof that either person is broken.</p>`}</section>
      <section class="quiz-card"><h2>Three conversations worth having</h2><ol><li>What helps each of us feel understood before we move into solutions?</li><li>How do we want to balance shared life with protected individual identity?</li><li>${state.intimacySkipped ? "Which expectations feel essential, which are preferences, and which are open to negotiation?" : "What does satisfying affection or sexual connection mean to each of us right now—and how will we respond when our answers differ?"}</li></ol></section>
      <section class="quiz-card"><h2>A seven-minute next step</h2><p>Finish this sentence privately: “I feel most like myself in partnership when…” Then name one observable behavior that would support it.</p></section>
      <section class="quiz-card quiz-controls" aria-label="Profile controls"><h2>Your profile, your choice</h2><div class="quiz-actions"><button class="quiz-secondary" type="button" data-action="review">Review my answers</button><button class="quiz-secondary" type="button" data-action="restart">Retake and clear this result</button><button class="quiz-secondary" type="button" data-action="print">Print or save as PDF</button><button class="quiz-link-button" type="button" data-action="delete">Delete my quiz data</button></div></section>
      <section class="quiz-card"><h2>Scope reminder</h2><p>Your result is a mirror, not a verdict. It summarizes your self-report; it does not evaluate a partner, override consent, or predict relationship success.</p></section>
      ${emailView()}
      ${offerView()}
    </article>`);
}

function emailView() {
  if (!showEmail) return `<section class="quiz-card quiz-email"><h2>Want a copy you can return to?</h2><p>Email yourself this profile plus a one-page partner conversation guide.</p><button type="button" data-action="show-email">Email my profile</button></section>`;
  return `<section class="quiz-card quiz-email"><h2>Want a copy you can return to?</h2><p>Email yourself this profile plus a one-page partner conversation guide.</p><form data-form="email"><label for="quiz-email">Email address</label><input id="quiz-email" name="email" type="email" autocomplete="email" inputmode="email" required><label class="quiz-consent"><input name="marketingConsent" type="checkbox"> <span>Also send me occasional relationship insights and invitations from Bri. I can unsubscribe at any time.</span></label><p class="quiz-trust">This sends the report you requested. It does not subscribe you to ongoing emails.</p><button type="submit">Email my profile</button><p class="quiz-form-status" role="status">${escapeHtml(emailStatus)}</p></form></section>`;
}

function offerView() {
  if (!showOffer) return "";
  return `<section class="quiz-card quiz-offer"><p class="quiz-eyebrow">Optional next step</p><h2>Turn this reflection into a real relationship strategy.</h2><p>In an Alignment Strategy Session with Bri, you can clarify what is essential, what is negotiable, and the conversation or decision in front of you. Bri’s approach integrates practical discernment with spiritual guidance; the session does not promise a particular partner or outcome.</p><div class="quiz-actions"><button type="button" disabled aria-describedby="offer-note">Explore the Alignment Strategy Session</button><button class="quiz-secondary" type="button" data-action="dismiss-offer">Not now</button></div><p id="offer-note" class="quiz-helper">Session details will be available here soon.</p></section>`;
}

function exitView() {
  return shell(`<section class="quiz-card"><h1 tabindex="-1">Leave this reflection?</h1><p>Your answers are saved only in this browser for up to 24 hours. You can keep them here or clear them now.</p><div class="quiz-actions"><button class="quiz-secondary" type="button" data-action="keep-going">Keep going</button><button type="button" data-action="clear-leave">Clear and leave</button></div></section>`);
}

function render({ focus = true } = {}) {
  document.title = titleForScreen();
  root.setAttribute("aria-busy", "false");
  root.innerHTML = exitPending ? exitView() : state.screen === "landing" ? landingView() : state.screen === "notice" ? noticeView() : state.screen === "result" ? resultView() : questionView();
  if (focus) requestAnimationFrame(() => root.querySelector('h1[tabindex="-1"], legend[tabindex="-1"]')?.focus({ preventScroll: false }));
  announcement = "";
}

function goToQuestion(index) {
  state.screen = "question";
  state.questionIndex = Math.max(0, Math.min(index, questions.length - 1));
  state.activeQuestionId = questions[state.questionIndex].id;
  validationMessage = "";
  announcement = `Question ${state.questionIndex + 1} of ${questions.length}`;
  persist();
  render();
}

function completeQuiz() {
  state.screen = "result";
  state.completedAt = new Date().toISOString();
  state.result = null;
  resultFromModel();
  announcement = "Your relationship profile is ready.";
  persist();
  render();
}

function advance() {
  const nextIndex = state.questionIndex + 1;
  if (nextIndex === intimacyStart && !state.noticeAcknowledged) {
    state.screen = "notice";
    persist();
    render();
  } else if (nextIndex >= questions.length) completeQuiz();
  else goToQuestion(nextIndex);
}

function validateCurrent(answer) {
  const question = questions[state.questionIndex];
  if (typeof domain.validateAnswer === "function") {
    const outcome = domain.validateAnswer(question, answer);
    return outcome === true || outcome?.valid ? "" : outcome?.message ?? "Choose one answer to continue.";
  }
  const count = Array.isArray(answer) ? answer.length : answer ? 1 : 0;
  if (question.required !== false && count < (question.minSelections ?? 1)) return (question.minSelections ?? 1) > 1 ? `Choose ${question.minSelections} answers to continue.` : "Choose one answer to continue.";
  if (count > (question.maxSelections ?? 1)) return `Choose no more than ${question.maxSelections} answers.`;
  return "";
}

root.addEventListener("change", (event) => {
  if (!event.target.matches('[name="answer"]')) return;
  const question = questions[state.questionIndex];
  const isMulti = event.target.type === "checkbox";
  if (isMulti) {
    const selected = [...root.querySelectorAll('[name="answer"]:checked')].map((input) => input.value);
    if (selected.length > (question.maxSelections ?? 3)) {
      event.target.checked = false;
      validationMessage = `Choose no more than ${question.maxSelections ?? 3} answers.`;
    } else {
      state.answers[question.id] = selected;
      validationMessage = "";
    }
  } else {
    state.answers[question.id] = event.target.value;
    validationMessage = "";
  }
  persist();
  if (isMulti) render({ focus: false });
});

root.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.matches('[data-form="question"]')) {
    const question = questions[state.questionIndex];
    const formData = new FormData(event.target);
    const values = formData.getAll("answer");
    const answer = values.length > 1 || event.target.querySelector('[type="checkbox"]') ? values : values[0];
    validationMessage = validateCurrent(answer);
    if (validationMessage) return render();
    state.answers[question.id] = answer;
    state.visitedQuestionIds = [...new Set([...(state.visitedQuestionIds ?? []), question.id])];
    persist();
    advance();
  }
  if (event.target.matches('[data-form="email"]')) {
    const emailInput = event.target.elements.email;
    if (!emailInput.checkValidity()) {
      emailStatus = "Enter a valid email address.";
      emailInput.reportValidity();
      return;
    }
    emailStatus = "Email delivery is not connected yet. Your result is still here.";
    event.target.querySelector(".quiz-form-status").textContent = emailStatus;
  }
});

root.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const action = control.dataset.action;
  if (action === "start") {
    state = { ...freshState(), screen: "question", questionIndex: 0, startedAt: new Date().toISOString() };
    persist();
    goToQuestion(0);
  } else if (action === "how") { showHowItWorks = !showHowItWorks; render({ focus: false }); }
  else if (action === "back") {
    if (state.screen === "notice") goToQuestion(Math.max(0, intimacyStart - 1));
    else goToQuestion(state.questionIndex - 1);
  } else if (action === "skip-question") { delete state.answers[questions[state.questionIndex].id]; advance(); }
  else if (action === "continue-intimacy") { state.noticeAcknowledged = true; state.intimacySkipped = false; goToQuestion(intimacyStart); }
  else if (action === "skip-intimacy") { state.noticeAcknowledged = true; state.intimacySkipped = true; questions.slice(intimacyStart).forEach((question) => delete state.answers[question.id]); completeQuiz(); }
  else if (action === "review") goToQuestion(0);
  else if (action === "restart" || action === "delete" || action === "clear-leave") {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* The in-memory state is still cleared. */ }
    state = freshState();
    exitPending = false;
    announcement = action === "delete" ? "Your quiz data was deleted." : "Your quiz was cleared.";
    render();
  } else if (action === "print") window.print();
  else if (action === "show-email") { showEmail = true; render({ focus: false }); root.querySelector("#quiz-email")?.focus(); }
  else if (action === "dismiss-offer") { showOffer = false; render({ focus: false }); }
  else if (action === "exit") { exitPending = true; render(); }
  else if (action === "keep-going") { exitPending = false; render(); }
  else if (action === "home") { event.preventDefault(); exitPending = true; render(); }
});

render();
