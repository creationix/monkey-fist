// Plays generated Journey levels through the game layer: following the par plan
// earns three stars, auto-solve earns zero, undo restores the board and costs a
// tap, a hint costs two, and chapter unlocks follow game-engine.js.
import 'package:monkey_fist/core/engine.dart';
import 'package:monkey_fist/game/game_state.dart';
import 'package:test/test.dart';

GameState _start(int index, List<Sfx> heard) {
  final l = generate(journeyOpts, index)!;
  final g = GameState(l, sfx: (k, _) => heard.add(k));
  g.resize(400, 800);
  return g;
}

void _settle(GameState g, {int frames = 4000}) {
  for (var k = 0; k < frames && (g.moves.isNotEmpty || (g.auto && !g.ended) || (!g.ended && g.ropesLeft == 0)); k++) {
    g.update(1 / 60);
  }
}

void main() {
  // Square, Hex, mirrors, spinners, both.
  const levels = [0, 1, 10, 11, 25, 40, 59, 88, 104, 119];

  for (final i in levels) {
    test('level ${i + 1}: the par plan earns three stars', () {
      final heard = <Sfx>[];
      final g = _start(i, heard);
      var stars = -1;
      g.onFinish = (s) => stars = s;
      final plan = List<int>.of(g.board.plan);
      for (var k = 0; k < g.par; k++) {
        g.tap(plan[k]);
        _settle(g);
        expect(g.lost, isFalse, reason: 'step $k');
      }
      _settle(g);
      expect(g.ended, isTrue);
      expect(g.taps, g.par);
      expect(stars, 3);
      expect(heard, contains(Sfx.win));
      expect(heard, contains(Sfx.pop));
      if (g.board.springs.isNotEmpty) expect(heard, contains(Sfx.spring));
    });
  }

  test('auto-solve clears the board for zero stars', () {
    final g = _start(60, []);
    var stars = -1;
    g.onFinish = (s) => stars = s;
    g.autoSolve();
    _settle(g, frames: 20000);
    expect(g.ended, isTrue);
    expect(stars, 0);
  });

  test('undo restores the board and costs a tap; hints cost two', () {
    final g = _start(20, []);
    final before = List.of(g.paths);
    g.tap(g.board.plan[0]);
    _settle(g);
    expect(g.taps, 1);
    g.undo();
    expect(g.taps, 2);
    expect(g.undos, 2);
    expect(g.paths, before);
    g.showHint();
    expect(g.taps, 4);
    expect(g.hint, g.plan[0]);
  });

  test('hit-testing finds the rope under a head', () {
    final g = _start(11, []);
    for (var i = 0; i < g.paths.length; i++) {
      final head = g.screen(g.paths[i]!.last);
      expect(g.pick(head.x, head.y), i);
    }
  });

  test('chapter unlocks', () {
    expect(journeyAvailable(1), 10);
    expect(journeyUnlock(1, 8), 1);
    expect(journeyUnlock(1, 9), 2);
    expect(journeyUnlock(3, 9), 3);
    expect(journeyUnlock(11, 119), 12);
  });
}
