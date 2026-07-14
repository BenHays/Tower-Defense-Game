# Wild Hearth — Feature Roadmap

This roadmap protects the core loop: use the day to shape a small homestead, then watch the night play out. The player has no night commands.

## Current opening contract

### Level 1 — First watch

1. Start with Scout, a branch teepee, **0 wood**, and two daylight actions.
2. Clear one tree. It uses both actions, gives **2 wood**, and opens the forest for later expansion.
3. End the day. Scout defeats one raccoon without help.
4. Scout returns to his watch post. The next day begins automatically.
5. The **Stick Launcher** recipe unlocks.

### Level 2 — First line

1. The cleared wood carries over.
2. Build a Stick Launcher for **1 wood and the full day**. It completes immediately; there are no blueprints or Finish step.
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
- Day-only actions, automatic Scout combat, pause/1×/2× playback, optional building/enemy health bars, and no end-of-night popup.
- Passive click-to-inspect selection, a ground-hugging terrain highlight, selected-tower combat stats, and no Scout health UI.
- Visible stick and arrow projectiles, hit flashes, and deterministic raccoon pacing: short entry pauses, varied seeded entry edges, and readable wave gaps.
- A DOM-free `tech-tree.js` module. Its first node, **Arrowcraft**, costs 6 XP, becomes available on Level 3, and unlocks an individual tower upgrade.
- **Arrow Shooter:** spend 4 wood and the full day to convert one Stick Launcher. It has 1.5× damage, attack speed, and range; it does not gain extra health.
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

## Proposed next defense path

These are planning decisions, not live gameplay changes.

### Potato Gun — next new building

The **Potato Gun** should be the next distinct building after the Stick Launcher. Arrow Shooter remains the Stick Launcher upgrade; Potato Gun fills the separate slow, heavy-hit role that later high-health enemies need.

| Property | Proposed starting value |
| --- | --- |
| Cost | 3 wood and a full day |
| Damage | 3 |
| Tempo | Very slow — one shot every 3 seconds |
| Range | 3 cells |
| Extra | Knocks the target back one cell on hit |

Its job is not crowd control or a universal replacement for launchers. It gives the player a deliberate answer to a tough approach, while the Stick Launcher remains cheap steady pressure.

### Future research branches

- **Hivecraft:** a future XP research node that unlocks a Bee Hive. Bees deal small chip damage and apply **Honeyed**, a golden visible slow on the enemy. Honey is a status effect, not a new stored resource. Start with one non-stacking slow so the effect stays readable.
- **Fungal Craft:** a future XP research node that unlocks a Mushroom Launcher. Its shot creates a visible cloud which damages enemies over time in a small area. Start with no stacking clouds; this is the future grouped-enemy counter.

### Environment purpose

- **Campfire:** add a permanent, untargetable fire at the teepee. It does not attack. Its small inner warmth zone slows approaching enemies slightly, giving Scout a final defensive window. It is not a structure, cannot be repaired, and needs no fuel system yet.
- **Water:** do not add a water inventory. Later, water should be an environmental moisture source that enables fungal/garden structures near it; its first real purpose is to create location-specific choices for the Mushroom branch rather than another generic currency.

## Planned challenge and stat reset

The current opening produces too much early tower capacity: a cleared tree grants 2 wood while a launcher costs 1, and launchers can be placed in the original clearing. Before adding the Potato Gun, rebalance around outward expansion:

- A cleared tree should grant **1 wood**.
- New defensive buildings should require a **cleared former-tree cell**, not the original teepee clearing.
- Tree clear, new building, and tower upgrade each retain their full-day cost.
- Make basic launcher projectiles larger and longer-lived with a short impact flash; reduce its initial range so its fire is visible and local.

Keep the engine values precise, but make the player-facing contract legible. Show exact numbers only on a selected unit or building; elsewhere use plain labels such as **Hit**, **Tempo**, **Reach**, and **Condition**.

| Unit or enemy | Proposed simple combat baseline |
| --- | --- |
| Scout | 1 damage, quick tempo, short-to-medium watch radius |
| Raccoon | 5 health, low building damage |
| Stick Launcher | 1 damage, slow tempo (one shot every 2 seconds), 2.25-cell range |
| Arrow Shooter | Keeps the existing 1.5× upgrade rule; present it as stronger, faster, and farther rather than crowding the main HUD with decimals |

## Planned level tracker and UI reset

- Remove Avery as a visible map unit and remove the name from controls, labels, messages, and day-action copy. The player uses abstract **Day actions** to clear, build, repair, and place Scout.
- Use a thin level strip: `Level 02`, Wood, and XP. It should show only the current level objective or newly available research/building, never a long tutorial or enemy forecast.
- Put save/load/reset, speed, and health-bar toggles in compact secondary controls. Keep the primary play surface focused on the map, resources, selected object, and **End day**.
- Replace generic Field Notes with a small context card only when a level unlocks something meaningful: for example, “New: Stick Launcher” or “Research: Arrowcraft — 6 XP.”
- Use a tight outline matched to the selected object or terrain cell. Do not show a large circular selector around rocks or empty ground.

## Recommended collaboration documents

Yes—split the design into small module documents once this roadmap is agreed. Do not create them yet; this list avoids duplicating conflicting live and proposed values in every file.

- `docs/modules/core-loop.md` — day actions, night resolution, win/fail rules, and level handoff.
- `docs/modules/buildings.md` — teepee, fire, Stick Launcher, Arrow Shooter, Potato Gun, costs, placement, and repair.
- `docs/modules/units.md` — Scout and any future friendly units.
- `docs/modules/enemies.md` — enemy stats, approaches, target rules, and each counter relationship.
- `docs/modules/tech-tree.md` — XP research nodes, prerequisites, and unlock effects.
- `docs/modules/terrain.md` — trees, cleared ground, fire, water, and terrain-purpose rules.
- `docs/modules/levels.md` — unlock schedule, Threat Budget, and seed variation rules for the single map.

Every module should use the same four headings: **Live now**, **Proposed next**, **Open questions**, and **Decisions made**. `ROADMAP.md` should remain the single ordered implementation list.

## Future content guardrails

- No Stake Snare is planned.
- Do not introduce the Boar or another enemy until Arrowcraft and multiple-launcher play are balanced across several seeds.
- Once new enemies begin, add no more than one family every three levels, and make its counter buildable before its first appearance.
- Future tech branches may improve Scout, homestead durability, or counters, but each must create a new decision rather than an upkeep obligation.

## Next implementation order

1. Reset the early economy, placement rule, combat readability, and compact UI before adding another building.
2. Add Potato Gun and validate its counter role across deterministic Medium seeds.
3. Add the next tech branch only after Arrowcraft and Potato Gun create reliable but challenging choices.
4. Add the next enemy only with its own readable building counter.
5. Add Easy, Hard, and Very Hard as Threat Budget multipliers after Medium is balanced.
