# Wild Hearth: Hearth Meadow

A dependency-free, top-down homestead-defense MVP. Use untimed day actions to clear forest for wood and build on any unoccupied grass; at night towers fire automatically while Scout serves as the mobile final line at the hearth.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. Every **untimed day** starts with two day actions. On Level 1, clear one tree: it spends both actions, grants **1 wood**, and turns that tree into open grass.
2. End the day. Scout handles the first raccoon, then returns to the watch post. The next day starts automatically—there is no Continue button or result popup.
3. Level 1 unlocks the **Stick Launcher**. On Level 2, build it for 1 wood and the full day on any unoccupied grass cell. It deals 1 damage, fires once every 2 seconds, and has short reach.
4. Holding Level 2 unlocks the **Potato Gun**: 3 wood and a full day for a slow, heavy 3-damage shot that knocks surviving enemies back.
5. Defeated enemies and held nights grant **XP**. On Level 3, spend 6 XP on **Arrowcraft**, then spend 4 wood and a full day to upgrade one Stick Launcher into an Arrow Shooter (1.5× damage, tempo, and reach).
6. Forest is dense and walkable but slower than cleared ground. Enemies can enter from any usable map edge and attack the closest reachable finished building. The permanent hearth fire slows enemies in its small warmth zone; Scout catches leaks nearby.
7. Medium uses a seeded **Threat Budget** that grows 25% per level, rounded up. Health bars are optional for buildings and enemies; Scout has no health-maintenance system.

## Configuration

There are no environment variables. Content tuning, Medium Threat allocation, fixed-map terrain, combat contracts, campfire aura, and levels live in `engine.js`. `tech-tree.js` holds declarative research requirements and effects. `game.js` is the browser renderer and input layer.

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
