import 'package:monkey_fist/core/util.dart';
import 'package:test/test.dart';

void main() {
  test('mulberry32 and FNV-1a match V8', () {
    // Reference values from Node: random.js hashString / mulberry32.
    expect(hashString('MONKEYFIST'), 179956478);
    expect(base36(hashString('MONKEYFIST')), '2z53b2');
    expect(hashString('grid/3/1E36ZS5'), 2737516719);
    final r = Rng(hashString('MONKEYFIST'));
    expect([r.next(), r.next(), r.next()], [0.8810720844194293, 0.6960403446573764, 0.9353132729884237]);
  });

  test('stable sort keeps equal keys in order', () {
    final a = List<(int, int)>.generate(200, (i) => (i % 7, i));
    ssort<(int, int)>(a, (x, y) => x.$1 - y.$1);
    for (var i = 1; i < a.length; i++) {
      expect(a[i - 1].$1 < a[i].$1 || (a[i - 1].$1 == a[i].$1 && a[i - 1].$2 < a[i].$2), isTrue);
    }
  });

  test('JS Math.round, floor division, toFixed', () {
    expect(jsRound(2.5), 3);
    expect(jsRound(-2.5), -2);
    expect(jsRound(0.49999999999999994), 0);
    expect(floorDiv(-3, 2), -2);
    expect(floorDiv(3, 2), 1);
    expect(toFixed(1.00005, 4), 1.0001);
  });
}
