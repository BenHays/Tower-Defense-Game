/*
 * Wild Hearth technology catalog.
 *
 * This module is the single editable source for branches, node gates, XP
 * costs, and typed effects. The simulation reads effects without mutating
 * base unit or building recipes, so saves and replays stay deterministic.
 */
(function registerWildHearthTechTree(root, factory) {
  const techTree = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = techTree;
  root.WildHearthTechTree = techTree;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildWildHearthTechTree() {
  const BRANCHES = {
    scout: { id: "scout", label: "Scout", order: 1 },
    launcher: { id: "launcher", label: "Launcher craft", order: 2 },
  };

  const NODES = {
    scoutTraining1: {
      id: "scoutTraining1",
      label: "Scout Training I",
      branch: "scout",
      tier: 1,
      costXp: 4,
      requiredLevel: 2,
      requiresNodes: [],
      requiresUnlocks: [],
      effects: [
        { kind: "stat", target: "unit", id: "scout", stat: "damage", operation: "add", value: 1 },
      ],
      copy: "Train Scout to strike harder on every night watch.",
      completeCopy: "Scout damage rises from 1 to 2.",
    },
    arrowcraft: {
      id: "arrowcraft",
      label: "Arrowcraft",
      branch: "launcher",
      tier: 1,
      costXp: 6,
      requiredLevel: 3,
      requiresNodes: [],
      requiresUnlocks: ["stickLauncher"],
      effects: [
        { kind: "unlockBuildingUpgrade", from: "stickLauncher", to: "arrowShooter" },
      ],
      copy: "Learn to turn a built Stick Launcher into an Arrow Shooter.",
      completeCopy: "Stick Launchers can become Arrow Shooters.",
    },
  };

  function nodes() { return Object.values(NODES).slice().sort((left, right) => BRANCHES[left.branch].order - BRANCHES[right.branch].order || left.tier - right.tier || left.label.localeCompare(right.label)); }
  function node(id) { return NODES[id] || null; }
  function nodesForBranch(branch) { return nodes().filter((definition) => definition.branch === branch); }
  function isResearched(state, id) { return Array.isArray(state.research) && state.research.includes(id); }

  function validate() {
    const seenIds = new Set();
    nodes().forEach((definition) => {
      if (!definition.id || seenIds.has(definition.id)) throw new Error(`Invalid technology id: ${definition.id || "missing"}.`);
      if (!BRANCHES[definition.branch]) throw new Error(`Technology ${definition.id} has an unknown branch.`);
      if (!Number.isFinite(definition.costXp) || definition.costXp < 1) throw new Error(`Technology ${definition.id} needs a positive XP cost.`);
      if (!Number.isInteger(definition.requiredLevel) || definition.requiredLevel < 1) throw new Error(`Technology ${definition.id} has an invalid level gate.`);
      (definition.requiresNodes || []).forEach((requiredId) => {
        if (!NODES[requiredId]) throw new Error(`Technology ${definition.id} requires an unknown node.`);
      });
      seenIds.add(definition.id);
    });
    const visiting = new Set();
    const visited = new Set();
    function visit(id) {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Technology dependency cycle includes ${id}.`);
      visiting.add(id);
      (NODES[id].requiresNodes || []).forEach(visit);
      visiting.delete(id);
      visited.add(id);
    }
    Object.keys(NODES).forEach(visit);
    return true;
  }

  function availability(state, id) {
    const definition = node(id);
    if (!definition) return { available: false, reason: "Unknown research.", node: null };
    if (isResearched(state, id)) return { available: false, reason: "Researched.", node: definition };
    if ((state.levelIndex || 0) + 1 < definition.requiredLevel) return { available: false, reason: `Reveals on Level ${definition.requiredLevel}.`, node: definition };
    const missingNode = (definition.requiresNodes || []).find((requiredId) => !isResearched(state, requiredId));
    if (missingNode) return { available: false, reason: `Requires ${node(missingNode).label}.`, node: definition };
    const missingUnlock = (definition.requiresUnlocks || []).find((unlock) => !(state.unlocks || []).includes(unlock));
    if (missingUnlock) return { available: false, reason: `Requires ${missingUnlock === "stickLauncher" ? "Stick Launcher" : missingUnlock}.`, node: definition };
    if ((state.xp || 0) < definition.costXp) return { available: false, reason: `Needs ${definition.costXp - (state.xp || 0)} more XP.`, node: definition };
    return { available: true, reason: "Ready to research.", node: definition };
  }

  function research(state, id) {
    const check = availability(state, id);
    if (!check.available) return { ok: false, message: check.reason, node: check.node };
    state.xp -= check.node.costXp;
    state.research.push(id);
    return { ok: true, message: `${check.node.label} researched. ${check.node.completeCopy}`, node: check.node };
  }

  function effectsFor(state) {
    return (state.research || [])
      .map(node)
      .filter(Boolean)
      .flatMap((definition) => definition.effects.map((effect) => ({ ...effect, nodeId: definition.id })));
  }

  function statValue(state, target, id, stat, baseValue) {
    const effects = effectsFor(state).filter((effect) => effect.kind === "stat" && effect.target === target && effect.id === id && effect.stat === stat);
    let value = baseValue;
    effects.filter((effect) => effect.operation === "add").forEach((effect) => { value += effect.value; });
    effects.filter((effect) => effect.operation === "multiply").forEach((effect) => { value *= effect.value; });
    effects.filter((effect) => effect.operation === "set").forEach((effect) => { value = effect.value; });
    return value;
  }

  function hasEffect(state, predicate) { return effectsFor(state).some(predicate); }
  function hasBuildingUpgrade(state, from, to) { return hasEffect(state, (effect) => effect.kind === "unlockBuildingUpgrade" && effect.from === from && effect.to === to); }

  validate();
  return { BRANCHES, NODES, nodes, node, nodesForBranch, isResearched, availability, research, effectsFor, statValue, hasEffect, hasBuildingUpgrade, validate };
}));
