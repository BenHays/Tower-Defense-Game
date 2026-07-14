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

1. Level 1 begins at a shelter site. **Construct shelter** is the only available action; it is free and uses the first full day.
2. End the day. Scout handles the first raccoon, then returns to the watch post. The next day starts automatically—there is no Continue button or result popup.
3. Every normal day has two actions. Clearing a tree, placing Scout, building a tower, repairing, and upgrading each use **one** action. Clearing grants **2 wood** and turns the tree into open grass.
4. Level 1 unlocks the **Stick Launcher**. On Level 2, clear a tree and build it for 2 wood on any unoccupied grass cell in the same day. It deals 1 damage, fires once every 2 seconds, and has short reach.
5. Holding Level 2 unlocks the **Potato Gun**: 3 wood and one action for a slow, heavy 3-damage shot. Its later **Potato Packing** research gives each hit a short, non-stacking slow; it is the clear answer to the Level 5 Boar.
6. Defeated enemies and held nights grant **XP**. **Scout Training I** appears on Level 2 for 4 XP and gives Scout +1 damage; **Arrowcraft** appears on Level 3 for 6 XP and unlocks the Arrow Shooter. Research costs XP only—never a day action. Upgrading a damaged Stick Launcher is a paid refit: the Arrow Shooter starts at full health.
7. **Hearthkeeping I** appears on Level 4 for 5 XP. At the next dawn, every surviving targetable building recovers 1 health, up to its maximum. It never rebuilds a destroyed structure.
8. The first Boar is guaranteed on Level 5. New enemy families arrive no more than once every three levels, and their dedicated counter is available at least two levels earlier. Forest is dense and walkable but slower than cleared ground. Placement previews show whether a site is valid, affordable, and how costly the nearby enemy route is.
9. Medium uses a seeded **Threat Budget** that grows 25% per level, rounded up. Health bars are optional; the compact Night Record retains spawned enemies, defense damage, and homestead damage for each watch. Playback speed is a saved 1×/2× preference that may be changed any time after shelter construction and only changes simulation pacing at night.

## Configuration

There are no environment variables. Content tuning, Medium Threat allocation, fixed-map terrain, combat contracts, and levels live in `engine.js`. `tech-tree.js` is the editable catalog of branches, node dependencies, XP costs, and typed effects. `game.js` is the browser renderer, stable map-input layer, and full-screen Technology overlay.

## Key commands

```sh
# Serve locally
python3 -m http.server 4173

# Check JavaScript syntax
node --check engine.js && node --check game.js && node --check simulate.js

# Run deterministic engine checks
node test-engine.js

# Run a headless first-night simulation (optional seed argument)
node simulate.js HEARTH-1042

# Compare deterministic one-launcher, spread, and Arrowcraft plans
node balance-sim.js HEARTH-1042 9
```
