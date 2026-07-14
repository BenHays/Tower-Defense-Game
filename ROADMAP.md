# Wild Hearth — Feature Roadmap

This roadmap keeps the first release focused on a readable, top-down homestead defense loop. The aim is a strong engine and strategic decisions first; more units, levels, visual ambience, and content come afterward.

## Core decisions — agreed

- **Untimed day:** daylight does not count down. The player chooses **End day** when ready.
- **Day actions:** Avery may repair, clear terrain, build, and position Scout during the day. Avery returns inside the teepee at night.
- **Enemy targeting:** every enemy attacks the closest *reachable* building. The teepee is currently the only building; later placed buildings can intentionally attract or protect against enemies.
- **World shape:** use a hidden **square-cell grid**. Do not draw a grid on the meadow. Organic terrain, tree clusters, and building art should conceal the cells while the engine gets simple placement, range, and pathfinding.
- **Starting terrain:** trees cover the map except for a small circular clearing around the teepee. Trees remain walkable but are slower than cleared ground; clearing one consumes an Avery action, grants wood, and makes that cell buildable.
- **Invasion entries:** enemies can spawn from any usable perimeter forest cell. The encounter seed chooses edge, cluster, composition, and timing; the authored map itself stays fixed.
- **Wood:** the first resource. It pays for repairs and construction.
- **Scout:** can be placed on a cell during the day and automatically attacks in range at night. He uses health, damage, attack speed, move speed, and attack radius.
- **Human:** no direct night combat and no Scout command button. The player’s night preparation is placement and construction.
- **Level generation:** a level has a difficulty budget that is randomly allocated into enemy counts. Randomization must be seeded so a run can be replayed and debugged exactly.
- **Progression:** award homestead experience for enemies defeated and for surviving a night. Unlocks should be tangible recipes or capabilities, not a large stat-tree.

## Important recommendations to lock before implementation

### Day-action budget

An untimed day still needs a limit or the optimal move is to clear and repair the entire map before ending it. Start with **two Avery actions per day** and permit ending the day early. Increase the budget through later unlocks only after the core loop is proven.

### Grid choice

Choose **squares, not octagons**. Regular octagons cannot tile a whole map alone; they require square fillers and complicate pathing, range, and placement. A square engine grid is robust and invisible under organic art. The small starting clearing can look round even if it is made of square cells.

### Next resource

Implement **stone** next, obtained by spending an Avery action to clear boulders. Stone should be reserved for durable defensive structures and building upgrades. Do not add food until the game has a meaningful food sink; hunger systems would add complexity without improving the first defense loop.

### Next enemy and counter

Introduce a **boar** after the raccoon: slow, high-health, high building damage. Its counter is the **wooden barricade**, a cheap sacrificial building that becomes the closest target while Scout attacks safely. This proves placement, closest-building targeting, destruction, and counter-building design without adding a special enemy rule.

### Level rewards

Every completed level should grant **one meaningful unlock**, but not every unlock needs to be a new unit. The unlock must solve the next level’s new pressure. Example: completing the raccoon lesson unlocks the wooden barricade for the boar. Do not give several unlocks at once.

## Engine and mechanics roadmap

### Milestone 1 — Day/night foundation

1. Replace the day timer with an **End day** control and a visible Avery-action counter.
2. Lock construction, repair, terrain clearing, and Scout placement to day; lock Avery inside the teepee at night.
3. Add a shared phase controller so all entities receive the same day/night state.

### Milestone 2 — Board and terrain engine

4. Add a hidden square-cell board with cell occupancy, building footprints, and day-only placement validation.
5. Seed the map with forest cells outside the starting clearing. Clear tree -> gain wood -> turn cell into open build space.
6. Add boulders later on the same terrain contract: clear boulder -> gain stone -> open cell.

### Milestone 3 — Building and combat contracts

7. Give every building a footprint, maximum health, current health, wood/stone cost, and tags such as `home`, `defense`, or `utility`.
8. Give every combat unit a compact shared contract: health, damage, attack speed, move speed, attack range, collision radius/footprint, target rule, and target type. Add armor, damage types, stuns, and status effects only when a specific unit needs them.
9. Implement deterministic targeting and pathing: enemies select the closest reachable building, retarget when it is destroyed or a closer building is placed, and use stable tie-break rules.
10. Add accurate attack-state handling: acquire target, move into range, attack cooldown, deal damage, death/destruction, and retarget. Display range and current target during the day as an optional planning overlay.

### Milestone 4 — First strategic loop

11. Give Scout a day-placement cell and a visible medium attack radius. At night he autonomously acquires enemies inside that radius.
12. Make tree clearing, repair, Scout placement, and the first wooden barricade compete for the limited Avery actions and wood.
13. Implement building destruction and enemy retargeting so a barricade protects the teepee through its position, not through a special exception.

### Milestone 5 — Progression and replayability

14. Award homestead XP at the end of each night: a survival reward plus enemy-kill XP. Use fixed thresholds to unlock recipes/capabilities.
15. Add the boar and unlock the wooden barricade as its direct, understandable counter.
16. Build a seeded difficulty-budget generator. Keep generated encounters readable: the same difficulty budget must have bounded counts and no impossible combinations.

