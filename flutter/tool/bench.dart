// ignore_for_file: avoid_print
// Journey generation timing: every level once, mean / median / max per level.
// JIT:  dart run tool/bench.dart
// AOT:  dart compile exe tool/bench.dart -o /tmp/mf-bench && /tmp/mf-bench
import 'package:monkey_fist/core/engine.dart';

void main(List<String> args) {
  final count = args.isEmpty ? 120 : int.parse(args[0]);
  final times = <double>[];
  for (var i = 0; i < count; i++) {
    final sw = Stopwatch()..start();
    final l = generate(journeyOpts, i);
    times.add(sw.elapsedMicroseconds / 1000);
    if (l == null) throw StateError('level ${i + 1} failed');
  }
  final total = times.reduce((a, b) => a + b);
  final sorted = [...times]..sort();
  print('Journey ($count levels): mean ${(total / count).toStringAsFixed(1)} ms, '
      'median ${sorted[count ~/ 2].toStringAsFixed(1)} ms, max ${sorted.last.toStringAsFixed(0)} ms, '
      'total ${(total / 1000).toStringAsFixed(1)} s');
}
