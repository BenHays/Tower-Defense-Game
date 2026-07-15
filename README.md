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

1. Level 1 begins with a visible **stick** and **rock** in the starting clearing. Click both (free), then **Craft axe** (free, one action). **Place shelter** immediately changes from its quiet locked state to a gold **ready** action; click it to arm the green **Choose shelter site** state, then click any unoccupied grass (free, one action). Scout begins off-map and runs in beside the shelter once it stands. Every other control and **End Day** stays locked until the shelter stands.
2. End the day. Scout handles the first mouse, then returns to the watch post. The next day starts automatically—there is no Continue button or result popup.
3. Every normal day starts with two actions. **Harvest Tree**, placing Scout, building a tower, repairing, and upgrading each use **one** action. A living researched **Garden Plot** raises the next dawn to three actions; the first implementation caps this bonus at +1 total, so a second Garden does not snowball the economy. Harvesting grants **2 wood** and turns the tree into open grass through a short, visible tree-chop: the axe begins high above the trunk, travels down into the lower trunk, then produces a chip burst and cleared-ground reveal. A non-Fence structure destroyed at night leaves a visible, non-blocking **+1 wood bundle**; click it freely during the next day, or build on it to recover it automatically. Scout's watch post reserves its cell: towers cannot overlap it, and Scout cannot be placed inside a structure.
4. Level 1 unlocks the **Stick Launcher**. On Level 2, harvest a tree and build it for 2 wood on any unoccupied grass cell in the same day; it is the first reliable answer to the new **Raccoon**. It has 8 health, deals 1 damage, fires once every 2 seconds, and starts with a deliberately short 1.75-cell reach.
5. Holding Level 2 unlocks the **Potato Patch**: plant it for 1 wood and one action on Level 3. It grows after two held nights. Holding Level 4 unlocks its **Potato Gun** conversion; on Level 5, spend 3 wood and one action on the mature patch for a slow, heavy **4-damage** shot. Boars take zero damage from Stick Launcher and Arrow Shooter projectiles, so the Potato Gun is their dedicated counter. Potato Packing adds a short, non-stacking slow. The reliable opening is: launcher on Level 2, patch on Level 3, second launcher on Level 4, then harvest and convert on Level 5.
6. Holding Level 6 unlocks the **Campfire**. Build it for 4 wood before the guaranteed Level 8 **Bear**. It fires fireballs that apply a refreshable Burn; Bears take double Burn damage and only 25% of normal Potato knockback. Defeated enemies and held nights grant permanent **XP**. The first **Skill Point** arrives at **10 XP**; each later threshold doubles (**20**, **40**, **80**, …). Learning a Talent consumes Skill Points only—never a day action. Seeded Hides remain held for a future trade/food/upgrade decision.
7. The **Talent Tree** is a full-screen, data-driven tree with five branches: **Hunting** (tower damage, range, and refits), **Farming** (wood, repairs, and Garden Plots), **Building** (structure strength and fences), **Nurturing** (dawn recovery and later homestead care), and **Scouting** (Scout damage and watch range). A branch's first purchase costs 1 Skill Point, then 2, 4, 8, and so on; starting another branch still costs 1. The **Talent Guide** above the tree shows each branch's learned count, next purchase price, and affordable choices; its Ready shortcut jumps to the first learnable Talent, while sealed future rewards remain secret and only expose their next reveal level. A Talent can combine a related stat and construction unlock: **Reinforced Materials** gives every structure +2 maximum HP and unlocks Fence segments. **Garden Stewardship** unlocks Garden Plots. The tree always shows its path shape, but future talents remain neutral, sealed markers until their level reveals their real icon and effect. **Arrowcraft** reveals as the direct, 1-SP Hunting node on Level 3; damage and range become optional follow-ups. Revealed nodes use centered SVG icons plus a short effect label, while their full description appears after selection. Upgrading a damaged Stick Launcher is still a paid refit: the Arrow Shooter starts at full health.
8. The first Boar is guaranteed on Level 5 and the first Bear on Level 8. Holding Level 9 unlocks the 3-wood **Scarecrow Tower** for Level 10 planning; it only targets air, but reaches 5.5 cells. Level 11 guarantees the first 18-health **Vulture**, which flies directly to the closest targetable structure above terrain. Arrow Shooters can also attack air, but Scarecrows are the dedicated counter. New enemy families arrive no more than once every three levels, and their dedicated counter is available at least two levels earlier. The fixed 15×15 meadow has a small centered clearing and dense, walkable forest to its perimeter. A **Fence** blocks only ground paths: enemies walk around it whenever a route exists, then break the nearest reachable segment only when the fence seals every route. A broken Fence leaves an immediate gap and no wood; Vultures ignore it. Placement previews show whether a site is valid, affordable, and how costly the nearby enemy route is.
9. Medium uses a seeded **Threat Budget** that grows 25% per level, rounded up. From Level 7, the same budget arrives in tighter groups of up to three enemies with shorter gaps, so adding only basic launchers stops being a reliable late answer. Enemy and building health bars start on and can be toggled from Settings: green is full health, yellow is damaged, and red is below 30%; their length shows the exact amount. Scout has no health bar. **End Day** warns once if actions remain, then lets the player keep planning or begin the night anyway. The compact Night Record retains spawned enemies, defense damage, and homestead damage for each watch. Playback speed is a saved 1×/2×/5× preference that may be changed any time after shelter construction and only changes simulation pacing at night. Settings also holds saved Sound on/off, SFX, Music, New seed, Save, Load, and Reset controls; the browser begins audio only after the player's first click or key press.
10. The interface keeps one objective prompt at the top and no terrain inspector below the map. At desktop sizes of at least **1000px wide × 620px tall**, the status spans the top while the square meadow and active **Day Actions → Build** dock sit side by side in one screen. The larger gear button opens Settings as a focused popup, so preferences and run management take no permanent map or dock space; it holds control-size − / +, health bars, sound, planning overlay, 1×/2×/5× playback, and New seed, Save, Load, and Reset. Day Actions and Build are fixed-height horizontal icon rails: new controls scroll sideways rather than creating another row. Smaller screens use the same compact rail rule with touch-sized icons. The Build strip stays empty during the two-action shelter opening, begins with the unlocked Stick Launcher after Level 1, and adds later direct structures from level discovery or researched Talents. At night the Build strip stays in place but is disabled; rapid combat narration stays off-screen. The Talent Tree opens as a full-screen, two-axis-scrollable dependency canvas with compact icon-first nodes, curved branch links, and a selection-driven detail pane. Revealed nodes carry concise mechanical tags—such as **+1 Launcher DMG**, **Unlock Fence**, or **+1 HP / Dawn**—which repeat beside the selected talent.

