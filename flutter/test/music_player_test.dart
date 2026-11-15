import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:monkey_fist/ui/music.dart';

void main() {
  testWidgets(
    'music streams PCM, changes volume, and stops/resumes with the app',
    (tester) async {
      const channel = MethodChannel('monkey_fist/music');
      final calls = <MethodCall>[];
      final pending = <int, Completer<bool>>{};
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(channel, (
        call,
      ) async {
        calls.add(call);
        final args = call.arguments as Map;
        final id = args['id'] as int;
        if (call.method == 'write') {
          expect(args['pcm'], isA<Uint8List>());
          expect((args['pcm'] as Uint8List).length, greaterThan(80000));
          final wait = Completer<bool>();
          pending[id] = wait;
          return wait.future;
        }
        if (call.method == 'stop') pending.remove(id)?.complete(false);
        return null;
      });
      final player = MusicPlayer();
      addTearDown(() {
        player.dispose();
        debugDefaultTargetPlatformOverride = null;
        tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          channel,
          null,
        );
      });

      Future<void> until(bool Function() ready) async {
        for (var i = 0; i < 200 && !ready(); i++) {
          await Future<void>.delayed(const Duration(milliseconds: 10));
        }
        expect(ready(), isTrue);
      }

      await tester.runAsync(() async {
        player.startLevel(1);
        await Future<void>.delayed(const Duration(milliseconds: 20));
        expect(
          calls.where((c) => c.method == 'start'),
          isEmpty,
          reason: 'music starts Off',
        );
        player.setSetting('soft');
        await until(() => pending.isNotEmpty);
        expect(
          calls.firstWhere((c) => c.method == 'start').arguments['volume'],
          .55,
        );
        player.setSetting('full');
        await until(() => calls.any((c) => c.method == 'volume'));
        expect(
          calls.lastWhere((c) => c.method == 'volume').arguments['volume'],
          1.0,
        );
        player.didChangeAppLifecycleState(AppLifecycleState.paused);
        await until(() => pending.isEmpty);
        final starts = calls.where((c) => c.method == 'start').length;
        player.didChangeAppLifecycleState(AppLifecycleState.resumed);
        await until(
          () =>
              calls.where((c) => c.method == 'start').length > starts &&
              pending.isNotEmpty,
        );
        player.pause();
        await until(() => pending.isEmpty);
        player.setSetting('off');
      });
    },
  );
}
