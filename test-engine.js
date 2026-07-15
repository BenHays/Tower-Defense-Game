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
assert.deepEqual(Object.keys(Engine.ENEMIES), ["mouse", "raccoon", "boar", "bear", "vulture"], "the complete enemy roster lives in the single engine catalog");
assert.equal(run.shelterBuilt, false);
assert.equal(run.hatchetCrafted, false);
assert.equal(Engine.hasShelter(run), false);
assert.equal(run.scout.deployed, false, "Scout begins off-map until the shelter is placed");
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
assert.equal(Engine.toolPreview(run, "teepee", Engine.SHELTER_SITE.x, Engine.SHELTER_SITE.y).valid, true, "a valid opening shelter site previews as ready rather than locked");
assert.equal(Engine.toolPreview(run, "teepee", 1, 3).valid, false, "a tree remains an invalid opening shelter site");
assert.equal(Engine.dispatch(run, { type: "constructShelter", x: 1, y: 3 }).ok, false, "the shelter cannot be placed on a tree");
action(run, { type: "constructShelter", ...Engine.SHELTER_SITE });
assert.equal(run.hatchetCrafted, true, "the opening records the crafted starter hatchet");
assert.equal(run.shelterBuilt, true);
assert.equal(Engine.hasShelter(run), true);
assert.equal(run.buildings[0].type, "teepee");
assert.deepEqual([run.buildings[0].x, run.buildings[0].y], [Engine.SHELTER_SITE.x, Engine.SHELTER_SITE.y], "the player may choose the centered grass cell for the shelter");
assert.equal(run.scout.deployed, true, "placing the shelter deploys Scout");
assert.equal(Math.max(Math.abs(run.scout.x - run.buildings[0].x), Math.abs(run.scout.y - run.buildings[0].y)), 1, "Scout's first watch post is beside the chosen shelter");
assert.equal(run.resources.wood, 0, "the shelter is the only free build");
assert.equal(run.actionPoints, 0, "crafting the hatchet and shelter each use one opening action");
const playerPlacedShelterRun = Engine.createRun("PLAYER-PLACED-SHELTER");
Engine.OPENING_PICKUPS.forEach((pickup) => action(playerPlacedShelterRun, { type: "collectOpeningPickup", id: pickup.id }));
action(playerPlacedShelterRun, { type: "craftHatchet" });
const playerShelterSite = { x: Engine.SHELTER_SITE.x - 2, y: Engine.SHELTER_SITE.y - 1 };
action(playerPlacedShelterRun, { type: "constructShelter", ...playerShelterSite });
assert.deepEqual([playerPlacedShelterRun.buildings[0].x, playerPlacedShelterRun.buildings[0].y], [playerShelterSite.x, playerShelterSite.y], "the player can place the shelter on any valid grass in the opening");
assert.equal(Math.max(Math.abs(playerPlacedShelterRun.scout.x - playerShelterSite.x), Math.abs(playerPlacedShelterRun.scout.y - playerShelterSite.y)), 1, "Scout follows the player-selected shelter rather than using a fixed map post");
action(run, { type: "endDay" });
assert.equal(run.encounter.threatBudget, 1);
assert.deepEqual(run.encounter.units, ["mouse"]);
settleToNextDay(run);
assert.equal(run.levelIndex, 1);
assert.equal(run.xp, 3, "the first kill and cleared night award only XP");
assert.equal(run.skillPoints, 0, "Skill Points begin after the first 10 XP milestone");
assert.equal(run.skillPointsEarned, 0);
assert.ok(run.resources.hides >= 0 && run.resources.hides <= 1, "a mouse rolls a small hide drop");
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

