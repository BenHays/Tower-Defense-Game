const Engine = window.WildHearthEngine;

if (!Engine) throw new Error("Wild Hearth engine did not load.");

const SAVE_KEY = "wild-hearth-save-v4";
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
  xp: document.querySelector("#xp-value"),
  selectedTitle: document.querySelector("#selected-title"),
  selectedCopy: document.querySelector("#selected-copy"),
  selectionMeter: document.querySelector("#selection-meter"),
  selectionFootnote: document.querySelector("#selection-footnote"),
  actionHint: document.querySelector("#action-hint"),
  actionBadge: document.querySelector("#action-badge"),
  toolGrid: document.querySelector("#tool-grid"),
  stickLauncherTool: document.querySelector("#stick-launcher-tool"),
  repairButton: document.querySelector("#repair-button"),
  upgradeButton: document.querySelector("#upgrade-button"),
  endDayButton: document.querySelector("#end-day-button"),
  overlayButton: document.querySelector("#overlay-button"),
  previewCopy: document.querySelector("#preview-copy"),
  techTitle: document.querySelector("#tech-title"),
  techCopy: document.querySelector("#tech-copy"),
  researchButton: document.querySelector("#research-button"),
  pauseButton: document.querySelector("#pause-button"),
  speedButtons: [...document.querySelectorAll("[data-speed]")],
  healthBarsToggle: document.querySelector("#health-bars-toggle"),
  eventLog: document.querySelector("#event-log"),
};

let state = Engine.createRun(Engine.DEFAULT_SEED);
let activeTool = "none";
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
function selectedCell() { return selected.kind === "cell" ? selected : null; }
function sameCell(left, right) { return left && right && left.x === right.x && left.y === right.y; }
function cellId(x, y) { return `${x},${y}`; }

function toolCellValid(x, y) {
  if (activeTool === "clear") return Engine.terrainAt(state, x, y) === "tree" || Engine.hasRubble(state, x, y);
  if (activeTool === "scout") return Engine.isPassable(state, x, y);
  if (activeTool === "stickLauncher") return Engine.buildPreview(state, "stickLauncher", x, y).valid;
  return false;
}

function currentPreview() {
  if (activeTool !== "stickLauncher" || !hoverCell || state.phase !== "day") return null;
  return Engine.buildPreview(state, "stickLauncher", hoverCell.x, hoverCell.y);
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
  const building = Engine.buildingAt(state, x, y);
  if (building) return Engine.BUILDINGS[building.type].label;
  if (Engine.hasRubble(state, x, y)) return "Rubble";
  const terrain = Engine.terrainAt(state, x, y);
  return terrain === "tree" ? "Tree" : "Open meadow";
}

function renderGrid() {
  const preview = currentPreview();
  const previewPath = planning && preview ? new Set(preview.path.map((cell) => cellId(cell.x, cell.y))) : new Set();
  const previewSignature = preview ? `${preview.valid}|${preview.affordable}|${preview.targetId}|${preview.path.map((cell) => cellId(cell.x, cell.y)).join("/")}` : "";
  const chosen = selectedCell();
  const signature = [state.topologyVersion, state.phase, activeTool, hoverCell ? cellId(hoverCell.x, hoverCell.y) : "", chosen ? cellId(chosen.x, chosen.y) : "", planning, previewSignature, state.rubble.map((item) => cellId(item.x, item.y)).join(",")].join("|");
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
      if (sameCell(chosen, { x, y })) cell.classList.add("is-selected");
      if (sameCell(hoverCell, { x, y }) && state.phase === "day" && activeTool !== "none") {
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

  const focusedTower = selectedBuilding();
  if (planning && focusedTower && ["stickLauncher", "arrowShooter"].includes(focusedTower.type)) {
    const recipe = Engine.BUILDINGS[focusedTower.type];
    const ring = createNode("div", "range-ring tower-range");
    const diameter = ((recipe.attackRange * 2 + 1) / Engine.BOARD.width) * 100;
    ring.style.width = `${diameter}%`;
    ring.style.height = `${diameter}%`;
    place(ring, focusedTower.x, focusedTower.y);
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
    if (selected.kind === "building" && selected.id === building.id) node.classList.add("is-selected");
    if (building.firingTicks > 0) node.classList.add("is-firing");
    place(node, building.x, building.y);
    addHealthBar(node, building, "building-health");
    addLabel(node, recipe.label);
    fragment.append(node);
  });

  const teepee = state.buildings.find((building) => building.type === "teepee" && !building.destroyed);
  if (teepee) {
    const human = createNode("div", `entity human${state.phase !== "day" ? " sleeping" : ""}`);
    place(human, teepee.x - 0.5, teepee.y + 0.55);
    addLabel(human, "Avery");
    fragment.append(human);
  }

  const scout = createNode("div", `entity scout is-${state.scout.mode || "idle"}`);
  place(scout, state.scout.x, state.scout.y);
  addLabel(scout, "Scout");
  fragment.append(scout);

  state.enemies.forEach((enemy) => {
    const node = createNode("div", `entity enemy ${enemy.type}`);
    if (enemy.intent === "sneaking") node.classList.add("is-sneaking");
    addHealthBar(node, enemy, "enemy-health");
    place(node, enemy.x, enemy.y);
    fragment.append(node);
  });
  state.projectiles.forEach((projectile) => {
    const node = createNode("div", `entity projectile ${projectile.type}`);
    node.style.setProperty("--projectile-angle", `${projectile.angle || 0}deg`);
    place(node, projectile.x, projectile.y);
    fragment.append(node);
  });
  state.impacts.forEach((impact) => {
    const node = createNode("div", `entity impact ${impact.type}`);
    place(node, impact.x, impact.y);
    fragment.append(node);
  });
  elements.entityLayer.replaceChildren(fragment);
}

