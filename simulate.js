const Engine = require("./engine.js");

const seed = process.argv[2] || Engine.DEFAULT_SEED;
const state = Engine.createRun(seed);
Engine.OPENING_PICKUPS.forEach((pickup) => Engine.dispatch(state, { type: "collectOpeningPickup", id: pickup.id }));
Engine.dispatch(state, { type: "craftHatchet" });
Engine.dispatch(state, { type: "constructShelter", ...Engine.SHELTER_SITE });
Engine.dispatch(state, { type: "endDay" });

let guard = 14000;
while (["night", "aftermath"].includes(state.phase) && guard > 0) {
  Engine.advanceTick(state);
  guard -= 1;
}

if (guard === 0) throw new Error("Simulation did not settle.");

console.log(JSON.stringify({
  seed: state.seed,
  level: Engine.levelFor(state).id,
  phase: state.phase,
  kills: state.kills,
  xp: state.xp,
  unlocks: state.unlocks,
  checksum: Engine.checksum(state),
}, null, 2));
