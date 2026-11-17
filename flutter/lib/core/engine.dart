// game-engine.js: set codes, level specifications, layout keys and generate().
import 'gridgen.dart';
import 'journey_data.dart';
import 'util.dart';

export 'gridgen.dart' show Level, Spec;

/// Bump when generated boards change, so saved scores no longer apply.
const int gridVersion = 8;

class SetOpts {
  final bool journey;
  final String grid; // 'S', 'H' or 'M'
  final int min, max, w, h, count;
  final bool mirrors, springs, colossal;
  final String seed;
  const SetOpts({
    required this.journey,
    required this.grid,
    required this.min,
    required this.max,
    required this.w,
    required this.h,
    required this.count,
    required this.mirrors,
    required this.springs,
    required this.colossal,
    required this.seed,
  });
}

const SetOpts journeyOpts = SetOpts(
    journey: true,
    grid: 'M',
    min: 1,
    max: 100,
    w: 10,
    h: 14,
    count: 120,
    mirrors: true,
    springs: true,
    colossal: false,
    seed: 'MONKEYFIST');

const String journeyCode = 'J3-MONKEYFIST';

String setCode(SetOpts o) {
  if (o.journey) return journeyCode;
  final flags = '${o.mirrors ? 'M' : ''}${o.springs ? 'S' : ''}${o.colossal ? 'C' : ''}';
  return 'U3-${o.grid}-${o.min}-${o.max}-${o.w}-${o.h}-${o.count}-${flags.isEmpty ? 'N' : flags}-${o.seed}';
}

final RegExp _codePattern =
    RegExp(r'^U3-([SHM])-(\d{1,3})-(\d{1,3})-(\d{1,2})-(\d{1,2})-(\d{1,3})-(N|M|S|MS|C|MC|SC|MSC)-([A-Z0-9]{1,12})$');

/// parseCode: a Journey or U3 Custom set code, or null.
SetOpts? parseCode(String text) {
  final t = text.trim().toUpperCase();
  if (t == journeyCode) return journeyOpts;
  final m = _codePattern.firstMatch(t);
  if (m == null) return null;
  final min = int.parse(m[2]!), max = int.parse(m[3]!);
  final w = int.parse(m[4]!), h = int.parse(m[5]!), count = int.parse(m[6]!);
  final f = m[7]!;
  final mirrors = f.contains('M'), springs = f.contains('S'), colossal = f.contains('C');
  final lo = mirrors || springs ? 8 : 4;
  final hi = colossal ? 48 : 24;
  if (min < 1 || max > 100 || min > max || w < lo || w > hi || h < lo || h > hi || count < 1 || count > 200) {
    return null;
  }
  return SetOpts(
      journey: false,
      grid: m[1]!,
      min: min,
      max: max,
      w: w,
      h: h,
      count: count,
      mirrors: mirrors,
      springs: springs,
      colossal: colossal,
      seed: m[8]!);
}

Spec levelSpec(SetOpts o, int index) {
  final i = imax(0, imin(o.count - 1, index));
  if (o.journey) return journeySpecs[i];
  final hex = o.grid == 'H' ? true : (o.grid == 'S' ? false : i % 2 == 1);
  return Spec(
    hex: hex,
    w: o.w,
    h: o.h,
    difficulty: o.min + (o.max - o.min) * i / imax(1, o.count - 1),
    mirrors: o.mirrors,
    springs: o.springs,
    seed: base36(hashString('grid/3/${setCode(o)}/$i')).toUpperCase(),
    colossal: o.colossal,
  );
}

/// The layout hash: FNV-1a over the same JSON text game-engine.js hashes.
String layoutKey(Board b) {
  final sb = StringBuffer();
  sb.write(b.hex ? '["hex",' : '["square",');
  sb.write('${b.w},${b.h},[');
  for (var i = 0; i < b.ropes.length; i++) {
    if (i > 0) sb.write(',');
    sb.write('[');
    final path = b.ropes[i];
    for (var j = 0; j < path.length; j++) {
      if (j > 0) sb.write(',');
      sb.write('[${path[j].q},${path[j].r}]');
    }
    sb.write(']');
  }
  sb.write('],[');
  for (var i = 0; i < b.mirrors.length; i++) {
    if (i > 0) sb.write(',');
    final m = b.mirrors[i];
    final kind = b.hex ? '${m.kind}' : (m.kind == 0 ? '"/"' : r'"\\"');
    sb.write('[${m.cell.q},${m.cell.r},$kind]');
  }
  sb.write('],[');
  for (var i = 0; i < b.springs.length; i++) {
    if (i > 0) sb.write(',');
    sb.write('[${b.springs[i].q},${b.springs[i].r}]');
  }
  sb.write(']]');
  final data = sb.toString();
  return '${base36(hashString(data))}-${base36(hashString('layout:$data'))}';
}

Level? generate(SetOpts o, int index) {
  final l = gridGenerate(levelSpec(o, index));
  if (l == null) return null;
  l.layoutKey = layoutKey(l.board);
  return l;
}

/// game-engine.js available(): how many Journey levels are open.
int journeyAvailable(int chapters) => (chapters.clamp(1, 12)) * 10;

/// game-engine.js unlock(): clearing the last level of an open group opens the next ten.
int journeyUnlock(int chapters, int index) {
  if (index % 10 != 9) return chapters;
  final next = index ~/ 10 + 2;
  final best = chapters > next ? chapters : next;
  return best > 12 ? 12 : best;
}

/// generate() from a set code, for isolates (plain arguments in, a Level out).
Level? generateCode(String code, int index) {
  final o = parseCode(code);
  return o == null ? null : generate(o, index);
}
