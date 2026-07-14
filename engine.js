/*
 * Wild Hearth simulation engine.
 *
 * This file intentionally knows nothing about the DOM. The browser UI and the
 * headless simulator both drive these same deterministic state transitions.
 */
(function registerWildHearthEngine(root, factory) {
  const techTree = typeof module !== "undefined" && module.exports ? require("./talent-tree.js") : root.WildHearthTalentTree;
  const engine = factory(techTree);
  if (typeof module !== "undefined" && module.exports) module.exports = engine;
  root.WildHearthEngine = engine;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildEngine(TechTree) {
  if (!TechTree) throw new Error("Wild Hearth Talent Tree did not load.");
  const SAVE_VERSION = 15;
  const TICK_RATE = 20;
  const SPEED_OPTIONS = [1, 2, 5];
  const FIRST_SKILL_POINT_XP = 10;
  const BOARD = { id: "hearth-meadow", label: "Hearth Meadow", width: 15, height: 15 };
  const STARTING_ACTIONS = 2;
  const DEFAULT_SEED = "HEARTH-1042";
  const pathCaches = new WeakMap();
  const SHELTER_SITE = { x: Math.floor(BOARD.width / 2), y: Math.floor(BOARD.height / 2) };
  const SCOUT_POST = { x: SHELTER_SITE.x - 1, y: SHELTER_SITE.y + 1 };
  const CLEARING_RADIUS = 2.28;
  const OPENING_PICKUPS = [
    { id: "starter-stick", type: "stick", x: SHELTER_SITE.x - 2, y: SHELTER_SITE.y },
    { id: "starter-rock", type: "rock", x: SHELTER_SITE.x + 2, y: SHELTER_SITE.y },
  ];

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

  // The authoritative enemy catalog. Levels, damage rules, counters, loot, and
  // renderer ids all point here; add a new enemy here before using its id elsewhere.
  const ENEMIES = {
    mouse: {
      id: "mouse",
      label: "Mouse",
      threat: 1,
      health: 2,
      damage: 0.25,
      attackSpeed: 0.8,
      moveSpeed: 1.45,
      attackRange: 0.62,
      collisionRadius: 0.2,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "sneak",
      arrivalPauseTicks: 5,
      forestMoveCost: 1.26,
      xp: 1,
      drops: { hides: { min: 0, max: 1 } },
    },
    raccoon: {
      id: "raccoon",
      label: "Raccoon",
      threat: 2,
      health: 8,
      damage: 1,
      attackSpeed: 0.78,
      moveSpeed: 1.18,
      attackRange: 0.76,
      collisionRadius: 0.31,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "sneak",
      arrivalPauseTicks: 3,
      forestMoveCost: 1.42,
      xp: 2,
      drops: { hides: { min: 1, max: 2 } },
    },
    boar: {
      id: "boar",
      label: "Boar",
      threat: 5,
      health: 15,
      damage: 2,
      attackSpeed: 0.72,
      moveSpeed: 1.2,
      attackRange: 0.82,
      collisionRadius: 0.44,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "trudge",
      arrivalPauseTicks: 0,
      forestMoveCost: 1.82,
      xp: 3,
      drops: { hides: { min: 2, max: 4 } },
      projectileDamageMultipliers: { stick: 0, arrow: 0 },
    },
    bear: {
      id: "bear",
      label: "Bear",
      threat: 8,
      health: 30,
      damage: 3,
      attackSpeed: 0.48,
      moveSpeed: 0.76,
      attackRange: 0.92,
      collisionRadius: 0.56,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "trudge",
      arrivalPauseTicks: 0,
      forestMoveCost: 2.05,
      xp: 5,
      drops: { hides: { min: 4, max: 6 } },
      knockbackMultiplier: 0.25,
      statusDamageMultipliers: { burn: 2 },
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
      targetable: true,
      blocksPath: true,
      tags: ["home"],
      repairAmount: 4,
      repairCost: { wood: 1 },
    },
    stickLauncher: {
      id: "stickLauncher",
      label: "Stick launcher",
      footprint: { width: 1, height: 1 },
      maxHealth: 8,
      cost: { wood: 2 },
      actionCost: 1,
      role: "tower",
      targetable: true,
      blocksPath: true,
      tags: ["defense", "first-line"],
      damage: 1,
      attackSpeed: 0.5,
      attackRange: 1.75,
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
      targetable: true,
      blocksPath: true,
      tags: ["defense", "first-line", "arrowcraft"],
      damage: 1.5,
      attackSpeed: 0.75,
      attackRange: 2.625,
      projectile: { type: "arrow", speed: 6.5 },
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
      refits: {
        quickcord: {
          id: "quickcord",
          label: "Quickcord",
          cost: { wood: 2 },
          actionCost: 1,
          statModifiers: [{ stat: "attackSpeed", operation: "multiply", value: 1.25 }],
          restoreHealth: true,
        },
      },
    },
    potatoPatch: {
      id: "potatoPatch",
      label: "Potato patch",
      footprint: { width: 1, height: 1 },
      maxHealth: 1,
      cost: { wood: 1 },
      actionCost: 1,
      role: "growing counter",
      targetable: false,
      blocksPath: false,
      tags: ["garden", "growing"],
      maturityNights: 2,
    },
    potatoGun: {
      id: "potatoGun",
      label: "Potato gun",
      footprint: { width: 1, height: 1 },
      maxHealth: 8,
      cost: { wood: 3 },
      actionCost: 1,
      role: "heavy tower",
      conversionOnly: true,
      targetable: true,
      blocksPath: true,
      tags: ["defense", "heavy"],
      damage: 4,
      attackSpeed: 0.45,
      attackRange: 3,
      projectile: { type: "potato", speed: 3.5 },
      knockback: 1,
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
    },
    campfire: {
      id: "campfire",
      label: "Campfire",
      footprint: { width: 1, height: 1 },
      maxHealth: 10,
      cost: { wood: 4 },
      actionCost: 1,
      role: "fire tower",
      targetable: true,
      blocksPath: true,
      tags: ["defense", "fire", "bear-counter"],
      damage: 1,
      attackSpeed: 0.5,
      attackRange: 2.5,
      projectile: { type: "fireball", speed: 4.8 },
      statuses: [{
        status: "burn",
        statusSource: "campfireBurn",
        durationTicks: 60,
        damagePerTick: 1,
        tickIntervalTicks: TICK_RATE,
        stackRule: "refresh",
      }],
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
    },
  };
  const TOWER_TYPES = Object.values(BUILDINGS).filter((recipe) => recipe.projectile && recipe.damage > 0).map((recipe) => recipe.id);

  const ENEMY_COUNTERS = {
    mouse: { unit: "scout", explanation: "Scout can turn away a mouse before it harms the hearth." },
    raccoon: { building: "stickLauncher", explanation: "Stick Launchers are the first reliable answer to raccoons." },
    boar: { building: "potatoGun", explanation: "Boars ignore Stick and Arrow tower shots; a Potato Gun is the heavy answer." },
    bear: { building: "campfire", explanation: "Campfire fireballs burn bears for double damage over time." },
  };

  const LEVELS = [
    {
      id: "first-watch",
      number: 1,
      title: "First watch",
      enemyPool: ["mouse"],
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
      minimumEnemies: { raccoon: 1 },
      survivalXp: 3,
      unlock: "potatoPatch",
      unlockLabel: "Potato patch",
      unlockCopy: "Plant a 1-wood Potato Patch on Level 3 so it can mature before the Boar arrives.",
    },
    {
      id: "arrowcraft",
      number: 3,
      title: "Arrowcraft",
      enemyPool: ["mouse", "raccoon"],
      survivalXp: 4,
      unlock: null,
    },
    {
      id: "hearthkeeping",
      number: 4,
      title: "Hearthkeeping",
      enemyPool: ["mouse", "raccoon"],
      survivalXp: 5,
      unlock: "potatoGun",
      unlockLabel: "Potato Gun",
      unlockCopy: "A mature Potato Patch can become a 3-wood heavy launcher before the first Boar.",
    },
    {
      id: "first-boar",
      number: 5,
      title: "First boar",
      enemyPool: ["boar"],
      minimumEnemies: { boar: 1 },
      survivalXp: 7,
      unlock: null,
    },
    {
      id: "heavy-footing",
      number: 6,
      title: "Heavy footing",
      enemyPool: ["mouse", "raccoon", "boar"],
      minimumEnemies: { boar: 1 },
      survivalXp: 8,
      unlock: "campfire",
      unlockLabel: "Campfire",
      unlockCopy: "Build a 4-wood Campfire before the first Bear. Its fireballs burn enemies.",
    },
    {
      id: "embers",
      number: 7,
      title: "Embers",
      enemyPool: ["mouse", "raccoon", "boar"],
      minimumEnemies: { boar: 1 },
      survivalXp: 9,
      unlock: null,
    },
    {
      id: "first-bear",
      number: 8,
      title: "First bear",
      enemyPool: ["mouse", "raccoon", "boar", "bear"],
      minimumEnemies: { bear: 1 },
      survivalXp: 11,
      unlock: null,
    },
  ];

  function makeFixedTerrain() {
    const terrain = Array.from({ length: BOARD.width * BOARD.height }, () => "tree");
    const set = (x, y, type) => { terrain[y * BOARD.width + x] = type; };
    const open = (x, y) => set(x, y, "open");

    for (let y = SHELTER_SITE.y - 3; y <= SHELTER_SITE.y + 3; y += 1) {
      for (let x = SHELTER_SITE.x - 3; x <= SHELTER_SITE.x + 3; x += 1) {
        if (Math.hypot(x - SHELTER_SITE.x, y - SHELTER_SITE.y) <= CLEARING_RADIUS) open(x, y);
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
  function spawnCellsOnEdge(edge) { return SPAWN_CELLS.filter((cell) => cell.edge === edge); }

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

  function shuffled(items, rng) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = rng.int(0, index);
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
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
    if (authored) return { ...authored, minimumEnemies: { ...(authored.minimumEnemies || {}) }, threatBudget: mediumThreatBudget(number) };
    return {
      id: `night-${number}`,
      number,
      title: "Growing pressure",
      enemyPool: number >= 8 ? ["mouse", "raccoon", "boar", "bear"] : number >= 5 ? ["mouse", "raccoon", "boar"] : ["mouse", "raccoon"],
      minimumEnemies: {},
      survivalXp: Math.max(3, Math.ceil(number * 1.25)),
      unlock: null,
      threatBudget: mediumThreatBudget(number),
    };
  }
  function buildingRecipe(type) { return BUILDINGS[type]; }
  function enemyRecipe(type) { return ENEMIES[type]; }
  function activeBuildings(state) { return state.buildings.filter((building) => !building.destroyed); }
  function buildingBlocksPath(building) { return buildingRecipe(building.type)?.blocksPath !== false; }
  function isTargetableBuilding(building) { return buildingRecipe(building.type)?.targetable !== false; }
  function unitStats(state, id) {
    const base = UNITS[id];
    if (!base) return null;
    const stats = { ...base };
    ["damage", "attackSpeed", "moveSpeed", "attackRange", "attackReach"].forEach((stat) => {
      if (typeof base[stat] === "number") stats[stat] = TechTree.statValue(state, "unit", id, stat, base[stat]);
    });
    return stats;
  }
  function refitDefinition(type, refitId) {
    const recipe = buildingRecipe(type);
    return recipe?.refits?.[refitId] || null;
  }
  function buildingRefits(building) {
    return Array.isArray(building?.refits) ? building.refits : [];
  }
  function applyStatModifiers(baseValue, modifiers) {
    let value = baseValue;
    modifiers.filter((modifier) => modifier.operation === "add").forEach((modifier) => { value += modifier.value; });
    modifiers.filter((modifier) => modifier.operation === "multiply").forEach((modifier) => { value *= modifier.value; });
    modifiers.filter((modifier) => modifier.operation === "set").forEach((modifier) => { value = modifier.value; });
    return value;
  }
  function buildingCombatStats(state, type, building) {
    const base = buildingRecipe(type);
    if (!base) return null;
    const stats = { ...base };
    ["damage", "attackSpeed", "attackRange"].forEach((stat) => {
      if (typeof base[stat] === "number") stats[stat] = TechTree.statValue(state, "building", type, stat, base[stat]);
    });
    const refitModifiers = buildingRefits(building).flatMap((refitId) => refitDefinition(type, refitId)?.statModifiers || []);
    ["damage", "attackSpeed", "attackRange"].forEach((stat) => {
      const modifiers = refitModifiers.filter((modifier) => modifier.stat === stat);
      if (modifiers.length) stats[stat] = applyStatModifiers(stats[stat], modifiers);
    });
    return stats;
  }
  function maxHealthFor(state, type, building) {
    const recipe = buildingRecipe(type);
    if (!recipe) return 0;
    const bonus = TechTree.effectValue(
      state,
      (effect) => effect.kind === "maxHealth"
        && effect.target === "building"
        && (!effect.scope || effect.scope !== "targetable" || isTargetableBuilding(building || { type })),
      "amount",
    );
    return recipe.maxHealth + bonus;
  }
  function syncBuildingMaxHealth(state, grantAddedHealth) {
    activeBuildings(state).forEach((building) => {
      const previousMax = building.maxHealth;
      const nextMax = maxHealthFor(state, building.type, building);
      building.maxHealth = nextMax;
      if (grantAddedHealth && nextMax > previousMax) building.health += nextMax - previousMax;
      building.health = Math.min(building.health, building.maxHealth);
    });
  }
  function buildingCells(building) {
    const footprint = buildingRecipe(building.type).footprint;
    const cells = [];
    for (let y = building.y; y < building.y + footprint.height; y += 1) {
      for (let x = building.x; x < building.x + footprint.width; x += 1) cells.push({ x, y });
    }
    return cells;
  }

  function buildingAt(state, x, y) {
    const buildings = activeBuildings(state);
    return buildings.find((building) => buildingCells(building).some((cell) => cell.x === x && cell.y === y));
  }

  function scoutPostAt(state, x, y) {
    return Math.round(state.scout.postX) === x && Math.round(state.scout.postY) === y;
  }

  function hasRubble(state, x, y) {
    return state.rubble.some((rubble) => rubble.x === x && rubble.y === y);
  }

  function isPassable(state, x, y) {
    if (!inBounds(x, y) || !["open", "tree", "cleared"].includes(terrainAt(state, x, y)) || hasRubble(state, x, y)) return false;
    return !activeBuildings(state).some((building) => buildingBlocksPath(building) && buildingCells(building).some((cell) => cell.x === x && cell.y === y));
  }

  function isBuildableGrass(state, x, y) {
    return ["open", "cleared"].includes(terrainAt(state, x, y));
  }

  function validScoutPost(state, x, y) {
    return isPassable(state, x, y) && !buildingAt(state, x, y);
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
    const buildings = activeBuildings(state).filter(isTargetableBuilding).concat(extraBuilding && isTargetableBuilding(extraBuilding) ? [extraBuilding] : []);
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

  function closestReachableRubble(state, entity, recipeOverride) {
    const recipe = recipeOverride || (entity?.type ? enemyRecipe(entity.type) : ENEMIES.raccoon);
    const candidates = [];
    state.rubble.forEach((rubble) => {
      const approaches = [
        { x: rubble.x, y: rubble.y - 1 },
        { x: rubble.x + 1, y: rubble.y },
        { x: rubble.x, y: rubble.y + 1 },
        { x: rubble.x - 1, y: rubble.y },
      ].filter((cell) => isPassable(state, cell.x, cell.y));
      approaches.forEach((approach) => {
        const path = findPath(state, entity, approach, recipe);
        if (!path) return;
        const cost = path.slice(1).reduce((sum, cell) => sum + travelCost(state, cell.x, cell.y, recipe), 0);
        candidates.push({ rubble, approach, path, cost });
      });
    });
    candidates.sort((left, right) => left.cost - right.cost
      || left.rubble.y - right.rubble.y
      || left.rubble.x - right.rubble.x
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

  function beginNightTelemetry(state) {
    const level = levelFor(state);
    state.telemetry.currentNight = {
      level: level.id,
      number: level.number,
      seed: state.seed,
      threatBudget: level.threatBudget,
      startedTick: state.tick,
      elapsedTicks: 0,
      spawned: 0,
      spawnEdges: {},
      peakEnemies: 0,
      shotsBySource: {},
      damageBySource: {},
      killsBySource: {},
      buildingHits: 0,
      buildingDamage: 0,
      buildingDamageByType: {},
      homesteadHits: 0,
      buildingsLost: 0,
      hidesCollected: 0,
    };
    state.telemetry.total.nights += 1;
  }

  function currentNightTelemetry(state) { return state.telemetry?.currentNight || null; }
  function increment(record, key, amount = 1) { record[key] = (record[key] || 0) + amount; }
  function recordSpawn(state, edge) {
    const report = currentNightTelemetry(state);
    if (!report) return;
    report.spawned += 1;
    increment(report.spawnEdges, edge);
    state.telemetry.total.enemiesSpawned += 1;
  }
  function recordShot(state, source) {
    const report = currentNightTelemetry(state);
    if (report) increment(report.shotsBySource, source);
  }
  function recordDamageDealt(state, source, amount) {
    const report = currentNightTelemetry(state);
    if (!report || amount <= 0) return;
    increment(report.damageBySource, source, amount);
    state.telemetry.total.damageDealt += amount;
  }
  function recordKill(state, source) {
    const report = currentNightTelemetry(state);
    if (report) increment(report.killsBySource, source);
    state.telemetry.total.kills += 1;
  }
  function recordHides(state, amount) {
    const report = currentNightTelemetry(state);
    if (report) report.hidesCollected += amount;
    state.telemetry.total.hidesCollected += amount;
  }
  function recordBuildingDamage(state, building, amount) {
    const report = currentNightTelemetry(state);
    if (!report || amount <= 0) return;
    report.buildingHits += 1;
    report.buildingDamage += amount;
    increment(report.buildingDamageByType, building.type, amount);
    if (building.type === "teepee") report.homesteadHits += 1;
    state.telemetry.total.buildingDamage += amount;
  }
  function recordPeakEnemies(state) {
    const report = currentNightTelemetry(state);
    if (report) report.peakEnemies = Math.max(report.peakEnemies, state.enemies.length);
  }
  function finishNightTelemetry(state, result) {
    const report = currentNightTelemetry(state);
    if (!report) return null;
    report.elapsedTicks = state.nightTick;
    report.result = result;
    report.remainingEnemies = state.enemies.length;
    if (result === "lost") report.buildingsLost += 1;
    state.telemetry.total.buildingsLost += report.buildingsLost;
    const snapshot = clone(report);
    state.telemetry.nightReports.push(snapshot);
    state.telemetry.currentNight = null;
    return snapshot;
  }

  function telemetrySnapshot(state) {
    return clone({ total: state.telemetry.total, currentNight: state.telemetry.currentNight, nightReports: state.telemetry.nightReports });
  }

  function captureReplaySnapshot(state, result) {
    const level = levelFor(state);
    state.replaySnapshots.push({
      level: level.id,
      number: level.number,
      result,
      actions: state.actionLog.length,
      threatBudget: state.encounter?.threatBudget || level.threatBudget,
      kills: state.kills,
      xp: state.xp,
      skillPoints: state.skillPoints,
      wood: state.resources.wood,
      hides: state.resources.hides,
      buildings: activeBuildings(state).map((building) => ({ id: building.id, type: building.type, health: building.health, maxHealth: building.maxHealth, refits: buildingRefits(building), growthNights: building.growthNights })),
      telemetry: state.telemetry.nightReports[state.telemetry.nightReports.length - 1] || null,
      checksum: checksum(state),
    });
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

  function nextSkillPointThreshold(state) {
    return FIRST_SKILL_POINT_XP * (2 ** Math.max(0, state.skillPointsEarned || 0));
  }

  function grantExperience(state, amount) {
    const gained = Math.max(0, Number(amount) || 0);
    if (!gained) return { gained: 0, skillPoints: 0 };
    state.xp += gained;
    let earned = 0;
    while (state.xp >= nextSkillPointThreshold(state)) {
      state.skillPoints += 1;
      state.skillPointsEarned = (state.skillPointsEarned || 0) + 1;
      earned += 1;
    }
    if (earned > 0) {
      if (!state.firstSkillPointAcknowledged) state.firstSkillPointReady = true;
    }
    return { gained, skillPoints: earned };
  }

  function acknowledgeFirstSkillPoint(state) {
    if (!state.firstSkillPointReady) return false;
    state.firstSkillPointReady = false;
    state.firstSkillPointAcknowledged = true;
    return true;
  }

  function hasShelter(state) {
    return Boolean(state.shelterBuilt) && state.buildings.some((building) => building.type === "teepee" && !building.destroyed);
  }

  function openingPickupAt(state, x, y) {
    return (state.openingPickups || []).find((pickup) => !pickup.collected && pickup.x === x && pickup.y === y) || null;
  }

  function hasOpeningSupplies(state) {
    return OPENING_PICKUPS.every((definition) => state.openingPickups?.some((pickup) => pickup.id === definition.id && pickup.collected));
  }

  function potatoPatchProgress(building) {
    const recipe = building?.type === "potatoPatch" ? buildingRecipe("potatoPatch") : null;
    const requiredNights = recipe?.maturityNights || 0;
    const grownNights = Math.max(0, Math.min(requiredNights, Number(building?.growthNights) || 0));
    return { grownNights, requiredNights, mature: Boolean(recipe) && grownNights >= requiredNights };
  }

  function isPotatoPatchMature(building) {
    return potatoPatchProgress(building).mature;
  }

  function canUpgradePotatoPatch(state, building) {
    return Boolean(building && !building.destroyed && building.type === "potatoPatch" && isPotatoPatchMature(building) && hasUnlock(state, "potatoGun"));
  }

  function makeTeepee(state, x, y) {
    return makeBuilding(state, "b-teepee", "teepee", x, y);
  }

  function makeBuilding(state, id, type, x, y) {
    const recipe = buildingRecipe(type);
    if (!recipe) throw new Error(`Unknown building recipe: ${type}.`);
    const maxHealth = maxHealthFor(state, type, { type });
    return {
      id,
      type,
      x,
      y,
      health: maxHealth,
      maxHealth,
      cooldown: 0,
      targetId: null,
      firingTicks: 0,
      hitTicks: 0,
      refits: [],
      growthNights: type === "potatoPatch" ? 0 : null,
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
      resources: { wood: 0, hides: 0 },
      xp: 0,
      skillPoints: 0,
      skillPointsEarned: 0,
      firstSkillPointReady: false,
      firstSkillPointAcknowledged: false,
      unlocks: [],
      research: [],
      terrain: FIXED_TERRAIN.slice(),
      openingPickups: OPENING_PICKUPS.map((pickup) => ({ ...pickup, collected: false })),
      hatchetCrafted: false,
      shelterBuilt: false,
      buildings: [],
      rubble: [],
      scout: {
        ...clone(UNITS.scout),
        x: SCOUT_POST.x,
        y: SCOUT_POST.y,
        postX: SCOUT_POST.x,
        postY: SCOUT_POST.y,
        cooldown: 0,
        targetId: null,
        mode: "idle",
      },
      enemies: [],
      projectiles: [],
      impacts: [],
      remains: [],
      encounter: null,
      topologyVersion: 0,
      nextEntityId: 1,
      kills: 0,
      actionLog: [],
      lastEvent: "Collect the stick and rock, then craft an axe before the first watch.",
      outcome: null,
      aftermathTicks: 0,
      paused: false,
      speed: 1,
      history: [],
      telemetry: {
        total: { nights: 0, enemiesSpawned: 0, kills: 0, hidesCollected: 0, damageDealt: 0, buildingDamage: 0, buildingsLost: 0 },
        currentNight: null,
        nightReports: [],
      },
      replaySnapshots: [],
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
      statuses: {},
    };
  }

  function buildEncounter(state) {
    const level = levelFor(state);
    const rng = createRng(`${state.seed}|${level.id}`);
    const units = [];
    let remaining = level.threatBudget;
    const minimumEnemies = level.minimumEnemies || {};
    Object.keys(minimumEnemies).sort().forEach((type) => {
      const count = minimumEnemies[type];
      const recipe = enemyRecipe(type);
      if (!recipe) throw new Error(`Level ${level.id} requires an unknown enemy: ${type}.`);
      if (!Number.isInteger(count) || count < 0) throw new Error(`Level ${level.id} has an invalid minimum for ${type}.`);
      for (let index = 0; index < count; index += 1) {
        if (recipe.threat > remaining) throw new Error(`Level ${level.id} cannot afford its required ${recipe.label}.`);
        units.push(type);
        remaining -= recipe.threat;
      }
    });
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
    let edgeBag = shuffled(["north", "east", "south", "west"], rng);
    let lastEdge = null;
    let cursor = 0;
    let spawnTick = 18 + rng.int(0, 8);
    const latePressure = level.number >= 7;
    while (cursor < units.length) {
      const remainingUnits = units.length - cursor;
      const groupSize = latePressure
        ? Math.min(remainingUnits, remainingUnits >= 3 && rng.next() > 0.25 ? 3 : remainingUnits >= 2 ? 2 : 1)
        : Math.min(remainingUnits, remainingUnits >= 3 && rng.next() > 0.48 ? 2 : 1);
      if (!edgeBag.length) {
        edgeBag = shuffled(["north", "east", "south", "west"], rng);
        if (edgeBag[0] === lastEdge) edgeBag.push(edgeBag.shift());
      }
      const edge = edgeBag.shift();
      lastEdge = edge;
      const entryBag = shuffled(spawnCellsOnEdge(edge), rng);
      const entries = units.slice(cursor, cursor + groupSize).map((unused, index) => clone(entryBag[index % entryBag.length]));
      waves.push({
        id: `wave-${waves.length + 1}`,
        spawnTick,
        entry: entries[0],
        entries,
        units: units.slice(cursor, cursor + groupSize),
        staggerTicks: entries.map((unused, index) => index * rng.int(3, 6)),
        spawnedCount: 0,
        spawned: false,
      });
      cursor += groupSize;
      spawnTick += latePressure ? rng.int(24, 38) : rng.int(42, 66);
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
        if (!inBounds(column, row) || !isBuildableGrass(state, column, row) || hasRubble(state, column, row) || buildingAt(state, column, row) || scoutPostAt(state, column, row)) return false;
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
    const coverage = distance({ x: state.scout.postX, y: state.scout.postY }, { x, y }) <= unitStats(state, "scout").attackRange + 0.5;
    return {
      valid,
      affordable,
      coverage,
      targetId: target?.building.id || null,
      targetLabel: target?.building.id === "preview" ? recipe.label : target ? buildingRecipe(target.building.type).label : "none",
      path: target?.path || [],
      routeCost: target?.cost || 0,
      terrain: terrainAt(state, x, y),
      cost: recipe.cost,
      level: level.number,
    };
  }

  function toolPreview(state, type, x, y) {
    if (type === "clear") {
      const valid = terrainAt(state, x, y) === "tree" || hasRubble(state, x, y);
      return { type, valid, affordable: true, reason: valid ? "Harvest for 2 wood and one action." : "Choose a tree or rubble." };
    }
    if (type === "scout") {
      const valid = validScoutPost(state, x, y);
      return { type, valid, affordable: true, reason: valid ? "Scout can watch from this open cell." : "Scout needs an unoccupied open cell." };
    }
    if (buildingRecipe(type)) {
      const preview = buildPreview(state, type, x, y);
      return {
        ...preview,
        type,
        siteValid: preview.valid,
        valid: preview.valid && preview.affordable,
        reason: !preview.valid ? "Build on unoccupied grass." : !preview.affordable ? `Need ${preview.cost.wood || 0} wood.` : "Ready to build.",
      };
    }
    return { type, valid: false, affordable: false, reason: "Unknown tool." };
  }

  function dispatch(state, action, options) {
    const shouldRecord = options?.record !== false;
    if (!action || !action.type) return result(state, false, "That action is not understood.");

    if (state.phase !== "day" && action.type !== "speed" && action.type !== "pause") {
      return result(state, false, "Day actions are only available before nightfall.");
    }

    if (!state.shelterBuilt && !["collectOpeningPickup", "craftHatchet", "constructShelter", "speed"].includes(action.type)) {
      return result(state, false, "Collect the stick and rock, craft an axe, then place the shelter before taking other actions.", action, shouldRecord);
    }

    if (action.type === "collectOpeningPickup") {
      if (state.levelIndex !== 0 || state.shelterBuilt) return result(state, false, "Starter materials can only be collected at the start of Level 1.");
      const pickup = (state.openingPickups || []).find((item) => item.id === action.id);
      if (!pickup || pickup.collected) return result(state, false, "That starter material has already been collected.");
      pickup.collected = true;
      const nextStep = hasOpeningSupplies(state) ? "Both materials collected. Craft an axe." : `The ${pickup.type} is collected. Find the other starter material.`;
      return result(state, true, nextStep, action, shouldRecord);
    }

    if (action.type === "craftHatchet") {
      if (state.hatchetCrafted) return result(state, false, "The hatchet is already ready.");
      if (state.levelIndex !== 0) return result(state, false, "The starter hatchet can only be crafted at the start of Level 1.");
      if (!hasOpeningSupplies(state)) return result(state, false, "Collect the stick and rock before crafting an axe.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      state.hatchetCrafted = true;
      return result(state, true, "Axe crafted. Choose unoccupied grass for the shelter.", action, shouldRecord);
    }

    if (action.type === "constructShelter") {
      if (state.shelterBuilt || hasShelter(state)) return result(state, false, "The shelter is already built.");
      if (state.levelIndex !== 0) return result(state, false, "The shelter can only be built at the start of Level 1.");
      if (!state.hatchetCrafted) return result(state, false, "Craft the axe before placing the shelter.");
      if (!Number.isInteger(action.x) || !Number.isInteger(action.y) || !validFootprint(state, "teepee", action.x, action.y)) return result(state, false, "Place the shelter on unoccupied grass.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      state.buildings.push(makeTeepee(state, action.x, action.y));
      state.shelterBuilt = true;
      invalidatePaths(state);
      return result(state, true, "Shelter complete. Both opening actions are spent; start the first watch.", action, shouldRecord);
    }

    if (action.type === "research") {
      const outcome = TechTree.research(state, action.nodeId);
      if (outcome.ok) syncBuildingMaxHealth(state, true);
      return result(state, outcome.ok, outcome.message, action, shouldRecord);
    }

    if (action.type === "clear") {
      const terrain = terrainAt(state, action.x, action.y);
      if (terrain !== "tree" && !hasRubble(state, action.x, action.y)) return result(state, false, "Only a tree or rubble can be harvested there.");
      if (terrain === "tree") {
        if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
        setTerrain(state, action.x, action.y, "cleared");
        const harvestedWood = 2 + TechTree.effectValue(state, (effect) => effect.kind === "harvestWood", "amount");
        state.resources.wood += harvestedWood;
        invalidatePaths(state);
        return result(state, true, `Tree harvested: +${harvestedWood} wood. One day action spent; the grass is now open.`, action, shouldRecord);
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
      const repairBonus = TechTree.effectValue(state, (effect) => effect.kind === "repairAmount" && effect.target === "building", "amount");
      building.health = Math.min(building.maxHealth, building.health + recipe.repairAmount + repairBonus);
      return result(state, true, `${recipe.label} repaired.`, action, shouldRecord);
    }

    if (action.type === "scout") {
      if (!validScoutPost(state, action.x, action.y)) return result(state, false, "Scout needs an unoccupied open cell.");
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
      if (!recipe || ["teepee", "arrowShooter"].includes(action.buildingType) || recipe.conversionOnly) return result(state, false, "That building cannot be placed here.");
      if (!hasUnlock(state, action.buildingType)) return result(state, false, `${recipe.label} has not been unlocked yet.`);
      if (!validFootprint(state, action.buildingType, action.x, action.y)) return result(state, false, "That grass is blocked or occupied.");
      if (!hasResources(state, recipe.cost)) return result(state, false, `Need ${recipe.cost.wood || 0} wood to build this.`);
      if (!consumeActions(state, recipe.actionCost || 1)) return result(state, false, "Both day actions are spent.");
      spendResources(state, recipe.cost);
      state.buildings.push(makeBuilding(state, `b-${state.nextEntityId++}`, action.buildingType, action.x, action.y));
      invalidatePaths(state);
      return result(state, true, `${recipe.label} built. One day action spent.`, action, shouldRecord);
    }

    if (action.type === "upgradeLauncher") {
      const building = state.buildings.find((item) => item.id === action.id && !item.destroyed);
      if (!building || building.type !== "stickLauncher") return result(state, false, "Choose a standing Stick Launcher to upgrade.");
      if (!TechTree.hasBuildingUpgrade(state, "stickLauncher", "arrowShooter")) return result(state, false, "Learn Arrowcraft before upgrading a launcher.");
      const cost = { wood: 4 };
      if (!hasResources(state, cost)) return result(state, false, "An Arrow Shooter upgrade needs 4 wood.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      spendResources(state, cost);
      building.type = "arrowShooter";
      building.maxHealth = maxHealthFor(state, "arrowShooter", building);
      building.health = building.maxHealth;
      building.cooldown = 0;
      building.targetId = null;
      building.firingTicks = 0;
      building.refits = [];
      return result(state, true, "Arrow Shooter refit complete at full health. One day action spent.", action, shouldRecord);
    }

    if (action.type === "upgradePotatoPatch") {
      const building = state.buildings.find((item) => item.id === action.id && !item.destroyed);
      if (!building || building.type !== "potatoPatch") return result(state, false, "Choose a growing Potato Patch to upgrade.");
      if (!isPotatoPatchMature(building)) return result(state, false, `The Potato Patch needs ${Math.max(0, BUILDINGS.potatoPatch.maturityNights - (building.growthNights || 0))} more held night${Math.max(0, BUILDINGS.potatoPatch.maturityNights - (building.growthNights || 0)) === 1 ? "" : "s"}.`);
      if (!hasUnlock(state, "potatoGun")) return result(state, false, "Hold Level 4 to unlock the Potato Gun conversion.");
      const cost = BUILDINGS.potatoGun.cost;
      if (!hasResources(state, cost)) return result(state, false, "A Potato Gun upgrade needs 3 wood.");
      if (!consumeAction(state)) return result(state, false, "Both day actions are spent.");
      spendResources(state, cost);
      building.type = "potatoGun";
      building.maxHealth = maxHealthFor(state, "potatoGun", building);
      building.health = building.maxHealth;
      building.cooldown = 0;
      building.targetId = null;
      building.firingTicks = 0;
      building.hitTicks = 0;
      building.refits = [];
      building.growthNights = null;
      invalidatePaths(state);
      return result(state, true, "Potato Patch upgraded into a Potato Gun at full health. One day action spent.", action, shouldRecord);
    }

    if (action.type === "refitBuilding") {
      const building = state.buildings.find((item) => item.id === action.id && !item.destroyed);
      if (!building) return result(state, false, "Choose a standing building to refit.");
      const refit = refitDefinition(building.type, action.refitId);
      if (!refit) return result(state, false, "That refit does not fit the selected building.");
      if (!TechTree.hasBuildingRefit(state, building.type, refit.id)) return result(state, false, `Learn ${refit.label} before applying this refit.`);
      if (buildingRefits(building).includes(refit.id)) return result(state, false, `${refit.label} is already fitted to this ${buildingRecipe(building.type).label}.`);
      if (!hasResources(state, refit.cost || {})) return result(state, false, `${refit.label} needs ${refit.cost?.wood || 0} wood.`);
      if (!consumeActions(state, refit.actionCost || 1)) return result(state, false, "Both day actions are spent.");
      spendResources(state, refit.cost || {});
      building.refits = buildingRefits(building).concat(refit.id);
      if (refit.restoreHealth) building.health = building.maxHealth;
      building.cooldown = 0;
      building.targetId = null;
      building.firingTicks = 0;
      return result(state, true, `${refit.label} fitted. ${buildingRecipe(building.type).label} is restored to full health.`, action, shouldRecord);
    }

    if (action.type === "endDay") {
      state.phase = "night";
      state.nightTick = 0;
      state.paused = false;
      beginNightTelemetry(state);
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
      if (!["day", "night", "aftermath"].includes(state.phase) || !SPEED_OPTIONS.includes(action.speed)) return result(state, false, "Simulation speed can only be set to 1×, 2×, or 5× during an active run.");
      state.speed = action.speed;
      return result(state, true, `Simulation speed set to ${action.speed}×.`, null, false);
    }

    return result(state, false, "That action is not available.");
  }

  function spawnWaves(state) {
    for (const wave of state.encounter.waves) {
      if (wave.spawned || wave.spawnTick > state.nightTick) continue;
      while (wave.spawnedCount < wave.units.length && state.nightTick >= wave.spawnTick + wave.staggerTicks[wave.spawnedCount]) {
        const spawnIndex = wave.spawnedCount;
        const type = wave.units[spawnIndex];
        const entry = wave.entries[spawnIndex] || wave.entry;
        state.enemies.push(createEnemy(state, type, entry));
        wave.spawnedCount += 1;
        state.encounter.spawned += 1;
        recordSpawn(state, entry.edge);
        state.lastEvent = `A ${enemyRecipe(type).label.toLowerCase()} enters from the ${entry.edge} forest.`;
      }
      wave.spawned = wave.spawnedCount === wave.units.length;
    }
  }

  function damageBuilding(state, building, amount, source) {
    const armor = TechTree.effectsMatching(state, (effect) => effect.kind === "armor" && effect.target === "building" && (!effect.scope || effect.scope !== "targetable" || isTargetableBuilding(building)));
    const reducedDamage = armor.reduce((damage, effect) => (damage > effect.threshold ? Math.max(effect.threshold, damage - effect.amount) : damage), amount);
    const appliedDamage = Math.min(building.health, reducedDamage);
    building.health = Math.max(0, building.health - reducedDamage);
    building.hitTicks = 7;
    recordBuildingDamage(state, building, appliedDamage);
    state.lastEvent = `${enemyRecipe(source.type).label} hits the ${buildingRecipe(building.type).label.toLowerCase()}.`;
    if (building.health > 0) return;
    building.destroyed = true;
    if (building.type === "teepee") {
      state.phase = "lost";
      state.outcome = { victory: false, title: "The teepee falls.", copy: "Scout retreats into the trees. Try the same seed again with a different plan." };
      const report = finishNightTelemetry(state, "lost");
      state.history.push({ level: levelFor(state).id, result: "lost", seed: state.seed, telemetry: report });
      captureReplaySnapshot(state, "lost");
      return;
    }
    buildingCells(building).forEach((cell) => state.rubble.push({ x: cell.x, y: cell.y, health: 1 }));
    const report = currentNightTelemetry(state);
    if (report) report.buildingsLost += 1;
    invalidatePaths(state);
    state.lastEvent = `The ${buildingRecipe(building.type).label.toLowerCase()} becomes rubble and blocks the ground.`;
  }

  function damageRubble(state, rubble, amount, source) {
    const remainingHealth = (rubble.health ?? 1) - amount;
    rubble.health = remainingHealth;
    if (remainingHealth > 0) {
      state.lastEvent = `${enemyRecipe(source.type).label} tears at the rubble.`;
      return;
    }
    state.rubble = state.rubble.filter((item) => item !== rubble);
    invalidatePaths(state);
    state.lastEvent = `${enemyRecipe(source.type).label} breaks through the rubble.`;
  }

  function defeatEnemy(state, enemy, source) {
    const recipe = enemyRecipe(enemy.type);
    const reward = recipe.xp;
    const hideRange = recipe.drops?.hides;
    const hides = hideRange ? createRng(`${state.seed}|${levelFor(state).id}|${enemy.id}|hide`).int(hideRange.min, hideRange.max) : 0;
    state.kills += 1;
    grantExperience(state, reward);
    state.resources.hides += hides;
    state.enemies = state.enemies.filter((item) => item.id !== enemy.id);
    state.remains.push({ id: `remains-${state.nextEntityId++}`, x: enemy.x, y: enemy.y, type: enemy.type, ticks: 12 });
    recordKill(state, source);
    recordHides(state, hides);
    state.lastEvent = `${source} turns away the ${recipe.label.toLowerCase()}: +${reward} XP, +${hides} hides.`;
  }

  function projectileDamageAgainst(enemy, projectile) {
    const multiplier = Number(enemyRecipe(enemy.type).projectileDamageMultipliers?.[projectile.type]);
    return Math.max(0, projectile.damage * (Number.isFinite(multiplier) ? multiplier : 1));
  }

  function updateProjectiles(state) {
    state.impacts = state.impacts.filter((impact) => impact.ticks > 1).map((impact) => ({ ...impact, ticks: impact.ticks - 1 }));
    state.remains = state.remains.filter((remains) => remains.ticks > 1).map((remains) => ({ ...remains, ticks: remains.ticks - 1 }));
    const remaining = [];
    state.projectiles.forEach((projectile) => {
      const target = state.enemies.find((enemy) => enemy.id === projectile.targetId);
      if (!target) return;
      const travel = projectile.speed / TICK_RATE;
      if (distance(projectile, target) <= travel + enemyRecipe(target.type).collisionRadius) {
        projectile.x = target.x;
        projectile.y = target.y;
        const damage = projectileDamageAgainst(target, projectile);
        const appliedDamage = Math.min(target.health, damage);
        target.health = Math.max(0, target.health - damage);
        target.hitTicks = 6;
        recordDamageDealt(state, projectile.sourceLabel, appliedDamage);
        if (target.health > 0) {
          (projectile.statuses || []).forEach((status) => applyStatus(target, status));
          if (projectile.knockback) applyKnockback(state, target, projectile);
        }
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
    const push = projectile.knockback * (enemyRecipe(enemy.type).knockbackMultiplier ?? 1);
    if (push <= 0) return;
    const destination = {
      x: enemy.x + (dx / length) * push,
      y: enemy.y + (dy / length) * push,
    };
    if (!isPassable(state, Math.round(destination.x), Math.round(destination.y))) return;
    enemy.x = destination.x;
    enemy.y = destination.y;
    enemy.knockbackTicks = 8;
  }

  function hitStatusesFor(state, sourceTarget, sourceId) {
    return TechTree.effectsMatching(state, (effect) => effect.kind === "onHitStatus" && effect.sourceTarget === sourceTarget && effect.sourceId === sourceId)
      .map((effect) => ({
        status: effect.status,
        statusSource: effect.statusSource || effect.nodeId,
        durationTicks: effect.durationTicks,
        movementMultiplier: effect.movementMultiplier,
        stackRule: effect.stackRule || "strongestOnly",
      }));
  }

  function statusBuckets(enemy) {
    if (!enemy.statuses || typeof enemy.statuses !== "object" || Array.isArray(enemy.statuses)) enemy.statuses = {};
    return enemy.statuses;
  }

  function applyStatus(enemy, status) {
    const durationTicks = Math.max(0, Math.floor(Number(status.durationTicks) || 0));
    const movementMultiplier = Number(status.movementMultiplier);
    const damagePerTick = Math.max(0, Number(status.damagePerTick) || 0);
    const tickIntervalTicks = Math.max(1, Math.floor(Number(status.tickIntervalTicks) || TICK_RATE));
    if (!status.status || !status.statusSource || durationTicks <= 0 || (!Number.isFinite(movementMultiplier) && damagePerTick <= 0)) return;
    const statuses = statusBuckets(enemy);
    const bucket = statuses[status.status] || { stackRule: status.stackRule || "strongestOnly", sources: {} };
    const existing = bucket.sources[status.statusSource];
    bucket.sources[status.statusSource] = {
      source: status.statusSource,
      remainingTicks: Math.max(existing?.remainingTicks || 0, durationTicks),
      elapsedTicks: existing?.elapsedTicks || 0,
      movementMultiplier: Number.isFinite(movementMultiplier) ? Math.min(existing?.movementMultiplier ?? 1, movementMultiplier) : existing?.movementMultiplier,
      damagePerTick: Math.max(existing?.damagePerTick || 0, damagePerTick),
      tickIntervalTicks,
      sourceLabel: status.sourceLabel || existing?.sourceLabel || "Status",
    };
    statuses[status.status] = bucket;
  }

  function tickStatuses(state, enemy) {
    const statuses = statusBuckets(enemy);
    for (const statusId of Object.keys(statuses)) {
      const bucket = statuses[statusId];
      if (!bucket?.sources || typeof bucket.sources !== "object") {
        delete statuses[statusId];
        continue;
      }
      for (const sourceId of Object.keys(bucket.sources)) {
        const source = bucket.sources[sourceId];
        source.elapsedTicks = (source.elapsedTicks || 0) + 1;
        const interval = Math.max(1, Math.floor(source.tickIntervalTicks || TICK_RATE));
        if (source.damagePerTick > 0 && source.elapsedTicks % interval === 0) {
          const multiplier = enemyRecipe(enemy.type).statusDamageMultipliers?.[statusId] ?? 1;
          const damage = source.damagePerTick * multiplier;
          const appliedDamage = Math.min(enemy.health, damage);
          enemy.health = Math.max(0, enemy.health - damage);
          enemy.hitTicks = 6;
          recordDamageDealt(state, source.sourceLabel || "Status", appliedDamage);
          if (enemy.health === 0) {
            defeatEnemy(state, enemy, source.sourceLabel || "Status");
            return false;
          }
        }
        source.remainingTicks = Math.max(0, (source.remainingTicks || 0) - 1);
        if (source.remainingTicks === 0) delete bucket.sources[sourceId];
      }
      if (!Object.keys(bucket.sources).length) delete statuses[statusId];
    }
    return true;
  }

  function statusMovementMultiplier(enemy) {
    const sources = enemy.statuses?.movementSlow?.sources;
    if (!sources || typeof sources !== "object") return 1;
    return Object.values(sources).reduce((slowest, source) => Math.min(slowest, Number(source.movementMultiplier) || 1), 1);
  }

  function updateTowers(state) {
    state.buildings.filter((building) => !building.destroyed && TOWER_TYPES.includes(building.type)).forEach((tower) => {
      const recipe = buildingCombatStats(state, tower.type, tower);
      tower.cooldown = Math.max(0, (tower.cooldown || 0) - 1);
      tower.firingTicks = Math.max(0, (tower.firingTicks || 0) - 1);
      tower.hitTicks = Math.max(0, (tower.hitTicks || 0) - 1);
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
        statuses: [
          ...(recipe.statuses || []).map((status) => ({ ...status, sourceLabel: status.sourceLabel || recipe.label })),
          ...hitStatusesFor(state, "building", tower.type),
        ],
        originX: tower.x,
        originY: tower.y,
        angle: Math.atan2(target.y - tower.y, target.x - tower.x) * (180 / Math.PI),
        age: 0,
      });
      recordShot(state, recipe.label);
      tower.cooldown = Math.max(1, Math.round(TICK_RATE / recipe.attackSpeed));
      tower.firingTicks = 5;
      state.lastEvent = tower.type === "campfire"
        ? "The Campfire hurls a fireball through the trees."
        : tower.type === "arrowShooter"
        ? "The Arrow Shooter sends an arrow through the trees."
        : tower.type === "potatoGun"
          ? "The Potato Gun thumps a heavy shot through the trees."
          : "The Stick Launcher snaps a sharpened branch through the trees.";
    });
  }

  function updateScout(state) {
    const scout = state.scout;
    const stats = unitStats(state, "scout");
    scout.cooldown = Math.max(0, scout.cooldown - 1);
    const post = { x: scout.postX, y: scout.postY };
    const targets = state.enemies.filter((enemy) => distance(post, enemy) <= stats.attackRange + enemyRecipe(enemy.type).collisionRadius)
      .sort((left, right) => distance(post, left) - distance(post, right) || String(left.id).localeCompare(String(right.id)));
    const target = targets[0];

    if (!target) {
      scout.targetId = null;
      if (distance(scout, post) > 0.03) {
        scout.mode = "returning";
        moveTowards(scout, post, stats.moveSpeed / TICK_RATE);
      } else {
        scout.mode = "idle";
        scout.x = post.x;
        scout.y = post.y;
      }
      return;
    }

    scout.targetId = target.id;
    const reach = stats.attackReach + enemyRecipe(target.type).collisionRadius;
    if (distance(scout, target) > reach) {
      scout.mode = "chasing";
      moveTowards(scout, target, stats.moveSpeed / TICK_RATE);
      return;
    }

    scout.mode = "attacking";
    if (scout.cooldown > 0) return;
    const appliedDamage = Math.min(target.health, stats.damage);
    target.health = Math.max(0, target.health - stats.damage);
    target.hitTicks = 6;
    recordShot(state, "Scout");
    recordDamageDealt(state, "Scout", appliedDamage);
    scout.cooldown = Math.max(1, Math.round(TICK_RATE / stats.attackSpeed));
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
    enemy.hitTicks = Math.max(0, (enemy.hitTicks || 0) - 1);
    if (!tickStatuses(state, enemy)) return;
    if (enemy.approachDelay > 0) {
      enemy.approachDelay -= 1;
      enemy.intent = "sneaking";
      return;
    }
    const target = closestReachableBuilding(state, enemy) || closestReachableRubble(state, enemy);
    if (!target) {
      enemy.intent = "searching";
      return;
    }
    const targetId = target.building?.id || `rubble-${target.rubble.x}-${target.rubble.y}`;
    enemy.targetId = targetId;
    const closeEnough = distance(enemy, target.approach) <= recipe.attackRange;
    if (closeEnough) {
      enemy.intent = `attacking-${targetId}`;
      enemy.cooldown = Math.max(0, enemy.cooldown - 1);
      if (enemy.cooldown === 0) {
        enemy.cooldown = Math.max(1, Math.round(TICK_RATE / recipe.attackSpeed));
        if (target.building) damageBuilding(state, target.building, recipe.damage, enemy);
        else damageRubble(state, target.rubble, recipe.damage, enemy);
      }
      return;
    }
    enemy.intent = `moving-${targetId}`;
    const nextStep = target.path.length > 1 ? target.path[1] : target.approach;
    const stepCost = travelCost(state, nextStep.x, nextStep.y, recipe);
    moveTowards(enemy, nextStep, recipe.moveSpeed * statusMovementMultiplier(enemy) / TICK_RATE / stepCost);
  }

  function beginAftermath(state) {
    state.phase = "aftermath";
    state.aftermathTicks = 0;
    state.lastEvent = "The forest goes quiet. Scout makes his way back to the watch post.";
  }

  function dawnRepairAmount(state, building) {
    if (!isTargetableBuilding(building)) return 0;
    return TechTree.effectValue(
      state,
      (effect) => effect.kind === "dawnRepair" && effect.target === "building" && (effect.scope !== "targetable" || isTargetableBuilding(building)),
      "amount",
    );
  }

  function restoreAtDawn(state) {
    let restored = 0;
    activeBuildings(state).forEach((building) => {
      const amount = dawnRepairAmount(state, building);
      if (amount <= 0 || building.health >= building.maxHealth) return;
      const applied = Math.min(amount, building.maxHealth - building.health);
      building.health += applied;
      restored += applied;
    });
    return restored;
  }

  function growPotatoPatchesAtDawn(state) {
    let sprouted = 0;
    let matured = 0;
    activeBuildings(state).forEach((building) => {
      if (building.type !== "potatoPatch") return;
      const before = potatoPatchProgress(building);
      if (before.mature) return;
      building.growthNights = Math.min(before.requiredNights, before.grownNights + 1);
      const after = potatoPatchProgress(building);
      if (after.mature) matured += 1;
      else sprouted += 1;
    });
    return { sprouted, matured };
  }

  function startNextDay(state, completedLevel, completionCopy) {
    const dawnRestored = restoreAtDawn(state);
    const gardenProgress = growPotatoPatchesAtDawn(state);
    state.levelIndex += 1;
    state.phase = "day";
    state.actionPoints = STARTING_ACTIONS;
    state.nightTick = 0;
    state.encounter = null;
    state.enemies = [];
    state.projectiles = [];
    state.impacts = [];
    state.remains = [];
    state.paused = false;
    state.outcome = null;
    state.aftermathTicks = 0;
    const nextLevel = levelFor(state);
    const repairCopy = dawnRestored > 0 ? ` Hearthkeeping restores ${dawnRestored} structure HP.` : "";
    const gardenCopy = gardenProgress.matured > 0
      ? ` Potato Patch mature: it can become a Potato Gun when that conversion is unlocked.`
      : gardenProgress.sprouted > 0
        ? " Potato Patch grows through the night."
        : "";
    state.lastEvent = `${completedLevel.title} held. ${completionCopy}${gardenCopy}${repairCopy} Level ${nextLevel.number}: ${nextLevel.title}. Two day actions are ready.`;
  }

  function settleAftermath(state) {
    const level = levelFor(state);
    const reward = grantExperience(state, level.survivalXp);
    const unlockedNow = Boolean(level.unlock) && !hasUnlock(state, level.unlock);
    if (unlockedNow) addUnlock(state, level.unlock);
    const skillCopy = reward.skillPoints > 0 ? ` +${reward.skillPoints} Skill Point${reward.skillPoints === 1 ? "" : "s"}.` : "";
    const completionCopy = unlockedNow
      ? `+${level.survivalXp} XP.${skillCopy} ${level.unlockLabel} unlocked. ${level.unlockCopy}`
      : `+${level.survivalXp} survival XP.${skillCopy}`;
    const report = finishNightTelemetry(state, "victory");
    state.history.push({ level: level.id, result: "victory", seed: state.seed, kills: state.kills, telemetry: report });
    captureReplaySnapshot(state, "victory");
    startNextDay(state, level, completionCopy);
  }

  function advanceTick(state) {
    if (!["night", "aftermath"].includes(state.phase) || state.paused) return state;
    state.tick += 1;
    state.buildings.forEach((building) => { building.hitTicks = Math.max(0, (building.hitTicks || 0) - 1); });
    if (state.phase === "aftermath") {
      state.aftermathTicks += 1;
      updateScout(state);
      const home = { x: state.scout.postX, y: state.scout.postY };
      if (state.aftermathTicks >= 40 && distance(state.scout, home) <= 0.04) settleAftermath(state);
      return state;
    }
    state.nightTick += 1;
    spawnWaves(state);
    recordPeakEnemies(state);
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

  function openingPickupActions(collectedIds = new Set()) {
    return OPENING_PICKUPS.filter((pickup) => !collectedIds.has(pickup.id)).map((pickup) => ({ type: "collectOpeningPickup", id: pickup.id }));
  }

  function migrateLegacyState(legacyState, version) {
    const state = clone(legacyState);
    state.version = SAVE_VERSION;
    if (version === 10) state.hatchetCrafted = Boolean(state.shelterBuilt);
    if (version <= 11) state.openingPickups = OPENING_PICKUPS.map((pickup) => ({ ...pickup, collected: Boolean(state.hatchetCrafted || state.shelterBuilt) }));
    if (version <= 11 && Array.isArray(state.actionLog)) {
      const migratedActions = [];
      let supplied = false;
      const collectedIds = new Set();
      state.actionLog.forEach((action) => {
        if (action.type === "collectOpeningPickup") {
          collectedIds.add(action.id);
          migratedActions.push(action);
          return;
        }
        if (action.type === "craftHatchet" && !supplied) {
          migratedActions.push(...openingPickupActions(collectedIds));
          supplied = true;
        }
        if (action.type === "constructShelter") {
          if (!supplied) {
            migratedActions.push(...openingPickupActions(collectedIds), { type: "craftHatchet" });
            supplied = true;
          }
          migratedActions.push({ ...action, x: Number.isInteger(action.x) ? action.x : SHELTER_SITE.x, y: Number.isInteger(action.y) ? action.y : SHELTER_SITE.y });
          return;
        }
        migratedActions.push(action);
      });
      state.actionLog = migratedActions;
    }
    state.buildings = Array.isArray(state.buildings) ? state.buildings.map((building) => ({
      ...building,
      growthNights: building.type === "potatoPatch" ? Math.max(0, Number(building.growthNights) || 0) : building.growthNights ?? null,
    })) : state.buildings;
    return state;
  }

  function hydrate(serialized) {
    const parsed = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
    if (!parsed || !parsed.state || ![10, 11, 12, 13, 14, SAVE_VERSION].includes(parsed.version)) throw new Error("This save belongs to a different version of Wild Hearth.");
    const state = parsed.version === SAVE_VERSION ? parsed.state : migrateLegacyState(parsed.state, parsed.version);
    if (state.version !== SAVE_VERSION) throw new Error("This save belongs to a different version of Wild Hearth.");
    if (!Array.isArray(state.terrain) || state.terrain.length !== BOARD.width * BOARD.height) throw new Error("This save has an invalid meadow.");
    if (typeof state.hatchetCrafted !== "boolean" || typeof state.shelterBuilt !== "boolean" || !Array.isArray(state.buildings)) throw new Error("This save has an invalid shelter state.");
    if (!Array.isArray(state.openingPickups) || !OPENING_PICKUPS.every((definition) => state.openingPickups.some((pickup) => pickup.id === definition.id && pickup.type === definition.type && pickup.x === definition.x && pickup.y === definition.y && typeof pickup.collected === "boolean"))) throw new Error("This save has invalid starter materials.");
    if (!SPEED_OPTIONS.includes(state.speed)) throw new Error("This save has an invalid speed setting.");
    if (!state.resources || !Number.isFinite(state.resources.wood) || !Number.isFinite(state.resources.hides) || !Number.isFinite(state.xp) || !Number.isInteger(state.skillPoints) || !Number.isInteger(state.skillPointsEarned)) throw new Error("This save has an invalid progression state.");
    if (!state.telemetry || !state.telemetry.total || !Array.isArray(state.telemetry.nightReports) || !Array.isArray(state.replaySnapshots) || !Array.isArray(state.remains)) throw new Error("This save has an invalid night record.");
    if (!state.buildings.every((building) => buildingRecipe(building.type) && Array.isArray(building.refits || []) && buildingRefits(building).every((refitId) => refitDefinition(building.type, refitId)))) throw new Error("This save has an invalid building refit.");
    if (!state.buildings.every((building) => building.type !== "potatoPatch" || (Number.isInteger(building.growthNights) && building.growthNights >= 0 && building.growthNights <= BUILDINGS.potatoPatch.maturityNights))) throw new Error("This save has an invalid Potato Patch.");
    syncBuildingMaxHealth(state, false);
    const teepeeCount = state.buildings.filter((building) => building.type === "teepee" && !building.destroyed).length;
    if ((state.shelterBuilt && teepeeCount !== 1) || (!state.shelterBuilt && teepeeCount !== 0)) throw new Error("This save has an invalid shelter state.");
    pathCaches.delete(state);
    return state;
  }

  function replay(seed, actionLog) {
    return replayReport(seed, actionLog).state;
  }

  function replayReport(seed, actionLog) {
    const state = createRun(seed);
    for (const action of actionLog) {
      const outcome = dispatch(state, action, { record: false });
      if (!outcome.ok) throw new Error(`Replay action failed: ${action.type}. ${outcome.message}`);
      if (action.type === "endDay") {
        let guard = 14000;
        while (["night", "aftermath"].includes(state.phase) && guard > 0) { advanceTick(state); guard -= 1; }
        if (guard === 0) throw new Error("Replay night did not settle.");
      }
    }
    return { state, checkpoints: clone(state.replaySnapshots) };
  }

  function checksum(state) {
    return JSON.stringify({
      phase: state.phase,
      levelIndex: state.levelIndex,
      resources: state.resources,
      xp: state.xp,
      skillPoints: state.skillPoints,
      skillPointsEarned: state.skillPointsEarned,
      unlocks: state.unlocks,
      research: state.research,
      openingPickups: state.openingPickups.map((pickup) => ({ id: pickup.id, collected: pickup.collected })),
      hatchetCrafted: state.hatchetCrafted,
      shelterBuilt: state.shelterBuilt,
      kills: state.kills,
      terrain: state.terrain,
      buildings: state.buildings.map((building) => ({ id: building.id, type: building.type, x: building.x, y: building.y, health: building.health, maxHealth: building.maxHealth, refits: buildingRefits(building), growthNights: building.growthNights, destroyed: building.destroyed })),
      rubble: state.rubble,
      outcome: state.outcome,
      telemetry: { total: state.telemetry?.total || {}, nightReports: state.telemetry?.nightReports || [] },
      history: state.history,
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
    OPENING_PICKUPS,
    TECH_TREE: TechTree.NODES,
    TECH_BRANCHES: TechTree.BRANCHES,
    ENEMY_COUNTERS,
    LEVELS,
    STARTING_ACTIONS,
    FIRST_SKILL_POINT_XP,
    DEFAULT_SEED,
    SPAWN_CELLS,
    createRun,
    createRng,
    nextSeed,
    levelFor,
    mediumThreatBudget,
    techAvailability: TechTree.availability,
    techBranchResearchCount: TechTree.branchResearchCount,
    techCostFor: TechTree.costFor,
    hasResearch: TechTree.isResearched,
    terrainAt,
    inBounds,
    cellKey,
    buildingCells,
    buildingAt,
    scoutPostAt,
    activeBuildings,
    isTargetableBuilding,
    isPassable,
    isBuildableGrass,
    validScoutPost,
    hasShelter,
    openingPickupAt,
    hasOpeningSupplies,
    potatoPatchProgress,
    isPotatoPatchMature,
    canUpgradePotatoPatch,
    hasRubble,
    validFootprint,
    buildPreview,
    toolPreview,
    closestReachableBuilding,
    closestReachableRubble,
    conditionFor,
    unitStats,
    buildingCombatStats,
    refitDefinition,
    buildingRefits,
    techNodes: TechTree.nodes,
    techNodesForBranch: TechTree.nodesForBranch,
    techEffects: TechTree.effectsFor,
    hasTechEffect: TechTree.hasEffect,
    hasBuildingUpgrade: TechTree.hasBuildingUpgrade,
    hasBuildingRefit: TechTree.hasBuildingRefit,
    telemetrySnapshot,
    nextSkillPointThreshold,
    grantExperience,
    acknowledgeFirstSkillPoint,
    dispatch,
    advanceTick,
    advanceTicks,
    serialize,
    hydrate,
    replay,
    replayReport,
    checksum,
    simulate,
  };
}));
