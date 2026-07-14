# Tech Tree

## Live now

- XP comes from defeated enemies and surviving a night; every 8 XP earns one Skill Point. XP is never spent.
- `tech-tree.js` is the single editable catalog for branches, nodes, dependencies, Skill Point costs, and typed effects.
- **Scout Training I** is in the Scout branch. It reveals on Level 2, costs 1 Skill Point, and adds +1 Scout damage; **Trail Sense** follows with +0.5 watch range.
- **Huntcraft** begins with **Hardwood Throws** (+1 Stick Launcher damage), then **Longer Arm** (+0.5 range), then **Arrowcraft**. Arrowcraft enables the Arrow Shooter upgrade; **Quickcord** follows as its attack-speed refit.
- **Forager** provides **Woodland Yield** (+1 wood per tree) and **Field Mending** (+1 repair HP).
- **Fortification** provides **Hearthkeeping I** (1 HP at dawn), **Reinforced Frames** (+2 max HP), then **Bark Armor** (reduce hits above 1 damage by 1).
- **Potato Packing** is a Huntcraft side node. It gives Potato Gun hits a short, heavy, non-stacking slow; it does not stack with another Potato hit.
- Research spends Skill Points only; it never consumes a day action.
- Each node declares `requiresNodes` separately from `requiresUnlocks`; a later node can depend on another research node without confusing it with a building recipe.
- Stat effects are calculated against immutable base recipes at combat/render time, so existing Scout and towers receive their researched effect without save or replay drift.

## Proposed next

- Hivecraft: Level 6 Bee Hive research. The Hive attacks lightly and applies a visible, non-stacking Honeyed slow. Honey is a status, not a resource.
- Fungal Craft: Mushroom Launcher creates a non-stacking damage-over-time cloud.
- Hearthcraft: Level 5, Skill Point cost TBD, requires Arrowcraft, and unlocks the earned non-targetable Fire Pit. Its 1.5-cell Warmth zone slows enemies by 25% but does no damage or healing.

## Open questions

- Potato Packing’s final Skill Point cost/level and the Nature branch’s first exact node cost.

## Decisions made

- Tech nodes unlock a distinct choice, never a maintenance obligation.
- Technology opens from a compact icon into a full-screen overlay. Keep only current and directly reachable nodes visible so the tree is legible without spoiling later content.
