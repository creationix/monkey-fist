// The app shell: the level list opens a level, the level weaves in an isolate,
// taps play it, and the result card appears. Set MF_RENDER_DIR to keep a
// screenshot (test fonts draw text as boxes).
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:monkey_fist/game/levels.dart';
import 'package:monkey_fist/game/progress.dart';
import 'package:monkey_fist/main.dart';
import 'package:monkey_fist/ui/audio.dart';
import 'package:monkey_fist/ui/game_screen.dart';
import 'package:monkey_fist/ui/home_screen.dart';

Future<void> _shot(WidgetTester tester, String name, Type screen) async {
  final dir = Platform.environment['MF_RENDER_DIR'];
  if (dir == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(find.ancestor(of: find.byType(screen), matching: find.byType(RepaintBoundary)).first);
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final png = await image.toByteData(format: ui.ImageByteFormat.png);
    File('$dir/$name.png').writeAsBytesSync(png!.buffer.asUint8List());
  });
}

void main() {
  testWidgets('play level 1 from the list to the result card', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final progress = Progress.memory();
    final store = LevelStore();
    await tester.pumpWidget(MonkeyFistApp(progress: progress, store: store, audio: SfxPlayer(enabled: false)));
    await tester.pump();
    expect(find.text('Monkey Fist'), findsOneWidget);
    expect(find.text('Play 1'), findsOneWidget);
    await _shot(tester, 'app-home', HomeScreen);

    await tester.tap(find.text('Play 1'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    // Wait for the isolate to weave the level.
    await tester.runAsync(() => store.get(0));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final state = tester.state(find.byType(GameScreen)) as dynamic;
    final game = state.game;
    expect(game, isNotNull);
    await _shot(tester, 'app-level1', GameScreen);

    // Play the par plan with real taps on each rope's head.
    final plan = List<int>.of(game.board.plan as List<int>);
    for (var k = 0; k < (game.par as int); k++) {
      final head = game.screen(game.paths[plan[k]].last);
      await tester.tapAt(Offset(head.x as double, head.y as double));
      for (var f = 0; f < 120; f++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
    }
    for (var f = 0; f < 600 && !(game.ended as bool); f++) {
      await tester.pump(const Duration(milliseconds: 16));
    }
    expect(game.ended, isTrue);
    expect(game.stars, 3);
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Next level'), findsOneWidget);
    expect(progress.scores[0]?.stars, 3);
    await _shot(tester, 'app-result', GameScreen);
  });
}
