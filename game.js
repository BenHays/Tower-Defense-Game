const LEVEL_ONE = {
  daySeconds: 45,
  nightSeconds: 30,
  startingSupplies: 3,
  startingCoopHealth: 8,
  coopMaxHealth: 10,
  raccoonHealth: 4,
  dogDamage: 1,
  dogAttackEvery: 1.2,
  raccoonBiteEvery: 1.7,
  raccoonSpeed: 7.6,
  dogInterceptionPoint: 63,
  coopPoint: 86,
};

const elements = {
  board: document.querySelector("#game-board"),
  phaseChip: document.querySelector("#phase-chip"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseTime: document.querySelector("#phase-time"),
  supplies: document.querySelector("#supplies"),
  coopHealth: document.querySelector("#coop-health"),
  dogStatus: document.querySelector("#dog-status"),
  dog: document.querySelector("#dog"),
  raccoon: document.querySelector("#raccoon"),
  raccoonHealth: document.querySelector("#raccoon-health"),
  coop: document.querySelector("#coop"),
  fenceButtons: [...document.querySelectorAll(".fence")],
  selectionKicker: document.querySelector("#selection-kicker"),
  selectionTitle: document.querySelector("#selection-title"),
  selectionCopy: document.querySelector("#selection-copy"),
  selectionMeter: document.querySelector("#selection-meter"),
  repairButton: document.querySelector("#repair-button"),
  phaseButton: document.querySelector("#phase-button"),
  actionHint: document.querySelector("#action-hint"),
  boardCaption: document.querySelector("#board-caption"),
  eventLog: document.querySelector("#event-log"),
  resultDialog: document.querySelector("#result-dialog"),
  resultMark: document.querySelector("#result-mark"),
  resultKicker: document.querySelector("#result-kicker"),
  resultTitle: document.querySelector("#result-title"),
  resultCopy: document.querySelector("#result-copy"),
  resultStats: document.querySelector("#result-stats"),
};

let state;
let previousFrame;
let animationFrame;

function freshState() {
  return {
    phase: "day",
    timeLeft: LEVEL_ONE.daySeconds,
    supplies: LEVEL_ONE.startingSupplies,
    coopHealth: LEVEL_ONE.startingCoopHealth,
    fences: [
      { name: "West fence", health: 1, max: 3, point: 36 },
      { name: "Middle fence", health: 2, max: 3, point: 53 },
      { name: "East fence", health: 3, max: 3, point: 68 },
    ],
    selection: { type: "fence", index: 0 },
    raccoon: null,
    raccoonsStopped: 0,
    fencesChewed: 0,
    message: "Scout is patrolling near the chicken coop.",
  };
}

function formatTime(seconds) {
  const rounded = Math.max(0, Math.ceil(seconds));
  return `00:${String(rounded).padStart(2, "0")}`;
}

function setMessage(message) {
  state.message = message;
  elements.eventLog.textContent = message;
}

function selectedObject() {
  if (state.selection.type === "coop") {
    return { name: "Chicken coop", health: state.coopHealth, max: LEVEL_ONE.coopMaxHealth };
  }
  return state.fences[state.selection.index];
}

function renderSelection() {
  const selected = selectedObject();
  const isCoop = state.selection.type === "coop";
  const isFull = selected.health >= selected.max;
  elements.selectionKicker.textContent = isCoop ? "Homestead" : "Selected barrier";
  elements.selectionTitle.textContent = selected.name;
  elements.selectionCopy.textContent = isCoop
    ? "The raccoon’s target. Keep it standing through the night."
    : selected.health === 0
      ? "Broken. Rebuild it to make the path to the coop longer."
      : "A barrier on the raccoon path. It buys Scout time to intercept.";
  elements.selectionMeter.style.width = `${(selected.health / selected.max) * 100}%`;
  elements.repairButton.disabled = state.phase !== "day" || isFull || state.supplies < 1;
  elements.repairButton.innerHTML = isFull
    ? "Fully repaired <span>✓</span>"
    : `Repair +1 <span>◈ 1</span>`;
  elements.actionHint.textContent = state.phase === "day"
    ? isFull ? "This spot is ready for the night." : "Each repair costs 1 supply."
    : "The homestead is locked down until dawn.";
}

function renderBoard() {
  elements.board.classList.toggle("night-scene", state.phase === "night");
  elements.board.classList.toggle("day-scene", state.phase !== "night");
  elements.phaseChip.classList.toggle("is-night", state.phase === "night");
  elements.phaseLabel.textContent = state.phase === "day" ? "Daylight" : "Night watch";
  elements.phaseTime.textContent = formatTime(state.timeLeft);
  elements.supplies.textContent = state.supplies;
  elements.coopHealth.textContent = state.coopHealth;
  elements.dogStatus.textContent = state.raccoon?.intercepted ? "Defending" : state.phase === "night" ? "Watching path" : "On guard";
  elements.dog.classList.toggle("is-fighting", Boolean(state.raccoon?.intercepted));
  elements.boardCaption.textContent = state.phase === "day"
    ? "A quiet day to mend the homestead."
    : state.raccoon?.intercepted
      ? "Scout has the raccoon’s attention."
      : "Listen closely — something is moving in the brush.";
  elements.eventLog.textContent = state.message;

  elements.fenceButtons.forEach((button, index) => {
    const fence = state.fences[index];
    button.classList.toggle("is-selected", state.selection.type === "fence" && state.selection.index === index);
    button.classList.toggle("is-broken", fence.health === 0);
    button.querySelector(".fence-health").textContent = `${fence.health} / ${fence.max}`;
  });
  elements.coop.classList.toggle("is-selected", state.selection.type === "coop");

  const raccoon = state.raccoon;
  elements.raccoon.classList.toggle("hidden", !raccoon);
  if (raccoon) {
    elements.raccoon.style.left = `${raccoon.position}%`;
    elements.raccoonHealth.style.width = `${(raccoon.health / LEVEL_ONE.raccoonHealth) * 100}%`;
  }
  renderSelection();
}

function selectFence(index) {
  if (state.phase !== "day") return;
  state.selection = { type: "fence", index };
  setMessage(`${state.fences[index].name} selected. A repair restores one plank of strength.`);
  renderBoard();
}

function selectCoop() {
  if (state.phase !== "day") return;
  state.selection = { type: "coop" };
  setMessage("Chicken coop selected. It is the one thing the raccoon wants to reach.");
  renderBoard();
}

function repairSelected() {
  if (state.phase !== "day" || state.supplies < 1) return;
  const target = selectedObject();
  if (target.health >= target.max) return;
  if (state.selection.type === "coop") {
    state.coopHealth += 1;
  } else {
    state.fences[state.selection.index].health += 1;
  }
  state.supplies -= 1;
  setMessage(`${target.name} is sturdier. Scout gives an approving bark.`);
  renderBoard();
}

function startNight() {
  if (state.phase !== "day") return;
  state.phase = "night";
  state.timeLeft = LEVEL_ONE.nightSeconds;
  state.selection = { type: "fence", index: 0 };
  state.raccoon = {
    health: LEVEL_ONE.raccoonHealth,
    position: 4,
    biteClock: 0,
    attackClock: 0,
    intercepted: false,
    targetFence: null,
  };
  elements.phaseButton.disabled = true;
  elements.phaseButton.innerHTML = "Night in progress <span>☾</span>";
  setMessage("A raccoon slips out of the woods. Scout is watching the path.");
  renderBoard();
}

function firstFenceAt(position) {
  return state.fences.findIndex((fence) => fence.health > 0 && position >= fence.point - 0.7 && position <= fence.point + 0.7);
}

function updateNight(delta) {
  const raccoon = state.raccoon;
  if (!raccoon) return;

  state.timeLeft -= delta;
  const fenceIndex = firstFenceAt(raccoon.position);

  if (fenceIndex !== -1 && !raccoon.intercepted) {
    const fence = state.fences[fenceIndex];
    raccoon.targetFence = fenceIndex;
    raccoon.biteClock += delta;
    if (raccoon.biteClock >= LEVEL_ONE.raccoonBiteEvery) {
      raccoon.biteClock = 0;
      fence.health -= 1;
      setMessage(`The raccoon chews through ${fence.name.toLowerCase()}.`);
      if (fence.health === 0) {
        state.fencesChewed += 1;
        setMessage(`${fence.name} is down — but it bought Scout valuable time.`);
      }
    }
  } else if (!raccoon.intercepted && raccoon.position < LEVEL_ONE.coopPoint) {
    raccoon.position += LEVEL_ONE.raccoonSpeed * delta;
  }

  if (raccoon.position >= LEVEL_ONE.dogInterceptionPoint || raccoon.intercepted) {
    raccoon.intercepted = true;
    raccoon.attackClock += delta;
    if (raccoon.attackClock >= LEVEL_ONE.dogAttackEvery) {
      raccoon.attackClock = 0;
      raccoon.health -= LEVEL_ONE.dogDamage;
      setMessage("Scout rushes in and drives the raccoon away from the coop.");
      if (raccoon.health <= 0) {
        state.raccoonsStopped += 1;
        completeLevel(true);
        return;
      }
    }
  }

  if (state.timeLeft <= 0) {
    completeLevel(state.coopHealth > 0);
  }
}

function completeLevel(won) {
  cancelAnimationFrame(animationFrame);
  state.phase = won ? "complete" : "failed";
  elements.raccoon.classList.add("hidden");
  elements.dog.classList.remove("is-fighting");
  elements.resultMark.textContent = won ? "✦" : "!";
  elements.resultKicker.textContent = won ? "First watch complete" : "The coop was raided";
  elements.resultTitle.textContent = won ? "The coop is safe." : "Try a sturdier path.";
  elements.resultCopy.textContent = won
    ? "Scout sent the raccoon back to the woods. You just played the complete level-one loop: prepare by day, then watch your plan hold at night."
    : "The raccoon made it to the coop. Spend more daylight supplies on the fence line, then try the night again.";
  elements.resultStats.innerHTML = [
    `<span>Coop ${state.coopHealth}/10</span>`,
    `<span>${state.raccoonsStopped} raccoon stopped</span>`,
    `<span>${state.fencesChewed} fence${state.fencesChewed === 1 ? "" : "s"} lost</span>`,
  ].join("");
  elements.resultDialog.classList.remove("hidden");
}

function tick(timestamp) {
  if (!previousFrame) previousFrame = timestamp;
  const delta = Math.min((timestamp - previousFrame) / 1000, 0.1);
  previousFrame = timestamp;

  if (state.phase === "day") {
    state.timeLeft -= delta;
    if (state.timeLeft <= 0) startNight();
  } else if (state.phase === "night") {
    updateNight(delta);
  }

  renderBoard();
  if (state.phase === "day" || state.phase === "night") {
    animationFrame = requestAnimationFrame(tick);
  }
}

function resetGame() {
  cancelAnimationFrame(animationFrame);
  previousFrame = undefined;
  state = freshState();
  elements.resultDialog.classList.add("hidden");
  elements.phaseButton.disabled = false;
  elements.phaseButton.innerHTML = "Start night <span aria-hidden=\"true\">→</span>";
  renderBoard();
  animationFrame = requestAnimationFrame(tick);
}

elements.fenceButtons.forEach((button, index) => button.addEventListener("click", () => selectFence(index)));
elements.coop.addEventListener("click", selectCoop);
elements.repairButton.addEventListener("click", repairSelected);
elements.phaseButton.addEventListener("click", startNight);
document.querySelector("#reset-button").addEventListener("click", resetGame);
document.querySelector("#brand-reset").addEventListener("click", (event) => { event.preventDefault(); resetGame(); });
document.querySelector("#play-again").addEventListener("click", resetGame);

resetGame();
