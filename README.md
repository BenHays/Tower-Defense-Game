# Wild Hearth: First Shelter

A tiny browser MVP for a top-down homestead tower-defense game: build outward from a hand-built branch teepee by day, then let Scout defend it from a raccoon at night.

## Setup

No package install or environment variables are required. Any modern browser can run the prototype.

## Run locally

From this directory, start a static file server:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). You can also open `index.html` directly, though a static server is preferable for browser testing.

## How to play

1. During the short **day** phase, select one of four radial build sites around the branch teepee.
2. Spend one branch bundle to build a two-strength stick screen in the announced raid direction.
3. Press **Start night** whenever you are ready.
4. At night, one raccoon comes directly through the marked woods. Scout automatically fights at a screen; without the right screen, the raccoon reaches the teepee.
5. Survive the raid to complete Level 1. **Try the next direction** cycles the test raid north → east → south → west.

## Configuration

There are no environment variables. Level tuning lives near the top of `game.js` in the `LEVEL_ONE` constants.

## Key commands

```sh
# Serve locally
python3 -m http.server 4173

# Check JavaScript syntax
node --check game.js
```
