const assert = require("node:assert/strict");
const Engine = require("./engine.js");

function action(state, payload) {
  const result = Engine.dispatch(state, payload);
  assert.equal(result.ok, true, result.message);
}

function settleToNextDay(state) {
  const initialLevel = state.levelIndex;
  let guard = 18000;
  while (!(state.phase === "day" && state.levelIndex === initialLevel + 1) && guard > 0) {
    Engine.advanceTick(state);
    guard -= 1;
  }
  assert.notEqual(guard, 0, "night should settle, Scout should return, and the next day should begin automatically");
}

function constructShelter(state) {
  action(state, { type: "constructShelter" });
}

// Level 1 begins with a forced shelter. Nothing else can spend resources or begin the night first.
const run = Engine.createRun("HEARTH-1042");
assert.deepEqual(run.resources, { wood: 0 });
assert.equal(run.actionPoints, 2);
assert.equal(run.shelterBuilt, false);
assert.equal(Engine.hasShelter(run), false);
assert.equal(run.buildings.length, 0);
assert.equal(run.terrain.includes("boulder"), false, "stone is out of the current resource loop");
assert.equal(Engine.validFootprint(run, "stickLauncher", 4, 5), true, "original unoccupied grass is a defense build site");
assert.equal(Engine.validFootprint(run, "stickLauncher", 1, 3), false, "standing trees still block placement");
const waterRun = Engine.createRun("FUTURE-WATER");
waterRun.terrain[0] = "water";
assert.equal(Engine.validFootprint(waterRun, "stickLauncher", 0, 0), false, "future terrain blocks placement until it explicitly opts in");
assert.equal(Engine.dispatch(run, { type: "clear", x: 1, y: 3 }).ok, false, "tree clearing is locked until shelter construction");
assert.equal(Engine.dispatch(run, { type: "endDay" }).ok, false, "night cannot begin before shelter construction");
assert.equal(run.actionPoints, 2, "blocked opening actions do not spend actions");
constructShelter(run);
assert.equal(run.shelterBuilt, true);
assert.equal(Engine.hasShelter(run), true);
assert.equal(run.buildings[0].type, "teepee");
assert.equal(run.resources.wood, 0, "the shelter is the only free build");
assert.equal(run.actionPoints, 0, "the forced shelter occupies the first day");
action(run, { type: "endDay" });
assert.equal(run.encounter.threatBudget, 1);
assert.deepEqual(run.encounter.units, ["raccoon"]);
settleToNextDay(run);
assert.equal(run.levelIndex, 1);
assert.equal(run.xp, 3, "the first kill and cleared night award only XP");
assert.ok(run.unlocks.includes("stickLauncher"));

// Level 2 permits a clear and a launcher in the same day: each uses one action.
action(run, { type: "clear", x: 1, y: 3 });
assert.equal(Engine.terrainAt(run, 1, 3), "cleared");
assert.equal(run.resources.wood, 2);
assert.equal(Engine.validFootprint(run, "stickLauncher", 1, 3), true, "cleared-tree grass remains buildable");
assert.equal(run.actionPoints, 1, "clearing a tree consumes one daylight action");
assert.equal(Engine.BUILDINGS.stickLauncher.cost.wood, 2, "a cleared tree funds exactly one basic launcher");
action(run, { type: "build", buildingType: "stickLauncher", x: 4, y: 5 });
const launcher = run.buildings.find((building) => building.type === "stickLauncher");
assert.ok(launcher);
assert.deepEqual(run.resources, { wood: 0 }, "unused legacy resources must not leak into a wood-only run");
assert.equal(run.actionPoints, 0);
assert.equal(Engine.BUILDINGS.stickLauncher.attackRange, 2.25);
assert.equal(Engine.dispatch(run, { type: "finish", id: "not-a-step" }).ok, false, "Finish is not part of the MVP loop");
action(run, { type: "endDay" });
settleToNextDay(run);
assert.ok(run.unlocks.includes("potatoGun"), "holding Level 2 unlocks the Potato Gun");
assert.equal(Engine.BUILDINGS.potatoGun.damage, 3);
assert.equal(Engine.BUILDINGS.potatoGun.knockback, 1);

// Forest remains dense, but every edge is a legal seeded spawn entry.
assert.equal(Engine.isPassable(Engine.createRun("FOREST-PATH"), 0, 0), true);
assert.ok(Engine.SPAWN_CELLS.length >= 48, "all perimeter cells are eligible spawns");
assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(Engine.mediumThreatBudget), [1, 2, 3, 4, 5, 7, 9]);