// Playback speed is a run preference: every UI speed is accepted and 5× persists into the next watch and dawn.
action(run, { type: "speed", speed: 2 });
assert.equal(run.speed, 2);
action(run, { type: "speed", speed: 5 });
assert.equal(run.speed, 5);
assert.equal(Engine.dispatch(run, { type: "speed", speed: 3 }).ok, false, "only listed playback speeds are valid");

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
assert.equal(migratedV13.version, 17, "v13 saves migrate into the current roster version");
assert.deepEqual(migratedV13.research, ["woodlandYield"], "a migrated v13 save keeps its learned talents");
const v16RubbleSave = JSON.parse(Engine.serialize(run));
v16RubbleSave.version = 16;
v16RubbleSave.state.version = 16;
delete v16RubbleSave.state.woodPickups;
v16RubbleSave.state.rubble = [{ x: centralBuildSite.x, y: centralBuildSite.y, health: 1 }];
v16RubbleSave.state.actionLog.push({ type: "clear", x: centralBuildSite.x, y: centralBuildSite.y });
const migratedV16 = Engine.hydrate(v16RubbleSave);
assert.deepEqual(migratedV16.woodPickups, [], "legacy rubble does not turn into a retroactive wood reward");
assert.equal("rubble" in migratedV16, false, "legacy rubble is removed when a v16 save loads");
assert.equal(migratedV16.actionLog.some((action) => action.type === "clear" && action.x === centralBuildSite.x && action.y === centralBuildSite.y), false, "legacy rubble-clear actions are removed so replay remains valid without rubble");
assert.doesNotThrow(() => Engine.replay(run.seed, migratedV16.actionLog), "a migrated v16 action log still replays after obsolete rubble clears are removed");
assert.equal(run.resources.wood, 0, "building still spends the whole first wood bundle");
assert.equal(run.actionPoints, 0);
assert.equal(Engine.BUILDINGS.stickLauncher.attackRange, 1.75, "the basic launcher starts with a deliberately short range");
assert.equal(Engine.dispatch(run, { type: "finish", id: "not-a-step" }).ok, false, "Finish is not part of the MVP loop");
action(run, { type: "endDay" });
settleToNextDay(run);
assert.equal(run.speed, 5, "chosen 5× speed survives the completed turn");
assert.equal(Engine.hydrate(Engine.serialize(run)).speed, 5, "chosen 5× speed survives save/load");
assert.ok(run.unlocks.includes("potatoPatch"), "holding Level 2 unlocks the Potato Patch for Level 3 planning");
assert.equal(run.unlocks.includes("potatoGun"), false, "the heavy launcher stays locked until the growing path is complete");
assert.equal(Engine.BUILDINGS.potatoGun.damage, 4);
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
assert.equal(Engine.techAvailability(branchCostRun, "arrowcraft").costSkillPoints, 1, "the first Hunting purchase costs 1 Skill Point");
assert.equal(Engine.techAvailability(branchCostRun, "scoutTraining1").costSkillPoints, 1, "a different branch still starts at 1 Skill Point");
action(branchCostRun, { type: "research", nodeId: "arrowcraft" });
assert.equal(Engine.techAvailability(branchCostRun, "hardwoodThrows").costSkillPoints, 2, "the second Hunting purchase costs 2 Skill Points");
assert.equal(Engine.techAvailability(branchCostRun, "launcherRange").costSkillPoints, 2, "parallel Hunting nodes share the second purchase cost");
assert.equal(Engine.techAvailability(branchCostRun, "potatoPacking").costSkillPoints, 2, "side nodes share their branch's escalating cost");
action(branchCostRun, { type: "research", nodeId: "hardwoodThrows" });
assert.equal(Engine.techAvailability(branchCostRun, "launcherRange").costSkillPoints, 4, "the third Hunting purchase costs 4 Skill Points");
action(branchCostRun, { type: "research", nodeId: "launcherRange" });
assert.equal(Engine.techAvailability(branchCostRun, "quickcord").costSkillPoints, 8, "the fourth Hunting purchase costs 8 Skill Points");

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
assert.equal(buildingRun.buildings[0].maxHealth, 14, "Reinforced Materials adds maximum health to standing structures");
assert.equal(buildingRun.buildings[0].health, 14, "new frame protection is granted immediately instead of creating a damaged upgrade");
assert.equal(Engine.hasBuildingUnlock(buildingRun, "fence"), true, "the combined Building talent unlocks Fence construction");
assert.ok(Engine.unlockedBuildTypes(buildingRun).includes("fence"), "research-only structures enter the generic Build roster");
action(buildingRun, { type: "research", nodeId: "barkArmor" });
assert.equal(buildingRun.skillPoints, 0, "one Nurturing and two Building purchases consume 1 + 1 + 2 Skill Points");

