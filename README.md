# Wild Hearth: Hearth Meadow

A dependency-free, top-down homestead-defense MVP. Avery uses an untimed day to clear a forest, gather wood/stone, repair or build; at night Scout automatically defends the closest reachable buildings from seeded invasions.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. Every **untimed day** starts with two Avery actions. Select a tool, then click the hidden-square meadow to clear a tree/boulder, repair, finish a blueprint, or place Scout.
2. Clearing a tree grants wood; clearing a boulder grants stone. Wood repairs/builds, while stone reinforces the teepee after it is unlocked.
3. Select **End day** when the plan is ready. Avery goes inside; at night Scout automatically attacks enemies inside his placed range.
4. Enemies use four-direction paths through fixed animal trails and attack the closest reachable finished building. A barricade placed near a trail is the boar's direct counter.
5. Level 1 unlocks the barricade, Level 2 unlocks stonework, and Level 3 unlocks recorded replay verification. The map is fixed; the visible seed varies enemy composition, entry edges, and arrival timing.

## Configuration

There are no environment variables. Content tuning, fixed-map terrain, combat contracts, and levels live in `engine.js`. `game.js` is the browser renderer and input layer.

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
```
