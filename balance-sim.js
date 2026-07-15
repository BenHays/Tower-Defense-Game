/*
 * Deterministic balance probe. Named plans make transparent daylight choices,
 * then the shared engine plays each night. It is a regression probe, not AI.
 *
 * Run one seed: node balance-sim.js HEARTH-1042 8
 * Run the maintained Medium matrix: node balance-sim.js --matrix
 */
const Engine = require("./engine.js");
const assert = require("node:assert/strict");

const args = process.argv.slice(2);
const matrixMode = args.includes("--matrix");
const numericArgument = args.find((value) => /^\d+$/.test(value));
const seedArgument = args.find((value) => value !== "--matrix" && !/^\d+$/.test(value));
const seed = seedArgument || Engine.DEFAULT_SEED;
const maxLevel = Number(numericArgument || 9);
const BALANCE_SEEDS = [
  "HEARTH-1042", "HEARTH-2048", "HEARTH-3091", "HEARTH-4815", "HEARTH-7719", "HEARTH-8254",
  "HEARTH-9137", "HEARTH-1182", "HEARTH-2746", "HEARTH-6630", "HEARTH-UQ8AF8", "HEARTH-17G794",
  "HEARTH-0201", "HEARTH-0714", "HEARTH-1120", "HEARTH-1836", "HEARTH-2479", "HEARTH-3561",
  "HEARTH-4027", "HEARTH-5184", "HEARTH-6042", "HEARTH-7395", "HEARTH-8463", "HEARTH-9751",
];

function settleNight(state, label) {
  let guard = 18000;
  while (["night", "aftermath"].includes(state.phase) && guard > 0) {
    Engine.advanceTick(state);
    guard -= 1;
  }
  if (guard === 0) throw new Error(`${label} did not settle.`);
}

function firstTowerSite(state, type) {
  let best = null;
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) {
      if (!Engine.validFootprint(state, type, x, y)) continue;
      const distanceToHearth = Math.hypot(x - Engine.SHELTER_SITE.x, y - Engine.SHELTER_SITE.y);
      if (!best || distanceToHearth < best.distanceToHearth || (distanceToHearth === best.distanceToHearth && (y < best.y || (y === best.y && x < best.x)))) {
        best = { x, y, distanceToHearth };
      }
    }
  }
  return best && { x: best.x, y: best.y };
}

function firstTreeSite(state) {
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) {
      if (Engine.terrainAt(state, x, y) === "tree") return { x, y };
    }
  }
  return null;
}

function harvestFirstTree(state) {
  const tree = firstTreeSite(state);
  if (tree && state.actionPoints > 0) Engine.dispatch(state, { type: "clear", ...tree });
}

function buildFirstTower(state, type) {
  const site = firstTowerSite(state, type);
  if (site && state.actionPoints > 0 && state.resources.wood >= Engine.BUILDINGS[type].cost.wood) {
    Engine.dispatch(state, { type: "build", buildingType: type, ...site });
  }
}

function collectWoodSalvage(state) {
  state.woodPickups.slice().forEach((pickup) => Engine.dispatch(state, { type: "collectWoodPickup", id: pickup.id }));
}

const PLAN_DEFINITIONS = [
  {
    id: "oneLauncher",
    label: "one launcher",
    chooseDayAction(state) {
      if (state.levelIndex !== 1) return;
      if (state.resources.wood < 2) harvestFirstTree(state);
      buildFirstTower(state, "stickLauncher");
    },
  },
  {
    id: "spreadLaunchers",
    label: "spread launchers",
    chooseDayAction(state) {
      if (state.resources.wood < 2) harvestFirstTree(state);
      buildFirstTower(state, "stickLauncher");
    },
  },
  {
    id: "arrowcraftRush",
    label: "Arrowcraft rush",
    chooseDayAction(state) {
      if (Engine.techAvailability(state, "arrowcraft").available) Engine.dispatch(state, { type: "research", nodeId: "arrowcraft" });
      const firstLauncher = state.buildings.find((building) => building.type === "stickLauncher" && !building.destroyed);
      if (firstLauncher && Engine.hasResearch(state, "arrowcraft") && state.resources.wood >= 4) {
        Engine.dispatch(state, { type: "upgradeLauncher", id: firstLauncher.id });
        return;
      }
      if ((!firstLauncher || state.resources.wood < 4) && state.actionPoints > 0) harvestFirstTree(state);
      if (!firstLauncher) buildFirstTower(state, "stickLauncher");
    },
  },
  {
    id: "potatoCounter",
    label: "potato counter",
    chooseDayAction(state) {
      const level = state.levelIndex + 1;
      const patch = state.buildings.find((building) => building.type === "potatoPatch" && !building.destroyed);
      const launcherCount = state.buildings.filter((building) => building.type === "stickLauncher" && !building.destroyed).length;
      if (level === 2) {
        if (state.resources.wood < 2) harvestFirstTree(state);
        if (launcherCount === 0) buildFirstTower(state, "stickLauncher");
        return;
      }
      if (level === 3) {
        if (!patch && state.resources.wood < 1) harvestFirstTree(state);
        if (!patch) buildFirstTower(state, "potatoPatch");
        if (state.actionPoints > 0 && state.resources.wood < 2) harvestFirstTree(state);
        return;
      }
      if (level === 4) {
        if (state.resources.wood < 2) harvestFirstTree(state);
        if (launcherCount < 2) buildFirstTower(state, "stickLauncher");
        if (state.actionPoints > 0 && state.resources.wood < 2) harvestFirstTree(state);
        return;
      }
      if (patch && Engine.canUpgradePotatoPatch(state, patch)) {
        if (state.resources.wood < 3) harvestFirstTree(state);
        if (state.resources.wood >= 3 && state.actionPoints > 0) Engine.dispatch(state, { type: "upgradePotatoPatch", id: patch.id });
      }
    },
  },
];

