/*
 * Small deterministic balance probe. It is intentionally not an AI: each
 * named plan makes a transparent daylight choice, then lets the shared engine
 * play the night. Run: node balance-sim.js [seed] [max-level]
 */
const Engine = require("./engine.js");

const seed = process.argv[2] || Engine.DEFAULT_SEED;
const maxLevel = Number(process.argv[3] || 9);
function settleNight(state) {
  let guard = 18000;
  while (["night", "aftermath"].includes(state.phase) && guard > 0) {
    Engine.advanceTick(state);
    guard -= 1;
  }
  if (guard === 0) throw new Error("Simulation did not settle.");
}

function firstTowerSite(state, type) {
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) {
      if (Engine.validFootprint(state, type, x, y)) return { x, y };
    }
  }
  return null;
}

function firstTreeSite(state) {
  for (let y = 0; y < Engine.BOARD.height; y += 1) {
    for (let x = 0; x < Engine.BOARD.width; x += 1) {
      if (Engine.terrainAt(state, x, y) === "tree") return { x, y };
    }
  }
  return null;
}

function runPlan(label, chooseDayAction) {
  const state = Engine.createRun(seed);
  while (state.phase === "day" && state.levelIndex + 1 <= maxLevel) {
    if (!Engine.hasShelter(state)) Engine.dispatch(state, { type: "constructShelter" });
    else chooseDayAction(state);
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
    towers: state.buildings.filter((building) => Engine.TOWER_TYPES.includes(building.type)).map((building) => building.type),
  };
}

const oneLauncher = runPlan("one launcher", (state) => {
  if (state.levelIndex !== 1) return;
  if (state.resources.wood < 2 && firstTreeSite(state)) Engine.dispatch(state, { type: "clear", ...firstTreeSite(state) });
  const site = firstTowerSite(state, "stickLauncher");
  if (state.resources.wood >= 2 && site) Engine.dispatch(state, { type: "build", buildingType: "stickLauncher", ...site });
});

const spread = runPlan("spread launchers", (state) => {
  if (state.resources.wood < 2 && firstTreeSite(state)) Engine.dispatch(state, { type: "clear", ...firstTreeSite(state) });
  const site = firstTowerSite(state, "stickLauncher");
  if (state.resources.wood >= 2 && site) Engine.dispatch(state, { type: "build", buildingType: "stickLauncher", ...site });
});

const arrowRush = runPlan("Arrowcraft rush", (state) => {
  if (Engine.techAvailability(state, "arrowcraft").available) Engine.dispatch(state, { type: "research", nodeId: "arrowcraft" });
  const firstLauncher = state.buildings.find((building) => building.type === "stickLauncher" && !building.destroyed);
  if (firstLauncher && Engine.hasResearch(state, "arrowcraft") && state.resources.wood >= 4) {
    Engine.dispatch(state, { type: "upgradeLauncher", id: firstLauncher.id });
  } else {
    if ((!firstLauncher || state.resources.wood < 4) && state.actionPoints > 0 && firstTreeSite(state)) Engine.dispatch(state, { type: "clear", ...firstTreeSite(state) });
    const site = firstTowerSite(state, "stickLauncher");
    if (!firstLauncher && state.resources.wood >= 2 && site) Engine.dispatch(state, { type: "build", buildingType: "stickLauncher", ...site });
  }
});

const potatoRush = runPlan("potato rush", (state) => {
  const potatoSite = firstTowerSite(state, "potatoGun");
  if (state.unlocks.includes("potatoGun") && state.resources.wood >= 3 && potatoSite) {
    Engine.dispatch(state, { type: "build", buildingType: "potatoGun", ...potatoSite });
  } else if (firstTreeSite(state)) {
    Engine.dispatch(state, { type: "clear", ...firstTreeSite(state) });
  }
});

console.table([oneLauncher, spread, arrowRush, potatoRush]);
