# Enemies

## Live now

| Enemy | Health | Approach | Counter |
| --- | ---: | --- | --- |
| Mouse | 2 | Small first-night nuisance. | Scout. |
| Raccoon | 8 | First tower-pressure enemy; attacks the closest reachable targetable building. | Stick Launcher. |
| Boar | 15 | Heavy Level 5 enemy. It takes **0 Stick Launcher or Arrow Shooter damage**. | Potato Gun. |
| Bear | 30 | Slow, high-health siege enemy. Potato knockback is only 25% effective. | Campfire Burn; Bears take 2× Burn damage. |

Enemies award XP when defeated and roll deterministic hide drops. Hides are visible inventory with no spending use until a later trade, food, or upgrade decision is designed.

## Source of truth

`engine.js` → `ENEMIES` is the only live enemy-stat catalog. The same stable IDs are referenced by `LEVELS` and `ENEMY_COUNTERS` in that file; renderer classes only provide visuals and never own combat values.

## Proposed next

- The next enemy family may arrive no earlier than Level 11, paired with the Mushroom Launcher.

## Open questions

- Bear Threat allocation after its guaranteed first-showcase night.

## Decisions made

- New enemy families arrive no more often than one every three levels. Their counter must be researchable/buildable at least two levels before their guaranteed first appearance.
- A new family’s first appearance is guaranteed rather than left to a random allocation. Later levels can mix it into the seeded Threat Budget.
- Wave direction is deterministic per seed. The early edge bag rotates north, east, south, and west before an edge repeats.
- From Level 7, waves can contain three enemies and arrive with 24–38 tick gaps. Earlier levels retain smaller, more readable groups.
- Rubble remains a route and construction blocker. If it seals every approach to a live structure, enemies break the nearest reachable rubble rather than waiting indefinitely.
