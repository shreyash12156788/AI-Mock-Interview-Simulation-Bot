"use strict";

const storageKey = "adaptive-interview-session-v1";
const questionLimit = 6;
const backendUrl = window.ADAPTIVE_INTERVIEW_CONFIG?.backendUrl || "";
const views = {
  landing: document.getElementById("landing-view"),
  setup: document.getElementById("setup-view"),
  interview: document.getElementById("interview-view"),
  report: document.getElementById("report-view")
};
const state = {
  interviewId: null,
  candidateName: "",
  jobRole: "",
  experienceLevel: "",
  category: "",
  startingDifficulty: "Medium",
  currentDifficulty: "Medium",
  question: null,
  currentEvaluation: null,
  answeredQuestions: 0,
  questionLimit,
  history: [],
  difficultyProgression: [],
  phase: "landing",
  draftAnswer: "",
  busy: false
};

const topicCatalog = {
  "C++": [
    { topic: "Object lifetime", concepts: [
      { name: "RAII", groups: [["RAII", "resource acquisition is initialization"], ["constructor", "destructor", "scope"]], contradictions: ["raii means manual cleanup"] },
      { name: "Move semantics", groups: [["move semantics", "std move", "rvalue"], ["ownership", "transfer", "move constructor"]] },
      { name: "Smart pointers", groups: [["unique ptr", "unique pointer", "shared ptr", "shared pointer"], ["ownership", "lifetime", "reference count"]] }
    ] },
    { topic: "Types and abstraction", concepts: [
      { name: "Templates", groups: [["template", "generic"], ["compile time", "type parameter", "instantiation"]] },
      { name: "Polymorphism", groups: [["virtual", "runtime polymorphism", "dynamic dispatch"], ["override", "base class", "interface"]] },
      { name: "Const correctness", groups: [["const", "immutable"], ["mutate", "read only", "interface"]] }
    ] },
    { topic: "Memory and performance", concepts: [
      { name: "Stack and heap", groups: [["stack", "automatic storage"], ["heap", "dynamic allocation", "new delete"]] },
      { name: "References and pointers", groups: [["reference", "alias"], ["pointer", "address", "null"]] },
      { name: "Exception safety", groups: [["exception", "throw", "failure"], ["cleanup", "strong guarantee", "basic guarantee"]] }
    ] }
  ],
  Java: [
    { topic: "Object-oriented Java", concepts: [
      { name: "Interfaces", groups: [["interface", "contract"], ["implement", "implementation", "multiple"]] },
      { name: "Inheritance", groups: [["inheritance", "extends", "subclass"], ["base class", "override", "reuse"]] },
      { name: "Polymorphism", groups: [["polymorphism", "dynamic dispatch"], ["override", "runtime", "interface"]] }
    ] },
    { topic: "Collections and types", concepts: [
      { name: "HashMap", groups: [["hashmap", "hash map", "map"], ["hash", "key", "collision"]] },
      { name: "Generics", groups: [["generic", "generics", "type parameter"], ["compile time", "type safety", "erasure"]] },
      { name: "Streams", groups: [["stream", "streams"], ["map", "filter", "reduce", "pipeline"]] }
    ] },
    { topic: "Concurrency and runtime", concepts: [
      { name: "Thread safety", groups: [["thread safe", "thread safety", "concurrent"], ["synchronization", "lock", "atomic"]] },
      { name: "Garbage collection", groups: [["garbage collection", "gc", "collector"], ["reachability", "memory", "unreachable"]] },
      { name: "Exceptions", groups: [["checked exception", "unchecked exception", "exception"], ["handle", "throws", "catch"]] }
    ] }
  ],
  Python: [
    { topic: "Python data model", concepts: [
      { name: "Mutable and immutable values", groups: [["mutable", "immutable"], ["list", "tuple", "dictionary", "dict"]] },
      { name: "Iterators and generators", groups: [["iterator", "iterable"], ["generator", "yield", "lazy"]] },
      { name: "Decorators", groups: [["decorator", "wrapper"], ["function", "wrap", "metadata"]] }
    ] },
    { topic: "Application structure", concepts: [
      { name: "Exceptions", groups: [["exception", "error"], ["try", "except", "finally", "raise"]] },
      { name: "Modules and packages", groups: [["module", "package"], ["import", "namespace", "reuse"]] },
      { name: "Context managers", groups: [["context manager", "with statement"], ["enter", "exit", "cleanup", "resource"]] }
    ] },
    { topic: "Concurrency and performance", concepts: [
      { name: "Asyncio", groups: [["asyncio", "async", "await"], ["event loop", "io bound", "concurrency"]] },
      { name: "Threading and processes", groups: [["thread", "threading"], ["process", "multiprocessing", "parallel"]] },
      { name: "Profiling", groups: [["profile", "profiling"], ["bottleneck", "measure", "benchmark", "optimize"]] }
    ] }
  ],
  "Data Structures": [
    { topic: "Linear structures", concepts: [
      { name: "Arrays", groups: [["array", "contiguous"], ["index", "access", "insertion", "memory"]] },
      { name: "Linked lists", groups: [["linked list", "node", "pointer"], ["insert", "delete", "traversal"]] },
      { name: "Stacks and queues", groups: [["stack", "queue"], ["lifo", "fifo", "push", "pop", "enqueue", "dequeue"]], contradictions: ["stack is fifo", "queue is lifo"] }
    ] },
    { topic: "Search and priority", concepts: [
      { name: "Hash tables", groups: [["hash table", "hash map", "hash function"], ["collision", "bucket", "lookup"]] },
      { name: "Binary search trees", groups: [["binary search tree", "bst", "ordered tree"], ["left", "right", "search", "balance"]] },
      { name: "Heaps", groups: [["heap", "priority queue"], ["min heap", "max heap", "priority", "extract"]] }
    ] },
    { topic: "Graphs and algorithms", concepts: [
      { name: "Graph traversal", groups: [["graph", "vertex", "edge"], ["bfs", "breadth first", "dfs", "depth first"]] },
      { name: "Complexity", groups: [["big o", "time complexity", "space complexity"], ["input size", "growth", "trade off"]] },
      { name: "Dynamic programming", groups: [["dynamic programming", "memoization", "tabulation"], ["overlapping subproblems", "optimal substructure"]] }
    ] }
  ],
  DBMS: [
    { topic: "Relational data", concepts: [
      { name: "Normalization", groups: [["normalization", "normal form"], ["redundancy", "anomaly", "dependencies"]] },
      { name: "Indexes", groups: [["index", "indexes", "indexing"], ["lookup", "write", "query plan", "trade off"]] },
      { name: "Transactions", groups: [["transaction", "atomic"], ["commit", "rollback", "consistency"]] }
    ] },
    { topic: "Queries and integrity", concepts: [
      { name: "Joins", groups: [["join", "inner join", "left join"], ["matching", "rows", "relationship"]] },
      { name: "Constraints", groups: [["constraint", "foreign key", "primary key"], ["integrity", "validation", "referential"]] },
      { name: "Query plans", groups: [["query plan", "execution plan"], ["scan", "index", "explain", "cost"]] }
    ] },
    { topic: "Reliability and scale", concepts: [
      { name: "ACID", groups: [["acid", "atomicity", "consistency"], ["isolation", "durability", "transaction"]] },
      { name: "Isolation levels", groups: [["isolation level", "isolation"], ["dirty read", "non repeatable", "serializable"]] },
      { name: "Replication", groups: [["replication", "replica"], ["consistency", "availability", "failover"]] }
    ] }
  ],
  "Operating Systems": [
    { topic: "Processes and scheduling", concepts: [
      { name: "Processes and threads", groups: [["process", "thread"], ["address space", "shared memory", "context switch"]] },
      { name: "Scheduling", groups: [["scheduling", "scheduler"], ["preemptive", "round robin", "priority", "latency"]] },
      { name: "Synchronization", groups: [["mutex", "semaphore", "lock"], ["critical section", "race condition", "synchronization"]] }
    ] },
    { topic: "Memory management", concepts: [
      { name: "Virtual memory", groups: [["virtual memory", "address space"], ["page", "mapping", "isolation"]] },
      { name: "Paging", groups: [["paging", "page table"], ["page fault", "frame", "memory"]] },
      { name: "Deadlocks", groups: [["deadlock"], ["hold and wait", "circular wait", "resource", "prevention"]] }
    ] },
    { topic: "Storage and I/O", concepts: [
      { name: "File systems", groups: [["file system", "filesystem"], ["directory", "metadata", "permissions"]] },
      { name: "System calls", groups: [["system call", "kernel"], ["user mode", "privilege", "operating system"]] },
      { name: "Buffering", groups: [["buffer", "buffering"], ["io", "throughput", "latency", "queue"]] }
    ] }
  ],
  "Computer Networks": [
    { topic: "Transport protocols", concepts: [
      { name: "TCP", groups: [["tcp", "transmission control protocol"], ["reliable", "connection", "acknowledgment", "retransmission"]], contradictions: ["tcp is connectionless", "tcp does not guarantee delivery"] },
      { name: "UDP", groups: [["udp", "user datagram protocol"], ["datagram", "low latency", "no connection", "unreliable"]] },
      { name: "Congestion control", groups: [["congestion control", "congestion"], ["window", "packet loss", "throughput", "rate"]] }
    ] },
    { topic: "Web communication", concepts: [
      { name: "DNS", groups: [["dns", "domain name"], ["resolve", "ip address", "cache", "record"]] },
      { name: "HTTP", groups: [["http", "request", "response"], ["method", "status code", "header", "stateless"]] },
      { name: "TLS", groups: [["tls", "transport layer security"], ["certificate", "encryption", "handshake"]] }
    ] },
    { topic: "Network design", concepts: [
      { name: "Load balancing", groups: [["load balancer", "load balancing"], ["traffic", "health check", "distribution"]] },
      { name: "Caching", groups: [["cache", "caching"], ["latency", "expiration", "invalidation", "freshness"]] },
      { name: "Retries and timeouts", groups: [["retry", "retries", "timeout"], ["backoff", "idempotent", "failure"]] }
    ] }
  ],
  OOP: [
    { topic: "Core object-oriented principles", concepts: [
      { name: "Encapsulation", groups: [["encapsulation", "hide"], ["state", "interface", "access"]] },
      { name: "Abstraction", groups: [["abstraction", "abstract"], ["implementation", "interface", "complexity"]] },
      { name: "Polymorphism", groups: [["polymorphism", "many forms"], ["override", "dispatch", "interface"]] }
    ] },
    { topic: "Relationships and reuse", concepts: [
      { name: "Inheritance", groups: [["inheritance", "subclass"], ["base class", "override", "reuse"]] },
      { name: "Composition", groups: [["composition", "has a"], ["object", "delegate", "lifecycle"]] },
      { name: "Dependency inversion", groups: [["dependency inversion", "abstraction"], ["high level", "low level", "interface"]] }
    ] },
    { topic: "Design quality", concepts: [
      { name: "Single responsibility", groups: [["single responsibility", "one reason to change"], ["class", "responsibility", "cohesion"]] },
      { name: "Open/closed principle", groups: [["open closed", "open for extension"], ["closed for modification", "extension"]] },
      { name: "Coupling and cohesion", groups: [["coupling", "cohesion"], ["depend", "related", "maintainability"]] }
    ] }
  ],
  "HR Interview": [
    { topic: "Behavioral examples", concepts: [
      { name: "Situation and goal", groups: [["situation", "context"], ["goal", "task", "challenge"]] },
      { name: "Personal actions", groups: [["action", "I did", "I led", "I decided"], ["approach", "communicate", "collaborate"]] },
      { name: "Outcome and reflection", groups: [["result", "outcome", "impact"], ["learned", "improve", "reflection"]] }
    ] },
    { topic: "Work preferences", concepts: [
      { name: "Motivation", groups: [["motivation", "motivated", "purpose"], ["role", "contribute", "impact"]] },
      { name: "Feedback", groups: [["feedback", "input"], ["listen", "respond", "change", "improve"]] },
      { name: "Prioritization", groups: [["priority", "prioritize"], ["impact", "deadline", "trade off", "communicate"]] }
    ] },
    { topic: "Collaboration", concepts: [
      { name: "Conflict resolution", groups: [["disagreement", "conflict"], ["listen", "evidence", "resolve", "compromise"]] },
      { name: "Team contribution", groups: [["team", "collaborate"], ["contribution", "support", "shared goal"]] },
      { name: "Adaptability", groups: [["adapt", "change"], ["learn", "adjust", "uncertainty"]] }
    ] }
  ],
  "General Technical Interview": [
    { topic: "Engineering judgment", concepts: [
      { name: "Trade-offs", groups: [["trade off", "tradeoff"], ["cost", "benefit", "constraint", "choose"]] },
      { name: "Testing", groups: [["test", "testing"], ["edge case", "assertion", "regression", "coverage"]] },
      { name: "Maintainability", groups: [["maintainability", "maintain"], ["readable", "modular", "document", "change"]] }
    ] },
    { topic: "Reliable systems", concepts: [
      { name: "Observability", groups: [["observability", "monitor"], ["logs", "metrics", "trace", "alert"]] },
      { name: "Failure handling", groups: [["failure", "error"], ["retry", "timeout", "fallback", "recover"]] },
      { name: "Security", groups: [["security", "threat"], ["validate", "least privilege", "authentication", "encrypt"]] }
    ] },
    { topic: "Delivery and design", concepts: [
      { name: "Requirements", groups: [["requirement", "requirements"], ["user", "acceptance", "constraint", "clarify"]] },
      { name: "Architecture", groups: [["architecture", "component"], ["interface", "dependency", "scale", "boundary"]] },
      { name: "Performance", groups: [["performance", "latency", "throughput"], ["measure", "bottleneck", "profile", "optimize"]] }
    ] }
  ]
};

