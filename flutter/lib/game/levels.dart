// Generates levels of any set (Journey or Custom) off the UI thread
// (Isolate.run) and keeps the ones already woven, so replays and "next level"
// are instant.
import 'dart:async';
import 'dart:isolate';

import '../core/engine.dart';

// Keep the isolate closure outside LevelStore's cache/error-handler scope.
// Capturing that scope also captures cached Futures, which cannot be sent.
Future<Level?> _generateInIsolate(String code, int index) =>
    Isolate.run(() => generateCode(code, index));

class LevelStore {
  final Map<String, Future<Level?>> _cache = {};

  Future<Level?> get(int index, [String code = journeyCode]) {
    final key = '$code/$index';
    return _cache.putIfAbsent(key, () {
      return _generateInIsolate(code, index).catchError((Object _) {
        _cache.remove(key);
        return null;
      });
    });
  }

  /// Start weaving a level in the background without waiting for it.
  void prefetch(int index, [String code = journeyCode]) {
    final o = parseCode(code);
    if (o != null && index >= 0 && index < o.count) unawaited(get(index, code));
  }
}
