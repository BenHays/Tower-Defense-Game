# Tech Tree

## Live now

- XP comes from defeated enemies and surviving a night.
- `tech-tree.js` is the single editable catalog for branches, nodes, dependencies, XP costs, and typed effects.
- **Scout Training I** is in the Scout branch. It reveals on Level 2, costs 4 XP, and adds +1 Scout damage.
- **Arrowcraft** is in Launcher Craft. It reveals on Level 3, costs 6 XP, requires the Stick Launcher unlock, and enables the Arrow Shooter upgrade.
- Research spends XP only; it never consumes a day action.
- Each node declares `requiresNodes` separately from `requiresUnlocks`; a later node can depend on another research node without confusing it with a building recipe.
- Stat effects are calculated against immutable base recipes at combat/render time, so existing Scout and towers receive their researched effect without save or replay drift.

## Proposed next

- Hivecraft: Bee Hive attacks lightly and applies a visible Honeyed slow. Honey is a status, not a resource.
- Fungal Craft: Mushroom Launcher creates a non-stacking damage-over-time cloud.
- Hearthcraft: unlocks the earned, non-targetable Fire Pit once its exact purpose is confirmed.

## Open questions

- XP cost, tier, and dependencies for the future Nature and Homestead branches.

## Decisions made

- Tech nodes unlock a distinct choice, never a maintenance obligation.
- Keep the compact branch selector in the game UI; do not add a large graph until there are enough live nodes to justify it.
