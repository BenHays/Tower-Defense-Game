/*
 * Wild Hearth Talent Icons
 *
 * This is the one visual catalog for the Talent Tree. Add an icon here first,
 * then reference its id from talent-tree.js. Each drawing shares the same
 * 48 x 48 viewBox, so it remains visually centered in a talent node and in
 * the icon gallery.
 */
(function registerWildHearthTalentIcons(root, factory) {
  const icons = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = icons;
  root.WildHearthTalentIcons = icons;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildWildHearthTalentIcons() {
  const ICONS = {
    launcherDamage: { label: "Launcher damage", parts: [{ tag: "circle", cx: 24, cy: 24, r: 15 }, { tag: "path", d: "M24 5v10M24 33v10M5 24h10M33 24h10M19 24h10M24 19v10" }] },
    launcherRange: { label: "Launcher range", parts: [{ tag: "path", d: "M10 38 38 10M25 10h13v13M10 30v8h8" }, { tag: "circle", cx: 10, cy: 38, r: 3 }], offsetY: -1 },
    arrowcraft: { label: "Arrowcraft", parts: [{ tag: "path", d: "m8 39 27-27M28 12h7v7M13 34l-5 5M18 29l-5 5" }, { tag: "path", d: "m31 9 8 1-1 8" }] },
    quickcord: { label: "Quickcord", parts: [{ tag: "path", d: "M9 15c6-7 12 7 18 0s12 7 12 7M9 26c6-7 12 7 18 0s12 7 12 7M9 37c6-7 12 7 18 0s12 7 12 7" }] },
    potatoPacking: { label: "Potato packing", parts: [{ tag: "path", d: "M16 19c-5 7-4 18 5 20 11 3 19-7 15-18-3-8-14-8-20-2Z" }, { tag: "path", d: "M24 18c-2-7 3-10 9-11-1 6-4 10-9 11ZM19 17c-5-4-7-1-9 2 4 2 7 2 9-2Z" }, { tag: "circle", cx: 22, cy: 29, r: 1.25, fill: "currentColor", stroke: "none" }, { tag: "circle", cx: 30, cy: 31, r: 1.25, fill: "currentColor", stroke: "none" }] },
    woodlandYield: { label: "Woodland yield", parts: [{ tag: "path", d: "M24 42V28M18 42h12M14 28h20L24 8 14 28ZM11 34h26L24 16 11 34Z" }] },
    fieldMending: { label: "Field mending", parts: [{ tag: "path", d: "M24 9v30M9 24h30" }, { tag: "path", d: "M13 13h22v22H13z" }] },
    gardenStewardship: { label: "Garden stewardship", parts: [{ tag: "path", d: "M9 39h30M14 39V24M24 39V16M34 39V24" }, { tag: "path", d: "M12 24c3-6 8-6 12 0-5 4-8 4-12 0ZM22 16c3-6 8-6 12 0-5 4-8 4-12 0ZM26 24c3-6 8-6 12 0-5 4-8 4-12 0Z" }] },
    hearthkeeping: { label: "Hearthkeeping", parts: [{ tag: "path", d: "M9 24 24 10l15 14v16H9V24Z" }, { tag: "path", d: "M20 40V29h8v11M32 17v-7h5v12" }] },
    reinforcedFrames: { label: "Reinforced frames", parts: [{ tag: "path", d: "M10 10h28v28H10zM17 17h14v14H17zM10 10l7 7m21-7-7 7m7 21-7-7m-21 7 7-7" }] },
    barkArmor: { label: "Bark armor", parts: [{ tag: "path", d: "M24 7 39 13v10c0 10-6 16-15 19C15 39 9 33 9 23V13l15-6Z" }, { tag: "path", d: "M24 13v22M16 18l8 6 8-6M16 30l8 5 8-5" }] },
    scoutTraining: { label: "Scout training", parts: [{ tag: "circle", cx: 24, cy: 28, r: 7 }, { tag: "circle", cx: 13, cy: 19, r: 3 }, { tag: "circle", cx: 20, cy: 12, r: 3 }, { tag: "circle", cx: 29, cy: 12, r: 3 }, { tag: "circle", cx: 36, cy: 19, r: 3 }] },
    trailSense: { label: "Trail sense", parts: [{ tag: "path", d: "M6 24s7-12 18-12 18 12 18 12-7 12-18 12S6 24 6 24Z" }, { tag: "circle", cx: 24, cy: 24, r: 5 }, { tag: "path", d: "m31 31 8 8" }] },
  };

  function icon(id) { return ICONS[id] || null; }
  function list() { return Object.entries(ICONS).map(([id, definition]) => ({ id, ...definition })); }

  return { ICONS, icon, list };
}));
