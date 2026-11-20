// Bounded, reproducible policies for comparing generators. These are explicit
// toy players, not estimates of human difficulty until calibrated by playtests.
const { hashString, mulberry32 } = require('../../random.js');

const descriptions = {
  exitFirst: 'Choose a random exit when available; otherwise choose any legal move.',
  randomLegal: 'Choose uniformly among all legal moves.',
  cautious: 'Exit-first after screening choices that immediately leave no legal move.',
};

function wilsonInterval(wins, trials) {
  const z = 1.959963984540054, z2 = z * z, rate = wins / trials, scale = 1 + z2 / trials;
  const center = (rate + z2 / (2 * trials)) / scale;
  const spread = z * Math.sqrt((rate * (1 - rate) + z2 / (4 * trials)) / trials) / scale;
  return { low: wins === 0 ? 0 : Math.max(0, center - spread), high: wins === trials ? 1 : Math.min(1, center + spread) };
}

function evaluatePlayers(board, G, options = {}) {
  const { trials = 64, maxSteps = 500, lookaheadBudget = 64 } = options;
  for (const [name, value, minimum] of [['trials', trials, 1], ['maxSteps', maxSteps, 0], ['lookaheadBudget', lookaheadBudget, 0]]) {
    if (!Number.isInteger(value) || value < minimum) throw new RangeError(name + ' must be an integer >= ' + minimum);
  }
  if (!Array.isArray(board.ropes)) throw new TypeError('board.ropes must be an array');
  const seed = String(options.seed ?? board.seed ?? 'PLAYERS');
  const certificate = Array.isArray(board.plan) ? G.replay(board, board.plan) : null;
  const referenceTaps = certificate?.solved ? certificate.taps : null;
  // Bounds keep simulations on large maps from retaining a whole search graph.
  const cache = new Map(), maximumCachedStates = 128;
  function inspect(paths) {
    const key = JSON.stringify(paths), found = cache.get(key); if (found) return found;
    const active = paths.reduce((n, p) => n + Number(!!p), 0), choices = [];
    for (let id = 0; id < paths.length; id++) if (paths[id]) {
      const move = G.tap(board, paths, id);
      if (move) choices.push({ id, event: move.event, paths: move.paths });
    }
    const state = { key, paths, active, choices, free: !active || G.allFree(board, paths) };
    cache.set(key, state);
    if (cache.size > maximumCachedStates) cache.delete(cache.keys().next().value);
    return state;
  }
  function play(policy, rng) {
    let state = inspect(board.ropes), taps = 0, screenedChoices = 0, fatalChoices = 0;
    const seen = new Set([state.key]);
    for (;;) {
      // Production does not auto-release a nonempty all-free starting board.
      // Its first exit costs one tap; every later all-free suffix is automatic.
      if (!state.active || taps && state.free) return { outcome: 'win', taps, screenedChoices, fatalChoices };
      if (!state.choices.length) return { outcome: 'loss', taps, screenedChoices, fatalChoices };
      if (taps >= maxSteps) return { outcome: 'timeout', taps, screenedChoices, fatalChoices };
      let choices = state.choices;
      if (policy === 'cautious') {
        let checked = 0;
        const safe = choices.filter(move => {
          if (checked >= lookaheadBudget) return true; // An unchecked choice is unknown, not fatal.
          checked++; screenedChoices++;
          const child = inspect(move.paths), fatal = child.active && !child.free && !child.choices.length;
          fatalChoices += Number(fatal); return !fatal;
        });
        // When every move is immediately fatal, taking one records an actual
        // dead end rather than silently granting the cautious policy a restart.
        if (safe.length) choices = safe;
      }
      if (policy !== 'randomLegal') {
        const exits = choices.filter(move => move.event === 'exit'); if (exits.length) choices = exits;
      }
      const move = choices[Math.floor(rng() * choices.length)];
      taps++; state = inspect(move.paths);
      if (!state.active || state.free) return { outcome: 'win', taps, screenedChoices, fatalChoices };
      if (seen.has(state.key)) return { outcome: 'loop', taps, screenedChoices, fatalChoices };
      seen.add(state.key);
    }
  }
  const policies = {};
  for (const policy of Object.keys(descriptions)) {
    let wins = 0, losses = 0, timeouts = 0, loops = 0, winTaps = 0, totalTaps = 0, screenedChoices = 0, fatalChoices = 0;
    for (let trial = 0; trial < trials; trial++) {
      // Each trial's stream is independent of trial count and other policies.
      const result = play(policy, mulberry32(hashString('players/1/' + seed + '/' + policy + '/' + trial)));
      totalTaps += result.taps; screenedChoices += result.screenedChoices; fatalChoices += result.fatalChoices;
      if (result.outcome === 'win') { wins++; winTaps += result.taps; }
      else if (result.outcome === 'loss') losses++;
      else if (result.outcome === 'loop') loops++;
      else timeouts++;
    }
    const meanManualTaps = wins ? winTaps / wins : null;
    policies[policy] = { description: descriptions[policy], wins, losses, timeouts, loops, censored: timeouts + loops,
      winRate: wins / trials, winRate95: wilsonInterval(wins, trials),
      completedWinRate: wins + losses ? wins / (wins + losses) : null,
      meanManualTaps, meanExcessTaps: meanManualTaps == null || referenceTaps == null ? null : meanManualTaps - referenceTaps,
      meanSteps: totalTaps / trials, screenedChoices, fatalChoices, restarts: 0 };
  }
  return { seed, trials, maxSteps, lookaheadBudget, referenceTaps,
    winRateMeaning: 'Observed wins within the step/repeat limits; loops and timeouts are censored, not proven losses.',
    referenceMeaning: 'Tap count of a replayed certificate, not a claim of optimal par.', policies };
}

module.exports = { evaluatePlayers };
