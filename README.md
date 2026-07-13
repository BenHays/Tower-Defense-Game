# Mossy Nook: First Watch

A tiny browser MVP for a homestead tower-defense game: prepare fences and the chicken coop by day, then let a loyal dog defend it from one raccoon at night.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. During the short **day** phase, select a fence or the coop and spend supplies to repair it.
2. Press **Start night** whenever you are ready.
3. At night, one raccoon follows the path to the coop. The dog automatically intercepts it; fences buy time.
4. Survive the raid to complete Level 1. Use **Play again** to reset the test loop.

## Configuration

There are no environment variables. Level tuning lives near the top of `game.js` in the `LEVEL_ONE` constants.

## Key commands

```sh
# Serve locally
python3 -m http.server 4173

# Check JavaScript syntax
node --check game.js
```