## Additional quality and engine backlog

These improvements come after the core day / terrain / combat loop. They deepen planning and make the simulation easier to understand without requiring more enemy types or visual polish.

17. Add a **blueprint preview** before building: footprint, material cost, valid cells, Scout-range overlap, and whether it would become an enemy's nearest target.
18. Split construction into **blueprint** and **finished building** states. Placing a blueprint is cheap; finishing it spends an Avery action. This creates a real repair-versus-construction decision.
19. Treat forest as path-shaping terrain. Trees are walkable at a higher traversal cost, so clearing makes faster routes and build space while keeping the forest visually dense.
20. Give buildings readable roles such as `home`, `blocker`, `utility`, and `bait`. The closest-building rule remains universal, while the player understands each building's intended use.
21. Leave **rubble** after a building is destroyed. Rubble blocks its cells until Avery spends an action to clear it, so destruction changes the battlefield.
22. Add night **pause, 1x, and 2x speed** controls. They do not create combat commands; they let the player inspect or accelerate an automatic defense.
23. Add a day-only **planning overlay** for valid cells, building health, Scout ranges, predicted routes, and current targets. Keep the meadow uncluttered at night.
24. Give buildings visible condition states—intact, worn, damaged, and near-collapse—alongside an optional UI health-bar toggle for buildings, Scout, and enemies.
25. Stage a night's arrivals into small, bounded groups with gaps between them. This creates readable beats and avoids visual noise as difficulty rises.
26. Add a deterministic **replay/simulation mode** that records the map seed, player actions, placements, and outcome. It supports balance testing, bug reproduction, and shareable challenge runs.

## Random-note decision record

All of the following notes are incorporated into this roadmap:

| Topic | Decision |
| --- | --- |
| Experience | Grant homestead XP for each defeated enemy plus a survival reward at the end of a completed night. Spend it through fixed recipe/capability unlock thresholds. |
| Wood | Wood is the primary material for repairs and construction. It comes from clearing trees. |
| Next resource | Add stone from clearing boulders; use it for stronger defensive structures and upgrades. |
| Next enemy | Add a boar: slow, high-health, high building damage. |
| Enemy counters | Every enemy needs one readable primary building counter. The boar's is the wooden barricade. |
| Level rewards | Every completed level should give one tangible unlock that directly answers the next pressure. |

## Counter and unlock rules

- An enemy's counter must be understandable from its behavior, not a hidden numerical advantage. Example: the boar destroys buildings slowly but hits hard; a barricade is an obvious closest target for it to attack while Scout damages it.
- A level's unlock must create a new choice in the next level. Avoid unlocks that merely add a small stat bonus or duplicate an existing role.
- The introductory raccoon level may be the exception: it establishes the teepee, Avery, Scout, and the day/night loop. Begin the one-unlock-per-level cadence immediately afterward.

## Keeping levels fresh without making them unfair

Use several small, legible random variables instead of only changing enemy count:

- Allocate a level’s difficulty budget across enemy types and quantities.
- Vary spawn edges, spawn clusters, and arrival timing.
- Vary tree and boulder locations, changing which expansion routes are cheap or expensive.
- Generate different starting wood/stone opportunities near the clearing.
- Let player building placement change the closest-building target and route naturally.
- Use a visible seed/replay code so surprising runs can be repeated exactly.

Keep enemy rules, unit statistics, unlock order, and the difficulty ceiling deterministic. Randomness should create a new planning problem, not hide information or invalidate good decisions.

## Deferred until the core release is playable

- Additional unit control buttons and special enemy behaviors.
- Audio, ambience, extra visual effects, and broad content polish.
- Large enemy roster, many levels, and wide upgrade trees.
- Armor systems, elemental damage, status effects, and other advanced combat modifiers.
- Procedural map generation and map-generation validation. Hearth Meadow is one authored map for now.
- Pre-night readiness warnings or player-help checks. The player should learn from the outcome.
- Combat telemetry dashboards. They are developer-only balance data, not a player-facing mechanic.
- Cancelling or refunding unfinished blueprints. Materials remain committed once a blueprint is placed.

## Current MVP implementation

- Completed: untimed two-action days; End day; day-only Avery work; a hidden square board; dense walkable forest, all-perimeter spawning, trees, boulders, wood, stone, and rubble.
- Completed: building footprints, health/condition states, repairs, blueprints, completed barricades, closest-reachable-building targeting, four-direction cached paths, destruction, and retargeting.
- Completed: Scout placement/range, chase/bite/return behavior, data-driven raccoon and boar combat with approach attributes, fixed simulation ticks, bounded seeded waves, pause/1×/2× night controls, optional health bars, a visible aftermath before dawn continuation, XP, the first three level unlocks, save/load, and deterministic action-log replays.
- Verification: `node test-engine.js` exercises the engine without the browser; the browser remains the player-facing test surface.

## First implementation slice after this roadmap

Untimed day + two Avery actions + End day + hidden square cells + clear one tree for wood + place Scout + one raccoon night. This is the smallest slice that validates the intended game rather than only the presentation.
