# Terrain

## Live now

- The fixed 15×15 map has a 21-cell starting clearing centered on the Scout anchor; trees cover every other cell. They slow enemies but are walkable, and the player chooses the first shelter location on open grass.
- Harvesting a tree spends one action, grants 2 wood (3 after Woodland Yield), and changes it into cleared grass.
- Both original meadow grass and cleared grass can hold defenses when unoccupied. Cleared ground is faster; trees remain a wood source and slower route.
- The placement preview exposes nearby route cost so clearing remains a deliberate trade: wood and building room can also speed a route.
- Fire is an earned defense rather than a free map object: the Campfire unlocks after Level 6 and is built on unoccupied grass.

## Proposed next

- Add water as a terrain feature, not an inventory resource. It should enable future moisture-dependent fungal or garden structures nearby.
- Keep the low-contrast flattened-grass / soil plot and visible stump. It communicates both the wood harvest and defense placement rule without looking selected; the short hatchet swing, tree shake, and wood chips make the harvest readable before the tree disappears.

## Open questions

- The first water feature's placement and whether it arrives with Fungal Craft.
- None for current grass placement. Water and future structures will define their own placement rules when introduced.

## Decisions made

- No stone resource or rock-clearing loop in the current MVP.
