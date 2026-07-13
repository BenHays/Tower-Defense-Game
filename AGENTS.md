# Tower Defense Game instructions

- Keep the prototype dependency-free and runnable as a static site unless a task explicitly needs a framework.
- Preserve the one-screen, readable day-build / night-defense loop; add systems only when they improve that loop.
- Keep game state deterministic enough to test manually using the `Start night` control.
- Before handing off a change, run `node --check game.js` and visually inspect the page when practical.
