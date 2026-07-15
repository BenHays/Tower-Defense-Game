# Learnings

## MVP scope

- The no-timer day still needs a fixed action budget: normal days have two actions, and clearing, building, repairing, upgrading, and Scout placement each use one. XP is lifetime progress; the first Skill Point arrives at 10 XP and each later total-XP threshold doubles, while Talent learning spends points without an action.
- Scout is fully automatic at night; player attention stays on daytime position, terrain, and building decisions rather than combat controls.
- Keep the lower dock in a stable order: Day Actions, unlock-driven Build, then always-visible Settings. Branding should never contain a hidden reset behavior; leave resets to an explicitly labelled control.

## Hosting

- Keep the deployed version dependency-free: copy the existing browser assets into `dist/` and serve them through the platform asset binding, so each tester retains an isolated browser-local save.
- A Cloudflare static Worker must point its `assets.directory` at `dist/`; deploying `.` uploads `node_modules` and fails the 25 MiB asset limit before the game can be published.

## Top-down expansion

- Use an authored hidden square grid. The art hides the cells, while the engine gets valid placement, footprints, four-direction paths, and range calculations.
- Trees are visually dense but walkable at a higher traversal cost; cleared ground is faster and buildable. This permits all-edge spawning without authored visible trails, while buildings and rubble remain hard blockers. If hard rubble seals every target, enemies break the nearest reachable rubble so the simulation can always settle.
- Keep map terrain fixed for now. The seed changes encounter composition, spawn edge, and arrival timing, not the world layout.

## Simulation

- Keep `engine.js` DOM-free and advance combat in fixed ticks. The browser renderer, replay function, save/load, and Node simulator then exercise the same rules.
- Keep generated audio in a browser-only `audio.js` layer. Sample pre/post fixed-tick changes for combat cues and rate-limit them, so 5× playback stays readable and sound never changes saves or deterministic simulation.
- Keep title-music references original and reproducible: a small dependency-free renderer makes the mood, instrumentation, and composition boundary explicit without importing another game's musical material.
- The opening works best with direct construction: a Stick Launcher spends its wood and one action, then exists immediately. Blueprint and Finish states add unnecessary clicks before there are complex structures.
- Keep a unit’s guard post separate from its current position. Scout’s watch radius stays centered on the day-placed post while his night state moves through idle, chase, attack, return, then automatically starts the next day.
- Use a seeded Threat Budget rather than hard-coded enemy counts. Medium grows the previous budget by 25% rounded up, while each enemy’s Threat value makes later enemy pools compatible with the same allocator.
- Keep new progression modules separate from combat simulation: XP tech should expose declarative effects and purchase validation, while the engine and UI remain separate consumers.
- A deterministic balance probe should compare named build plans before changing pressure or tower values; an upgrade that arrives after its defense line reliably falls is not a real choice.
- Keep the active resource loop narrow: wood is for construction and repair, XP produces Skill Points, and Hides are deterministic per-enemy drops held without a sink until trade, food, or upgrades creates a real choice.
- Keep planning values explicitly separate from live values. The current early wood loop pairs one cleared tree (2 wood) with one Stick Launcher (2 wood), so expansion consumes a full normal day without creating excess tower capacity.
- Keep the early Stick Launcher sturdy at 8 HP while its Arrow Shooter refit remains at 6 HP; Arrowcraft trades durability for damage, tempo, and reach instead of being a pure upgrade.
- Model cleared forest as its own terrain value rather than generic open ground. It preserves the harvested-tree visual and faster movement while both terrain values remain valid grass for building placement.
- A survival aid cannot be free by default: introduce the teepee through a forced zero-cost, full-day Level 1 shelter action, and defer fire until it is an XP-researched, wood-built safety net with one clear purpose.
- Keep `talent-tree.js` declarative and apply typed effects against immutable unit/building recipes at combat time; this keeps stacked upgrades, saves, and replay deterministic. Use the separate `talent-icons.js` registry for normalized SVG art and stable icon ids. A 1/2/4/8 branch makes an intended early unlock its branch's first purchase, so Arrowcraft is the direct 1-SP Level 3 Hunting node.
- Keep Talent Tree icons visually dominant, but never make players infer their mechanics from art alone: every node needs a compact typed-effect label and the selected detail must repeat it.
- Treat the first Skill Point as a teaching popup, then announce every later award through a renderer-only, auto-dismissed toast keyed to `skillPointsEarned`; never pause or save notification state.
- Never replace interactive grid cells during hover rendering. Keep the grid mounted and patch classes so one armed tool click followed by one map click is reliable.
- Record a compact per-night telemetry report and replay checkpoint at settlement; use it to validate balance plans before changing pressure or stats.
- Rotate deterministic wave edges before repeats and stagger units within a group. It produces all-angle pressure without sacrificing readability.
- Preserve the 25% Medium Threat Budget through the early counter showcase; increase pressure after Level 6 with tighter groups and shorter gaps instead of globally raising the budget.
- Treat a paid structure upgrade as a full refit: the new recipe starts at maximum health. That makes upgrade timing a visible recovery decision without adding a separate free repair action.
- Keep overnight recovery as a declarative tech effect: Hearthkeeping I heals each surviving targetable building by one at dawn, with no resurrection path.
- Introduce a new enemy family through a guaranteed showcase, then fold it into the seeded Threat Budget. Its counter should be buildable at least two levels in advance and new families should be spaced three levels apart.
- Put repeatable enemy-control effects behind one non-stacking status contract. Potato slow is short and heavy; Honeyed and Warmth can later be longer/lighter variants without ambiguous stacking.
- Keep guidance in one place: the HUD owns the current objective and the map stays visual. Avoid a separate terrain inspector when the selected action, map preview, and contextual repair/upgrade controls already explain the decision.
- Derive central anchors from the board dimensions. The 15×15 meadow preserves the 21-cell opening and Scout's relative post while gaining a dense outer ring; board-size changes also require a save-version bump and a renderer grid update.
- Treat toolbar density as a browser preference, not game state. Discrete compact, standard, and large layout tokens preserve clickable controls and interaction flow without making a strategy decision depend on a screen setting.
- Keep day actions and the Build strip spatially stable through the night. Disabled controls preserve orientation, while fast combat events belong in animation and telemetry rather than a notification strip the player cannot read.
- Drive the Build strip from `state.unlocks`: it should show only unlocked, directly constructible structures, beginning with Stick Launcher and growing horizontally as new construction unlocks arrive.
- Keep the Build strip as a one-row rail of square, icon-first tiles. Fixed tile dimensions and horizontal scrolling let the roster expand without making the play dock taller or less readable.
- Start enemy and building health bars on, and keep their toggle visible in both phases. Persist only an explicit player choice, so old saved preferences from the former off-by-default state migrate to visible bars; Scout remains bar-free.
- Position building health bars above the sprite silhouette, not on its roof. The generated shelter and tower art needs a negative bar offset so the bar stays readable at a glance.
- Keep End Day decisive but safe: one concise warning per day catches an accidental early watch; after that the player can end the day without repeated interruption.
- Speed is a renderer pacing preference, not simulation math: keep fixed ticks and raise the per-frame catch-up cap enough for the fastest supported setting.
- Use each generated tower portrait in both its meadow entity and Build-strip tile. This keeps purchase decisions visually connected to their placed defense while projectile and firing state stay CSS-driven.
- When replacing a generated raster at the same static URL, bump its CSS query token so browsers do not retain an obsolete background-baked version from cache.

