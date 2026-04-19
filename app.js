const STORAGE_KEY = "codex-session-v1";

function seedMessages() {
  const now = Date.now();
  return [
    { role: "user", body: "build a codex clone", at: now },
    {
      role: "assistant",
      body:
        "I’m inspecting the workspace first so I can anchor the build in what’s already here, then I’ll turn that into a working clone instead of guessing.",
      at: now,
    },
    {
      role: "assistant",
      body:
        "The workspace is empty, so I’m treating this as a fresh Codex-style MVP with a chat-first center column, a plan rail, and terminal output.",
      at: now,
    },
  ];
}

const initialMessages = seedMessages();

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
const themeToggleButton = document.querySelector("#themeToggle");
const newThreadButton = document.querySelector("#newThread");
const jumpToLatestButton = document.querySelector("#jumpToLatest");
const jumpCountEl = jumpToLatestButton
  ? jumpToLatestButton.querySelector(".jump-count")
  : null;

const messageTemplate = document.querySelector("#messageTemplate");
const terminalTemplate = document.querySelector("#terminalTemplate");

function defaultState() {
  return {
    messages: seedMessages(),
    plan: planStates.map((p) => ({ ...p })),
    terminalLines: terminalSeed.map((line) => [...line]),
    activity: activitySeed.map((a) => ({ ...a })),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : seedMessages(),
      plan: Array.isArray(parsed.plan) ? parsed.plan : planStates.map((p) => ({ ...p })),
      terminalLines: Array.isArray(parsed.terminalLines)
        ? parsed.terminalLines
        : terminalSeed.map((line) => [...line]),
      activity: Array.isArray(parsed.activity)
        ? parsed.activity
        : activitySeed.map((a) => ({ ...a })),
    };
  } catch (_) {
    return defaultState();
  }
}

const state = loadState();

let saveScheduled = false;
function saveState() {
  if (saveScheduled) return;
  saveScheduled = true;
  requestAnimationFrame(() => {
    saveScheduled = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  });
}

function formatTime(at) {
  const d = at ? new Date(at) : new Date();
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(at) {
  if (!at) return "just now";
  const diffMs = Date.now() - at;
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(at).toLocaleDateString();
}

function copyMessage(index, button) {
  const message = state.messages[index];
  if (!message) return;
  const done = () => {
    const label = button.querySelector("span");
    const original = label ? label.textContent : "Copy";
    if (label) label.textContent = "Copied";
    button.classList.add("is-success");
    setTimeout(() => {
      if (label) label.textContent = original;
      button.classList.remove("is-success");
    }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message.body).then(done, done);
  } else {
    const ta = document.createElement("textarea");
    ta.value = message.body;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (_) {}
    document.body.removeChild(ta);
    done();
  }
}

function retryAt(index) {
  let userPrompt = null;
  for (let i = index - 1; i >= 0; i--) {
    if (state.messages[i].role === "user") {
      userPrompt = state.messages[i].body;
      break;
    }
  }
  if (!userPrompt) return;
  addActivity("Retry", "Re-ran the previous user prompt.");
  simulateAgentReply(userPrompt);
}

let unreadCount = 0;
const AT_BOTTOM_THRESHOLD = 40;

function isAtBottom() {
  return (
    chatFeed.scrollHeight - chatFeed.scrollTop - chatFeed.clientHeight <
    AT_BOTTOM_THRESHOLD
  );
}

function scrollToBottom(smooth) {
  chatFeed.scrollTo({
    top: chatFeed.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

function updateJumpPill() {
  if (!jumpToLatestButton) return;
  const showPill = !isAtBottom() && state.messages.length > 0;
  if (showPill) {
    jumpToLatestButton.hidden = false;
    requestAnimationFrame(() =>
      jumpToLatestButton.classList.add("is-visible")
    );
  } else {
    jumpToLatestButton.classList.remove("is-visible");
    setTimeout(() => {
      if (!jumpToLatestButton.classList.contains("is-visible")) {
        jumpToLatestButton.hidden = true;
      }
    }, 200);
  }

  if (jumpCountEl) {
    if (unreadCount > 0) {
      jumpCountEl.hidden = false;
      jumpCountEl.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    } else {
      jumpCountEl.hidden = true;
    }
  }
}

function renderMessages(options) {
  const opts = options || {};
  const wasAtBottom = isAtBottom();
  const prevScrollTop = chatFeed.scrollTop;
  chatFeed.innerHTML = "";

  state.messages.forEach((message, index) => {
    const node = messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(message.role);
    node.querySelector(".author").textContent = message.role === "user" ? "You" : "Codex";
    const timeEl = node.querySelector(".timestamp");
    timeEl.textContent = relativeTime(message.at);
    timeEl.title = formatTime(message.at);
    if (message.at) timeEl.setAttribute("datetime", new Date(message.at).toISOString());
    node.querySelector(".message-body").textContent = message.body;

    const copyBtn = node.querySelector(".copy-action");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => copyMessage(index, copyBtn));
    }
    const retryBtn = node.querySelector(".retry-action");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => retryAt(index));
    }

    chatFeed.appendChild(node);
  });

  if (opts.forceScroll || wasAtBottom) {
    scrollToBottom(false);
    unreadCount = 0;
  } else {
    chatFeed.scrollTop = prevScrollTop;
  }

  updateJumpPill();
}

