export const STORAGE_KEY = "starship-tracker-state-v1";

export function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function createSeedState() {
  return {
    session: { role: "coach", clientId: "client-alex" },
    users: [
      { id: "coach-bri", role: "coach", name: "Bri", timezone: "America/Puerto_Rico" },
      { id: "client-alex", role: "client", name: "Alex", timezone: "America/New_York" },
    ],
    clients: [
      {
        id: "client-alex",
        name: "Alex Morgan",
        stage: "Sovereign Arc",
        focus: "Discern the soul signal from protection running a veto",
        nextCallAt: today(3),
        smsConsent: true,
        aiConsent: true,
        recordingConsent: true,
      },
    ],
    assignments: [
      {
        id: "assignment-1",
        clientId: "client-alex",
        title: "The Fork",
        prompt:
          "Name one decision you are circling. Which part of you is doing the wanting: soul signal, protector, mind, or ego?",
        dueAt: today(2),
        status: "draft",
        linkedRoadmapId: "roadmap-discernment",
        createdAt: today(-2),
      },
      {
        id: "assignment-2",
        clientId: "client-alex",
        title: "Protection Running A Veto",
        prompt: "Where did your system contract this week right before expansion became possible?",
        dueAt: today(-1),
        status: "not_started",
        linkedRoadmapId: "roadmap-embodiment",
        createdAt: today(-6),
      },
    ],
    journalEntries: [
      {
        id: "journal-1",
        assignmentId: "assignment-1",
        clientId: "client-alex",
        title: "Choosing the offer direction",
        body:
          "I can feel the old pattern wanting consensus before I choose. The quieter signal is already clear.",
        status: "draft",
        visibility: "private_draft",
        updatedAt: today(-1),
      },
    ],
    weeklyCheckIns: [
      {
        id: "checkin-1",
        clientId: "client-alex",
        dueAt: today(1),
        status: "not_opened",
        focus: "",
        questions: "",
        alive: "",
        completed: "",
        stuck: "",
        ratings: { energy: 3, clarity: 2, alignment: 3, progress: 2 },
      },
    ],
    actionItems: [
      {
        id: "action-1",
        clientId: "client-alex",
        title: "Write the yes/no list before the next call",
        source: "coach",
        dueAt: today(2),
        status: "open",
        reminder: "sms",
      },
    ],
    calls: [
      {
        id: "call-1",
        clientId: "client-alex",
        title: "Starship Coaching Call",
        happenedAt: today(-2),
        status: "imported",
        transcript:
          "Coach: What decision keeps looping? Client: I keep saying I need more clarity, but I already know the answer. The fear is that if I choose it, I have to disappoint people. Coach: That sounds like protection running a veto. Client: Internally, my chest gets tight and I go into analysis. Externally, I keep delaying the offer page. Coach: Your action is to draft the first version by Friday and bring the messy truth to the next call.",
      },
    ],
    insightCandidates: [],
    actionItemCandidates: [],
    insights: [
      {
        id: "insight-1",
        clientId: "client-alex",
        type: "internal_world",
        title: "Analysis is acting as protection",
        summary: "Alex uses more research as a way to avoid the felt risk of choosing.",
        evidence: "I keep saying I need more clarity, but I already know the answer.",
        visibility: "shareable_with_client",
        source: "coach",
      },
    ],
    roadmap: [
      {
        id: "roadmap-discernment",
        clientId: "client-alex",
        name: "Discernment",
        current: 42,
        target: 85,
        gapLabel: "Separating soul signal from protector urgency",
        evidence: ["Named analysis as protection", "Drafting yes/no choices before calls"],
      },
      {
        id: "roadmap-embodiment",
        clientId: "client-alex",
        name: "Embodiment",
        current: 35,
        target: 80,
        gapLabel: "Moving from insight into ordinary action",
        evidence: ["Completing weekly body-based reflections"],
      },
      {
        id: "roadmap-leadership",
        clientId: "client-alex",
        name: "Leadership",
        current: 58,
        target: 90,
        gapLabel: "Publishing before consensus",
        evidence: ["Chose one offer direction without polling the room"],
      },
    ],
    videos: [
      {
        id: "video-1",
        title: "The Soul Signal",
        duration: "18 min",
        tags: ["discernment", "soul-signal", "three-brains"],
        topic: "Discernment",
        description: "How to tell the difference between signal, fear, and protector logic.",
      },
      {
        id: "video-2",
        title: "Protection Running A Veto",
        duration: "22 min",
        tags: ["protector", "nervous-system", "integration"],
        topic: "Embodiment",
        description: "A framework for seeing resistance as function before choosing differently.",
      },
      {
        id: "video-3",
        title: "The Fork: Yes/No Moments",
        duration: "14 min",
        tags: ["choice", "integration", "sovereignty"],
        topic: "Leadership",
        description: "Using tiny binary choices to collapse the timeline without bypassing.",
      },
    ],
    alerts: [
      {
        id: "alert-1",
        clientId: "client-alex",
        type: "due_soon",
        message: "The Fork assignment is due soon.",
        read: false,
        createdAt: today(),
      },
    ],
    deliveries: [],
    auditLog: [
      { id: "audit-1", event: "seed.loaded", actor: "system", createdAt: today(), detail: "Synthetic demo data loaded." },
    ],
  };
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : createSeedState();
  } catch {
    return createSeedState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const next = createSeedState();
  saveState(next);
  return next;
}
