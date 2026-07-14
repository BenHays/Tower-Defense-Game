# Wild Hearth: Hearth Meadow

A dependency-free, top-down homestead-defense MVP. Avery uses an untimed day to clear forest and build a homestead; at night towers fire outward while Scout serves as the mobile final line near the teepee.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. Every **untimed day** starts with two Avery actions. On Level 1, clear one tree: it spends both actions and grants the first 2 wood.
2. End the day. Scout can handle the first raccoon, then returns to his post. The next day starts automatically—there is no Continue button or result popup.
3. Level 1 unlocks the **Stick Launcher**. On Level 2, build it for 1 wood and Avery’s full day; it immediately fires at the nearest enemy within 2.8 cells.
4. Defeated enemies and held nights grant **XP**. On Level 3, spend 6 XP on **Arrowcraft**, then spend 4 wood and a full day to upgrade one Stick Launcher into an Arrow Shooter (1.5× damage, attack speed, and range).
5. Forest is dense and walkable but slower than cleared ground. Enemies can enter from any usable map edge and attack the closest reachable finished building. Scout catches leaks near the teepee.
6. Medium uses a seeded **Threat Budget** that grows 25% per level, rounded up. Health bars are optional for buildings and enemies; Scout has no health-maintenance system.

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
