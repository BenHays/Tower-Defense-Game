/*
 * Wild Hearth technology rules.
 *
 * This module is deliberately declarative: it owns research requirements and
 * effects, while the simulation and browser remain separate consumers.
 */
(function registerWildHearthTechTree(root, factory) {
  const techTree = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = techTree;
  root.WildHearthTechTree = techTree;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildWildHearthTechTree() {
  const NODES = {
    arrowcraft: {
      id: "arrowcraft",
      label: "Arrowcraft",
      branch: "Launcher craft",
      costXp: 6,
      requiredLevel: 3,
      requires: ["stickLauncher"],
      effects: { unlocksBuildingUpgrade: "arrowShooter" },
      copy: "Learn to turn a built Stick Launcher into an Arrow Shooter.",
    },
  };

  function node(id) { return NODES[id] || null; }
  function isResearched(state, id) { return Array.isArray(state.research) && state.research.includes(id); }

  function availability(state, id) {
    const definition = node(id);
    if (!definition) return { available: false, reason: "Unknown research." };
    if (isResearched(state, id)) return { available: false, reason: "Already researched.", node: definition };
    if ((state.levelIndex || 0) + 1 < definition.requiredLevel) return { available: false, reason: `Reveals after Level ${definition.requiredLevel - 1}.`, node: definition };
    if (!definition.requires.every((unlock) => state.unlocks.includes(unlock))) return { available: false, reason: "Requires the Stick Launcher lesson.", node: definition };
    if ((state.xp || 0) < definition.costXp) return { available: false, reason: `Needs ${definition.costXp - (state.xp || 0)} more XP.`, node: definition };
    return { available: true, reason: "Ready to research.", node: definition };
  }

  function research(state, id) {
    const check = availability(state, id);
    if (!check.available) return { ok: false, message: check.reason, node: check.node || node(id) };
    state.xp -= check.node.costXp;
    state.research.push(id);
    return { ok: true, message: `${check.node.label} researched: Arrow Shooters can now be built from existing launchers.`, node: check.node };
  }

  function effectsFor(state) {
    const effects = {};
    (state.research || []).forEach((id) => {
      const definition = node(id);
      if (definition) Object.assign(effects, definition.effects);
    });
    return effects;
  }

  return { NODES, node, isResearched, availability, research, effectsFor };
}));
