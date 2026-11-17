// The app shell: the level list opens a level, the level weaves in an isolate,
// taps play it, and the result card appears. Set MF_RENDER_DIR to keep a
// screenshot (test fonts draw text as boxes).
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:monkey_fist/game/levels.dart';
import 'package:monkey_fist/game/progress.dart';
import 'package:monkey_fist/main.dart';
import 'package:monkey_fist/ui/audio.dart';
import 'package:monkey_fist/ui/board_painter.dart';
import 'package:monkey_fist/ui/game_screen.dart';
import 'package:monkey_fist/ui/home_screen.dart';
import 'package:monkey_fist/ui/settings_screen.dart';

Future<void> _shot(WidgetTester tester, String name, Type screen) async {
  final dir = Platform.environment['MF_RENDER_DIR'];
  if (dir == null) return;
  // Let route/ink transitions finish before reading the repaint boundary.
  await tester.pump(const Duration(milliseconds: 400));
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find
        .ancestor(
          of: find.byType(screen),
          matching: find.byType(RepaintBoundary),
        )
        .first,
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1);
    final png = await image.toByteData(format: ui.ImageByteFormat.png);
    File('$dir/$name.png').writeAsBytesSync(png!.buffer.asUint8List());
  });
}

void main() {
  testWidgets('play level 1 from the list to the result card', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final progress = Progress.memory();
    final store = LevelStore();
    await tester.pumpWidget(
      MonkeyFistApp(
        progress: progress,
        store: store,
        audio: SfxPlayer(enabled: false),
      ),
    );
    await tester.pump();
    expect(find.text('Monkey Fist'), findsOneWidget);
    expect(find.text('Play level 1'), findsOneWidget);
    Future<void> choose(String group, String value) async {
      final target = find.descendant(
        of: find.byKey(ValueKey('settings-$group')),
        matching: find.text(value),
      );
      expect(
        find.byKey(ValueKey('settings-$group')),
        findsOneWidget,
        reason: 'settings group $group must be built',
      );
      await tester.ensureVisible(target);
      await tester.tap(target);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
    }

    await tester.tap(find.byTooltip('Settings'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await choose('sound', 'Off');
    await choose('music', 'Soft');
    await choose('speed', 'Fast');
    await choose('graphics', 'Tiles');
    await tester.ensureVisible(find.byKey(const ValueKey('settings-contrast')));
    await tester.tap(find.byKey(const ValueKey('settings-contrast')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(progress.highContrast, isTrue);
    expect(
      Theme.of(tester.element(find.byType(SettingsScreen)))
          .scaffoldBackgroundColor,
      Colors.black,
    );
    await _shot(tester, 'settings', SettingsScreen);
    await tester.tap(find.byTooltip('Back'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byTooltip('Settings'), findsOneWidget);
    expect(find.text('Graphics: Tiles'), findsNothing);
    expect(progress.soundLevel, 'off');
    expect(progress.music, 'soft');
    await _shot(tester, 'app-home', HomeScreen);

    await tester.tap(find.text('Play level 1'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    // Wait for the isolate to weave the level.
    // The isolate runs in real time; its result is delivered in the test's
    // fake-async zone, so alternate real waits with pumps.
    final state = tester.state(find.byType(GameScreen)) as dynamic;
    for (var k = 0; k < 200 && state.game == null; k++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pump(const Duration(milliseconds: 16));
    }
    final game = state.game;
    expect(game, isNotNull);
    BoardPainter painter() =>
        tester
                .widget<CustomPaint>(
                  find.byWidgetPredicate(
                    (w) => w is CustomPaint && w.painter is BoardPainter,
                  ),
                )
                .painter!
            as BoardPainter;
    expect(painter().graphics, 'tiles');
    expect(painter().oled, isTrue);
    expect(game.speedFactor, 2);
    final paths = game.paths;
    final pausedClock = game.clock;
    await tester.tap(
      find.descendant(
        of: find.byType(GameScreen),
        matching: find.byTooltip('Settings'),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await choose('speed', 'Slow');
    await choose('graphics', 'Rope');
    expect(game.clock, pausedClock, reason: 'opening settings pauses the puzzle immediately');
    await tester.tap(find.byTooltip('Back'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(painter().graphics, 'rope');
    expect(game.speedFactor, .5);
    expect(identical(state.game, game), isTrue);
    expect(identical(game.paths, paths), isTrue);
    expect(game.taps, 0);
    await tester.tap(
      find.descendant(
        of: find.byType(GameScreen),
        matching: find.byTooltip('Settings'),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await choose('speed', 'Normal');
    await choose('graphics', 'Tiles');
    await tester.tap(find.byTooltip('Back'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(painter().graphics, 'tiles');
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
