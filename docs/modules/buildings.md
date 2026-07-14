# Buildings

## Live now

| Building | Cost | Role |
| --- | --- | --- |
| Branch teepee | Free, two guided Level 1 actions | Targetable homestead; can be repaired. |
| Stick Launcher | 2 wood, 1 action | 8 health; 1 hit, slow tempo, short reach. |
| Arrow Shooter | 4 wood, 1 action upgrade | 1.5× launcher damage, tempo, and reach after Arrowcraft; a paid refit starts at full health. |
| Potato Patch | 1 wood, 1 action | Non-targetable, non-blocking setup that matures after two held nights. |
| Potato Gun | 3 wood, 1 action conversion | Converts a mature Potato Patch after Level 4; 8 health, 4 hit, slow medium reach, one-cell knockback; Potato Packing adds a short non-stacking slow. |
| Campfire | 4 wood, 1 action | Unlocks after Level 6. A targetable fire tower whose fireballs apply refreshable Burn; the Bear takes 2× Burn damage. |

All defenses must be built on unoccupied grass. Both original meadow grass and grass revealed by harvesting a tree are valid; trees, water, rubble, and buildings are not.

All live building recipes use one shared contract: footprint, health, repair, targetability, path blocking, and optional combat fields. This lets future support buildings opt out of enemy targeting without creating a second building system. A targetable building can recover 1 HP at dawn once Hearthkeeping I is researched; recovery is capped at maximum health and never revives a destroyed building.

## Proposed next

- **Bee Hive:** Hivecraft research becomes available on Level 6, before its dedicated Level 8 enemy. It shoots bees for light damage and applies the longer, lighter non-stacking Honeyed slow.
- Mushroom Launcher after Fungal Craft research.

## Open questions

- Potato Gun cost, slow duration, and timing need player testing across Medium seeds.
- Bee Hive damage, Honeyed duration, and its Level 8 enemy pairing need a playtest target.

## Decisions made

- No barricade in the current progression.
- Construction completes immediately; there are no blueprints or Finish action.
- An upgrade is a paid refit: the new building type receives its full maximum health rather than preserving its damaged health fraction.
