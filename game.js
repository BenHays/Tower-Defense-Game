const Engine = window.WildHearthEngine;

if (!Engine) throw new Error("Wild Hearth engine did not load.");

const SAVE_KEY = "wild-hearth-save-v1";
const SETTINGS_KEY = "wild-hearth-settings-v1";
const elements = {
  board: document.querySelector("#game-board"),
  grid: document.querySelector("#board-grid"),
  entityLayer: document.querySelector("#entity-layer"),
  phaseChip: document.querySelector("#phase-chip"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseDetail: document.querySelector("#phase-detail"),
  seed: document.querySelector("#seed-value"),
  levelLabel: document.querySelector("#level-label"),
  levelTitle: document.querySelector("#level-title"),
  levelCopy: document.querySelector("#level-copy"),
  actionPoints: document.querySelector("#action-points"),
  wood: document.querySelector("#wood-value"),
  stone: document.querySelector("#stone-value"),
  xp: document.querySelector("#xp-value"),
  selectedTitle: document.querySelector("#selected-title"),
  selectedCopy: document.querySelector("#selected-copy"),
  selectionMeter: document.querySelector("#selection-meter"),
  selectionFootnote: document.querySelector("#selection-footnote"),
  actionHint: document.querySelector("#action-hint"),
  actionBadge: document.querySelector("#action-badge"),
  toolGrid: document.querySelector("#tool-grid"),
  barricadeTool: document.querySelector("#barricade-tool"),
  repairButton: document.querySelector("#repair-button"),
  stoneworkButton: document.querySelector("#stonework-button"),
  endDayButton: document.querySelector("#end-day-button"),
  overlayButton: document.querySelector("#overlay-button"),
  previewCopy: document.querySelector("#preview-copy"),
  pauseButton: document.querySelector("#pause-button"),
  speedButtons: [...document.querySelectorAll("[data-speed]")],
  healthBarsToggle: document.querySelector("#health-bars-toggle"),
  dawnNote: document.querySelector("#dawn-note"),
  continueButton: document.querySelector("#continue-button"),
  eventLog: document.querySelector("#event-log"),
};

let state = Engine.createRun(Engine.DEFAULT_SEED);
let activeTool = "inspect";
let hoverCell = null;
let selected = { kind: "building", id: "b-teepee" };
let planning = false;
let lastFrame = 0;
let accumulator = 0;
let gridSignature = "";
let showHealthBars = false;

try {
  showHealthBars = Boolean(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").showHealthBars);
} catch (error) {
  showHealthBars = false;
}

function createNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setButtonContent(button, label, detail) {
  button.replaceChildren(document.createTextNode(label), createNode("span", "", detail));
}

function place(node, x, y) {
  node.style.left = `${((x + 0.5) / Engine.BOARD.width) * 100}%`;
  node.style.top = `${((y + 0.5) / Engine.BOARD.height) * 100}%`;
}

function addHealthBar(node, entity, tone) {
  if (!showHealthBars) return;
  const health = createNode("span", `health-bar ${tone || ""}`);
  const fill = createNode("span");
  fill.style.width = `${Math.max(0, (entity.health / entity.maxHealth) * 100)}%`;
  health.append(fill);
  node.append(health);
}

function currentLevel() { return Engine.levelFor(state); }
function selectedBuilding() { return selected.kind === "building" ? state.buildings.find((building) => building.id === selected.id && !building.destroyed) : null; }
function selectedBlueprint() { return selected.kind === "blueprint" ? state.blueprints.find((blueprint) => blueprint.id === selected.id) : null; }
function sameCell(left, right) { return left && right && left.x === right.x && left.y === right.y; }
function cellId(x, y) { return `${x},${y}`; }

function toolCellValid(x, y) {
  if (activeTool === "clear") return ["tree", "boulder"].includes(Engine.terrainAt(state, x, y)) || Engine.hasRubble(state, x, y);
  if (activeTool === "scout") return Engine.isPassable(state, x, y);
  if (activeTool === "barricade") return Engine.blueprintPreview(state, "barricade", x, y).valid;
  if (activeTool === "finish") return Boolean(state.blueprints.find((blueprint) => blueprint.x === x && blueprint.y === y));
  return true;
}

function currentPreview() {
  if (activeTool !== "barricade" || !hoverCell || state.phase !== "day") return null;
  return Engine.blueprintPreview(state, "barricade", hoverCell.x, hoverCell.y);
}

function setEvent(message) {
  state.lastEvent = message;
  elements.eventLog.textContent = message;
}

function dispatch(action) {
  const outcome = Engine.dispatch(state, action);
  if (outcome.message) setEvent(outcome.message);
  gridSignature = "";
  render();
  return outcome;
}

function describeCell(x, y) {
  const building = Engine.buildingAt(state, x, y, true);
  if (building) return building.id.startsWith("p-") ? `Unfinished ${Engine.BUILDINGS[building.type].label}` : Engine.BUILDINGS[building.type].label;
  if (Engine.hasRubble(state, x, y)) return "Rubble";
  const terrain = Engine.terrainAt(state, x, y);
  return terrain === "tree" ? "Tree" : terrain === "boulder" ? "Boulder" : "Open meadow";
}

function renderGrid() {
  const preview = currentPreview();
  const previewPath = planning && preview ? new Set(preview.path.map((cell) => cellId(cell.x, cell.y))) : new Set();
  const previewSignature = preview ? `${preview.valid}|${preview.affordable}|${preview.targetId}|${preview.path.map((cell) => cellId(cell.x, cell.y)).join("/")}` : "";
  const signature = [state.topologyVersion, state.phase, activeTool, hoverCell ? cellId(hoverCell.x, hoverCell.y) : "", planning, previewSignature, state.blueprints.map((item) => item.id).join(","), state.rubble.map((item) => cellId(item.x, item.y)).join(",")].join("|");
  if (signature === gridSignature) return;
  gridSignature = signature;
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) {
      const cell = createNode("button", "cell");
      const terrain = Engine.terrainAt(state, x, y);
      cell.type = "button";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.disabled = state.phase !== "day";
      cell.setAttribute("aria-label", describeCell(x, y));
      cell.classList.add(`terrain-${terrain}`);
      if (terrain === "tree") cell.classList.add(`tree-tone-${(x * 7 + y * 3) % 3}`);
      if (sameCell(hoverCell, { x, y }) && state.phase === "day" && activeTool !== "inspect") {
        cell.classList.add("is-hover", toolCellValid(x, y) ? "valid" : "invalid");
      }
      if (previewPath.has(cellId(x, y))) cell.classList.add("is-route");
      if (planning && preview?.targetId === "preview" && sameCell(hoverCell, { x, y })) cell.classList.add("is-target");
      fragment.append(cell);
    }
  }
  elements.grid.replaceChildren(fragment);
}

