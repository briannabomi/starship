export const STORAGE_KEY = "starship-tracker-state-v1";
export const STATE_VERSION = 5;

export function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
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

function periodFromDueAt(dueAt) {
  const end = /^\d{4}-\d{2}-\d{2}$/.test(dueAt || "") ? dueAt : today();
  const startDate = new Date(`${end}T12:00:00`);
  startDate.setDate(startDate.getDate() - 6);
  return { periodStart: startDate.toISOString().slice(0, 10), periodEnd: end };
}

function seedCheckIn(input) {
  const period = periodFromDueAt(input.dueAt);
  return {
    ...period,
    questionnaireVersion: 1,
    questionLabels: { ...QUESTION_LABELS },
    previousGoal: "",
    completedPreviousGoal: "",
    supportRequested: "",
    focus: "",
    questions: "",
    alive: "",
    completed: "",
    stuck: "",
    ratings: { energy: 3, clarity: 3, alignment: 3, progress: 2 },
    authoredAt: null,
    submittedAt: null,
    createdChallengeIds: [],
    linkedChallengeIds: [],
    ...input,
  };
}

function seedChallenge(input) {
  return {
    description: "",
    desiredOutcome: "",
    status: "backlog",
    priority: "none",
    rank: 1000,
    ownerType: "unassigned",
    ownerId: null,
    createdAt: today(),
    updatedAt: today(),
    targetDate: null,
    blockedAt: null,
    blockedByUserId: null,
    blockedReason: null,
    resolvedAt: null,
    resolvedByUserId: null,
    archivedAt: null,
    archivedByUserId: null,
    sourceType: "manual",
    sourceId: null,
    version: 1,
    ...input,
  };
}

function seedChallengeActivities() {
  const records = [
    ["challenge-client-a-1", "client-a", "created", today(-6), "manual"],
    ["challenge-client-c-1", "client-c", "created", today(-5), "manual"],
    ["challenge-client-c-1", "client-c", "blocked", today(-1), "manual"],
    ["challenge-from-issue-1", "coach-bri", "migrated", today(-5), "migration"],
    ["challenge-from-issue-2", "coach-bri", "migrated", today(-2), "migration"],
  ];
  return records.map(([challengeId, actorUserId, eventType, occurredAt, sourceType], index) => ({
    id: `activity-seed-${index + 1}`,
    challengeId,
    actorUserId,
    eventType,
    occurredAt,
    fieldChanges: {},
    commentBody: null,
    sourceType,
    sourceId: sourceType === "migration" ? challengeId.replace("challenge-from-", "") : null,
  }));
}

