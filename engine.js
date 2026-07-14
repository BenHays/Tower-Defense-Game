/*
 * Wild Hearth simulation engine.
 *
 * This file intentionally knows nothing about the DOM. The browser UI and the
 * headless simulator both drive these same deterministic state transitions.
 */
(function registerWildHearthEngine(root, factory) {
  const techTree = typeof module !== "undefined" && module.exports ? require("./tech-tree.js") : root.WildHearthTechTree;
  const engine = factory(techTree);
  if (typeof module !== "undefined" && module.exports) module.exports = engine;
  root.WildHearthEngine = engine;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildEngine(TechTree) {
  if (!TechTree) throw new Error("Wild Hearth tech tree did not load.");
  const SAVE_VERSION = 6;
  const TICK_RATE = 20;
  const BOARD = { id: "hearth-meadow", label: "Hearth Meadow", width: 13, height: 13 };
  const STARTING_ACTIONS = 2;
  const DEFAULT_SEED = "HEARTH-1042";
  const pathCaches = new WeakMap();
  const SHELTER_SITE = { x: 6, y: 6 };

  const UNITS = {
    scout: {
      id: "scout",
      label: "Scout",
      health: 9,
      damage: 1,
      attackSpeed: 1.7,
      moveSpeed: 2.7,
      attackRange: 3.3,
      attackReach: 0.76,
      collisionRadius: 0.34,
      targetRule: "nearest-enemy-in-range",
      targetType: "enemy",
    },
  };

  const ENEMIES = {
    raccoon: {
      id: "raccoon",
      label: "Raccoon",
      threat: 1,
      health: 5,
      damage: 0.5,
      attackSpeed: 0.85,
      moveSpeed: 1.3,
      attackRange: 0.72,
      collisionRadius: 0.28,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "sneak",
      arrivalPauseTicks: 5,
      forestMoveCost: 1.32,
      xp: 1,
    },
    boar: {
      id: "boar",
      label: "Boar",
      threat: 5,
      health: 10,
      damage: 2,
      attackSpeed: 0.72,
      moveSpeed: 0.76,
      attackRange: 0.82,
      collisionRadius: 0.44,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "trudge",
      arrivalPauseTicks: 0,
      forestMoveCost: 1.82,
      xp: 3,
    },
  };

  const BUILDINGS = {
    teepee: {
      id: "teepee",
      label: "Branch teepee",
      footprint: { width: 1, height: 1 },
      maxHealth: 12,
      cost: { wood: 0 },
      role: "home",
      tags: ["home"],
      repairAmount: 4,
      repairCost: { wood: 1 },
    },
    stickLauncher: {
      id: "stickLauncher",
      label: "Stick launcher",
      footprint: { width: 1, height: 1 },
      maxHealth: 6,
      cost: { wood: 2 },
      actionCost: 1,
      role: "tower",
      tags: ["defense", "first-line"],
      damage: 1,
      attackSpeed: 0.5,
      attackRange: 2.25,
      projectile: { type: "stick", speed: 4.5 },
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
    },
    arrowShooter: {
      id: "arrowShooter",
      label: "Arrow shooter",
      footprint: { width: 1, height: 1 },
      maxHealth: 6,
      role: "tower",
      tags: ["defense", "first-line", "arrowcraft"],
      damage: 1.5,
      attackSpeed: 0.75,
      attackRange: 3.375,
      projectile: { type: "arrow", speed: 6.5 },
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
    },
    potatoGun: {
      id: "potatoGun",
      label: "Potato gun",
      footprint: { width: 1, height: 1 },
      maxHealth: 6,
      cost: { wood: 3 },
      actionCost: 1,
      role: "heavy tower",
      tags: ["defense", "heavy"],
      damage: 3,
      attackSpeed: 1 / 3,
      attackRange: 3,
      projectile: { type: "potato", speed: 3.5 },
      knockback: 1,
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
    },
  };
  const TOWER_TYPES = ["stickLauncher", "arrowShooter", "potatoGun"];

  const ENEMY_COUNTERS = {
    raccoon: { building: "stickLauncher", explanation: "A stick launcher weakens a raccoon before Scout needs to intercept." },
    boar: { building: "potatoGun", explanation: "A Potato Gun gives heavy targets a forceful setback." },
  };

  const LEVELS = [
    {
      id: "first-watch",
      number: 1,
      title: "First watch",
      enemyPool: ["raccoon"],
      survivalXp: 2,
      unlock: "stickLauncher",
      unlockLabel: "Stick launcher",
      unlockCopy: "Use 2 wood and one action to build the first line outside Scout's watch radius.",
    },
    {
      id: "first-line",
      number: 2,
      title: "First line",
      enemyPool: ["raccoon"],
      survivalXp: 3,
      unlock: "potatoGun",
      unlockLabel: "Potato Gun",
      unlockCopy: "Save 3 wood to build a slow, heavy tower with knockback.",
    },
    {
      id: "arrowcraft",
      number: 3,
      title: "Arrowcraft",
      enemyPool: ["raccoon"],
      survivalXp: 4,
      unlock: null,
    },
  ];

  function makeFixedTerrain() {
    const terrain = Array.from({ length: BOARD.width * BOARD.height }, () => "tree");
    const set = (x, y, type) => { terrain[y * BOARD.width + x] = type; };
    const open = (x, y) => set(x, y, "open");

    for (let y = 3; y <= 9; y += 1) {
      for (let x = 3; x <= 9; x += 1) {
        if (Math.hypot(x - 6, y - 6) <= 2.28) open(x, y);
      }
    }
    return terrain;
  }

  const FIXED_TERRAIN = makeFixedTerrain();

  function perimeterSpawnCells() {
    const cells = [];
    for (let x = 0; x < BOARD.width; x += 1) {
      cells.push({ x, y: 0, edge: "north" }, { x, y: BOARD.height - 1, edge: "south" });
    }
    for (let y = 1; y < BOARD.height - 1; y += 1) {
      cells.push({ x: 0, y, edge: "west" }, { x: BOARD.width - 1, y, edge: "east" });
    }
    return cells;
  }

  const SPAWN_CELLS = perimeterSpawnCells();

  function hashSeed(value) {
    let hash = 2166136261;
    const text = String(value || DEFAULT_SEED);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let value = hashSeed(seed) || 1;
    return {
      next() {
        value |= 0;
        value = (value + 0x6D2B79F5) | 0;
        let result = Math.imul(value ^ (value >>> 15), 1 | value);
        result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
      },
      int(minimum, maximum) {
        return Math.floor(this.next() * (maximum - minimum + 1)) + minimum;
      },
      pick(items) {
        return items[this.int(0, items.length - 1)];
      },
    };
  }

  function nextSeed(seed) {
    const value = (hashSeed(seed) ^ 0x9e3779b9) >>> 0;
    return `HEARTH-${value.toString(36).toUpperCase().slice(0, 6)}`;
  }

  function cellKey(x, y) { return `${x},${y}`; }
  function indexOf(x, y) { return y * BOARD.width + x; }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < BOARD.width && y < BOARD.height; }
  function terrainAt(state, x, y) { return inBounds(x, y) ? state.terrain[indexOf(x, y)] : "void"; }
  function setTerrain(state, x, y, value) { state.terrain[indexOf(x, y)] = value; }
  function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function mediumThreatBudget(levelNumber) {
    let budget = 1;
    for (let number = 2; number <= levelNumber; number += 1) budget = Math.ceil(budget * 1.25);
    return budget;
  }

  function levelFor(state) {
    const number = state.levelIndex + 1;
    const authored = LEVELS[state.levelIndex];
    if (authored) return { ...authored, threatBudget: mediumThreatBudget(number) };
    return {
      id: `night-${number}`,
      number,
      title: "Growing pressure",
      enemyPool: ["raccoon"],
      survivalXp: Math.max(3, Math.ceil(number * 1.25)),
      unlock: null,
      threatBudget: mediumThreatBudget(number),
    };
  }
  function buildingRecipe(type) { return BUILDINGS[type]; }
  function enemyRecipe(type) { return ENEMIES[type]; }
  function buildingCells(building) {
    const footprint = buildingRecipe(building.type).footprint;
    const cells = [];
    for (let y = building.y; y < building.y + footprint.height; y += 1) {
      for (let x = building.x; x < building.x + footprint.width; x += 1) cells.push({ x, y });
    }
    return cells;
  }

  function buildingAt(state, x, y) {
    const buildings = state.buildings.filter((building) => !building.destroyed);
    return buildings.find((building) => buildingCells(building).some((cell) => cell.x === x && cell.y === y));
  }

  function hasRubble(state, x, y) {
    return state.rubble.some((rubble) => rubble.x === x && rubble.y === y);
  }

  function isPassable(state, x, y) {
    if (!inBounds(x, y) || !["open", "tree", "cleared"].includes(terrainAt(state, x, y)) || hasRubble(state, x, y)) return false;
    return !buildingAt(state, x, y);
  }

  function isBuildableGrass(state, x, y) {
    return ["open", "cleared"].includes(terrainAt(state, x, y));
  }

  function travelCost(state, x, y, recipe) {
    if (terrainAt(state, x, y) === "tree") return recipe?.forestMoveCost || 1.5;
    return 1;
  }

  function invalidatePaths(state) {
    state.topologyVersion += 1;
    const cache = pathCaches.get(state);
    if (cache) cache.paths.clear();
  }

  function getPathCache(state) {
    let cache = pathCaches.get(state);
    if (!cache) {
      cache = { paths: new Map() };
      pathCaches.set(state, cache);
    }
    return cache;
  }

  function findPath(state, start, goal, recipe) {
    if (!isPassable(state, goal.x, goal.y)) return null;
    const source = { x: Math.round(start.x), y: Math.round(start.y) };
    if (!inBounds(source.x, source.y)) return null;
    const terrainProfile = recipe?.id || recipe?.forestMoveCost || "default";
    const key = `${state.topologyVersion}|${terrainProfile}|${source.x},${source.y}|${goal.x},${goal.y}`;
    const cache = getPathCache(state);
    if (cache.paths.has(key)) return clone(cache.paths.get(key));
    if (source.x === goal.x && source.y === goal.y) return [{ x: source.x, y: source.y }];

    const frontier = [{ cell: source, cost: 0 }];
    const costs = new Map([[cellKey(source.x, source.y), 0]]);
    const previous = new Map();
    const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

    while (frontier.length) {
      frontier.sort((left, right) => left.cost - right.cost || left.cell.y - right.cell.y || left.cell.x - right.cell.x);
      const current = frontier.shift();
      const currentKey = cellKey(current.cell.x, current.cell.y);
      if (current.cost !== costs.get(currentKey)) continue;
      if (current.cell.x === goal.x && current.cell.y === goal.y) break;
      for (const direction of directions) {
        const next = { x: current.cell.x + direction.x, y: current.cell.y + direction.y };
        const nextKey = cellKey(next.x, next.y);
        if (!isPassable(state, next.x, next.y)) continue;
        const nextCost = current.cost + travelCost(state, next.x, next.y, recipe);
        if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, nextCost);
        previous.set(nextKey, current.cell);
        frontier.push({ cell: next, cost: nextCost });
      }
    }

    if (!costs.has(cellKey(goal.x, goal.y))) return null;
    const path = [goal];
    let current = goal;
    while (!(current.x === source.x && current.y === source.y)) {
      current = previous.get(cellKey(current.x, current.y));
      path.push(current);
    }
    path.reverse();
    cache.paths.set(key, clone(path));
    return path;
  }

  function approachCells(state, building) {
    const footprintCells = buildingCells(building);
    const candidates = [];
    for (const cell of footprintCells) {
      [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }].forEach((direction) => {
        const next = { x: cell.x + direction.x, y: cell.y + direction.y };
        if (isPassable(state, next.x, next.y) && !candidates.some((candidate) => candidate.x === next.x && candidate.y === next.y)) candidates.push(next);
      });
    }
    return candidates;
  }

  function closestReachableBuilding(state, entity, extraBuilding, recipeOverride) {
    const buildings = state.buildings.filter((building) => !building.destroyed).concat(extraBuilding ? [extraBuilding] : []);
    const recipe = recipeOverride || (entity?.type ? enemyRecipe(entity.type) : ENEMIES.raccoon);
    const candidates = [];
    for (const building of buildings) {
      for (const approach of approachCells(state, building)) {
        const path = findPath(state, entity, approach, recipe);
        if (!path) continue;
        const cost = path.slice(1).reduce((sum, cell) => sum + travelCost(state, cell.x, cell.y, recipe), 0);
        candidates.push({ building, approach, path, cost });
      }
    }
    candidates.sort((left, right) => left.cost - right.cost
      || String(left.building.id).localeCompare(String(right.building.id))
      || left.approach.y - right.approach.y
      || left.approach.x - right.approach.x);
    return candidates[0] || null;
  }

  function hasResources(state, cost) {
    return Object.entries(cost).every(([resource, amount]) => (state.resources[resource] || 0) >= amount);
  }

  function spendResources(state, cost) {
    Object.entries(cost).forEach(([resource, amount]) => { state.resources[resource] -= amount; });
  }

  function hasUnlock(state, unlock) { return state.unlocks.includes(unlock); }
  function addUnlock(state, unlock) {
    if (!hasUnlock(state, unlock)) state.unlocks.push(unlock);
  }

  function result(state, ok, message, action, shouldRecord) {
    state.lastEvent = message;
    if (ok && shouldRecord && action) state.actionLog.push(clone(action));
    return { ok, message };
  }

  function consumeAction(state) {
    if (state.actionPoints <= 0) return false;
    state.actionPoints -= 1;
    return true;
  }

  function consumeActions(state, count) {
    if (state.actionPoints < count) return false;
    state.actionPoints -= count;
    return true;
  }

  function hasShelter(state) {
    return Boolean(state.shelterBuilt) && state.buildings.some((building) => building.type === "teepee" && !building.destroyed);
  }

  function makeTeepee() {
    return {
      id: "b-teepee",
      type: "teepee",
      x: SHELTER_SITE.x,
      y: SHELTER_SITE.y,
      health: BUILDINGS.teepee.maxHealth,
      maxHealth: BUILDINGS.teepee.maxHealth,
      destroyed: false,
    };
  }

  function createRun(seed) {
    return {
      version: SAVE_VERSION,
      mapId: BOARD.id,
      seed: String(seed || DEFAULT_SEED).trim() || DEFAULT_SEED,
      levelIndex: 0,
      phase: "day",
      tick: 0,
      nightTick: 0,
      actionPoints: STARTING_ACTIONS,
      resources: { wood: 0 },
      xp: 0,
      unlocks: [],
      research: [],
      terrain: FIXED_TERRAIN.slice(),
      shelterBuilt: false,
      buildings: [],
      rubble: [],
      scout: {
        ...clone(UNITS.scout),
        x: 5,
        y: 7,
        postX: 5,
        postY: 7,
        cooldown: 0,
        targetId: null,
        mode: "idle",
      },
      enemies: [],
      projectiles: [],
      impacts: [],
      encounter: null,
      topologyVersion: 0,
      nextEntityId: 1,
      kills: 0,
      actionLog: [],
      lastEvent: "Build a shelter before the first watch.",
      outcome: null,
      aftermathTicks: 0,
      paused: false,
      speed: 1,
      history: [],
    };
  }

  function createEnemy(state, type, spawn) {
    const recipe = enemyRecipe(type);
    const id = `e-${state.nextEntityId}`;
    state.nextEntityId += 1;
    return {
      id,
      type,
      x: spawn.x,
      y: spawn.y,
      health: recipe.health,
      maxHealth: recipe.health,
      cooldown: 5,
      approachDelay: (recipe.arrivalPauseTicks || 0) + (state.nextEntityId % 4) * 2,
      targetId: null,
      intent: "approaching",
      spawnEdge: spawn.edge,
    };
  }

  function buildEncounter(state) {
    const level = levelFor(state);
    const rng = createRng(`${state.seed}|${level.id}`);
    const units = [];
    let remaining = level.threatBudget;
    let attempts = 24;
    while (remaining > 0 && attempts > 0) {
      attempts -= 1;
      const affordable = level.enemyPool.filter((type) => enemyRecipe(type).threat <= remaining);
      if (!affordable.length) break;
      const type = rng.pick(affordable);
      units.push(type);
      remaining -= enemyRecipe(type).threat;
    }

    const waves = [];
    let cursor = 0;
    let spawnTick = 18 + rng.int(0, 8);
    while (cursor < units.length) {
      const remainingUnits = units.length - cursor;
      const groupSize = Math.min(remainingUnits, remainingUnits >= 4 && rng.next() > 0.62 ? 2 : 1);
      const entry = clone(rng.pick(SPAWN_CELLS));
      waves.push({
        id: `wave-${waves.length + 1}`,
        spawnTick,
        entry,
        units: units.slice(cursor, cursor + groupSize),
        spawned: false,
      });
      cursor += groupSize;
      spawnTick += rng.int(42, 66);
    }
    return {
      threatBudget: level.threatBudget,
      units,
      waves,
      total: units.length,
      spawned: 0,
    };
  }

  function validFootprint(state, type, x, y) {
    const recipe = buildingRecipe(type);
    if (!recipe) return false;
    for (let row = y; row < y + recipe.footprint.height; row += 1) {
      for (let column = x; column < x + recipe.footprint.width; column += 1) {
        if (!inBounds(column, row) || !isBuildableGrass(state, column, row) || hasRubble(state, column, row) || buildingAt(state, column, row)) return false;
      }
    }
    return true;
  }

  function buildPreview(state, type, x, y) {
    const recipe = buildingRecipe(type);
    if (!recipe) return { valid: false, message: "Unknown building." };
    const valid = validFootprint(state, type, x, y);
    const affordable = hasResources(state, recipe.cost);
    const candidate = { id: "preview", type, x, y };
    const level = levelFor(state);
    const encounter = buildEncounter(state);
    const target = closestReachableBuilding(state, encounter.waves[0].entry, candidate, ENEMIES.raccoon);
    const coverage = distance({ x: state.scout.postX, y: state.scout.postY }, { x, y }) <= state.scout.attackRange + 0.5;
    return {
      valid,
      affordable,
      coverage,
      targetId: target?.building.id || null,
      targetLabel: target?.building.id === "preview" ? recipe.label : target ? buildingRecipe(target.building.type).label : "none",
      path: target?.path || [],
      cost: recipe.cost,
      level: level.number,
    };
  }

  function dispatch(state, action, options) {
    const shouldRecord = options?.record !== false;
    if (!action || !action.type) return result(state, false, "That action is not understood.");

    if (state.phase !== "day" && action.type !== "speed" && action.type !== "pause") {
      return result(state, false, "Day actions are only available before nightfall.");
    }

    if (!state.shelterBuilt && action.type !== "constructShelter") {
      return result(state, false, "Construct shelter before taking other actions.", action, shouldRecord);
    }

    if (action.type === "constructShelter") {
      if (state.shelterBuilt || hasShelter(state)) return result(state, false, "The shelter is already built.");
      if (state.levelIndex !== 0) return result(state, false, "The shelter can only be built at the start of Level 1.");
      if (!consumeActions(state, STARTING_ACTIONS)) return result(state, false, "Constructing the shelter takes the full first day.");
      state.buildings.push(makeTeepee());
      state.shelterBuilt = true;
      invalidatePaths(state);
      return result(state, true, "Shelter complete. End the day when Scout is ready for the first watch.", action, shouldRecord);
    }

    if (action.type === "research") {
      const outcome = TechTree.research(state, action.nodeId);
      return result(state, outcome.ok, outcome.message, action, shouldRecord);
    }

    if (action.type === "clear") {
      const terrain = terrainAt(state, action.x, action.y);
      if (terrain !== "tree" && !hasRubble(state, action.x, action.y)) return result(state, false, "Only a tree or rubble can be cleared there.");
      if (terrain === "tree") {
        if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
        setTerrain(state, action.x, action.y, "cleared");
        state.resources.wood += 2;
        invalidatePaths(state);
        return result(state, true, "Tree cleared: +2 wood. One day action spent; the grass is now open.", action, shouldRecord);
      }
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      state.rubble = state.rubble.filter((rubble) => !(rubble.x === action.x && rubble.y === action.y));
      invalidatePaths(state);
      return result(state, true, "Rubble cleared. The grass is open again.", action, shouldRecord);
    }

    if (action.type === "repair") {
      const building = state.buildings.find((item) => item.id === action.id && !item.destroyed);
      if (!building) return result(state, false, "Choose a standing building to repair.");
      const recipe = buildingRecipe(building.type);
      if (building.health >= building.maxHealth) return result(state, false, `${recipe.label} is already sound.`);
      if (!hasResources(state, recipe.repairCost)) return result(state, false, "Repairing needs 1 wood.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      spendResources(state, recipe.repairCost);
      building.health = Math.min(building.maxHealth, building.health + recipe.repairAmount);
      return result(state, true, `${recipe.label} repaired.`, action, shouldRecord);
    }

    if (action.type === "scout") {
      if (!isPassable(state, action.x, action.y)) return result(state, false, "Scout needs an open cell.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      state.scout.x = action.x;
      state.scout.y = action.y;
      state.scout.postX = action.x;
      state.scout.postY = action.y;
      state.scout.targetId = null;
      state.scout.mode = "idle";
      return result(state, true, "Scout settles into a new watch position.", action, shouldRecord);
    }

    if (action.type === "build") {
      const recipe = buildingRecipe(action.buildingType);
      if (!recipe || ["teepee", "arrowShooter"].includes(action.buildingType)) return result(state, false, "That building cannot be placed here.");
      if (!hasUnlock(state, action.buildingType)) return result(state, false, `${recipe.label} has not been unlocked yet.`);
      if (!validFootprint(state, action.buildingType, action.x, action.y)) return result(state, false, "That grass is blocked or occupied.");
      if (!hasResources(state, recipe.cost)) return result(state, false, `Need ${recipe.cost.wood || 0} wood to build this.`);
      if (!consumeActions(state, recipe.actionCost || 1)) return result(state, false, "Both day actions are spent.");
      spendResources(state, recipe.cost);
      state.buildings.push({
        id: `b-${state.nextEntityId++}`,
        type: action.buildingType,
        x: action.x,
        y: action.y,
        health: recipe.maxHealth,
        maxHealth: recipe.maxHealth,
        cooldown: 0,
        targetId: null,
        firingTicks: 0,
        destroyed: false,
      });
      invalidatePaths(state);
      return result(state, true, `${recipe.label} built. One day action spent.`, action, shouldRecord);
    }

    if (action.type === "upgradeLauncher") {
      const building = state.buildings.find((item) => item.id === action.id && !item.destroyed);
      if (!building || building.type !== "stickLauncher") return result(state, false, "Choose a standing Stick Launcher to upgrade.");
      if (TechTree.effectsFor(state).unlocksBuildingUpgrade !== "arrowShooter") return result(state, false, "Research Arrowcraft before upgrading a launcher.");
      const cost = { wood: 4 };
      if (!hasResources(state, cost)) return result(state, false, "An Arrow Shooter upgrade needs 4 wood.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      spendResources(state, cost);
      const recipe = buildingRecipe("arrowShooter");
      building.type = "arrowShooter";
      building.maxHealth = recipe.maxHealth;
      building.health = Math.min(building.health, recipe.maxHealth);
      building.cooldown = 0;
      building.targetId = null;
      building.firingTicks = 0;
      return result(state, true, "Arrow Shooter built from the launcher. One day action spent.", action, shouldRecord);
    }

    if (action.type === "endDay") {
      state.phase = "night";
      state.nightTick = 0;
      state.paused = false;
      state.encounter = buildEncounter(state);
      state.lastEvent = "Night falls. The first group is moving through the trees.";
      return result(state, true, state.lastEvent, action, shouldRecord);
    }

    if (action.type === "pause") {
      if (state.phase !== "night") return result(state, false, "Pause is only available during the night.");
      state.paused = !state.paused;
      return result(state, true, state.paused ? "Night paused." : "Night resumed.", null, false);
    }

    if (action.type === "speed") {
      if (state.phase !== "night" || ![1, 2].includes(action.speed)) return result(state, false, "Night speed can only be set to 1× or 2×.");
      state.speed = action.speed;
      return result(state, true, `Night speed set to ${action.speed}×.`, null, false);
    }

    return result(state, false, "That action is not available.");
  }

  function spawnWaves(state) {
    for (const wave of state.encounter.waves) {
      if (!wave.spawned && wave.spawnTick <= state.nightTick) {
        wave.spawned = true;
        wave.units.forEach((type) => state.enemies.push(createEnemy(state, type, wave.entry)));
        state.encounter.spawned += wave.units.length;
        const names = wave.units.map((type) => enemyRecipe(type).label.toLowerCase()).join(" and ");
        state.lastEvent = `A ${names} enters from the ${wave.entry.edge} forest.`;
      }
    }
  }

  function damageBuilding(state, building, amount, source) {
    building.health = Math.max(0, building.health - amount);
    state.lastEvent = `${enemyRecipe(source.type).label} hits the ${buildingRecipe(building.type).label.toLowerCase()}.`;
    if (building.health > 0) return;
    building.destroyed = true;
    if (building.type === "teepee") {
      state.phase = "lost";
      state.outcome = { victory: false, title: "The teepee falls.", copy: "Scout retreats into the trees. Try the same seed again with a different plan." };
      state.history.push({ level: levelFor(state).id, result: "lost", seed: state.seed });
      return;
    }
    buildingCells(building).forEach((cell) => state.rubble.push({ x: cell.x, y: cell.y }));
    invalidatePaths(state);
    state.lastEvent = `The ${buildingRecipe(building.type).label.toLowerCase()} becomes rubble and blocks the ground.`;
  }

  function defeatEnemy(state, enemy, source) {
    const reward = enemyRecipe(enemy.type).xp;
    state.kills += 1;
    state.xp += reward;
    state.enemies = state.enemies.filter((item) => item.id !== enemy.id);
    state.lastEvent = `${source} turns away the ${enemyRecipe(enemy.type).label.toLowerCase()}: +${reward} XP.`;
  }

  function updateProjectiles(state) {
    state.impacts = state.impacts.filter((impact) => impact.ticks > 1).map((impact) => ({ ...impact, ticks: impact.ticks - 1 }));
    const remaining = [];
    state.projectiles.forEach((projectile) => {
      const target = state.enemies.find((enemy) => enemy.id === projectile.targetId);
      if (!target) return;
      const travel = projectile.speed / TICK_RATE;
      if (distance(projectile, target) <= travel + enemyRecipe(target.type).collisionRadius) {
        projectile.x = target.x;
        projectile.y = target.y;
        target.health = Math.max(0, target.health - projectile.damage);
        if (target.health > 0 && projectile.knockback) applyKnockback(state, target, projectile);
        state.impacts.push({ id: `impact-${state.nextEntityId++}`, x: target.x, y: target.y, ticks: 6, type: projectile.type });
        if (target.health === 0) defeatEnemy(state, target, projectile.sourceLabel);
        return;
      }
      projectile.angle = Math.atan2(target.y - projectile.y, target.x - projectile.x) * (180 / Math.PI);
      moveTowards(projectile, target, travel);
      projectile.age += 1;
      remaining.push(projectile);
    });
    state.projectiles = remaining;
  }

  function applyKnockback(state, enemy, projectile) {
    const dx = enemy.x - projectile.originX;
    const dy = enemy.y - projectile.originY;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const destination = {
      x: enemy.x + (dx / length) * projectile.knockback,
      y: enemy.y + (dy / length) * projectile.knockback,
    };
    if (!isPassable(state, Math.round(destination.x), Math.round(destination.y))) return;
    enemy.x = destination.x;
    enemy.y = destination.y;
    enemy.knockbackTicks = 8;
  }

  function updateTowers(state) {
    state.buildings.filter((building) => !building.destroyed && TOWER_TYPES.includes(building.type)).forEach((tower) => {
      const recipe = buildingRecipe(tower.type);
      tower.cooldown = Math.max(0, (tower.cooldown || 0) - 1);
      tower.firingTicks = Math.max(0, (tower.firingTicks || 0) - 1);
      const targets = state.enemies
        .filter((enemy) => distance(tower, enemy) <= recipe.attackRange + enemyRecipe(enemy.type).collisionRadius)
        .sort((left, right) => distance(tower, left) - distance(tower, right) || String(left.id).localeCompare(String(right.id)));
      const target = targets[0];
      tower.targetId = target?.id || null;
      if (!target || tower.cooldown > 0) return;
      state.projectiles.push({
        id: `p-${state.nextEntityId++}`,
        type: recipe.projectile.type,
        sourceId: tower.id,
        sourceLabel: recipe.label,
        targetId: target.id,
        x: tower.x,
        y: tower.y,
        damage: recipe.damage,
        speed: recipe.projectile.speed,
        knockback: recipe.knockback || 0,
        originX: tower.x,
        originY: tower.y,
        angle: Math.atan2(target.y - tower.y, target.x - tower.x) * (180 / Math.PI),
        age: 0,
      });
      tower.cooldown = Math.max(1, Math.round(TICK_RATE / recipe.attackSpeed));
      tower.firingTicks = 5;
      state.lastEvent = tower.type === "arrowShooter"
        ? "The Arrow Shooter sends an arrow through the trees."
        : tower.type === "potatoGun"
          ? "The Potato Gun thumps a heavy shot through the trees."
          : "The Stick Launcher snaps a sharpened branch through the trees.";
    });
  }

  function updateScout(state) {
    const scout = state.scout;
    scout.cooldown = Math.max(0, scout.cooldown - 1);
    const post = { x: scout.postX, y: scout.postY };
    const targets = state.enemies.filter((enemy) => distance(post, enemy) <= scout.attackRange + enemyRecipe(enemy.type).collisionRadius)
      .sort((left, right) => distance(post, left) - distance(post, right) || String(left.id).localeCompare(String(right.id)));
    const target = targets[0];

    if (!target) {
      scout.targetId = null;
      if (distance(scout, post) > 0.03) {
        scout.mode = "returning";
        moveTowards(scout, post, scout.moveSpeed / TICK_RATE);
      } else {
        scout.mode = "idle";
        scout.x = post.x;
        scout.y = post.y;
      }
      return;
    }

    scout.targetId = target.id;
    const reach = scout.attackReach + enemyRecipe(target.type).collisionRadius;
    if (distance(scout, target) > reach) {
      scout.mode = "chasing";
      moveTowards(scout, target, scout.moveSpeed / TICK_RATE);
      return;
    }

    scout.mode = "attacking";
    if (scout.cooldown > 0) return;
    target.health = Math.max(0, target.health - scout.damage);
    scout.cooldown = Math.max(1, Math.round(TICK_RATE / scout.attackSpeed));
    state.lastEvent = `Scout lunges at the ${enemyRecipe(target.type).label.toLowerCase()} inside his watch radius.`;
    if (target.health === 0) {
      scout.targetId = null;
      defeatEnemy(state, target, "Scout");
    }
  }

  function moveTowards(entity, destination, distanceToTravel) {
    const dx = destination.x - entity.x;
    const dy = destination.y - entity.y;
    const remaining = Math.hypot(dx, dy);
    if (remaining <= distanceToTravel || remaining === 0) {
      entity.x = destination.x;
      entity.y = destination.y;
      return;
    }
    entity.x += (dx / remaining) * distanceToTravel;
    entity.y += (dy / remaining) * distanceToTravel;
  }

  function updateEnemy(state, enemy) {
    const recipe = enemyRecipe(enemy.type);
    enemy.knockbackTicks = Math.max(0, (enemy.knockbackTicks || 0) - 1);
    if (enemy.approachDelay > 0) {
      enemy.approachDelay -= 1;
      enemy.intent = "sneaking";
      return;
    }
    const target = closestReachableBuilding(state, enemy);
    if (!target) {
      enemy.intent = "searching";
      return;
    }
    enemy.targetId = target.building.id;
    const closeEnough = distance(enemy, target.approach) <= recipe.attackRange;
    if (closeEnough) {
      enemy.intent = `attacking-${target.building.id}`;
      enemy.cooldown = Math.max(0, enemy.cooldown - 1);
      if (enemy.cooldown === 0) {
        enemy.cooldown = Math.max(1, Math.round(TICK_RATE / recipe.attackSpeed));
        damageBuilding(state, target.building, recipe.damage, enemy);
      }
      return;
    }
    enemy.intent = `moving-${target.building.id}`;
    const nextStep = target.path.length > 1 ? target.path[1] : target.approach;
    const stepCost = travelCost(state, nextStep.x, nextStep.y, recipe);
    enemy.inWarmth = false;
    moveTowards(enemy, nextStep, recipe.moveSpeed / TICK_RATE / stepCost);
  }

  function beginAftermath(state) {
    state.phase = "aftermath";
    state.aftermathTicks = 0;
    state.lastEvent = "The forest goes quiet. Scout makes his way back to the watch post.";
  }

  function startNextDay(state, completedLevel, completionCopy) {
    state.levelIndex += 1;
    state.phase = "day";
    state.actionPoints = STARTING_ACTIONS;
    state.nightTick = 0;
    state.encounter = null;
    state.enemies = [];
    state.projectiles = [];
    state.impacts = [];
    state.paused = false;
    state.speed = 1;
    state.outcome = null;
    state.aftermathTicks = 0;
    const nextLevel = levelFor(state);
    state.lastEvent = `${completedLevel.title} held. ${completionCopy} Level ${nextLevel.number}: ${nextLevel.title}. Two day actions are ready.`;
  }

  function settleAftermath(state) {
    const level = levelFor(state);
    state.xp += level.survivalXp;
    const unlockedNow = Boolean(level.unlock) && !hasUnlock(state, level.unlock);
    if (unlockedNow) addUnlock(state, level.unlock);
    const completionCopy = unlockedNow
      ? `+${level.survivalXp} XP. ${level.unlockLabel} unlocked. ${level.unlockCopy}`
      : `+${level.survivalXp} survival XP.`;
    state.history.push({ level: level.id, result: "victory", seed: state.seed, kills: state.kills });
    startNextDay(state, level, completionCopy);
  }

  function advanceTick(state) {
    if (!["night", "aftermath"].includes(state.phase) || state.paused) return state;
    state.tick += 1;
    if (state.phase === "aftermath") {
      state.aftermathTicks += 1;
      updateScout(state);
      const home = { x: state.scout.postX, y: state.scout.postY };
      if (state.aftermathTicks >= 40 && distance(state.scout, home) <= 0.04) settleAftermath(state);
      return state;
    }
    state.nightTick += 1;
    spawnWaves(state);
    updateProjectiles(state);
    updateTowers(state);
    updateScout(state);
    if (state.phase !== "night") return state;
    [...state.enemies].forEach((enemy) => {
      if (state.phase === "night" && state.enemies.some((item) => item.id === enemy.id)) updateEnemy(state, enemy);
    });
    if (state.phase === "night" && state.encounter.waves.every((wave) => wave.spawned) && state.enemies.length === 0 && state.projectiles.length === 0) beginAftermath(state);
    return state;
  }

  function advanceTicks(state, count) {
    for (let index = 0; index < count && ["night", "aftermath"].includes(state.phase); index += 1) advanceTick(state);
    return state;
  }

  function conditionFor(building) {
    const ratio = building.health / building.maxHealth;
    if (ratio <= 0.25) return "near-collapse";
    if (ratio <= 0.55) return "damaged";
    if (ratio < 1) return "worn";
    return "intact";
  }

  function serialize(state) {
    return JSON.stringify({ version: SAVE_VERSION, state });
  }

  function hydrate(serialized) {
    const parsed = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
    if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state || parsed.state.version !== SAVE_VERSION) throw new Error("This save belongs to a different version of Wild Hearth.");
    const state = parsed.state;
    if (!Array.isArray(state.terrain) || state.terrain.length !== BOARD.width * BOARD.height) throw new Error("This save has an invalid meadow.");
    if (typeof state.shelterBuilt !== "boolean" || !Array.isArray(state.buildings)) throw new Error("This save has an invalid shelter state.");
    const teepeeCount = state.buildings.filter((building) => building.type === "teepee" && !building.destroyed).length;
    if ((state.shelterBuilt && teepeeCount !== 1) || (!state.shelterBuilt && teepeeCount !== 0)) throw new Error("This save has an invalid shelter state.");
    pathCaches.delete(state);
    return state;
  }

  function replay(seed, actionLog) {
    const state = createRun(seed);
    for (const action of actionLog) {
      dispatch(state, action, { record: false });
      if (action.type === "endDay") {
        let guard = 14000;
        while (["night", "aftermath"].includes(state.phase) && guard > 0) { advanceTick(state); guard -= 1; }
      }
    }
    return state;
  }

  function checksum(state) {
    return JSON.stringify({
      phase: state.phase,
      levelIndex: state.levelIndex,
      resources: state.resources,
      xp: state.xp,
      unlocks: state.unlocks,
      research: state.research,
      shelterBuilt: state.shelterBuilt,
      kills: state.kills,
      terrain: state.terrain,
      buildings: state.buildings.map((building) => ({ id: building.id, type: building.type, x: building.x, y: building.y, health: building.health, maxHealth: building.maxHealth, destroyed: building.destroyed })),
      rubble: state.rubble,
      outcome: state.outcome,
      scout: {
        x: state.scout.x,
        y: state.scout.y,
        postX: state.scout.postX,
        postY: state.scout.postY,
        mode: state.scout.mode,
      },
    });
  }

  function simulate(seed, actions) {
    const state = actions ? replay(seed, actions) : createRun(seed);
    return { state, checksum: checksum(state) };
  }

  return {
    SAVE_VERSION,
    TICK_RATE,
    BOARD,
    UNITS,
    ENEMIES,
    BUILDINGS,
    TOWER_TYPES,
    SHELTER_SITE,
    TECH_TREE: TechTree.NODES,
    ENEMY_COUNTERS,
    LEVELS,
    STARTING_ACTIONS,
    DEFAULT_SEED,
    SPAWN_CELLS,
    createRun,
    createRng,
    nextSeed,
    levelFor,
    mediumThreatBudget,
    techAvailability: TechTree.availability,
    hasResearch: TechTree.isResearched,
    terrainAt,
    inBounds,
    cellKey,
    buildingCells,
    buildingAt,
    isPassable,
    isBuildableGrass,
    hasShelter,
    hasRubble,
    validFootprint,
    buildPreview,
    closestReachableBuilding,
    conditionFor,
    dispatch,
    advanceTick,
    advanceTicks,
    serialize,
    hydrate,
    replay,
    checksum,
    simulate,
  };
}));
