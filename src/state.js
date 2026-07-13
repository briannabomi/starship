export const STORAGE_KEY = "starship-tracker-state-v1";
export const STATE_VERSION = 3;

export function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function createSeedState() {
  return {
    version: STATE_VERSION,
    session: { role: "coach", clientId: "client-a", workspaceId: "workspace-couple-ab" },
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
      },
    ],
    googleDriveSources: [
      {
        id: "drive-client-a",
        clientId: "client-a",
        folderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        journalFolderLabel: "Journal Entries",
        roadmapLabel: "Legacy Roadmap",
        fathomFolderLabel: "Fathom Recordings",
        videoFolderLabel: "Video Library",
        status: "mock_linked",
      },
      {
        id: "drive-client-b",
        clientId: "client-b",
        folderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        journalFolderLabel: "Journal Entries",
        roadmapLabel: "Legacy Roadmap",
        fathomFolderLabel: "Fathom Recordings",
        videoFolderLabel: "Video Library",
        status: "mock_linked",
      },
      {
        id: "drive-client-c",
        clientId: "client-c",
        folderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
        journalFolderLabel: "Journal Entries",
        roadmapLabel: "Legacy Roadmap",
        fathomFolderLabel: "Fathom Recordings",
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
        focus: "Track open problems, shared commitments, desires, fights, blocks, and repair.",
        nextCallAt: today(3),
        sourceFolderUrl: "https://drive.google.com/drive/folders/1XqHcQY8wJ5BJk3K4zOfzN8nHizL1lMJt?usp=drive_link",
      },
    ],
    relationshipIssues: [
      {
        id: "issue-1",
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
      {
        id: "checkin-1",
        clientId: "client-a",
        dueAt: today(1),
        status: "not_opened",
        focus: "",
        questions: "",
        alive: "",
        completed: "",
        stuck: "",
        ratings: { energy: 3, clarity: 2, alignment: 3, progress: 2 },
      },
      {
        id: "checkin-2",
        clientId: "client-b",
        dueAt: today(1),
        status: "not_opened",
        focus: "",
        questions: "",
        alive: "",
        completed: "",
        stuck: "",
        ratings: { energy: 3, clarity: 2, alignment: 2, progress: 2 },
      },
      {
        id: "checkin-3",
        clientId: "client-c",
        dueAt: today(3),
        status: "not_opened",
        focus: "",
        questions: "",
        alive: "",
        completed: "",
        stuck: "",
        ratings: { energy: 3, clarity: 3, alignment: 3, progress: 2 },
      },
    ],
    relationshipCheckIns: [
      {
        id: "rel-checkin-1",
        workspaceId: "workspace-couple-ab",
        dueAt: today(1),
        status: "not_opened",
        focus: "What problem do we want to repair before the next call?",
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
        provider: "Fathom",
        recordingUrl: "https://fathom.video/mock/client-a-b-call",
        transcript:
          "Coach: What decision keeps looping? Client: I keep saying I need more clarity, but I already know the answer. The fear is that if I choose it, I have to disappoint people. Coach: That sounds like protection running a veto. Client: Internally, my chest gets tight and I go into analysis. Externally, I keep delaying the offer page. Coach: Your action is to draft the first version by Friday and bring the messy truth to the next call.",
      },
      {
        id: "call-2",
        clientId: "client-c",
        title: "Client C Coaching Call",
        happenedAt: today(-1),
        status: "imported",
        provider: "Fathom",
        recordingUrl: "https://fathom.video/mock/client-c-call",
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

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createSeedState();
    const parsed = JSON.parse(stored);
    if (parsed.version !== STATE_VERSION || !parsed.relationshipWorkspaces || !parsed.backendConfig) {
      return createSeedState();
    }
    return parsed;
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
