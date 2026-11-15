// Streaming, offline PCM synthesis of music.js's six songs and arrangements.
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'music_data.dart';

const musicRate = 22050;
const musicArrangements = ['theme', 'variation', 'drift', 'return'];
final List<dynamic> musicSongs = jsonDecode(musicData) as List<dynamic>;

double _hz(num note) => 440.0 * math.pow(2, (note - 69) / 12);
double _hash(List<int> values) {
  var h = 2166136261;
  for (final v in values) {
    h = ((h ^ v) * 16777619) & 0xffffffff;
    h ^= h >>> 13;
  }
  return h / 4294967296;
}

int _nearest(int note, Set<int> tones, int direction) {
  for (var k = 1; k < 12; k++) {
    if (tones.contains((note + k * direction + 120) % 12)) {
      return note + k * direction;
    }
  }
  return note;
}

int? musicMelody(
  Map<String, dynamic> song,
  int level,
  int bar,
  int slot,
  int pass,
) {
  final arrangement = musicArrangements[pass % 4];
  final written = song['bars'][bar][slot] as int?;
  if (arrangement == 'drift' && bar.isOdd) return null;
  final stray = arrangement == 'theme' && pass < 4
      ? 0.0
      : const {
          'theme': .12,
          'variation': .35,
          'drift': .2,
          'return': .25,
        }[arrangement]!;
  if (stray == 0) return written;
  double roll(int k) => _hash([level, pass, bar, slot, k]);
  final tones = (song['chords'][bar % 4] as List)
      .cast<int>()
      .map((n) => n % 12)
      .toSet();
  if (written == null) {
    final previous = slot > 0 ? song['bars'][bar][slot - 1] as int? : null;
    return previous != null && roll(0) < .4 * stray
        ? _nearest(previous, tones, roll(1) < .5 ? 1 : -1)
        : null;
  }
  if (slot > 0 && roll(2) < .5 * stray) return null;
  if (roll(3) < .5 * stray) {
    return _nearest(written, tones, roll(4) < .5 ? 1 : -1);
  }
  final octave = written + (written > 84 ? -12 : 12);
  return roll(5) < .2 * stray && octave >= 64 && octave <= 96
      ? octave
      : written;
}

class _Filter {
  final double b0, b1, b2, a1, a2;
  double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  _Filter._(this.b0, this.b1, this.b2, this.a1, this.a2);
  factory _Filter(double frequency, double q, {bool band = false}) {
    final w = 2 * math.pi * frequency / musicRate;
    final c = math.cos(w), alpha = math.sin(w) / (2 * q), a = 1 + alpha;
    return band
        ? _Filter._(alpha / a, 0, -alpha / a, -2 * c / a, (1 - alpha) / a)
        : _Filter._(
            (1 - c) / (2 * a),
            (1 - c) / a,
            (1 - c) / (2 * a),
            -2 * c / a,
            (1 - alpha) / a,
          );
  }
  double tick(double x) {
    final y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  }
}

class MusicSynth {
  final int level;
  late final Map<String, dynamic> song =
      musicSongs[(level - 1) % 6] as Map<String, dynamic>;
  int bar = 0;
  double calm = 0;
  Float64List _tail = Float64List(0), _sendTail = Float64List(0);
  late final Float64List _delay = Float64List(
    (45 / (song['bpm'] as int) * musicRate).round(),
  );
  int _delayAt = 0;
  final _warmth = _Filter(2000, .5), _echoFilter = _Filter(1100, .707);
  late final Float64List _noise = _makeNoise();
  late Float64List _mix, _send;
  MusicSynth(this.level);
  String get title => song['title'] as String;
  double get barSeconds => 240 / (song['bpm'] as int);

  Float64List _makeNoise() {
    var seed = 7391;
    return Float64List.fromList(
      List.generate(musicRate, (_) {
        seed = (seed ^ (seed << 13)) & 0xffffffff;
        seed ^= seed >>> 17;
        seed = (seed ^ (seed << 5)) & 0xffffffff;
        return seed / 2147483648 - 1;
      }),
    );
  }

  double _envelope(double time, double duration, double attack, double volume) {
    final a = math.min(attack, duration / 4);
    final v = math.max(.0002, volume);
    return time < a
        ? .0001 * math.pow(v / .0001, time / a)
        : v * math.pow(.0001 / v, (time - a) / (duration - a));
  }