function renderSelection() {
  const building = selectedBuilding();
  if (building) {
    const recipe = Engine.BUILDINGS[building.type];
    const condition = Engine.conditionFor(building).replace("-", " ");
    elements.selectedTitle.textContent = recipe.label;
    if (["stickLauncher", "arrowShooter"].includes(building.type)) {
      elements.selectedCopy.textContent = `${recipe.role} · ${recipe.damage} damage · ${recipe.attackSpeed}/sec · ${recipe.attackRange} range · ${building.health}/${building.maxHealth} health · ${condition}.`;
      elements.selectionFootnote.textContent = building.type === "stickLauncher"
        ? Engine.hasResearch(state, "arrowcraft")
          ? "Arrowcraft is ready: upgrade this launcher for 4 wood and Avery’s full day."
          : "Research Arrowcraft with XP to convert this into a stronger Arrow Shooter."
        : "Arrowcraft upgrade: 1.5× the launcher’s damage, attack speed, and range.";
    } else {
      elements.selectedCopy.textContent = `${recipe.role} · ${building.health}/${building.maxHealth} health · ${condition}. Repair costs ${recipe.repairCost.wood || 0} wood and one Avery action.`;
      elements.selectionFootnote.textContent = "The teepee is the heart of the clearing.";
    }
    elements.selectionMeter.style.width = `${(building.health / building.maxHealth) * 100}%`;
    return;
  }
  const cell = selectedCell();
  if (cell) {
    const terrain = Engine.terrainAt(state, cell.x, cell.y);
    const rubble = Engine.hasRubble(state, cell.x, cell.y);
    elements.selectedTitle.textContent = rubble ? "Rubble" : terrain === "tree" ? "Tree" : "Open clearing";
    elements.selectedCopy.textContent = rubble
      ? "Clear rubble for one Avery action to reopen this site."
      : terrain === "tree"
        ? "Clear this tree for 2 Avery actions to gain 2 wood and make a build site."
        : "Open ground: a future building can stand here.";
    elements.selectionMeter.style.width = "0%";
    elements.selectionFootnote.textContent = "Clicking the meadow inspects it. Choose a tool only when you want Avery to act.";
    return;
  }
  const toolCopy = {
    none: ["Hearth Meadow", "Click terrain or a building to inspect it. Choose a daytime tool when you are ready to act."],
    clear: ["Clear tree", "Clearing one tree spends both Avery actions and gains 2 wood. Rubble uses one action."],
    scout: ["Place Scout", "Spend one Avery action to set Scout’s night watch radius on an open cell."],
    stickLauncher: ["Stick launcher", "Spend 1 wood and Avery’s full day to build a simple outward defense."],
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
      ? "Overlay active: Scout’s medium watch radius is visible. Select Stick Launcher and hover an open cell to see its likely target effect."
      : "Select Stick Launcher and hover an open cell to preview its cost, Scout coverage, and likely target effect.";
    return;
  }
  if (!preview.valid) {
    elements.previewCopy.textContent = "That footprint is blocked, occupied, or outside the meadow.";
    return;
  }
  if (!preview.affordable) {
    elements.previewCopy.textContent = "That cell is open, but you need 1 wood before Avery can build the Stick Launcher.";
    return;
  }
  const coverage = preview.coverage ? "Scout covers it." : "Scout does not cover it yet.";
  const target = preview.targetId === "preview" ? "The first arrival would choose this launcher first." : `${preview.targetLabel} remains the closer target.`;
  elements.previewCopy.textContent = `Build now: 1 wood + Avery’s full day. ${coverage} ${target}`;
}

function renderTechnology() {
  const research = Engine.techAvailability(state, "arrowcraft");
  const node = research.node || Engine.TECH_TREE.arrowcraft;
  elements.techTitle.textContent = node.label;
  if (Engine.hasResearch(state, "arrowcraft")) {
    elements.techCopy.textContent = "Researched. Select a Stick Launcher to upgrade it into an Arrow Shooter for 4 wood.";
    setButtonContent(elements.researchButton, "Arrowcraft researched", "ready");
    elements.researchButton.disabled = true;
    return;
  }
  elements.techCopy.textContent = `${node.copy} ${research.reason}`;
  setButtonContent(elements.researchButton, "Research Arrowcraft", `${node.costXp} XP`);
  elements.researchButton.disabled = state.phase !== "day" || !research.available;
}

