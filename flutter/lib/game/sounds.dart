// sounds.js effects as offline synthesis: each effect is a list of voices (sine
// or triangle tones with exponential pitch and gain ramps, and band-passed noise
// bursts), mixed into 16-bit mono WAV clips that the app plays. Pure Dart.
import 'dart:math' as math;
import 'dart:typed_data';

import 'game_state.dart';

const int sampleRate = 22050;

abstract class _Voice {
  double get end;
  void mix(Float64List out);
}

class _Tone implements _Voice {
  final double f, dur, vol, delay, attack;
  final double? to;
  final bool triangle;
  _Tone(this.f, this.dur, this.triangle, this.vol, {this.delay = 0, this.to, this.attack = .008});
  @override
  double get end => delay + dur + .03;
  @override
  void mix(Float64List out) {
    final start = (delay * sampleRate).round();
    final n = ((dur + .03) * sampleRate).round();
    var phase = 0.0;
    for (var k = 0; k < n && start + k < out.length; k++) {
      final t = k / sampleRate;
      final freq = to == null ? f : f * math.pow(to! / f, math.min(1.0, t / dur));
      phase += freq / sampleRate;
      phase -= phase.floorToDouble();
      // exponentialRamp .0001 -> vol over `attack`, then -> .0001 at `dur`.
      final double g;
      if (t < attack) {
        g = .0001 * math.pow(vol / .0001, t / attack);
      } else if (t < dur) {
        g = vol * math.pow(.0001 / vol, (t - attack) / (dur - attack));
      } else {
        g = .0001;
      }
      final wave = triangle ? (phase < .5 ? 4 * phase - 1 : 3 - 4 * phase) : math.sin(2 * math.pi * phase);
      out[start + k] += wave * g;
    }
  }
}

class _Noise implements _Voice {
  final double dur, vol, from, to, delay;
  final math.Random rng;
  _Noise(this.dur, this.vol, this.from, this.to, this.rng, {this.delay = 0});
  @override
  double get end => delay + dur;
  @override
  void mix(Float64List out) {
    final start = (delay * sampleRate).round();
    final n = (dur * sampleRate).floor();
    // A band-pass biquad (Q 1.2) whose centre sweeps exponentially from -> to.
    double x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var k = 0; k < n && start + k < out.length; k++) {
      final x = (rng.nextDouble() * 2 - 1) * math.sin(math.pi * k / n);
      final fc = from * math.pow(to / from, k / n);
      final w0 = 2 * math.pi * fc / sampleRate;
      final alpha = math.sin(w0) / (2 * 1.2);
      final a0 = 1 + alpha;
      final b0 = alpha / a0, b2 = -alpha / a0, a1 = -2 * math.cos(w0) / a0, a2 = (1 - alpha) / a0;
      final y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      out[start + k] += y * vol;
    }
  }
}

const double _bass = 65.41;
const List<double> _melody = [523.25, 587.33, 659.25, 783.99];

List<_Voice> _voices(Sfx kind, int arg, math.Random rng) {
  final v = <_Voice>[];
  void tone(double f, double dur, int wave, double vol, {double delay = 0, double? to, double attack = .008}) =>
      v.add(_Tone(f, dur, wave == 1, vol, delay: delay, to: to, attack: attack));
  void noise(double dur, double vol, double from, double to, {double delay = 0}) =>
      v.add(_Noise(dur, vol, from, to, rng, delay: delay));
  void pluck(double f, double vol, double delay, double dur) {
    tone(f, dur, 0, vol, delay: delay);
    tone(f * 4, .09, 0, vol * .35, delay: delay);
    tone(f * 2, dur * .5, 1, vol * .25, delay: delay);
  }

  switch (kind) {
    case Sfx.activate:
      tone(240, .055, 0, .04, to: 180, attack: .003);
      tone(360, .03, 0, .012, delay: .004, to: 270, attack: .003);
    case Sfx.slide:
      noise(.3, .12, 450, 1700);
      tone(260, .2, 0, .04, to: 520);
    case Sfx.reflect:
      final f = _bass * const [4.0, 5.0, 6.0][arg.abs() % 3];
      tone(f, .22, 0, .23, to: f * .96);
      tone(f * 2, .07, 0, .035);
      tone(f * 1.5, .14, 1, .07, delay: .035);
      noise(.045, .06, 750, 260);
    case Sfx.spring:
      tone(170, .38, 0, .28, to: 108);
      tone(340, .13, 1, .055, to: 150);
      noise(.045, .06, 500, 120);
    case Sfx.pop:
      final streak = math.max(1, arg);
      final step = (streak - 1) % 10;
      final index = step < 6 ? step : 10 - step;
      final lift = (streak - 1) ~/ 10 % 2 == 1 ? .5 : 1.0;
      pluck(_melody[index % 4] * lift, .3 + rng.nextDouble() * .06, 0, .45);
      if (streak % 3 == 0) pluck(_melody[(index + 2) % 4] * lift, .16, .09, .4);
      if (streak % 10 == 0) {
        for (var i = 0; i < 4; i++) {
          pluck(_melody[i] * 2, .12, .05 + i * .06, .5);
        }
      }
    case Sfx.bump:
      tone(140, .28, 0, .6, to: 55);
      noise(.16, .35, 300, 90);
      tone(110, .2, 1, .2, delay: .01, to: 70);
    case Sfx.thud:
      tone(170, .14, 0, .3, to: 90);
      noise(.07, .14, 420, 160);
    case Sfx.blocked:
      tone(392, .07, 0, .1, to: 370);
      tone(311, .11, 0, .09, delay: .08, to: 294);
    case Sfx.undo:
      tone(620, .16, 0, .2, to: 330);
    case Sfx.hint:
      pluck(880, .35, 0, .25);
      pluck(1318.5, .35, .09, .4);
    case Sfx.win:
      _win(arg, tone);
  }
  return v;
}

