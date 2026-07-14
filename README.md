# Wild Hearth: Hearth Meadow

A dependency-free, top-down homestead-defense MVP. Build the shelter before the first watch, use untimed day actions to clear forest for wood and build on any unoccupied grass, then watch Scout and towers defend at night.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. Level 1 begins with a visible **stick** and **rock** in the starting clearing. Click both (free), then **Craft axe** (free, one action). **Place shelter** immediately changes from its quiet locked state to a gold **ready** action; click it to arm the green **Choose shelter site** state, then click any unoccupied grass (free, one action). Every other control and **End Day** stays locked until the shelter stands.
2. End the day. Scout handles the first raccoon, then returns to the watch post. The next day starts automatically—there is no Continue button or result popup.
3. Every normal day has two actions. **Harvest Tree**, placing Scout, building a tower, repairing, and upgrading each use **one** action. Harvesting grants **2 wood** and turns the tree into open grass through a short, visible tree-chop: the axe begins high above the trunk, travels down into the lower trunk, then produces a chip burst and cleared-ground reveal. Scout's watch post reserves its cell: towers cannot overlap it, and Scout cannot be placed inside a structure.
4. Level 1 unlocks the **Stick Launcher**. On Level 2, harvest a tree and build it for 2 wood on any unoccupied grass cell in the same day. It has 8 health, deals 1 damage, fires once every 2 seconds, and has short reach.
5. Holding Level 2 unlocks the **Potato Patch**: plant it for 1 wood and one action on Level 3. It grows after two held nights. Holding Level 4 unlocks its **Potato Gun** conversion; on Level 5, spend 3 wood and one action on the mature patch for a slow, heavy 3-damage shot. Potato Packing gives each hit a short, non-stacking slow; this is the dedicated answer to the Level 5 Boar.
6. Defeated enemies and held nights grant permanent **XP**. The first **Skill Point** arrives at **10 XP**; each later threshold doubles (**20**, **40**, **80**, …). Learning a Talent consumes Skill Points only—never a day action. Raccoons roll 1–2 **Hides** and Boars roll 2–4; those seeded drops are held for a future trade/food/upgrade decision and do not yet have a cost sink.
7. The **Talent Tree** is a full-screen, data-driven tree with five branches: **Hunting** (tower damage, range, and refits), **Farming** (wood and repairs), **Building** (maximum HP and armor), **Nurturing** (dawn recovery and later homestead care), and **Scouting** (Scout damage and watch range). A branch's first purchase costs 1 Skill Point, then 2, 4, 8, and so on; starting another branch still costs 1. Nodes use centered SVG icons, while their description appears after selection. Upgrading a damaged Stick Launcher is still a paid refit: the Arrow Shooter starts at full health.
8. The first Boar is guaranteed on Level 5. New enemy families arrive no more than once every three levels, and their dedicated counter is available at least two levels earlier. The fixed 15×15 meadow has a small centered clearing and dense, walkable forest to its perimeter. Placement previews show whether a site is valid, affordable, and how costly the nearby enemy route is.
9. Medium uses a seeded **Threat Budget** that grows 25% per level, rounded up. Enemy and building health bars start on and can be toggled any time below the map: green is full health, yellow is damaged, and red is below 30%; their length shows the exact amount. Scout has no health bar. **End Day** begins the night immediately, even if actions remain. The compact Night Record retains spawned enemies, defense damage, and homestead damage for each watch. Playback speed is a saved 1×/2× preference that may be changed any time after shelter construction and only changes simulation pacing at night.
10. The interface keeps one objective prompt at the top and no terrain inspector below the map. Day actions are separate from a compact horizontal **Build** strip: it stays empty during the two-action shelter opening, begins with the unlocked Stick Launcher after Level 1, and adds later direct structures (such as the Potato Patch) from left to right as square, icon-first tiles. A mature selected patch exposes its Potato Gun conversion in the contextual upgrade row. Its saved − / + control selects Compact, Standard, or Large sizing. At night both rails remain in place but build controls are disabled; rapid combat narration stays off-screen. The Talent Tree opens as a full-screen, horizontally scrollable dependency canvas with large icons, curved branch links, and a selection-driven detail pane.

## Configuration

There are no environment variables. Content tuning, Medium Threat allocation, the fixed 15×15 map and its centered clearing, combat contracts, loot ranges, and levels currently live in `engine.js`. `talent-tree.js` is the executable Talent Tree catalog; `docs/talent-tree-workbench.md` is the plain-language collaboration sheet; and `talent-icons.js` with `talent-icons.html` owns the shared, viewable SVG icon catalog. `game.js` is the browser renderer, stable map-input layer, and full-screen Talent Tree overlay. The shared Stick Launcher and Potato Gun artwork lives in `assets/` and is used in both the meadow and Build strip.

As the roster grows, use stable IDs—not JavaScript pointers—between a small set of catalogs: `units.js`, `enemies.js`, `buildings.js`, `levels.js`, `terrain.js`, `talent-tree.js`, and `talent-icons.js`. `engine.js` should consume those catalogs and retain only simulation/state logic. Units, enemies, and buildings are still centralized inside `engine.js` today, so extracting those three registries is the next organization refactor rather than creating duplicate sources of truth.

## Shared testing

The game can be published as a Codex Site for browser-based playtesting. The hosted build has no environment variables or server-side game state; each tester's save remains in their own browser.

## Key commands

```sh
# Serve locally
python3 -m http.server 4173

# Check JavaScript syntax
npm run check

# Build the static Codex Site bundle
npm run build

# Run deterministic engine checks
npm test

# Run a headless first-night simulation (optional seed argument)
node simulate.js HEARTH-1042

# Compare deterministic one-launcher, spread, and Arrowcraft plans
node balance-sim.js HEARTH-1042 9
```