const questionStyles = [
  {
    name: "Conceptual",
    format: (context) => `Explain ${context.first} and ${context.second} within ${context.topic}. Relate them to work as a ${context.role}, and include a clear example.`
  },
  {
    name: "Practical",
    format: (context) => `How would you apply ${context.first} and ${context.second} to a practical ${context.role} task involving ${context.topic}? Describe your approach and how you would verify it.`
  },
  {
    name: "Scenario",
    format: (context) => `A ${context.scenario} affects a ${context.role} project. How would you use ${context.first} and ${context.second} to address it, and what would you check first?`
  },
  {
    name: "Problem solving",
    format: (context) => `Outline a ${context.difficulty.toLowerCase()}-level solution for a ${context.role} problem involving ${context.topic}. Show where ${context.first} and ${context.second} fit and explain your reasoning.`
  },
  {
    name: "Compare",
    format: (context) => `Compare ${context.first} with ${context.second}. For a ${context.role} working with ${context.topic}, when would you choose one approach over the other?`
  },
  {
    name: "Real-world application",
    format: (context) => `Where might ${context.topic} matter in real-world ${context.role} work? Explain how ${context.first} and ${context.second} contribute and what trade-offs you would consider.`
  }
];

const scenarioComponents = [
  "a sudden increase in concurrent requests",
  "a production change that causes intermittent failures",
  "a growing dataset and a strict response-time target",
  "a teammate who needs to extend the design safely",
  "a resource limit that has become a bottleneck",
  "a dependency that is unavailable during peak traffic",
  "a new requirement that conflicts with an existing constraint"
];

