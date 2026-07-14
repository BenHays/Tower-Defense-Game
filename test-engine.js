const assert = require("node:assert/strict");
const Engine = require("./engine.js");

function action(state, payload) {
  const result = Engine.dispatch(state, payload);
  assert.equal(result.ok, true, result.message);
}

function settleNight(state) {
  let guard = 14000;
  while (["night", "aftermath"].includes(state.phase) && guard > 0) {
    Engine.advanceTick(state);
    guard -= 1;
  }
  assert.notEqual(guard, 0, "night simulation should settle");
}

// Day remains untimed until the player explicitly ends it.
const idleRun = Engine.createRun("TEST-IDLE");
Engine.advanceTicks(idleRun, 800);
assert.equal(idleRun.phase, "day");
assert.equal(idleRun.actionPoints, 2);

// Tree and boulder terrain use the same action contract but grant distinct resources.
action(idleRun, { type: "clear", x: 1, y: 3 });
assert.equal(Engine.terrainAt(idleRun, 1, 3), "open");
assert.equal(idleRun.resources.wood, 5);
assert.equal(idleRun.actionPoints, 1);

// Dense trees remain visible but are walkable at a higher travel cost, so every edge can be a legal entry.
assert.equal(Engine.isPassable(Engine.createRun("FOREST-PATH"), 0, 0), true);
assert.ok(Engine.SPAWN_CELLS.length >= 44, "all usable perimeter cells are eligible spawns");

const terrainRun = Engine.createRun("TEST-TERRAIN");
action(terrainRun, { type: "clear", x: 3, y: 5 });
assert.equal(Engine.terrainAt(terrainRun, 3, 5), "open");
assert.equal(terrainRun.resources.stone, 1);

const scoutRun = Engine.createRun("TEST-SCOUT");
action(scoutRun, { type: "scout", x: 4, y: 6 });
assert.deepEqual({ x: scoutRun.scout.x, y: scoutRun.scout.y }, { x: 4, y: 6 });
assert.equal(scoutRun.actionPoints, 1);

// Scout leaves the post to bite inside the guard radius, then the aftermath brings him home before dawn.
const guardianRun = Engine.createRun("TEST-GUARDIAN");
guardianRun.phase = "night";
guardianRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
guardianRun.enemies = [{ id: "e-guardian", type: "raccoon", x: 7.3, y: 7, health: 4, maxHealth: 4, cooldown: 4 }];
Engine.advanceTick(guardianRun);
assert.equal(guardianRun.scout.mode, "chasing");
assert.ok(guardianRun.scout.x > guardianRun.scout.postX, "Scout should run from the post toward an intruder");

// The authored map never changes by seed, while legal encounter waves do.
const encounterOne = Engine.createRun("SAME-SEED");
const encounterTwo = Engine.createRun("SAME-SEED");
action(encounterOne, { type: "endDay" });
action(encounterTwo, { type: "endDay" });
assert.deepEqual(encounterOne.encounter, encounterTwo.encounter);
assert.ok(encounterOne.encounter.waves.every((wave, index, waves) => wave.units.length <= 2 && (index === 0 || wave.spawnTick > waves[index - 1].spawnTick)));

// The first night awards an unlock and uses the same fixed simulation as the browser.
const run = Engine.createRun("HEARTH-1042");
action(run, { type: "endDay" });
assert.equal(Engine.dispatch(run, { type: "clear", x: 1, y: 3 }).ok, false, "day actions must lock at night");
settleNight(run);
assert.equal(run.phase, "dawn");
assert.ok(run.unlocks.includes("barricade"));
assert.equal(run.kills, 1);

// A blueprint has sunk materials but is non-blocking/non-targetable until Avery finishes it.
action(run, { type: "nextLevel" });
action(run, { type: "blueprint", buildingType: "barricade", x: 5, y: 4 });
assert.equal(run.resources.wood, 2);
assert.equal(run.actionPoints, 2);
assert.equal(Engine.isPassable(run, 5, 4), true);
const blueprint = run.blueprints[0];
action(run, { type: "finish", id: blueprint.id });
assert.equal(run.actionPoints, 1);
assert.equal(Engine.isPassable(run, 5, 4), false);
const barricade = run.buildings.find((building) => building.type === "barricade");

// The boar picks the nearer reachable barricade by deterministic BFS distance.
action(run, { type: "endDay" });
let boarTarget;
for (let index = 0; index < 140; index += 1) {
  Engine.advanceTick(run);
  const boar = run.enemies.find((enemy) => enemy.type === "boar");
  if (boar) { boarTarget = boar.targetId; break; }
}
assert.equal(boarTarget, barricade.id);
settleNight(run);
assert.ok(run.unlocks.includes("stonework"));

// Destruction leaves impassable rubble until Avery clears it on a later day.
const rubbleRun = Engine.createRun("HEARTH-1042");
action(rubbleRun, { type: "endDay" });
settleNight(rubbleRun);
action(rubbleRun, { type: "nextLevel" });
action(rubbleRun, { type: "blueprint", buildingType: "barricade", x: 5, y: 4 });
action(rubbleRun, { type: "finish", id: rubbleRun.blueprints[0].id });
const sacrificialBarricade = rubbleRun.buildings.find((building) => building.type === "barricade");
rubbleRun.scout.x = 0;
rubbleRun.scout.y = 0;
action(rubbleRun, { type: "endDay" });
let rubbleGuard = 1000;
while (!sacrificialBarricade.destroyed && rubbleGuard > 0) { Engine.advanceTick(rubbleRun); rubbleGuard -= 1; }
assert.notEqual(rubbleGuard, 0, "the boar should be able to destroy its closest barricade");
assert.equal(Engine.hasRubble(rubbleRun, 5, 4), true);
assert.equal(Engine.isPassable(rubbleRun, 5, 4), false);

// Level 3 turns one nearby boulder into a usable stone reinforcement in the same two-action day.
action(run, { type: "nextLevel" });
action(run, { type: "clear", x: 3, y: 5 });
assert.equal(run.resources.stone, 1);
action(run, { type: "stonework" });
assert.ok(run.upgrades.includes("stonework"));
action(run, { type: "endDay" });
settleNight(run);
assert.equal(run.phase, "dawn");
assert.ok(run.unlocks.includes("replay"));

// Versioned saves preserve the full current run state, including the fixed authored map.
const restored = Engine.hydrate(Engine.serialize(run));
assert.equal(Engine.checksum(restored), Engine.checksum(run));
const anotherSeed = Engine.createRun("ANOTHER-SEED");
assert.deepEqual(anotherSeed.terrain, Engine.createRun("HEARTH-1042").terrain, "the meadow stays authored; only encounters vary by seed");
assert.equal(Engine.checksum(Engine.replay(run.seed, run.actionLog)), Engine.checksum(run), "a complete multi-level action log should replay exactly");

// Same seed + same day actions reproduces the same finished state.
const replaySource = Engine.createRun("REPLAY-SEED");
action(replaySource, { type: "endDay" });
settleNight(replaySource);
const replayed = Engine.replay("REPLAY-SEED", replaySource.actionLog);
assert.equal(Engine.checksum(replayed), Engine.checksum(replaySource));

console.log("Wild Hearth engine checks passed.");
