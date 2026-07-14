# Tech Tree

## Live now

- XP comes from defeated enemies and surviving a night.
- `tech-tree.js` is the single editable catalog for branches, nodes, dependencies, XP costs, and typed effects.
- **Scout Training I** is in the Scout branch. It reveals on Level 2, costs 4 XP, and adds +1 Scout damage.
- **Arrowcraft** is in Launcher Craft. It reveals on Level 3, costs 6 XP, requires the Stick Launcher unlock, and enables the Arrow Shooter upgrade.
- **Hearthkeeping I** is in the Homestead branch. It reveals on Level 4, costs 5 XP, and makes each surviving targetable building recover 1 HP at the next dawn (capped at maximum health).
- **Potato Packing** is a later Launcher Craft node. It gives Potato Gun hits a short, heavy, non-stacking slow; it does not stack with another Potato hit.
- Research spends XP only; it never consumes a day action.
- Each node declares `requiresNodes` separately from `requiresUnlocks`; a later node can depend on another research node without confusing it with a building recipe.
- Stat effects are calculated against immutable base recipes at combat/render time, so existing Scout and towers receive their researched effect without save or replay drift.

## Proposed next

- Hivecraft: Level 6 Bee Hive research. The Hive attacks lightly and applies a visible, non-stacking Honeyed slow. Honey is a status, not a resource.
- Fungal Craft: Mushroom Launcher creates a non-stacking damage-over-time cloud.
- Hearthcraft: Level 5, 8 XP, requires Arrowcraft, and unlocks the earned non-targetable Fire Pit. Its 1.5-cell Warmth zone slows enemies by 25% but does no damage or healing.

## Open questions

- Potato Packing’s final XP cost/level and the Nature branch’s first exact node cost.

## Decisions made

- Tech nodes unlock a distinct choice, never a maintenance obligation.
- Technology opens from a compact icon into a full-screen overlay. Keep only current and directly reachable nodes visible so the tree is legible without spoiling later content.
