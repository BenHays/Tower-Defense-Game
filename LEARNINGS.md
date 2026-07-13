# Learnings

## MVP scope

- The no-timer day still needs a fixed action budget: two Avery actions keep clearing, repairs, Scout placement, and finished construction meaningful.
- Scout is fully automatic at night; player attention stays on daytime position, terrain, and building decisions rather than combat controls.

## Top-down expansion

- Use an authored hidden square grid. The art hides the cells, while the engine gets valid placement, footprints, four-direction paths, and range calculations.
- Trees and boulders must block paths, but a fixed forest map also needs authored animal trails from each edge to the central clearing; otherwise enemies cannot reach the teepee.
- Keep map terrain fixed for now. The seed changes encounter composition, spawn edge, and arrival timing, not the world layout.

## Simulation

- Keep `engine.js` DOM-free and advance combat in fixed ticks. The browser renderer, replay function, save/load, and Node simulator then exercise the same rules.
- Unfinished blueprints reserve materials but are non-blocking and non-targetable. There is intentionally no cancel or refund flow yet.