void _win(int stars, void Function(double, double, int, double, {double delay, double? to, double attack}) tone) {
  if (stars == 0) {
    tone(_bass * 1.08, 1.1, 0, .18, to: _bass, attack: .045);
    tone(_bass * 1.5, 1.35, 0, .055, delay: .06, attack: .07);
    tone(_bass * 2, .8, 0, .025, delay: .02, attack: .035);
    tone(_bass * 4, 1.15, 0, .055, delay: .035, attack: .05);
    tone(_bass * 6, .95, 0, .025, delay: .07, attack: .08);
    return;
  }
  const phrases = [
    <(double, double)>[],
    [(0.0, 1.5), (0.2, 2.0)],
    [(0.0, 1.0), (0.12, 1.125), (0.24, 1.25), (0.42, 1.5), (0.74, 2.0)],
    [(0.0, 1.0), (0.09, 1.25), (0.18, 1.5), (0.32, 2.0), (0.46, 1.5), (0.61, 2.0)],
  ];
  final phrase = phrases[stars.clamp(1, 3)];
  const root = _bass * 4;
  final end = phrase.last.$1;
  tone(_bass, stars == 1 ? .45 : 1.05, 0, .16, attack: .025);
  tone(_bass * 2, stars == 1 ? .38 : .8, 0, .055, delay: .015, attack: .02);
  for (var index = 0; index < phrase.length; index++) {
    final (delay, ratio) = phrase[index];
    final last = index == phrase.length - 1;
    final pitch = root * ratio;
    final length = switch (stars) { 1 => last ? .28 : .18, 2 => last ? .65 : .22, _ => last ? .99 : .32 };
    tone(pitch, length, 1, .16, delay: delay, attack: .012);
    final upper = stars == 1 ? (last ? .22 : .07) : (last ? (stars == 2 ? .48 : .6) : .16);
    tone(pitch * 2, upper, 0, .025, delay: delay, attack: .018);
  }
  switch (stars) {
    case 1:
      tone(root, .26, 0, .045, delay: end, attack: .03);
    case 2:
      tone(root * 1.25, .7, 0, .055, delay: end, attack: .025);
      tone(root * 1.5, .7, 0, .045, delay: end, attack: .025);
    default:
      tone(_bass * 3, .95, 0, .045, delay: end, attack: .03);
      tone(root, .95, 0, .045, delay: end, attack: .025);
      tone(root * 2.5, .95, 1, .065, delay: end, attack: .025);
      tone(root * 3, .95, 0, .05, delay: end, attack: .03);
  }
}

/// Minimum milliseconds between two plays of the same effect (sounds.js GAPS).
const Map<Sfx, int> sfxGaps = {
  Sfx.activate: 25,
  Sfx.slide: 45,
  Sfx.reflect: 40,
  Sfx.spring: 80,
  Sfx.pop: 45,
  Sfx.bump: 110,
  Sfx.thud: 60,
  Sfx.blocked: 90,
  Sfx.undo: 80,
  Sfx.hint: 250,
  Sfx.win: 150,
};

/// Render one effect as a WAV file. `gain` is the bus level (sounds.js Soft is .15, Full .6).
Uint8List renderSfx(Sfx kind, int arg, {double gain = .6, int seed = 7}) {
  final voices = _voices(kind, arg, math.Random(seed + arg));
  var end = 0.0;
  for (final v in voices) {
    end = math.max(end, v.end);
  }
  final out = Float64List((end * sampleRate).ceil() + 1);
  for (final v in voices) {
    v.mix(out);
  }
  final pcm = Int16List(out.length);
  for (var i = 0; i < out.length; i++) {
    // A soft limiter in place of the Web Audio compressor.
    final x = out[i] * gain;
    final y = x.abs() < .7 ? x : x.sign * (.7 + .3 * (1 - math.exp(-(x.abs() - .7) / .3)));
    pcm[i] = (y * 32767).round().clamp(-32768, 32767);
  }
  return _wav(pcm);
}

Uint8List _wav(Int16List pcm) {
  final data = pcm.buffer.asUint8List(pcm.offsetInBytes, pcm.lengthInBytes);
  final b = BytesBuilder();
  void str(String s) => b.add(s.codeUnits);
  void u32(int v) => b.add((ByteData(4)..setUint32(0, v, Endian.little)).buffer.asUint8List());
  void u16(int v) => b.add((ByteData(2)..setUint16(0, v, Endian.little)).buffer.asUint8List());
  str('RIFF');
  u32(36 + data.length);
  str('WAVE');
  str('fmt ');
  u32(16);
  u16(1);
  u16(1);
  u32(sampleRate);
  u32(sampleRate * 2);
  u16(2);
  u16(16);
  str('data');
  u32(data.length);
  b.add(data);
  return b.toBytes();
}
