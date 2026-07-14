# Wild Hearth — Feature Roadmap

This roadmap protects the core loop: use the day to shape a small homestead, then watch the night play out. The player has no night commands.

## Current opening contract

### Level 1 — First watch

1. Start with Avery, Scout, a branch teepee, **0 wood**, and two daylight actions.
2. Clear one tree. It uses both actions, gives **1 wood**, and creates the first build site.
3. End the day. Scout defeats one raccoon without help.
4. Scout returns to his watch post. The next day begins automatically.
5. The **Stick Launcher** recipe unlocks.

### Level 2 — First line

1. The cleared wood carries over.
2. Build a Stick Launcher for **1 wood and one daylight action**. It completes immediately; there are no blueprints or Finish step.
3. The launcher fires outward while Scout catches leaks near the teepee.
4. Each completed night automatically becomes the next untimed day after Scout returns home.

## Core decisions — agreed

- **Untimed day:** daylight ends only when the player chooses **End day**.
- **Two actions:** tree clearing takes both actions. Building, repairing, moving Scout, clearing a boulder, and clearing rubble each take one.
- **Forest:** trees visually cover the map, are walkable but slow enemies, and become fast buildable ground when cleared. Boulders, buildings, and rubble are hard blockers.
- **All-angle invasion:** enemies can spawn from any usable perimeter cell.
- **Scout:** a mobile melee final line. His watch radius stays centered on the daytime post; he chases, bites, and returns automatically.
- **Stick Launcher:** the first fixed tower. It costs 1 wood, has 6 health, 4.5-cell range, 1 damage, and fires once per second at the nearest enemy in range.
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
- Day-only Avery actions, automatic Scout combat, pause/1×/2× playback, optional health bars, and no end-of-night popup.
- Generated painted sprites for Scout, raccoon, boar, and the teepee; code-native art for the Stick Launcher.

## Next content after this slice

1. Add a second tower or path-delay defense so Level 4+ demands placement choices, not only more launchers.
2. Introduce the boar only with its own readable counter-building.
3. Add one tangible unlock per level once there is content that creates a real new choice.
4. Add Easy, Hard, and Very Hard as Threat Budget multipliers.
5. Add a simple level/tech-tree planning view once the first five rewards are chosen.