export function createSeedState() {
  return {
    version: STATE_VERSION,
    session: {
      role: "coach",
      clientId: "client-a",
      workspaceId: "workspace-couple-ab",
      clientView: "dashboard",
      coachAttentionSort: "attention",
    },
    backendConfig: {
      hosting: "Vercel",
      database: "Vercel Postgres / Neon Postgres",
      auth: "Invite-only magic link",
      dummyDriveFolderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
      vercelProjectUrl: "https://vercel.com/new?teamSlug=briannabomis-projects",
    },
    users: [
      { id: "coach-bri", role: "coach", name: "Bri", timezone: "America/Puerto_Rico" },
      {
        id: "client-a",
        role: "client",
        name: "Client A",
        email: "client.a@example.test",
        phone: "+15550101001",
        timezone: "America/New_York",
      },
      {
        id: "client-b",
        role: "client",
        name: "Client B",
        email: "client.b@example.test",
        phone: "+15550101002",
        timezone: "America/New_York",
      },
      {
        id: "client-c",
        role: "client",
        name: "Client C",
        email: "client.c@example.test",
        phone: "+15550101003",
        timezone: "America/New_York",
      },
    ],
    clients: [
      {
        id: "client-a",
        name: "Client A",
        email: "client.a@example.test",
        phone: "+15550101001",
        stage: "Sovereign Arc",
        focus: "Name desire without waiting for Client B to validate it",
        nextCallAt: today(3),
        smsConsent: true,
        aiConsent: true,
        recordingConsent: true,
        archivedAt: null,
      },
      {
        id: "client-b",
        name: "Client B",
        email: "client.b@example.test",
        phone: "+15550101002",
        stage: "Sovereign Arc",
        focus: "Move from defensiveness into clean repair",
        nextCallAt: today(3),
        smsConsent: true,
        aiConsent: true,
        recordingConsent: true,
        archivedAt: null,
      },
      {
        id: "client-c",
        name: "Client C",
        email: "client.c@example.test",
        phone: "+15550101003",
        stage: "Sovereign Arc",
        focus: "Build consistency between insight and action",
        nextCallAt: today(5),
        smsConsent: true,
        aiConsent: true,
        recordingConsent: true,
        archivedAt: null,
      },
    ],
    googleDriveSources: [
      {
        id: "drive-client-a",
        clientId: "client-a",
        folderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        journalFolderLabel: "Journal Entries",
        roadmapLabel: "Legacy Roadmap",
        videoFolderLabel: "Video Library",
        status: "mock_linked",
      },
      {
        id: "drive-client-b",
        clientId: "client-b",
        folderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        journalFolderLabel: "Journal Entries",
        roadmapLabel: "Legacy Roadmap",
        videoFolderLabel: "Video Library",
        status: "mock_linked",
      },
      {
        id: "drive-client-c",
        clientId: "client-c",
        folderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        journalFolderLabel: "Journal Entries",
        roadmapLabel: "Legacy Roadmap",
        videoFolderLabel: "Video Library",
        status: "mock_ready",
      },
    ],
    relationshipWorkspaces: [
      {
        id: "workspace-couple-ab",
        name: "Client A + Client B",
        type: "couple",
        clientIds: ["client-a", "client-b"],
        focus: "Track open challenges, shared commitments, desires, fights, blocks, and repair.",
        nextCallAt: today(3),
        sourceFolderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
      },
    ],
    challenges: [
      seedChallenge({
        id: "challenge-client-a-1",
        scopeType: "client",
        scopeId: "client-a",
        title: "Publish the first offer-page draft",
        description: "Move from private clarity into a visible first version.",
        desiredOutcome: "A draft exists before the next coaching call.",
        status: "in_focus",
        priority: "high",
        ownerType: "client",
        ownerId: "client-a",
        createdByUserId: "client-a",
        createdAt: today(-6),
        updatedAt: today(-2),
      }),
      seedChallenge({
        id: "challenge-client-c-1",
        scopeType: "client",
        scopeId: "client-c",
        title: "Choose one repeatable integration practice",
        description: "Turn one useful insight into a daily behavior.",
        desiredOutcome: "Practice the behavior for five consecutive days.",
        status: "in_focus",
        priority: "medium",
        ownerType: "client",
        ownerId: "client-c",
        createdByUserId: "client-c",
        createdAt: today(-5),
        updatedAt: today(-1),
        blockedAt: today(-1),
        blockedByUserId: "client-c",
        blockedReason: "The daily trigger and time have not been chosen yet.",
        version: 2,
      }),
      seedChallenge({
        id: "challenge-from-issue-1",
        scopeType: "relationship",
        scopeId: "workspace-couple-ab",
        title: "Decision pressure turns into shutdown",
        description: "Client A asks for clarity; Client B hears criticism and goes quiet.",
        desiredOutcome: "Pause the logistics debate and name the fear underneath before solving.",
        status: "backlog",
        priority: "high",
        ownerType: "client",
        ownerId: "client-a",
        createdByUserId: "coach-bri",
        createdAt: today(-5),
        updatedAt: today(-5),
        sourceType: "migration",
        sourceId: "issue-1",
        migratedFromRelationshipIssueId: "issue-1",
      }),
      seedChallenge({
        id: "challenge-from-issue-2",
        scopeType: "relationship",
        scopeId: "workspace-couple-ab",
        title: "Household labor conversation loops",
        description: "They keep renegotiating the same task list without tracking agreements.",
        desiredOutcome: "Turn the fight into one explicit agreement and one owner.",
        status: "in_focus",
        priority: "medium",
        ownerType: "client",
        ownerId: "client-b",
        createdByUserId: "coach-bri",
        createdAt: today(-2),
        updatedAt: today(-2),
        blockedAt: today(-2),
        blockedByUserId: "coach-bri",
        blockedReason: "Needs a clearer shared task definition.",
        sourceType: "migration",
        sourceId: "issue-2",
        migratedFromRelationshipIssueId: "issue-2",
      }),
    ],
    challengeActivities: seedChallengeActivities(),
    relationshipIssues: [
      {
        id: "issue-1",
        linkedChallengeId: "challenge-from-issue-1",
        workspaceId: "workspace-couple-ab",
        title: "Decision pressure turns into shutdown",
        description: "Client A asks for clarity; Client B hears criticism and goes quiet.",
        status: "open",
        severity: "high",
        ownerClientId: "client-a",
        createdAt: today(-5),
        desiredRepair: "Pause the logistics debate and name the fear underneath before solving.",
        latestSignal: "Both named the pattern without assigning blame.",
      },
      {
        id: "issue-2",
        linkedChallengeId: "challenge-from-issue-2",
        workspaceId: "workspace-couple-ab",
        title: "Household labor conversation loops",
        description: "They keep renegotiating the same task list without tracking agreements.",
        status: "blocked",
        severity: "medium",
        ownerClientId: "client-b",
        createdAt: today(-2),
        desiredRepair: "Turn the fight into one explicit agreement and one owner.",
        latestSignal: "Needs a clearer shared task definition.",
      },
    ],
    relationshipTasks: [
      {
        id: "rel-task-1",
        workspaceId: "workspace-couple-ab",
        title: "Run a 12-minute repair conversation",
        description: "Each person gets 3 minutes for impact, 3 minutes for ownership, then one concrete request.",
        status: "open",
        assignedClientIds: ["client-a", "client-b"],
        dueAt: today(2),
        linkedIssueId: "issue-1",
      },
      {
        id: "rel-task-2",
        workspaceId: "workspace-couple-ab",
        title: "Client B drafts the shared chore agreement",
        description: "Bring one proposed owner, cadence, and done-definition to the next call.",
        status: "blocked",
        assignedClientIds: ["client-b"],
        dueAt: today(1),
        linkedIssueId: "issue-2",
      },
    ],
    relationshipDesires: [
      {
        id: "desire-1",
        workspaceId: "workspace-couple-ab",
        clientId: "client-a",
        title: "More direct initiation",
        description: "Client A wants Client B to initiate plans without needing repeated prompting.",
        status: "active",
        lastNamedAt: today(-1),
      },
      {
        id: "desire-2",
        workspaceId: "workspace-couple-ab",
        clientId: "client-b",
        title: "Less correction in logistics",
        description: "Client B wants requests to land as clean asks instead of performance review.",
        status: "active",
        lastNamedAt: today(-1),
      },
    ],
    fights: [
      {
        id: "fight-1",
        workspaceId: "workspace-couple-ab",
        title: "Sunday calendar fight",
        happenedAt: today(-3),
        trigger: "Client A asked for plans; Client B felt cornered.",
        pattern: "Pursue / withdraw",
        status: "repair_in_progress",
        repairTaskId: "rel-task-1",
      },
    ],
    assignments: [
      {
        id: "assignment-1",
        clientId: "client-a",
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
        clientId: "client-b",
        title: "Protection Running A Veto",
        prompt: "Where did your system contract this week right before expansion became possible?",
        dueAt: today(-1),
        status: "not_started",
        linkedRoadmapId: "roadmap-embodiment",
        createdAt: today(-6),
      },
      {
        id: "assignment-3",
        clientId: "client-c",
        title: "From Insight To Action",
        prompt: "What is one thing you already know that you have not yet let change your behavior?",
        dueAt: today(4),
        status: "not_started",
        linkedRoadmapId: "roadmap-client-c-integration",
        createdAt: today(-1),
      },
    ],
    journalEntries: [
      {
        id: "journal-1",
        assignmentId: "assignment-1",
        clientId: "client-a",
        title: "Choosing the offer direction",
        body:
          "I can feel the old pattern wanting consensus before I choose. The quieter signal is already clear.",
        status: "draft",
        visibility: "private_draft",
        updatedAt: today(-1),
      },
    ],
    weeklyCheckIns: [
      seedCheckIn({
        id: "checkin-1",
        clientId: "client-a",
        dueAt: today(1),
        status: "not_opened",
        ratings: { energy: 3, clarity: 2, alignment: 3, progress: 2 },
      }),
      seedCheckIn({
        id: "checkin-2",
        clientId: "client-b",
        dueAt: today(1),
        status: "not_opened",
        ratings: { energy: 3, clarity: 2, alignment: 2, progress: 2 },
      }),
      seedCheckIn({
        id: "checkin-3",
        clientId: "client-c",
        dueAt: today(3),
        status: "not_opened",
        ratings: { energy: 3, clarity: 3, alignment: 3, progress: 2 },
      }),
      seedCheckIn({
        id: "checkin-a-history-1",
        clientId: "client-a",
        dueAt: today(-6),
        status: "submitted",
        focus: "Choose the offer direction without polling for consensus.",
        supportRequested: "Help me distinguish clean commitment from protector urgency.",
        completed: "Drafted the yes/no list.",
        submittedAt: `${today(-7)}T14:00:00.000Z`,
        authoredAt: `${today(-7)}T13:45:00.000Z`,
      }),
      seedCheckIn({
        id: "checkin-a-history-2",
        clientId: "client-a",
        dueAt: today(-13),
        status: "submitted",
        focus: "Name the decision I am avoiding.",
        supportRequested: "Reflect where analysis is keeping me safe.",
        submittedAt: `${today(-14)}T14:00:00.000Z`,
        authoredAt: `${today(-14)}T13:50:00.000Z`,
      }),
      seedCheckIn({
        id: "checkin-b-history-1",
        clientId: "client-b",
        dueAt: today(-6),
        status: "submitted",
        focus: "Practice one clean repair without defending intent.",
        supportRequested: "Help me slow down before I explain.",
        submittedAt: `${today(-7)}T15:00:00.000Z`,
      }),
      seedCheckIn({
        id: "checkin-c-history-1",
        clientId: "client-c",
        dueAt: today(-13),
        status: "submitted",
        focus: "Turn insight into one repeated action.",
        submittedAt: `${today(-14)}T16:00:00.000Z`,
      }),
    ],
    relationshipCheckIns: [
      {
        id: "rel-checkin-1",
        workspaceId: "workspace-couple-ab",
        dueAt: today(1),
        status: "not_opened",
        focus: "What challenge do we want to repair before the next call?",
        sharedQuestion: "",
        clientAInput: "",
        clientBInput: "",
        stuck: "",
      },
    ],
    actionItems: [
      {
        id: "action-1",
        clientId: "client-a",
        title: "Write the yes/no list before the next call",
        source: "coach",
        dueAt: today(2),
        status: "open",
        reminder: "sms",
      },
      {
        id: "action-2",
        clientId: "client-b",
        title: "Name the protective story before responding",
        source: "coach",
        dueAt: today(2),
        status: "open",
        reminder: "sms",
      },
      {
        id: "action-3",
        clientId: "client-c",
        title: "Pick one behavior to change before the next call",
        source: "coach",
        dueAt: today(4),
        status: "open",
        reminder: "sms",
      },
    ],
    calls: [
      {
        id: "call-1",
        clientId: "client-a",
        workspaceId: "workspace-couple-ab",
        title: "Client A + Client B Coaching Call",
        happenedAt: today(-2),
        status: "imported",
        provider: "Manual transcript",
        recordingUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        transcript:
          "Coach: What decision keeps looping? Client: I keep saying I need more clarity, but I already know the answer. The fear is that if I choose it, I have to disappoint people. Coach: That sounds like protection running a veto. Client: Internally, my chest gets tight and I go into analysis. Externally, I keep delaying the offer page. Coach: Your action is to draft the first version by Friday and bring the messy truth to the next call.",
      },
      {
        id: "call-2",
        clientId: "client-c",
        title: "Client C Coaching Call",
        happenedAt: today(-1),
        status: "imported",
        provider: "Manual transcript",
        recordingUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        transcript:
          "Coach: What has stayed theoretical? Client: I keep writing about integration but not choosing a behavior. Coach: The action is to choose one behavior and track it daily before the next call.",
      },
    ],
    insightCandidates: [],
    actionItemCandidates: [],
    insights: [
      {
        id: "insight-1",
        clientId: "client-a",
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
        clientId: "client-a",
        name: "Discernment",
        current: 42,
        target: 85,
        gapLabel: "Separating soul signal from protector urgency",
        evidence: ["Named analysis as protection", "Drafting yes/no choices before calls"],
        sourceType: "google_drive",
        sourceLabel: "Legacy Roadmap",
        sourceUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
      },
      {
        id: "roadmap-embodiment",
        clientId: "client-b",
        name: "Embodiment",
        current: 35,
        target: 80,
        gapLabel: "Moving from insight into ordinary action",
        evidence: ["Completing weekly body-based reflections"],
        sourceType: "google_drive",
        sourceLabel: "Legacy Roadmap",
        sourceUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
      },
      {
        id: "roadmap-leadership",
        clientId: "client-a",
        name: "Leadership",
        current: 58,
        target: 90,
        gapLabel: "Publishing before consensus",
        evidence: ["Chose one offer direction without polling the room"],
        sourceType: "google_drive",
        sourceLabel: "Legacy Roadmap",
        sourceUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
      },
      {
        id: "roadmap-client-c-integration",
        clientId: "client-c",
        name: "Integration",
        current: 28,
        target: 78,
        gapLabel: "Turning self-awareness into repeated behavior",
        evidence: ["Identified the behavior gap"],
        sourceType: "google_drive",
        sourceLabel: "Legacy Roadmap",
        sourceUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
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
        clientId: "client-a",
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

export function migrateVisibleLanguage(state) {
  (state.relationshipWorkspaces || []).forEach((workspace) => {
    if (workspace.focus === "Track open problems, shared commitments, desires, fights, blocks, and repair.") {
      workspace.focus = "Track open challenges, shared commitments, desires, fights, blocks, and repair.";
    }
    if (workspace.focus === "Coach-created shared workspace for open problems, blocks, tasks, desires, fights, and repair.") {
      workspace.focus = "Coach-created shared workspace for open challenges, blocks, tasks, desires, fights, and repair.";
    }
  });
  (state.relationshipCheckIns || []).forEach((checkIn) => {
    if (checkIn.focus === "What problem do we want to repair before the next call?") {
      checkIn.focus = "What challenge do we want to repair before the next call?";
    }
  });
  return state;
}

function normalizeCheckIn(checkIn) {
  const period = periodFromDueAt(checkIn.dueAt || checkIn.periodEnd);
  if (!checkIn.periodStart) checkIn.periodStart = period.periodStart;
  if (!checkIn.periodEnd) checkIn.periodEnd = period.periodEnd;
  if (!checkIn.dueAt) checkIn.dueAt = checkIn.periodEnd;
  if (!checkIn.questionnaireVersion) checkIn.questionnaireVersion = 1;
  checkIn.questionLabels = { ...QUESTION_LABELS, ...(checkIn.questionLabels || {}) };
  if (typeof checkIn.supportRequested !== "string") {
    checkIn.supportRequested = typeof checkIn.supportWanted === "string" ? checkIn.supportWanted : "";
  }
  for (const field of ["previousGoal", "completedPreviousGoal", "focus", "questions", "alive", "completed", "stuck"]) {
    if (typeof checkIn[field] !== "string") checkIn[field] = "";
  }
  checkIn.ratings = {
    energy: 3,
    clarity: 3,
    alignment: 3,
    progress: 2,
    ...(checkIn.ratings || {}),
  };
  if (!("authoredAt" in checkIn)) checkIn.authoredAt = checkIn.submittedAt || null;
  if (!("submittedAt" in checkIn)) checkIn.submittedAt = null;
  if (!Array.isArray(checkIn.createdChallengeIds)) checkIn.createdChallengeIds = [];
  if (!Array.isArray(checkIn.linkedChallengeIds)) checkIn.linkedChallengeIds = [];
  return checkIn;
}

function migratedChallengeFromIssue(state, issue, challengeId) {
  const statusMap = {
    open: "backlog",
    repair_in_progress: "in_focus",
    blocked: "in_focus",
    closed: "resolved",
  };
  const blocked = issue.status === "blocked";
  const resolved = issue.status === "closed";
  const occurredAt = issue.updatedAt || issue.createdAt || today();
  const workspace = (state.relationshipWorkspaces || []).find((item) => item.id === issue.workspaceId);
  const ownerClientId = workspace?.clientIds?.includes(issue.ownerClientId) ? issue.ownerClientId : null;
  return seedChallenge({
    id: challengeId,
    scopeType: "relationship",
    scopeId: issue.workspaceId,
    title: String(issue.title || "Relationship challenge").trim() || "Relationship challenge",
    description: String(issue.description || ""),
    desiredOutcome: String(issue.desiredRepair || ""),
    status: statusMap[issue.status] || "backlog",
    priority: issue.severity === "high" ? "high" : issue.severity ? "medium" : "none",
    ownerType: ownerClientId ? "client" : "unassigned",
    ownerId: ownerClientId,
    createdByUserId: "coach-bri",
    createdAt: issue.createdAt || occurredAt,
    updatedAt: occurredAt,
    blockedAt: blocked ? occurredAt : null,
    blockedByUserId: blocked ? "coach-bri" : null,
    blockedReason: blocked ? String(issue.latestSignal || issue.description || "Reason not yet recorded").trim() : null,
    resolvedAt: resolved ? occurredAt : null,
    resolvedByUserId: resolved ? "coach-bri" : null,
    sourceType: "migration",
    sourceId: issue.id,
    migratedFromRelationshipIssueId: issue.id,
  });
}

function nextMigrationChallengeId(challenges, issueId) {
  const base = `challenge-from-${issueId}`;
  if (!challenges.some((item) => item.id === base)) return base;
  const migrationBase = `${base}-migration`;
  if (!challenges.some((item) => item.id === migrationBase)) return migrationBase;
  let suffix = 2;
  while (challenges.some((item) => item.id === `${migrationBase}-${suffix}`)) suffix += 1;
  return `${migrationBase}-${suffix}`;
}

function nextMigrationActivityId(activities, issueId) {
  const base = `activity-migrated-${issueId}`;
  if (!activities.some((item) => item.id === base)) return base;
  let suffix = 2;
  while (activities.some((item) => item.id === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function repairSession(state) {
  const activeClients = state.clients.filter((client) => !client.archivedAt);
  const activeClientIds = new Set(activeClients.map((client) => client.id));
  if (!activeClientIds.has(state.session.clientId)) state.session.clientId = activeClients[0]?.id || null;
  const activeWorkspaces = state.relationshipWorkspaces
    .filter(
      (workspace) =>
        !workspace.archivedAt && workspace.status !== "archived" && workspace.status !== "paused" &&
        (workspace.clientIds || []).every((id) => activeClientIds.has(id)),
    )
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const currentWorkspace = activeWorkspaces.find(
    (workspace) => workspace.id === state.session.workspaceId && (workspace.clientIds || []).includes(state.session.clientId),
  );
  state.session.workspaceId = currentWorkspace?.id ||
    activeWorkspaces.find((workspace) => (workspace.clientIds || []).includes(state.session.clientId))?.id || null;
  if (state.session.clientView === "relationship" && !state.session.workspaceId) state.session.clientView = "dashboard";
}

export function migrateState(state) {
  if (!state || typeof state !== "object") return null;
  if (!Array.isArray(state.clients) || !Array.isArray(state.users) || !Array.isArray(state.weeklyCheckIns)) return null;
  const sourceVersion = state.version;
  if (!Number.isInteger(sourceVersion) || ![4, STATE_VERSION].includes(sourceVersion)) return null;

  state.session = state.session && typeof state.session === "object" ? state.session : {};
  if (!state.session.role) state.session.role = "coach";
  if (!state.session.clientId) state.session.clientId = state.clients.find((client) => !client.archivedAt)?.id || null;
  if (!state.session.clientView || !["dashboard", "relationship", "library"].includes(state.session.clientView)) {
    state.session.clientView = "dashboard";
  }
  if (!["attention", "next_call", "latest_checkin", "client_name"].includes(state.session.coachAttentionSort)) {
    state.session.coachAttentionSort = "attention";
  }

  if (!Array.isArray(state.relationshipWorkspaces)) state.relationshipWorkspaces = [];
  if (!Array.isArray(state.relationshipIssues)) state.relationshipIssues = [];
  if (!Array.isArray(state.challenges)) state.challenges = [];
  if (!Array.isArray(state.challengeActivities)) state.challengeActivities = [];
  state.weeklyCheckIns.forEach(normalizeCheckIn);

  for (const issue of state.relationshipIssues) {
    let challenge = state.challenges.find(
      (item) =>
        item.scopeType === "relationship" && item.scopeId === issue.workspaceId &&
        (item.migratedFromRelationshipIssueId === issue.id || (item.sourceType === "migration" && item.sourceId === issue.id)),
    );
    if (!challenge) {
      challenge = migratedChallengeFromIssue(state, issue, nextMigrationChallengeId(state.challenges, issue.id));
      state.challenges.push(challenge);
    }
    if (issue.linkedChallengeId !== challenge.id) issue.linkedChallengeId = challenge.id;
    if (!state.challengeActivities.some((activity) => activity.challengeId === challenge.id && activity.eventType === "migrated")) {
      state.challengeActivities.push({
        id: nextMigrationActivityId(state.challengeActivities, issue.id),
        challengeId: challenge.id,
        actorUserId: "coach-bri",
        eventType: "migrated",
        occurredAt: challenge.createdAt || issue.updatedAt || issue.createdAt || today(),
        fieldChanges: {},
        commentBody: null,
        sourceType: "migration",
        sourceId: issue.id,
      });
    }
  }

  migrateVisibleLanguage(state);
  repairSession(state);
  state.version = STATE_VERSION;
  return state;
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createSeedState();
    const parsed = JSON.parse(stored);
    const migrated = migrateState(parsed);
    return migrated || createSeedState();
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