  void _tone(
    double f,
    double duration,
    double volume,
    double time, {
    bool triangle = false,
    double? to,
    double glide = .12,
    double attack = .004,
    bool echo = false,
  }) {
    final start = (time * musicRate).round(),
        count = (duration * musicRate).ceil();
    var phase = 0.0;
    for (var k = 0; k < count && start + k < _mix.length; k++) {
      final t = k / musicRate;
      final frequency = to == null
          ? f
          : f * math.pow(to / f, math.min(1, t / math.min(duration, glide)));
      final wave = triangle
          ? (phase < .5 ? 4 * phase - 1 : 3 - 4 * phase)
          : math.sin(phase * 2 * math.pi);
      final value = wave * _envelope(t, duration, attack, volume);
      _mix[start + k] += value;
      if (echo) _send[start + k] += value;
      phase = (phase + frequency / musicRate) % 1;
    }
  }

  void _noiseVoice(
    double duration,
    double volume,
    double f,
    double time,
    int step, {
    bool echo = false,
  }) {
    final filter = _Filter(f, .7, band: true);
    final start = (time * musicRate).round(),
        offset = (((step * .071) % .9) * musicRate).round();
    for (var k = 0; k < duration * musicRate && start + k < _mix.length; k++) {
      final value =
          filter.tick(_noise[(offset + k) % _noise.length]) *
          _envelope(k / musicRate, duration, .003, volume);
      _mix[start + k] += value;
      if (echo) _send[start + k] += value;
    }
  }

  void _drum(String kind, double velocity, double time, int step) {
    if (kind == 'low') {
      _tone(105, .36, .135 * velocity, time, to: 52, glide: .09);
      _tone(178, .06, .014 * velocity, time);
      _noiseVoice(.025, .008 * velocity, 1000, time, step);
    } else if (kind == 'hand') {
      final pitch = step % 3 != 0 ? 174.0 : 142.0;
      _tone(pitch * 1.35, .2, .06 * velocity, time, to: pitch, glide: .025);
      _tone(pitch * 2, .055, .008 * velocity, time);
      _noiseVoice(.035, .012 * velocity, 1800, time, step);
    } else if (kind == 'wood') {
      _tone(520, .055, .018 * velocity, time, attack: .008);
      _tone(760, .03, .006 * velocity, time + .002);
    } else {
      _noiseVoice(.06, .02 * velocity, 2800, time, step);
    }
  }

  void _lead(
    int note,
    double time,
    double duration,
    double velocity,
    int step, {
    bool answering = false,
  }) {
    final f = _hz(note), volume = .028 * velocity;
    final voice = answering ? 'marimba' : song['voice'];
    if (voice == 'bell' || voice == 'glass') {
      final length = duration * (voice == 'glass' ? 1.6 : 1.3);
      _tone(f, length, volume * .8, time, attack: .035, echo: true);
      _tone(f * 2, length * .75, volume * .06, time, attack: .025, echo: true);
      _noiseVoice(
        length * .7,
        volume * .05,
        math.min(1800, f * 2),
        time,
        step,
        echo: true,
      );
    } else {
      final length = duration * (voice == 'warm' ? 1.5 : .8);
      _tone(f, length, volume, time, attack: .012, echo: true);
      _tone(f * 2, length * .3, volume * .07, time, attack: .008, echo: true);
      if (voice == 'pulse') {
        _tone(f * 2, length * .6, volume * .06, time, echo: true);
      }
      if (voice == 'warm') {
        _tone(f * 3, length * .5, volume * .035, time, echo: true);
      }
    }
  }

