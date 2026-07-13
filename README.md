# Wild Hearth: First Night

A tiny browser MVP for a top-down homestead defense game: Avery and Scout protect a hand-built branch teepee in the middle of a quiet, expandable meadow.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. During the short **day** phase, mend the teepee if it needs attention.
2. Press **Start night** whenever you are ready.
3. At night, one raccoon enters naturally from the forest edge. Scout automatically turns it away.
4. Survive the raid to complete Level 1. Each replay uses a different perimeter approach, while keeping the test deterministic.

## Configuration

There are no environment variables. Level tuning lives near the top of `game.js` in the `LEVEL_ONE` constants.

## Key commands

```sh
# Serve locally
python3 -m http.server 4173

# Check JavaScript syntax
node --check game.js
```