function addLabel(node, text) {
  const label = createNode("span", "entity-label", text);
  node.append(label);
}

function renderEntities() {
  const fragment = document.createDocumentFragment();
  if (planning && state.phase === "day") {
    const ring = createNode("div", "range-ring");
    const diameter = ((state.scout.attackRange * 2 + 1) / Engine.BOARD.width) * 100;
    ring.style.width = `${diameter}%`;
    ring.style.height = `${diameter}%`;
    place(ring, state.scout.postX, state.scout.postY);
    fragment.append(ring);
  }

  state.rubble.forEach((rubble) => {
    const node = createNode("div", "entity rubble");
    place(node, rubble.x, rubble.y);
    fragment.append(node);
  });

  state.buildings.filter((building) => !building.destroyed).forEach((building) => {
    const recipe = Engine.BUILDINGS[building.type];
    const node = createNode("div", `entity building ${building.type} ${Engine.conditionFor(building)}`);
    if (building.type === "teepee" && state.upgrades.includes("stonework")) node.classList.add("has-stonework");
    place(node, building.x, building.y);
    addHealthBar(node, building, "building-health");
    addLabel(node, recipe.label);
    fragment.append(node);
  });

  state.blueprints.forEach((blueprint) => {
    const node = createNode("div", "entity blueprint");
    place(node, blueprint.x, blueprint.y);
    fragment.append(node);
  });

  const teepee = state.buildings.find((building) => building.type === "teepee" && !building.destroyed);
  if (teepee) {
    const human = createNode("div", `entity human${!["day", "dawn"].includes(state.phase) ? " sleeping" : ""}`);
    place(human, teepee.x - 0.5, teepee.y + 0.55);
    addLabel(human, "Avery");
    fragment.append(human);
  }

  const scout = createNode("div", `entity scout is-${state.scout.mode || "idle"}`);
  place(scout, state.scout.x, state.scout.y);
  addHealthBar(scout, state.scout, "scout-health");
  addLabel(scout, "Scout");
  fragment.append(scout);

  state.enemies.forEach((enemy) => {
    const node = createNode("div", `entity enemy ${enemy.type}`);
    addHealthBar(node, enemy, "enemy-health");
    place(node, enemy.x, enemy.y);
    fragment.append(node);
  });
  elements.entityLayer.replaceChildren(fragment);
}

