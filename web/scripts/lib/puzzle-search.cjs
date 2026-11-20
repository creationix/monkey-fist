'use strict';

// Research evaluator. Full rope paths are the state: this also handles mirrors,
// reversals and temporary stoppers, without imposing straight-track assumptions.
const stateKey = paths => JSON.stringify(paths.map(path => path && path.map(p => [p.q, p.r])));

class Frontier {
  constructor() { this.items = []; this.serial = 0; }
  push(record) {
    const item = { record, distance: record.distance, serial: this.serial++ }, a = this.items;
    a.push(item); let at = a.length - 1;
    while (at) {
      const parent = (at - 1) >> 1;
      if (!this.before(item, a[parent])) break;
      a[at] = a[parent]; at = parent;
    }
    a[at] = item;
  }
  before(a, b) { return a.distance < b.distance || a.distance === b.distance && a.serial < b.serial; }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) {
      let at = 0;
      while (at * 2 + 1 < a.length) {
        let child = at * 2 + 1;
        if (child + 1 < a.length && this.before(a[child + 1], a[child])) child++;
        if (!this.before(a[child], last)) break;
        a[at] = a[child]; at = child;
      }
      a[at] = last;
    }
    return first;
  }
  next() {
    while (this.items.length) {
      const item = this.pop();
      if (!item.record.expanded && item.distance === item.record.distance) return item.record;
    }
    return null;
  }
}

function certificate(board, G, objective) {
  if (!Array.isArray(board.plan)) return null;
  let paths = board.ropes, value = 0, automatic = false;
  for (const id of board.plan) {
    if (!Number.isInteger(id) || id < 0 || id >= paths.length || !paths[id]) return null;
    const move = G.tap(board, paths, id); if (!move) return null;
    value += objective === 'nonExitMoves' ? Number(move.event !== 'exit') : Number(!automatic);
    paths = move.paths;
    if (G.allFree(board, paths)) automatic = true;
  }
  return paths.every(path => !path) ? { value, plan: board.plan.slice() } : null;
}

function planTo(record, board, G) {
  const plan = [];
  for (let at = record; at.parent; at = at.parent) plan.push(at.move);
  plan.reverse();
  // This shortcut applies only once ALL remaining ropes can exit. Removing an
  // individual clear rope earlier is never forced by this evaluator.
  let paths = record.paths;
  for (let id = 0; id < paths.length; id++) if (paths[id]) {
    const move = G.tap(board, paths, id);
    if (!move || move.event !== 'exit') throw Error('allFree disagrees with the movement rules');
    paths = move.paths; plan.push(id);
  }
  return plan;
}

function evaluateSearch(board, G, { nodeBudget = 20000, objective = 'manualTaps' } = {}) {
  if (!['manualTaps', 'nonExitMoves'].includes(objective)) throw Error('Unknown search objective: ' + objective);
  if (!Number.isSafeInteger(nodeBudget) || nodeBudget < 0) throw Error('nodeBudget must be a nonnegative safe integer');
  if (!Array.isArray(board.ropes)) throw Error('A board needs a ropes array');
  const nonempty = board.ropes.some(Boolean), root = { paths: board.ropes, distance: 0, parent: null, move: -1, expanded: false };
  const witnessed = certificate(board, G, objective);
  let bestPlan = witnessed?.plan || null, upperBound = witnessed?.value ?? null, nodes = 0;
  const minimum = objective === 'manualTaps' && nonempty ? 1 : 0;
  const result = (status, lowerBound) => ({ objective, status, solved: status === 'unsolvable' ? false : upperBound == null ? null : true,
    exact: status !== 'budget-exhausted', lowerBound, upperBound, bestPlan, nodes });
  if (G.allFree(board, root.paths)) {
    bestPlan = planTo(root, board, G); upperBound = minimum;
    return result('optimal', minimum);
  }
  if (upperBound === minimum) return result('optimal', minimum);
  const records = new Map([[stateKey(root.paths), root]]), frontier = new Frontier(); frontier.push(root);
  for (;;) {
    const current = frontier.next();
    if (!current) return upperBound == null ? result('unsolvable', null) : result('optimal', upperBound);
    const lowerBound = Math.max(minimum, current.distance);
    // Every cheaper state is settled, so an incumbent at this bound is proved.
    if (upperBound != null && lowerBound >= upperBound) return result('optimal', upperBound);
    if (G.allFree(board, current.paths)) {
      bestPlan = planTo(current, board, G); upperBound = current.distance;
      return result('optimal', upperBound);
    }
    if (nodes >= nodeBudget) return result('budget-exhausted', lowerBound);
    current.expanded = true; nodes++;
    for (let id = 0; id < current.paths.length; id++) if (current.paths[id]) {
      const move = G.tap(board, current.paths, id); if (!move) continue;
      const distance = current.distance + (objective === 'manualTaps' ? 1 : Number(move.event !== 'exit'));
      if (upperBound != null && distance >= upperBound) continue;
      const key = stateKey(move.paths), previous = records.get(key);
      if (previous && previous.distance <= distance) continue;
      const next = previous || { paths: move.paths, expanded: false };
      next.distance = distance; next.parent = current; next.move = id;
      records.set(key, next); frontier.push(next);
    }
  }
}

module.exports = { evaluateSearch };
