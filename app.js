const initialMessages = [
  {
    role: "user",
    body: "build a codex clone",
  },
  {
    role: "assistant",
    body:
      "I’m inspecting the workspace first so I can anchor the build in what’s already here, then I’ll turn that into a working clone instead of guessing.",
  },
  {
    role: "assistant",
    body:
      "The workspace is empty, so I’m treating this as a fresh Codex-style MVP with a chat-first center column, a plan rail, and terminal output.",
  },
];

const planStates = [
  {
    label: "Inspect workspace and infer the app shape",
    status: "completed",
  },
  {
    label: "Build the shell and agent workspace",
    status: "in-progress",
  },
  {
    label: "Verify the interaction loop",
    status: "pending",
  },
];

const terminalSeed = [
  ["$", "pwd"],
  [">", "/Users/dantecualesjr/Documents/Projects/Projects_2026/codex-clone"],
  ["$", "rg --files"],
  [">", "index.html"],
  [">", "styles.css"],
  [">", "app.js"],
];

const activitySeed = [
  {
    title: "Workspace scanned",
    detail: "Captured root path and current files for the session context.",
  },
  {
    title: "Plan rail synced",
    detail: "The right panel reflects the current execution state.",
  },
  {
    title: "UI shell loaded",
    detail: "Chat, plan, terminal, and activity panes are ready.",
  },
];

const chatFeed = document.querySelector("#chatFeed");
const planList = document.querySelector("#planList");
const terminalOutput = document.querySelector("#terminalOutput");
const activityFeed = document.querySelector("#activityFeed");
const composer = document.querySelector("#composer");
const promptInput = document.querySelector("#promptInput");
const runCommandButton = document.querySelector("#runCommand");
const shufflePlanButton = document.querySelector("#shufflePlan");

const messageTemplate = document.querySelector("#messageTemplate");
const terminalTemplate = document.querySelector("#terminalTemplate");

const state = {
  messages: [...initialMessages],
  plan: [...planStates],
  terminalLines: [...terminalSeed],
  activity: [...activitySeed],
};

function timeStamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMessages() {
  chatFeed.innerHTML = "";

  state.messages.forEach((message) => {
    const node = messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(message.role);
    node.querySelector(".author").textContent = message.role === "user" ? "You" : "Codex";
    node.querySelector(".timestamp").textContent = timeStamp();
    node.querySelector(".message-body").textContent = message.body;
    chatFeed.appendChild(node);
  });

  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function renderPlan() {
  planList.innerHTML = "";

  state.plan.forEach((item) => {
    const li = document.createElement("li");
    li.className = `plan-item ${item.status === "in-progress" ? "active" : ""}`;

    const badge = document.createElement("span");
    badge.className = `plan-badge ${item.status.replace(/\s+/g, "-")}`;

    const copy = document.createElement("div");
    copy.className = "plan-copy";
    copy.innerHTML = `<strong>${item.label}</strong><span>${item.status}</span>`;

    li.append(badge, copy);
    planList.appendChild(li);
  });
}

function renderTerminal() {
  terminalOutput.innerHTML = "";

  state.terminalLines.forEach(([prefix, text]) => {
    const line = terminalTemplate.content.firstElementChild.cloneNode(true);
    line.querySelector(".terminal-prefix").textContent = prefix;
    line.querySelector(".terminal-text").textContent = text;
    terminalOutput.appendChild(line);
  });

  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function renderActivity() {
  activityFeed.innerHTML = "";

  state.activity.forEach((item) => {
    const node = document.createElement("article");
    node.className = "activity-item";
    node.innerHTML = `<strong>${item.title}</strong><span>${item.detail}</span>`;
    activityFeed.appendChild(node);
  });
}

function addUserMessage(body) {
  state.messages.push({ role: "user", body });
  renderMessages();
}

function addAssistantMessage(body) {
  state.messages.push({ role: "assistant", body });
  renderMessages();
}

function addTerminalLine(prefix, text) {
  state.terminalLines.push([prefix, text]);
  renderTerminal();
}

function addActivity(title, detail) {
  state.activity.unshift({ title, detail });
  state.activity = state.activity.slice(0, 6);
  renderActivity();
}

function syncPlan() {
  state.plan = [
    { label: "Capture the user intent", status: "completed" },
    { label: "Refine the Codex-like shell", status: "completed" },
    { label: "Verify the behavior and hand off", status: "in-progress" },
  ];
  renderPlan();
  addActivity("Plan refreshed", "Promoted verification to the active step.");
}

function simulateAgentReply(prompt) {
  const trimmed = prompt.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return;
  }

  if (normalized.startsWith("/plan")) {
    state.plan = [
      { label: "Read the latest request", status: "completed" },
      { label: "Translate it into concrete steps", status: "in-progress" },
      { label: "Execute and verify", status: "pending" },
    ];
    renderPlan();
    addAssistantMessage("Plan updated. I regrouped the work into request, execution, and verification.");
    addActivity("Manual plan sync", "The thread issued a `/plan` command.");
    return;
  }

  if (normalized.startsWith("/fix")) {
    addTerminalLine("$", "apply_patch workspace-shell");
    addTerminalLine(">", "Updated layout density, panel hierarchy, and message styling.");
    addAssistantMessage("I simulated a UI edit pass and tightened the workspace around the chat flow.");
    addActivity("Mock patch applied", "The terminal recorded a fake edit run.");
    return;
  }

  addTerminalLine("$", `analyze "${trimmed}"`);
  addTerminalLine(">", "Summarizing request and preparing a scoped response...");
  addAssistantMessage(
    `I read that as: "${trimmed}". In a real clone, the next step would be wiring this shell to a live model backend and real tool execution.`
  );
  addActivity("Prompt processed", "The latest message was translated into a tool-style action.");
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = promptInput.value.trim();

  if (!value) {
    return;
  }

  addUserMessage(value);
  simulateAgentReply(value);
  promptInput.value = "";
});

runCommandButton.addEventListener("click", () => {
  addTerminalLine("$", "npm run dev");
  addTerminalLine(">", "Serving agent workspace at http://localhost:8000");
  addActivity("Demo command", "Simulated a local dev server run.");
});

shufflePlanButton.addEventListener("click", syncPlan);

renderMessages();
renderPlan();
renderTerminal();
renderActivity();
