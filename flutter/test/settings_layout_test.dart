import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:monkey_fist/game/progress.dart';
import 'package:monkey_fist/ui/audio.dart';
import 'package:monkey_fist/ui/settings_screen.dart';
import 'package:monkey_fist/ui/theme.dart';

void main() {
  for (final config in [
    (const Size(320, 600), 1.0),
    (const Size(740, 360), 1.3),
    (const Size(900, 1200), 1.0),
    (const Size(390, 844), 2.0),
  ]) {
    testWidgets('settings remain usable at ${config.$1}, text ${config.$2}', (
      tester,
    ) async {
      tester.view.physicalSize = config.$1;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final progress = Progress.memory();
      final audio = SfxPlayer(enabled: false);
      await tester.pumpWidget(
        MaterialApp(
          theme: monkeyTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(config.$2)),
            child: child!,
          ),
          home: SettingsScreen(progress: progress, audio: audio),
        ),
      );
      await tester.pump();
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('settings-contrast')),
        160,
        scrollable: find.byType(Scrollable).first,
      );
      await Scrollable.ensureVisible(tester.element(find.byKey(const ValueKey('settings-contrast'))), alignment: 1);
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('settings-contrast')));
      await tester.pump();
      expect(progress.highContrast, isTrue);
      // Back remains pinned and tappable even after scrolling to the bottom.
      expect(
        tester.getRect(find.byTooltip('Back')).top,
        greaterThanOrEqualTo(0),
      );
      expect(find.byTooltip('Back').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      audio.music.dispose();
    });
  }
}
