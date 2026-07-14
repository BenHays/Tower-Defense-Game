const Engine = window.WildHearthEngine;
const TalentIcons = window.WildHearthTalentIcons;

if (!Engine) throw new Error("Wild Hearth engine did not load.");
if (!TalentIcons) throw new Error("Wild Hearth talent icons did not load.");

const SAVE_KEY = "wild-hearth-save-v14";
const LEGACY_SAVE_KEYS = ["wild-hearth-save-v13", "wild-hearth-save-v12", "wild-hearth-save-v11", "wild-hearth-save-v10"];
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
  hides: document.querySelector("#hides-value"),
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
  axeButton: document.querySelector("#axe-button"),
  shelterButton: document.querySelector("#shelter-button"),
  shelterLabel: document.querySelector("#shelter-label"),
  shelterDetail: document.querySelector("#shelter-detail"),
  repairButton: document.querySelector("#repair-button"),
  upgradeButton: document.querySelector("#upgrade-button"),
  endDayButton: document.querySelector("#end-day-button"),
  overlayButton: document.querySelector("#overlay-button"),
  previewCopy: document.querySelector("#preview-copy"),
  techButton: document.querySelector("#tech-button"),
  techPoints: document.querySelector("#tech-points"),
  techDialog: document.querySelector("#tech-dialog"),
  techCloseButton: document.querySelector("#tech-close-button"),
  techDialogSubtitle: document.querySelector("#tech-dialog-subtitle"),
  techDetailIcon: document.querySelector("#tech-detail-icon"),
  techTitle: document.querySelector("#tech-title"),
  techCopy: document.querySelector("#tech-copy"),
  techBranches: document.querySelector("#tech-branches"),
  researchButton: document.querySelector("#research-button"),
  skillPointDialog: document.querySelector("#skill-point-dialog"),
  skillPointLater: document.querySelector("#skill-point-later"),
  skillPointTech: document.querySelector("#skill-point-tech"),
  dawnReport: document.querySelector("#dawn-report"),
  utilityLabel: document.querySelector("#utility-label"),
  pauseButton: document.querySelector("#pause-button"),
  speedButtons: [...document.querySelectorAll("[data-speed]")],
  speedControls: document.querySelector("#speed-controls"),
  healthBarsToggle: document.querySelector("#health-bars-toggle"),
  healthBarsSetting: document.querySelector("#health-bars-setting"),
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
let showHealthBars = true;
let activeTechId = null;
const gridCells = new Map();
let techSignature = "";
let preferredSpeed = 1;
let lastFocusedElement = null;
let lastSkillPointFocusedElement = null;
const TOOLBAR_SIZES = ["compact", "standard", "large"];
let toolbarSize = "compact";
let buildListSignature = "";
let harvestEffect = null;
let harvestTimer = null;
const HARVEST_EFFECT_MS = 1200;
const REDUCED_HARVEST_EFFECT_MS = 320;
const BUILD_CARD_ICONS = {
  stickLauncher: "stick-launcher-icon",
  potatoPatch: "potato-patch-icon",
  potatoGun: "potato-gun-icon",
};

try {
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  showHealthBars = settings.healthBarsPreferenceSet ? Boolean(settings.showHealthBars) : true;
  preferredSpeed = [1, 2].includes(settings.preferredSpeed) ? settings.preferredSpeed : 1;
  toolbarSize = TOOLBAR_SIZES.includes(settings.toolbarSize) ? settings.toolbarSize : "compact";
} catch (error) {
  showHealthBars = true;
  preferredSpeed = 1;
  toolbarSize = "compact";
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showHealthBars, healthBarsPreferenceSet: true, preferredSpeed, toolbarSize }));
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
  button.replaceChildren(document.createTextNode(label));
  if (detail) button.append(createNode("span", "", detail));
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
function isBuildTool(tool) { return Boolean(Engine.BUILDINGS[tool]) && !["teepee", "arrowShooter"].includes(tool) && !Engine.BUILDINGS[tool].conversionOnly; }
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

function dispatch(action, options = {}) {
  const outcome = Engine.dispatch(state, action);
  if (outcome.message) setEvent(outcome.message);
  gridSignature = "";
  if (options.render !== false) render();
  return outcome;
}

