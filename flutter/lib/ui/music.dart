import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../game/music.dart';

/// Bounded PCM streaming: synthesize one bar off the UI thread, then let the
/// native audio buffer pace the next one. No files, downloads or growing queue.
class MusicPlayer with WidgetsBindingObserver {
  static const _channel = MethodChannel('monkey_fist/music');
  String setting = 'off';
  int _level = 1, _epoch = 0;
  bool _playing = false, _foreground = true, _running = false;
  final Stopwatch _activity = Stopwatch()..start();

  MusicPlayer() {
    WidgetsBinding.instance.addObserver(this);
  }

  /// Android streams to AudioTrack (MainActivity.kt), iOS to AVAudioEngine
  /// (AppDelegate.swift).
  bool get supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  double get _volume => setting == 'full' ? 1.0 : .55;

  void setSetting(String value) {
    setting = value;
    if (value == 'off') {
      _stop();
    } else if (_running) {
      unawaited(_volumeChanged(_epoch));
    } else {
      _sync();
    }
  }

  Future<void> _volumeChanged(int id) async {
    try {
      await _channel.invokeMethod<void>('volume', {
        'id': id,
        'volume': _volume,
      });
    } catch (_) {
      /* Audio remains optional. */
    }
  }

  void startLevel(int level) {
    _stop();
    _level = level;
    _playing = true;
    activity();
    _sync();
  }

  void pause() {
    _playing = false;
    _stop();
  }

  void activity() => _activity.reset();

  void _sync() {
    if (_playing &&
        _foreground &&
        setting != 'off' &&
        !_running &&
        supported) {
      _running = true;
      unawaited(_run(++_epoch, _level));
    }
  }

  Future<void> _run(int id, int level) async {
    var synth = MusicSynth(level);
    var started = false;
    try {
      while (_running && id == _epoch) {
        final rendered = await compute(renderMusicBar, (
          synth,
          _activity.elapsed.inSeconds >= 20,
        ));
        synth = rendered.$1;
        if (!_running || id != _epoch) break;
        if (!started) {
          await _channel.invokeMethod<void>('start', {
            'id': id,
            'volume': _volume,
          });
          started = true;
        }
        if (!_running || id != _epoch) break;
        final accepted = await _channel.invokeMethod<bool>('write', {
          'id': id,
          'pcm': rendered.$2,
        });
        if (accepted != true) break;
      }
    } catch (_) {
      // A missing/unavailable audio device must not interrupt a puzzle.
    } finally {
      try {
        await _channel.invokeMethod<void>('stop', {'id': id});
      } catch (_) {
        /* The activity may already have been destroyed. */
      }
      if (id == _epoch) _running = false;
    }
  }

  void _stop() {
    final previous = _epoch++;
    _running = false;
    unawaited(_stopNative(previous));
  }

  Future<void> _stopNative(int id) async {
    try {
      await _channel.invokeMethod<void>('stop', {'id': id});
    } catch (_) {
      /* No native session may exist yet. */
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    if (_foreground) {
      _sync();
    } else {
      _stop();
    }
  }

  void dispose() {
    _playing = false;
    _stop();
    WidgetsBinding.instance.removeObserver(this);
  }
}
