const assert = require("node:assert/strict");
const Engine = require("./engine.js");

function action(state, payload) {
  const result = Engine.dispatch(state, payload);
  assert.equal(result.ok, true, result.message);
}

function settleToNextDay(state) {
  const initialLevel = state.levelIndex;
  let guard = 14000;
  while (!(state.phase === "day" && state.levelIndex === initialLevel + 1) && guard > 0) {
    Engine.advanceTick(state);
    guard -= 1;
  }
  assert.notEqual(guard, 0, "night should settle, Scout should return, and the next day should begin automatically");
}

// The opening is intentional: no starting wood, one whole-day tree clear, then Scout holds the first night.
const run = Engine.createRun("HEARTH-1042");
assert.equal(run.resources.wood, 0);
assert.equal(run.actionPoints, 2);
assert.equal(run.buildings[0].health, run.buildings[0].maxHealth);
action(run, { type: "clear", x: 1, y: 3 });
assert.equal(Engine.terrainAt(run, 1, 3), "open");
assert.equal(run.resources.wood, 1);
assert.equal(run.actionPoints, 0, "clearing a tree consumes both daylight actions");
assert.equal(Engine.dispatch(run, { type: "scout", x: 4, y: 6 }).ok, false, "no action remains after clearing a tree");

// Forest remains dense and all usable edge cells stay valid encounter entries.
assert.equal(Engine.isPassable(Engine.createRun("FOREST-PATH"), 0, 0), true);
assert.ok(Engine.SPAWN_CELLS.length >= 44, "all usable perimeter cells are eligible spawns");

// Medium Threat is a deterministic 25% rounded-up recurrence: 1, 2, 3, 4, 5, 7 …
assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(Engine.mediumThreatBudget), [1, 2, 3, 4, 5, 7, 9]);

action(run, { type: "endDay" });
assert.equal(run.encounter.threatBudget, 1);
assert.deepEqual(run.encounter.units, ["raccoon"]);
settleToNextDay(run);
assert.equal(run.levelIndex, 1);
assert.equal(run.phase, "day");
assert.equal(run.actionPoints, 2);
assert.equal(run.resources.wood, 1, "the cleared wood carries into Level 2");
assert.ok(run.unlocks.includes("stickLauncher"));
assert.equal(run.scout.mode, "idle", "Scout has returned to the post before the next day starts");

// Building is direct: no blueprint or Finish step, and the first launcher costs the first saved wood.
action(run, { type: "build", buildingType: "stickLauncher", x: 1, y: 3 });
const launcher = run.buildings.find((building) => building.type === "stickLauncher");
assert.ok(launcher);
assert.equal(run.resources.wood, 0);
assert.equal(run.actionPoints, 1);
assert.equal(Engine.isPassable(run, 1, 3), false, "a completed launcher immediately blocks its build cell");
assert.equal(Engine.dispatch(run, { type: "finish", id: "not-a-step" }).ok, false, "Finish is not part of the MVP loop");

// The launcher is a real first-line tower: it damages the nearest enemy before Scout needs to bite.
const towerRun = Engine.createRun("TEST-LAUNCHER");
towerRun.unlocks.push("stickLauncher");
towerRun.resources.wood = 1;
action(towerRun, { type: "build", buildingType: "stickLauncher", x: 4, y: 5 });
towerRun.phase = "night";
towerRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
towerRun.enemies = [{ id: "e-launcher", type: "raccoon", x: 4, y: 1, health: 4, maxHealth: 4, cooldown: 4 }];
Engine.advanceTick(towerRun);
assert.equal(towerRun.enemies[0].health, 3, "launcher should hit a raccoon in its 4.5-cell range");

// Scout remains mobile final-line defense, not the whole plan.
const guardianRun = Engine.createRun("TEST-GUARDIAN");
guardianRun.phase = "night";
guardianRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
guardianRun.enemies = [{ id: "e-guardian", type: "raccoon", x: 7.3, y: 7, health: 4, maxHealth: 4, cooldown: 4 }];
Engine.advanceTick(guardianRun);
assert.equal(guardianRun.scout.mode, "chasing");
assert.ok(guardianRun.scout.x > guardianRun.scout.postX, "Scout should leave the post only to intercept a leak");

// Same seed produces the same medium-Threat allocation, spawn edges, and wave timing.
const encounterOne = Engine.createRun("SAME-SEED");
const encounterTwo = Engine.createRun("SAME-SEED");
action(encounterOne, { type: "endDay" });
action(encounterTwo, { type: "endDay" });
assert.deepEqual(encounterOne.encounter, encounterTwo.encounter);
assert.equal(encounterOne.encounter.threatBudget, 1);

// A replay includes automatic between-level continuation; no manual Continue action is recorded.
const replaySource = Engine.createRun("REPLAY-SEED");
action(replaySource, { type: "clear", x: 1, y: 3 });
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
action(replaySource, { type: "build", buildingType: "stickLauncher", x: 1, y: 3 });
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
assert.equal(replaySource.levelIndex, 2);
assert.equal(Engine.checksum(Engine.replay(replaySource.seed, replaySource.actionLog)), Engine.checksum(replaySource));

// Versioned saves preserve the current automatic-progression state.
const restored = Engine.hydrate(Engine.serialize(replaySource));
assert.equal(Engine.checksum(restored), Engine.checksum(replaySource));

console.log("Wild Hearth engine checks passed.");
