const els = {
  initialState: document.getElementById("initialState"),
  acceptStates: document.getElementById("acceptStates"),
  rejectStates: document.getElementById("rejectStates"),
  blankSymbol: document.getElementById("blankSymbol"),
  inputString: document.getElementById("inputString"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  initializeBtn: document.getElementById("initializeBtn"),
  addRuleBtn: document.getElementById("addRuleBtn"),
  transitionTableBody: document.querySelector("#transitionTable tbody"),
  ruleRowTemplate: document.getElementById("ruleRowTemplate"),
  stepBtn: document.getElementById("stepBtn"),
  runBtn: document.getElementById("runBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  speedSlider: document.getElementById("speedSlider"),
  currentStateLabel: document.getElementById("currentStateLabel"),
  headPositionLabel: document.getElementById("headPositionLabel"),
  stepsLabel: document.getElementById("stepsLabel"),
  tapeContainer: document.getElementById("tapeContainer"),
  logList: document.getElementById("logList"),
  statusPill: document.getElementById("statusPill")
};

const DEFAULT_RULES = [
  { current: "q0", read: "0", write: "0", move: "R", next: "q0" },
  { current: "q0", read: "1", write: "1", move: "R", next: "q0" },
  { current: "q0", read: "_", write: "_", move: "L", next: "q1" },
  { current: "q1", read: "1", write: "0", move: "L", next: "q1" },
  { current: "q1", read: "0", write: "1", move: "R", next: "q_accept" },
  { current: "q1", read: "_", write: "1", move: "R", next: "q_accept" }
];

class TuringMachine {
  constructor(config) {
    this.blankSymbol = config.blankSymbol;
    this.initialState = config.initialState;
    this.acceptStates = new Set(config.acceptStates);
    this.rejectStates = new Set(config.rejectStates);
    this.transitions = config.transitions;
    this.reset(config.inputString);
  }

  reset(inputString = "") {
    this.tape = inputString.length ? inputString.split("") : [this.blankSymbol];
    this.head = 0;
    this.currentState = this.initialState;
    this.steps = 0;
    this.log = [];
    this.halted = false;
    this.accepted = null;
    this.lastChangedIndex = null;
  }

  read() {
    return this.tape[this.head] ?? this.blankSymbol;
  }

  write(symbol) {
    this.tape[this.head] = symbol;
    this.lastChangedIndex = this.head;
  }

  move(direction) {
    if (direction === "L") {
      this.head -= 1;
      if (this.head < 0) {
        this.tape.unshift(this.blankSymbol);
        this.head = 0;
      }
      return;
    }

    if (direction === "R") {
      this.head += 1;
      if (this.head >= this.tape.length) {
        this.tape.push(this.blankSymbol);
      }
      return;
    }

    throw new Error(`Invalid move direction: ${direction}. Only L and R are allowed.`);
  }

  getTransition(state, symbol) {
    return this.transitions.get(`${state}|${symbol}`) || this.transitions.get(`${state}|*`) || null;
  }

  step() {
    if (this.halted) {
      return { advanced: false, message: "Machine already halted." };
    }

    const readSymbol = this.read();
    const transition = this.getTransition(this.currentState, readSymbol);

    if (!transition) {
      this.halted = true;
      this.accepted = this.acceptStates.has(this.currentState);
      const finalMessage = this.accepted
        ? `No transition found from ${this.currentState}, halting in accept state.`
        : `No transition found from ${this.currentState}, halting.`;
      this.log.push(finalMessage);
      return { advanced: false, message: finalMessage };
    }

    const fromState = this.currentState;
    const writeSymbol = transition.write || this.blankSymbol;
    this.write(writeSymbol);

    if (!["L", "R"].includes(transition.move)) {
      this.halted = true;
      this.accepted = false;
      const errorMessage = `Invalid transition move '${transition.move}' from state ${fromState}. Only L and R are allowed.`;
      this.log.push(errorMessage);
      return { advanced: false, message: errorMessage };
    }

    this.move(transition.move);
    this.currentState = transition.next;
    this.steps += 1;

    const logItem =
      `Step ${this.steps}: (${fromState}, ${readSymbol}) -> ` +
      `(${writeSymbol}, ${transition.move}, ${this.currentState})`;
    this.log.push(logItem);

    if (this.acceptStates.has(this.currentState)) {
      this.halted = true;
      this.accepted = true;
      this.log.push(`Machine accepted in state ${this.currentState}.`);
    } else if (this.rejectStates.has(this.currentState)) {
      this.halted = true;
      this.accepted = false;
      this.log.push(`Machine rejected in state ${this.currentState}.`);
    }

    return { advanced: true, message: logItem };
  }
}

let machine = null;
let runTimer = null;

function setStatus(mode, text) {
  els.statusPill.className = `status ${mode}`;
  els.statusPill.textContent = text;
}

function parseSet(input) {
  return input
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildTransitions() {
  const map = new Map();
  const rows = [...els.transitionTableBody.querySelectorAll("tr")];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const current = row.querySelector(".rule-current").value.trim();
    const read = row.querySelector(".rule-read").value.trim();
    const write = row.querySelector(".rule-write").value.trim();
    const move = row.querySelector(".rule-move").value.trim().toUpperCase();
    const next = row.querySelector(".rule-next").value.trim();

    const isRowEmpty = !current && !read && !write && !next;
    if (isRowEmpty) {
      return;
    }

    if (!current || !read || !write || !next) {
      errors.push(`Rule ${rowNumber} is incomplete.`);
      return;
    }

    if (!["L", "R"].includes(move)) {
      errors.push(`Rule ${rowNumber} has invalid move '${move}'. Use only L or R.`);
      return;
    }

    map.set(`${current}|${read}`, { write, move, next });
  });

  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  return map;
}

function addRuleRow(rule = {}) {
  const fragment = els.ruleRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");
  row.querySelector(".rule-current").value = rule.current || "";
  row.querySelector(".rule-read").value = rule.read || "";
  row.querySelector(".rule-write").value = rule.write || "";
  row.querySelector(".rule-move").value = rule.move || "R";
  row.querySelector(".rule-next").value = rule.next || "";
  row.querySelector(".remove-rule").addEventListener("click", () => {
    row.remove();
  });
  els.transitionTableBody.appendChild(fragment);
}

function clearRules() {
  els.transitionTableBody.innerHTML = "";
}

function renderTape() {
  if (!machine) {
    els.tapeContainer.innerHTML = "";
    return;
  }

  // Render the full visited tape so long inputs are fully scrollable.
  const leftPad = 1;
  const rightPad = 1;
  const start = 0;
  const end = Math.max(machine.tape.length - 1, machine.head) + rightPad;
  const cells = [];

  for (let i = start - leftPad; i <= end; i += 1) {
    const symbol = machine.tape[i] ?? machine.blankSymbol;
    const classes = ["tape-cell"];

    if (i === machine.head) {
      classes.push("head");
    }

    if (i === machine.lastChangedIndex) {
      classes.push("changed");
    }

    cells.push(`<div class="${classes.join(" ")}" data-index="${i}">${symbol}</div>`);
  }

  els.tapeContainer.innerHTML = cells.join("");

  const headCell = els.tapeContainer.querySelector(".head");
  if (headCell) {
    headCell.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function renderLog() {
  if (!machine) {
    els.logList.innerHTML = "";
    return;
  }

  els.logList.innerHTML = machine.log
    .slice(-120)
    .map((entry) => `<li>${entry}</li>`)
    .join("");

  els.logList.scrollTop = els.logList.scrollHeight;
}

function renderMeta() {
  if (!machine) {
    els.currentStateLabel.textContent = "-";
    els.headPositionLabel.textContent = "-";
    els.stepsLabel.textContent = "0";
    setStatus("status-idle", "Idle");
    return;
  }

  els.currentStateLabel.textContent = machine.currentState;
  els.headPositionLabel.textContent = String(machine.head);
  els.stepsLabel.textContent = String(machine.steps);

  if (machine.halted) {
    setStatus(machine.accepted ? "status-accept" : "status-reject", machine.accepted ? "Accepted" : "Halted");
  }
}

function stopRunning() {
  if (runTimer) {
    clearInterval(runTimer);
    runTimer = null;
  }
}

function refreshView() {
  renderMeta();
  renderTape();
  renderLog();
}

function initializeMachine() {
  stopRunning();

  const blankSymbol = els.blankSymbol.value.trim() || "_";
  const initialState = els.initialState.value.trim() || "q0";
  let transitions;

  try {
    transitions = buildTransitions();
  } catch (error) {
    machine = null;
    setStatus("status-reject", "Rule Error");
    els.currentStateLabel.textContent = "-";
    els.headPositionLabel.textContent = "-";
    els.stepsLabel.textContent = "0";
    els.logList.innerHTML = `<li>${error.message}</li>`;
    renderTape();
    return;
  }

  machine = new TuringMachine({
    blankSymbol,
    initialState,
    acceptStates: parseSet(els.acceptStates.value),
    rejectStates: parseSet(els.rejectStates.value),
    transitions,
    inputString: els.inputString.value
  });

  setStatus("status-idle", "Ready");
  refreshView();
}

function executeOneStep() {
  if (!machine) {
    initializeMachine();
  }

  const result = machine.step();
  refreshView();

  if (machine.halted) {
    stopRunning();
  } else if (result.advanced) {
    setStatus("status-running", "Running");
  }
}

function startRunning() {
  if (!machine) {
    initializeMachine();
  }

  if (machine.halted) {
    return;
  }

  stopRunning();
  setStatus("status-running", "Running");

  const sliderValue = Number(els.speedSlider.value || 400);
  // Slider represents speed, so convert to interval delay (higher speed => lower delay).
  const delay = Number(els.speedSlider.max) + Number(els.speedSlider.min) - sliderValue;
  runTimer = setInterval(() => {
    executeOneStep();
  }, delay);
}

function resetMachine() {
  stopRunning();
  if (!machine) {
    initializeMachine();
    return;
  }

  machine.reset(els.inputString.value);
  setStatus("status-idle", "Reset");
  refreshView();
}

els.loadSampleBtn.addEventListener("click", () => {
  clearRules();
  DEFAULT_RULES.forEach((rule) => addRuleRow(rule));
});

els.addRuleBtn.addEventListener("click", () => addRuleRow());
els.initializeBtn.addEventListener("click", initializeMachine);
els.stepBtn.addEventListener("click", executeOneStep);
els.runBtn.addEventListener("click", startRunning);
els.pauseBtn.addEventListener("click", () => {
  stopRunning();
  if (machine && !machine.halted) {
    setStatus("status-idle", "Paused");
  }
});
els.resetBtn.addEventListener("click", resetMachine);
els.speedSlider.addEventListener("change", () => {
  if (runTimer) {
    startRunning();
  }
});

// Initialize a useful default setup so users can run instantly.
DEFAULT_RULES.forEach((rule) => addRuleRow(rule));
initializeMachine();
