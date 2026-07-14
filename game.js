const Engine = window.WildHearthEngine;

if (!Engine) throw new Error("Wild Hearth engine did not load.");

const SAVE_KEY = "wild-hearth-save-v9";
const SETTINGS_KEY = "wild-hearth-settings-v1";
const elements = {
  board: document.querySelector("#game-board"),
  grid: document.querySelector("#board-grid"),
  entityLayer: document.querySelector("#entity-layer"),
  phaseChip: document.querySelector("#phase-chip"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseDetail: document.querySelector("#phase-detail"),
  boardCaption: document.querySelector("#board-caption"),
  seed: document.querySelector("#seed-value"),
  levelLabel: document.querySelector("#level-label"),
  levelCopy: document.querySelector("#level-copy"),
  actionPoints: document.querySelector("#action-points"),
  wood: document.querySelector("#wood-value"),
  xp: document.querySelector("#xp-value"),
  controlPanel: document.querySelector("#control-panel"),
  actionCard: document.querySelector("#action-card"),
  planningCard: document.querySelector("#planning-card"),
  actionHint: document.querySelector("#action-hint"),
  actionBadge: document.querySelector("#action-badge"),
  dayActionList: document.querySelector("#day-action-list"),
  buildCard: document.querySelector("#build-card"),
  buildList: document.querySelector("#build-list"),
  toolbarSmaller: document.querySelector("#toolbar-smaller"),
  toolbarLarger: document.querySelector("#toolbar-larger"),
  toolbarSizeLabel: document.querySelector("#toolbar-size-label"),
  actionRow: document.querySelector("#action-row"),
  shelterButton: document.querySelector("#shelter-button"),
  repairButton: document.querySelector("#repair-button"),
  upgradeButton: document.querySelector("#upgrade-button"),
  endDayButton: document.querySelector("#end-day-button"),
  overlayButton: document.querySelector("#overlay-button"),
  previewCopy: document.querySelector("#preview-copy"),
  techButton: document.querySelector("#tech-button"),
  techXp: document.querySelector("#tech-xp"),
  techDialog: document.querySelector("#tech-dialog"),
  techCloseButton: document.querySelector("#tech-close-button"),
  techDialogSubtitle: document.querySelector("#tech-dialog-subtitle"),
  techTitle: document.querySelector("#tech-title"),
  techCopy: document.querySelector("#tech-copy"),
  techBranches: document.querySelector("#tech-branches"),
  researchButton: document.querySelector("#research-button"),
  earlyEndDialog: document.querySelector("#early-end-dialog"),
  earlyEndDialogCopy: document.querySelector("#early-end-dialog-copy"),
  earlyEndCancel: document.querySelector("#early-end-cancel"),
  earlyEndConfirm: document.querySelector("#early-end-confirm"),
  dawnReport: document.querySelector("#dawn-report"),
  utilityLabel: document.querySelector("#utility-label"),
  pauseButton: document.querySelector("#pause-button"),
  speedButtons: [...document.querySelectorAll("[data-speed]")],
  speedControls: document.querySelector("#speed-controls"),
  healthBarsToggle: document.querySelector("#health-bars-toggle"),
  healthBarsSetting: document.querySelector(".setting-toggle"),
  eventLogWrap: document.querySelector("#event-log-wrap"),
  eventLog: document.querySelector("#event-log"),
};

let state = Engine.createRun(Engine.DEFAULT_SEED);
let activeTool = "none";
let hoverCell = null;
let selected = { kind: "none", id: null };
let planning = false;
let lastFrame = 0;
let accumulator = 0;
let gridSignature = "";
let showHealthBars = false;
let activeTechId = null;
const gridCells = new Map();
let techSignature = "";
let pointerActivation = null;
let preferredSpeed = 1;
let lastFocusedElement = null;
let lastEarlyEndFocusedElement = null;
let earlyEndWarningDay = null;
const TOOLBAR_SIZES = ["compact", "standard", "large"];
let toolbarSize = "compact";
let buildListSignature = "";
const BUILD_CARD_ICONS = {
  stickLauncher: "stick-launcher-icon",
  potatoGun: "potato-gun-icon",
};

try {
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  showHealthBars = Boolean(settings.showHealthBars);
  preferredSpeed = [1, 2].includes(settings.preferredSpeed) ? settings.preferredSpeed : 1;
  toolbarSize = TOOLBAR_SIZES.includes(settings.toolbarSize) ? settings.toolbarSize : "compact";
} catch (error) {
  showHealthBars = false;
  preferredSpeed = 1;
  toolbarSize = "compact";
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showHealthBars, preferredSpeed, toolbarSize }));
  } catch (error) { /* Settings still apply for this browser session. */ }
}

