// Plays the synthesized effects. Clips are rendered once (lib/game/sounds.dart),
// written to the temporary directory and played from a small pool of players,
// rate-limited per effect as sounds.js does. Audio failures never reach the game.
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../game/game_state.dart';
import '../game/sounds.dart';

class SfxPlayer {
  bool enabled;
  final List<AudioPlayer> _pool = [];
  int _next = 0;
  final Map<String, Future<String?>> _files = {};
  final Map<Sfx, int> _lastAt = {};
  final Stopwatch _clock = Stopwatch()..start();
  bool _ready = false;
  bool _broken = false;

  SfxPlayer({this.enabled = true});

  Future<void> _init() async {
    if (_ready || _broken) return;
    try {
      await AudioPlayer.global.setAudioContext(AudioContextConfig(
        focus: AudioContextConfigFocus.mixWithOthers,
        respectSilence: true,
      ).build());
      for (var i = 0; i < 8; i++) {
        final p = AudioPlayer();
        await p.setReleaseMode(ReleaseMode.stop);
        if (defaultTargetPlatform == TargetPlatform.android) await p.setPlayerMode(PlayerMode.lowLatency);
        _pool.add(p);
      }
      _ready = true;
    } catch (_) {
      _broken = true;
    }
  }

  static String _key(Sfx kind, int arg) {
    if (kind == Sfx.pop) return 'pop${(arg - 1) % 60}';
    if (kind == Sfx.reflect) return 'reflect${arg.abs() % 3}';
    if (kind == Sfx.win) return 'win$arg';
    return kind.name;
  }

  Future<String?> _file(Sfx kind, int arg) => _files.putIfAbsent(_key(kind, arg), () async {
        try {
          final bytes = await compute(_render, (kind.index, arg));
          final dir = await getTemporaryDirectory();
          final f = File('${dir.path}/mf-${_key(kind, arg)}.wav');
          await f.writeAsBytes(bytes, flush: true);
          return f.path;
        } catch (_) {
          return null;
        }
      });

  static Uint8List _render((int, int) a) => renderSfx(Sfx.values[a.$1], a.$2, gain: .6);

  /// Render the common clips ahead of the first tap.
  Future<void> warmUp() async {
    await _init();
    for (final k in [Sfx.activate, Sfx.slide, Sfx.thud, Sfx.blocked, Sfx.pop, Sfx.reflect, Sfx.spring]) {
      await _file(k, 1);
    }
  }

  void play(Sfx kind, int arg) {
    if (!enabled) return;
    final now = _clock.elapsedMilliseconds;
    final last = _lastAt[kind];
    if (last != null && now - last < (sfxGaps[kind] ?? 0)) return;
    _lastAt[kind] = now;
    _play(kind, arg);
  }

  Future<void> _play(Sfx kind, int arg) async {
    try {
      await _init();
      if (_broken || _pool.isEmpty) return;
      final path = await _file(kind, arg);
      if (path == null) return;
      final p = _pool[_next];
      _next = (_next + 1) % _pool.length;
      await p.stop();
      await p.play(DeviceFileSource(path));
    } catch (_) {
      // Sound is optional.
    }
  }
}
