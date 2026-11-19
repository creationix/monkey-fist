// G6's review: seeded one-line changes of play.ents and metrics.ents, for oracle/mutate-g6.sh. Each is
// [name, file, old text (must occur exactly once in the file), new text]. A good oracle fails on every
// one that can change an answer; the ones marked (equivalent?) are expected to change none, and the run
// says which survive. The results are in DX-LOG.md, G6's review.
module.exports = [
  // play.ents
  ['casual: the step limit one more', 'play.ents', 'for step in n * 6 + 20 {', 'for step in n * 6 + 21 {'],
  ['casual: no preference for exits', 'play.ents', 'r.one_of(if exits.len > 0 { exits.items() }', 'r.one_of(if exits.len > 99999 { exits.items() }'],
  ['regional: > 0.55', 'play.ents', 'return false when !(f64(used[k]) / f64(area[k]) >= 0.55)', 'return false when !(f64(used[k]) / f64(area[k]) > 0.55)'],
  ['regional: right half from col > w / 2', 'play.ents', 'let right = 2 * col >= b.w', 'let right = 2 * col > b.w'],
  ['regional: lower half from r > h / 2', 'play.ents', 'let lower = 2 * p.r >= b.h', 'let lower = 2 * p.r > b.h'],
  ['valid: second cell not checked for a step', 'play.ents', 'return false when i > 0 && !adjacent(prev, p, g.hex)', 'return false when i > 1 && !adjacent(prev, p, g.hex)'],
  ['trivial: from 3 ropes', 'play.ents', 'return false when n <= 3', 'return false when n <= 2'],
  ['features_used: the first cell entered skipped', 'play.ents', '    for k, p in last_route() {  // the cells the head entered\n      if k >= len && g.inside(p) {', '    for k, p in last_route() {  // the cells the head entered\n      if k > len && g.inside(p) {'],
  ['feature_stats: manual one tap more', 'play.ents', 'let by_hand: u8 = if (step as i32) < manual { 4 } else { 0 }', 'let by_hand: u8 = if (step as i32) <= manual { 4 } else { 0 }'],
  ['feature_stats: manual springs as manual mirrors', 'play.ents', 'used[g.cell(last(route))] |= 2 | (by_hand << 1)', 'used[g.cell(last(route))] |= 2 | by_hand'],
  ['slide_stats: repeated from 3', 'play.ents', 'if actions[i] >= 2 {', 'if actions[i] >= 3 {'],
  ['slide_stats: automatic counts manual exits', 'play.ents', '} elif e == ev_exit && !manual {', '} elif e == ev_exit {'],
  ['postpone: an equal count accepted', 'play.ents', 'let better = r.solved && r.taps < taps', 'let better = r.solved && r.taps <= taps'],
  ['postpone: not only a rope\'s last tap', 'play.ents', 'if index_from(best[0..n], i, (k + 1) as u32) < 0 {', 'if index_from(best[0..n], i, (k + 1) as u32) < 99 {'],
  ['score: minimum_taps up to 13 ropes', 'play.ents', 'def minimum_ropes = 12', 'def minimum_ropes = 13'],
  ['coverage: springs not left out', 'play.ents', 'f64(b.w * b.h - b.mirrors.len as i32 - b.springs.len as i32)', 'f64(b.w * b.h - b.mirrors.len as i32)'],
  // metrics.ents
  ['ray: Hex states with the direction', 'metrics.ents', 'let state = if g.hex { c } else {', 'let state = if false { c } else {'],
  ['analyze: a loop after counts', 'metrics.ents', '|| a.blocker != id || b.event == snap_loop', '|| a.blocker != id'],
  ['analyze: no further counts', 'metrics.ents', 'if b.distance > a.distance || (b.event == snap_exit', 'if b.distance >= a.distance || (b.event == snap_exit'],
  ['analyze: an exit is not freed', 'metrics.ents', '|| (b.event == snap_exit && a.event != snap_exit) {', '|| (false && a.event != snap_exit) {'],
  ['analyze: revisited when freed at the same step', 'metrics.ents', 'last_freed[id] > last_action[id]', 'last_freed[id] >= last_action[id]'],
  ['ray: a spring is not a bounce', 'metrics.ents', 'return Snap(snap_bounce, distance, -1) when g.spring[c] != 0', 'return Snap(snap_bounce, distance, -1) when false'],
  ['Tarjan: low from low (equivalent?)', 'metrics.ents', 't.low[v] = min(t.low[v], t.index[x])', 't.low[v] = min(t.low[v], t.low[x])'],
  ['graph: internal joins from one prerequisite', 'metrics.ents', 'if same >= 2 {', 'if same >= 1 {'],
  ['graph: joins from one incoming arc', 'metrics.ents', '    if incoming[c] >= 2 {\n      joins += 1', '    if incoming[c] >= 1 {\n      joins += 1'],
  ['graph: every arc essential', 'metrics.ents', 'if x != c && reach[x * k + c] != 0 {', 'if false && reach[x * k + c] != 0 {'],
  ['graph: branching over every arc', 'metrics.ents', 'if essential[up_first + e] != 0 {', 'if true {'],
  ['graph: a one-rope component is a mutual wait', 'metrics.ents', 'if members > 1 {', 'if members > 0 {'],
  ['graph: largest counts single ropes', 'metrics.ents', 'if size > 1 {', 'if size > 0 {'],
  ['graph: joins over n * 0.3', 'metrics.ents', 'max(1.0, nd * 0.25)', 'max(1.0, nd * 0.3)'],
  ['graph: branching over 5', 'metrics.ents', 'min(f64(branching) / 4.0, 1.0)', 'min(f64(branching) / 5.0, 1.0)'],
  ['graph: connected weight 0.5', 'metrics.ents', '(0.4 + 0.6 * connected)', '(0.5 + 0.5 * connected)'],
];
