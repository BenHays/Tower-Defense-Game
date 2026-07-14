/*
 * Wild Hearth simulation engine.
 *
 * This file intentionally knows nothing about the DOM. The browser UI and the
 * headless simulator both drive these same deterministic state transitions.
 */
(function registerWildHearthEngine(root, factory) {
  const engine = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = engine;
  root.WildHearthEngine = engine;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildEngine() {
  const SAVE_VERSION = 3;
  const TICK_RATE = 20;
  const BOARD = { id: "hearth-meadow", label: "Hearth Meadow", width: 13, height: 13 };
  const STARTING_ACTIONS = 2;
  const DEFAULT_SEED = "HEARTH-1042";
  const pathCaches = new WeakMap();

  const UNITS = {
    scout: {
      id: "scout",
      label: "Scout",
      health: 9,
      damage: 2,
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
      health: 4,
      damage: 1,
      attackSpeed: 0.85,
      moveSpeed: 1.3,
      attackRange: 0.72,
      collisionRadius: 0.28,
      targetRule: "closest-reachable-building",
      targetType: "building",
      approach: "sneak",
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
      cost: { wood: 0, stone: 0 },
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
      cost: { wood: 1, stone: 0 },
      role: "tower",
      tags: ["defense", "first-line"],
      damage: 1,
      attackSpeed: 1,
      attackRange: 4.5,
      targetRule: "nearest-enemy-in-range",
      repairAmount: 3,
      repairCost: { wood: 1 },
    },
  };

  const UPGRADES = {
    stonework: {
      id: "stonework",
      label: "Stone teepee brace",
      cost: { stone: 1 },
      maxHealthBonus: 5,
      healthBonus: 5,
      role: "durable-home",
    },
  };

  const ENEMY_COUNTERS = {
    raccoon: { building: "stickLauncher", explanation: "A stick launcher weakens a raccoon before Scout needs to intercept." },
    boar: { building: null, explanation: "The boar is reserved for a future defense counter." },
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
      unlockCopy: "Use 1 wood and one daylight action to build the first line outside Scout's watch radius.",
    },
    {
      id: "first-line",
      number: 2,
      title: "First line",
      enemyPool: ["raccoon"],
      survivalXp: 3,
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
    [[3, 5], [9, 7], [3, 9], [9, 3], [8, 10]].forEach(([x, y]) => set(x, y, "boulder"));
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
    return cells.filter((cell) => FIXED_TERRAIN[indexOf(cell.x, cell.y)] !== "boulder");
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
    if (!inBounds(x, y) || !["open", "tree"].includes(terrainAt(state, x, y)) || hasRubble(state, x, y)) return false;
    return !buildingAt(state, x, y);
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

  function createRun(seed) {
    const teepee = {
      id: "b-teepee",
      type: "teepee",
      x: 6,
      y: 6,
      health: BUILDINGS.teepee.maxHealth,
      maxHealth: BUILDINGS.teepee.maxHealth,
      destroyed: false,
    };
    return {
      version: SAVE_VERSION,
      mapId: BOARD.id,
      seed: String(seed || DEFAULT_SEED).trim() || DEFAULT_SEED,
      levelIndex: 0,
      phase: "day",
      tick: 0,
      nightTick: 0,
      actionPoints: STARTING_ACTIONS,
      resources: { wood: 0, stone: 0 },
      xp: 0,
      unlocks: [],
      terrain: FIXED_TERRAIN.slice(),
      buildings: [teepee],
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
      encounter: null,
      topologyVersion: 0,
      nextEntityId: 1,
      kills: 0,
      actionLog: [],
      lastEvent: "Avery and Scout begin with two daylight actions. The meadow will wait until you choose End day.",
      outcome: null,
      aftermathTicks: 0,
      paused: false,
      speed: 1,
      upgrades: [],
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
    let spawnTick = 14;
    while (cursor < units.length) {
      const groupSize = Math.min(units.length - cursor, rng.next() > 0.68 ? 2 : 1);
      const entry = clone(rng.pick(SPAWN_CELLS));
      waves.push({
        id: `wave-${waves.length + 1}`,
        spawnTick,
        entry,
        units: units.slice(cursor, cursor + groupSize),
        spawned: false,
      });
      cursor += groupSize;
      spawnTick += rng.int(34, 54);
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
        if (!inBounds(column, row) || terrainAt(state, column, row) !== "open" || hasRubble(state, column, row) || buildingAt(state, column, row)) return false;
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
      return result(state, false, "Avery can only work during daylight.");
    }

    if (action.type === "clear") {
      const terrain = terrainAt(state, action.x, action.y);
      if (!["tree", "boulder"].includes(terrain) && !hasRubble(state, action.x, action.y)) return result(state, false, "Only a tree, boulder, or rubble can be cleared there.");
      if (terrain === "tree") {
        if (!consumeActions(state, 2)) return result(state, false, "Clearing a tree takes both daylight actions.");
        setTerrain(state, action.x, action.y, "open");
        state.resources.wood += 1;
        invalidatePaths(state);
        return result(state, true, "Avery clears a tree: +1 wood. The day is spent, but the first build site is ready.", action, shouldRecord);
      }
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
      if (terrain === "boulder") {
        setTerrain(state, action.x, action.y, "open");
        state.resources.stone += 1;
        invalidatePaths(state);
        return result(state, true, "Avery clears a boulder: +1 stone and a new buildable cell.", action, shouldRecord);
      }
      state.rubble = state.rubble.filter((rubble) => !(rubble.x === action.x && rubble.y === action.y));
      invalidatePaths(state);
      return result(state, true, "Avery clears the rubble. That ground is open again.", action, shouldRecord);
    }

    if (action.type === "repair") {
      const building = state.buildings.find((item) => item.id === action.id && !item.destroyed);
      if (!building) return result(state, false, "Choose a standing building to repair.");
      const recipe = buildingRecipe(building.type);
      if (building.health >= building.maxHealth) return result(state, false, `${recipe.label} is already sound.`);
      if (!hasResources(state, recipe.repairCost)) return result(state, false, "Repairing needs 1 wood.");
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
      spendResources(state, recipe.repairCost);
      building.health = Math.min(building.maxHealth, building.health + recipe.repairAmount);
      return result(state, true, `Avery repairs the ${recipe.label.toLowerCase()}.`, action, shouldRecord);
    }

    if (action.type === "scout") {
      if (!isPassable(state, action.x, action.y)) return result(state, false, "Scout needs an open cell.");
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
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
      if (!recipe || action.buildingType === "teepee") return result(state, false, "That building cannot be placed here.");
      if (!hasUnlock(state, action.buildingType)) return result(state, false, `${recipe.label} has not been unlocked yet.`);
      if (!validFootprint(state, action.buildingType, action.x, action.y)) return result(state, false, "That build site is blocked or occupied.");
      if (!hasResources(state, recipe.cost)) return result(state, false, `Need ${recipe.cost.wood || 0} wood to build this.`);
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
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
      return result(state, true, `Avery builds the ${recipe.label.toLowerCase()}.`, action, shouldRecord);
    }

    if (action.type === "stonework") {
      if (!hasUnlock(state, "stonework")) return result(state, false, "Stonework unlocks after the boar lesson.");
      if (state.upgrades.includes("stonework")) return result(state, false, "The teepee already has its stone brace.");
      const upgrade = UPGRADES.stonework;
      if (!hasResources(state, upgrade.cost)) return result(state, false, "Stonework needs 1 stone from a cleared boulder.");
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
      spendResources(state, upgrade.cost);
      const teepee = state.buildings.find((building) => building.type === "teepee");
      teepee.maxHealth += upgrade.maxHealthBonus;
      teepee.health = Math.min(teepee.maxHealth, teepee.health + upgrade.healthBonus);
      state.upgrades.push("stonework");
      return result(state, true, "Avery braces the teepee with stone. Its shelter is stronger now.", action, shouldRecord);
    }

    if (action.type === "endDay") {
      state.phase = "night";
      state.nightTick = 0;
      state.paused = false;
      state.encounter = buildEncounter(state);
      state.lastEvent = "Avery goes inside the teepee. The first group is moving through the trees.";
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
      state.outcome = { victory: false, title: "The teepee falls.", copy: "Avery and Scout retreat into the trees. Try the same seed again with a different plan." };
      state.history.push({ level: levelFor(state).id, result: "lost", seed: state.seed });
      return;
    }
    buildingCells(building).forEach((cell) => state.rubble.push({ x: cell.x, y: cell.y }));
    invalidatePaths(state);
    state.lastEvent = `The ${buildingRecipe(building.type).label.toLowerCase()} becomes rubble and blocks the ground.`;
  }

  function updateStickLaunchers(state) {
    state.buildings.filter((building) => !building.destroyed && building.type === "stickLauncher").forEach((launcher) => {
      const recipe = buildingRecipe(launcher.type);
      launcher.cooldown = Math.max(0, (launcher.cooldown || 0) - 1);
      launcher.firingTicks = Math.max(0, (launcher.firingTicks || 0) - 1);
      const targets = state.enemies
        .filter((enemy) => distance(launcher, enemy) <= recipe.attackRange + enemyRecipe(enemy.type).collisionRadius)
        .sort((left, right) => distance(launcher, left) - distance(launcher, right) || String(left.id).localeCompare(String(right.id)));
      const target = targets[0];
      launcher.targetId = target?.id || null;
      if (!target || launcher.cooldown > 0) return;
      target.health = Math.max(0, target.health - recipe.damage);
      launcher.cooldown = Math.max(1, Math.round(TICK_RATE / recipe.attackSpeed));
      launcher.firingTicks = 5;
      state.lastEvent = `The stick launcher snaps a sharpened branch at the ${enemyRecipe(target.type).label.toLowerCase()}.`;
      if (target.health === 0) {
        state.kills += 1;
        state.xp += enemyRecipe(target.type).xp;
        state.enemies = state.enemies.filter((enemy) => enemy.id !== target.id);
        launcher.targetId = null;
        state.lastEvent = `The stick launcher turns away the ${enemyRecipe(target.type).label.toLowerCase()}: +${enemyRecipe(target.type).xp} XP.`;
      }
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
      state.kills += 1;
      state.xp += enemyRecipe(target.type).xp;
      state.enemies = state.enemies.filter((enemy) => enemy.id !== target.id);
      scout.targetId = null;
      state.lastEvent = `Scout turns away the ${enemyRecipe(target.type).label.toLowerCase()}: +${enemyRecipe(target.type).xp} XP.`;
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
    state.paused = false;
    state.speed = 1;
    state.outcome = null;
    state.aftermathTicks = 0;
    const nextLevel = levelFor(state);
    state.lastEvent = `${completedLevel.title} held. ${completionCopy} Level ${nextLevel.number}: ${nextLevel.title}. Avery has two actions before dusk.`;
  }

  function settleAftermath(state) {
    const level = levelFor(state);
    state.xp += level.survivalXp;
    const unlockedNow = Boolean(level.unlock) && !hasUnlock(state, level.unlock);
    if (unlockedNow) addUnlock(state, level.unlock);
    const completionCopy = unlockedNow
      ? `${level.unlockLabel} unlocked. ${level.unlockCopy}`
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
    updateStickLaunchers(state);
    updateScout(state);
    if (state.phase !== "night") return state;
    [...state.enemies].forEach((enemy) => {
      if (state.phase === "night" && state.enemies.some((item) => item.id === enemy.id)) updateEnemy(state, enemy);
    });
    if (state.phase === "night" && state.encounter.waves.every((wave) => wave.spawned) && state.enemies.length === 0) beginAftermath(state);
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
    UPGRADES,
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
    terrainAt,
    inBounds,
    cellKey,
    buildingCells,
    buildingAt,
    isPassable,
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
