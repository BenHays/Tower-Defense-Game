# Core Loop

## Live now

- Day is untimed and starts with two day actions.
- Clearing a tree, building a defense, upgrading a launcher, repairing, and placing Scout each use one action.
- XP is permanent progress: every 8 XP earns one Skill Point. Research spends Skill Points and does not use a day action.
- Level 1 begins at a shelter site. **Construct shelter** is the only enabled first-day action; it costs 0 wood, uses the full opening day, and unlocks every other control. **End day** stays disabled until the teepee exists.
- The player ends the day with one click; unused actions do not create a confirmation. Night combat is automatic and Scout returns before the next day begins.
- Every resolved night creates a deterministic replay checkpoint and a compact Night Record for balance testing. The dawn report summarizes enemies stopped, hides earned, structure damage, and any recovery.
- Playback speed is a persistent 1×/2× run preference that can be changed any time after shelter construction; it only changes the pacing of automatic night simulation.
- Once Hearthkeeping I is researched, each surviving targetable building recovers 1 HP at dawn, capped at maximum health. A destroyed building stays destroyed.

## Proposed next

- Keep the player decision focused on expansion, placement, and research. Do not add direct night combat controls.
- Use a shared non-stacking status-effect contract for Potato slow, future Honeyed, and future Warmth rather than separate timing rules for each tower.

## Open questions

- None for the current opening; shelter construction leaves **End day** enabled so the player chooses when the first watch begins.

## Decisions made

- There is one authored map. Seeds vary encounters, not terrain.
- A level message should only explain the current objective or a new unlock.
- Research is strategic and Skill Point-only; construction remains the physical use of day actions.
- The teepee is the sole zero-cost building, but it is earned through the forced opening action rather than granted on map load.
- Night speed is a player preference, not a turn state: it survives day/night changes and save/load.
