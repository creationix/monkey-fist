// Saved progress: Journey chapter unlocks and best scores, as app.js keeps them
// under its save key. Scores belong to generated boards, so they are cleared
// when gridVersion changes; chapter unlocks are kept.
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../core/engine.dart';

class Best {
  final int taps;
  final int stars;
  const Best(this.taps, this.stars);
}

class Progress {
  static const _key = 'monkey-fist-unified-v1';
  final SharedPreferences? _prefs;
  int chapters = 1;
  final Map<int, Best> scores = {};
  bool sound = true;
  String speed = 'normal';

  Progress._(this._prefs);

  /// In-memory progress (tests, or when storage is unavailable).
  Progress.memory() : _prefs = null;

  static Future<Progress> load() async {
    SharedPreferences? prefs;
    try {
      prefs = await SharedPreferences.getInstance();
    } catch (_) {
      return Progress.memory();
    }
    final p = Progress._(prefs);
    final raw = prefs.getString(_key);
    if (raw != null) {
      try {
        final j = jsonDecode(raw) as Map<String, dynamic>;
        p.chapters = (j['chapters'] as int?) ?? 1;
        p.sound = (j['sound'] as bool?) ?? true;
        p.speed = (j['speed'] as String?) ?? 'normal';
        if (j['version'] == gridVersion) {
          final s = (j['scores'] as Map<String, dynamic>?) ?? {};
          for (final e in s.entries) {
            final v = e.value as Map<String, dynamic>;
            p.scores[int.parse(e.key)] = Best(v['taps'] as int, v['stars'] as int);
          }
        }
      } catch (_) {
        // A damaged save starts over.
      }
    }
    return p;
  }

  int get available => journeyAvailable(chapters);

  /// Record a finished level. Returns the number of chapters newly opened.
  int record(int index, int taps, int stars) {
    final old = scores[index];
    if (old == null || stars > old.stars || (stars == old.stars && taps < old.taps)) {
      scores[index] = Best(taps, stars);
    }
    final previous = chapters;
    chapters = journeyUnlock(chapters, index);
    save();
    return chapters - previous;
  }

  void save() {
    final prefs = _prefs;
    if (prefs == null) return;
    prefs.setString(
        _key,
        jsonEncode({
          'version': gridVersion,
          'chapters': chapters,
          'sound': sound,
          'speed': speed,
          'scores': {for (final e in scores.entries) '${e.key}': {'taps': e.value.taps, 'stars': e.value.stars}},
        }));
  }
}