## Progression and occupancy

- Use high-contrast generated cutouts for key enemies and towers, then render them as CSS backgrounds; keep the small Build and placement representations CSS-driven.
- Keep the Talent Tree's dependency canvas horizontally expansive but give its viewport a fixed, two-axis scroll area so later branch rows remain reachable.
- A scroll viewport needs a constrained parent as well as `overflow: auto`: desktop Talent Tree branches use a `minmax(0, 1fr)` grid row, while mobile gets an explicit viewport height.
- Compact long-lived Talent Trees by shrinking square node tracks and connector gaps first; preserve large-enough icons and the scroll viewport instead of hiding future depth.

- Scout reserves only the day-placed watch post: construction and Scout placement reject overlaps, while enemies still target only real targetable buildings and Scout retains no health economy.
- Keep the Talent Tree catalog declarative by branch: Hunting, Farming, Building, Nurturing, and Scouting use node dependencies, shared icon ids, and typed effects so combat and daytime actions stay generic; calculate 1, 2, 4, 8 Skill Point costs from each branch's purchase count.
- Render that declarative tech data as one two-axis-scrollable dependency canvas. Nodes should spend their space on an icon and small cost badge, while the detail pane carries the longer explanation.
- Roll hide drops from a seed, level id, and enemy id rather than runtime randomness. Saves and replay checksums can then reproduce rewards exactly.
- A free starter tool can teach a verb without becoming a new resource: clicking a map stick and rock unlocks Craft Axe for the first opening action, then unlocks Harvest Tree and the normal wood loop.
- Use a non-targetable, non-blocking Potato Patch to reserve a future tower site. Dawn-counted growth keeps the conversion timing deterministic for saves, replays, and the Level 5 Boar counter.
- Render the hatchet swing as a short UI-only overlay after the deterministic harvest resolves; the feedback stays satisfying without becoming simulation state.
- Use one click listener per grid cell. Combining pointer-down and click activation can spend two day actions for one physical land click after the renderer updates.
- A two-step map placement action must make its armed state visually dominant. The shelter still needs a map-site click by design, so its selected button changes to “Choose shelter site” and must not be overridden by an idle opening-button style.
- A staged opening action needs three visibly separate states: locked, ready to select, and armed for a map click. Reset the selected tool after crafting the hatchet so the newly revealed shelter action cannot appear armed by accident.
- Keep harvest feedback renderer-only: a 1.6-second high-to-low axe translation (raised above a standing tree → embedded in its lower trunk → chip burst) can play above the already-resolved terrain without changing saves, replays, or action cost. Reduced-motion mode still needs two readable poses—raised, then impact—rather than hiding the feedback altogether.
- Animations cannot live in a layer that the main render loop replaces every frame: place transient visual effects in a persistent overlay layer so CSS keyframes advance instead of restarting at their first pose.
- Keep counter rules declarative in the enemy recipe: projectile damage multipliers, knockback multipliers, and status-damage multipliers let Boar immunity and Bear fire weakness work without tower-specific enemy conditionals. A reusable status tick can handle Burn damage over time while preserving deterministic replay.
- Treat air as a target layer, not a separate combat loop: declarative tower target layers let Arrow Shooters stay flexible while Scarecrows specialize, and direct-flight enemies can bypass ground pathing without changing projectile resolution.
