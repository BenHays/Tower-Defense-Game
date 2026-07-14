# Wild Hearth — Feature Roadmap

This roadmap protects the core loop: use the day to shape a small homestead, then watch the night play out. The player has no night commands.

## Current opening contract

### Level 1 — First watch

1. Start with Avery, Scout, a branch teepee, **0 wood**, and two daylight actions.
2. Clear one tree. It uses both actions, gives **2 wood**, and opens the forest for later expansion.
3. End the day. Scout defeats one raccoon without help.
4. Scout returns to his watch post. The next day begins automatically.
5. The **Stick Launcher** recipe unlocks.

### Level 2 — First line

1. The cleared wood carries over.
2. Build a Stick Launcher for **1 wood and Avery's full day**. It completes immediately; there are no blueprints or Finish step.
3. The launcher fires outward while Scout catches leaks near the teepee.
4. Each completed night automatically becomes the next untimed day after Scout returns home.

## Core decisions — agreed

- **Untimed day:** daylight ends only when the player chooses **End day**.
- **Two actions:** tree clearing and constructing or upgrading a tower take both actions. Repairing, moving Scout, and clearing rubble each take one.
- **Forest:** trees visually cover the map, are walkable but slow enemies, and become fast buildable ground when cleared. Buildings and rubble are hard blockers; stone is out of the MVP resource loop.
- **All-angle invasion:** enemies can spawn from any usable perimeter cell.
- **Scout:** a mobile melee final line. His watch radius stays centered on the daytime post; he chases, bites, and returns automatically.
- **Stick Launcher:** the first fixed tower. It costs 1 wood and a full day, has 6 health, 2.8-cell range, 1 damage, and fires once per second at the nearest enemy in range.
- **XP only:** enemies and cleared nights award XP. There are no meat, pelt, food, or Scout-health maintenance systems.
- **No barricade yet:** boars and their dedicated counter remain deferred until the first tower loop is proven.
- **No blueprint state:** selecting Build creates a finished structure immediately when the site, materials, and action are valid.

## Medium Threat Budget

Each enemy has a **Threat** value. A level has a seeded **Threat Budget**; the encounter generator spends it among that level’s eligible enemies. The first eligible enemy is only the raccoon, so early variation comes from spawn edge, grouping, timing, and count. New enemy types can join the eligible pool later without changing the generator.

Medium increases the previous level’s budget by **25%, rounded up**:

| Level | Threat Budget | Current example |
| --- | ---: | --- |
| 1 | 1 | 1 raccoon |
| 2 | 2 | 2 raccoons |
| 3 | 3 | 3 raccoons |
| 4 | 4 | 4 raccoons |
| 5 | 5 | 5 raccoons |
| 6 | 7 | 7 raccoons |

Later difficulty modes will multiply this budget: Easy 0.8×, Medium 1.0×, Hard 1.25×, Very Hard 1.6×. They are intentionally not in the MVP UI yet.

## Delivered engine foundation

- Dependency-free, fixed-tick browser simulation with deterministic seeds, save/load, replay, and a headless test runner.
- Hidden square board, weighted forest movement, shortest reachable-building targeting, building destruction, and rubble.
- Day-only Avery actions, automatic Scout combat, pause/1×/2× playback, optional building/enemy health bars, and no end-of-night popup.
- Passive click-to-inspect selection, a ground-hugging terrain highlight, selected-tower combat stats, and no Scout health UI.
- Visible stick and arrow projectiles, hit flashes, and deterministic raccoon pacing: short entry pauses, varied seeded entry edges, and readable wave gaps.
- A DOM-free `tech-tree.js` module. Its first node, **Arrowcraft**, costs 6 XP, becomes available on Level 3, and unlocks an individual tower upgrade.
- **Arrow Shooter:** spend 4 wood and Avery’s full day to convert one Stick Launcher. It has 1.5× damage, attack speed, and range; it does not gain extra health.
- `balance-sim.js` compares named deterministic plans before a Threat Budget or tower stat is changed.

## Current challenge arc

Level 1 is intentionally safe. From Level 2 forward, the player is under real pressure and chooses between more basic launchers and saving wood for Arrowcraft.

| Level | Player decision | Pressure |
| --- | --- | --- |
| 1 | Clear a tree; watch Scout defeat one raccoon | Tutorial / easy |
| 2 | Spend the day on the first Stick Launcher | 2 raccoons |
| 3 | Research Arrowcraft when XP allows; clear for wood | 3 raccoons |
| 4 | Save for an Arrow Shooter or add a second launcher | 4 raccoons |
| 5+ | Build placement and upgrade timing determine survival | Growing seeded Threat Budget |

## Future content guardrails

- No Stake Snare is planned.
- Do not introduce the Boar or another enemy until Arrowcraft and multiple-launcher play are balanced across several seeds.
- Once new enemies begin, add no more than one family every three levels, and make its counter buildable before its first appearance.
- Future tech branches may improve Scout, homestead durability, or counters, but each must create a new decision rather than an upkeep obligation.

## Next implementation order

1. Use the balance runner and player testing to tune Medium pressure, tower durability, and Arrowcraft timing.
2. Add the next tech branch only after Arrowcraft creates a reliable but challenging choice.
3. Add the next enemy only with its own readable building counter.
4. Add Easy, Hard, and Very Hard as Threat Budget multipliers after Medium is balanced.
