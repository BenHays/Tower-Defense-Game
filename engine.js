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
  const SAVE_VERSION = 1;
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
      moveSpeed: 0,
      attackRange: 3.3,
      collisionRadius: 0.34,
      targetRule: "nearest-enemy-in-range",
      targetType: "enemy",
    },
  };

  const ENEMIES = {
    raccoon: {
      id: "raccoon",
      label: "Raccoon",
      cost: 2,
      health: 4,
      damage: 1,
      attackSpeed: 0.85,
      moveSpeed: 1.3,
      attackRange: 0.72,
      collisionRadius: 0.28,
      targetRule: "closest-reachable-building",
      targetType: "building",
      xp: 1,
    },
    boar: {
      id: "boar",
      label: "Boar",
      cost: 4,
      health: 10,
      damage: 2,
      attackSpeed: 0.72,
      moveSpeed: 0.76,
      attackRange: 0.82,
      collisionRadius: 0.44,
      targetRule: "closest-reachable-building",
      targetType: "building",
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
    barricade: {
      id: "barricade",
      label: "Wooden barricade",
      footprint: { width: 1, height: 1 },
      maxHealth: 12,
      cost: { wood: 2, stone: 0 },
      role: "blocker",
      tags: ["defense", "bait", "boar-counter"],
      repairAmount: 4,
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
    raccoon: { building: "teepee", explanation: "Scout's early range is enough for a lone raccoon." },
    boar: { building: "barricade", explanation: "A wooden barricade becomes the boar's closest target while Scout attacks." },
  };

  const LEVELS = [
    {
      id: "first-watch",
      number: 1,
      title: "First watch",
      difficulty: 2,
      variance: 0,
      required: ["raccoon"],
      choices: ["raccoon"],
      survivalXp: 2,
      unlock: "barricade",
      unlockLabel: "Wooden barricade",
      unlockCopy: "Build it close to the animal trail so a boar has something else to smash first.",
    },
    {
      id: "boar-at-dusk",
      number: 2,
      title: "Boar at dusk",
      difficulty: 4,
      variance: 2,
      required: ["boar"],
      choices: ["raccoon"],
      survivalXp: 3,
      unlock: "stonework",
      unlockLabel: "Stone teepee brace",
      unlockCopy: "Boulders can now become a stronger home instead of wasted space.",
    },
    {
      id: "long-evening",
      number: 3,
      title: "The long evening",
      difficulty: 6,
      variance: 4,
      required: ["boar"],
      choices: ["raccoon", "boar"],
      survivalXp: 4,
      unlock: "replay",
      unlockLabel: "Recorded replays",
      unlockCopy: "Run the exact same seed and actions again to test a plan.",
    },
  ];

  const SPAWN_CELLS = [
    { x: 5, y: 0, edge: "north" }, { x: 6, y: 0, edge: "north" },
    { x: 12, y: 5, edge: "east" }, { x: 12, y: 6, edge: "east" },
    { x: 6, y: 12, edge: "south" }, { x: 7, y: 12, edge: "south" },
    { x: 0, y: 6, edge: "west" }, { x: 0, y: 7, edge: "west" },
  ];

  function makeFixedTerrain() {
    const terrain = Array.from({ length: BOARD.width * BOARD.height }, () => "tree");
    const set = (x, y, type) => { terrain[y * BOARD.width + x] = type; };
    const open = (x, y) => set(x, y, "open");

    for (let y = 0; y <= 5; y += 1) { open(5, y); open(6, y); }
    for (let y = 7; y < BOARD.height; y += 1) { open(6, y); open(7, y); }
    for (let x = 0; x <= 5; x += 1) { open(x, 6); open(x, 7); }
    for (let x = 7; x < BOARD.width; x += 1) { open(x, 5); open(x, 6); }
    for (let y = 4; y <= 8; y += 1) {
      for (let x = 4; x <= 8; x += 1) {
        if (Math.hypot(x - 6, y - 6) <= 2.45) open(x, y);
      }
    }
    [[3, 5], [9, 7], [3, 9], [9, 3]].forEach(([x, y]) => set(x, y, "boulder"));
    return terrain;
  }

  const FIXED_TERRAIN = makeFixedTerrain();

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

  function levelFor(state) { return LEVELS[Math.min(state.levelIndex, LEVELS.length - 1)]; }
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

  function buildingAt(state, x, y, includeBlueprints) {
    const buildings = state.buildings.filter((building) => !building.destroyed);
    const candidates = includeBlueprints ? buildings.concat(state.blueprints) : buildings;
    return candidates.find((building) => buildingCells(building).some((cell) => cell.x === x && cell.y === y));
  }

  function hasRubble(state, x, y) {
    return state.rubble.some((rubble) => rubble.x === x && rubble.y === y);
  }

  function isPassable(state, x, y) {
    if (!inBounds(x, y) || terrainAt(state, x, y) !== "open" || hasRubble(state, x, y)) return false;
    return !buildingAt(state, x, y, false);
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

  function findPath(state, start, goal) {
    if (!isPassable(state, goal.x, goal.y)) return null;
    const source = { x: Math.round(start.x), y: Math.round(start.y) };
    if (!inBounds(source.x, source.y)) return null;
    const key = `${state.topologyVersion}|${source.x},${source.y}|${goal.x},${goal.y}`;
    const cache = getPathCache(state);
    if (cache.paths.has(key)) return clone(cache.paths.get(key));
    if (source.x === goal.x && source.y === goal.y) return [{ x: source.x, y: source.y }];

    const queue = [source];
    const visited = new Set([cellKey(source.x, source.y)]);
    const previous = new Map();
    const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    let cursor = 0;
    let found = false;

    while (cursor < queue.length) {
      const current = queue[cursor];
      cursor += 1;
      for (const direction of directions) {
        const next = { x: current.x + direction.x, y: current.y + direction.y };
        const nextKey = cellKey(next.x, next.y);
        if (visited.has(nextKey) || !isPassable(state, next.x, next.y)) continue;
        visited.add(nextKey);
        previous.set(nextKey, current);
        if (next.x === goal.x && next.y === goal.y) { found = true; break; }
        queue.push(next);
      }
      if (found) break;
    }

    if (!found) return null;
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

  function closestReachableBuilding(state, entity, extraBuilding) {
    const buildings = state.buildings.filter((building) => !building.destroyed).concat(extraBuilding ? [extraBuilding] : []);
    const candidates = [];
    for (const building of buildings) {
      for (const approach of approachCells(state, building)) {
        const path = findPath(state, entity, approach);
        if (!path) continue;
        candidates.push({ building, approach, path, distance: path.length - 1 });
      }
    }
    candidates.sort((left, right) => left.distance - right.distance
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

  function createRun(seed) {
    const teepee = {
      id: "b-teepee",
      type: "teepee",
      x: 6,
      y: 6,
      health: 10,
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
      resources: { wood: 4, stone: 0 },
      xp: 0,
      unlocks: [],
      terrain: FIXED_TERRAIN.slice(),
      buildings: [teepee],
      blueprints: [],
      rubble: [],
      scout: { ...clone(UNITS.scout), x: 5, y: 7, cooldown: 0 },
      enemies: [],
      encounter: null,
      topologyVersion: 0,
      nextEntityId: 1,
      kills: 0,
      actionLog: [],
      lastEvent: "Avery and Scout begin with two daylight actions. The meadow will wait until you choose End day.",
      outcome: null,
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
    const units = level.required.slice();
    const rolledDifficulty = level.difficulty + rng.int(0, level.variance);
    let remaining = rolledDifficulty - units.reduce((sum, type) => sum + enemyRecipe(type).cost, 0);
    let attempts = 12;
    while (remaining >= 2 && attempts > 0) {
      attempts -= 1;
      const affordable = level.choices.filter((type) => enemyRecipe(type).cost <= remaining);
      if (!affordable.length || rng.next() < 0.33) break;
      const type = rng.pick(affordable);
      units.push(type);
      remaining -= enemyRecipe(type).cost;
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
      difficulty: rolledDifficulty,
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
        if (!inBounds(column, row) || terrainAt(state, column, row) !== "open" || hasRubble(state, column, row) || buildingAt(state, column, row, true)) return false;
      }
    }
    return true;
  }

  function blueprintPreview(state, type, x, y) {
    const recipe = buildingRecipe(type);
    if (!recipe) return { valid: false, message: "Unknown building." };
    const valid = validFootprint(state, type, x, y);
    const affordable = hasResources(state, recipe.cost);
    const candidate = { id: "preview", type, x, y };
    const level = levelFor(state);
    const encounter = buildEncounter(state);
    const target = closestReachableBuilding(state, encounter.waves[0].entry, candidate);
    const coverage = distance(state.scout, { x, y }) <= state.scout.attackRange + 0.5;
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

    if (action.type === "nextLevel") {
      if (state.phase !== "complete") return result(state, false, "Finish the current night first.");
      if (state.levelIndex >= LEVELS.length - 1) return result(state, false, "The current meadow story is complete. Try a new seed.");
      state.levelIndex += 1;
      state.phase = "day";
      state.actionPoints = STARTING_ACTIONS;
      state.nightTick = 0;
      state.encounter = null;
      state.enemies = [];
      state.paused = false;
      state.speed = 1;
      state.outcome = null;
      state.lastEvent = `Level ${levelFor(state).number}: ${levelFor(state).title}. Avery has two actions before dusk.`;
      return result(state, true, state.lastEvent, action, shouldRecord);
    }

    if (state.phase !== "day" && action.type !== "speed" && action.type !== "pause") {
      return result(state, false, "Avery can only work during daylight.");
    }

    if (action.type === "clear") {
      const terrain = terrainAt(state, action.x, action.y);
      if (!["tree", "boulder"].includes(terrain) && !hasRubble(state, action.x, action.y)) return result(state, false, "Only a tree, boulder, or rubble can be cleared there.");
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
      if (terrain === "tree") {
        setTerrain(state, action.x, action.y, "open");
        state.resources.wood += 1;
        invalidatePaths(state);
        return result(state, true, "Avery clears a tree: +1 wood and a new buildable cell.", action, shouldRecord);
      }
      if (terrain === "boulder") {
        setTerrain(state, action.x, action.y, "open");
        state.resources.stone += 1;
        invalidatePaths(state);
        return result(state, true, "Avery clears a boulder: +1 stone and a new buildable cell.", action, shouldRecord);
      }
      state.rubble = state.rubble.filter((rubble) => !(rubble.x === action.x && rubble.y === action.y));
      invalidatePaths(state);
      return result(state, true, "Avery clears the rubble. The trail is open again.", action, shouldRecord);
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
      return result(state, true, "Scout settles into a new watch position.", action, shouldRecord);
    }

    if (action.type === "blueprint") {
      const recipe = buildingRecipe(action.buildingType);
      if (!recipe || action.buildingType === "teepee") return result(state, false, "That building cannot be placed here.");
      if (!hasUnlock(state, action.buildingType)) return result(state, false, `${recipe.label} has not been unlocked yet.`);
      if (!validFootprint(state, action.buildingType, action.x, action.y)) return result(state, false, "That footprint is blocked or reserved.");
      if (!hasResources(state, recipe.cost)) return result(state, false, `Need ${recipe.cost.wood || 0} wood for this blueprint.`);
      spendResources(state, recipe.cost);
      state.blueprints.push({ id: `p-${state.nextEntityId++}`, type: action.buildingType, x: action.x, y: action.y });
      return result(state, true, `${recipe.label} blueprint placed. Finish it with one Avery action.`, action, shouldRecord);
    }

    if (action.type === "finish") {
      const blueprint = state.blueprints.find((item) => item.id === action.id);
      if (!blueprint) return result(state, false, "Choose an unfinished blueprint.");
      if (!consumeAction(state)) return result(state, false, "Avery has used both daylight actions.");
      const recipe = buildingRecipe(blueprint.type);
      state.blueprints = state.blueprints.filter((item) => item.id !== blueprint.id);
      state.buildings.push({
        id: `b-${state.nextEntityId++}`,
        type: blueprint.type,
        x: blueprint.x,
        y: blueprint.y,
        health: recipe.maxHealth,
        maxHealth: recipe.maxHealth,
        destroyed: false,
      });
      invalidatePaths(state);
      return result(state, true, `Avery finishes the ${recipe.label.toLowerCase()}.`, action, shouldRecord);
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
        state.lastEvent = `A ${names} enters from the ${wave.entry.edge} trail.`;
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
    state.lastEvent = `The ${buildingRecipe(building.type).label.toLowerCase()} becomes rubble and blocks the trail.`;
  }

  function updateScout(state) {
    const scout = state.scout;
    scout.cooldown = Math.max(0, scout.cooldown - 1);
    const enemies = state.enemies.filter((enemy) => distance(scout, enemy) <= scout.attackRange + enemyRecipe(enemy.type).collisionRadius)
      .sort((left, right) => distance(scout, left) - distance(scout, right) || String(left.id).localeCompare(String(right.id)));
    if (!enemies.length || scout.cooldown > 0) return;
    const target = enemies[0];
    target.health = Math.max(0, target.health - scout.damage);
    scout.cooldown = Math.max(1, Math.round(TICK_RATE / scout.attackSpeed));
    state.lastEvent = `Scout keeps the ${enemyRecipe(target.type).label.toLowerCase()} inside his watch radius.`;
    if (target.health === 0) {
      state.kills += 1;
      state.xp += enemyRecipe(target.type).xp;
      state.enemies = state.enemies.filter((enemy) => enemy.id !== target.id);
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
    moveTowards(enemy, nextStep, recipe.moveSpeed / TICK_RATE);
  }

  function finishNight(state) {
    const level = levelFor(state);
    state.xp += level.survivalXp;
    const unlockedNow = !hasUnlock(state, level.unlock);
    addUnlock(state, level.unlock);
    state.phase = "complete";
    state.outcome = {
      victory: true,
      title: `${level.title} held.`,
      copy: unlockedNow ? `${level.unlockLabel} unlocked. ${level.unlockCopy}` : "The meadow holds through another night.",
      unlock: unlockedNow ? level.unlock : null,
      unlockLabel: unlockedNow ? level.unlockLabel : null,
      survivalXp: level.survivalXp,
    };
    state.history.push({ level: level.id, result: "victory", seed: state.seed, kills: state.kills });
    state.lastEvent = `${level.title} complete: +${level.survivalXp} survival XP.`;
  }

  function advanceTick(state) {
    if (state.phase !== "night" || state.paused) return state;
    state.tick += 1;
    state.nightTick += 1;
    spawnWaves(state);
    updateScout(state);
    if (state.phase !== "night") return state;
    [...state.enemies].forEach((enemy) => {
      if (state.phase === "night" && state.enemies.some((item) => item.id === enemy.id)) updateEnemy(state, enemy);
    });
    if (state.phase === "night" && state.encounter.waves.every((wave) => wave.spawned) && state.enemies.length === 0) finishNight(state);
    return state;
  }

  function advanceTicks(state, count) {
    for (let index = 0; index < count && state.phase === "night"; index += 1) advanceTick(state);
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
      if (action.type === "nextLevel") {
        dispatch(state, action, { record: false });
        continue;
      }
      dispatch(state, action, { record: false });
      if (action.type === "endDay") {
        let guard = 14000;
        while (state.phase === "night" && guard > 0) { advanceTick(state); guard -= 1; }
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
    createRun,
    createRng,
    nextSeed,
    levelFor,
    terrainAt,
    inBounds,
    cellKey,
    buildingCells,
    buildingAt,
    isPassable,
    hasRubble,
    validFootprint,
    blueprintPreview,
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