function clearHarvestEffect() {
  if (harvestTimer) window.clearTimeout(harvestTimer);
  harvestTimer = null;
  harvestEffect = null;
}

function startHarvestEffect(x, y) {
  clearHarvestEffect();
  harvestEffect = { x, y, tone: (x * 7 + y * 3) % 6 };
  harvestTimer = window.setTimeout(() => {
    harvestEffect = null;
    harvestTimer = null;
    render();
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? REDUCED_HARVEST_EFFECT_MS : HARVEST_EFFECT_MS);
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

function closeSkillPointNotice(options = {}) {
  if (elements.skillPointDialog.hidden) return;
  Engine.acknowledgeFirstSkillPoint(state);
  elements.skillPointDialog.hidden = true;
  document.body.classList.remove("skill-point-dialog-open");
  if (options.restoreFocus !== false && lastSkillPointFocusedElement instanceof HTMLElement) lastSkillPointFocusedElement.focus();
  lastSkillPointFocusedElement = null;
}

function showSkillPointNotice() {
  if (!state.firstSkillPointReady || !elements.skillPointDialog.hidden) return;
  lastSkillPointFocusedElement = document.activeElement;
  elements.skillPointDialog.hidden = false;
  document.body.classList.add("skill-point-dialog-open");
  requestAnimationFrame(() => elements.skillPointTech.focus());
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

function beginNight() {
  endDayNow();
}

function describeCell(x, y) {
  const pickup = Engine.openingPickupAt(state, x, y);
  if (pickup) return pickup.type === "stick" ? "Starter stick" : "Starter rock";
  const building = Engine.buildingAt(state, x, y);
  if (building) return Engine.BUILDINGS[building.type].label;
  if (Engine.scoutPostAt(state, x, y)) return "Scout watch post";
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
      cell.addEventListener("click", () => clickCell(x, y));
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
  const openingCell = Engine.openingPickupAt(state, x, y);
  cell.disabled = state.phase !== "day" || (needsShelter() && !openingCell && activeTool !== "teepee");
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
  const pickupSignature = state.openingPickups.map((pickup) => `${pickup.id}:${pickup.collected}`).join(",");
  const signature = [state.topologyVersion, state.phase, state.actionPoints, state.resources.wood, activeTool, hoverCell ? cellId(hoverCell.x, hoverCell.y) : "", chosen ? cellId(chosen.x, chosen.y) : "", planning, previewSignature, pickupSignature, state.rubble.map((item) => cellId(item.x, item.y)).join(",")].join("|");
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

  if (harvestEffect) {
    const effect = createNode("div", `entity harvest-effect tone-${harvestEffect.tone}`);
    effect.append(
      createNode("span", "harvest-canopy tree-canopy"),
      createNode("span", "harvest-hatchet"),
      createNode("span", "harvest-impact"),
      createNode("span", "harvest-chips"),
    );
    place(effect, harvestEffect.x, harvestEffect.y);
    fragment.append(effect);
  }

  if (needsShelter()) {
    state.openingPickups.filter((pickup) => !pickup.collected).forEach((pickup) => {
      const node = createNode("div", `entity opening-pickup ${pickup.type}`);
      place(node, pickup.x, pickup.y);
      fragment.append(node);
    });
  }

  state.buildings.filter((building) => !building.destroyed).forEach((building) => {
    const recipe = Engine.BUILDINGS[building.type];
    const node = createNode("div", `entity building ${building.type} ${Engine.conditionFor(building)}`);
    if (selected.kind === "building" && selected.id === building.id) node.classList.add("is-selected");
    if (building.firingTicks > 0) node.classList.add("is-firing");
    if (building.hitTicks > 0) node.classList.add("is-hit");
    if (building.type === "potatoPatch" && Engine.isPotatoPatchMature(building)) node.classList.add("is-mature");
    place(node, building.x, building.y);
    if (recipe.targetable) addHealthBar(node, building, "building-health", true);
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

function techAmount(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function techEffectSummary(definition) {
  return definition.effects.map((effect) => {
    if (effect.kind === "stat") {
      const amount = techAmount(effect.value);
      if (effect.target === "unit" && effect.id === "scout" && effect.stat === "damage") return `+${amount} SCOUT DMG`;
      if (effect.target === "unit" && effect.id === "scout" && effect.stat === "attackRange") return `+${amount} WATCH RANGE`;
      if (effect.target === "building" && effect.id === "stickLauncher" && effect.stat === "damage") return `+${amount} LAUNCHER DMG`;
      if (effect.target === "building" && effect.id === "stickLauncher" && effect.stat === "attackRange") return `+${amount} RANGE`;
    }
    if (effect.kind === "harvestWood") return `+${techAmount(effect.amount)} WOOD / TREE`;
    if (effect.kind === "repairAmount") return `+${techAmount(effect.amount)} REPAIR HP`;
    if (effect.kind === "dawnRepair") return `+${techAmount(effect.amount)} HP / DAWN`;
    if (effect.kind === "maxHealth") return `+${techAmount(effect.amount)} STRUCTURE HP`;
    if (effect.kind === "armor") return `-${techAmount(effect.amount)} HEAVY-HIT DMG`;
    if (effect.kind === "unlockBuildingUpgrade") return "UNLOCK ARROW REFIT";
    if (effect.kind === "unlockBuildingRefit") return "UNLOCK QUICKCORD";
    if (effect.kind === "onHitStatus" && effect.status === "movementSlow") return "POTATO SLOW";
    return "NEW TALENT";
  }).join(" · ");
}

function talentIconSvg(iconId, className = "") {
  const definition = TalentIcons.icon(iconId) || TalentIcons.list()[0];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "3.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  svg.style.setProperty("--icon-optical-y", `${definition.offsetY || 0}px`);
  definition.parts.forEach((part) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", part.tag);
    Object.entries(part).forEach(([key, value]) => {
      if (key !== "tag") element.setAttribute(key, String(value));
    });
    svg.append(element);
  });
  return svg;
}

function talentIconFrame(iconId, className) {
  const frame = createNode("span", className);
  frame.append(talentIconSvg(iconId));
  return frame;
}

function drawTechConnections() {
  const canvas = elements.techBranches.querySelector(".tech-tree-canvas");
  const viewport = elements.techBranches.querySelector(".tech-tree-viewport");
  const stage = elements.techBranches.querySelector(".tech-tree-stage");
  const connectors = elements.techBranches.querySelector(".tech-connectors");
  if (!canvas || !viewport || !stage || !connectors) return;
  connectors.replaceChildren();
  const canvasRect = canvas.getBoundingClientRect();
  const width = Math.ceil(canvas.scrollWidth);
  const height = Math.ceil(canvas.scrollHeight);
  connectors.setAttribute("viewBox", `0 0 ${width} ${height}`);
  connectors.setAttribute("width", String(width));
  connectors.setAttribute("height", String(height));
  const center = (node, side) => {
    const rect = node.getBoundingClientRect();
    return {
      x: side === "right" ? rect.right - canvasRect.left : rect.left - canvasRect.left,
      y: rect.top - canvasRect.top + (rect.height / 2),
    };
  };
  [...canvas.querySelectorAll("[data-tech]")].forEach((button) => {
    const definition = Engine.TECH_TREE[button.dataset.tech];
    if (!definition) return;
    const requiredButtons = (definition.requiresNodes || [])
      .map((id) => canvas.querySelector(`[data-tech="${id}"]`))
      .filter(Boolean);
    const sources = requiredButtons.length
      ? requiredButtons
      : [canvas.querySelector(`[data-tech-root="${definition.branch}"]`)].filter(Boolean);
    sources.forEach((source) => {
      const start = center(source, "right");
      const end = center(button, "left");
      const curve = Math.max(26, (end.x - start.x) * 0.45);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", `tech-connection ${definition.branch}`);
      path.setAttribute("d", `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`);
      connectors.append(path);
    });
  });
  stage.classList.toggle("can-scroll", viewport.scrollWidth > viewport.clientWidth + 4);
}

function queueTechConnections() {
  requestAnimationFrame(drawTechConnections);
}

function renderTechnology() {
  const ready = !needsShelter();
  elements.techButton.hidden = !ready;
  elements.techPoints.textContent = `${state.skillPoints} SP`;
  elements.techButton.setAttribute("aria-label", `Talent Tree, ${state.skillPoints} Skill Point${state.skillPoints === 1 ? "" : "s"} ready`);
  if (!ready) {
    closeTechnology({ restoreFocus: false });
    return;
  }
  const level = currentLevel().number;
  const visibleNodes = Engine.techNodes().filter((node) => Engine.hasResearch(state, node.id) || node.requiredLevel <= level);
  if (!visibleNodes.length) {
    elements.techBranches.replaceChildren(createNode("p", "tech-empty", "The first talent reveals after you survive Level 1."));
    elements.techTitle.textContent = "Talents unlock soon";
    elements.techDetailIcon.replaceChildren(talentIconSvg("scoutTraining"));
    elements.techCopy.textContent = "Clear the first watch. Your first Skill Point arrives at 10 XP.";
    setButtonContent(elements.researchButton, "Talent unavailable", "next level");
    elements.researchButton.disabled = true;
    elements.techDialogSubtitle.textContent = `Experience ${state.xp}/${Engine.nextSkillPointThreshold(state)} · thresholds double after every point · no action.`;
    return;
  }
  const available = visibleNodes.find((node) => Engine.techAvailability(state, node.id).available);
  if (!visibleNodes.some((node) => node.id === activeTechId)) activeTechId = available?.id || visibleNodes[0].id;
  const signature = [state.phase, level, state.xp, state.skillPoints, state.skillPointsEarned, state.unlocks.join(","), state.research.join(","), activeTechId].join("|");
  if (signature === techSignature) return;
  techSignature = signature;
  const selectedNode = Engine.TECH_TREE[activeTechId];
  const research = Engine.techAvailability(state, activeTechId);
  const branches = new Map(Object.keys(Engine.TECH_BRANCHES).map((id) => [id, []]));
  visibleNodes.forEach((node) => branches.get(node.branch).push(node));
  const treeDepth = Math.max(1, ...visibleNodes.map((node) => node.tier));
  const stage = createNode("div", "tech-tree-stage");
  const viewport = createNode("div", "tech-tree-viewport");
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", "Talent Tree. Scroll horizontally to explore future talents.");
  const canvas = createNode("div", "tech-tree-canvas");
  canvas.style.setProperty("--tech-depth", String(treeDepth));
  const connectors = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  connectors.setAttribute("class", "tech-connectors");
  connectors.setAttribute("aria-hidden", "true");
  canvas.append(connectors);
  [...branches.entries()].forEach(([branchId, nodes]) => {
    const branch = createNode("section", "tech-branch");
    branch.dataset.branch = branchId;
    branch.setAttribute("aria-label", `${Engine.TECH_BRANCHES[branchId].label} branch`);
    const label = createNode("h3", "tech-branch-label", Engine.TECH_BRANCHES[branchId].label);
    label.dataset.techRoot = branchId;
    const track = createNode("div", "tech-node-track");
    track.style.setProperty("--tech-depth", String(treeDepth));
    const tierRows = new Map();
    nodes.forEach((node) => {
      const row = (tierRows.get(node.tier) || 0) + 1;
      tierRows.set(node.tier, row);
      const check = Engine.techAvailability(state, node.id);
      const researched = Engine.hasResearch(state, node.id);
      const button = createNode("button", `tech-node${node.id === activeTechId ? " is-selected" : ""}${researched ? " is-researched" : ""}${check.available ? " is-available" : " is-locked"}`);
      button.type = "button";
      button.dataset.tech = node.id;
      button.style.setProperty("--tech-column", String(node.tier));
      button.style.setProperty("--tech-row", String(row));
      button.title = check.reason;
      button.setAttribute("aria-label", `${node.label}: ${techEffectSummary(node)}. ${researched ? "Learned." : check.reason}`);
      button.append(
        talentIconFrame(node.icon, "tech-node-icon"),
        createNode("em", "tech-node-cost", researched ? "✓" : `${check.costSkillPoints} SP`),
      );
      track.append(button);
    });
    const rowCount = Math.max(1, ...tierRows.values());
    track.style.setProperty("--tech-row-count", String(rowCount));
    branch.append(label, track);
    canvas.append(branch);
  });
  viewport.append(canvas);
  stage.append(viewport, createNode("p", "tech-scroll-hint", "Scroll to explore →"));
  elements.techBranches.replaceChildren(stage);
  queueTechConnections();
  elements.techDetailIcon.replaceChildren(talentIconSvg(selectedNode.icon));
  elements.techTitle.textContent = selectedNode.label;
  elements.techDialogSubtitle.textContent = state.phase === "day"
    ? `Level ${level} · ${state.skillPoints} Skill Point${state.skillPoints === 1 ? "" : "s"} ready · ${state.xp}/${Engine.nextSkillPointThreshold(state)} XP to next · no action.`
    : `Level ${level} · ${state.skillPoints} Skill Point${state.skillPoints === 1 ? "" : "s"} ready · planning is read-only during the night.`;
  if (Engine.hasResearch(state, selectedNode.id)) {
    elements.techCopy.textContent = `${selectedNode.completeCopy} Talents use Skill Points only; no day action is spent.`;
    setButtonContent(elements.researchButton, `${selectedNode.label} learned`, "ready");
    elements.researchButton.disabled = true;
    return;
  }
  elements.techCopy.textContent = `${selectedNode.copy} ${research.reason} This branch purchase costs ${research.costSkillPoints} SP; learning uses no day action.`;
  setButtonContent(elements.researchButton, `Learn ${selectedNode.label}`, `${research.costSkillPoints} SP · no action`);
  elements.researchButton.disabled = state.phase !== "day" || !research.available;
}

function renderTelemetry() {
  const telemetry = Engine.telemetrySnapshot(state);
  const report = telemetry.currentNight || telemetry.nightReports[telemetry.nightReports.length - 1];
  elements.dawnReport.hidden = needsShelter() || !report || state.phase === "night";
  if (!report) return;
  const damage = report.buildingDamage > 0 ? `${report.buildingDamage.toFixed(1)} structure damage` : "no structure damage";
  elements.dawnReport.textContent = `Dawn report · Level ${report.number}: ${report.spawned} stopped · +${report.hidesCollected || 0} hides · ${damage}.`;
}

function renderControls() {
  const level = currentLevel();
  const day = state.phase === "day";
  const night = state.phase === "night";
  const building = selectedBuilding();
  const refit = availableRefit(building);
  const arrowUpgradeReady = building && building.type === "stickLauncher" && Engine.hasBuildingUpgrade(state, "stickLauncher", "arrowShooter");
  const potatoPatchUpgradeReady = building && Engine.canUpgradePotatoPatch(state, building);
  const patchProgress = building?.type === "potatoPatch" ? Engine.potatoPatchProgress(building) : null;
  const opening = needsShelter();
  const openingSuppliesReady = Engine.hasOpeningSupplies(state);
  const hasPlanningTarget = Boolean(selectedScout() || towerRecipe(building?.type));
  const showPlanningCard = night || state.phase === "aftermath" || (day && hasPlanningTarget);
  elements.controlPanel.classList.toggle("is-day", day);
  elements.controlPanel.classList.toggle("is-night", night);
  elements.controlPanel.classList.toggle("is-aftermath", state.phase === "aftermath");
  elements.actionCard.hidden = false;
  elements.actionCard.classList.toggle("is-opening", opening);
  elements.planningCard.hidden = opening || !showPlanningCard;
  const unlockedBuildTools = renderBuildList();
  elements.buildCard.hidden = opening || !unlockedBuildTools.length;
  elements.axeButton.hidden = !opening || state.hatchetCrafted;
  elements.axeButton.disabled = !day || !opening || state.hatchetCrafted || !openingSuppliesReady || state.actionPoints <= 0;
  elements.shelterButton.hidden = !opening || !state.hatchetCrafted;
  elements.shelterButton.disabled = !day || !opening || !state.hatchetCrafted || state.actionPoints <= 0;
  const shelterArmed = opening && activeTool === "teepee";
  const shelterReady = opening && state.hatchetCrafted && day && state.actionPoints > 0 && !shelterArmed;
  elements.shelterButton.classList.toggle("is-ready", shelterReady);
  elements.shelterButton.setAttribute("aria-pressed", String(shelterArmed));
  elements.shelterButton.setAttribute(
    "aria-label",
    shelterArmed ? "Choose shelter site. Click open grass." : "Place shelter. Free. Uses one action.",
  );
  elements.shelterLabel.textContent = shelterArmed ? "Choose shelter site" : "Place shelter";
  elements.shelterDetail.textContent = shelterArmed ? "Click open grass" : "Free · 1 action";
  elements.dayActionList.querySelectorAll("[data-tool]").forEach((button) => {
    const tool = button.dataset.tool;
    button.classList.toggle("is-active", tool === activeTool);
    button.setAttribute("aria-pressed", String(tool === activeTool));
    button.disabled = tool === "teepee"
      ? !day || !opening || !state.hatchetCrafted || state.actionPoints <= 0
      : opening || !day || state.actionPoints <= 0;
  });
  const woodYield = 2 + Engine.techEffects(state).filter((effect) => effect.kind === "harvestWood").reduce((total, effect) => total + effect.amount, 0);
  const clearDetail = elements.dayActionList.querySelector('[data-tool="clear"] small');
  if (clearDetail) clearDetail.textContent = `+${woodYield} wood`;
  elements.buildList.querySelectorAll("[data-tool]").forEach((button) => {
    const tool = button.dataset.tool;
    button.classList.toggle("is-active", tool === activeTool);
    button.disabled = opening || !day || state.actionPoints <= 0;
  });
  elements.repairButton.disabled = opening || !day || !building || building.health >= building.maxHealth || state.resources.wood < 1 || state.actionPoints <= 0;
  const upgradeCost = arrowUpgradeReady ? 4 : potatoPatchUpgradeReady ? Engine.BUILDINGS.potatoGun.cost.wood : refit?.cost?.wood || 0;
  elements.upgradeButton.disabled = opening || !day || (!arrowUpgradeReady && !potatoPatchUpgradeReady && !refit) || state.resources.wood < upgradeCost || state.actionPoints <= 0;
  elements.actionRow.hidden = !building || !day;
  if (arrowUpgradeReady) setButtonContent(elements.upgradeButton, "Upgrade selected", "Arrowcraft · 4 wood · 1 action");
  else if (potatoPatchUpgradeReady) setButtonContent(elements.upgradeButton, "Upgrade Potato Patch", "3 wood · 1 action · full HP");
  else if (patchProgress) {
    const growCopy = patchProgress.mature ? "Hold Level 4" : `${patchProgress.grownNights}/${patchProgress.requiredNights} held nights`;
    setButtonContent(elements.upgradeButton, patchProgress.mature ? "Potato Gun locked" : "Potato Patch growing", growCopy);
  }
  else if (refit) setButtonContent(elements.upgradeButton, `Refit ${refit.label}`, `${upgradeCost} wood · 1 action · full HP`);
  else setButtonContent(elements.upgradeButton, "Upgrade selected", "Arrowcraft · 4 wood · 1 action");
  elements.endDayButton.disabled = opening || !day;
  setButtonContent(elements.endDayButton, day ? "End Day" : night ? "Night Watch" : "Dawn");
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
  elements.healthBarsSetting.hidden = false;
  elements.healthBarsToggle.checked = showHealthBars;
  elements.actionBadge.textContent = day ? `${state.actionPoints} action${state.actionPoints === 1 ? "" : "s"}` : night ? "Scout on watch" : "Dawn";
  elements.actionHint.textContent = day
    ? opening
      ? state.hatchetCrafted
        ? "Choose open grass for the shelter."
        : openingSuppliesReady
          ? "Craft an axe from the stick and rock."
          : "Click the stick and rock in the meadow."
      : "Choose an action, then select the meadow."
    : "Scout is defending the hearth.";
  elements.utilityLabel.textContent = night ? "Night watch" : state.phase === "aftermath" ? "Dawn" : "Tools";
  syncToolbarSizeControls();
  elements.levelLabel.textContent = `Level ${String(level.number).padStart(2, "0")} · ${level.title}`;
  elements.levelCopy.textContent = day
    ? opening
      ? state.hatchetCrafted
        ? "Place the shelter on any unoccupied grass before the first watch."
        : openingSuppliesReady
          ? "Craft an axe, then place the shelter."
          : "Collect the stick and rock from the meadow."
      : level.number === 1
        ? "Scout can hold the first raccoon. Harvest a tree for wood when ready."
        : level.number === 3 && state.unlocks.includes("potatoPatch") && !state.buildings.some((item) => item.type === "potatoPatch" && !item.destroyed)
          ? "Plant a Potato Patch now; it needs two held nights before the Boar arrives."
          : level.number === 4 && state.buildings.some((item) => item.type === "potatoPatch" && !Engine.isPotatoPatchMature(item))
            ? "Your Potato Patch needs one more held night before it can become a heavy launcher."
            : level.number === 5 && state.buildings.some((item) => Engine.canUpgradePotatoPatch(state, item))
              ? "Upgrade a mature Potato Patch into a Potato Gun before tonight’s Boar."
        : level.number === 3 && !Engine.hasResearch(state, "arrowcraft")
          ? "Spend earned Skill Points on Hunting, Farming, Building, Nurturing, or Scouting talents."
        : "Place defenses on open grass; harvest trees for wood and faster routes."
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
  elements.hides.textContent = state.resources.hides;
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
  showSkillPointNotice();
}

function clickCell(x, y) {
  if (state.phase !== "day" || harvestEffect) return;
  if (needsShelter()) {
    const pickup = Engine.openingPickupAt(state, x, y);
    if (pickup) {
      selected = { kind: "cell", x, y };
      dispatch({ type: "collectOpeningPickup", id: pickup.id });
      return;
    }
    if (activeTool === "teepee") {
      const outcome = dispatch({ type: "constructShelter", x, y });
      if (outcome.ok) {
        activeTool = "none";
        selected = { kind: "building", id: "b-teepee" };
      }
      render();
    }
    return;
  }
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
    const outcome = dispatch({ type: "clear", x, y }, { render: false });
    if (outcome.ok) {
      activeTool = "none";
      startHarvestEffect(x, y);
    }
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
  clearHarvestEffect();
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
    const saved = localStorage.getItem(SAVE_KEY) || LEGACY_SAVE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!saved) { setEvent("No saved meadow is available in this browser."); return; }
    state = Engine.hydrate(saved);
    localStorage.setItem(SAVE_KEY, Engine.serialize(state));
    preferredSpeed = state.speed;
    saveSettings();
    activeTool = "none";
    const teepee = state.buildings.find((building) => building.type === "teepee" && !building.destroyed);
    selected = teepee ? { kind: "building", id: teepee.id } : { kind: "none", id: null };
    hoverCell = null;
    accumulator = 0;
    clearHarvestEffect();
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
  if (harvestEffect) return;
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
  if (harvestEffect) return;
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
elements.axeButton.addEventListener("click", () => {
  const outcome = dispatch({ type: "craftHatchet" }, { render: false });
  // Crafting reveals the next step; it never silently arms a map placement.
  if (outcome.ok) activeTool = "none";
  render();
});
elements.repairButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (building) dispatch({ type: "repair", id: building.id });
});
elements.upgradeButton.addEventListener("click", () => {
  const building = selectedBuilding();
  if (!building) return;
  if (building.type === "stickLauncher") dispatch({ type: "upgradeLauncher", id: building.id });
  else if (building.type === "potatoPatch") dispatch({ type: "upgradePotatoPatch", id: building.id });
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
elements.skillPointLater.addEventListener("click", () => closeSkillPointNotice());
elements.skillPointTech.addEventListener("click", () => {
  closeSkillPointNotice({ restoreFocus: false });
  openTechnology();
});
elements.skillPointDialog.addEventListener("click", (event) => {
  if (event.target === elements.skillPointDialog) closeSkillPointNotice();
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
  if (!elements.skillPointDialog.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSkillPointNotice();
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
window.addEventListener("resize", () => {
  if (!elements.techDialog.hidden) queueTechConnections();
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