function renderSelection() {
  const building = selectedBuilding();
  const blueprint = selectedBlueprint();
  if (building) {
    const recipe = Engine.BUILDINGS[building.type];
    const condition = Engine.conditionFor(building).replace("-", " ");
    elements.selectedTitle.textContent = recipe.label;
    elements.selectedCopy.textContent = `${recipe.role} · ${building.health}/${building.maxHealth} health · ${condition}. Repair costs ${recipe.repairCost.wood || 0} wood and one Avery action.`;
    elements.selectionMeter.style.width = `${(building.health / building.maxHealth) * 100}%`;
    elements.selectionFootnote.textContent = recipe.tags.includes("boar-counter") ? "A boar follows the closest reachable building. Put this between the forest and the teepee." : "The teepee is the heart of the clearing.";
    return;
  }
  if (blueprint) {
    const recipe = Engine.BUILDINGS[blueprint.type];
    elements.selectedTitle.textContent = `${recipe.label} blueprint`;
    elements.selectedCopy.textContent = `Materials are committed. Avery must spend one daylight action to finish it before it can block or attract enemies.`;
    elements.selectionMeter.style.width = "35%";
    elements.selectionFootnote.textContent = "Unfinished blueprints are not walls and cannot be refunded.";
    return;
  }
  const toolCopy = {
    inspect: ["Meadow", "Inspect an open cell, tree, boulder, or structure to understand the board."],
    clear: ["Clear terrain", "Spend one Avery action to remove a tree for wood, a boulder for stone, or rubble with no material."],
    scout: ["Place Scout", "Spend one Avery action to set Scout’s night watch radius on an open cell."],
    barricade: ["Wooden barricade", "Spend 2 wood to reserve a blueprint. Finish it with a daylight action before night."],
    finish: ["Finish blueprint", "Click an unfinished blueprint. Avery spends one action to turn it into a real building."],
  };
  elements.selectedTitle.textContent = toolCopy[activeTool][0];
  elements.selectedCopy.textContent = toolCopy[activeTool][1];
  elements.selectionMeter.style.width = "0%";
  elements.selectionFootnote.textContent = "The square grid is deliberate engine structure, but never drawn over the forest.";
}

function renderPreview() {
  const preview = currentPreview();
  if (!preview) {
    elements.previewCopy.textContent = planning
      ? "Overlay active: Scout’s medium watch radius is visible. Select Barricade and hover an open cell to see a predicted route."
      : "Select Barricade and hover an open cell to preview its cost, Scout coverage, and its likely target effect.";
    return;
  }
  if (!preview.valid) {
    elements.previewCopy.textContent = "That footprint is blocked, occupied, or outside the meadow.";
    return;
  }
  if (!preview.affordable) {
    elements.previewCopy.textContent = "That cell is open, but you need 2 wood before you can reserve the barricade blueprint.";
    return;
  }
  const coverage = preview.coverage ? "Scout covers it." : "Scout does not cover it yet.";
  const target = preview.targetId === "preview" ? "The first arrival would choose this barricade first." : `${preview.targetLabel} remains the closer target.`;
  elements.previewCopy.textContent = `Valid blueprint: 2 wood. ${coverage} ${target}`;
}

