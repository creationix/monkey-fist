// Saved progress, as app.js keeps it under its save key: best scores for every
// set (Journey and each Custom set, by set code), Journey chapter unlocks, the
// last Custom options and set played, and the settings. Scores belong to
// generated boards, so they are cleared when gridVersion changes; chapter
// unlocks are kept.
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'package:shared_preferences/shared_preferences.dart';

import '../core/engine.dart';

class Best {
  final int taps;
  final int stars;
  const Best(this.taps, this.stars);
}

class Progress extends ChangeNotifier {
  static const _key = 'monkey-fist-unified-v1';
  final SharedPreferences? _prefs;
  final Map<String, Map<int, Best>> sets = {};
  final Map<String, int> chapterSets = {};

  /// The last Custom options, offered again when Custom is chosen.
  SetOpts? custom;

  /// The set played last, shown first on Levels.
  String code = journeyCode;
  String soundLevel = 'soft';
  bool get sound => soundLevel != 'off';
  set sound(bool enabled) => soundLevel = enabled ? 'full' : 'off';
  bool highContrast = false;
  String music = 'off';
  String graphics = 'rope';
  String speed = 'normal';

  Progress._(this._prefs);

  /// In-memory progress (tests, or when storage is unavailable).
  Progress.memory() : _prefs = null;

  int get chapters => chaptersFor(journeyCode);
  set chapters(int value) => chapterSets[journeyCode] = value;

  /// Journey scores.
  Map<int, Best> get scores => scoresFor(journeyCode);
  int get available => journeyAvailable(chapters);

  Map<int, Best> scoresFor(String code) => sets.putIfAbsent(code, () => {});
  int chaptersFor(String code) => chapterSets[code] ?? 1;
  int availableFor(SetOpts o) => setAvailable(o, chaptersFor(setCode(o)));

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
        p._read(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {
        // A damaged save starts over.
      }
    }
    return p;
  }

  void _read(Map<String, dynamic> j) {
    final sound = j['sound'];
    soundLevel = sound is bool
        ? (sound ? 'full' : 'off')
        : ['off', 'soft', 'full'].contains(sound)
        ? sound as String
        : 'soft';
    highContrast = j['highContrast'] == true || j['oled'] == true;
    final music = j['music'];
    this.music = ['off', 'soft', 'full'].contains(music) ? music as String : 'off';
    graphics = j['graphics'] == 'tiles' ? 'tiles' : 'rope';
    speed = ['slow', 'normal', 'fast'].contains(j['speed']) ? j['speed'] as String : 'normal';
    final unlocked = j['chapterSets'];
    if (unlocked is Map) {
      for (final e in unlocked.entries) {
        if (e.value is int) chapterSets[e.key as String] = e.value as int;
      }
    }
    if (j['chapters'] is int) chapters = j['chapters'] as int;
    final customCode = j['custom'];
    if (customCode is String) custom = parseCode(customCode);
    final last = j['code'];
    if (last is String && parseCode(last) != null) code = last;
    if (j['version'] != gridVersion) return;
    Map<int, Best> readScores(Map s) => {
      for (final e in s.entries)
        int.parse(e.key as String): Best(e.value['taps'] as int, e.value['stars'] as int),
    };
    final all = j['sets'];
    if (all is Map) {
      for (final e in all.entries) {
        sets[e.key as String] = readScores(e.value as Map);
      }
    } else if (j['scores'] is Map) {
      // Saves before Custom sets kept only Journey scores.
      sets[journeyCode] = readScores(j['scores'] as Map);
    }
  }

  /// Record a finished level. Returns the number of chapters newly opened.
  int record(int index, int taps, int stars, {String code = journeyCode}) {
    final scores = scoresFor(code);
    final old = scores[index];
    if (old == null || stars > old.stars || (stars == old.stars && taps < old.taps)) {
      scores[index] = Best(taps, stars);
    }
    final previous = chaptersFor(code);
    if (code == journeyCode) chapterSets[code] = journeyUnlock(previous, index);
    save();
    return chaptersFor(code) - previous;
  }

  /// Store everything; [notify] also rebuilds the screens that show progress.
  void save({bool notify = true}) {
    if (notify) notifyListeners();
    final prefs = _prefs;
    if (prefs == null) return;
    prefs.setString(
      _key,
      jsonEncode({
        'version': gridVersion,
        'chapters': chapters,
        'chapterSets': chapterSets,
        'sound': soundLevel,
        'highContrast': highContrast,
        'music': music,
        'graphics': graphics,
        'speed': speed,
        'code': code,
        if (custom != null) 'custom': setCode(custom!),
        'sets': {
          for (final s in sets.entries)
            if (s.value.isNotEmpty)
              s.key: {
                for (final e in s.value.entries) '${e.key}': {'taps': e.value.taps, 'stars': e.value.stars},
              },
        },
      }),
    );
  }
}
