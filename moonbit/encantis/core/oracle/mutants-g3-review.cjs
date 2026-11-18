// G3's review: seeded one-line changes of hex.ents that mutants-g3.cjs does not make, for
// mutate-g3.sh (MUTANTS=mutants-g3-review.cjs). Each is [name, old text (exactly once in
// hex.ents), new text]. The run and what each check saw are in DX-LOG.md, review of G3.
module.exports = [
  ['turning: out never cleared', '      out.clear()\n', '\n'],
  ['compile: length is the track', 'lengths[i] = path.len as i32', 'lengths[i] = track.len as i32'],
  ['relaxed: starts at 0', '    reach[i] = b.offsets[i]\n', '    reach[i] = max(b.offsets[i], 0)\n'],
  ['relaxed: out one cell early', '        if j >= total {\n          got = -1', '        if j >= total - 1 {\n          got = -1'],
  ['solved_taps: unsolved is 0 taps', 'return if r.solved { r.taps } else { -1 }', 'return if r.solved { r.taps } else { 0 }'],
  ['postpone: the trial keeps its order', '        trial[n - 1] = i\n', '        trial[n - 1] = best[n - 1]\n'],
  ['postpone: stops after the first pass that improves', '    break when !improved', '    break when improved'],
  ['reserve: keys for half the budget', 'keys = (max(budget, 0) + 1) as u32', 'keys = (max(budget, 0) / 2 + 1) as u32'],
  ['search: the empty board counted', '  return true when b.left == 0\n  let key = b.offsets[0..b.n as u32]\n  return false when s.seen.has_key(key)\n  s.nodes += 1\n', '  let key = b.offsets[0..b.n as u32]\n  return false when s.seen.has_key(key)\n  s.nodes += 1\n  return true when b.left == 0\n'],
  ['deepen: tried one tap less', '  s.tried.set_key(key, remaining)', '  s.tried.set_key(key, remaining - 1)'],
  ['fewest: the release names every rope', '      for i in n {\n        if b.offsets[i] >= 0 {\n          moves.push(i as i32)', '      for i in n {\n        if b.offsets[i] >= -1 {\n          moves.push(i as i32)'],
  ['fewest: deepens to the fallback\'s taps', 'while taps < verified && !s.exhausted {', 'while taps <= verified && !s.exhausted {'],
  ['casual: moves not cleared', '      exits.clear()\n      moves.clear()\n', '      exits.clear()\n'],
  ['bound: from the offset', 'for c in track.ptr[(o + b.lengths[i]) as u32..track.len] {', 'for c in track.ptr[(o + b.lengths[i] - 1) as u32..track.len] {'],
  ['exit_index: mirror on the head ignored', '  return d when axis < 0\n', '  return d when axis < 9\n'],
];
