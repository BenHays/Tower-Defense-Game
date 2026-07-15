# Talent Tree

## Live contract

- XP earns Skill Points at total-XP milestones of 10, 20, 40, 80, and beyond; XP is never spent.
- [`talent-tree.js`](../../talent-tree.js) is the runtime catalog for branches, nodes, dependencies, icon ids, and typed effects.
- [`talent-icons.js`](../../talent-icons.js) is the one icon catalog. Each entry uses a normalized SVG viewBox, so node art stays centered; [`talent-icons.html`](../../talent-icons.html) is its viewable gallery.
- A branch's first, second, third, and fourth purchases cost 1, 2, 4, and 8 Skill Points. Branches price independently.
- The five player-facing branches are **Hunting**, **Farming**, **Building**, **Nurturing**, and **Scouting**.
- Learning a Talent costs Skill Points only, never a day action. Nodes appear in an icon-first horizontal canvas with a concise mechanical tag (for example, `+1 Launcher DMG`); selecting one repeats its precise effect and prerequisites in the detail pane.
- The Talent Guide is renderer-only navigation over the catalog. It summarizes learned/total nodes, each branch's independent next cost, affordable counts, XP toward the next Skill Point, and the next sealed reveal level. Its shortcuts select and scroll to catalog nodes without changing saves or research rules.

## Collaboration

- Use [`../talent-tree-workbench.md`](../talent-tree-workbench.md) to propose nodes in plain language. Once approved, translate the row into a typed, tested node in `talent-tree.js`.
- A new node needs a stable id, branch, level gate, prerequisite(s), icon id, and clear effect list. Do not hand-enter a Skill Point price; branch pricing is calculated from purchased nodes. A node may combine a compatible passive and an `unlockBuilding` effect, such as Reinforced Materials giving +2 structure HP while unlocking Fence.

## Current paths

- Hunting: Arrow Shooter conversion as the first Level 3 choice, then optional Stick Launcher damage/range, refit, and Potato slow.
- Farming: more wood per harvested tree, stronger repairs, and Garden Stewardship. Garden unlocks a Garden Plot whose survival earns +1 next-day action (initial cap +1 total).
- Building: Reinforced Materials grants every structure +2 maximum HP and unlocks Fence; Bark Armor remains the later durability follow-up.
- Nurturing: dawn recovery for standing structures; later homestead, animal, and plant care belong here.
- Scouting: Scout damage and watch range.
