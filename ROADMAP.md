# Wild Hearth — Feature Roadmap

This roadmap protects the core loop: use the day to shape a small homestead, then watch the night play out. The player has no night commands.

## Current opening contract

### Level 1 — Shelter and first watch

1. Start with Scout, a **shelter site**, **0 wood**, and two daylight actions. There is no teepee or fire yet.
2. The only active control is **Construct shelter**. It costs no wood, consumes the full first day, and places the branch teepee. Every other action, research, and build control—including **End day**—is disabled until this is complete.
3. The new teepee is therefore the one free thing the player *earns* through the tutorial, not a free starting building.
4. End the day. Scout defeats one raccoon without help, returns to his watch post, and the **Stick Launcher** recipe unlocks.

### Level 2 — First line

1. Clear a tree for **2 wood and one action**.
2. Build a Stick Launcher for **2 wood and one action**. It completes immediately; there are no blueprints or Finish step.
3. The launcher fires outward while Scout catches leaks near the teepee.
4. Each completed night automatically becomes the next untimed day after Scout returns home.

## Core decisions — agreed

- **Untimed day:** daylight ends only when the player chooses **End day**.
- **Two actions:** normal days have two actions. Clearing a tree, constructing or upgrading a tower, repairing, moving Scout, and clearing rubble each take one. The forced Level 1 shelter alone takes the full opening day.
- **Grass placement:** any unoccupied `open` or `cleared` grass cell can hold a defense. Trees, water, rubble, and buildings block placement by default. Clearing a tree earns wood and opens its grass cell; it is not a prerequisite for every defense.
- **Map scale:** the single authored map is a 15×15 meadow with a small centered clearing and a dense outer forest. Enemies can spawn from any usable perimeter cell.
- **Scout:** a mobile melee final line. His watch radius stays centered on the daytime post; he chases, bites, and returns automatically.
- **Stick Launcher:** the first fixed tower. It costs 2 wood and one action, has 8 health, short 2.25-cell reach, 1 damage, and fires once every 2 seconds at the nearest enemy in range.
- **XP branches:** enemies and cleared nights award XP. Research spends XP but no day action. Scout Training I (4 XP), Arrowcraft (6 XP), Hearthkeeping I (Level 4, 5 XP), and Potato Packing are distinct early choices; there are no meat, pelt, food, or Scout-health maintenance systems.
- **Dawn recovery:** Hearthkeeping I restores 1 HP at dawn to each surviving targetable building, capped at its maximum. It does not revive destroyed buildings.
- **Refit rule:** upgrading a Stick Launcher into an Arrow Shooter costs 4 wood and one action, then restores the new Arrow Shooter to full health.
- **Enemy schedule:** the first Boar is guaranteed on Level 5. New families appear no more than once every three levels; their counter must be researchable/buildable at least two levels before its guaranteed debut.
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
| 5 | 5 | Guaranteed 1 Boar showcase |
| 6 | 7 | Seeded Boar + raccoon mix |

Later difficulty modes will multiply this budget: Easy 0.8×, Medium 1.0×, Hard 1.25×, Very Hard 1.6×. They are intentionally not in the MVP UI yet.

## Delivered engine foundation

- Dependency-free, fixed-tick browser simulation with deterministic seeds, save/load, replay checkpoints, night telemetry, and a headless test runner.
- Hidden square board, weighted forest movement, route-cost placement preview, shortest reachable-building targeting, building destruction, and rubble.
- Day-only actions, automatic Scout combat, a persistent 1×/2× playback preference, optional building/enemy health bars, and no end-of-night popup.
- Stable one-click map input, outline-only placement feedback, selected unit/building combat stats, and no Scout health UI.
- Visible projectiles, recoil, hit flashes, brief defeat remains, and deterministic raccoon pacing: staggered groups rotate across seeded forest edges.
- A DOM-free, data-driven `tech-tree.js` module. **Scout Training I** costs 4 XP on Level 2 (+1 Scout damage); **Arrowcraft** costs 6 XP on Level 3 and unlocks an individual tower upgrade.
- **Arrow Shooter:** spend 4 wood and one action to convert one Stick Launcher. It has 1.5× damage, attack speed, and range; this paid refit restores it to full health.
- Shared building recipes specify health, repair, targetability, path blocking, and optional combat. `balance-sim.js` compares named plans and verifies their replay checkpoints before a Threat Budget or tower stat is changed.

## Current challenge arc

Level 1 is intentionally safe. From Level 2 forward, the player is under real pressure and chooses between basic launchers, Scout Training, and saving XP for Arrowcraft.

| Level | Player decision | Pressure |
| --- | --- | --- |
| 1 | Construct the shelter; watch Scout defeat one raccoon | Tutorial / easy |
| 2 | Clear a tree and build the first Stick Launcher; Scout Training appears | 2 raccoons |
| 3 | Choose Scout Training or Arrowcraft without spending an action; clear for wood | 3 raccoons |
| 4 | Choose Hearthkeeping I or Potato Packing; save for an Arrow Shooter or add a second launcher | 4 raccoons |
| 5 | Meet the guaranteed Boar; use the Potato Gun as its dedicated answer | 1 Boar showcase |
| 6–7 | Mix launchers, upgrades, and emerging support tech | Seeded Boar + raccoon mix |
| 8 | Meet the next family after Hivecraft/Bee Hive has been available two levels | New family showcase |

## Proposed next defense path

Potato Gun, the simplified early stats, grass placement, shelter opening, and compact UI are live. Hivecraft, Fungal Craft, water, and the earned hearth are planning decisions.

### Potato Gun — next new building

