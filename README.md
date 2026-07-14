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
5. Holding Level 2 unlocks the **Potato Gun**: 3 wood and one action for a slow, heavy 3-damage shot that knocks surviving enemies back.
6. Defeated enemies and held nights grant **XP**. On Level 3, spend 6 XP on **Arrowcraft**—research costs no day action—then spend 4 wood and one action to upgrade one Stick Launcher into an Arrow Shooter (1.5× damage, tempo, and reach).
7. Forest is dense and walkable but slower than cleared ground. Enemies can enter from any usable map edge and attack the closest reachable finished building. Fire is not in the current build; it remains an earned future research path.
8. Medium uses a seeded **Threat Budget** that grows 25% per level, rounded up. Health bars are optional for buildings and enemies; Scout has no health-maintenance system.

## Configuration

There are no environment variables. Content tuning, Medium Threat allocation, fixed-map terrain, combat contracts, and levels live in `engine.js`. `tech-tree.js` holds declarative research requirements and effects. `game.js` is the browser renderer and input layer.

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