## Configuration

There are no environment variables. Content tuning, Medium Threat allocation, the fixed 15×15 map and its centered clearing, combat contracts, loot ranges, and levels currently live in `engine.js`. In particular, `ENEMIES` is the single authoritative enemy roster; levels and counters reference its stable IDs rather than copying enemy stats. `talent-tree.js` is the executable Talent Tree catalog, including typed stat and `unlockBuilding` effects; `docs/talent-tree-workbench.md` is the plain-language collaboration sheet; and `talent-icons.js` with `talent-icons.html` owns the shared, viewable SVG icon catalog. `game.js` is the browser renderer, stable map-input layer, and full-screen Talent Tree overlay. `audio.js` is a browser-only sound layer: it loops the four gameplay WAVs in a fixed order—Hearth Meadow, Forest Watch, Bramble Alarm, First Light—plus generated effects, but never changes game state contracts. The shared Stick Launcher and Potato Gun artwork lives in `assets/` and is used in both the meadow and Build strip.

As the roster grows, use stable IDs—not JavaScript pointers—between a small set of catalogs: `units.js`, `enemies.js`, `buildings.js`, `levels.js`, `terrain.js`, `talent-tree.js`, and `talent-icons.js`. `engine.js` should consume those catalogs and retain only simulation/state logic. Units, enemies, and buildings are still centralized inside `engine.js` today, so extracting those three registries is the next organization refactor rather than creating duplicate sources of truth.

Mouse, Bear, and Vulture enemies plus the Scarecrow use transparent generated cutouts from `assets/` in the meadow; their small Build-strip and placement-preview representations stay CSS-driven. The Talent Tree canvas scrolls horizontally and vertically, so its deeper branch rows stay reachable.

## Audio reference sketch

[`assets/wild-hearth-title-sketch.wav`](assets/wild-hearth-title-sketch.wav) is a 55-second original title-screen music sketch: D Dorian at 68 BPM in 3/4, built from plucked strings, a small woodwind-like lead, muted string pads, and one restrained middle-section drum pulse. It is a mood reference for the homestead-at-dusk title screen, not an adaptation of an existing game track; gameplay now uses the four-track playlist below.

Regenerate it after changing the source score:

```sh
node scripts/render-title-sketch.js
```

## Soundtrack preview

[`soundtrack-preview.html`](soundtrack-preview.html) is a listen-first page for four original gameplay cues: **Hearth Meadow**, **Forest Watch**, **Bramble Alarm**, and **First Light**. They use a broad folk-fantasy palette without reproducing any existing game's music. Gameplay now plays them in that fixed order and repeats from Hearth Meadow, independent of the current game phase.

Regenerate the preview tracks after changing the source score:

```sh
node scripts/render-soundtrack.js
```

## Shared testing

The game can be published as a Codex Site for browser-based playtesting. The hosted build has no environment variables or server-side game state; each tester's save remains in their own browser.

For the live `tdgame` Worker, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. `wrangler.jsonc` deliberately publishes only `dist/`, never the repository root or `node_modules/`.

## Key commands

```sh
# Serve locally
python3 -m http.server 4173

# Check JavaScript syntax
npm run check

# Regenerate the original title-screen audio reference
node scripts/render-title-sketch.js

# Build the static Codex Site bundle
npm run build

# Run deterministic engine checks
npm test

# Run a headless first-night simulation (optional seed argument)
node simulate.js HEARTH-1042

# Inspect one deterministic set of named plans
node balance-sim.js HEARTH-1042 9

# Run the maintained 24-seed Medium balance gate
node balance-sim.js --matrix
```