function showView(name) {
  Object.entries(views).forEach(([key, element]) => {
    const active = key === name;
    element.hidden = !active;
    element.classList.toggle("active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setBusy(button, busy, label) {
  state.busy = busy;
  button.disabled = busy;
  button.dataset.originalLabel ??= button.innerHTML;
  button.innerHTML = busy
    ? `<span class="button-spinner" aria-hidden="true"></span>${label}`
    : button.dataset.originalLabel;
}

function showError(element, error, retry) {
  const message = document.createElement("span");
  message.textContent = error.message;
  element.replaceChildren(message);
  if (retry) {
    const button = document.createElement("button");
    button.className = "error-retry";
    button.type = "button";
    button.textContent = "Retry";
    button.addEventListener("click", retry);
    element.append(" ", button);
  }
  element.hidden = false;
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save interview progress to LocalStorage.", error);
    const errorBox = document.getElementById("interview-error");
    if (errorBox) {
      showError(errorBox, new Error("Your browser could not save this progress. Free some local storage and try again."));
    }
    return false;
  }
}

function clearSavedState() {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error("Could not clear the saved interview.", error);
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!saved || !Array.isArray(saved.history) || !topicCatalog[saved.category]) return false;
    Object.assign(state, saved);
    state.busy = false;
    state.questionLimit = questionLimit;
    return true;
  } catch (error) {
    console.error("Saved interview progress could not be restored.", error);
    clearSavedState();
    return false;
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function chooseTopic(topics) {
  const stats = new Map();
  state.history.forEach((entry) => {
    const current = stats.get(entry.topic) || { count: 0, scores: [] };
    current.count += 1;
    current.scores.push(entry.evaluation.overallScore);
    stats.set(entry.topic, current);
  });
  const options = topics.map((item) => ({
    ...item,
    count: stats.get(item.topic)?.count || 0,
    average: average(stats.get(item.topic)?.scores || [])
  }));
  const unseen = options.filter((item) => item.count === 0);
  if (unseen.length) return unseen[Math.floor(Math.random() * unseen.length)];
  const nonRecent = options.filter((item) => item.topic !== state.history.at(-1)?.topic);
  const candidates = nonRecent.length ? nonRecent : options;
  return candidates.sort((left, right) =>
    left.average - right.average || left.count - right.count
  )[0];
}

function composeQuestion() {
  const topics = topicCatalog[state.category];
  const selectedTopic = chooseTopic(topics);
  const conceptOffset = state.history.filter((entry) => entry.topic === selectedTopic.topic).length;
  const firstConcept = selectedTopic.concepts[conceptOffset % selectedTopic.concepts.length];
  const secondConcept = selectedTopic.concepts.find((item) => item.name !== firstConcept.name);
  const usedStyles = new Set(state.history.map((entry) => entry.question.style));
  const availableStyles = questionStyles.filter((style) => !usedStyles.has(style.name));
  const stylePool = availableStyles.length ? availableStyles : questionStyles;
  const style = stylePool[Math.floor(Math.random() * stylePool.length)];
  const scenario = scenarioComponents[
    Math.floor(Math.random() * scenarioComponents.length)
  ];
  const questionContext = {
    first: firstConcept.name,
    second: secondConcept.name,
    topic: selectedTopic.topic,
    role: `${state.experienceLevel} ${state.jobRole}`,
    scenario,
    difficulty: state.currentDifficulty
  };
  let text = style.format(questionContext);
  const asked = new Set(state.history.map((entry) =>
    entry.question.text.toLocaleLowerCase()
  ));
  let attempts = 0;
  while (asked.has(text.toLocaleLowerCase()) && attempts < questionStyles.length) {
    const alternate = questionStyles[(questionStyles.indexOf(style) + attempts + 1) % questionStyles.length];
    text = alternate.format(questionContext);
    attempts += 1;
  }

  const concepts = [firstConcept, secondConcept];
  return {
    id: makeId(),
    number: state.history.length + 1,
    category: state.category,
    topic: selectedTopic.topic,
    style: style.name,
    text,
    difficulty: state.currentDifficulty,
    followUp: conceptOffset > 0,
    criteria: concepts.map((concept) => ({
      concept: concept.name,
      keywordGroups: concept.groups,
      contradictions: concept.contradictions || []
    }))
  };
}

function setQuestion(question) {
  state.question = question;
  state.currentEvaluation = null;
  state.draftAnswer = "";
  state.phase = "question";
  document.getElementById("interview-title").textContent = question.text;
  document.getElementById("question-tag").textContent =
    `QUESTION ${String(question.number).padStart(2, "0")}${question.followUp ? " · FOLLOW-UP" : ""}`;
  document.getElementById("question-counter").textContent =
    `QUESTION ${question.number} OF ${questionLimit}`;
  document.getElementById("difficulty-label").textContent = state.currentDifficulty.toUpperCase();
  document.getElementById("progress-fill").style.width =
    `${Math.min(100, (state.history.length / questionLimit) * 100)}%`;
  document.getElementById("question-context").textContent =
    `${question.category} · ${question.style} question · Rule-based assessment`;
  document.getElementById("answer-input").value = "";
  document.getElementById("character-count").textContent = "0 / 6,000";
  document.getElementById("answer-form").hidden = false;
  document.getElementById("feedback-card").hidden = true;
  document.getElementById("interview-error").hidden = true;
  saveState();
  document.getElementById("answer-input").focus({ preventScroll: true });
}

function renderEvaluation(result) {
  const scores = [
    ["Correctness", result.correctness],
    ["Relevance", result.relevance],
    ["Technical depth", result.technicalDepth],
    ["Completeness", result.completeness]
  ];
  document.getElementById("feedback-overall").innerHTML =
    `${Number(result.overallScore).toFixed(1)}<small>/10</small>`;
  const grid = document.getElementById("score-grid");
  grid.replaceChildren();
  scores.forEach(([label, score]) => {
    const item = document.createElement("div");
    item.className = "score-item";
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("strong");
    value.textContent = `${Number(score).toFixed(1)} / 10`;
    item.append(name, value);
    grid.append(item);
  });
  document.getElementById("improvement-note").textContent =
    `${result.feedback} ${result.improvementSuggestion}`;
  const changeText = result.difficultyChange === "increased"
    ? `Difficulty increased to ${result.difficultyAfter}.`
    : result.difficultyChange === "decreased"
      ? `Difficulty eased to ${result.difficultyAfter}.`
      : `Difficulty stays at ${result.difficultyAfter}.`;
  document.getElementById("difficulty-change").textContent =
    `${changeText} Rule-based practice feedback.`;
  document.getElementById("difficulty-label").textContent =
    result.difficultyAfter.toUpperCase();
  document.getElementById("question-counter").textContent =
    `${result.answeredQuestions} OF ${questionLimit} ANSWERED`;
  document.getElementById("progress-fill").style.width =
    `${Math.min(100, (result.answeredQuestions / questionLimit) * 100)}%`;
  document.getElementById("answer-form").hidden = true;
  document.getElementById("feedback-card").hidden = false;
  const nextButton = document.getElementById("continue-button");
  nextButton.innerHTML = result.nextStep === "report"
    ? "See your report <span aria-hidden=\"true\">→</span>"
    : "Next question <span aria-hidden=\"true\">→</span>";
  nextButton.dataset.action = result.nextStep;
}

function appendList(listId, values) {
  const list = document.getElementById(listId);
  list.replaceChildren();
  values.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  });
}

