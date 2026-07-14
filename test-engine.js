const assert = require("node:assert/strict");
const Engine = require("./engine.js");
const TalentIcons = require("./talent-icons.js");

assert.deepEqual(Object.keys(Engine.TECH_BRANCHES), ["hunting", "farming", "building", "nurturing", "scouting"], "the live Talent Tree uses the five player-facing branches");
assert.ok(Engine.techNodes().every((node) => TalentIcons.icon(node.icon)), "every live talent resolves through the shared icon catalog");

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
  if (!state.hatchetCrafted) {
    Engine.OPENING_PICKUPS.forEach((pickup) => action(state, { type: "collectOpeningPickup", id: pickup.id }));
    action(state, { type: "craftHatchet" });
  }
  action(state, { type: "constructShelter", ...Engine.SHELTER_SITE });
}

// Level 1 begins with map pickups, then a player-chosen shelter. Nothing else can spend resources or begin the night first.
const run = Engine.createRun("HEARTH-1042");
const centralBuildSite = { x: Engine.SHELTER_SITE.x - 2, y: Engine.SHELTER_SITE.y - 1 };
const centralEnemySite = { x: centralBuildSite.x, y: centralBuildSite.y - 1.1 };
assert.deepEqual([Engine.BOARD.width, Engine.BOARD.height], [15, 15], "the meadow expands to a 15×15 board");
assert.deepEqual(Engine.SHELTER_SITE, { x: 7, y: 7 }, "the shelter stays centered after the map expansion");
assert.equal(run.terrain.length, 225, "the fixed terrain covers every expanded board cell");
assert.equal(Engine.terrainAt(run, centralBuildSite.x, centralBuildSite.y), "open", "the centered opening still has an initial defense site");
assert.equal(Engine.terrainAt(run, Engine.SHELTER_SITE.x + 3, Engine.SHELTER_SITE.y), "tree", "the added outer ring remains dense forest");
assert.deepEqual(run.resources, { wood: 0, hides: 0 });
assert.equal(run.actionPoints, 2);
assert.equal(run.shelterBuilt, false);
assert.equal(run.hatchetCrafted, false);
assert.equal(Engine.hasShelter(run), false);
assert.equal(run.buildings.length, 0);
assert.deepEqual(run.openingPickups.map((pickup) => ({ id: pickup.id, collected: pickup.collected })), [
  { id: "starter-stick", collected: false },
  { id: "starter-rock", collected: false },
], "the opening starts with one fixed stick and rock on the map");
assert.equal(run.terrain.includes("boulder"), false, "stone is out of the current resource loop");
assert.equal(Engine.validFootprint(run, "stickLauncher", centralBuildSite.x, centralBuildSite.y), true, "original unoccupied grass is a defense build site");
assert.equal(Engine.validFootprint(run, "stickLauncher", 1, 3), false, "standing trees still block placement");
const waterRun = Engine.createRun("FUTURE-WATER");
waterRun.terrain[0] = "water";
assert.equal(Engine.validFootprint(waterRun, "stickLauncher", 0, 0), false, "future terrain blocks placement until it explicitly opts in");
assert.equal(Engine.dispatch(run, { type: "clear", x: 1, y: 3 }).ok, false, "tree clearing is locked until shelter construction");
assert.equal(Engine.dispatch(run, { type: "constructShelter" }).ok, false, "the shelter is locked until the hatchet is crafted");
assert.equal(Engine.dispatch(run, { type: "craftHatchet" }).ok, false, "the axe is locked until both map materials are collected");
assert.equal(Engine.dispatch(run, { type: "endDay" }).ok, false, "night cannot begin before shelter construction");
assert.equal(run.actionPoints, 2, "blocked opening actions do not spend actions");
action(run, { type: "collectOpeningPickup", id: "starter-stick" });
assert.equal(run.actionPoints, 2, "collecting the starter stick does not spend a day action");
assert.equal(Engine.dispatch(run, { type: "craftHatchet" }).ok, false, "one material cannot craft the axe");
action(run, { type: "collectOpeningPickup", id: "starter-rock" });
assert.equal(Engine.hasOpeningSupplies(run), true, "both map materials unlock the starter axe");
action(run, { type: "craftHatchet" });
assert.equal(Engine.dispatch(run, { type: "constructShelter", x: 1, y: 3 }).ok, false, "the shelter cannot be placed on a tree");
action(run, { type: "constructShelter", ...Engine.SHELTER_SITE });
assert.equal(run.hatchetCrafted, true, "the opening records the crafted starter hatchet");
assert.equal(run.shelterBuilt, true);
assert.equal(Engine.hasShelter(run), true);
assert.equal(run.buildings[0].type, "teepee");
assert.deepEqual([run.buildings[0].x, run.buildings[0].y], [Engine.SHELTER_SITE.x, Engine.SHELTER_SITE.y], "the player may choose the centered grass cell for the shelter");
assert.equal(run.resources.wood, 0, "the shelter is the only free build");
assert.equal(run.actionPoints, 0, "crafting the hatchet and shelter each use one opening action");
const playerPlacedShelterRun = Engine.createRun("PLAYER-PLACED-SHELTER");
Engine.OPENING_PICKUPS.forEach((pickup) => action(playerPlacedShelterRun, { type: "collectOpeningPickup", id: pickup.id }));
action(playerPlacedShelterRun, { type: "craftHatchet" });
const playerShelterSite = { x: Engine.SHELTER_SITE.x - 2, y: Engine.SHELTER_SITE.y - 1 };
action(playerPlacedShelterRun, { type: "constructShelter", ...playerShelterSite });
assert.deepEqual([playerPlacedShelterRun.buildings[0].x, playerPlacedShelterRun.buildings[0].y], [playerShelterSite.x, playerShelterSite.y], "the player can place the shelter on any valid grass in the opening");
action(run, { type: "endDay" });
assert.equal(run.encounter.threatBudget, 1);
assert.deepEqual(run.encounter.units, ["raccoon"]);
settleToNextDay(run);
assert.equal(run.levelIndex, 1);
assert.equal(run.xp, 3, "the first kill and cleared night award only XP");
assert.equal(run.skillPoints, 0, "Skill Points begin after the first 10 XP milestone");
assert.equal(run.skillPointsEarned, 0);
assert.ok(run.resources.hides >= 1 && run.resources.hides <= 2, "a raccoon rolls a small hide drop");
assert.ok(run.unlocks.includes("stickLauncher"));
assert.equal(run.telemetry.nightReports.length, 1, "each completed night records a balance report");
assert.equal(run.telemetry.nightReports[0].spawned, 1);
assert.equal(run.telemetry.nightReports[0].killsBySource.Scout, 1);
assert.equal(run.telemetry.nightReports[0].hidesCollected, run.resources.hides, "the dawn report retains the rolled hide reward");
assert.equal(run.telemetry.total.nights, 1);