The **Potato Gun** should be the next distinct building after the Stick Launcher. Arrow Shooter remains the Stick Launcher upgrade; Potato Gun fills the separate slow, heavy-hit role that later high-health enemies need.

| Property | Live starting value |
| --- | --- |
| Cost | 3 wood and 1 action |
| Damage | 3 |
| Tempo | Very slow — one shot every 3 seconds |
| Range | 3 cells |
| Extra | Knocks the target back one cell on hit; Potato Packing adds a short non-stacking slow |

Its job is not crowd control or a universal replacement for launchers. It gives the player a deliberate answer to a tough approach, while the Stick Launcher remains cheap steady pressure.

### Future research branches

- **Hivecraft:** appears on Level 6 and unlocks a Bee Hive before the Level 8 enemy family. Bees deal small chip damage and apply **Honeyed**, a longer, lighter visible slow on the enemy. Honey is a status effect, not a new stored resource. It does not stack with itself or another slow.
- **Fungal Craft:** a future XP research node that unlocks a Mushroom Launcher. Its shot creates a visible cloud which damages enemies over time in a small area. Start with no stacking clouds; this is the future grouped-enemy counter.

### Environment purpose

- **Hearthcraft / Fire Pit (roadmap, not live contract):** Hearthcraft appears on Level 5, costs 8 XP, and requires Arrowcraft. It unlocks an earned Fire Pit, rather than placing a free campfire. Then spend **2 wood and one action** to construct it in the central clearing. Its sole purpose is a non-targetable, non-damaging, non-healing, non-blocking **1.5-cell Warmth zone** that slows enemies **25%**. It is a narrow safety net that buys Scout or a nearby tower one more attack, not a replacement for a defense.
- **Water:** do not add a water inventory. Later, water should be an environmental moisture source that enables fungal/garden structures near it; its first real purpose is to create location-specific choices for the Mushroom branch rather than another generic currency.

### Tree and placement UX corrections (delivered)

- **One clear, one target:** the map grid remains mounted while hover feedback updates, so one armed tool click followed by one terrain click completes the action. Invalid clicks keep the tool armed.
- **Neutral cleared plots:** flattened grass, muted soil, and a small stump/log replace the old yellow glow. Yellow must never represent permanent terrain or selection.
- **Explicit terrain grammar:** standing tree = wood source and slower route; any open or cleared grass = defense site; water, fire, and future structures will introduce their own placement rules when they exist. The visual treatment and tool copy must explain this rule before a player tries to build.

## Delivered challenge and stat reset

The current opening pairs its first resource decision exactly: a cleared tree grants 2 wood, and a basic launcher costs 2 wood. Clearing for the first tower therefore uses the full normal day without producing surplus tower capacity:

- A cleared tree grants **2 wood**.
- A Stick Launcher costs **2 wood**.
- New defensive buildings require **unoccupied grass**. Clearing trees is still valuable for wood, room, and faster paths.
- Tree clear, new building, and tower upgrade each cost one action.
- Basic launcher projectiles are larger and slower with a short impact flash; initial reach is reduced so its fire is visible and local.

Keep the engine values precise, but make the player-facing contract legible. Show exact numbers only on a selected unit or building; elsewhere use plain labels such as **Hit**, **Tempo**, **Reach**, and **Condition**.

| Unit or enemy | Live simple combat baseline |
| --- | --- |
| Scout | 1 damage, quick tempo, short-to-medium watch radius |
| Raccoon | 5 health, low building damage |
| Stick Launcher | 1 damage, slow tempo (one shot every 2 seconds), 2.25-cell range |
| Arrow Shooter | Keeps the existing 1.5× upgrade rule; present it as stronger, faster, and farther rather than crowding the main HUD with decimals |

## Delivered level tracker and UI reset

- Avery is removed as a visible map unit and from player-facing copy. The player uses abstract **Day actions** to clear, build, repair, and place Scout.
- A thin level strip shows level, Wood, XP, and the current objective or relevant research/building.
- Save/load/reset, speed, and health-bar toggles are compact secondary controls. The primary play surface focuses on the map, resources, selected object, and **End day**.
- Generic Field Notes are replaced by a small current-status line.
- Selection uses a tight outline matched to the selected object or terrain cell instead of a large circular terrain highlight.
- A compact Technology icon opens a full-screen, read-only-at-night tree overlay. It shows current and directly reachable nodes only; research remains XP-only and day-only.
- Building art communicates intact, worn, damaged, and critical condition; the overnight report calls out structure damage and dawn recovery.

## Recommended collaboration documents

The module documents now live under `docs/modules/`. They avoid duplicating conflicting live and proposed values in every file.

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
- Introduce the Boar as the guaranteed Level 5 test of the Potato Gun counter after deterministic seed checks.
- Once new enemies begin, add no more than one family every three levels, make its counter researchable/buildable at least two levels before its first appearance, and guarantee the first showcase before it enters random allocation.
- Future tech branches may improve Scout, homestead durability, or counters, but each must create a new decision rather than an upkeep obligation.

## Next implementation order

1. Validate Scout Training, Arrowcraft, Hearthkeeping I, Potato Packing, and extra-launcher choices across deterministic Medium seeds and player testing.
2. Validate the guaranteed Level 5 Boar, Potato Gun slow, and Arrow Shooter refit rule across deterministic Medium seeds.
3. Tune grouped multi-angle pressure so the first Boar is readable but forces a dedicated counter.
4. Implement the Level 6 Hivecraft / Level 8 enemy pairing only after the Boar counter loop is stable.
5. Implement the Level 11 Mushroom Launcher pairing only after Honeyed and Warmth are readable in telemetry and art.
6. Add Easy, Hard, and Very Hard as Threat Budget multipliers after Medium is balanced.
