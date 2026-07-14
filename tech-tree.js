/*
 * Wild Hearth technology catalog.
 *
 * This module is the single editable source for branches, dependencies,
 * icons, and typed effects. Experience earns Skill Points in the engine;
 * a branch's purchase count sets its next research cost.
 */
(function registerWildHearthTechTree(root, factory) {
  const techTree = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = techTree;
  root.WildHearthTechTree = techTree;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildWildHearthTechTree() {
  const BRANCHES = {
    huntcraft: { id: "huntcraft", label: "Huntcraft", order: 1 },
    forager: { id: "forager", label: "Forager", order: 2 },
    fortification: { id: "fortification", label: "Fortification", order: 3 },
    scout: { id: "scout", label: "Scout", order: 4 },
  };

  const NODES = {
    hardwoodThrows: {
      id: "hardwoodThrows",
      label: "Hardwood Throws",
      branch: "huntcraft",
      tier: 1,
      icon: "✹",
      requiredLevel: 2,
      requiresNodes: [],
      requiresUnlocks: ["stickLauncher"],
      effects: [{ kind: "stat", target: "building", id: "stickLauncher", stat: "damage", operation: "add", value: 1 }],
      copy: "Select straighter, heavier branches for every Stick Launcher.",
      completeCopy: "Stick Launcher damage rises from 1 to 2.",
    },
    launcherRange: {
      id: "launcherRange",
      label: "Longer Arm",
      branch: "huntcraft",
      tier: 2,
      icon: "↗",
      requiredLevel: 3,
      requiresNodes: ["hardwoodThrows"],
      requiresUnlocks: [],
      effects: [{ kind: "stat", target: "building", id: "stickLauncher", stat: "attackRange", operation: "add", value: 0.5 }],
      copy: "Lengthen the launcher arm for a slightly wider first line.",
      completeCopy: "Stick Launcher range increases by 0.5 cells.",
    },
    arrowcraft: {
      id: "arrowcraft",
      label: "Arrowcraft",
      branch: "huntcraft",
      tier: 3,
      icon: "➶",
      requiredLevel: 3,
      requiresNodes: ["launcherRange"],
      requiresUnlocks: [],
      effects: [{ kind: "unlockBuildingUpgrade", from: "stickLauncher", to: "arrowShooter" }],
      copy: "Learn to turn a built Stick Launcher into an Arrow Shooter.",
      completeCopy: "Stick Launchers can become Arrow Shooters.",
    },
    quickcord: {
      id: "quickcord",
      label: "Quickcord",
      branch: "huntcraft",
      tier: 4,
      icon: "≈",
      requiredLevel: 4,
      requiresNodes: ["arrowcraft"],
      requiresUnlocks: [],
      effects: [{ kind: "unlockBuildingRefit", building: "arrowShooter", refit: "quickcord" }],
      copy: "Learn a taut bowcord refit for one selected Arrow Shooter.",
      completeCopy: "Arrow Shooters can receive the Quickcord attack-speed refit.",
    },
    potatoPacking: {
      id: "potatoPacking",
      label: "Potato Packing",
      branch: "huntcraft",
      tier: 2,
      icon: "●",
      requiredLevel: 4,
      requiresNodes: [],
      requiresUnlocks: ["potatoGun"],
      effects: [{
        kind: "onHitStatus",
        sourceTarget: "building",
        sourceId: "potatoGun",
        status: "movementSlow",
        statusSource: "potatoPacking",
        durationTicks: 24,
        movementMultiplier: 0.55,
        stackRule: "strongestOnly",
      }],
      copy: "Pack Potato Gun shots for a brief, heavy movement slow that never stacks.",
      completeCopy: "Potato hits apply a 45% movement slow for 1.2 seconds.",
    },
    woodlandYield: {
      id: "woodlandYield",
      label: "Woodland Yield",
      branch: "forager",
      tier: 1,
      icon: "♣",
      requiredLevel: 2,
      requiresNodes: [],
      requiresUnlocks: [],
      effects: [{ kind: "harvestWood", amount: 1 }],
      copy: "Use each cleared tree more completely.",
      completeCopy: "Every cleared tree now gives 3 wood instead of 2.",
    },
    fieldMending: {
      id: "fieldMending",
      label: "Field Mending",
      branch: "forager",
      tier: 2,
      icon: "✚",
      requiredLevel: 3,
      requiresNodes: ["woodlandYield"],
      requiresUnlocks: [],
      effects: [{ kind: "repairAmount", target: "building", amount: 1 }],
      copy: "Prepare sturdier repair bundles from gathered materials.",
      completeCopy: "Each repair restores 1 additional structure HP.",
    },
    hearthkeeping1: {
      id: "hearthkeeping1",
      label: "Hearthkeeping I",
      branch: "fortification",
      tier: 1,
      icon: "⌂",
      requiredLevel: 3,
      requiresNodes: [],
      requiresUnlocks: [],
      effects: [{ kind: "dawnRepair", target: "building", scope: "targetable", amount: 1 }],
      copy: "Organize the morning repair pass around the homestead.",
      completeCopy: "Each dawn restores 1 HP to every standing targetable structure.",
    },
    reinforcedFrames: {
      id: "reinforcedFrames",
      label: "Reinforced Frames",
      branch: "fortification",
      tier: 2,
      icon: "▣",
      requiredLevel: 4,
      requiresNodes: ["hearthkeeping1"],
      requiresUnlocks: [],
      effects: [{ kind: "maxHealth", target: "building", scope: "targetable", amount: 2 }],
      copy: "Brace each standing structure with a tougher frame.",
      completeCopy: "Targetable structures gain 2 maximum HP and keep the added protection.",
    },
    barkArmor: {
      id: "barkArmor",
      label: "Bark Armor",
      branch: "fortification",
      tier: 3,
      icon: "◈",
      requiredLevel: 5,
      requiresNodes: ["reinforcedFrames"],
      requiresUnlocks: [],
      effects: [{ kind: "armor", target: "building", scope: "targetable", threshold: 1, amount: 1 }],
      copy: "Layer bark on structures to blunt heavier enemy hits.",
      completeCopy: "Hits above 1 damage lose 1 damage; smaller hits are unchanged.",
    },
    scoutTraining1: {
      id: "scoutTraining1",
      label: "Scout Training I",
      branch: "scout",
      tier: 1,
      icon: "✦",
      requiredLevel: 2,
      requiresNodes: [],
      requiresUnlocks: [],
      effects: [{ kind: "stat", target: "unit", id: "scout", stat: "damage", operation: "add", value: 1 }],
      copy: "Train Scout to strike harder on every night watch.",
      completeCopy: "Scout damage rises from 1 to 2.",
    },
    trailSense: {
      id: "trailSense",
      label: "Trail Sense",
      branch: "scout",
      tier: 2,
      icon: "◌",
      requiredLevel: 3,
      requiresNodes: ["scoutTraining1"],
      requiresUnlocks: [],
      effects: [{ kind: "stat", target: "unit", id: "scout", stat: "attackRange", operation: "add", value: 0.5 }],
      copy: "Teach Scout to read movement through the trees and watch a little farther.",
      completeCopy: "Scout watch radius increases by 0.5 cells.",
    },
  };

  function nodes() { return Object.values(NODES).slice().sort((left, right) => BRANCHES[left.branch].order - BRANCHES[right.branch].order || left.tier - right.tier || left.label.localeCompare(right.label)); }
  function node(id) { return NODES[id] || null; }
  function nodesForBranch(branch) { return nodes().filter((definition) => definition.branch === branch); }
  function isResearched(state, id) { return Array.isArray(state.research) && state.research.includes(id); }
  function branchResearchCount(state, branch) {
    return (state.research || []).map(node).filter((definition) => definition?.branch === branch).length;
  }
  function costFor(state, idOrDefinition) {
    const definition = typeof idOrDefinition === "string" ? node(idOrDefinition) : idOrDefinition;
    return definition ? 2 ** branchResearchCount(state, definition.branch) : 0;
  }

  function validate() {
    const seenIds = new Set();
    nodes().forEach((definition) => {
      if (!definition.id || seenIds.has(definition.id)) throw new Error(`Invalid technology id: ${definition.id || "missing"}.`);
      if (!BRANCHES[definition.branch]) throw new Error(`Technology ${definition.id} has an unknown branch.`);
      if (typeof definition.icon !== "string" || !definition.icon) throw new Error(`Technology ${definition.id} needs an icon.`);
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
    const costSkillPoints = costFor(state, definition);
    if (isResearched(state, id)) return { available: false, reason: "Researched.", node: definition, costSkillPoints };
    if ((state.levelIndex || 0) + 1 < definition.requiredLevel) return { available: false, reason: `Reveals on Level ${definition.requiredLevel}.`, node: definition, costSkillPoints };
    const missingNode = (definition.requiresNodes || []).find((requiredId) => !isResearched(state, requiredId));
    if (missingNode) return { available: false, reason: `Requires ${node(missingNode).label}.`, node: definition, costSkillPoints };
    const missingUnlock = (definition.requiresUnlocks || []).find((unlock) => !(state.unlocks || []).includes(unlock));
    if (missingUnlock) return { available: false, reason: `Requires ${missingUnlock === "stickLauncher" ? "Stick Launcher" : missingUnlock}.`, node: definition, costSkillPoints };
    if ((state.skillPoints || 0) < costSkillPoints) return { available: false, reason: `Needs ${costSkillPoints - (state.skillPoints || 0)} more Skill Point${costSkillPoints - (state.skillPoints || 0) === 1 ? "" : "s"}.`, node: definition, costSkillPoints };
    return { available: true, reason: "Ready to research.", node: definition, costSkillPoints };
  }

  function research(state, id) {
    const check = availability(state, id);
    if (!check.available) return { ok: false, message: check.reason, node: check.node };
    state.skillPoints -= check.costSkillPoints;
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

  function effectsMatching(state, predicate) { return effectsFor(state).filter(predicate); }
  function effectValue(state, predicate, field = "value") {
    return effectsMatching(state, predicate).reduce((total, effect) => total + (Number(effect[field]) || 0), 0);
  }
  function hasEffect(state, predicate) { return effectsFor(state).some(predicate); }
  function hasBuildingUpgrade(state, from, to) { return hasEffect(state, (effect) => effect.kind === "unlockBuildingUpgrade" && effect.from === from && effect.to === to); }
  function hasBuildingRefit(state, building, refit) { return hasEffect(state, (effect) => effect.kind === "unlockBuildingRefit" && effect.building === building && effect.refit === refit); }

  validate();
  return {
    BRANCHES,
    NODES,
    nodes,
    node,
    nodesForBranch,
    isResearched,
    branchResearchCount,
    costFor,
    availability,
    research,
    effectsFor,
    effectsMatching,
    effectValue,
    statValue,
    hasEffect,
    hasBuildingUpgrade,
    hasBuildingRefit,
    validate,
  };
}));
