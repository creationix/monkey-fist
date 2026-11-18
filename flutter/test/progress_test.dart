import 'package:flutter_test/flutter_test.dart';
import 'package:monkey_fist/core/engine.dart';
import 'package:monkey_fist/game/progress.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'dart:convert';

void main() {
  test(
    'all settings persist together and legacy sound preferences migrate',
    () async {
      SharedPreferences.setMockInitialValues({
        'monkey-fist-unified-v1': jsonEncode({'sound': true}),
      });
      final p = await Progress.load();
      expect(p.soundLevel, 'full');
      p.soundLevel = 'soft';
      p.music = 'full';
      p.graphics = 'tiles';
      p.speed = 'fast';
      p.highContrast = true;
      p.save();
      final restored = await Progress.load();
      expect(restored.soundLevel, 'soft');
      expect(restored.music, 'full');
      expect(restored.graphics, 'tiles');
      expect(restored.speed, 'fast');
      expect(restored.highContrast, isTrue);
      SharedPreferences.setMockInitialValues({
        'monkey-fist-unified-v1': jsonEncode({'sound': false}),
      });
      expect((await Progress.load()).soundLevel, 'off');
    },
  );
  test(
    'graphics defaults to Rope and Tiles survives reloading progress',
    () async {
      SharedPreferences.setMockInitialValues({});
      final progress = await Progress.load();
      expect(progress.graphics, 'rope');
      progress.graphics = 'tiles';
      progress.record(0, 1, 3);
      final restored = await Progress.load();
      expect(restored.graphics, 'tiles');
      expect(restored.scores[0]?.stars, 3);
      expect(restored.available, 10);
    },
  );
  test(
    'music starts Off and its independent volume setting is saved',
    () async {
      SharedPreferences.setMockInitialValues({});
      final progress = await Progress.load();
      expect(progress.music, 'off');
      progress.music = 'full';
      progress.sound = false;
      progress.save();
      final restored = await Progress.load();
      expect(restored.music, 'full');
      expect(restored.sound, isFalse);
    },
  );
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
  test(
    'Custom sets keep their own scores, and older Journey-only saves migrate',
    () async {
      SharedPreferences.setMockInitialValues({
        'monkey-fist-unified-v1': jsonEncode({
          'version': gridVersion,
          'chapters': 3,
          'scores': {
            '0': {'taps': 4, 'stars': 3},
          },
        }),
      });
      final p = await Progress.load();
      expect(p.scores[0]?.stars, 3);
      expect(p.chapters, 3);
      final custom = customSet(seed: 'abc', w: 6, h: 6);
      final code = setCode(custom);
      p.custom = custom;
      p.code = code;
      expect(p.record(9, 9, 1, code: code), 0);
      final restored = await Progress.load();
      expect(restored.scoresFor(code)[9]?.stars, 1);
      expect(restored.scores.containsKey(9), isFalse);
      expect(setCode(restored.custom!), code);
      expect(restored.code, code);
      expect(restored.availableFor(custom), 120);
      expect(restored.chapters, 3);
    },
  );
}
