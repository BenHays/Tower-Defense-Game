/*
 * Wild Hearth Talent Tree — editable runtime catalog
 *
 * This file is the live source of truth for implemented talents. A row here
 * becomes a real, deterministic talent once it has an id, branch, level gate,
 * prerequisite, icon id, and typed effect. Plan additions first in
 * docs/talent-tree-workbench.md, then move approved ideas here.
 *
 * Branch pricing is automatic: a branch's 1st, 2nd, 3rd, and 4th purchase
 * costs 1, 2, 4, and 8 Skill Points. Do not add a price to individual nodes.
 */
(function registerWildHearthTalentTree(root, factory) {
  const icons = typeof module !== "undefined" && module.exports ? require("./talent-icons.js") : root.WildHearthTalentIcons;
  const talentTree = factory(icons);
  if (typeof module !== "undefined" && module.exports) module.exports = talentTree;
  root.WildHearthTalentTree = talentTree;
}(typeof globalThis !== "undefined" ? globalThis : this, function buildWildHearthTalentTree(TalentIcons) {
  if (!TalentIcons) throw new Error("Wild Hearth talent icons did not load.");
  const BRANCHES = {
    hunting: { id: "hunting", label: "Hunting", order: 1 },
    farming: { id: "farming", label: "Farming", order: 2 },
    building: { id: "building", label: "Building", order: 3 },
    nurturing: { id: "nurturing", label: "Nurturing", order: 4 },
    scouting: { id: "scouting", label: "Scouting", order: 5 },
  };

  const NODES = {
    arrowcraft: {
      id: "arrowcraft", label: "Arrowcraft", branch: "hunting", tier: 1, icon: "arrowcraft", requiredLevel: 3,
      requiresNodes: [], requiresUnlocks: ["stickLauncher"],
      effects: [{ kind: "unlockBuildingUpgrade", from: "stickLauncher", to: "arrowShooter" }],
      copy: "Learn to turn a built Stick Launcher into an Arrow Shooter.", completeCopy: "Stick Launchers can become Arrow Shooters.",
    },
    hardwoodThrows: {
      id: "hardwoodThrows", label: "Hardwood Throws", branch: "hunting", tier: 2, icon: "launcherDamage", requiredLevel: 3,
      requiresNodes: ["arrowcraft"], requiresUnlocks: [],
      effects: [{ kind: "stat", target: "building", id: "stickLauncher", stat: "damage", operation: "add", value: 1 }],
      copy: "Select straighter, heavier branches for every Stick Launcher.", completeCopy: "Stick Launcher damage rises from 1 to 2.",
    },
    launcherRange: {
      id: "launcherRange", label: "Longer Arm", branch: "hunting", tier: 2, icon: "launcherRange", requiredLevel: 3,
      requiresNodes: ["arrowcraft"], requiresUnlocks: [],
      effects: [{ kind: "stat", target: "building", id: "stickLauncher", stat: "attackRange", operation: "add", value: 0.5 }],
      copy: "Lengthen the launcher arm for a slightly wider first line.", completeCopy: "Stick Launcher range increases by 0.5 cells.",
    },
    quickcord: {
      id: "quickcord", label: "Quickcord", branch: "hunting", tier: 3, icon: "quickcord", requiredLevel: 4,
      requiresNodes: ["arrowcraft"], requiresUnlocks: [],
      effects: [{ kind: "unlockBuildingRefit", building: "arrowShooter", refit: "quickcord" }],
      copy: "Learn a taut bowcord refit for one selected Arrow Shooter.", completeCopy: "Arrow Shooters can receive the Quickcord attack-speed refit.",
    },
    potatoPacking: {
      id: "potatoPacking", label: "Potato Packing", branch: "hunting", tier: 2, icon: "potatoPacking", requiredLevel: 4,
      requiresNodes: [], requiresUnlocks: ["potatoGun"],
      effects: [{ kind: "onHitStatus", sourceTarget: "building", sourceId: "potatoGun", status: "movementSlow", statusSource: "potatoPacking", durationTicks: 24, movementMultiplier: 0.55, stackRule: "strongestOnly" }],
      copy: "Pack Potato Gun shots for a brief, heavy movement slow that never stacks.", completeCopy: "Potato hits apply a 45% movement slow for 1.2 seconds.",
    },
    woodlandYield: {
      id: "woodlandYield", label: "Woodland Yield", branch: "farming", tier: 1, icon: "woodlandYield", requiredLevel: 2,
      requiresNodes: [], requiresUnlocks: [], effects: [{ kind: "harvestWood", amount: 1 }],
      copy: "Use each cleared tree more completely.", completeCopy: "Every cleared tree now gives 3 wood instead of 2.",
    },
    fieldMending: {
      id: "fieldMending", label: "Field Mending", branch: "farming", tier: 2, icon: "fieldMending", requiredLevel: 3,
      requiresNodes: ["woodlandYield"], requiresUnlocks: [], effects: [{ kind: "repairAmount", target: "building", amount: 1 }],
      copy: "Prepare sturdier repair bundles from gathered materials.", completeCopy: "Each repair restores 1 additional structure HP.",
    },
    gardenStewardship: {
      id: "gardenStewardship", label: "Garden Stewardship", branch: "farming", tier: 1, icon: "gardenStewardship", requiredLevel: 3,
      requiresNodes: [], requiresUnlocks: [], effects: [{ kind: "unlockBuilding", building: "garden" }],
      copy: "Lay out a tended Garden that earns one extra day action at dawn while it survives.", completeCopy: "Garden Plots can be built. One living Garden grants 1 extra day action at dawn.",
    },
    reinforcedFrames: {
      id: "reinforcedFrames", label: "Reinforced Materials", branch: "building", tier: 1, icon: "reinforcedFrames", requiredLevel: 4,
      requiresNodes: [], requiresUnlocks: [], effects: [
        { kind: "maxHealth", target: "building", amount: 2 },
        { kind: "unlockBuilding", building: "fence" },
      ],
      copy: "Brace every structure with stronger materials and learn to build a simple fence line.", completeCopy: "All structures gain 2 maximum HP. Fence segments are now buildable.",
    },
    barkArmor: {
      id: "barkArmor", label: "Bark Armor", branch: "building", tier: 2, icon: "barkArmor", requiredLevel: 5,
      requiresNodes: ["reinforcedFrames"], requiresUnlocks: [], effects: [{ kind: "armor", target: "building", scope: "targetable", threshold: 1, amount: 1 }],
      copy: "Layer bark on structures to blunt heavier enemy hits.", completeCopy: "Hits above 1 damage lose 1 damage; smaller hits are unchanged.",
    },
    hearthkeeping1: {
      id: "hearthkeeping1", label: "Hearthkeeping I", branch: "nurturing", tier: 1, icon: "hearthkeeping", requiredLevel: 3,
      requiresNodes: [], requiresUnlocks: [], effects: [{ kind: "dawnRepair", target: "building", scope: "targetable", amount: 1 }],
      copy: "Organize the morning repair pass around the homestead.", completeCopy: "Each dawn restores 1 HP to every standing targetable structure.",
    },
    scoutTraining1: {
      id: "scoutTraining1", label: "Scout Training I", branch: "scouting", tier: 1, icon: "scoutTraining", requiredLevel: 2,
      requiresNodes: [], requiresUnlocks: [], effects: [{ kind: "stat", target: "unit", id: "scout", stat: "damage", operation: "add", value: 1 }],
      copy: "Train Scout to strike harder on every night watch.", completeCopy: "Scout damage rises from 1 to 2.",
    },
    trailSense: {
      id: "trailSense", label: "Trail Sense", branch: "scouting", tier: 2, icon: "trailSense", requiredLevel: 3,
      requiresNodes: ["scoutTraining1"], requiresUnlocks: [], effects: [{ kind: "stat", target: "unit", id: "scout", stat: "attackRange", operation: "add", value: 0.5 }],
      copy: "Teach Scout to read movement through the trees and watch a little farther.", completeCopy: "Scout watch radius increases by 0.5 cells.",
    },
  };

  function nodes() { return Object.values(NODES).slice().sort((left, right) => BRANCHES[left.branch].order - BRANCHES[right.branch].order || left.tier - right.tier || left.label.localeCompare(right.label)); }
  function node(id) { return NODES[id] || null; }
  function nodesForBranch(branch) { return nodes().filter((definition) => definition.branch === branch); }
  function isResearched(state, id) { return Array.isArray(state.research) && state.research.includes(id); }
  function branchResearchCount(state, branch) { return (state.research || []).map(node).filter((definition) => definition?.branch === branch).length; }
  function costFor(state, idOrDefinition) { const definition = typeof idOrDefinition === "string" ? node(idOrDefinition) : idOrDefinition; return definition ? 2 ** branchResearchCount(state, definition.branch) : 0; }

  function validate() {
    const seenIds = new Set();
    nodes().forEach((definition) => {
      if (!definition.id || seenIds.has(definition.id)) throw new Error(`Invalid talent id: ${definition.id || "missing"}.`);
      if (!BRANCHES[definition.branch]) throw new Error(`Talent ${definition.id} has an unknown branch.`);
      if (!TalentIcons.icon(definition.icon)) throw new Error(`Talent ${definition.id} needs a known icon id.`);
      if (!Number.isInteger(definition.requiredLevel) || definition.requiredLevel < 1) throw new Error(`Talent ${definition.id} has an invalid level gate.`);
      (definition.requiresNodes || []).forEach((requiredId) => { if (!NODES[requiredId]) throw new Error(`Talent ${definition.id} requires an unknown node.`); });
      seenIds.add(definition.id);
    });
    const visiting = new Set();
    const visited = new Set();
    function visit(id) {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Talent dependency cycle includes ${id}.`);
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
    if (!definition) return { available: false, reason: "Unknown talent.", node: null };
    const costSkillPoints = costFor(state, definition);
    if (isResearched(state, id)) return { available: false, reason: "Learned.", node: definition, costSkillPoints };
    if ((state.levelIndex || 0) + 1 < definition.requiredLevel) return { available: false, reason: `Reveals on Level ${definition.requiredLevel}.`, node: definition, costSkillPoints };
    const missingNode = (definition.requiresNodes || []).find((requiredId) => !isResearched(state, requiredId));
    if (missingNode) return { available: false, reason: `Requires ${node(missingNode).label}.`, node: definition, costSkillPoints };
    const missingUnlock = (definition.requiresUnlocks || []).find((unlock) => !(state.unlocks || []).includes(unlock));
    if (missingUnlock) return { available: false, reason: `Requires ${missingUnlock === "stickLauncher" ? "Stick Launcher" : missingUnlock}.`, node: definition, costSkillPoints };
    if ((state.skillPoints || 0) < costSkillPoints) return { available: false, reason: `Needs ${costSkillPoints - (state.skillPoints || 0)} more Skill Point${costSkillPoints - (state.skillPoints || 0) === 1 ? "" : "s"}.`, node: definition, costSkillPoints };
    return { available: true, reason: "Ready to learn.", node: definition, costSkillPoints };
  }

  function guide(state) {
    const currentLevel = Math.max(1, (state.levelIndex || 0) + 1);
    const orderedNodes = nodes();
    const revealedNodes = orderedNodes.filter((definition) => isResearched(state, definition.id) || definition.requiredLevel <= currentLevel);
    const readyNodeIds = revealedNodes.filter((definition) => availability(state, definition.id).available).map((definition) => definition.id);
    const hiddenLevels = orderedNodes
      .filter((definition) => !isResearched(state, definition.id) && definition.requiredLevel > currentLevel)
      .map((definition) => definition.requiredLevel);
    const branches = Object.values(BRANCHES).slice().sort((left, right) => left.order - right.order).map((branch) => {
      const branchNodes = orderedNodes.filter((definition) => definition.branch === branch.id);
      const learned = branchNodes.filter((definition) => isResearched(state, definition.id)).length;
      const revealed = branchNodes.filter((definition) => isResearched(state, definition.id) || definition.requiredLevel <= currentLevel);
      const ready = revealed.filter((definition) => readyNodeIds.includes(definition.id));
      return {
        id: branch.id,
        label: branch.label,
        learned,
        total: branchNodes.length,
        revealedNodeIds: revealed.map((definition) => definition.id),
        readyNodeIds: ready.map((definition) => definition.id),
        nextCostSkillPoints: 2 ** learned,
      };
    });
    return {
      currentLevel,
      revealedNodeIds: revealedNodes.map((definition) => definition.id),
      readyNodeIds,
      nextRevealLevel: hiddenLevels.length ? Math.min(...hiddenLevels) : null,
      branches,
    };
  }

  function research(state, id) {
    const check = availability(state, id);
    if (!check.available) return { ok: false, message: check.reason, node: check.node };
    state.skillPoints -= check.costSkillPoints;
    state.research.push(id);
    return { ok: true, message: `${check.node.label} learned. ${check.node.completeCopy}`, node: check.node };
  }

  function effectsFor(state) { return (state.research || []).map(node).filter(Boolean).flatMap((definition) => definition.effects.map((effect) => ({ ...effect, nodeId: definition.id }))); }
  function statValue(state, target, id, stat, baseValue) {
    const effects = effectsFor(state).filter((effect) => effect.kind === "stat" && effect.target === target && effect.id === id && effect.stat === stat);
    let value = baseValue;
    effects.filter((effect) => effect.operation === "add").forEach((effect) => { value += effect.value; });
    effects.filter((effect) => effect.operation === "multiply").forEach((effect) => { value *= effect.value; });
    effects.filter((effect) => effect.operation === "set").forEach((effect) => { value = effect.value; });
    return value;
  }
  function effectsMatching(state, predicate) { return effectsFor(state).filter(predicate); }
  function effectValue(state, predicate, field = "value") { return effectsMatching(state, predicate).reduce((total, effect) => total + (Number(effect[field]) || 0), 0); }
  function hasEffect(state, predicate) { return effectsFor(state).some(predicate); }
  function hasBuildingUpgrade(state, from, to) { return hasEffect(state, (effect) => effect.kind === "unlockBuildingUpgrade" && effect.from === from && effect.to === to); }
  function hasBuildingRefit(state, building, refit) { return hasEffect(state, (effect) => effect.kind === "unlockBuildingRefit" && effect.building === building && effect.refit === refit); }

  validate();
  return { BRANCHES, NODES, nodes, node, nodesForBranch, isResearched, branchResearchCount, costFor, availability, guide, research, effectsFor, effectsMatching, effectValue, statValue, hasEffect, hasBuildingUpgrade, hasBuildingRefit, validate };
}));
