// The web game's motion polish, through the game layer: a spring bounce folds
// the rope back over its own drawn line while the arrowhead turns around and
// the spinner spins half a turn; a head on a mirror points and leads out of
// the bend; mirrors and springs no rope can reach fade over a second, the
// result waits for them, and undo brings them back.
import 'dart:math' as math;

import 'package:monkey_fist/core/engine.dart';
import 'package:monkey_fist/core/util.dart';
import 'package:monkey_fist/game/game_state.dart';
import 'package:test/test.dart';

GameState _board(List<List<Pt>> ropes, {List<Mirror> mirrors = const [], List<Pt> springs = const []}) {
  final board = Board(hex: false, w: 8, h: 8, ropes: ropes, mirrors: mirrors, springs: springs, plan: const []);
  return GameState(Level(board, 4, true, 0, 0, 0, ''))..resize(600, 600, top: 92, bottom: 94);
}

double _angle(Vec v) => math.atan2(v.y, v.x);

void main() {
  test('a spring bounce folds over the drawn rope while the arrow turns and the spinner spins', () {
    const spring = Pt(5, 3);
    final g = _board([
      [Pt(2, 5), Pt(1, 5), Pt(1, 4), Pt(2, 4), Pt(2, 3), Pt(3, 3)],
      [Pt(0, 4), Pt(0, 5)],
      [Pt(6, 2), Pt(6, 1)],
    ], springs: [spring]);
    final expected = g.geo.tap(g.paths, 0)!.paths[0];
    g.tap(0);
    final m = g.moves[0]!;
    while (!m.impacted) {
      // Approaching, the rope is one strand: no fold before the spring.
      expect(g.drawing(0)!.foldIndex, -1);
      g.update(.001);
    }
    expect(g.springRotation(spring), closeTo(math.pi / (1 + m.bounceLength), .05));
    expect(_angle(g.drawing(0)!.head), closeTo(0, .2), reason: 'the arrow points into the spring');
    g.update(.002);
    final turning = _angle(g.drawing(0)!.head);
    expect(turning, inExclusiveRange(.05, math.pi - .05), reason: 'the arrow turns rather than flipping');
    var folded = false;
    var spin = g.springRotation(spring);
    while (g.moves.containsKey(0)) {
      final d = g.drawing(0)!;
      if (d.foldIndex > 0 && d.foldIndex < d.points.length - 1) folded = true;
      final next = g.springRotation(spring);
      expect(next, greaterThanOrEqualTo(spin - 1e-9));
      spin = next;
      g.update(.004);
    }
    expect(folded, isTrue);
    expect(g.paths[0], expected);
    expect(g.springRotation(spring), closeTo(math.pi, 1e-9));
  });

  test('a head resting on a mirror points along the reflection and leads out of the bend', () {
    final g = _board([
      [Pt(3, 2), Pt(4, 2), Pt(5, 2)],
    ], mirrors: [const Mirror(Pt(5, 2), 0)]);
    final d = g.drawing(0)!;
    expect(d.points.length, 4);
    expect(d.head.x, closeTo(0, 1e-9));
    expect(d.head.y, closeTo(-1, 1e-9));
  });

  test('unreachable mirrors fade over a second and the result waits for them', () {
    const mirror = Pt(5, 1);
    final g = _board([
      [Pt(1, 1), Pt(2, 1)],
    ], mirrors: [const Mirror(mirror, 0)]);
    double? atFinish;
    var partly = false;
    g.onFinish = (_) => atFinish = g.featureOpacity(mirror);
    g.tap(0);
    for (var k = 0; k < 600 && !g.ended; k++) {
      g.update(1 / 60);
      final a = g.featureOpacity(mirror);
      if (a > 0 && a < 1) partly = true;
    }
    expect(g.ended, isTrue);
    expect(partly, isTrue);
    expect(atFinish, 0);
  });

  test('features stay while a rope can reach them, and undo restores faded ones', () {
    const used = Pt(5, 1), kept = Pt(5, 6);
    final g = _board([
      [Pt(1, 1), Pt(2, 1)],
      [Pt(1, 6), Pt(2, 6)],
      // Blocks the second rope, so it does not release automatically.
      [Pt(3, 5), Pt(3, 6)],
    ], mirrors: [const Mirror(used, 0), const Mirror(kept, 1)]);
    expect(g.auto, isFalse);
    g.tap(0);
    for (var k = 0; k < 600 && (g.moving || g.fading); k++) {
      g.update(1 / 60);
    }
    expect(g.featureOpacity(used), 0);
    expect(g.featureOpacity(kept), 1);
    g.undo();
    expect(g.featureOpacity(used), 1);
  });

  test('Fit eases back over .22 seconds, and a hint brings its rope into view', () {
    final g = _board([
      [Pt(0, 0), Pt(1, 0)],
      [Pt(5, 7), Pt(6, 7)],
    ]);
    g.plan = [1, 0];
    g.zoomAt(3, 0, 0);
    expect(g.zoom, 3);
    g.fit();
    g.update(.11);
    expect(g.zoom, inExclusiveRange(1, 3));
    expect(g.cameraMoving, isTrue);
    g.update(.12);
    expect(g.zoom, 1);
    expect(g.cameraMoving, isFalse);
    // Zoomed in on the top-left corner, the hinted rope at the bottom is off screen.
    g.zoomAt(3, 0, 0);
    final before = g.screen(Pt(6, 7));
    expect(before.y, greaterThan(g.height));
    g.showHint();
    expect(g.hint, 1);
    final after = g.screen(Pt(6, 7));
    expect(after.y, lessThan(g.height - g.padBottom));
  });
}
