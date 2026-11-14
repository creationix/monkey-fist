import 'package:flutter_test/flutter_test.dart';
import 'package:monkey_fist/game/progress.dart';

void main() {
  test('best scores and chapter unlocks', () {
    final p = Progress.memory();
    expect(p.available, 10);
    expect(p.record(9, 12, 2), 1);
    expect(p.available, 20);
    p.record(9, 10, 2);
    expect(p.scores[9]!.taps, 10);
    p.record(9, 30, 1);
    expect(p.scores[9]!.stars, 2);
    expect(p.record(3, 5, 3), 0);
  });
}
