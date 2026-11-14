// The Dart core must regenerate every Journey level and the custom sample exactly
// as the JS reference: same layoutKey, par and rope count (and plan/exact for the
// custom sample). Expected values: scripts/grid-journey-measurements.json (via
// tool/gen_journey.cjs) and the MoonBit port's tests/custom-expected.json.
//
// Run: dart test test/core   (or flutter test test/core)
import 'dart:convert';
import 'dart:io';

import 'package:monkey_fist/core/engine.dart';
import 'package:test/test.dart';

List<dynamic> _fixture(String name) {
  final dir = File.fromUri(Platform.script).parent.path;
  for (final base in ['test/fixtures', '$dir/../fixtures', '$dir/fixtures']) {
    final f = File('$base/$name');
    if (f.existsSync()) return jsonDecode(f.readAsStringSync()) as List<dynamic>;
  }
  throw StateError('fixture $name not found (run from flutter/)');
}

void main() {
  test('all 120 Journey levels match the JS reference', () {
    final expected = _fixture('journey_expected.json');
    final bad = <String>[];
    final times = <int>[];
    for (var i = 0; i < 120; i++) {
      final sw = Stopwatch()..start();
      final l = generate(journeyOpts, i);
      times.add(sw.elapsedMilliseconds);
      final m = expected[i] as Map<String, dynamic>;
      if (l == null) {
        bad.add('${i + 1}: null');
        continue;
      }
      final got = {
        'grid': l.board.hex ? 'hex' : 'square',
        'W': l.board.w,
        'H': l.board.h,
        'layoutKey': l.layoutKey,
        'par': l.par,
        'ropeCount': l.board.ropes.length,
      };
      for (final k in got.keys) {
        if (got[k] != m[k]) {
          bad.add('${i + 1}: $k ${got[k]} != ${m[k]}');
          break;
        }
      }
    }
    final total = times.reduce((a, b) => a + b);
    final sorted = [...times]..sort();
    print('Journey: mean ${(total / 120).toStringAsFixed(1)} ms, median ${sorted[60]} ms, '
        'max ${sorted.last} ms, total ${(total / 1000).toStringAsFixed(1)} s');
    expect(bad, isEmpty);
  }, timeout: const Timeout(Duration(minutes: 20)));

  test('custom sample (square/Hex, mirrors, spinners, colossal) matches', () {
    for (final c in _fixture('custom_expected.json')) {
      final m = c as Map<String, dynamic>;
      final sw = Stopwatch()..start();
      final l = generateCode(m['code'] as String, m['index'] as int);
      print('${m['code']} #${m['index']}: ${sw.elapsedMilliseconds} ms');
      expect(l, isNotNull, reason: m['code'] as String);
      expect({
        'layoutKey': l!.layoutKey,
        'par': l.par,
        'exact': l.exact,
        'ropes': l.board.ropes.length,
        'plan': l.board.plan,
      }, {
        'layoutKey': m['layoutKey'],
        'par': m['par'],
        'exact': m['exact'],
        'ropes': m['ropes'],
        'plan': m['plan'],
      }, reason: '${m['code']} #${m['index']}');
    }
  }, timeout: const Timeout(Duration(minutes: 20)));

  test('invalid set codes are refused', () {
    for (final code in [
      '',
      'J2-MONKEYFIST',
      'U3-X-1-100-10-14-120-N-SEED',
      'U3-S-1-100-6-6-10-M-SEED',
      'U3-S-50-10-10-14-10-N-SEED'
    ]) {
      expect(parseCode(code), isNull, reason: code);
    }
    expect(parseCode('u3-m-1-100-10-14-120-ms-monkeyfist'), isNotNull);
  });
}