function createReport() {
  const scores = state.history.map((entry) => entry.evaluation.overallScore);
  const correctness = state.history.map((entry) => entry.evaluation.correctness);
  const topicScores = new Map();
  const missingConcepts = new Set();
  state.history.forEach((entry) => {
    const topic = topicScores.get(entry.topic) || [];
    topic.push(entry.evaluation.overallScore);
    topicScores.set(entry.topic, topic);
    entry.evaluation.missingConcepts.forEach((concept) => missingConcepts.add(concept));
  });
  const topicPerformance = Array.from(topicScores, ([topic, values]) => ({
    topic,
    averageScore: average(values)
  })).sort((left, right) => right.averageScore - left.averageScore);
  const strongTopics = topicPerformance
    .filter((topic) => topic.averageScore >= 7)
    .map((topic) => `${topic.topic} (${topic.averageScore.toFixed(1)}/10)`);
  const weakTopics = topicPerformance
    .filter((topic) => topic.averageScore < 5)
    .map((topic) => `${topic.topic} (${topic.averageScore.toFixed(1)}/10)`);
  const suggestions = new Set();
  state.history.forEach((entry) => {
    if (entry.evaluation.improvementSuggestion) {
      suggestions.add(entry.evaluation.improvementSuggestion);
    }
  });
  if (!strongTopics.length) suggestions.add("Keep practicing concise explanations that connect a concept to a specific example.");
  if (!weakTopics.length) suggestions.add("Continue rotating across topics and explaining trade-offs with concrete examples.");
  suggestions.add("This report reflects transparent keyword, concept-coverage, explanation-length, and contradiction rules; it is not semantic AI scoring.");
  return {
    candidateName: state.candidateName,
    jobRole: state.jobRole,
    category: state.category,
    answeredQuestions: state.history.length,
    questionLimit,
    totalScore: average(scores),
    correctnessScore: average(correctness),
    performancePercentage: average(scores) * 10,
    finalDifficulty: state.currentDifficulty,
    difficultyProgression: state.difficultyProgression.map((entry) => entry.difficulty),
    strengths: strongTopics.length ? strongTopics : ["Keep building evidence-backed explanations across the topics practiced."],
    weaknesses: weakTopics.length ? weakTopics : ["No topic fell below the rule-based improvement threshold."],
    missingConcepts: Array.from(missingConcepts),
    topicPerformance,
    improvementSuggestions: Array.from(suggestions)
  };
}