function renderControls() {
  const level = currentLevel();
  const day = state.phase === "day";
  const night = state.phase === "night";
  const dawn = state.phase === "dawn";
  const lost = state.phase === "lost";
  const building = selectedBuilding();
  elements.barricadeTool.disabled = !state.unlocks.includes("barricade") || !day;
  elements.toolGrid.querySelectorAll("[data-tool]").forEach((button) => {
    const tool = button.dataset.tool;
    button.classList.toggle("is-active", tool === activeTool);
    if (tool !== "barricade") button.disabled = !day;
  });
  elements.repairButton.disabled = !day || !building || building.health >= building.maxHealth || state.resources.wood < 1 || state.actionPoints <= 0;
  elements.stoneworkButton.disabled = !day || !state.unlocks.includes("stonework") || state.upgrades.includes("stonework") || state.resources.stone < 1 || state.actionPoints <= 0;
  elements.endDayButton.disabled = !day;
  setButtonContent(elements.endDayButton, day ? "End day" : "Night in progress", day ? "Begin night watch →" : "Scout is on watch");
  elements.overlayButton.textContent = planning ? "Hide planning overlay" : "Show planning overlay";
  elements.pauseButton.disabled = !night;
  elements.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  elements.speedButtons.forEach((button) => {
    button.disabled = !night;
    button.classList.toggle("is-active", Number(button.dataset.speed) === state.speed);
  });
  elements.healthBarsToggle.checked = showHealthBars;
  elements.actionBadge.textContent = day ? `${state.actionPoints} action${state.actionPoints === 1 ? "" : "s"}` : "Avery is inside";
  elements.actionHint.textContent = day
    ? "Choose a tool, then choose a cell. Blueprints reserve materials; finishing one uses an action."
    : "No night commands. Scout attacks automatically inside his placed range.";
  elements.levelLabel.textContent = `Level ${String(level.number).padStart(2, "0")} · ${level.title}`;
  elements.levelTitle.textContent = day ? "A hearth in a living forest." : `${level.title} is underway.`;
  elements.levelCopy.textContent = day
    ? "The day has no timer. Avery has two actions, then you decide when the night begins."
    : night
      ? `Difficulty budget: ${state.encounter?.difficulty || level.difficulty}. Enemies can arrive from any forest edge and slow down in dense trees.`
      : dawn
        ? "Morning returns after Scout has made it safely back to his post. Review the meadow, then continue when ready."
        : "The homestead needs a new plan before another night.";
  const canAdvance = dawn && state.levelIndex < Engine.LEVELS.length - 1;
  elements.continueButton.classList.toggle("hidden", !(dawn || lost));
  elements.continueButton.disabled = !(dawn || lost);
  setButtonContent(
    elements.continueButton,
    lost ? "Reset this run" : canAdvance ? "Continue to next level" : "Try a new seed",
    lost ? "Plan again" : canAdvance ? "Daylight returns →" : "New meadow →",
  );
  if (dawn) {
    elements.dawnNote.textContent = state.outcome?.copy || "The meadow held through the night.";
  } else if (state.phase === "aftermath") {
    elements.dawnNote.textContent = "Scout is returning to his post. The meadow stays visible while the night settles.";
  } else if (lost) {
    elements.dawnNote.textContent = state.outcome?.copy || "The teepee fell.";
  } else {
    elements.dawnNote.textContent = "";
  }
}

function renderHeader() {
  const day = state.phase === "day";
  const night = state.phase === "night";
  const aftermath = state.phase === "aftermath";
  const dawn = state.phase === "dawn";
  elements.seed.textContent = state.seed;
  elements.phaseChip.classList.toggle("is-night", night || aftermath);
  elements.phaseChip.classList.toggle("is-result", !day && !night);
  elements.board.classList.toggle("night-scene", night || aftermath);
  elements.board.classList.toggle("dawn-scene", dawn);
  elements.phaseLabel.textContent = day ? "Day planning" : night ? state.paused ? "Night paused" : "Night watch" : aftermath ? "Night settling" : state.phase === "lost" ? "Homestead lost" : "Dawn held";
  elements.phaseDetail.textContent = day ? "Untimed" : night ? `${state.speed}× fixed tick` : aftermath ? "Scout returning" : "Seed recorded";
  elements.actionPoints.textContent = state.actionPoints;
  elements.wood.textContent = state.resources.wood;
  elements.stone.textContent = state.resources.stone;
  elements.xp.textContent = state.xp;
  elements.eventLog.textContent = state.lastEvent;
}

function render() {
  renderHeader();
  renderGrid();
  renderEntities();
  renderSelection();
  renderPreview();
  renderControls();
}

