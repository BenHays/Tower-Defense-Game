const LEVEL_ONE = {
  daySeconds: 30,
  nightSeconds: 24,
  teepeeHealth: 3,
  startingTeepeeHealth: 2,
  raccoonHealth: 3,
  raccoonSpeed: 0.2,
  dogInterceptProgress: 0.67,
  dogAttackEvery: 0.72,
};

const ENTRY_VECTORS = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
  { x: 0.72, y: -0.72 }, { x: 0.72, y: 0.72 }, { x: -0.72, y: 0.72 }, { x: -0.72, y: -0.72 },
];

const elements = {
  board: document.querySelector("#game-board"),
  phaseChip: document.querySelector("#phase-chip"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseTime: document.querySelector("#phase-time"),
  teepeeHealth: document.querySelector("#teepee-health"),
  dogStatus: document.querySelector("#dog-status"),
  teepee: document.querySelector("#teepee"),
  dog: document.querySelector("#dog"),
  raccoon: document.querySelector("#raccoon"),
  raccoonHealth: document.querySelector("#raccoon-health"),
  selectionMeter: document.querySelector("#selection-meter"),
  selectionCopy: document.querySelector("#selection-copy"),
  mendButton: document.querySelector("#mend-button"),
  phaseButton: document.querySelector("#phase-button"),
  actionHint: document.querySelector("#action-hint"),
  boardCaption: document.querySelector("#board-caption"),
  eventLog: document.querySelector("#event-log"),
  resultDialog: document.querySelector("#result-dialog"),
  resultTitle: document.querySelector("#result-title"),
  resultCopy: document.querySelector("#result-copy"),
  resultStats: document.querySelector("#result-stats"),
};

let state;
let previousFrame;
let animationFrame;
let raidIndex = 0;

function freshState() {
  return {
    phase: "day",
    timeLeft: LEVEL_ONE.daySeconds,
    teepeeHealth: LEVEL_ONE.startingTeepeeHealth,
    mended: false,
    entry: ENTRY_VECTORS[raidIndex % ENTRY_VECTORS.length],
    raccoon: null,
    message: "Avery checks the teepee’s lashings while Scout circles the campfire.",
  };
}

function formatTime(seconds) {
  return `00:${String(Math.max(0, Math.ceil(seconds))).padStart(2, "0")}`;
}

function setMessage(message) {
  state.message = message;
  elements.eventLog.textContent = message;
}

function setPosition(element, x, y) {
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
}

function raccoonPosition(progress) {
  const radius = Math.max(9, 47 * (1 - progress));
  return { x: 50 + state.entry.x * radius, y: 50 + state.entry.y * radius };
}

function renderBoard() {
  const night = state.phase === "night";
  elements.board.classList.toggle("night-scene", night);
  elements.phaseChip.classList.toggle("is-night", night);
  elements.phaseLabel.textContent = state.phase === "day" ? "Daylight" : "Night watch";
  elements.phaseTime.textContent = formatTime(state.timeLeft);
  elements.teepeeHealth.textContent = state.teepeeHealth;
  elements.dogStatus.textContent = state.raccoon?.mode === "fight" ? "Protecting home" : night ? "On watch" : "At home";
  elements.selectionMeter.style.width = `${(state.teepeeHealth / LEVEL_ONE.teepeeHealth) * 100}%`;
  elements.selectionCopy.textContent = state.teepeeHealth === LEVEL_ONE.teepeeHealth
    ? "A little shelter made by hand. It is ready for the first night."
    : "A little shelter made by hand. One quiet daylight moment is enough to tighten its roof.";
  elements.mendButton.disabled = state.phase !== "day" || state.teepeeHealth >= LEVEL_ONE.teepeeHealth;
  elements.mendButton.innerHTML = state.teepeeHealth >= LEVEL_ONE.teepeeHealth ? "Teepee is ready <span>✓</span>" : "Mend teepee <span>+1</span>";
  elements.actionHint.textContent = state.phase !== "day"
    ? "Avery stays close to home until sunrise."
    : state.teepeeHealth >= LEVEL_ONE.teepeeHealth ? "The first shelter is as sound as it can be." : "Use the daylight to mend the roof before you rest.";
  elements.boardCaption.textContent = state.phase === "day"
    ? "The meadow is quiet. Scout keeps close to camp."
    : state.raccoon?.mode === "fight"
      ? "Scout has the raccoon’s full attention."
      : "Something small is moving at the forest’s edge.";
  elements.eventLog.textContent = state.message;
  elements.teepee.classList.toggle("is-selected", state.phase === "day");

  const raccoon = state.raccoon;
  elements.raccoon.classList.toggle("hidden", !raccoon);
  elements.dog.classList.toggle("is-fighting", Boolean(raccoon?.mode === "fight"));
  if (raccoon) {
    const position = raccoonPosition(raccoon.progress);
    setPosition(elements.raccoon, position.x, position.y);
    elements.raccoonHealth.style.width = `${(raccoon.health / LEVEL_ONE.raccoonHealth) * 100}%`;
    if (raccoon.mode === "fight") setPosition(elements.dog, position.x - state.entry.x * 5, position.y - state.entry.y * 5);
  } else {
    setPosition(elements.dog, 55, 58);
  }
}

function mendTeepee() {
  if (state.phase !== "day" || state.teepeeHealth >= LEVEL_ONE.teepeeHealth) return;
  state.teepeeHealth += 1;
  state.mended = true;
  setMessage("Avery tightens the teepee’s roof with fresh branch lashings.");
  renderBoard();
}

function startNight() {
  if (state.phase !== "day") return;
  state.phase = "night";
  state.timeLeft = LEVEL_ONE.nightSeconds;
  state.raccoon = { health: LEVEL_ONE.raccoonHealth, progress: 0, mode: "approach", attackClock: 0 };
  elements.phaseButton.disabled = true;
  elements.phaseButton.innerHTML = "Night in progress <span>☾</span>";
  setMessage("A raccoon slips out from the trees. Scout hears it before Avery does.");
  renderBoard();
}

function updateNight(delta) {
  const raccoon = state.raccoon;
  if (!raccoon) return;
  state.timeLeft -= delta;
  if (raccoon.mode === "approach") {
    raccoon.progress += LEVEL_ONE.raccoonSpeed * delta;
    if (raccoon.progress >= LEVEL_ONE.dogInterceptProgress) {
      raccoon.progress = LEVEL_ONE.dogInterceptProgress;
      raccoon.mode = "fight";
      setMessage("Scout dashes across the grass and blocks the raccoon’s path.");
    }
  }
  if (raccoon.mode === "fight") {
    raccoon.attackClock += delta;
    if (raccoon.attackClock >= LEVEL_ONE.dogAttackEvery) {
      raccoon.attackClock = 0;
      raccoon.health -= 1;
      setMessage("Scout barks, darts in, and keeps the raccoon away from camp.");
      if (raccoon.health <= 0) {
        completeLevel();
        return;
      }
    }
  }
  if (state.timeLeft <= 0) completeLevel();
}

function completeLevel() {
  cancelAnimationFrame(animationFrame);
  state.phase = "complete";
  elements.raccoon.classList.add("hidden");
  elements.dog.classList.remove("is-fighting");
  elements.resultTitle.textContent = "The teepee is safe.";
  elements.resultCopy.textContent = "Scout escorts the raccoon back to the trees. Tomorrow, this whole meadow is still waiting.";
  elements.resultStats.innerHTML = [
    `<span>Teepee ${state.teepeeHealth}/3</span>`,
    `<span>1 raccoon turned away</span>`,
    `<span>${state.mended ? "Home mended" : "Home held"}</span>`,
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
  if (state.phase === "day" || state.phase === "night") animationFrame = requestAnimationFrame(tick);
}

function resetGame(advanceRaid = false) {
  cancelAnimationFrame(animationFrame);
  if (advanceRaid) raidIndex += 1;
  previousFrame = undefined;
  state = freshState();
  elements.resultDialog.classList.add("hidden");
  elements.phaseButton.disabled = false;
  elements.phaseButton.innerHTML = "Start night <span aria-hidden=\"true\">→</span>";
  renderBoard();
  animationFrame = requestAnimationFrame(tick);
}

elements.teepee.addEventListener("click", () => {
  if (state.phase === "day") setMessage("The branch teepee is the first home. Everything else will grow from this clearing.");
});
elements.mendButton.addEventListener("click", mendTeepee);
elements.phaseButton.addEventListener("click", startNight);
document.querySelector("#reset-button").addEventListener("click", () => resetGame(false));
document.querySelector("#brand-reset").addEventListener("click", (event) => { event.preventDefault(); resetGame(false); });
document.querySelector("#play-again").addEventListener("click", () => resetGame(true));

resetGame();
