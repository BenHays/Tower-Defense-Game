# Learnings

## MVP scope

- The no-timer day still needs a fixed action budget: normal days have two actions, and clearing, building, repairing, upgrading, and Scout placement each use one. Research spends XP only.
- Scout is fully automatic at night; player attention stays on daytime position, terrain, and building decisions rather than combat controls.

## Top-down expansion

- Use an authored hidden square grid. The art hides the cells, while the engine gets valid placement, footprints, four-direction paths, and range calculations.
- Trees are visually dense but walkable at a higher traversal cost; cleared ground is faster and buildable. This permits all-edge spawning without authored visible trails, while buildings and rubble remain hard blockers.
- Keep map terrain fixed for now. The seed changes encounter composition, spawn edge, and arrival timing, not the world layout.

## Simulation

- Keep `engine.js` DOM-free and advance combat in fixed ticks. The browser renderer, replay function, save/load, and Node simulator then exercise the same rules.
- The opening works best with direct construction: a Stick Launcher spends its wood and one action, then exists immediately. Blueprint and Finish states add unnecessary clicks before there are complex structures.
- Keep a unit’s guard post separate from its current position. Scout’s watch radius stays centered on the day-placed post while his night state moves through idle, chase, attack, return, then automatically starts the next day.
- Use a seeded Threat Budget rather than hard-coded enemy counts. Medium grows the previous budget by 25% rounded up, while each enemy’s Threat value makes later enemy pools compatible with the same allocator.
- Keep new progression modules separate from combat simulation: XP tech should expose declarative effects and purchase validation, while the engine and UI remain separate consumers.
- A deterministic balance probe should compare named build plans before changing pressure or tower values; an upgrade that arrives after its defense line reliably falls is not a real choice.
- Keep the current resource loop narrow: wood is for construction and repair, while XP is the only enemy/level reward. Do not add food, pelts, or Scout health maintenance without a distinct decision it creates.
- Keep planning values explicitly separate from live values. The current early wood loop pairs one cleared tree (2 wood) with one Stick Launcher (2 wood), so expansion consumes a full normal day without creating excess tower capacity.
- Keep the early Stick Launcher sturdy at 8 HP while its Arrow Shooter refit remains at 6 HP; Arrowcraft trades durability for damage, tempo, and reach instead of being a pure upgrade.
- Model cleared forest as its own terrain value rather than generic open ground. It preserves the harvested-tree visual and faster movement while both terrain values remain valid grass for building placement.
- A survival aid cannot be free by default: introduce the teepee through a forced zero-cost, full-day Level 1 shelter action, and defer fire until it is an XP-researched, wood-built safety net with one clear purpose.
- Keep `tech-tree.js` declarative and apply typed effects against immutable unit/building recipes at combat time; this keeps stacked upgrades, saves, and replay deterministic.
- Never replace interactive grid cells during hover rendering. Keep the grid mounted and patch classes so one armed tool click followed by one map click is reliable.
- Record a compact per-night telemetry report and replay checkpoint at settlement; use it to validate balance plans before changing pressure or stats.
- Rotate deterministic wave edges before repeats and stagger units within a group. It produces all-angle pressure without sacrificing readability.
- Treat a paid structure upgrade as a full refit: the new recipe starts at maximum health. That makes upgrade timing a visible recovery decision without adding a separate free repair action.
- Keep overnight recovery as a declarative tech effect: Hearthkeeping I heals each surviving targetable building by one at dawn, with no resurrection path.
- Introduce a new enemy family through a guaranteed showcase, then fold it into the seeded Threat Budget. Its counter should be buildable at least two levels in advance and new families should be spaced three levels apart.
- Put repeatable enemy-control effects behind one non-stacking status contract. Potato slow is short and heavy; Honeyed and Warmth can later be longer/lighter variants without ambiguous stacking.
- Keep guidance in one place: the HUD owns the current objective, the map stays visual, and the inspector only appears for a selection or armed action. Phase-specific controls prevent day-planning text from competing with the night watch.
