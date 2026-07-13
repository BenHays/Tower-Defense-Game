const LEVEL_ONE = {
  daySeconds: 32,
  nightSeconds: 24,
  startingBranches: 3,
  teepeeHealth: 3,
  screenHealth: 2,
  raccoonHealth: 4,
  raccoonSpeed: 0.22,
  screenProgress: 0.45,
  teepeeProgress: 0.94,
  screenBiteEvery: 1.4,
  teepeeBiteEvery: 0.8,
  dogAttackEvery: 0.9,
};

const DIRECTIONS = [
  { id: "north", name: "North woods", x: 0, y: -1, marker: { left: "46%", top: "7%" } },
  { id: "east", name: "East woods", x: 1, y: 0, marker: { left: "88%", top: "46%" } },
  { id: "south", name: "South woods", x: 0, y: 1, marker: { left: "46%", top: "88%" } },
  { id: "west", name: "West woods", x: -1, y: 0, marker: { left: "5%", top: "46%" } },
];

const elements = {
  board: document.querySelector("#game-board"),
  phaseChip: document.querySelector("#phase-chip"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseTime: document.querySelector("#phase-time"),
  branches: document.querySelector("#branches"),
  teepeeHealth: document.querySelector("#teepee-health"),
  dogStatus: document.querySelector("#dog-status"),
  threatDirection: document.querySelector("#threat-direction"),
  raidMarker: document.querySelector("#raid-marker"),
  teepee: document.querySelector("#teepee"),
  dog: document.querySelector("#dog"),
  raccoon: document.querySelector("#raccoon"),
  raccoonHealth: document.querySelector("#raccoon-health"),
  barrierButtons: [...document.querySelectorAll(".barrier")],
  selectionKicker: document.querySelector("#selection-kicker"),
  selectionTitle: document.querySelector("#selection-title"),
  selectionCopy: document.querySelector("#selection-copy"),
  selectionMeter: document.querySelector("#selection-meter"),
  buildButton: document.querySelector("#build-button"),
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
let raidIndex = 0;

function freshState() {
  const raidDirection = DIRECTIONS[raidIndex % DIRECTIONS.length];
  return {
    phase: "day",
    timeLeft: LEVEL_ONE.daySeconds,
    branches: LEVEL_ONE.startingBranches,
    teepeeHealth: LEVEL_ONE.teepeeHealth,
    screens: DIRECTIONS.map((direction) => ({ ...direction, health: 0, max: LEVEL_ONE.screenHealth })),
    raidDirection,
    selection: { type: "screen", index: 0 },
    raccoon: null,
    screensBuilt: 0,
    screensLost: 0,
    message: `Avery has three bundles of branches and a clear view of the ${raidDirection.name.toLowerCase()}.`,
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
  if (state.selection.type === "teepee") {
    return { name: "Branch teepee", health: state.teepeeHealth, max: LEVEL_ONE.teepeeHealth };
  }
  return state.screens[state.selection.index];
}

function screenForRaid() {
  return state.screens.find((screen) => screen.id === state.raidDirection.id);
}

function setPosition(element, x, y) {
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
}

function raidPosition(progress, holdingAtScreen = false) {
  const distance = holdingAtScreen
    ? 42 * (1 - LEVEL_ONE.screenProgress)
    : Math.max(5, 42 * (1 - progress));
  return {
    x: 50 + state.raidDirection.x * distance,
    y: 50 + state.raidDirection.y * distance,
  };
}

function renderSelection() {
  const selected = selectedObject();
  const isTeepee = state.selection.type === "teepee";
  const isEmpty = !isTeepee && selected.health === 0;
  const isFull = selected.health >= selected.max;
  elements.selectionKicker.textContent = isTeepee ? "Your home" : "Build site";
  elements.selectionTitle.textContent = isTeepee ? selected.name : `${selected.name.replace(" woods", "")} screen`;
  elements.selectionCopy.textContent = isTeepee
    ? "A hand-built shelter of branches. Upgrades come later; tonight, keep its first roof standing."
    : isEmpty
      ? `An open edge of the clearing. A stick screen here gives Scout a safer intercept.`
      : `A woven stick screen. It holds the raccoon while Scout runs to this side.`;
  elements.selectionMeter.style.width = `${(selected.health / selected.max) * 100}%`;
  elements.buildButton.disabled = state.phase !== "day" || isFull || state.branches < 1;
  elements.buildButton.innerHTML = isFull
    ? "Screen is ready <span>✓</span>"
    : isEmpty
      ? "Build stick screen <span>⌇ 1</span>"
      : "Repair +1 <span>⌇ 1</span>";
  elements.actionHint.textContent = state.phase !== "day"
    ? "The clearing is locked down until dawn."
    : isTeepee
      ? isFull ? "The first shelter is as sound as it can be." : "One branch bundle repairs the teepee."
      : isEmpty ? "A new screen arrives with 2 strength." : "One branch bundle restores 1 strength.";
}

function renderBoard() {
  const night = state.phase === "night";
  elements.board.classList.toggle("night-scene", night);
  elements.phaseChip.classList.toggle("is-night", night);
  elements.phaseLabel.textContent = state.phase === "day" ? "Daylight" : "Night watch";
  elements.phaseTime.textContent = formatTime(state.timeLeft);
  elements.branches.textContent = state.branches;
  elements.teepeeHealth.textContent = state.teepeeHealth;
  elements.threatDirection.textContent = state.raidDirection.name;
  elements.dogStatus.textContent = state.raccoon?.mode === "screen"
    ? "Fighting at screen"
    : state.raccoon?.mode === "teepee"
      ? "Defending teepee"
      : night ? "Watching the edge" : "At home";
  elements.boardCaption.textContent = state.phase === "day"
    ? `The ${state.raidDirection.name.toLowerCase()} are rustling. Your first screen can go anywhere.`
    : state.raccoon?.mode === "screen"
      ? "Scout has reached the stick screen."
      : state.raccoon?.mode === "teepee"
        ? "The raccoon reached the heart of the clearing!"
        : "A raccoon is cutting straight through the open grass.";
  elements.eventLog.textContent = state.message;
  elements.raidMarker.style.left = state.raidDirection.marker.left;
  elements.raidMarker.style.top = state.raidDirection.marker.top;

  elements.barrierButtons.forEach((button, index) => {
    const screen = state.screens[index];
    button.classList.toggle("is-selected", state.selection.type === "screen" && state.selection.index === index);
    button.classList.toggle("is-target", screen.id === state.raidDirection.id);
    button.classList.toggle("is-empty", screen.health === 0);
    button.classList.toggle("is-broken", screen.health === 0 && state.phase === "night" && screen.id === state.raidDirection.id);
    button.querySelector(".barrier-health").textContent = screen.health === 0 ? "Empty" : `${screen.health} / ${screen.max}`;
  });
  elements.teepee.classList.toggle("is-selected", state.selection.type === "teepee");

  const raccoon = state.raccoon;
  elements.raccoon.classList.toggle("hidden", !raccoon);
  elements.dog.classList.toggle("is-fighting", Boolean(raccoon?.mode === "screen" || raccoon?.mode === "teepee"));
  if (raccoon) {
    const position = raidPosition(raccoon.progress, raccoon.mode === "screen");
    setPosition(elements.raccoon, position.x, position.y);
    elements.raccoonHealth.style.width = `${(raccoon.health / LEVEL_ONE.raccoonHealth) * 100}%`;
    if (raccoon.mode === "screen") setPosition(elements.dog, position.x + state.raidDirection.x * 4, position.y + state.raidDirection.y * 4);
    if (raccoon.mode === "teepee") setPosition(elements.dog, 50 + state.raidDirection.x * 7, 50 + state.raidDirection.y * 7);
  } else {
    setPosition(elements.dog, 57, 59);
  }
  renderSelection();
}

function selectScreen(index) {
  if (state.phase !== "day") return;
  state.selection = { type: "screen", index };
  const screen = state.screens[index];
  setMessage(`${screen.name} selected. Avery can build outward from the teepee in this direction.`);
  renderBoard();
}

function selectTeepee() {
  if (state.phase !== "day") return;
  state.selection = { type: "teepee" };
  setMessage("Branch teepee selected. It is small now, but every future upgrade will begin from this center.");
  renderBoard();
}

function buildOrRepair() {
  if (state.phase !== "day" || state.branches < 1) return;
  const target = selectedObject();
  if (target.health >= target.max) return;
  if (state.selection.type === "teepee") {
    state.teepeeHealth += 1;
    setMessage("Avery binds another branch into the teepee frame.");
  } else {
    const screen = state.screens[state.selection.index];
    const wasEmpty = screen.health === 0;
    screen.health = wasEmpty ? screen.max : screen.health + 1;
    if (wasEmpty) state.screensBuilt += 1;
    setMessage(wasEmpty
      ? `Avery weaves a new stick screen toward the ${screen.name.toLowerCase()}.`
      : `Avery tightens the ${screen.name.toLowerCase()} screen.`);
  }
  state.branches -= 1;
  renderBoard();
}

function startNight() {
  if (state.phase !== "day") return;
  state.phase = "night";
  state.timeLeft = LEVEL_ONE.nightSeconds;
  state.raccoon = { health: LEVEL_ONE.raccoonHealth, progress: 0, mode: "approach", biteClock: 0, attackClock: 0 };
  elements.phaseButton.disabled = true;
  elements.phaseButton.innerHTML = "Night in progress <span>☾</span>";
  setMessage(`A raccoon slips out of the ${state.raidDirection.name.toLowerCase()}. Scout watches its line to the teepee.`);
  renderBoard();
}

function dogAttack(raccoon) {
  if (raccoon.attackClock < LEVEL_ONE.dogAttackEvery) return false;
  raccoon.attackClock = 0;
  raccoon.health -= 1;
  setMessage(raccoon.mode === "screen"
    ? "Scout snaps at the raccoon from behind the stick screen."
    : "Scout throws himself between the raccoon and the teepee.");
  if (raccoon.health <= 0) {
    completeLevel(true);
    return true;
  }
  return false;
}

function updateNight(delta) {
  const raccoon = state.raccoon;
  if (!raccoon) return;
  state.timeLeft -= delta;
  const targetScreen = screenForRaid();

  if (raccoon.mode === "approach") {
    raccoon.progress += LEVEL_ONE.raccoonSpeed * delta;
    if (targetScreen.health > 0 && raccoon.progress >= LEVEL_ONE.screenProgress) {
      raccoon.progress = LEVEL_ONE.screenProgress;
      raccoon.mode = "screen";
      setMessage(`The raccoon hits the ${targetScreen.name.toLowerCase()} screen. Scout races across the clearing.`);
    } else if (raccoon.progress >= LEVEL_ONE.teepeeProgress) {
      raccoon.progress = LEVEL_ONE.teepeeProgress;
      raccoon.mode = "teepee";
      setMessage("The raccoon reaches the branch teepee. Scout finally catches up!");
    }
  }

  if (raccoon.mode === "screen") {
    raccoon.biteClock += delta;
    raccoon.attackClock += delta;
    if (raccoon.biteClock >= LEVEL_ONE.screenBiteEvery) {
      raccoon.biteClock = 0;
      targetScreen.health -= 1;
      if (targetScreen.health === 0) {
        state.screensLost += 1;
        setMessage("The stick screen falls, but Scout is already in the fight.");
      } else {
        setMessage("The raccoon gnaws at the screen while Scout closes in.");
      }
    }
    if (dogAttack(raccoon)) return;
  }

  if (raccoon.mode === "teepee") {
    raccoon.biteClock += delta;
    raccoon.attackClock += delta;
    if (raccoon.biteClock >= LEVEL_ONE.teepeeBiteEvery) {
      raccoon.biteClock = 0;
      state.teepeeHealth -= 1;
      elements.teepee.classList.add("hit");
      setTimeout(() => elements.teepee.classList.remove("hit"), 420);
      setMessage("The raccoon tears at the teepee’s branch frame.");
      if (state.teepeeHealth <= 0) {
        completeLevel(false);
        return;
      }
    }
    if (dogAttack(raccoon)) return;
  }

  if (state.timeLeft <= 0) completeLevel(state.teepeeHealth > 0 && raccoon.health <= 0);
}

function completeLevel(won) {
  cancelAnimationFrame(animationFrame);
  state.phase = won ? "complete" : "failed";
  elements.raccoon.classList.add("hidden");
  elements.dog.classList.remove("is-fighting");
  elements.resultMark.textContent = won ? "✦" : "!";
  elements.resultKicker.textContent = won ? "First shelter held" : "The first shelter fell";
  elements.resultTitle.textContent = won ? "The teepee is safe." : "Start from the marked edge.";
  elements.resultCopy.textContent = won
    ? "Avery’s first screen gave Scout the moment he needed. The next shelter can grow outward from any side of this circle."
    : `The ${state.raidDirection.name.toLowerCase()} were the danger. Place one stick screen there before starting the night, then let Scout meet the raid early.`;
  elements.resultStats.innerHTML = [
    `<span>Teepee ${state.teepeeHealth}/3</span>`,
    `<span>${state.screensBuilt} screen${state.screensBuilt === 1 ? "" : "s"} built</span>`,
    `<span>${state.screensLost} screen${state.screensLost === 1 ? "" : "s"} lost</span>`,
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

elements.barrierButtons.forEach((button, index) => button.addEventListener("click", () => selectScreen(index)));
elements.teepee.addEventListener("click", selectTeepee);
elements.buildButton.addEventListener("click", buildOrRepair);
elements.phaseButton.addEventListener("click", startNight);
document.querySelector("#reset-button").addEventListener("click", () => resetGame(false));
document.querySelector("#brand-reset").addEventListener("click", (event) => { event.preventDefault(); resetGame(false); });
document.querySelector("#play-again").addEventListener("click", () => resetGame(true));

resetGame();
