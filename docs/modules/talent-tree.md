# Talent Tree

## Live contract

- XP earns Skill Points at total-XP milestones of 10, 20, 40, 80, and beyond; XP is never spent.
- [`talent-tree.js`](../../talent-tree.js) is the runtime catalog for branches, nodes, dependencies, icon ids, and typed effects.
- [`talent-icons.js`](../../talent-icons.js) is the one icon catalog. Each entry uses a normalized SVG viewBox, so node art stays centered; [`talent-icons.html`](../../talent-icons.html) is its viewable gallery.
- A branch's first, second, third, and fourth purchases cost 1, 2, 4, and 8 Skill Points. Branches price independently.
- The five player-facing branches are **Hunting**, **Farming**, **Building**, **Nurturing**, and **Scouting**.
- Learning a Talent costs Skill Points only, never a day action. Nodes appear in an icon-first horizontal canvas; selecting one reveals its precise effect and prerequisites in the detail pane.

## Collaboration

- Use [`../talent-tree-workbench.md`](../talent-tree-workbench.md) to propose nodes in plain language. Once approved, translate the row into a typed, tested node in `talent-tree.js`.
- A new node needs a stable id, branch, level gate, prerequisite(s), icon id, and one clear effect. Do not hand-enter a Skill Point price; branch pricing is calculated from purchased nodes.

## Current paths

- Hunting: Arrow Shooter conversion as the first Level 3 choice, then optional Stick Launcher damage/range, refit, and Potato slow.
- Farming: more wood per harvested tree and stronger repairs.
- Building: maximum HP and armor for targetable structures.
- Nurturing: dawn recovery for standing structures; later homestead, animal, and plant care belong here.
- Scouting: Scout damage and watch range.