// A tower fires a visible projectile first; damage lands only when it reaches the target.
const towerRun = Engine.createRun("TEST-PROJECTILE");
constructShelter(towerRun);
towerRun.unlocks.push("stickLauncher");
towerRun.actionPoints = 2;
action(towerRun, { type: "clear", x: 1, y: 3 });
action(towerRun, { type: "build", buildingType: "stickLauncher", x: 1, y: 3 });
towerRun.phase = "night";
towerRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
towerRun.enemies = [{ id: "e-launcher", type: "raccoon", x: 1, y: 0.5, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(towerRun);
assert.equal(towerRun.projectiles.length, 1, "tower should launch a projectile before damage applies");
assert.equal(towerRun.enemies[0].health, 5);
Engine.advanceTicks(towerRun, 12);
assert.equal(towerRun.enemies[0].health, 4, "the branch should deal damage on impact");
assert.ok(towerRun.impacts.length > 0, "an impact is exposed for the renderer");

// Potato Gun is a separate heavy building: one visible slow projectile deals three damage and pushes a survivor back.
const potatoRun = Engine.createRun("TEST-POTATO");
constructShelter(potatoRun);
potatoRun.unlocks.push("potatoGun");
potatoRun.actionPoints = 2;
action(potatoRun, { type: "clear", x: 1, y: 3 });
potatoRun.resources.wood = 3;
action(potatoRun, { type: "build", buildingType: "potatoGun", x: 1, y: 3 });
potatoRun.phase = "night";
potatoRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
potatoRun.enemies = [{ id: "e-potato", type: "raccoon", x: 1, y: 0.5, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(potatoRun);
assert.equal(potatoRun.projectiles[0].type, "potato");
assert.equal(potatoRun.projectiles[0].knockback, 1);
Engine.advanceTicks(potatoRun, 16);
assert.equal(potatoRun.enemies[0].health, 2, "the Potato Gun deals its heavy hit on impact");
assert.ok(potatoRun.enemies[0].knockbackTicks > 0, "a surviving target is visibly knocked back");

// Arrowcraft costs XP only; launcher upgrades use one day action.
const upgradeRun = Engine.createRun("TEST-ARROWCRAFT");
constructShelter(upgradeRun);
upgradeRun.levelIndex = 2;
upgradeRun.unlocks.push("stickLauncher");
upgradeRun.xp = 6;
assert.equal(Engine.techAvailability(upgradeRun, "arrowcraft").available, true);
const researchActions = upgradeRun.actionPoints;
action(upgradeRun, { type: "research", nodeId: "arrowcraft" });
assert.equal(upgradeRun.xp, 0);
assert.ok(upgradeRun.research.includes("arrowcraft"));
assert.equal(upgradeRun.actionPoints, researchActions, "research costs XP but no day action");
upgradeRun.resources.wood = 2;
upgradeRun.actionPoints = 2;
action(upgradeRun, { type: "build", buildingType: "stickLauncher", x: 4, y: 5 });
upgradeRun.resources.wood = 4;
const upgradeTarget = upgradeRun.buildings.find((building) => building.type === "stickLauncher");
action(upgradeRun, { type: "upgradeLauncher", id: upgradeTarget.id });
assert.equal(upgradeTarget.type, "arrowShooter");
assert.equal(upgradeRun.resources.wood, 0);
assert.equal(upgradeRun.actionPoints, 0);
assert.deepEqual(
  [Engine.BUILDINGS.arrowShooter.damage, Engine.BUILDINGS.arrowShooter.attackSpeed, Engine.BUILDINGS.arrowShooter.attackRange],
  [1.5, 0.75, 3.375],
);

// Scout is still the mobile final line and no Scout health economy is required.
const guardianRun = Engine.createRun("TEST-GUARDIAN");
constructShelter(guardianRun);
guardianRun.phase = "night";
guardianRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
guardianRun.enemies = [{ id: "e-guardian", type: "raccoon", x: 7.3, y: 7, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(guardianRun);
assert.equal(guardianRun.scout.mode, "chasing");
assert.ok(guardianRun.scout.x > guardianRun.scout.postX);

// Seeded pacing remains deterministic, including wave entries and timings.
const encounterOne = Engine.createRun("SAME-SEED");
const encounterTwo = Engine.createRun("SAME-SEED");
constructShelter(encounterOne);
constructShelter(encounterTwo);
action(encounterOne, { type: "endDay" });
action(encounterTwo, { type: "endDay" });
assert.deepEqual(encounterOne.encounter, encounterTwo.encounter);
assert.ok(encounterOne.encounter.waves[0].spawnTick >= 18);

// Replay includes research and automatic between-level continuation, with no manual Continue action.
const replaySource = Engine.createRun("REPLAY-SEED");
constructShelter(replaySource);
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
action(replaySource, { type: "clear", x: 1, y: 3 });
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
action(replaySource, { type: "research", nodeId: "arrowcraft" });
assert.equal(Engine.checksum(Engine.replay(replaySource.seed, replaySource.actionLog)), Engine.checksum(replaySource));

const restored = Engine.hydrate(Engine.serialize(replaySource));
assert.equal(Engine.checksum(restored), Engine.checksum(replaySource));
assert.throws(() => Engine.hydrate({ version: 3, state: {} }), /different version/);
assert.throws(() => Engine.hydrate({ version: 5, state: {} }), /different version/);

console.log("Wild Hearth engine checks passed.");
