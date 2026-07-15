export const QUIZ_CONFIG = {
  version: "2026-07-15.v1",
  dimensions: {
    connection: { label: "Connection and care" },
    autonomy_togetherness: { label: "Space and togetherness" },
    communication_repair: { label: "Communication and repair" },
    shared_life: { label: "Building a shared life" },
    vitality_intimacy: { label: "Affection and sexual connection" },
  },
  orientations: [
    { id: "stability", title: "Grounded Builder", thesis: "You may thrive when care is dependable, agreements are clear, and partnership is built through follow-through." },
    { id: "depth", title: "Depth Seeker", thesis: "You may thrive with a partner who stays emotionally present and is willing to know—and be known—over time." },
    { id: "sovereignty", title: "Sovereign Explorer", thesis: "You may thrive where closeness and freedom strengthen each other instead of competing." },
    { id: "vitality", title: "Alive Connector", thesis: "You may thrive where affection, play, curiosity, and honest desire have room to move." },
    { id: "co_creation", title: "Devoted Co-Creator", thesis: "You may thrive when partnership has shared direction and both people actively shape the life they are building." },
  ],
  questions: [
    {
      id: "foundation_feeling", prompt: "At this point in your life, what do you most want partnership to feel like?", required: true,
      options: [
        ["steady", "Steady and dependable", "stability"], ["seen", "Deeply seen and emotionally close", "depth"],
        ["spacious", "Spacious and freedom-supporting", "sovereignty"], ["alive", "Alive, playful, and exploratory", "vitality"],
        ["purposeful", "Purposeful—like we are building something together", "co_creation"], ["discovering", "I’m still discovering what I want", null],
      ].map(([id, label, orientation]) => ({ id, label, orientation })),
    },
    {
      id: "partnership_values", prompt: "Which three values matter most in a partnership?", help: "Choose three. The limit makes your priorities visible; it does not make the others unimportant.", responseType: "multi", minSelections: 3, maxSelections: 3, required: true,
      options: ["Honesty", "Emotional presence", "Freedom", "Reliability", "Growth", "Play", "Shared purpose", "Affection", "Spiritual connection", "Family or community"].map((label) => ({ id: label.toLowerCase().replaceAll(" ", "_"), label })),
    },
    {
      id: "relationship_container", prompt: "What kind of relationship agreement are you seeking or exploring?", required: true,
      options: ["A mutually monogamous partnership", "A consensually non-monogamous or polyamorous partnership", "A flexible agreement we define together", "A committed partnership where sex is not central", "I’m exploring and do not want to define it yet", "Prefer not to answer"].map((label, i) => ({ id: `container_${i + 1}`, label })),
    },
    {
      id: "receiving_care", prompt: "When you are carrying a lot, what response helps you feel most cared for?", required: true,
      options: [
        ["listen", "Listen and understand before offering solutions", "depth"], ["practical", "Offer practical help without taking over", "co_creation"],
        ["reassure", "Give clear reassurance and follow through", "stability"], ["room", "Give me room, then check back at an agreed time", "sovereignty"],
        ["warmth", "Bring warmth, affection, or play when I welcome it", "vitality"], ["depends", "It depends on the moment", null],
      ].map(([id, label, orientation]) => ({ id, label, orientation })),
    },
    {
      id: "space_and_closeness", prompt: "What balance of closeness and independence feels most supportive?", required: true,
      options: [["shared", "A highly shared life with frequent connection", 100], ["mostly_shared", "Mostly shared, with protected individual time", 75], ["balanced", "An even balance of shared and separate worlds", 50], ["independent", "Strong independence with intentional time together", 25], ["contextual", "My needs change a lot with context", null]].map(([id, label, togetherness]) => ({ id, label, togetherness })),
    },
    {
      id: "shared_responsibility", prompt: "How do you want responsibility and contribution to work between partners?", required: true,
      options: [["chosen_roles", "Clearly divided roles we both choose", "stability"], ["adjusted", "Shared fairly and adjusted as life changes", "co_creation"], ["strengths", "Each person leads in their strengths", "co_creation"], ["independent_commitments", "Mostly independent, with explicit shared commitments", "sovereignty"], ["explore", "I want to explore this together rather than decide now", null]].map(([id, label, orientation]) => ({ id, label, orientation })),
    },
    {
      id: "conflict_repair", prompt: "When tension rises, what helps you return to connection?", required: true,
      options: ["Talk it through directly while it is fresh", "Take a short pause, with a clear time to reconnect", "Begin with reassurance, then solve the issue", "Write or reflect first, then talk", "Use curiosity or gentle humor once we both feel ready", "I’m not sure yet"].map((label, i) => ({ id: `repair_${i + 1}`, label })),
    },
    {
      id: "decision_pattern", prompt: "When you feel strong chemistry, what are you most likely to overlook?", required: true,
      options: ["Whether their actions match their words", "Whether our values and direction actually align", "Whether I can name a need or boundary without shrinking", "Whether there is room for my own life and identity", "I tend to slow down and look at the whole pattern", "None of these / I’m not sure"].map((label, i) => ({ id: `pattern_${i + 1}`, label })),
    },
    {
      id: "sexual_connection_role", section: "intimacy", sensitive: true, prompt: "How important is sexual connection in the partnership you want?", required: false,
      options: ["Central to how I experience closeness and aliveness", "Important, alongside other forms of intimacy", "Meaningful sometimes; my interest varies", "Not central to the partnership I want", "I’m unsure or exploring", "Prefer not to answer"].map((label, i) => ({ id: `sexual_role_${i + 1}`, label, intensity: [100, 80, 55, 25, null, null][i] })),
    },
    {
      id: "sexual_communication", section: "intimacy", sensitive: true, prompt: "When something intimate is not working for you, what partner response would help most?", required: false,
      options: ["Listen with curiosity and no pressure to fix it immediately", "Talk plainly about wants, limits, and possible next steps", "Reassure me that a “not now” will be respected", "Make room for the conversation, then revisit it at an agreed time", "Explore other mutually wanted forms of closeness", "Not applicable / prefer not to answer"].map((label, i) => ({ id: `sexual_talk_${i + 1}`, label })),
    },
    {
      id: "affection_rhythm", section: "intimacy", sensitive: true, prompt: "What kind of affectionate connection helps you feel close?", required: false,
      options: ["Frequent everyday touch and warmth", "Intentional, focused moments of affection", "Playful or spontaneous affection", "Affection that grows from emotional connection and context", "More space around touch, with clear invitation and consent", "It varies / not applicable / prefer not to answer"].map((label, i) => ({ id: `affection_${i + 1}`, label })),
    },
  ],
};

export default QUIZ_CONFIG;