function runPlan(definition, runSeed, runMaxLevel) {
  const state = Engine.createRun(runSeed);
  while (state.phase === "day" && state.levelIndex + 1 <= runMaxLevel) {
    if (!Engine.hasShelter(state)) {
      if (!state.hatchetCrafted) {
        Engine.OPENING_PICKUPS.forEach((pickup) => Engine.dispatch(state, { type: "collectOpeningPickup", id: pickup.id }));
        Engine.dispatch(state, { type: "craftHatchet" });
      }
      Engine.dispatch(state, { type: "constructShelter", ...Engine.SHELTER_SITE });
    } else {
      collectWoodSalvage(state);
      definition.chooseDayAction(state);
    }
    if (state.phase === "day") Engine.dispatch(state, { type: "endDay" });
    settleNight(state, `${definition.label} (${runSeed})`);
  }
  const replay = Engine.replayReport(runSeed, state.actionLog);
  if (Engine.checksum(replay.state) !== Engine.checksum(state)) throw new Error(`${definition.label} (${runSeed}) failed deterministic replay validation.`);
  const reports = state.telemetry.nightReports;
  const latest = reports[reports.length - 1];
  return {
    plan: definition.label,
    seed: runSeed,
    clearedLevel: state.levelIndex,
    reachedLevel: state.levelIndex + 1,
    phase: state.phase,
    kills: state.kills,
    xp: state.xp,
    wood: state.resources.wood,
    researched: state.research.join(", ") || "none",
    towers: state.buildings.filter((building) => Engine.TOWER_TYPES.includes(building.type) && !building.destroyed).map((building) => building.type).join(", ") || "none",
    buildingDamage: reports.reduce((total, report) => total + (report.buildingDamage || 0), 0),
    buildingsLost: reports.reduce((total, report) => total + (report.buildingsLost || 0), 0),
    peakEnemies: reports.reduce((peak, report) => Math.max(peak, report.peakEnemies || 0), 0),
    lastNight: latest ? `${latest.number}:${latest.result}` : "none",
  };
}

function runAll(runSeed, runMaxLevel) {
  return PLAN_DEFINITIONS.map((definition) => runPlan(definition, runSeed, runMaxLevel));
}

function clearsThrough(result, level) {
  return result.phase === "day" && result.clearedLevel >= level;
}

function average(rows, field) {
  return rows.reduce((total, row) => total + row[field], 0) / rows.length;
}

if (!matrixMode) {
  console.table(runAll(seed, maxLevel));
  console.log(`Seed probe settled. Run \`node balance-sim.js --matrix\` for the 24-seed Medium regression gate.`);
} else {
  const byPlan = Object.fromEntries(PLAN_DEFINITIONS.map((definition) => [definition.id, []]));
  BALANCE_SEEDS.forEach((runSeed) => {
    const results = runAll(runSeed, 8);
    results.forEach((result, index) => byPlan[PLAN_DEFINITIONS[index].id].push(result));
  });
  const potatoShowcase = BALANCE_SEEDS.map((runSeed) => runPlan(PLAN_DEFINITIONS[3], runSeed, 5));
  const matrix = PLAN_DEFINITIONS.map((definition) => {
    const rows = byPlan[definition.id];
    const levelFiveRows = definition.id === "potatoCounter" ? potatoShowcase : rows;
    return {
      plan: definition.label,
      "L5 cleared": `${levelFiveRows.filter((result) => clearsThrough(result, 5)).length}/${BALANCE_SEEDS.length}`,
      "L8 cleared": `${rows.filter((result) => clearsThrough(result, 8)).length}/${BALANCE_SEEDS.length}`,
      "avg structure dmg": average(rows, "buildingDamage").toFixed(1),
      "avg buildings lost": average(rows, "buildingsLost").toFixed(1),
      "avg peak enemies": average(rows, "peakEnemies").toFixed(1),
    };
  });
  const oneLauncherRows = byPlan.oneLauncher;
  const spreadRows = byPlan.spreadLaunchers;
  assert.equal(potatoShowcase.filter((result) => clearsThrough(result, 5)).length, BALANCE_SEEDS.length, "the planned Potato counter must clear its guaranteed Level 5 Boar showcase in every maintained seed");
  assert.ok(oneLauncherRows.filter((result) => clearsThrough(result, 5)).length <= 6, "one basic launcher should not be a reliable answer to the Level 5 Boar");
  assert.ok(spreadRows.filter((result) => clearsThrough(result, 8)).length <= 12, "basic launcher spam should not clear Level 8 in more than half of the maintained seeds");
  console.table(matrix);
  console.log("24-seed Medium balance targets passed.");
}
