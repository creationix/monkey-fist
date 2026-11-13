// Causal relationships observed during the manual part of a verified solution.
// Distances and rope lengths do not add difficulty: a relationship counts only
// when moving its blocker gives another rope more legal travel.
(function (root) {
  'use strict';
  const key = p => p.q + ',' + p.r;
  function analyze(board, plan, manualTaps, G) {
    const n = board.ropes.length, prerequisites = Array.from({ length: n }, () => new Set()), dependents = Array.from({ length: n }, () => new Set());
    const mirrors = new Map(board.mirrors.map(m => [key(m.cell), m])), springs = new Set(board.springs.map(key));
    const inside = p => p.r >= 0 && p.r < board.H && (board.grid === 'hex' ? p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < board.W : p.q >= 0 && p.q < board.W);
    function snapshot(paths) {
      const occupied = new Map(); paths.forEach((path, i) => path?.forEach(p => occupied.set(key(p), i)));
      return paths.map((path, i) => {
        if (!path) return null;
        let p = path.at(-1), [dq, dr] = G.direction(board, path), distance = 0; const seen = new Set();
        for (let guard = 0; guard <= board.W * board.H * 6; guard++) {
          const next = { q: p.q + dq, r: p.r + dr }, at = key(next);
          if (!inside(next)) return { event: 'exit', distance, blocker: -1 };
          if (occupied.has(at)) return { event: 'blocked', distance, blocker: occupied.get(at) };
          const state = board.grid === 'hex' ? at : at + ',' + dq + ',' + dr;
          if (seen.has(state)) return { event: 'loop', distance: 0, blocker: -1 };
          seen.add(state); distance++; p = next;
          if (springs.has(at)) return { event: 'bounce', distance, blocker: -1 };
          const mirror = mirrors.get(at);
          if (mirror) {
            if (board.grid === 'hex') {
              const incoming = G.DIRS.findIndex(d => d[0] === dq && d[1] === dr);
              [dq, dr] = G.DIRS[(2 * mirror.axis - incoming + 6) % 6];
            } else [dq, dr] = mirror.slope === '/' ? [-dr, -dq] : [dr, dq];
          }
        }
        return { event: 'loop', distance: 0, blocker: -1 };
      });
    }
    let paths = board.ropes, before = snapshot(paths), partialSlides = 0, bounces = 0;
    const initialExits = before.filter(move => move?.event === 'exit').length, actions = new Uint16Array(n), lastAction = new Int32Array(n).fill(-1), lastFreed = new Int32Array(n).fill(-1), revisited = new Set();
    const steps = Math.min(plan.length, Math.max(0, manualTaps));
    for (let step = 0; step < steps; step++) {
      const id = plan[step], move = G.tap(board, paths, id); if (!move) break;
      const after = snapshot(move.paths);
      for (let j = 0; j < n; j++) {
        const a = before[j], b = after[j];
        if (j === id || !a || !b || a.blocker !== id || b.event === 'loop') continue;
        if (b.distance > a.distance || b.event === 'exit' && a.event !== 'exit') {
          prerequisites[j].add(id); dependents[id].add(j); lastFreed[j] = step;
        }
      }
      if (actions[id] && lastFreed[id] > lastAction[id]) revisited.add(id);
      actions[id]++; lastAction[id] = step;
      partialSlides += Number(move.event === 'slide'); bounces += Number(move.event === 'bounce');
      paths = move.paths; before = after;
    }
    const graph = graphMetrics(dependents.flatMap((next, i) => [...next].map(j => [i, j])), n, revisited.size);
    return { ...graph, revisitedRopes: revisited.size, partialSlides, bounces, initialExits, initialExitFraction: initialExits / n };
  }
  function graphMetrics(connections, n, revisitedRopes = 0) {
    const prerequisites = Array.from({ length: n }, () => new Set()), dependents = Array.from({ length: n }, () => new Set());
    for (const [from, to] of connections) if (from !== to && from >= 0 && to >= 0 && from < n && to < n) { dependents[from].add(to); prerequisites[to].add(from); }
    // Collapse mutual waits before measuring depth; a long simple chain has
    // depth, but earns no branch-depth or mutual-wait score by itself.
    let nextIndex = 0; const indices = new Int32Array(n).fill(-1), low = new Int32Array(n), onStack = new Uint8Array(n), stack = [], components = [], component = new Int32Array(n);
    function visit(v) {
      indices[v] = low[v] = nextIndex++; stack.push(v); onStack[v] = 1;
      for (const w of dependents[v]) {
        if (indices[w] < 0) { visit(w); low[v] = Math.min(low[v], low[w]); }
        else if (onStack[w]) low[v] = Math.min(low[v], indices[w]);
      }
      if (low[v] !== indices[v]) return;
      const group = []; let w;
      do { w = stack.pop(); onStack[w] = 0; component[w] = components.length; group.push(w); } while (w !== v);
      components.push(group);
    }
    for (let i = 0; i < n; i++) if (indices[i] < 0) visit(i);
    const arcs = components.map(() => new Set()), indegree = new Int32Array(components.length);
    for (let i = 0; i < n; i++) for (const j of dependents[i]) if (component[i] !== component[j] && !arcs[component[i]].has(component[j])) { arcs[component[i]].add(component[j]); indegree[component[j]]++; }
    const queue = []; components.forEach((group, i) => { if (!indegree[i]) queue.push(i); });
    for (let q = 0; q < queue.length; q++) for (const b of arcs[queue[q]]) if (!--indegree[b]) queue.push(b);
    // A prerequisite already implied by another prerequisite does not create a
    // real choice. Reduce A→B when A→C→B exists, so a plain chain with shortcut
    // blocking contacts cannot masquerade as a branching dependency graph.
    const reach = components.map(() => 0n);
    for (let q = queue.length - 1; q >= 0; q--) {
      const a = queue[q]; for (const b of arcs[a]) reach[a] |= (1n << BigInt(b)) | reach[b];
    }
    const essential = arcs.map((next, a) => new Set([...next].filter(b => ![...next].some(c => c !== b && (reach[c] & (1n << BigInt(b))) !== 0n))));
    const incoming = new Int32Array(components.length);
    essential.forEach(next => next.forEach(b => incoming[b]++));
    const internalJoins = components.map(group => group.filter(i => [...prerequisites[i]].filter(j => component[j] === component[i]).length >= 2).length);
    const internalForks = components.map(group => group.filter(i => [...dependents[i]].filter(j => component[j] === component[i]).length >= 2).length);
    const joins = [...incoming].filter(value => value >= 2).length + internalJoins.reduce((sum, value) => sum + value, 0);
    const forks = essential.filter(next => next.size >= 2).length + internalForks.reduce((sum, value) => sum + value, 0);
    const depth = new Int32Array(components.length), branchDepth = new Int32Array(components.length);
    const junctions = components.map((group, i) => Number(incoming[i] >= 2) + Number(internalJoins[i] > 0));
    components.forEach((group, i) => { depth[i] = group.length; branchDepth[i] = junctions[i]; });
    for (const a of queue) for (const b of essential[a]) {
      depth[b] = Math.max(depth[b], depth[a] + components[b].length); branchDepth[b] = Math.max(branchDepth[b], branchDepth[a] + junctions[b]);
    }
    const essentialEdges = essential.reduce((sum, next) => sum + next.size, 0) + prerequisites.reduce((sum, next, i) => sum + [...next].filter(j => component[j] === component[i]).length, 0);
    const mutualWaitGroups = components.filter(group => group.length > 1), mutualWaitRopes = mutualWaitGroups.reduce((sum, group) => sum + group.length, 0);
    const edges = prerequisites.reduce((sum, set) => sum + set.size, 0), maximumDepth = Math.max(0, ...depth), branchingDepth = Math.max(0, ...branchDepth);
    const seen = new Uint8Array(n), groups = [];
    for (let i = 0; i < n; i++) if (!seen[i]) {
      const group = [i]; seen[i] = 1;
      for (let q = 0; q < group.length; q++) for (const next of [...prerequisites[group[q]], ...dependents[group[q]]]) if (!seen[next]) { seen[next] = 1; group.push(next); }
      if (group.length > 1) groups.push(group.length);
    }
    const largestCoupledGroup = Math.max(0, ...groups), connectedFraction = largestCoupledGroup / Math.max(1, n);
    const evidence = 3 * Math.min(joins / Math.max(1, n * .25), 1) + 2.5 * mutualWaitRopes / Math.max(1, n) + 2 * revisitedRopes / Math.max(1, n) + 1.5 * Math.min(branchingDepth / 4, 1);
    const interaction = evidence * (.4 + .6 * connectedFraction);
    return { edges, essentialEdges, joins, forks, depth: maximumDepth, branchingDepth, mutualWaitGroups: mutualWaitGroups.length, mutualWaitRopes,
      coupledGroups: groups.length, largestCoupledGroup,
      // Forks alone can be a trivial one-key fan; join/cycle/interleaving evidence
      // is needed for a high interaction score. Disconnected little puzzles do
      // not equal one deeply coupled tangle just because they fill a bigger grid.
      interaction: Number(interaction.toFixed(4)) };
  }
  const api = { analyze, graphMetrics };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MFDependencyMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