function renderReport(report) {
  document.getElementById("report-name").textContent = report.candidateName.toUpperCase();
  document.getElementById("total-score").textContent = Number(report.totalScore).toFixed(1);
  document.getElementById("ring-score").textContent = Number(report.totalScore).toFixed(1);
  document.getElementById("score-ring").setAttribute(
    "aria-label", `Rule-based interview score: ${Number(report.totalScore).toFixed(1)} out of 10`
  );
  document.getElementById("score-caption").textContent =
    `Rule-based assessment · ${report.category}`;
  document.getElementById("report-count").textContent =
    `${report.answeredQuestions} / ${report.questionLimit}`;
  document.getElementById("report-correctness").textContent =
    `${Number(report.correctnessScore).toFixed(1)} / 10`;
  document.getElementById("report-percentage").textContent =
    `${Number(report.performancePercentage).toFixed(0)}%`;
  document.getElementById("report-difficulty").textContent =
    report.difficultyProgression.join(" → ");
  document.getElementById("report-role").textContent = report.jobRole;
  appendList("strength-list", report.strengths);
  appendList("weakness-list", [
    ...report.weaknesses,
    ...(report.missingConcepts.length
      ? [`Missing concepts: ${report.missingConcepts.join(", ")}`]
      : [])
  ]);
  appendList("suggestion-list", report.improvementSuggestions);
  const topics = document.getElementById("topic-list");
  topics.replaceChildren();
  report.topicPerformance.forEach((topic) => {
    const row = document.createElement("div");
    row.className = "topic-row";
    const name = document.createElement("span");
    name.textContent = topic.topic;
    const meter = document.createElement("div");
    meter.className = "topic-meter";
    meter.setAttribute("role", "meter");
    meter.setAttribute("aria-label", `${topic.topic} rule-based score`);
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "10");
    meter.setAttribute("aria-valuenow", String(topic.averageScore));
    const fill = document.createElement("span");
    fill.style.width = `${Number(topic.averageScore) * 10}%`;
    meter.append(fill);
    const score = document.createElement("strong");
    score.textContent = Number(topic.averageScore).toFixed(1);
    row.append(name, meter, score);
    topics.append(row);
  });
  state.phase = "report";
  saveState();
  showView("report");
}