// Researchable structures are generic talent effects: Garden trades 2 wood and one action today for one protected bonus action at dawn.
const gardenRun = Engine.createRun("TEST-GARDEN");
constructShelter(gardenRun);
gardenRun.levelIndex = 2;
gardenRun.xp = 10;
gardenRun.skillPoints = 1;
gardenRun.skillPointsEarned = 1;
assert.equal(Engine.dispatch(gardenRun, { type: "build", buildingType: "garden", ...centralBuildSite }).ok, false, "Garden construction is unavailable before its talent is learned");
const gardenResearchActions = gardenRun.actionPoints;
action(gardenRun, { type: "research", nodeId: "gardenStewardship" });
assert.equal(gardenRun.actionPoints, gardenResearchActions, "Garden research spends Skill Points but no day action");
assert.equal(Engine.hasBuildingUnlock(gardenRun, "garden"), true, "Garden Stewardship exposes the Garden through the shared research unlock path");
assert.ok(Engine.unlockedBuildTypes(gardenRun).includes("garden"), "a researched Garden appears alongside level-unlocked structures");
gardenRun.resources.wood = 2;
gardenRun.actionPoints = 1;
action(gardenRun, { type: "build", buildingType: "garden", ...centralBuildSite });
const garden = gardenRun.buildings.find((building) => building.type === "garden");
assert.ok(garden, "a researched Garden occupies its grass cell");
assert.equal(Engine.isTargetableBuilding(garden), true, "a Garden can be threatened and must survive to pay off");
assert.equal(Engine.isPassable(gardenRun, garden.x, garden.y), true, "a Garden does not become a path blocker");
gardenRun.phase = "aftermath";
gardenRun.aftermathTicks = 39;
gardenRun.scout.x = gardenRun.scout.postX;
gardenRun.scout.y = gardenRun.scout.postY;
Engine.advanceTick(gardenRun);
assert.equal(gardenRun.actionPoints, 3, "one living Garden adds one day action at dawn");
gardenRun.resources.wood = 2;
gardenRun.actionPoints = 1;
action(gardenRun, { type: "build", buildingType: "garden", x: Engine.SHELTER_SITE.x - 2, y: Engine.SHELTER_SITE.y });
gardenRun.phase = "aftermath";
gardenRun.aftermathTicks = 39;
gardenRun.scout.x = gardenRun.scout.postX;
gardenRun.scout.y = gardenRun.scout.postY;
Engine.advanceTick(gardenRun);
assert.equal(gardenRun.actionPoints, 3, "the first Garden implementation caps the bonus at one action even if multiple Gardens live");
garden.destroyed = true;
gardenRun.buildings.find((building) => building.type === "garden" && building.id !== garden.id).destroyed = true;
gardenRun.phase = "aftermath";
gardenRun.aftermathTicks = 39;
gardenRun.scout.x = gardenRun.scout.postX;
gardenRun.scout.y = gardenRun.scout.postY;
Engine.advanceTick(gardenRun);
assert.equal(gardenRun.actionPoints, 2, "destroyed Gardens stop granting their dawn action");

const fenceUnlockRun = Engine.createRun("TEST-FENCE-UNLOCK");
constructShelter(fenceUnlockRun);
fenceUnlockRun.levelIndex = 3;
fenceUnlockRun.xp = 10;
fenceUnlockRun.skillPoints = 1;
fenceUnlockRun.skillPointsEarned = 1;
assert.equal(Engine.dispatch(fenceUnlockRun, { type: "build", buildingType: "fence", ...centralBuildSite }).ok, false, "Fence construction is unavailable before Reinforced Materials");
action(fenceUnlockRun, { type: "research", nodeId: "reinforcedFrames" });
assert.equal(fenceUnlockRun.buildings[0].maxHealth, 14, "Reinforced Materials includes the teepee and every future structure in its health bonus");
fenceUnlockRun.resources.wood = 1;
fenceUnlockRun.actionPoints = 1;
action(fenceUnlockRun, { type: "build", buildingType: "fence", ...centralBuildSite });
const unlockedFence = fenceUnlockRun.buildings.find((building) => building.type === "fence");
assert.equal(unlockedFence.maxHealth, 5, "the newly unlocked Fence also receives Reinforced Materials health");
assert.equal(Engine.isTargetableBuilding(unlockedFence), false, "a Fence is not a normal closest-building target");
assert.equal(Engine.isBreachableBlocker(unlockedFence), true, "a Fence is a dedicated breakable path blocker");

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
towerRun.enemies = [{ id: "e-launcher", type: "raccoon", x: 1, y: 1.5, health: 5, maxHealth: 5, cooldown: 4, approachDelay: 0 }];
Engine.advanceTick(towerRun);
assert.equal(towerRun.projectiles.length, 1, "tower should launch a projectile before damage applies");
assert.equal(towerRun.enemies[0].health, 5);
Engine.advanceTicks(towerRun, 8);
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
assert.equal(potatoRun.enemies[0].health, 1, "the Potato Gun deals its heavy hit on impact");
assert.ok(potatoRun.enemies[0].knockbackTicks > 0, "a surviving target is visibly knocked back");

