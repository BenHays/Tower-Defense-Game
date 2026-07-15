# Core Loop

## Live now

- Day is untimed and starts with two day actions. One living Garden raises the next dawn to three actions; the first Garden implementation caps this at +1 total.
- Harvesting a tree, building a defense, converting a mature patch, repairing, and placing Scout each use one action.
- XP is permanent progress: the first Skill Point arrives at 10 XP, then thresholds double to 20, 40, 80, and beyond. Talent learning spends Skill Points and does not use a day action.
- Level 1 begins with a clickable stick and rock in the starting clearing. Both pickups are free. **Craft axe** becomes available after both are collected and uses one action; **Place shelter** then uses the second action on any unoccupied grass cell. The guided pair unlocks every normal control. **End day** stays disabled until the teepee exists.
- If actions remain, the first End Day click that day asks the player whether to keep planning or begin the night anyway; the reminder appears only once per day. Night combat is automatic and Scout returns before the next day begins.
- Every resolved night creates a deterministic replay checkpoint and a compact Night Record for balance testing. The dawn report summarizes enemies stopped, hides earned, structure damage, and any recovery.
- Playback speed is a persistent 1×/2×/5× run preference that can be changed any time after shelter construction; it only changes the pacing of automatic night simulation.
- Once Hearthkeeping I is learned, each surviving targetable building recovers 1 HP at dawn, capped at maximum health. A destroyed building stays destroyed.

## Proposed next

- Keep the player decision focused on expansion, placement, and Talent Tree choices. Do not add direct night combat controls.
- Use the shared status-effect contract for Potato slow, Campfire Burn, and future Honeyed rather than separate timing rules for each tower. Burn refreshes rather than stacking and its periodic damage can be modified by the enemy recipe.

## Open questions

- None for the current opening; the second guided action leaves **End day** enabled so the player chooses when the first watch begins.

## Decisions made

- There is one authored map. Seeds vary encounters, not terrain.
- A level message should only explain the current objective or a new unlock.
- Talent learning is strategic and Skill Point-only; construction remains the physical use of day actions. A researched construction unlock appears in Build once and can then be built repeatedly with wood and actions.
- The teepee is the sole zero-cost building, earned through the second of two guided opening actions rather than granted on map load.
- Night speed is a player preference, not a turn state: it survives day/night changes and save/load.