function refreshRelativeTimes() {
  const nodes = chatFeed.querySelectorAll(".message");
  nodes.forEach((node, i) => {
    const msg = state.messages[i];
    if (!msg) return;
    const timeEl = node.querySelector(".timestamp");
    if (timeEl) timeEl.textContent = relativeTime(msg.at);
  });
}

setInterval(refreshRelativeTimes, 30 * 1000);

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
  state.messages.push({ role: "user", body, at: Date.now() });
  unreadCount = 0;
  renderMessages({ forceScroll: true });
  saveState();
}

function addAssistantMessage(body) {
  const wasAtBottom = isAtBottom();
  state.messages.push({ role: "assistant", body, at: Date.now() });
  if (!wasAtBottom) {
    unreadCount += 1;
  }
  renderMessages();
  saveState();
}

function addTerminalLine(prefix, text) {
  state.terminalLines.push([prefix, text]);
  renderTerminal();
  saveState();
}

function addActivity(title, detail) {
  state.activity.unshift({ title, detail, at: Date.now() });
  state.activity = state.activity.slice(0, 6);
  renderActivity();
  saveState();
}

function syncPlan() {
  state.plan = [
    { label: "Capture the user intent", status: "completed" },
    { label: "Refine the Codex-like shell", status: "completed" },
    { label: "Verify the behavior and hand off", status: "in-progress" },
  ];
  renderPlan();
  saveState();
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
    saveState();
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

function autoGrowPrompt() {
  promptInput.style.height = "auto";
  const next = Math.min(promptInput.scrollHeight, 220);
  promptInput.style.height = next + "px";
}

function submitPrompt() {
  const value = promptInput.value.trim();
  if (!value) {
    return;
  }

  addUserMessage(value);
  simulateAgentReply(value);
  promptInput.value = "";
  autoGrowPrompt();
  promptInput.focus();
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  submitPrompt();
});

promptInput.addEventListener("input", autoGrowPrompt);

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    submitPrompt();
    return;
  }

  if (event.key === "Escape") {
    if (promptInput.value.length > 0) {
      event.preventDefault();
      promptInput.value = "";
      autoGrowPrompt();
    }
  }
});

document.addEventListener("keydown", (event) => {
  const isSubmitCombo =
    event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing;

  if (isSubmitCombo) {
    event.preventDefault();
    submitPrompt();
  }
});

runCommandButton.addEventListener("click", () => {
  addTerminalLine("$", "npm run dev");
  addTerminalLine(">", "Serving agent workspace at http://localhost:8000");
  addActivity("Demo command", "Simulated a local dev server run.");
});

shufflePlanButton.addEventListener("click", syncPlan);

function newThread() {
  const fresh = defaultState();
  state.messages = fresh.messages;
  state.plan = fresh.plan;
  state.terminalLines = fresh.terminalLines;
  state.activity = fresh.activity;
  renderMessages();
  renderPlan();
  renderTerminal();
  renderActivity();
  saveState();
  addActivity("Thread reset", "Cleared chat, plan, terminal, and activity.");
  promptInput.value = "";
  autoGrowPrompt();
  promptInput.focus();
}

if (newThreadButton) {
  newThreadButton.addEventListener("click", newThread);
}

chatFeed.addEventListener("scroll", () => {
  if (isAtBottom()) {
    unreadCount = 0;
  }
  updateJumpPill();
});

if (jumpToLatestButton) {
  jumpToLatestButton.addEventListener("click", () => {
    unreadCount = 0;
    scrollToBottom(true);
    updateJumpPill();
  });
}

function setTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("codex-theme", next);
  } catch (_) {}
  if (themeToggleButton) {
    themeToggleButton.setAttribute(
      "aria-label",
      next === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
    themeToggleButton.setAttribute(
      "title",
      next === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }
}

setTheme(document.documentElement.dataset.theme || "light");

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current === "dark" ? "light" : "dark");
    addActivity(
      "Theme changed",
      `Switched to ${document.documentElement.dataset.theme} mode.`
    );
  });
}

renderMessages({ forceScroll: true });
renderPlan();
renderTerminal();
renderActivity();
autoGrowPrompt();
updateJumpPill();