async function evaluateCurrentAnswer(answer, button) {
  if (state.busy || !state.question || !answer.trim()) return;
  const errorBox = document.getElementById("interview-error");
  errorBox.hidden = true;
  state.draftAnswer = answer;
  saveState();
  setBusy(button, true, "Assessing your answer…");
  try {
    const response = await fetch(`${backendUrl}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        question: state.question.text,
        category: state.category,
        topic: state.question.topic,
        difficulty: state.currentDifficulty,
        criteria: state.question.criteria,
        answer
      })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error?.message || `Assessment request failed (${response.status}).`);
    }
    const previousDifficulty = state.currentDifficulty;
    const score = Number(body.overallScore);
    if (score >= 8) {
      state.currentDifficulty = previousDifficulty === "Easy" ? "Medium" : "Hard";
    } else if (score < 5) {
      state.currentDifficulty = previousDifficulty === "Hard" ? "Medium" : "Easy";
    }
    const result = {
      ...body,
      difficultyBefore: previousDifficulty,
      difficultyAfter: state.currentDifficulty,
      difficultyChange: previousDifficulty === state.currentDifficulty
        ? "maintained"
        : state.currentDifficulty === "Hard" || previousDifficulty === "Easy"
          ? "increased"
          : "decreased",
      answeredQuestions: state.history.length + 1,
      nextStep: state.history.length + 1 >= questionLimit ? "report" : "next-question"
    };
    state.history.push({
      question: state.question,
      answer,
      topic: state.question.topic,
      evaluation: result
    });
    state.answeredQuestions = state.history.length;
    if (!state.difficultyProgression.length ||
        state.difficultyProgression.at(-1).difficulty !== previousDifficulty) {
      state.difficultyProgression.push({
        question: state.history.length,
        difficulty: previousDifficulty
      });
    }
    state.difficultyProgression.push({
      question: state.history.length + 1,
      difficulty: state.currentDifficulty
    });
    state.currentEvaluation = result;
    state.phase = "feedback";
    state.draftAnswer = "";
    saveState();
    renderEvaluation(result);
  } catch (error) {
    showError(errorBox, error, () => evaluateCurrentAnswer(answer, button));
  } finally {
    setBusy(button, false, "");
  }
}

function startInterview(form, button) {
  const errorBox = document.getElementById("setup-error");
  errorBox.hidden = true;
  setBusy(button, true, "Creating your interview…");
  try {
    const details = Object.fromEntries(new FormData(form).entries());
    state.interviewId = makeId();
    state.candidateName = details.candidateName.trim();
    state.jobRole = details.jobRole.trim();
    state.experienceLevel = details.experienceLevel;
    state.category = details.category;
    state.startingDifficulty = details.difficulty;
    state.currentDifficulty = details.difficulty;
    state.history = [];
    state.answeredQuestions = 0;
    state.questionLimit = questionLimit;
    state.difficultyProgression = [{ question: 1, difficulty: details.difficulty }];
    state.phase = "question";
    state.draftAnswer = "";
    saveState();
    showView("interview");
    setQuestion(composeQuestion());
  } catch (error) {
    showError(errorBox, error, null);
  } finally {
    setBusy(button, false, "");
  }
}

async function requestNextQuestion(button) {
  if (state.busy) return;
  setBusy(button, true, "Finding your next question…");
  try {
    if (state.history.length >= questionLimit) {
      renderReport(createReport());
      return;
    }
    setQuestion(composeQuestion());
  } finally {
    setBusy(button, false, "");
  }
}

function finishInterview(button) {
  if (state.busy) return;
  if (!state.history.length) {
    showError(document.getElementById("interview-error"),
      new Error("Answer at least one question before generating your report."));
    return;
  }
  setBusy(button, true, "Preparing your report…");
  try {
    renderReport(createReport());
  } finally {
    setBusy(button, false, "");
  }
}

function resetInterview(showSetup) {
  Object.assign(state, {
    interviewId: null,
    candidateName: "",
    jobRole: "",
    experienceLevel: "",
    category: "",
    startingDifficulty: "Medium",
    currentDifficulty: "Medium",
    question: null,
    currentEvaluation: null,
    answeredQuestions: 0,
    history: [],
    difficultyProgression: [],
    phase: "landing",
    draftAnswer: "",
    busy: false
  });
  clearSavedState();
  document.getElementById("setup-form").reset();
  document.querySelectorAll(".difficulty-option").forEach((item) => {
    item.classList.toggle("selected", item.querySelector("input").checked);
  });
  showView(showSetup ? "setup" : "landing");
}

document.getElementById("start-button").addEventListener("click", () => showView("setup"));
document.querySelectorAll("[data-go='landing']").forEach((button) => {
  button.addEventListener("click", () => showView("landing"));
});
document.querySelectorAll(".difficulty-option input").forEach((input) => {
  input.addEventListener("change", () => {
    document.querySelectorAll(".difficulty-option").forEach((item) => item.classList.remove("selected"));
    input.closest(".difficulty-option").classList.add("selected");
  });
});
document.getElementById("setup-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.busy) startInterview(event.currentTarget, document.getElementById("create-button"));
});
document.getElementById("answer-input").addEventListener("input", (event) => {
  state.draftAnswer = event.currentTarget.value;
  document.getElementById("character-count").textContent =
    `${event.currentTarget.value.length.toLocaleString()} / 6,000`;
  saveState();
});
document.getElementById("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  evaluateCurrentAnswer(
    document.getElementById("answer-input").value,
    document.getElementById("submit-answer")
  );
});
document.getElementById("continue-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  if (button.dataset.action === "report") {
    finishInterview(button);
  } else {
    requestNextQuestion(button);
  }
});
document.getElementById("end-button").addEventListener("click", (event) =>
  finishInterview(event.currentTarget)
);
document.getElementById("restart-button").addEventListener("click", () =>
  resetInterview(true)
);
document.getElementById("home-button").addEventListener("click", () =>
  resetInterview(false)
);

function restoreInterface() {
  const status = document.querySelector(".ai-status");
  status.replaceChildren(
    Object.assign(document.createElement("span"), { className: "status-dot" }),
    document.createTextNode("ADAPTIVE ENGINE READY")
  );
  status.setAttribute("aria-label", "Questions are dynamically generated and answers are rule-based assessed.");
  if (!restoreState()) return;
  if (state.phase === "report") {
    renderReport(createReport());
    return;
  }
  showView("interview");
  document.getElementById("interview-title").textContent = state.question?.text || "Your next question is ready.";
  if (state.question) {
    document.getElementById("question-tag").textContent =
      `QUESTION ${String(state.question.number).padStart(2, "0")}${state.question.followUp ? " · FOLLOW-UP" : ""}`;
    document.getElementById("question-counter").textContent =
      `QUESTION ${state.question.number} OF ${questionLimit}`;
    document.getElementById("difficulty-label").textContent = state.currentDifficulty.toUpperCase();
    document.getElementById("question-context").textContent =
      `${state.category} · ${state.question.style} question · Rule-based assessment`;
    document.getElementById("progress-fill").style.width =
      `${Math.min(100, (state.history.length / questionLimit) * 100)}%`;
  }
  if (state.phase === "feedback" && state.currentEvaluation) {
    document.getElementById("answer-form").hidden = true;
    document.getElementById("feedback-card").hidden = false;
    renderEvaluation(state.currentEvaluation);
  } else {
    document.getElementById("answer-form").hidden = false;
    document.getElementById("feedback-card").hidden = true;
    document.getElementById("answer-input").value = state.draftAnswer || "";
    document.getElementById("character-count").textContent =
      `${(state.draftAnswer || "").length.toLocaleString()} / 6,000`;
  }
}

restoreInterface();
