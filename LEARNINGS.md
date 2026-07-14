# Learnings

## MVP scope

- The no-timer day still needs a fixed action budget: two Avery actions keep clearing, repairs, Scout placement, and finished construction meaningful.
- Scout is fully automatic at night; player attention stays on daytime position, terrain, and building decisions rather than combat controls.

## Top-down expansion

- Use an authored hidden square grid. The art hides the cells, while the engine gets valid placement, footprints, four-direction paths, and range calculations.
- Trees are visually dense but walkable at a higher traversal cost; cleared ground is faster and buildable. This permits all-edge spawning without authored visible trails, while boulders, buildings, and rubble remain hard blockers.
- Keep map terrain fixed for now. The seed changes encounter composition, spawn edge, and arrival timing, not the world layout.

## Simulation

- Keep `engine.js` DOM-free and advance combat in fixed ticks. The browser renderer, replay function, save/load, and Node simulator then exercise the same rules.
- Unfinished blueprints reserve materials but are non-blocking and non-targetable. There is intentionally no cancel or refund flow yet.
- Keep a unit’s guard post separate from its current position. Scout’s watch radius stays centered on the day-placed post while his night state moves through idle, chase, attack, return, and a visible aftermath before dawn.