function renderControls() {
  const level = currentLevel();
  const day = state.phase === "day";
  const night = state.phase === "night";
  const building = selectedBuilding();
  elements.stickLauncherTool.disabled = !state.unlocks.includes("stickLauncher") || !day;
  elements.toolGrid.querySelectorAll("[data-tool]").forEach((button) => {
    const tool = button.dataset.tool;
    button.classList.toggle("is-active", tool === activeTool);
    if (tool !== "stickLauncher") button.disabled = !day;
  });
  elements.repairButton.disabled = !day || !building || building.health >= building.maxHealth || state.resources.wood < 1 || state.actionPoints <= 0;
  elements.upgradeButton.disabled = !day || !building || building.type !== "stickLauncher" || !Engine.hasResearch(state, "arrowcraft") || state.resources.wood < 4 || state.actionPoints < 2;
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
    ? "Trees and first-line buildings each use Avery’s full day. Repairs and Scout placement use one action."
    : "No night commands. Launchers fire outward; Scout is the final line near the teepee.";
  elements.levelLabel.textContent = `Level ${String(level.number).padStart(2, "0")} · ${level.title}`;
  elements.levelTitle.textContent = day ? "A hearth in a living forest." : `${level.title} is underway.`;
  elements.levelCopy.textContent = day
    ? level.number === 1
      ? "Clear one tree to bank the wood for tomorrow. Scout can handle this first raccoon alone."
      : `Medium threat ${level.threatBudget}. Every night grows by 25%, rounded up; place defenses before Scout is overwhelmed.`
    : night
      ? `Medium threat ${state.encounter?.threatBudget || level.threatBudget}. Enemies can arrive from any forest edge and slow down in dense trees.`
      : state.phase === "aftermath"
        ? "Scout is returning to his post. The next day begins automatically once he is home."
        : "The homestead needs a new plan before another night.";
}

function renderHeader() {
  const day = state.phase === "day";
  const night = state.phase === "night";
  const aftermath = state.phase === "aftermath";
  elements.seed.textContent = state.seed;
  elements.phaseChip.classList.toggle("is-night", night || aftermath);
  elements.phaseChip.classList.toggle("is-result", !day && !night && !aftermath);
  elements.board.classList.toggle("night-scene", night || aftermath);
  elements.board.classList.remove("dawn-scene");
  elements.phaseLabel.textContent = day ? "Day planning" : night ? state.paused ? "Night paused" : "Night watch" : aftermath ? "Night settling" : "Homestead lost";
  elements.phaseDetail.textContent = day ? "Untimed" : night ? `${state.speed}× fixed tick` : aftermath ? "Scout returning" : "Seed recorded";
  elements.actionPoints.textContent = state.actionPoints;
  elements.wood.textContent = state.resources.wood;
  elements.xp.textContent = state.xp;
  elements.eventLog.textContent = state.lastEvent;
}

function render() {
  renderHeader();
  renderGrid();
  renderEntities();
  renderSelection();
  renderPreview();
  renderTechnology();
  renderControls();
}

function clickCell(x, y) {
  if (state.phase !== "day") return;
  const occupied = Engine.buildingAt(state, x, y);
  if (occupied) {
    selected = { kind: "building", id: occupied.id };
    activeTool = "none";
    render();
    return;
  }
  if (activeTool === "clear") {
    selected = { kind: "cell", x, y };
    activeTool = "none";
    dispatch({ type: "clear", x, y });
    return;
  }
  if (activeTool === "scout") {
    activeTool = "none";
    dispatch({ type: "scout", x, y });
    return;
  }
  if (activeTool === "stickLauncher") {
    activeTool = "none";
    const outcome = dispatch({ type: "build", buildingType: "stickLauncher", x, y });
    if (outcome.ok) {
      const building = Engine.buildingAt(state, x, y);
      if (building) selected = { kind: "building", id: building.id };
      render();
    }
    return;
  }
  selected = { kind: "cell", x, y };
  render();
}

function resetRun(seed) {
  state = Engine.createRun(seed || state.seed);
  activeTool = "none";
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
    activeTool = "none";
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
  selected = { kind: "none", id: null };
  gridSignature = "";
  render();
});
elements.repairButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (building) dispatch({ type: "repair", id: building.id });
});
elements.upgradeButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (building) dispatch({ type: "upgradeLauncher", id: building.id });
});
elements.researchButton.addEventListener("click", () => dispatch({ type: "research", nodeId: "arrowcraft" }));
elements.endDayButton.addEventListener("click", () => dispatch({ type: "endDay" }));
elements.overlayButton.addEventListener("click", () => { planning = !planning; gridSignature = ""; render(); });
elements.pauseButton.addEventListener("click", () => dispatch({ type: "pause" }));
elements.speedButtons.forEach((button) => button.addEventListener("click", () => dispatch({ type: "speed", speed: Number(button.dataset.speed) })));
elements.healthBarsToggle.addEventListener("change", () => {
  showHealthBars = elements.healthBarsToggle.checked;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showHealthBars })); } catch (error) { /* The setting still works for this session. */ }
  render();
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