const sameSeedHideRun = Engine.createRun("HEARTH-1042");
constructShelter(sameSeedHideRun);
action(sameSeedHideRun, { type: "endDay" });
settleToNextDay(sameSeedHideRun);
assert.equal(sameSeedHideRun.resources.hides, run.resources.hides, "hide rolls are stable for the same seed and enemy id");

// Playback speed is a run preference: it can be chosen in daylight and persists into the next watch and dawn.
action(run, { type: "speed", speed: 2 });
assert.equal(run.speed, 2);

// Level 2 permits a clear and a launcher in the same day: each uses one action.
const unaffordableLauncher = Engine.toolPreview(run, "stickLauncher", centralBuildSite.x, centralBuildSite.y);
assert.equal(unaffordableLauncher.siteValid, true);
assert.equal(unaffordableLauncher.valid, false, "placement feedback includes material affordability");
assert.equal(Engine.toolPreview(run, "clear", 1, 3).valid, true);
action(run, { type: "clear", x: 1, y: 3 });
assert.equal(Engine.terrainAt(run, 1, 3), "cleared");
assert.equal(run.resources.wood, 2);
assert.equal(Engine.validFootprint(run, "stickLauncher", 1, 3), true, "cleared-tree grass remains buildable");
assert.equal(run.actionPoints, 1, "harvesting a tree consumes one daylight action");
assert.equal(Engine.BUILDINGS.stickLauncher.cost.wood, 2, "a cleared tree funds exactly one basic launcher");
assert.equal(Engine.toolPreview(run, "stickLauncher", centralBuildSite.x, centralBuildSite.y).valid, true, "the same preview turns valid after the clear");
action(run, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
const launcher = run.buildings.find((building) => building.type === "stickLauncher");
assert.ok(launcher);
assert.equal(launcher.maxHealth, 8, "the base Stick Launcher has 8 health");
const legacyLauncherSave = JSON.parse(Engine.serialize(run));
const legacyLauncher = legacyLauncherSave.state.buildings.find((building) => building.id === launcher.id);
legacyLauncher.maxHealth = 6;
legacyLauncher.health = 6;
const migratedLauncher = Engine.hydrate(legacyLauncherSave).buildings.find((building) => building.id === launcher.id);
assert.equal(migratedLauncher.maxHealth, 8, "saved Stick Launchers inherit the new maximum health without a save reset");
assert.equal(migratedLauncher.health, 6, "the health-cap adjustment never grants a saved tower a free heal");
const v10Save = JSON.parse(Engine.serialize(run));
v10Save.version = 10;
v10Save.state.version = 10;
delete v10Save.state.hatchetCrafted;
v10Save.state.actionLog = v10Save.state.actionLog.filter((item) => item.type !== "craftHatchet");
const migratedV10 = Engine.hydrate(v10Save);
assert.equal(migratedV10.hatchetCrafted, true, "a completed v10 shelter save receives its starter hatchet during migration");
assert.ok(migratedV10.actionLog.some((item) => item.type === "craftHatchet"), "migration restores the opening action for deterministic replays");
const v11Save = JSON.parse(Engine.serialize(run));
v11Save.version = 11;
v11Save.state.version = 11;
delete v11Save.state.openingPickups;
v11Save.state.actionLog = v11Save.state.actionLog
  .filter((item) => item.type !== "collectOpeningPickup")
  .map((item) => item.type === "constructShelter" ? { type: item.type } : item);
const migratedV11 = Engine.hydrate(v11Save);
assert.equal(Engine.hasOpeningSupplies(migratedV11), true, "a completed v11 opening migrates its collected stick and rock");
assert.deepEqual(Engine.replay(run.seed, migratedV11.actionLog).buildings.find((building) => building.type === "teepee").x, Engine.SHELTER_SITE.x, "v11 shelter actions gain their original deterministic placement");
const v12OpeningRun = Engine.createRun("V12-OPENING");
action(v12OpeningRun, { type: "collectOpeningPickup", id: "starter-stick" });
const v12Save = JSON.parse(Engine.serialize(v12OpeningRun));
v12Save.version = 12;
v12Save.state.version = 12;
const migratedV12 = Engine.hydrate(v12Save);
assert.equal(migratedV12.openingPickups.find((pickup) => pickup.id === "starter-stick").collected, true, "v12 saves preserve a partially collected opening");
assert.equal(migratedV12.openingPickups.find((pickup) => pickup.id === "starter-rock").collected, false, "v12 migration does not invent the missing starter material");
const v13Save = JSON.parse(Engine.serialize(v12OpeningRun));
v13Save.version = 13;
v13Save.state.version = 13;
v13Save.state.research = ["woodlandYield"];
const migratedV13 = Engine.hydrate(v13Save);
assert.equal(migratedV13.version, 14, "v13 saves migrate into the renamed Talent Tree version");
assert.deepEqual(migratedV13.research, ["woodlandYield"], "a migrated v13 save keeps its learned talents");
assert.equal(run.resources.wood, 0, "building still spends the whole first wood bundle");
assert.equal(run.actionPoints, 0);
assert.equal(Engine.BUILDINGS.stickLauncher.attackRange, 2.25);
assert.equal(Engine.dispatch(run, { type: "finish", id: "not-a-step" }).ok, false, "Finish is not part of the MVP loop");
action(run, { type: "endDay" });
settleToNextDay(run);
assert.equal(run.speed, 2, "chosen 2× speed survives the completed turn");
assert.equal(Engine.hydrate(Engine.serialize(run)).speed, 2, "chosen 2× speed survives save/load");
assert.ok(run.unlocks.includes("potatoPatch"), "holding Level 2 unlocks the Potato Patch for Level 3 planning");
assert.equal(run.unlocks.includes("potatoGun"), false, "the heavy launcher stays locked until the growing path is complete");
assert.equal(Engine.BUILDINGS.potatoGun.damage, 3);
assert.equal(Engine.BUILDINGS.potatoGun.knockback, 1);
assert.equal(run.xp, 8, "Experience remains lifetime progress after a level resolves");
assert.equal(run.skillPoints, 0, "8 XP is still short of the first spendable Skill Point");
assert.equal(Engine.nextSkillPointThreshold(run), 10);
assert.equal(Engine.grantExperience(run, 2).skillPoints, 1, "10 XP creates the first spendable Skill Point");
assert.equal(run.firstSkillPointReady, true, "the UI can announce the first Skill Point once");
assert.equal(Engine.nextSkillPointThreshold(run), 20);
assert.equal(Engine.grantExperience(run, 10).skillPoints, 1, "the second Skill Point arrives at 20 XP");
assert.equal(Engine.nextSkillPointThreshold(run), 40);
const milestoneRun = Engine.createRun("TEST-XP-THRESHOLDS");
assert.equal(Engine.grantExperience(milestoneRun, 80).skillPoints, 4, "one large XP grant crosses the 10, 20, 40, and 80 milestones");
assert.equal(milestoneRun.skillPoints, 4);
assert.equal(Engine.nextSkillPointThreshold(milestoneRun), 160);

// Talents are data-driven: Skill Point Scout Training permanently modifies the calculated Scout stats.
const scoutTechRun = Engine.createRun("TEST-SCOUT-TECH");
constructShelter(scoutTechRun);
scoutTechRun.levelIndex = 1;
scoutTechRun.xp = 10;
scoutTechRun.skillPoints = 1;
scoutTechRun.skillPointsEarned = 1;
const scoutResearchActions = scoutTechRun.actionPoints;
assert.equal(Engine.techAvailability(scoutTechRun, "scoutTraining1").available, true);
action(scoutTechRun, { type: "research", nodeId: "scoutTraining1" });
assert.equal(scoutTechRun.xp, 10, "Experience is never spent by research");
assert.equal(scoutTechRun.skillPoints, 0);
assert.equal(scoutTechRun.actionPoints, scoutResearchActions, "research never consumes a day action");
assert.equal(Engine.unitStats(scoutTechRun, "scout").damage, 2, "Scout Training adds damage without mutating the base recipe");
assert.equal(Engine.UNITS.scout.damage, 1);
assert.equal(Engine.dispatch(scoutTechRun, { type: "research", nodeId: "scoutTraining1" }).ok, false, "a talent cannot be bought twice");

const branchCostRun = Engine.createRun("TEST-BRANCH-COSTS");
constructShelter(branchCostRun);
branchCostRun.levelIndex = 4;
branchCostRun.unlocks.push("stickLauncher", "potatoGun");
branchCostRun.xp = 640;
branchCostRun.skillPoints = 7;
branchCostRun.skillPointsEarned = 7;
assert.equal(Engine.techAvailability(branchCostRun, "hardwoodThrows").costSkillPoints, 1, "the first Hunting purchase costs 1 Skill Point");
assert.equal(Engine.techAvailability(branchCostRun, "scoutTraining1").costSkillPoints, 1, "a different branch still starts at 1 Skill Point");
action(branchCostRun, { type: "research", nodeId: "hardwoodThrows" });
assert.equal(Engine.techAvailability(branchCostRun, "launcherRange").costSkillPoints, 2, "the second Hunting purchase costs 2 Skill Points");
assert.equal(Engine.techAvailability(branchCostRun, "potatoPacking").costSkillPoints, 2, "side nodes share their branch's escalating cost");
action(branchCostRun, { type: "research", nodeId: "potatoPacking" });
assert.equal(Engine.techAvailability(branchCostRun, "launcherRange").costSkillPoints, 4, "the third Hunting purchase costs 4 Skill Points");
action(branchCostRun, { type: "research", nodeId: "launcherRange" });
assert.equal(Engine.techAvailability(branchCostRun, "arrowcraft").costSkillPoints, 8, "the fourth Hunting purchase costs 8 Skill Points");

// Scout's day post reserves one grass cell, while structures reserve their own cells.
const occupancyRun = Engine.createRun("TEST-SCOUT-OCCUPANCY");
constructShelter(occupancyRun);
occupancyRun.unlocks.push("stickLauncher");
occupancyRun.resources.wood = 2;
occupancyRun.actionPoints = 2;
const oldPost = { x: occupancyRun.scout.postX, y: occupancyRun.scout.postY };
assert.equal(Engine.validFootprint(occupancyRun, "stickLauncher", oldPost.x, oldPost.y), false, "a building cannot overlap Scout's reserved watch post");
assert.equal(Engine.dispatch(occupancyRun, { type: "build", buildingType: "stickLauncher", ...oldPost }).ok, false);
assert.equal(Engine.validScoutPost(occupancyRun, Engine.SHELTER_SITE.x, Engine.SHELTER_SITE.y), false, "Scout cannot stand inside a structure");
const newPost = { x: Engine.SHELTER_SITE.x - 2, y: Engine.SHELTER_SITE.y - 1 };
action(occupancyRun, { type: "scout", ...newPost });
assert.equal(Engine.validFootprint(occupancyRun, "stickLauncher", oldPost.x, oldPost.y), true, "moving Scout frees the old watch post for construction");

// Farming, Building, and Nurturing talents use typed effects rather than special-case action rules.
const foragerRun = Engine.createRun("TEST-FORAGER");
constructShelter(foragerRun);
foragerRun.levelIndex = 1;
foragerRun.xp = 10;
foragerRun.skillPoints = 1;
foragerRun.skillPointsEarned = 1;
action(foragerRun, { type: "research", nodeId: "woodlandYield" });
foragerRun.actionPoints = 1;
action(foragerRun, { type: "clear", x: 1, y: 3 });
assert.equal(foragerRun.resources.wood, 3, "Woodland Yield raises a tree harvest by one wood");

const buildingRun = Engine.createRun("TEST-BUILDING");
constructShelter(buildingRun);
buildingRun.levelIndex = 4;
buildingRun.xp = 80;
buildingRun.skillPoints = 4;
buildingRun.skillPointsEarned = 4;
action(buildingRun, { type: "research", nodeId: "hearthkeeping1" });
action(buildingRun, { type: "research", nodeId: "reinforcedFrames" });
assert.equal(buildingRun.buildings[0].maxHealth, 14, "Reinforced Frames adds maximum health to standing targetable structures");
assert.equal(buildingRun.buildings[0].health, 14, "new frame protection is granted immediately instead of creating a damaged upgrade");
action(buildingRun, { type: "research", nodeId: "barkArmor" });
assert.equal(buildingRun.skillPoints, 0, "one Nurturing and two Building purchases consume 1 + 1 + 2 Skill Points");

// Forest remains dense, but every edge is a legal seeded spawn entry.
assert.equal(Engine.isPassable(Engine.createRun("FOREST-PATH"), 0, 0), true);
assert.equal(Engine.SPAWN_CELLS.length, 56, "all 15-cell perimeter entries are eligible spawns");
assert.ok(Engine.SPAWN_CELLS.every((cell) => Engine.inBounds(cell.x, cell.y) && (cell.x === 0 || cell.x === 14 || cell.y === 0 || cell.y === 14)), "every spawn stays on the expanded meadow perimeter");
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
assert.ok(towerRun.enemies[0].hitTicks > 0, "hits expose a brief readable reaction");

// A Potato Patch reserves a grass site, grows at dawn, then becomes the separate heavy building.
const potatoRun = Engine.createRun("TEST-POTATO");
constructShelter(potatoRun);
potatoRun.levelIndex = 2;
potatoRun.unlocks.push("potatoPatch");
potatoRun.actionPoints = 2;
potatoRun.resources.wood = 1;
assert.equal(Engine.dispatch(potatoRun, { type: "build", buildingType: "potatoGun", ...centralBuildSite }).ok, false, "Potato Guns cannot bypass the growing path");
action(potatoRun, { type: "build", buildingType: "potatoPatch", ...centralBuildSite });
const patch = potatoRun.buildings.find((building) => building.type === "potatoPatch");
assert.ok(patch, "a Potato Patch occupies the chosen grass cell");
assert.equal(Engine.isTargetableBuilding(patch), false, "the growing patch never becomes a surprise enemy target");
assert.equal(Engine.isPotatoPatchMature(patch), false, "a new patch cannot immediately become a launcher");
assert.equal(Engine.dispatch(potatoRun, { type: "upgradePotatoPatch", id: patch.id }).ok, false, "an immature patch cannot upgrade");
potatoRun.phase = "aftermath";
potatoRun.aftermathTicks = 39;
Engine.advanceTick(potatoRun);
assert.equal(patch.growthNights, 1, "the patch grows only after a held night resolves");
potatoRun.phase = "aftermath";
potatoRun.aftermathTicks = 39;
Engine.advanceTick(potatoRun);
assert.equal(Engine.isPotatoPatchMature(patch), true, "the patch matures after two held nights");
assert.ok(potatoRun.unlocks.includes("potatoGun"), "holding Level 4 unlocks the Potato Gun conversion for Level 5");
potatoRun.resources.wood = 3;
potatoRun.actionPoints = 1;
action(potatoRun, { type: "upgradePotatoPatch", id: patch.id });
assert.equal(patch.type, "potatoGun", "the mature patch becomes the heavy tower in place");
assert.equal(patch.health, patch.maxHealth, "the paid conversion starts the Potato Gun at full health");
potatoRun.phase = "night";
potatoRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
potatoRun.enemies = [{ id: "e-potato", type: "raccoon", ...centralEnemySite, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(potatoRun);
assert.equal(potatoRun.projectiles[0].type, "potato");
assert.equal(potatoRun.projectiles[0].knockback, 1);
Engine.advanceTicks(potatoRun, 10);
assert.equal(potatoRun.enemies[0].health, 2, "the Potato Gun deals its heavy hit on impact");
assert.ok(potatoRun.enemies[0].knockbackTicks > 0, "a surviving target is visibly knocked back");

// Potato Packing adds one short, strongest-only slow status without changing the basic Potato Gun contract.
const slowRun = Engine.createRun("TEST-POTATO-SLOW");
constructShelter(slowRun);
slowRun.levelIndex = 3;
slowRun.unlocks.push("potatoPatch", "potatoGun");
slowRun.xp = 10;
slowRun.skillPoints = 1;
slowRun.skillPointsEarned = 1;
action(slowRun, { type: "research", nodeId: "potatoPacking" });
slowRun.resources.wood = 1;
slowRun.actionPoints = 2;
action(slowRun, { type: "build", buildingType: "potatoPatch", ...centralBuildSite });
const slowPatch = slowRun.buildings.find((building) => building.type === "potatoPatch");
slowPatch.growthNights = 2;
slowRun.resources.wood = 3;
slowRun.actionPoints = 1;
action(slowRun, { type: "upgradePotatoPatch", id: slowPatch.id });
slowRun.phase = "night";
slowRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
slowRun.enemies = [{ id: "e-slow", type: "raccoon", ...centralEnemySite, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(slowRun);
Engine.advanceTicks(slowRun, 16);
assert.equal(slowRun.enemies[0].statuses.movementSlow.sources.potatoPacking.movementMultiplier, 0.55, "Potato Packing applies its brief movement slow");

// Arrowcraft uses Skill Points only; launcher upgrades use one day action.
const upgradeRun = Engine.createRun("TEST-ARROWCRAFT");
constructShelter(upgradeRun);
upgradeRun.levelIndex = 2;
upgradeRun.unlocks.push("stickLauncher");
upgradeRun.xp = 640;
upgradeRun.skillPoints = 7;
upgradeRun.skillPointsEarned = 7;
action(upgradeRun, { type: "research", nodeId: "hardwoodThrows" });
action(upgradeRun, { type: "research", nodeId: "launcherRange" });
assert.equal(Engine.techAvailability(upgradeRun, "arrowcraft").available, true, "Arrowcraft appears after its Hunting dependencies");
const researchActions = upgradeRun.actionPoints;
action(upgradeRun, { type: "research", nodeId: "arrowcraft" });
assert.equal(upgradeRun.xp, 640);
assert.equal(upgradeRun.skillPoints, 0);
assert.ok(upgradeRun.research.includes("arrowcraft"));
assert.equal(upgradeRun.actionPoints, researchActions, "research costs Skill Points but no day action");
upgradeRun.resources.wood = 2;
upgradeRun.actionPoints = 2;
action(upgradeRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
upgradeRun.resources.wood = 4;
const upgradeTarget = upgradeRun.buildings.find((building) => building.type === "stickLauncher");
upgradeTarget.health = 2;
action(upgradeRun, { type: "upgradeLauncher", id: upgradeTarget.id });
assert.equal(upgradeTarget.type, "arrowShooter");
assert.equal(upgradeTarget.health, upgradeTarget.maxHealth, "a paid Arrow Shooter refit restores the structure to full health");
assert.equal(upgradeRun.resources.wood, 0);
assert.equal(upgradeRun.actionPoints, 0);
assert.deepEqual(
  [Engine.BUILDINGS.arrowShooter.damage, Engine.BUILDINGS.arrowShooter.attackSpeed, Engine.BUILDINGS.arrowShooter.attackRange],
  [1.5, 0.75, 3.375],
);

// Later research remains declarative: Scout can watch farther, Arrow Shooters can receive a faster refit, and buildings recover at dawn.
const progressionRun = Engine.createRun("TEST-PROGRESSION");
constructShelter(progressionRun);
progressionRun.levelIndex = 3;
progressionRun.xp = 80;
progressionRun.skillPoints = 4;
progressionRun.skillPointsEarned = 4;
action(progressionRun, { type: "research", nodeId: "scoutTraining1" });
action(progressionRun, { type: "research", nodeId: "trailSense" });
action(progressionRun, { type: "research", nodeId: "hearthkeeping1" });
assert.equal(Engine.unitStats(progressionRun, "scout").attackRange, Engine.UNITS.scout.attackRange + 0.5, "Trail Sense raises only Scout watch range");
progressionRun.buildings[0].health = 6;
progressionRun.phase = "aftermath";
progressionRun.aftermathTicks = 39;
progressionRun.scout.x = progressionRun.scout.postX;
progressionRun.scout.y = progressionRun.scout.postY;
Engine.advanceTick(progressionRun);
assert.equal(progressionRun.buildings[0].health, 7, "Hearthkeeping restores one standing structure HP at dawn");

const quickcordRun = Engine.createRun("TEST-QUICKCORD");
constructShelter(quickcordRun);
quickcordRun.levelIndex = 3;
quickcordRun.unlocks.push("stickLauncher");
quickcordRun.xp = 163840;
quickcordRun.skillPoints = 15;
quickcordRun.skillPointsEarned = 15;
action(quickcordRun, { type: "research", nodeId: "hardwoodThrows" });
action(quickcordRun, { type: "research", nodeId: "launcherRange" });
action(quickcordRun, { type: "research", nodeId: "arrowcraft" });
action(quickcordRun, { type: "research", nodeId: "quickcord" });
quickcordRun.resources.wood = 6;
quickcordRun.actionPoints = 2;
action(quickcordRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
const quickcordTarget = quickcordRun.buildings.find((building) => building.type === "stickLauncher");
action(quickcordRun, { type: "upgradeLauncher", id: quickcordTarget.id });
quickcordRun.resources.wood = 2;
quickcordRun.actionPoints = 1;
quickcordTarget.health = 1;
action(quickcordRun, { type: "refitBuilding", id: quickcordTarget.id, refitId: "quickcord" });
assert.equal(quickcordTarget.health, quickcordTarget.maxHealth, "Quickcord is also a full-health refit");
assert.equal(Engine.buildingCombatStats(quickcordRun, "arrowShooter", quickcordTarget).attackSpeed, 0.9375, "Quickcord improves only the fitted Arrow Shooter's tempo");
const quickcordRestored = Engine.hydrate(Engine.serialize(quickcordRun));
assert.equal(Engine.checksum(quickcordRestored), Engine.checksum(quickcordRun), "refits survive save/load and remain part of the deterministic state");

// Scout is still the mobile final line and no Scout health economy is required.
const guardianRun = Engine.createRun("TEST-GUARDIAN");
constructShelter(guardianRun);
guardianRun.phase = "night";
guardianRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
guardianRun.enemies = [{ id: "e-guardian", type: "raccoon", x: guardianRun.scout.postX + 2.3, y: guardianRun.scout.postY, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(guardianRun);
assert.equal(guardianRun.scout.mode, "chasing");
assert.ok(guardianRun.scout.x > guardianRun.scout.postX);

// Defeats leave a short renderer-only marker instead of vanishing with no feedback.
const remainsRun = Engine.createRun("TEST-REMAINS");
constructShelter(remainsRun);
remainsRun.unlocks.push("stickLauncher");
remainsRun.resources.wood = 2;
remainsRun.actionPoints = 2;
action(remainsRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
remainsRun.phase = "night";
remainsRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
remainsRun.enemies = [{ id: "e-remains", type: "raccoon", ...centralEnemySite, health: 1, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(remainsRun);
Engine.advanceTicks(remainsRun, 12);
assert.equal(remainsRun.enemies.length, 0);
assert.equal(remainsRun.remains.length, 1, "a defeated enemy leaves a short-lived remains marker");

// Seeded pacing remains deterministic, including wave entries and timings.
const encounterOne = Engine.createRun("SAME-SEED");
const encounterTwo = Engine.createRun("SAME-SEED");
constructShelter(encounterOne);
constructShelter(encounterTwo);
action(encounterOne, { type: "endDay" });
action(encounterTwo, { type: "endDay" });
assert.deepEqual(encounterOne.encounter, encounterTwo.encounter);
assert.ok(encounterOne.encounter.waves[0].spawnTick >= 18);
const multiWaveRun = Engine.createRun("MULTI-ANGLE");
constructShelter(multiWaveRun);
multiWaveRun.levelIndex = 6;
action(multiWaveRun, { type: "endDay" });
const earlyEdges = multiWaveRun.encounter.waves.slice(0, 4).map((wave) => wave.entry.edge);
assert.equal(new Set(earlyEdges).size, earlyEdges.length, "early waves rotate through different forest edges");
assert.ok(multiWaveRun.encounter.waves.every((wave) => wave.entries.length === wave.units.length && wave.staggerTicks.length === wave.units.length));

// New enemy families get an authored showcase before seeded mixes use them.
const boarIntroRun = Engine.createRun("FIRST-BOAR");
constructShelter(boarIntroRun);
boarIntroRun.levelIndex = 4;
action(boarIntroRun, { type: "endDay" });
assert.deepEqual(boarIntroRun.encounter.units, ["boar"], "Level 5 guarantees a single Boar introduction");
const boarMixRun = Engine.createRun("BOAR-MIX");
constructShelter(boarMixRun);
boarMixRun.levelIndex = 5;
action(boarMixRun, { type: "endDay" });
assert.ok(boarMixRun.encounter.units.includes("boar"), "Level 6 retains a minimum Boar before mixed allocations");

// Replay includes research and automatic between-level continuation, with no manual Continue action.
const replaySource = Engine.createRun("REPLAY-SEED");
constructShelter(replaySource);
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
action(replaySource, { type: "clear", x: 1, y: 3 });
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
action(replaySource, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
action(replaySource, { type: "endDay" });
settleToNextDay(replaySource);
assert.equal(replaySource.skillPoints, 1, "the Level 3 watch carries total XP past the first 10-XP Skill Point milestone");
action(replaySource, { type: "research", nodeId: "scoutTraining1" });
const replayReport = Engine.replayReport(replaySource.seed, replaySource.actionLog);
assert.equal(Engine.checksum(replayReport.state), Engine.checksum(replaySource));
assert.equal(replayReport.checkpoints.length, 3, "replay exposes one checkpoint for each resolved night");
assert.deepEqual(replayReport.checkpoints, Engine.replayReport(replaySource.seed, replaySource.actionLog).checkpoints, "replay checkpoints are deterministic");

const restored = Engine.hydrate(Engine.serialize(replaySource));
assert.equal(Engine.checksum(restored), Engine.checksum(replaySource));
assert.throws(() => Engine.hydrate({ version: 3, state: {} }), /different version/);
assert.throws(() => Engine.hydrate({ version: 6, state: {} }), /different version/);
assert.throws(() => Engine.hydrate({ version: 7, state: {} }), /different version/);

console.log("Wild Hearth engine checks passed.");