function syncToolbarSizeControls() {
  const index = TOOLBAR_SIZES.indexOf(toolbarSize);
  document.documentElement.dataset.toolbarSize = toolbarSize;
  elements.toolbarSizeLabel.textContent = toolbarSize;
  elements.toolbarSmaller.disabled = index === 0;
  elements.toolbarLarger.disabled = index === TOOLBAR_SIZES.length - 1;
}

function changeToolbarSize(offset) {
  const current = TOOLBAR_SIZES.indexOf(toolbarSize);
  const next = Math.max(0, Math.min(TOOLBAR_SIZES.length - 1, current + offset));
  if (next === current) return;
  toolbarSize = TOOLBAR_SIZES[next];
  syncToolbarSizeControls();
  saveSettings();
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

function addHealthBar(node, entity, tone, colorByHealth = false) {
  if (!showHealthBars) return;
  const condition = colorByHealth ? healthTone(entity) : "";
  const health = createNode("span", `health-bar ${tone || ""} ${condition}`);
  const fill = createNode("span");
  fill.style.width = `${Math.max(0, (entity.health / entity.maxHealth) * 100)}%`;
  health.append(fill);
  node.append(health);
}

function healthTone(entity) {
  const ratio = entity.health / entity.maxHealth;
  if (ratio < 0.3) return "red";
  if (ratio < 1) return "yellow";
  return "green";
}

function currentLevel() { return Engine.levelFor(state); }
function selectedBuilding() { return selected.kind === "building" ? state.buildings.find((building) => building.id === selected.id && !building.destroyed) : null; }
function selectedScout() { return selected.kind === "scout" ? state.scout : null; }
function availableRefit(building) {
  if (!building) return null;
  const refits = Object.values(Engine.BUILDINGS[building.type]?.refits || {});
  return refits.find((refit) => Engine.hasBuildingRefit(state, building.type, refit.id) && !Engine.buildingRefits(building).includes(refit.id)) || null;
}
function selectedCell() { return selected.kind === "cell" ? selected : null; }
function sameCell(left, right) { return left && right && left.x === right.x && left.y === right.y; }
function cellId(x, y) { return `${x},${y}`; }
function isBuildTool(tool) { return Boolean(Engine.BUILDINGS[tool]) && !["teepee", "arrowShooter"].includes(tool); }
function towerRecipe(type) { return Engine.TOWER_TYPES.includes(type) ? Engine.BUILDINGS[type] : null; }
function needsShelter() { return !Engine.hasShelter(state); }

function buildCostCopy(recipe) {
  const wood = recipe.cost?.wood || 0;
  return wood === 0 ? "Free" : `${wood} wood`;
}

function renderBuildList() {
  const unlockedTools = state.unlocks.filter(isBuildTool);
  const signature = unlockedTools.join("|");
  if (isBuildTool(activeTool) && !unlockedTools.includes(activeTool)) activeTool = "none";
  if (signature === buildListSignature) return unlockedTools;

  const cards = unlockedTools.map((tool) => {
    const recipe = Engine.BUILDINGS[tool];
    const button = createNode("button", "build-button");
    button.type = "button";
    button.dataset.tool = tool;
    const actionCost = recipe.actionCost || 1;
    button.setAttribute("aria-label", `Build ${recipe.label}, ${buildCostCopy(recipe)}, ${actionCost} action${actionCost === 1 ? "" : "s"}`);
    const icon = createNode("span", `build-icon ${BUILD_CARD_ICONS[tool] || "structure-icon"}`);
    icon.setAttribute("aria-hidden", "true");
    const copy = createNode("span", "build-copy");
    copy.append(createNode("strong", "", recipe.label), createNode("small", "", buildCostCopy(recipe)));
    button.append(icon, copy);
    return button;
  });
  elements.buildList.replaceChildren(...cards);
  buildListSignature = signature;
  return unlockedTools;
}

function toolCellValid(x, y) {
  return Engine.toolPreview(state, activeTool, x, y).valid;
}

function currentPreview() {
  if (activeTool === "none" || !hoverCell || state.phase !== "day") return null;
  return Engine.toolPreview(state, activeTool, hoverCell.x, hoverCell.y);
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

function openTechnology() {
  if (needsShelter()) return;
  lastFocusedElement = document.activeElement;
  elements.techDialog.hidden = false;
  document.body.classList.add("tech-dialog-open");
  renderTechnology();
  requestAnimationFrame(() => elements.techCloseButton.focus());
}

function closeTechnology(options = {}) {
  if (elements.techDialog.hidden) return;
  elements.techDialog.hidden = true;
  document.body.classList.remove("tech-dialog-open");
  if (options.restoreFocus !== false && lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  lastFocusedElement = null;
}

function setPreferredSpeed(speed) {
  if (![1, 2].includes(speed) || needsShelter()) return;
  preferredSpeed = speed;
  saveSettings();
  dispatch({ type: "speed", speed });
}

function endDayNow() {
  const outcome = dispatch({ type: "endDay" });
  if (outcome.ok && state.phase === "night") {
    state.speed = preferredSpeed;
    render();
  }
}

function earlyEndDayKey() {
  return `${state.seed}:${state.levelIndex}`;
}

function closeEarlyEndWarning(options = {}) {
  if (elements.earlyEndDialog.hidden) return;
  elements.earlyEndDialog.hidden = true;
  document.body.classList.remove("early-end-dialog-open");
  if (options.restoreFocus !== false && lastEarlyEndFocusedElement instanceof HTMLElement) lastEarlyEndFocusedElement.focus();
  lastEarlyEndFocusedElement = null;
}

function openEarlyEndWarning() {
  const unusedActions = state.actionPoints;
  earlyEndWarningDay = earlyEndDayKey();
  lastEarlyEndFocusedElement = document.activeElement;
  elements.earlyEndDialogCopy.textContent = `You still have ${unusedActions} unused ${unusedActions === 1 ? "action" : "actions"}. Are you sure you want to begin the night watch?`;
  elements.earlyEndDialog.hidden = false;
  document.body.classList.add("early-end-dialog-open");
  requestAnimationFrame(() => elements.earlyEndCancel.focus());
}

function beginNight() {
  const shouldWarn = state.phase === "day"
    && state.shelterBuilt
    && state.actionPoints > 0
    && earlyEndWarningDay !== earlyEndDayKey();
  if (shouldWarn) {
    openEarlyEndWarning();
    return;
  }
  endDayNow();
}

function describeCell(x, y) {
  const building = Engine.buildingAt(state, x, y);
  if (building) return Engine.BUILDINGS[building.type].label;
  if (Engine.hasRubble(state, x, y)) return "Rubble";
  const terrain = Engine.terrainAt(state, x, y);
  return terrain === "tree" ? "Tree" : terrain === "cleared" ? "Cleared grass" : "Open grass";
}

function ensureGrid() {
  elements.grid.style.setProperty("--board-columns", String(Engine.BOARD.width));
  elements.grid.style.setProperty("--board-rows", String(Engine.BOARD.height));
  if (gridCells.size) return;
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) {
      const cell = createNode("button", "cell");
      cell.type = "button";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.addEventListener("pointerdown", (event) => {
        if (event.button === 2 || cell.disabled) return;
        pointerActivation = { x: String(x), y: String(y), until: Date.now() + 500 };
        clickCell(x, y);
      });
      cell.addEventListener("click", () => {
        const isPointerFollowup = pointerActivation
          && pointerActivation.x === String(x)
          && pointerActivation.y === String(y)
          && Date.now() <= pointerActivation.until;
        pointerActivation = null;
        if (!isPointerFollowup) clickCell(x, y);
      });
      gridCells.set(cellId(x, y), cell);
      fragment.append(cell);
    }
  }
  elements.grid.replaceChildren(fragment);
}

function patchCell(cell, x, y, chosen, previewPath, preview) {
  const terrain = Engine.terrainAt(state, x, y);
  const wasTree = cell.dataset.terrain === "tree";
  cell.dataset.terrain = terrain;
  cell.disabled = state.phase !== "day" || needsShelter();
  cell.setAttribute("aria-label", describeCell(x, y));
  cell.className = `cell terrain-${terrain}`;
  if (terrain === "tree") {
    cell.classList.add(`tree-tone-${(x * 7 + y * 3) % 6}`);
    if (!wasTree) {
      const canopy = createNode("span", "tree-canopy");
      canopy.setAttribute("aria-hidden", "true");
      cell.replaceChildren(canopy);
    }
  } else if (wasTree) {
    cell.replaceChildren();
  }
  if (sameCell(chosen, { x, y })) cell.classList.add("is-selected");
  if (sameCell(hoverCell, { x, y }) && state.phase === "day" && activeTool !== "none") {
    cell.classList.add("is-hover", preview?.valid ? "valid" : "invalid");
  }
  if (previewPath.has(cellId(x, y))) cell.classList.add("is-route");
  if (planning && preview?.targetId === "preview" && sameCell(hoverCell, { x, y })) cell.classList.add("is-target");
}

function renderGrid() {
  ensureGrid();
  const preview = currentPreview();
  const previewPath = planning && Array.isArray(preview?.path) ? new Set(preview.path.map((cell) => cellId(cell.x, cell.y))) : new Set();
  const previewSignature = preview ? `${preview.valid}|${preview.affordable}|${preview.targetId || ""}|${(preview.path || []).map((cell) => cellId(cell.x, cell.y)).join("/")}` : "";
  const focusedBuilding = selectedBuilding();
  const scout = selectedScout();
  const chosen = selectedCell() || (focusedBuilding ? { x: focusedBuilding.x, y: focusedBuilding.y } : scout ? { x: Math.round(scout.x), y: Math.round(scout.y) } : null);
  const signature = [state.topologyVersion, state.phase, state.actionPoints, state.resources.wood, activeTool, hoverCell ? cellId(hoverCell.x, hoverCell.y) : "", chosen ? cellId(chosen.x, chosen.y) : "", planning, previewSignature, state.rubble.map((item) => cellId(item.x, item.y)).join(",")].join("|");
  if (signature === gridSignature) return;
  gridSignature = signature;
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) patchCell(gridCells.get(cellId(x, y)), x, y, chosen, previewPath, preview);
  }
}

