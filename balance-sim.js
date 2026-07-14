/*
 * Small deterministic balance probe. It is intentionally not an AI: each
 * named plan makes a transparent daylight choice, then lets the shared engine
 * play the night. Run: node balance-sim.js [seed] [max-level]
 */
const Engine = require("./engine.js");
const assert = require("node:assert/strict");

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
  const replay = Engine.replayReport(seed, state.actionLog);
  if (Engine.checksum(replay.state) !== Engine.checksum(state)) throw new Error(`${label} failed deterministic replay validation.`);
  const latest = replay.checkpoints[replay.checkpoints.length - 1];
  return {
    plan: label,
    reachedLevel: state.levelIndex + 1,
    phase: state.phase,
    kills: state.kills,
    xp: state.xp,
    wood: state.resources.wood,
    towers: state.buildings.filter((building) => Engine.TOWER_TYPES.includes(building.type)).map((building) => building.type),
    checkpoints: replay.checkpoints.length,
    lastNight: latest ? `${latest.number}:${latest.result} · ${latest.telemetry?.buildingDamage?.toFixed(1) || "0.0"} structure dmg` : "none",
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

const plans = [oneLauncher, spread, arrowRush, potatoRush];
const targetChecks = [
  { plan: oneLauncher, minLevel: 4, purpose: "a single launcher survives the early line but does not define the whole strategy" },
  { plan: spread, minLevel: 5, purpose: "adding a second line meaningfully outlasts the single-launcher plan" },
  { plan: arrowRush, minLevel: 4, purpose: "researching Arrowcraft remains viable before the first heavy enemy" },
  { plan: potatoRush, minLevel: 4, purpose: "the heavy counter is available before the Boar showcase" },
];

targetChecks.forEach(({ plan, minLevel, purpose }) => {
  assert.ok(plan.reachedLevel >= minLevel, `${plan.plan} missed balance target: ${purpose}`);
});

console.table(plans.map((plan) => ({ ...plan, target: targetChecks.find((check) => check.plan === plan).minLevel })));
console.log("Balance targets passed. The Level 5 Boar showcase remains the next player-test gate.");