function clickCell(x, y) {
  if (state.phase !== "day") return;
  const occupied = Engine.buildingAt(state, x, y, true);
  if (activeTool === "inspect") {
    if (occupied) selected = { kind: occupied.id.startsWith("p-") ? "blueprint" : "building", id: occupied.id };
    else selected = { kind: "none", id: null };
    render();
    return;
  }
  if (activeTool === "clear") dispatch({ type: "clear", x, y });
  if (activeTool === "scout") dispatch({ type: "scout", x, y });
  if (activeTool === "barricade") dispatch({ type: "blueprint", buildingType: "barricade", x, y });
  if (activeTool === "finish") {
    const blueprint = state.blueprints.find((item) => item.x === x && item.y === y);
    if (blueprint) {
      selected = { kind: "building", id: `b-${state.nextEntityId}` };
      dispatch({ type: "finish", id: blueprint.id });
    } else setEvent("Choose an unfinished blueprint to finish.");
  }
}

function resetRun(seed) {
  state = Engine.createRun(seed || state.seed);
  activeTool = "inspect";
  hoverCell = null;
  selected = { kind: "building", id: "b-teepee" };
  planning = false;
  accumulator = 0;
  gridSignature = "";
  render();
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, Engine.serialize(state));
    setEvent(`Saved ${state.phase === "day" ? "day plan" : "night watch"} for seed ${state.seed}.`);
  } catch (error) {
    setEvent("This browser could not save the meadow locally.");
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) { setEvent("No saved meadow is available in this browser."); return; }
    state = Engine.hydrate(saved);
    activeTool = "inspect";
    selected = { kind: "building", id: state.buildings.find((building) => building.type === "teepee")?.id || null };
    hoverCell = null;
    accumulator = 0;
    gridSignature = "";
    setEvent(`Loaded seed ${state.seed}.`);
    render();
  } catch (error) {
    setEvent("That saved meadow is invalid for this version. A new run is safer.");
  }
}

elements.grid.addEventListener("pointermove", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const next = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
  if (!sameCell(hoverCell, next)) {
    hoverCell = next;
    gridSignature = "";
    render();
  }
});
elements.grid.addEventListener("pointerleave", () => {
  if (hoverCell) { hoverCell = null; gridSignature = ""; render(); }
});
elements.grid.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  clickCell(Number(cell.dataset.x), Number(cell.dataset.y));
});
elements.toolGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool]");
  if (!button || button.disabled) return;
  activeTool = button.dataset.tool;
  selected = activeTool === "inspect" ? selected : { kind: "none", id: null };
  gridSignature = "";
  render();
});
elements.repairButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (building) dispatch({ type: "repair", id: building.id });
});
elements.stoneworkButton.addEventListener("click", () => dispatch({ type: "stonework" }));
elements.endDayButton.addEventListener("click", () => dispatch({ type: "endDay" }));
elements.overlayButton.addEventListener("click", () => { planning = !planning; gridSignature = ""; render(); });
elements.pauseButton.addEventListener("click", () => dispatch({ type: "pause" }));
elements.speedButtons.forEach((button) => button.addEventListener("click", () => dispatch({ type: "speed", speed: Number(button.dataset.speed) })));
elements.healthBarsToggle.addEventListener("change", () => {
  showHealthBars = elements.healthBarsToggle.checked;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showHealthBars })); } catch (error) { /* The setting still works for this session. */ }
  render();
});
elements.continueButton.addEventListener("click", () => {
  if (state.phase === "dawn" && state.levelIndex < Engine.LEVELS.length - 1) dispatch({ type: "nextLevel" });
  else resetRun(Engine.nextSeed(state.seed));
});
document.querySelector("#save-button").addEventListener("click", saveGame);
document.querySelector("#load-button").addEventListener("click", loadGame);
document.querySelector("#new-seed-button").addEventListener("click", () => resetRun(Engine.nextSeed(state.seed)));
document.querySelector("#reset-button").addEventListener("click", () => resetRun(state.seed));
document.querySelector("#brand-reset").addEventListener("click", (event) => { event.preventDefault(); resetRun(state.seed); });
function frame(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const elapsed = Math.min(timestamp - lastFrame, 250);
  lastFrame = timestamp;
  if (["night", "aftermath"].includes(state.phase) && !state.paused) {
    accumulator += (elapsed / 1000) * Engine.TICK_RATE * state.speed;
    let steps = 0;
    while (accumulator >= 1 && steps < 12 && ["night", "aftermath"].includes(state.phase)) {
      Engine.advanceTick(state);
      accumulator -= 1;
      steps += 1;
    }
  }
  render();
  requestAnimationFrame(frame);
}

render();
requestAnimationFrame(frame);
