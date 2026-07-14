/*
 * Small deterministic balance probe. It is intentionally not an AI: each
 * named plan makes a transparent daylight choice, then lets the shared engine
 * play the night. Run: node balance-sim.js [seed] [max-level]
 */
const Engine = require("./engine.js");

const seed = process.argv[2] || Engine.DEFAULT_SEED;
const maxLevel = Number(process.argv[3] || 9);
const sites = [{ x: 3, y: 4 }, { x: 4, y: 3 }, { x: 8, y: 3 }, { x: 9, y: 5 }, { x: 9, y: 8 }, { x: 5, y: 9 }];
const towerSites = [{ x: 4, y: 6 }, { x: 5, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 8 }];

function settleNight(state) {
  let guard = 18000;
  while (["night", "aftermath"].includes(state.phase) && guard > 0) {
    Engine.advanceTick(state);
    guard -= 1;
  }
  if (guard === 0) throw new Error("Simulation did not settle.");
}

function firstTowerSite(state) {
  return towerSites.find((site) => Engine.validFootprint(state, "stickLauncher", site.x, site.y));
}

function firstTreeSite(state) {
  return sites.find((site) => Engine.terrainAt(state, site.x, site.y) === "tree");
}

function runPlan(label, chooseDayAction) {
  const state = Engine.createRun(seed);
  while (state.phase === "day" && state.levelIndex + 1 <= maxLevel) {
    chooseDayAction(state);
    if (state.phase === "day") Engine.dispatch(state, { type: "endDay" });
    settleNight(state);
  }
  return {
    plan: label,
    reachedLevel: state.levelIndex + 1,
    phase: state.phase,
    kills: state.kills,
    xp: state.xp,
    wood: state.resources.wood,
    towers: state.buildings.filter((building) => ["stickLauncher", "arrowShooter"].includes(building.type)).map((building) => building.type),
  };
}

const oneLauncher = runPlan("one launcher", (state) => {
  if (state.levelIndex === 0) Engine.dispatch(state, { type: "clear", ...sites[0] });
  else if (state.levelIndex === 1) Engine.dispatch(state, { type: "build", buildingType: "stickLauncher", ...towerSites[0] });
});

const spread = runPlan("spread launchers", (state) => {
  if (state.levelIndex === 0) Engine.dispatch(state, { type: "clear", ...sites[0] });
  else if (state.resources.wood >= 1 && firstTowerSite(state)) Engine.dispatch(state, { type: "build", buildingType: "stickLauncher", ...firstTowerSite(state) });
  else if (firstTreeSite(state)) Engine.dispatch(state, { type: "clear", ...firstTreeSite(state) });
});

const arrowRush = runPlan("Arrowcraft rush", (state) => {
  if (Engine.techAvailability(state, "arrowcraft").available) Engine.dispatch(state, { type: "research", nodeId: "arrowcraft" });
  const firstLauncher = state.buildings.find((building) => building.type === "stickLauncher" && !building.destroyed);
  if (firstLauncher && Engine.hasResearch(state, "arrowcraft") && state.resources.wood >= 4) {
    Engine.dispatch(state, { type: "upgradeLauncher", id: firstLauncher.id });
  } else if (state.resources.wood >= 1 && !firstLauncher && firstTowerSite(state)) {
    Engine.dispatch(state, { type: "build", buildingType: "stickLauncher", ...firstTowerSite(state) });
  } else if (firstTreeSite(state)) {
    Engine.dispatch(state, { type: "clear", ...firstTreeSite(state) });
  }
});

console.table([oneLauncher, spread, arrowRush]);