function addLabel(node, text) {
  const label = createNode("span", "entity-label", text);
  node.append(label);
}

function renderEntities() {
  const fragment = document.createDocumentFragment();
  if (planning && state.phase === "day") {
    const scoutStats = Engine.unitStats(state, "scout");
    const ring = createNode("div", "range-ring");
    const diameter = ((scoutStats.attackRange * 2 + 1) / Engine.BOARD.width) * 100;
    ring.style.width = `${diameter}%`;
    ring.style.height = `${diameter}%`;
    place(ring, state.scout.postX, state.scout.postY);
    fragment.append(ring);
  }

  const focusedTower = selectedBuilding();
  if (planning && focusedTower && towerRecipe(focusedTower.type)) {
    const recipe = Engine.buildingCombatStats(state, focusedTower.type);
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

  if (needsShelter()) {
    const shelterSite = createNode("div", "entity shelter-site");
    place(shelterSite, Engine.SHELTER_SITE.x, Engine.SHELTER_SITE.y);
    addLabel(shelterSite, "Shelter site");
    fragment.append(shelterSite);
  }

  state.buildings.filter((building) => !building.destroyed).forEach((building) => {
    const recipe = Engine.BUILDINGS[building.type];
    const node = createNode("div", `entity building ${building.type} ${Engine.conditionFor(building)}`);
    if (selected.kind === "building" && selected.id === building.id) node.classList.add("is-selected");
    if (building.firingTicks > 0) node.classList.add("is-firing");
    if (building.hitTicks > 0) node.classList.add("is-hit");
    place(node, building.x, building.y);
    addHealthBar(node, building, "building-health", true);
    fragment.append(node);
  });

  const scout = createNode("div", `entity scout is-${state.scout.mode || "idle"}`);
  if (selectedScout()) scout.classList.add("is-selected");
  place(scout, state.scout.x, state.scout.y);
  fragment.append(scout);

  state.enemies.forEach((enemy) => {
    const node = createNode("div", `entity enemy ${enemy.type}`);
    if (enemy.intent === "sneaking") node.classList.add("is-sneaking");
    if (enemy.inWarmth) node.classList.add("is-warmed");
    if (enemy.knockbackTicks > 0) node.classList.add("is-knocked");
    if (enemy.hitTicks > 0) node.classList.add("is-hit");
    if (enemy.statuses?.movementSlow?.sources && Object.keys(enemy.statuses.movementSlow.sources).length) node.classList.add("is-slowed");
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
  state.remains.forEach((remains) => {
    const node = createNode("div", `entity remains ${remains.type}`);
    place(node, remains.x, remains.y);
    fragment.append(node);
  });
  const preview = currentPreview();
  if (state.phase === "day" && hoverCell && activeTool !== "none") {
    const ghost = createNode("div", `entity placement-ghost ${activeTool} ${preview?.valid ? "is-valid" : "is-invalid"}`);
    place(ghost, hoverCell.x, hoverCell.y);
    fragment.append(ghost);
  }
  elements.entityLayer.replaceChildren(fragment);
}

function renderPreview() {
  const preview = currentPreview();
  elements.previewCopy.hidden = !preview && !planning;
  if (!preview) {
    elements.previewCopy.textContent = planning
      ? "Scout’s watch and the selected tower’s reach are visible."
      : "Select a defense, then choose unoccupied grass.";
    return;
  }
  if (!preview.valid) {
    elements.previewCopy.textContent = preview.reason;
    return;
  }
  if (activeTool === "clear" || activeTool === "scout") {
    elements.previewCopy.textContent = preview.reason;
    return;
  }
  const recipe = Engine.BUILDINGS[activeTool];
  const route = preview.routeCost ? ` Route cost ${preview.routeCost.toFixed(1)}; forest slows enemies.` : "";
  elements.previewCopy.textContent = `${recipe.label} is ready here. It takes 1 day action.${route}`;
}

function renderTechnology() {
  const ready = !needsShelter();
  elements.techButton.hidden = !ready;
  elements.techXp.textContent = `${state.xp} XP`;
  elements.techButton.setAttribute("aria-label", `Technology, ${state.xp} XP`);
  if (!ready) {
    closeTechnology({ restoreFocus: false });
    return;
  }
  const level = currentLevel().number;
  const visibleNodes = Engine.techNodes().filter((node) => Engine.hasResearch(state, node.id)
    || (node.requiredLevel <= level && (node.requiresNodes || []).every((requiredId) => Engine.hasResearch(state, requiredId))));
  if (!visibleNodes.length) {
    elements.techBranches.replaceChildren(createNode("p", "tech-empty", "The first research reveals after you survive Level 1."));
    elements.techTitle.textContent = "Research unlocks soon";
    elements.techCopy.textContent = "Clear the first watch to earn XP and reveal your first choice.";
    setButtonContent(elements.researchButton, "Research unavailable", "next level");
    elements.researchButton.disabled = true;
    elements.techDialogSubtitle.textContent = "Spend earned XP during the day. Research does not use an action.";
    return;
  }
  const available = visibleNodes.find((node) => Engine.techAvailability(state, node.id).available);
  if (!visibleNodes.some((node) => node.id === activeTechId)) activeTechId = available?.id || visibleNodes[0].id;
  const signature = [state.phase, level, state.xp, state.unlocks.join(","), state.research.join(","), activeTechId].join("|");
  if (signature === techSignature) return;
  techSignature = signature;
  const selectedNode = Engine.TECH_TREE[activeTechId];
  const research = Engine.techAvailability(state, activeTechId);
  const branches = new Map();
  visibleNodes.forEach((node) => {
    if (!branches.has(node.branch)) branches.set(node.branch, []);
    branches.get(node.branch).push(node);
  });
  const fragment = document.createDocumentFragment();
  [...branches.entries()].forEach(([branchId, nodes]) => {
    const branch = createNode("section", "tech-branch");
    branch.setAttribute("aria-label", `${Engine.TECH_BRANCHES[branchId].label} branch`);
    branch.append(createNode("h3", "tech-branch-label", Engine.TECH_BRANCHES[branchId].label));
    const lane = createNode("div", "tech-node-lane");
    nodes.forEach((node) => {
      const check = Engine.techAvailability(state, node.id);
      const button = createNode("button", `tech-node${node.id === activeTechId ? " is-selected" : ""}${Engine.hasResearch(state, node.id) ? " is-researched" : ""}`);
      button.type = "button";
      button.dataset.tech = node.id;
      button.append(document.createTextNode(node.label), createNode("span", "", Engine.hasResearch(state, node.id) ? "researched" : `${node.costXp} XP`));
      button.title = check.reason;
      lane.append(button);
    });
    branch.append(lane);
    fragment.append(branch);
  });
  elements.techBranches.replaceChildren(fragment);
  elements.techTitle.textContent = selectedNode.label;
  elements.techDialogSubtitle.textContent = state.phase === "day"
    ? `Level ${level} · ${state.xp} XP available · research uses no action.`
    : `Level ${level} · ${state.xp} XP available · planning is read-only during the night.`;
  if (Engine.hasResearch(state, selectedNode.id)) {
    elements.techCopy.textContent = `${selectedNode.completeCopy} Research uses XP only; no day action is spent.`;
    setButtonContent(elements.researchButton, `${selectedNode.label} researched`, "ready");
    elements.researchButton.disabled = true;
    return;
  }
  elements.techCopy.textContent = `${selectedNode.copy} ${research.reason} Research uses XP only; no day action is spent.`;
  setButtonContent(elements.researchButton, `Research ${selectedNode.label}`, `${selectedNode.costXp} XP · no action`);
  elements.researchButton.disabled = state.phase !== "day" || !research.available;
}

function renderTelemetry() {
  const telemetry = Engine.telemetrySnapshot(state);
  const report = telemetry.currentNight || telemetry.nightReports[telemetry.nightReports.length - 1];
  elements.dawnReport.hidden = needsShelter() || !report || state.phase === "night";
  if (!report) return;
  const damage = report.buildingDamage > 0 ? `${report.buildingDamage.toFixed(1)} structure damage` : "no structure damage";
  elements.dawnReport.textContent = `Dawn report · Level ${report.number}: ${report.spawned} stopped · ${damage}.`;
}

function renderControls() {
  const level = currentLevel();
  const day = state.phase === "day";
  const night = state.phase === "night";
  const building = selectedBuilding();
  const refit = availableRefit(building);
  const arrowUpgradeReady = building && building.type === "stickLauncher" && Engine.hasBuildingUpgrade(state, "stickLauncher", "arrowShooter");
  const opening = needsShelter();
  const hasPlanningTarget = Boolean(selectedScout() || towerRecipe(building?.type));
  const showPlanningCard = night || state.phase === "aftermath" || (day && hasPlanningTarget);
  elements.controlPanel.classList.toggle("is-day", day);
  elements.controlPanel.classList.toggle("is-night", night);
  elements.controlPanel.classList.toggle("is-aftermath", state.phase === "aftermath");
  elements.actionCard.hidden = false;
  elements.planningCard.hidden = opening || !showPlanningCard;
  const unlockedBuildTools = renderBuildList();
  elements.buildCard.hidden = opening || !unlockedBuildTools.length;
  elements.shelterButton.hidden = !opening;
  elements.shelterButton.disabled = !day || !opening;
  elements.dayActionList.querySelectorAll("[data-tool]").forEach((button) => {
    const tool = button.dataset.tool;
    button.classList.toggle("is-active", tool === activeTool);
    button.disabled = opening || !day || state.actionPoints <= 0;
  });
  elements.buildList.querySelectorAll("[data-tool]").forEach((button) => {
    const tool = button.dataset.tool;
    button.classList.toggle("is-active", tool === activeTool);
    button.disabled = opening || !day || state.actionPoints <= 0;
  });
  elements.repairButton.disabled = opening || !day || !building || building.health >= building.maxHealth || state.resources.wood < 1 || state.actionPoints <= 0;
  const upgradeCost = arrowUpgradeReady ? 4 : refit?.cost?.wood || 0;
  elements.upgradeButton.disabled = opening || !day || (!arrowUpgradeReady && !refit) || state.resources.wood < upgradeCost || state.actionPoints <= 0;
  elements.actionRow.hidden = !building || !day;
  if (arrowUpgradeReady) setButtonContent(elements.upgradeButton, "Upgrade selected", "Arrowcraft · 4 wood · 1 action");
  else if (refit) setButtonContent(elements.upgradeButton, `Refit ${refit.label}`, `${upgradeCost} wood · 1 action · full HP`);
  else setButtonContent(elements.upgradeButton, "Upgrade selected", "Arrowcraft · 4 wood · 1 action");
  elements.endDayButton.disabled = opening || !day;
  setButtonContent(elements.endDayButton, day ? "End day" : night ? "Night watch" : "Dawn", day ? "Begin night watch →" : "Automatic defense");
  elements.overlayButton.hidden = !day || !hasPlanningTarget;
  elements.overlayButton.disabled = opening || !day;
  elements.overlayButton.textContent = planning ? "Hide planning overlay" : "Show planning overlay";
  elements.pauseButton.disabled = !night;
  elements.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  elements.speedButtons.forEach((button) => {
    button.disabled = opening;
    button.classList.toggle("is-active", Number(button.dataset.speed) === preferredSpeed);
  });
  elements.speedControls.hidden = !night;
  elements.healthBarsSetting.hidden = !night;
  elements.healthBarsToggle.checked = showHealthBars;
  elements.actionBadge.textContent = day ? `${state.actionPoints} action${state.actionPoints === 1 ? "" : "s"}` : night ? "Scout on watch" : "Dawn";
  elements.actionHint.textContent = day
    ? opening
      ? "Required to begin the first watch."
      : "Choose an action, then select the meadow."
    : "Scout is defending the hearth.";
  elements.utilityLabel.textContent = night ? "Night watch" : state.phase === "aftermath" ? "Dawn" : "Tools";
  syncToolbarSizeControls();
  elements.levelLabel.textContent = `Level ${String(level.number).padStart(2, "0")} · ${level.title}`;
  elements.levelCopy.textContent = day
    ? opening
      ? "Construct the shelter before the first watch."
      : level.number === 1
        ? "Scout can hold the first raccoon. Clear a tree for wood when ready."
      : level.number === 3 && !Engine.hasResearch(state, "arrowcraft")
        ? "Choose Scout Training or Arrowcraft when you have enough XP."
        : state.unlocks.includes("potatoGun") && state.resources.wood < 3
          ? "Save wood for a Potato Gun, or build another first line."
          : "Place defenses on open grass; clear trees for wood and faster routes."
    : night
      ? "Defend the hearth."
      : state.phase === "aftermath"
        ? "Scout is returning to the watch post."
        : "The hearth needs a new plan.";
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
  const spawnedWaves = state.encounter?.waves.filter((wave) => wave.spawned).length || 0;
  const waveDetail = state.encounter ? `Wave ${Math.max(1, spawnedWaves)}/${state.encounter.waves.length}` : "Watch";
  elements.phaseDetail.textContent = day ? "Untimed" : night ? `${waveDetail} · ${state.speed}×` : aftermath ? "Scout returning" : "Seed recorded";
  elements.actionPoints.textContent = state.actionPoints;
  elements.wood.textContent = state.resources.wood;
  elements.xp.textContent = state.xp;
  const event = state.lastEvent || "";
  const duplicateContext = event === elements.levelCopy.textContent;
  elements.eventLogWrap.hidden = !day || !event || duplicateContext || needsShelter();
  elements.eventLog.textContent = event;
  elements.boardCaption.textContent = day
    ? elements.levelCopy.textContent
    : night
      ? "Scout watches the hearth."
      : aftermath
        ? "Scout is returning."
        : "The homestead needs a new plan.";
}

function render() {
  renderControls();
  renderHeader();
  renderGrid();
  renderEntities();
  renderPreview();
  renderTechnology();
  renderTelemetry();
}

function clickCell(x, y) {
  if (state.phase !== "day" || needsShelter()) return;
  const occupied = Engine.buildingAt(state, x, y);
  if (occupied) {
    selected = { kind: "building", id: occupied.id };
    activeTool = "none";
    render();
    return;
  }
  if (activeTool === "none" && Math.round(state.scout.x) === x && Math.round(state.scout.y) === y) {
    selected = { kind: "scout" };
    render();
    return;
  }
  if (activeTool === "clear") {
    selected = { kind: "cell", x, y };
    const outcome = dispatch({ type: "clear", x, y });
    if (outcome.ok) activeTool = "none";
    render();
    return;
  }
  if (activeTool === "scout") {
    const outcome = dispatch({ type: "scout", x, y });
    if (outcome.ok) activeTool = "none";
    render();
    return;
  }
  if (isBuildTool(activeTool)) {
    const buildingType = activeTool;
    const outcome = dispatch({ type: "build", buildingType, x, y });
    if (outcome.ok) {
      activeTool = "none";
      const building = Engine.buildingAt(state, x, y);
      if (building) selected = { kind: "building", id: building.id };
    }
    render();
    return;
  }
  selected = { kind: "cell", x, y };
  render();
}

function resetRun(seed) {
  state = Engine.createRun(seed || state.seed);
  state.speed = preferredSpeed;
  activeTool = "none";
  hoverCell = null;
  selected = { kind: "none", id: null };
  planning = false;
  accumulator = 0;
  gridSignature = "";
  techSignature = "";
  activeTechId = null;
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
    preferredSpeed = state.speed;
    saveSettings();
    activeTool = "none";
    const teepee = state.buildings.find((building) => building.type === "teepee" && !building.destroyed);
    selected = teepee ? { kind: "building", id: teepee.id } : { kind: "none", id: null };
    hoverCell = null;
    accumulator = 0;
    gridSignature = "";
    techSignature = "";
    activeTechId = null;
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
function selectTool(event) {
  const button = event.target.closest("[data-tool]");
  if (!button || button.disabled) return;
  activeTool = button.dataset.tool;
  selected = { kind: "none", id: null };
  gridSignature = "";
  render();
}

elements.dayActionList.addEventListener("click", selectTool);
elements.buildList.addEventListener("click", selectTool);
elements.toolbarSmaller.addEventListener("click", () => changeToolbarSize(-1));
elements.toolbarLarger.addEventListener("click", () => changeToolbarSize(1));
elements.shelterButton.addEventListener("click", () => {
  const outcome = dispatch({ type: "constructShelter" });
  if (outcome.ok) {
    selected = { kind: "building", id: "b-teepee" };
    render();
  }
});
elements.repairButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (building) dispatch({ type: "repair", id: building.id });
});
elements.upgradeButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (!building) return;
  if (building.type === "stickLauncher") dispatch({ type: "upgradeLauncher", id: building.id });
  else {
    const refit = availableRefit(building);
    if (refit) dispatch({ type: "refitBuilding", id: building.id, refitId: refit.id });
  }
});
elements.techDialog.addEventListener("click", (event) => {
  if (event.target === elements.techDialog) {
    closeTechnology();
    return;
  }
  const node = event.target.closest("[data-tech]");
  if (!node) return;
  activeTechId = node.dataset.tech;
  techSignature = "";
  render();
});
elements.researchButton.addEventListener("click", () => {
  if (activeTechId) dispatch({ type: "research", nodeId: activeTechId });
});
elements.techButton.addEventListener("click", openTechnology);
elements.techCloseButton.addEventListener("click", () => closeTechnology());
elements.endDayButton.addEventListener("click", beginNight);
elements.earlyEndCancel.addEventListener("click", () => closeEarlyEndWarning());
elements.earlyEndConfirm.addEventListener("click", () => {
  closeEarlyEndWarning({ restoreFocus: false });
  endDayNow();
});
elements.earlyEndDialog.addEventListener("click", (event) => {
  if (event.target === elements.earlyEndDialog) closeEarlyEndWarning();
});
elements.overlayButton.addEventListener("click", () => { planning = !planning; gridSignature = ""; render(); });
elements.pauseButton.addEventListener("click", () => dispatch({ type: "pause" }));
elements.speedButtons.forEach((button) => button.addEventListener("click", () => setPreferredSpeed(Number(button.dataset.speed))));
elements.healthBarsToggle.addEventListener("change", () => {
  showHealthBars = elements.healthBarsToggle.checked;
  saveSettings();
  render();
});
document.addEventListener("keydown", (event) => {
  if (!elements.earlyEndDialog.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEarlyEndWarning();
    }
    return;
  }
  if (elements.techDialog.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeTechnology();
    return;
  }
  if (event.key === "Tab") {
    const focusable = [...elements.techDialog.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
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
