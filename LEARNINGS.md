# Learnings

## MVP scope

- The no-timer day still needs a fixed action budget: two Avery actions make one tree clear a deliberate whole-day commitment, while builds, repairs, and Scout placement remain one-action choices.
- Scout is fully automatic at night; player attention stays on daytime position, terrain, and building decisions rather than combat controls.

## Top-down expansion

- Use an authored hidden square grid. The art hides the cells, while the engine gets valid placement, footprints, four-direction paths, and range calculations.
- Trees are visually dense but walkable at a higher traversal cost; cleared ground is faster and buildable. This permits all-edge spawning without authored visible trails, while boulders, buildings, and rubble remain hard blockers.
- Keep map terrain fixed for now. The seed changes encounter composition, spawn edge, and arrival timing, not the world layout.

## Simulation

- Keep `engine.js` DOM-free and advance combat in fixed ticks. The browser renderer, replay function, save/load, and Node simulator then exercise the same rules.
- The opening works best with direct construction: a Stick Launcher spends its wood and one action, then exists immediately. Blueprint and Finish states add unnecessary clicks before there are complex structures.
- Keep a unit’s guard post separate from its current position. Scout’s watch radius stays centered on the day-placed post while his night state moves through idle, chase, attack, return, then automatically starts the next day.
- Use a seeded Threat Budget rather than hard-coded enemy counts. Medium grows the previous budget by 25% rounded up, while each enemy’s Threat value makes later enemy pools compatible with the same allocator.
- Keep new progression modules separate from combat simulation: XP tech should expose declarative effects and purchase validation, while the engine and UI remain separate consumers.
