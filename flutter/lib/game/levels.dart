// Generates Journey levels off the UI thread (Isolate.run) and keeps the ones
// already woven, so replays and "next level" are instant.
import 'dart:async';
import 'dart:isolate';

import '../core/engine.dart';

class LevelStore {
  final String code;
  final Map<int, Future<Level?>> _cache = {};
  LevelStore([this.code = journeyCode]);

  Future<Level?> get(int index) => _cache.putIfAbsent(index, () {
        final code = this.code;
        return Isolate.run(() => generateCode(code, index)).catchError((Object _) {
          _cache.remove(index);
          return null;
        });
      });

  /// Start weaving a level in the background without waiting for it.
  void prefetch(int index) {
    if (index >= 0 && index < 120) unawaited(get(index));
  }
}
