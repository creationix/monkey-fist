import 'dart:math' as math;
import 'dart:typed_data';

import 'package:monkey_fist/game/music.dart';
import 'package:test/test.dart';

double energy(Uint8List pcm) {
  final data = ByteData.sublistView(pcm);
  var sum = 0.0;
  for (var i = 0; i < pcm.length; i += 2) {
    final sample = data.getInt16(i, Endian.little) / 32768;
    sum += sample * sample;
  }
  return math.sqrt(sum / (pcm.length / 2));
}

void main() {
  test(
    'all six web songs render audible, deterministic PCM at their own tempo',
    () {
      expect(musicSongs.map((s) => s['title']).toSet(), hasLength(6));
      for (var level = 1; level <= 6; level++) {
        final synth = MusicSynth(level), again = MusicSynth(level);
        final bytes = synth.renderBar();
        expect(bytes, orderedEquals(again.renderBar()));
        expect(bytes.length, (synth.barSeconds * musicRate).round() * 2);
        expect(energy(bytes), inExclusiveRange(.005, .5));
        expect(MusicSynth(level + 6).title, synth.title);
      }
    },
  );

  test(
    'first theme follows the score, drift rests, and variations stay seeded',
    () {
      for (final raw in musicSongs) {
        final song = raw as Map<String, dynamic>;
        for (var bar = 0; bar < 16; bar++) {
          for (var slot = 0; slot < 8; slot++) {
            expect(musicMelody(song, 1, bar, slot, 0), song['bars'][bar][slot]);
            if (bar.isOdd) expect(musicMelody(song, 1, bar, slot, 2), isNull);
            expect(
              musicMelody(song, 7, bar, slot, 5),
              musicMelody(song, 7, bar, slot, 5),
            );
          }
        }
      }
      final song = musicSongs.first as Map<String, dynamic>;
      final written = [
        for (var b = 0; b < 16; b++)
          for (var s = 0; s < 8; s++) musicMelody(song, 1, b, s, 0),
      ];
      final variation = [
        for (var b = 0; b < 16; b++)
          for (var s = 0; s < 8; s++) musicMelody(song, 1, b, s, 1),
      ];
      expect(variation, isNot(orderedEquals(written)));
    },
  );

  test(
    'thinking eases percussion over four bars; activity restores it in two',
    () {
      final calm = MusicSynth(1), active = MusicSynth(1);
      var calmEnergy = 0.0, activeEnergy = 0.0;
      for (var i = 0; i < 4; i++) {
        calmEnergy += energy(calm.renderBar(thinking: true));
        activeEnergy += energy(active.renderBar());
      }
      expect(calm.calm, 1);
      expect(calmEnergy, lessThan(activeEnergy));
      calm.renderBar();
      expect(calm.calm, .5);
      calm.renderBar();
      expect(calm.calm, 0);
    },
  );

  test('bar boundaries preserve tempo without accumulating rounding drift', () {
    final synth = MusicSynth(6);
    var frames = 0;
    for (var i = 0; i < 8; i++) {
      frames += synth.renderBar().length ~/ 2;
    }
    expect(frames, (8 * synth.barSeconds * musicRate).round());
  });
}
