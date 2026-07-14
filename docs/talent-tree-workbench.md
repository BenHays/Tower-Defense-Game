# Talent Tree Workbench

This is the collaboration sheet for the Talent Tree. Add ideas to **Proposal queue** below; when an idea is approved, it moves into the live catalog in [`talent-tree.js`](../talent-tree.js). The game uses that JavaScript catalog so every effect stays deterministic and testable.

## Rules already decided

- XP creates Skill Points at total-XP milestones: **10, 20, 40, 80, 160…**
- Each branch prices itself: first purchase **1 SP**, then **2**, **4**, **8**, and so on.
- Learning a talent never costs a day action.
- Every talent needs one clear player-facing benefit, an icon id from [`talent-icons.js`](../talent-icons.js), and a sensible counter/progression purpose.

## Branch map

| Branch | Job | Live examples |
| --- | --- | --- |
| Hunting | Make offensive towers hit harder, farther, or differently. | Stick Launcher damage, Arrow Shooter, Potato slow |
| Farming | Improve harvesting and daytime upkeep. | More wood per tree, stronger repairs |
| Building | Make structures tougher. | More maximum HP, armor |
| Nurturing | Keep the homestead healthy over time. | Dawn regeneration; later animal/plant care fits here |
| Scouting | Improve Scout’s night-watch effectiveness. | Damage and watch radius |

## Live talents

| Talent | Branch | Level | Requires | Player gets | Icon id |
| --- | --- | ---: | --- | --- | --- |
| Hardwood Throws | Hunting | 2 | Stick Launcher | +1 Stick Launcher damage | `launcherDamage` |
| Longer Arm | Hunting | 3 | Hardwood Throws | +0.5 launcher range | `launcherRange` |
| Arrowcraft | Hunting | 3 | Longer Arm | Unlock Arrow Shooter refit | `arrowcraft` |
| Quickcord | Hunting | 4 | Arrowcraft | Unlock Arrow Shooter speed refit | `quickcord` |
| Potato Packing | Hunting | 4 | Potato Gun | Potato hits slow enemies | `potatoPacking` |
| Woodland Yield | Farming | 2 | — | +1 wood per harvested tree | `woodlandYield` |
| Field Mending | Farming | 3 | Woodland Yield | +1 HP per repair | `fieldMending` |
| Reinforced Frames | Building | 4 | — | +2 maximum structure HP | `reinforcedFrames` |
| Bark Armor | Building | 5 | Reinforced Frames | Heavy hits deal 1 less damage | `barkArmor` |
| Hearthkeeping I | Nurturing | 3 | — | Structures regenerate 1 HP at dawn | `hearthkeeping` |
| Scout Training I | Scouting | 2 | — | +1 Scout damage | `scoutTraining` |
| Trail Sense | Scouting | 3 | Scout Training I | +0.5 Scout watch radius | `trailSense` |

## Proposal queue — add your ideas here

| Talent name | Branch | Earliest level | Requires | What it does, in plain language | Icon idea | Status |
| --- | --- | ---: | --- | --- | --- | --- |
|  |  |  |  |  |  | Idea |
|  |  |  |  |  |  | Idea |
|  |  |  |  |  |  | Idea |

## What makes an idea ready to implement

1. Put it in one branch and give it one main job.
2. State the exact number or unlock it grants, such as `+1 damage`, `+0.5 range`, or `unlocks Bee Hive`.
3. Choose an earliest level and prerequisite so it arrives before the enemy/problem it answers.
4. Pick an existing icon id, or add a requested new icon to the proposal.
5. Mark its status **Ready**. I will translate it into a tested effect in [`talent-tree.js`](../talent-tree.js).

## Visual assets

- Runtime icon catalog: [`talent-icons.js`](../talent-icons.js)
- Browser gallery: open [`talent-icons.html`](../talent-icons.html) locally to see every icon and its id.
- Live runtime catalog: [`talent-tree.js`](../talent-tree.js)
