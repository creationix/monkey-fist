// G7's review: seeded changes of gridgen.ents and gen.ents, each built into test/g7.wasm by
// mutate-g7.sh and put to G7's oracles (the units in both modes, parity.mjs on the 135 reference
// levels through the unchanged glue, the port's Journey, the robustness checks) and to the review's
// quality-g7-review.cjs exact re-measure on a small class. [name, file, old text (unique), new text].
// A survivor is either an equivalent change (argued in fixtures/mutants-g7-review-results.txt) or an
// oracle gap.
'use strict';
module.exports = [
  ['m0 placeMirrors tries x20', 'gridgen.ents', 'tries < count * 40', 'tries < count * 20'],
  ['m1 placeMirrors edge column', 'gridgen.ents', 'if column > 0 && column < w - 1', 'if column >= 0 && column < w - 1'],
  ['m2 placeMirrors 5 Hex neighbours', 'gridgen.ents', 'for d in (if hex { 6 } else { 4 }) {', 'for d in (if hex { 5 } else { 4 }) {'],
  ['m3 woven length floor 6', 'gridgen.ents', 'max(7, min(w, height) * 2)', 'max(6, min(w, height) * 2)'],
  ['m4 woven_hex share /160', 'gridgen.ents', 'let share = min(1.0, f64(area) / 150.0)', 'let share = min(1.0, f64(area) / 160.0)'],
  ['m5 woven_hex traps x0.9', 'gridgen.ents', 'round_i(kf * share) }', 'round_i(kf * share * 0.9) }'],
  ['m6 woven_square colossal pull 4', 'gridgen.ents', 'if long_ropes { 5 } else { 3 }', 'if long_ropes { 4 } else { 3 }'],
  ['m7 woven no-mirror candidate kept', 'gridgen.ents', '    return 0 when mirrors.len == 0\n', '\n'],
  ['m8 kept_mirrors keeps all', 'gridgen.ents', 'if used[index_of(hex, w, m.cell)] != 0 {', 'if used[index_of(hex, w, m.cell)] != 0 || true {'],
  ['m9 spinner ahead of a head allowed', 'gridgen.ents', '      blocked[g.cell(ahead)] = 1  // unchecked: inside', '      blocked[g.cell(ahead)] = 0  // unchecked: inside'],
  ['m10 with_spinner 15 cells', 'gridgen.ents', 'for k in min(16, cells.len) {', 'for k in min(15, cells.len) {'],
  ['m11 search_spinner 7 cells', 'gridgen.ents', 'for j in min(8, cells.len) {', 'for j in min(7, cells.len) {'],
  ['m12 with_spinner tap again only at once', 'gridgen.ents', 'for p in 2 {  // closure: for (const plan of [a, z])', 'for p in 1 {  // closure: for (const plan of [a, z])'],
  ['m13 bounce from the start allowed', 'gridgen.ents', 'return if g.walk(start, i).event == ev_bounce { -1 } else { step as i32 }', 'return step as i32'],
  ['m14 search_spinner budget 11000', 'gridgen.ents', 'round_i(12000.0 / f64(b.ropes.len))', 'round_i(11000.0 / f64(b.ropes.len))'],
  ['m15 nine attempts', 'gridgen.ents', 'let sample_limit = if colossal { 3 } else { 10 }', 'let sample_limit = if colossal { 3 } else { 9 }'],
  ['m16 early stop density 0.91', 'gridgen.ents', 'density >= 0.9 && abs', 'density >= 0.91 && abs'],
  ['m17 interaction weight 0.2', 'gridgen.ents', 'a.hardness * inter * 0.25', 'a.hardness * inter * 0.2'],
  ['m18 ceiling penalty 3.5', 'gridgen.ents', 'max(0.0, wins - a.ceiling) * 4.0', 'max(0.0, wins - a.ceiling) * 3.5'],
  ['m19 spinner casual games 12', 'gridgen.ents', 'if ns > 0 { 10 } else { 32 }', 'if ns > 0 { 12 } else { 32 }'],
  ['m20 small coverage floor below 48', 'gridgen.ents', 'if w * height <= 48 { 0.8 } else { 0.85 }', 'if w * height < 48 { 0.8 } else { 0.85 }'],
  ['m21 par ratio inclusive', 'gridgen.ents', 'return false when result.par * 3 < b.ropes.len as i32', 'return false when result.par * 3 <= b.ropes.len as i32'],
  ['m22 requireSlide ignored', 'gridgen.ents', 'return false when (s.require_slide || density < 0.85) && !st.any_slide', 'return false when (density < 0.85) && !st.any_slide'],
  ['m23 core on odd attempts', 'gridgen.ents', 'd >= 60.0 && attempt % 2 == 0', 'd >= 60.0 && attempt % 2 == 1'],
  ['m24 twisty above 35', 'gridgen.ents', 'min(w, height) >= 7 && d >= 35.0', 'min(w, height) >= 7 && d > 35.0'],
  ['m25 one spinner fewer', 'gridgen.ents', 'if s.springs { max(1, s.min_springs) } else { 0 }', 'if s.springs { max(1, s.min_springs - 1) } else { 0 }'],
  ['m26 generate_spec refuses 48x48', 'gen.ents', 'w * h > max_area', 'w * h >= max_area'],
  ['m27 measure one game more', 'gen.ents', 'return casual_measure(l.board, input_bytes(), games)', 'return casual_measure(l.board, input_bytes(), games + 1)'],
  ['m28 coverage stored capped', 'gridgen.ents', '    a.coverage = density\n', '    a.coverage = min(density, 0.999)\n'],
  ['m29 built() of the last candidate', 'gridgen.ents', '  level_built = a.built\n', '  level_built = woven_built\n'],
  ['m30 fresh shuffle short', 'gridgen.ents', 'let j = rng.below(i + 1)', 'let j = rng.below(i)'],
  ['m31 core uses the JS Journey', 'gen.ents', '  use_js_journey(js_mode)\n', '  use_js_journey(true)\n'],
  ['m32 port mode draws as the JS', 'gen.ents', '  set_draw_exact(js_mode)\n', '  set_draw_exact(true)\n'],
  ['m33 casual seed attempt + 1', 'gridgen.ents', '.dec(attempt, hash_byte)', '.dec(attempt + 1, hash_byte)'],
  ['m34 mirror count min_m + 1', 'gridgen.ents', 'min_m + 2 + round_i(2.0 * strength)', 'min_m + 1 + round_i(2.0 * strength)'],
  ['m35 Hex mirror kinds 2', 'gridgen.ents', 'let kind = if hex { rng.below(3) }', 'let kind = if hex { rng.below(2) }'],
];