  /// Render one bar; retained voice tails, delay and filters cross bar boundaries.
  Uint8List renderBar({bool thinking = false}) {
    final count =
        ((bar + 1) * barSeconds * musicRate).round() -
        (bar * barSeconds * musicRate).round();
    _mix = Float64List(count + musicRate * 4)..setAll(0, _tail);
    _send = Float64List(_mix.length)..setAll(0, _sendTail);
    final sixteenth = 15 / (song['bpm'] as int),
        barNo = bar % 16,
        pass = bar ~/ 16,
        section = barNo ~/ 4;
    final drift = pass % 4 == 2,
        groove = song['groove'] as Map<String, dynamic>;
    final chord = (song['chords'][barNo % 4] as List).cast<int>();
    calm = thinking ? math.min(1, calm + .25) : math.max(0, calm - .5);
    final energy = [.8, 1.0, .62, 1.05][section] * (drift ? .8 : 1),
        beat = energy * (1 - .6 * calm);
    final sparse = section == 2 || drift;
    var time = 0.0;
    for (var i = 0; i < 16; i++) {
      final step = bar * 16 + i,
          human = .94 + ((step * 37 + (song['bpm'] as int)) % 13) / 100;
      for (final kind in ['low', 'hand', 'wood', 'shaker']) {
        final accent = groove[kind][i] as int?;
        if (accent == null || (kind == 'shaker' && accent <= 3)) continue;
        if (sparse &&
            ((kind == 'low' && i != 0 && i != 8) ||
                (kind == 'shaker' && i % 4 != 0) ||
                kind == 'wood')) {
          continue;
        }
        if ((drift || calm >= .75) && (kind == 'hand' || kind == 'wood')) {
          continue;
        }
        if (section == 0 && kind == 'wood' && barNo.isEven) continue;
        final a = pass.isOdd && kind == 'hand' && i == 7
            ? accent * .6
            : accent.toDouble();
        _drum(
          kind,
          a / 9 * beat * human,
          time +
              (kind == 'hand'
                  ? .007
                  : kind == 'wood'
                  ? .003
                  : 0),
          step,
        );
      }
      if (barNo % 4 == 3 &&
          i >= 12 &&
          (i + pass) % 3 != 0 &&
          calm < .5 &&
          (!drift || barNo == 15)) {
        _drum('hand', (.42 + (i - 12) * .12) * energy, time + .012, step);
        if (section == 3 && i == 15) {
          _drum('wood', .65, time + sixteenth * .5, step);
        }
      }
      final bass = groove['bass'][i] as int?;
      if (bass != null && (!sparse || i == 0 || i == 8)) {
        final note = i >= 14 && barNo.isOdd
            ? (song['chords'][(barNo + 1) % 4][0] as int) - 12
            : chord[bass] - 12;
        _tone(
          _hz(note),
          sixteenth * (i == 0 ? 3.5 : 2.2),
          .1 * energy,
          time,
          triangle: true,
          attack: .016,
        );
        _tone(
          _hz(note),
          sixteenth * 3,
          .065 * energy,
          time + .002,
          attack: .016,
        );
      }
      if (i.isEven) {
        final note = musicMelody(song, level, barNo, i ~/ 2, pass),
            melodicTime = time + (barNo.isOdd ? .006 : 0);
        if (note != null) {
          _lead(
            note + (song['register'] as int),
            melodicTime,
            sixteenth * 2,
            human * (section == 2 || drift ? .8 : 1) * (1 - .25 * calm),
            step,
          );
        } else if (section != 0 && barNo.isOdd && [6, 10, 14].contains(i)) {
          _lead(
            chord[(i ~/ 2 + pass) % 3],
            melodicTime + sixteenth * .2,
            sixteenth * 1.5,
            .4,
            step,
            answering: true,
          );
        }
      }
      if (i == 0 && (section == 1 || section == 3 || drift)) {
        for (final n in chord.take(3)) {
          _tone(
            _hz(n),
            sixteenth * (drift ? 15 : 12),
            drift ? .007 : .005,
            time,
            attack: drift ? .3 : .12,
          );
        }
      }
      time +=
          sixteenth *
          (i.isOdd ? 1 - (song['swing'] as num) : 1 + (song['swing'] as num));
    }
    final bytes = ByteData(count * 2);
    for (var k = 0; k < count; k++) {
      final echo = _echoFilter.tick(_delay[_delayAt]);
      _delay[_delayAt] = _send[k] + echo * .12;
      _delayAt = (_delayAt + 1) % _delay.length;
      final fade = math.min(1.0, (bar * barSeconds + k / musicRate) / .18);
      final x = _warmth.tick((_mix[k] + echo * .08) * fade);
      final limited = x.abs() < .7
          ? x
          : x.sign * (.7 + .3 * (1 - math.exp(-(x.abs() - .7) / .3)));
      bytes.setInt16(
        k * 2,
        (limited * 32767).round().clamp(-32768, 32767),
        Endian.little,
      );
    }
    _tail = Float64List.fromList(_mix.sublist(count));
    _sendTail = Float64List.fromList(_send.sublist(count));
    // Do not carry the large temporary mixing buffers into the next isolate.
    _mix = Float64List(0);
    _send = Float64List(0);
    bar++;
    return bytes.buffer.asUint8List();
  }
}

// A top-level entry point keeps UI state and Futures out of the isolate closure.
(MusicSynth, Uint8List) renderMusicBar((MusicSynth, bool) request) =>
    (request.$1, request.$1.renderBar(thinking: request.$2));
