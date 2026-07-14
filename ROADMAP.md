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

## Planned opening-loop corrections

These are design decisions for the next implementation slice; they are not live yet.

- **No false second action:** a Stick Launcher should take Avery's full day (two actions) to construct. The first four days then have a clear rhythm: clear a tree, build the launcher, clear for the next defense, build that defense.
- **Defer stone until it has a job:** a cleared boulder currently yields one stone, but there is no live stone sink. Remove boulder clearing and the Stone display from the player loop until a durable-building or reinforcement recipe needs it.
- **Small launcher baseline:** reduce the Stick Launcher's initial range from 4.5 to about 2.8 cells. Keep its 1 damage / 1 attack per second baseline; range, damage, and attack-speed improvements belong to the future tech tree.
- **Readable selection:** replace the current cell reticle around trees and boulders with a subtle ground highlight behind the object. Inspection should be passive: click any terrain or building directly to see its name, cost, reward, and current state. The separate Inspect / Look tool can then be removed.
- **Combat feedback:** retain the launcher's short arm-snap animation and add a visible stick projectile, a target hit flash, and a small impact marker. The projectile must arrive before damage is applied so range is visually legible.

## XP tech tree — separate module

XP is earned from enemy kills and survived nights. It is a permanent progression currency, separate from wood and future material resources.

- Create an engine-only `tech-tree` module containing node IDs, XP costs, prerequisites, effects, and validation. It must not know about the DOM or simulation timing.
- The combat/building engine asks the module which effects are active; the UI only renders the tree and dispatches an XP-purchase action.
- Level rewards reveal new *available branches*; XP purchases the nodes inside those branches. A level reward therefore creates a choice without automatically granting a combat-stat increase.
- First branch: Stick Launcher improvements — range, attack speed, and damage. Exact node values and costs remain to be designed before implementation.
- Future branches: Scout training, homestead durability, and the counter-building for each new enemy family.

## Content cadence and next defense — proposed

Introduce a new enemy family every **three levels**, starting at Level 5. Never make an enemy eligible before its counter has been unlocked and the player has had a full day to build it.

| Level | Purpose / reward | Enemy pressure |
| --- | --- | --- |
| 1 | Clear one tree; learn Scout's last-line role | 1 raccoon |
| 2 | Build the Stick Launcher | 2 raccoons |
| 3 | Unlock **Stake Snare**, the next defense | 3 raccoons |
| 4 | Clear/build the Snare and test the first-line layout | 4 raccoons |
| 5 | Introduce the **Boar** | First mixed or solo boar threat |
| 6–7 | Expand the counter choice; reveal the next branch | Increasing mixed pressure |
| 8 | Introduce the next enemy family | New counter already available |

### Next building: Stake Snare

The next thing after the Stick Launcher should be a **Stake Snare**: a cheap, fixed placement that briefly roots or heavily slows the first enemy to cross it. It does not duplicate the launcher's ranged-damage role, creates an interesting placement decision, and is the readable counter for a heavy Boar without introducing a barricade.

## Next implementation order

1. Correct action economy, hide the unfinished stone loop, and replace Inspect / the terrain selector.
2. Make launcher combat readable with projectile and impact feedback; tune the initial range down.
3. Build and test the isolated XP tech-tree module plus its minimal UI surface.
4. Add the Stake Snare, then introduce the Boar only after its counter loop is proven.
5. Add Easy, Hard, and Very Hard as Threat Budget multipliers after Medium is balanced.