// Boars ignore the basic Stick Launcher, while Bear control is visibly weaker than normal potato pushback.
const immunityRun = Engine.createRun("TEST-BOAR-IMMUNITY");
constructShelter(immunityRun);
immunityRun.unlocks.push("stickLauncher");
immunityRun.resources.wood = 2;
immunityRun.actionPoints = 2;
action(immunityRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
immunityRun.phase = "night";
immunityRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
immunityRun.scout.x = immunityRun.scout.postX = 0;
immunityRun.scout.y = immunityRun.scout.postY = 0;
immunityRun.enemies = [{ id: "e-boar-immune", type: "boar", ...centralEnemySite, health: 15, maxHealth: 15, cooldown: 4, approachDelay: 0, statuses: {} }];
Engine.advanceTick(immunityRun);
Engine.advanceTicks(immunityRun, 10);
assert.equal(immunityRun.enemies[0].health, 15, "a Boar takes zero damage from Stick Launcher projectiles");
assert.equal(Engine.ENEMIES.boar.projectileDamageMultipliers.arrow, 0, "the same Boar armor also rejects Arrow Shooter projectiles");

const bearPushRun = Engine.createRun("TEST-BEAR-PUSH");
constructShelter(bearPushRun);
bearPushRun.unlocks.push("potatoPatch", "potatoGun");
bearPushRun.resources.wood = 1;
bearPushRun.actionPoints = 2;
action(bearPushRun, { type: "build", buildingType: "potatoPatch", ...centralBuildSite });
const bearPatch = bearPushRun.buildings.find((building) => building.type === "potatoPatch");
bearPatch.growthNights = 2;
bearPushRun.resources.wood = 3;
bearPushRun.actionPoints = 1;
action(bearPushRun, { type: "upgradePotatoPatch", id: bearPatch.id });
bearPushRun.phase = "night";
bearPushRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
bearPushRun.enemies = [{ id: "e-bear-push", type: "bear", ...centralEnemySite, health: 30, maxHealth: 30, cooldown: 4, approachDelay: 0, statuses: {} }];
const bearStartY = bearPushRun.enemies[0].y;
Engine.advanceTick(bearPushRun);
Engine.advanceTicks(bearPushRun, 12);
assert.ok(bearPushRun.enemies[0].y > bearStartY - 0.4, "a Bear only yields a small fraction of the Potato Gun knockback");

// Campfire damage is broadly reusable Burn status damage, with Bears taking double over time.
const campfireRun = Engine.createRun("TEST-CAMPFIRE-BURN");
constructShelter(campfireRun);
campfireRun.unlocks.push("campfire");
campfireRun.resources.wood = 4;
campfireRun.actionPoints = 2;
action(campfireRun, { type: "build", buildingType: "campfire", ...centralBuildSite });
campfireRun.phase = "night";
campfireRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
campfireRun.scout.x = campfireRun.scout.postX = 0;
campfireRun.scout.y = campfireRun.scout.postY = 0;
campfireRun.enemies = [{ id: "e-bear-burn", type: "bear", x: centralBuildSite.x, y: centralBuildSite.y - 1.1, health: 30, maxHealth: 30, cooldown: 4, approachDelay: 0, statuses: {} }];
Engine.advanceTick(campfireRun);
Engine.advanceTicks(campfireRun, 24);
assert.ok(campfireRun.enemies[0].statuses.burn.sources.campfireBurn, "Campfire hits apply a refreshable Burn status");
assert.equal(campfireRun.enemies[0].health, 27, "a Bear takes one fireball damage plus double first Burn damage");

// Air is a declarative target layer: Scarecrows only fire upward while Arrow
// Shooters remain flexible and ground-only weapons never acquire Vultures.
const scarecrowRun = Engine.createRun("TEST-SCARECROW-AIR");
constructShelter(scarecrowRun);
scarecrowRun.unlocks.push("scarecrow");
scarecrowRun.resources.wood = 3;
scarecrowRun.actionPoints = 2;
action(scarecrowRun, { type: "build", buildingType: "scarecrow", ...centralBuildSite });
scarecrowRun.phase = "night";
scarecrowRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
scarecrowRun.scout.x = scarecrowRun.scout.postX = 0;
scarecrowRun.scout.y = scarecrowRun.scout.postY = 0;
scarecrowRun.enemies = [
  { id: "e-ground-near", type: "raccoon", x: centralBuildSite.x, y: centralBuildSite.y - 0.7, health: 8, maxHealth: 8, cooldown: 4, approachDelay: 0, statuses: {} },
  { id: "e-vulture-far", type: "vulture", x: centralBuildSite.x, y: centralBuildSite.y - 4.2, health: 18, maxHealth: 18, cooldown: 4, approachDelay: 0, statuses: {} },
];
Engine.advanceTick(scarecrowRun);
assert.equal(scarecrowRun.projectiles[0].type, "straw", "the Scarecrow fires its own visible straw projectile");
assert.equal(scarecrowRun.projectiles[0].targetId, "e-vulture-far", "the Scarecrow ignores the closer ground target and acquires air");
assert.equal(Engine.BUILDINGS.scarecrow.attackRange, 5.5, "the air-only counter starts with its intended very long range");

const stickAirRun = Engine.createRun("TEST-STICK-GROUND");
constructShelter(stickAirRun);
stickAirRun.unlocks.push("stickLauncher");
stickAirRun.resources.wood = 2;
stickAirRun.actionPoints = 2;
action(stickAirRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
stickAirRun.phase = "night";
stickAirRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
stickAirRun.enemies = [{ id: "e-vulture-stick", type: "vulture", x: centralBuildSite.x, y: centralBuildSite.y - 1, health: 18, maxHealth: 18, cooldown: 4, approachDelay: 0, statuses: {} }];
Engine.advanceTick(stickAirRun);
assert.equal(stickAirRun.projectiles.length, 0, "the basic Stick Launcher cannot target air");

const arrowAirRun = Engine.createRun("TEST-ARROW-AIR");
constructShelter(arrowAirRun);
arrowAirRun.buildings.push({ id: "arrow-air", type: "arrowShooter", x: centralBuildSite.x, y: centralBuildSite.y, health: 6, maxHealth: 6, cooldown: 0, firingTicks: 0, hitTicks: 0, refits: [], growthNights: null, destroyed: false });
arrowAirRun.phase = "night";
arrowAirRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
arrowAirRun.enemies = [{ id: "e-vulture-arrow", type: "vulture", x: centralBuildSite.x, y: centralBuildSite.y - 1, health: 18, maxHealth: 18, cooldown: 4, approachDelay: 0, statuses: {} }];
Engine.advanceTick(arrowAirRun);
assert.equal(arrowAirRun.projectiles[0].type, "arrow", "Arrow Shooters remain a flexible anti-air support tower");

const vultureFlightRun = Engine.createRun("TEST-VULTURE-FLIGHT");
constructShelter(vultureFlightRun);
vultureFlightRun.phase = "night";
vultureFlightRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
vultureFlightRun.enemies = [{ id: "e-flying", type: "vulture", x: 0, y: 0, health: 18, maxHealth: 18, cooldown: 4, approachDelay: 0, statuses: {} }];
const teepee = vultureFlightRun.buildings.find((building) => building.type === "teepee");
const vultureStartDistance = Math.hypot(teepee.x, teepee.y);
Engine.advanceTick(vultureFlightRun);
const flyingVulture = vultureFlightRun.enemies[0];
assert.equal(flyingVulture.targetId, teepee.id, "a Vulture chooses the closest targetable structure directly");
assert.ok(Math.hypot(flyingVulture.x - teepee.x, flyingVulture.y - teepee.y) < vultureStartDistance, "a Vulture advances directly over terrain without ground pathing");

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

// Arrowcraft is the first Hunting purchase so it is a real Level 3 choice; launcher upgrades still use one day action.
const upgradeRun = Engine.createRun("TEST-ARROWCRAFT");
constructShelter(upgradeRun);
upgradeRun.levelIndex = 2;
upgradeRun.unlocks.push("stickLauncher");
upgradeRun.xp = 10;
upgradeRun.skillPoints = 1;
upgradeRun.skillPointsEarned = 1;
assert.equal(Engine.techAvailability(upgradeRun, "arrowcraft").available, true, "Arrowcraft is available as the first Level 3 Hunting choice");
const researchActions = upgradeRun.actionPoints;
action(upgradeRun, { type: "research", nodeId: "arrowcraft" });
assert.equal(upgradeRun.xp, 10);
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
  [1.5, 0.75, 2.625],
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

// Fences shape ground routes first. They become attack targets only when they seal every approach to a live building.
const fenceDetourRun = Engine.createRun("TEST-FENCE-DETOUR");
constructShelter(fenceDetourRun);
fenceDetourRun.levelIndex = 3;
fenceDetourRun.xp = 10;
fenceDetourRun.skillPoints = 1;
fenceDetourRun.skillPointsEarned = 1;
action(fenceDetourRun, { type: "research", nodeId: "reinforcedFrames" });
fenceDetourRun.resources.wood = 1;
fenceDetourRun.actionPoints = 1;
action(fenceDetourRun, { type: "build", buildingType: "fence", x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y - 1 });
const detourFence = fenceDetourRun.buildings.find((building) => building.type === "fence");
fenceDetourRun.phase = "night";
fenceDetourRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
fenceDetourRun.scout.x = fenceDetourRun.scout.postX = 0;
fenceDetourRun.scout.y = fenceDetourRun.scout.postY = 0;
fenceDetourRun.enemies = [{ id: "e-fence-detour", type: "raccoon", x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y - 2, health: 8, maxHealth: 8, cooldown: 0, approachDelay: 0, statuses: {} }];
Engine.advanceTick(fenceDetourRun);
assert.equal(fenceDetourRun.enemies[0].targetId, fenceDetourRun.buildings.find((building) => building.type === "teepee").id, "a ground enemy routes around an individual Fence instead of attacking it");
assert.equal(detourFence.health, detourFence.maxHealth, "a usable detour keeps Fence health untouched");

const fenceRingRun = Engine.createRun("TEST-FENCE-BREACH");
constructShelter(fenceRingRun);
fenceRingRun.levelIndex = 3;
fenceRingRun.xp = 10;
fenceRingRun.skillPoints = 1;
fenceRingRun.skillPointsEarned = 1;
action(fenceRingRun, { type: "research", nodeId: "reinforcedFrames" });
fenceRingRun.resources.wood = 4;
fenceRingRun.actionPoints = 4;
[
  { x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y - 1 },
  { x: Engine.SHELTER_SITE.x + 1, y: Engine.SHELTER_SITE.y },
  { x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y + 1 },
  { x: Engine.SHELTER_SITE.x - 1, y: Engine.SHELTER_SITE.y },
].forEach((site) => action(fenceRingRun, { type: "build", buildingType: "fence", ...site }));
const breachProbe = { type: "boar", x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y - 2 };
assert.equal(Engine.closestReachableBuilding(fenceRingRun, breachProbe), null, "a complete Fence ring has no normal ground approach to the teepee");
const breach = Engine.closestReachableBreach(fenceRingRun, breachProbe);
assert.ok(breach && breach.building.type === "fence", "a sealed route resolves to one deterministic Fence breach target");
fenceRingRun.phase = "night";
fenceRingRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
fenceRingRun.scout.x = fenceRingRun.scout.postX = 0;
fenceRingRun.scout.y = fenceRingRun.scout.postY = 0;
fenceRingRun.enemies = [{ id: "e-fence-breach", type: "boar", x: breach.approach.x, y: breach.approach.y, health: 15, maxHealth: 15, cooldown: 0, approachDelay: 0, statuses: {} }];
Engine.advanceTick(fenceRingRun);
assert.equal(fenceRingRun.enemies[0].targetId, breach.building.id, "a sealed ground enemy targets the selected Fence segment");
breach.building.health = 1;
fenceRingRun.enemies[0].cooldown = 0;
Engine.advanceTick(fenceRingRun);
assert.equal(breach.building.destroyed, true, "the selected Fence segment is destroyed by the breach attack");
assert.equal(Engine.woodPickupAt(fenceRingRun, breach.building.x, breach.building.y), null, "a breached Fence does not refund wood");
assert.equal(Engine.isPassable(fenceRingRun, breach.building.x, breach.building.y), true, "the destroyed segment becomes a usable ground route immediately");
assert.ok(Engine.closestReachableBuilding(fenceRingRun, fenceRingRun.enemies[0])?.building.type === "teepee", "ground pathing recomputes through the new gap");

const fenceAirRun = Engine.createRun("TEST-FENCE-AIR");
constructShelter(fenceAirRun);
fenceAirRun.levelIndex = 3;
fenceAirRun.xp = 10;
fenceAirRun.skillPoints = 1;
fenceAirRun.skillPointsEarned = 1;
action(fenceAirRun, { type: "research", nodeId: "reinforcedFrames" });
fenceAirRun.resources.wood = 4;
fenceAirRun.actionPoints = 4;
[
  { x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y - 1 },
  { x: Engine.SHELTER_SITE.x + 1, y: Engine.SHELTER_SITE.y },
  { x: Engine.SHELTER_SITE.x, y: Engine.SHELTER_SITE.y + 1 },
  { x: Engine.SHELTER_SITE.x - 1, y: Engine.SHELTER_SITE.y },
].forEach((site) => action(fenceAirRun, { type: "build", buildingType: "fence", ...site }));
fenceAirRun.phase = "night";
fenceAirRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
fenceAirRun.enemies = [{ id: "e-fence-air", type: "vulture", x: 0, y: 0, health: 18, maxHealth: 18, cooldown: 0, approachDelay: 0, statuses: {} }];
Engine.advanceTick(fenceAirRun);
assert.equal(fenceAirRun.enemies[0].targetId, fenceAirRun.buildings.find((building) => building.type === "teepee").id, "air enemies ignore Fence routing and fly directly to targetable structures");

// Destroyed structures leave recoverable wood, never accidental path blockers. Fence is the deliberate no-refund exception.
const salvageRun = Engine.createRun("TEST-WOOD-SALVAGE");
constructShelter(salvageRun);
salvageRun.unlocks.push("stickLauncher");
salvageRun.resources.wood = 2;
salvageRun.actionPoints = 2;
action(salvageRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
const salvageTower = salvageRun.buildings.find((building) => building.type === "stickLauncher");
salvageTower.health = 1;
salvageRun.phase = "night";
salvageRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
salvageRun.scout.x = salvageRun.scout.postX = 0;
salvageRun.scout.y = salvageRun.scout.postY = 0;
salvageRun.enemies = [{ id: "e-salvage", type: "boar", x: centralBuildSite.x, y: centralBuildSite.y - 1, health: 15, maxHealth: 15, cooldown: 0, approachDelay: 0, statuses: {} }];
Engine.advanceTick(salvageRun);
assert.equal(salvageTower.destroyed, true, "an enemy killing a normal structure removes the structure");
const woodBundle = Engine.woodPickupAt(salvageRun, centralBuildSite.x, centralBuildSite.y);
assert.deepEqual({ x: woodBundle.x, y: woodBundle.y, amount: woodBundle.amount }, { x: centralBuildSite.x, y: centralBuildSite.y, amount: 1 }, "each destroyed non-Fence structure leaves one wood bundle");
const restoredSalvage = Engine.hydrate(Engine.serialize(salvageRun));
assert.deepEqual(restoredSalvage.woodPickups, salvageRun.woodPickups, "wood bundles survive save/load exactly");
assert.equal(Engine.checksum(restoredSalvage), Engine.checksum(salvageRun), "salvage state participates in deterministic checksums");
assert.equal(Engine.isPassable(salvageRun, centralBuildSite.x, centralBuildSite.y), true, "wood salvage never blocks the route");
assert.equal(Engine.validFootprint(salvageRun, "stickLauncher", centralBuildSite.x, centralBuildSite.y), true, "wood salvage never blocks construction");
const woodBeforeCollect = salvageRun.resources.wood;
const actionsBeforeCollect = salvageRun.actionPoints;
assert.equal(Engine.dispatch(salvageRun, { type: "collectWoodPickup", id: woodBundle.id }).ok, false, "wood cannot be collected during the night");
assert.equal(Engine.woodPickupAt(salvageRun, centralBuildSite.x, centralBuildSite.y)?.id, woodBundle.id, "a failed night collection leaves the wood bundle in place");
salvageRun.phase = "day";
action(salvageRun, { type: "collectWoodPickup", id: woodBundle.id });
assert.equal(salvageRun.resources.wood, woodBeforeCollect + 1, "clicking a wood bundle awards one wood");
assert.equal(salvageRun.actionPoints, actionsBeforeCollect, "collecting wood is free");
assert.equal(Engine.woodPickupAt(salvageRun, centralBuildSite.x, centralBuildSite.y), null, "collected wood disappears from the grass");

const autoSalvageRun = Engine.createRun("TEST-AUTO-SALVAGE");
constructShelter(autoSalvageRun);
autoSalvageRun.unlocks.push("stickLauncher");
autoSalvageRun.resources.wood = 1;
autoSalvageRun.actionPoints = 1;
autoSalvageRun.woodPickups.push({ id: "wood-auto", x: centralBuildSite.x, y: centralBuildSite.y, amount: 1 });
assert.equal(Engine.toolPreview(autoSalvageRun, "stickLauncher", centralBuildSite.x, centralBuildSite.y).valid, true, "a wood bundle under a build footprint counts toward affordability");
action(autoSalvageRun, { type: "build", buildingType: "stickLauncher", ...centralBuildSite });
assert.equal(autoSalvageRun.resources.wood, 0, "automatic salvage can fund the structure without losing the wood bundle");
assert.equal(Engine.woodPickupAt(autoSalvageRun, centralBuildSite.x, centralBuildSite.y), null, "building on salvage auto-collects it");

const teepeeLossRun = Engine.createRun("TEST-TEEPEE-NO-SALVAGE");
constructShelter(teepeeLossRun);
const teepeeTarget = teepeeLossRun.buildings.find((building) => building.type === "teepee");
teepeeTarget.health = 1;
teepeeLossRun.phase = "night";
teepeeLossRun.encounter = { waves: [{ spawned: true }], spawned: 1 };
teepeeLossRun.scout.x = teepeeLossRun.scout.postX = 0;
teepeeLossRun.scout.y = teepeeLossRun.scout.postY = 0;
teepeeLossRun.enemies = [{ id: "e-teepee-loss", type: "boar", x: teepeeTarget.x, y: teepeeTarget.y - 1, health: 15, maxHealth: 15, cooldown: 0, approachDelay: 0, statuses: {} }];
Engine.advanceTick(teepeeLossRun);
assert.equal(teepeeLossRun.phase, "lost", "teepee loss still ends the run immediately");
assert.equal(teepeeLossRun.woodPickups.length, 0, "teepee loss never leaves salvage");

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
assert.ok(multiWaveRun.encounter.waves.some((wave) => wave.units.length >= 2) && multiWaveRun.encounter.waves.every((wave) => wave.units.length <= 3), "Level 7 pressure keeps compact late groups without exceeding three enemies");
assert.ok(multiWaveRun.encounter.waves.slice(1).every((wave, index) => wave.spawnTick - multiWaveRun.encounter.waves[index].spawnTick <= 38), "Level 7 groups arrive on the tighter late-pressure cadence");

// New enemy families get an authored showcase before seeded mixes use them.
const boarIntroRun = Engine.createRun("FIRST-BOAR");
constructShelter(boarIntroRun);
boarIntroRun.levelIndex = 4;
action(boarIntroRun, { type: "endDay" });
assert.deepEqual(boarIntroRun.encounter.units, ["boar"], "Level 5 guarantees a single Boar introduction");
assert.deepEqual([Engine.ENEMIES.boar.health, Engine.ENEMIES.boar.moveSpeed], [15, 1.18], "the Boar is a durable, faster heavy target for the Potato Gun showcase");
const boarMixRun = Engine.createRun("BOAR-MIX");
constructShelter(boarMixRun);
boarMixRun.levelIndex = 5;
action(boarMixRun, { type: "endDay" });
assert.ok(boarMixRun.encounter.units.includes("boar"), "Level 6 retains a minimum Boar before mixed allocations");
const bearIntroRun = Engine.createRun("FIRST-BEAR");
constructShelter(bearIntroRun);
bearIntroRun.levelIndex = 7;
action(bearIntroRun, { type: "endDay" });
assert.ok(bearIntroRun.encounter.units.includes("bear"), "Level 8 guarantees the first Bear after Campfires are available");
const vultureIntroRun = Engine.createRun("FIRST-VULTURE");
constructShelter(vultureIntroRun);
vultureIntroRun.levelIndex = 10;
action(vultureIntroRun, { type: "endDay" });
assert.deepEqual(vultureIntroRun.encounter.units, ["vulture"], "Level 11 guarantees one Vulture showcase after the Scarecrow planning window");
const vultureMixRun = Engine.createRun("VULTURE-MIX");
constructShelter(vultureMixRun);
vultureMixRun.levelIndex = 11;
assert.ok(Engine.levelFor(vultureMixRun).enemyPool.includes("vulture"), "Level 12 folds Vultures into the seeded Threat Budget");

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
