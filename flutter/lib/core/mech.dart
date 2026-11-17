// Full-geometry movement for both grids (mechanics.js, hex/mechanics.js): every
// tap and its animated route, mirrors turning, spinners reversing, and the
// bounded full-path solvers. Plus the kernel routing of game-engine.js.
import 'hex.dart';
import 'square.dart';
import 'util.dart';

class Move {
  final List<Path?> paths;
  final int event;
  final int distance;
  final List<Pt> route;
  Move(this.paths, this.event, this.distance, this.route);
}

/// Per-board lookup tables, built once per board.
class Geo {
  final bool hex;
  final int w, h;
  final List<int> mirror;
  final List<bool> spring;
  final int nmirrors, nsprings;
  final List<int> occ;
  int stamp = 0;
  int tracked = -1;
  // Visited cells (Hex) or cell-and-direction states (square) of the current tap.
  final List<int> _seen;
  int _seenStamp = 0;
  final SqMirrors sqm;

  Geo(Board b)
      : hex = b.hex,
        w = b.w,
        h = b.h,
        mirror = List<int>.filled(b.w * b.h, -1),
        spring = List<bool>.filled(b.w * b.h, false),
        nmirrors = b.mirrors.length,
        nsprings = b.springs.length,
        occ = List<int>.filled(b.w * b.h, 0),
        _seen = List<int>.filled(b.w * b.h * 9, 0),
        sqm = b.hex ? SqMirrors.empty() : SqMirrors.ofBoard(b) {
    for (final m in b.mirrors) {
      mirror[cell(m.cell)] = m.kind;
    }
    for (final p in b.springs) {
      spring[cell(p)] = true;
    }
  }

  int _nextSeen() => ++_seenStamp;

  int cell(Pt p) => hex ? hexCell(p, w) : p.r * w + p.q;

  bool inside(Pt p) => hex ? hexInside(w, h, p) : p.q >= 0 && p.r >= 0 && p.q < w && p.r < h;

  /// The direction a rope leaves in: its head's direction, turned by a mirror under the head.
  (int, int) direction(Path path) {
    final (dq, dr) = headDir(path);
    final m = mirror[cell(lastPt(path))];
    if (m < 0) return (dq, dr);
    if (hex) {
      final d = hexReflect(hexDirIndex(dq, dr), m);
      return (hexDq[d], hexDr[d]);
    }
    return turn(m, dq, dr);
  }

  int mark(List<Path?> paths) {
    stamp++;
    final s = stamp;
    for (final path in paths) {
      if (path != null) {
        for (final c in path) {
          occ[cell(c)] = s;
        }
      }
    }
    return s;
  }

  static List<Path?> _replace(List<Path?> paths, int i, Path? p) {
    final next = List<Path?>.of(paths);
    next[i] = p;
    return next;
  }

  static Path _tail(List<Pt> route, int n) => route.sublist(route.length - n);

  Move? tap(List<Path?> paths, int i) {
    final path = paths[i];
    if (path == null) return null;
    final s = mark(paths);
    final route = List<Pt>.of(path);
    var (dq, dr) = direction(path);
    var p = lastPt(path);
    var distance = 0;
    if (hex) {
      final seen = _nextSeen();
      var d = hexDirIndex(dq, dr);
      while (true) {
        final next = Pt(p.q + hexDq[d], p.r + hexDr[d]);
        if (!inside(next)) {
          for (var k = 0; k < path.length + 2; k++) {
            p = Pt(p.q + hexDq[d], p.r + hexDr[d]);
            route.add(p);
            distance++;
          }
          return Move(_replace(paths, i, null), evExit, distance, route);
        }
        final c = cell(next);
        if (occ[c] == s) break;
        if (spring[c]) {
          route.add(next);
          distance++;
          final back = _tail(route, path.length).reversed.toList();
          return Move(_replace(paths, i, back), evBounce, distance, route);
        }
        if (_seen[c] == seen) return null;
        _seen[c] = seen;
        p = next;
        route.add(p);
        distance++;
        final axis = mirror[c];
        if (axis >= 0) d = hexReflect(d, axis);
      }
      if (distance == 0) return null;
      return Move(_replace(paths, i, _tail(route, path.length)), evSlide, distance, route);
    }
    final seen = _nextSeen();
    var event = evSlide;
    while (true) {
      final state = ((p.r * w + p.q) * 3 + dq + 1) * 3 + dr + 1;
      if (_seen[state] == seen) return null;
      _seen[state] = seen;
      final nq = p.q + dq, nr = p.r + dr;
      if (nq < 0 || nr < 0 || nq >= w || nr >= h) {
        event = evExit;
        for (var k = 0; k < path.length + 2; k++) {
          p = Pt(p.q + dq, p.r + dr);
          route.add(p);
          distance++;
        }
        break;
      }
      final c = nr * w + nq;
      if (occ[c] == s) break;
      p = Pt(nq, nr);
      route.add(p);
      distance++;
      if (spring[c]) {
        event = evBounce;
        break;
      }
      final m = mirror[c];
      if (m >= 0) {
        final t = turn(m, dq, dr);
        dq = t.$1;
        dr = t.$2;
      }
    }
    if (event == evSlide && distance == 0) return null;
    Path? rest;
    if (event != evExit) {
      final t = _tail(route, path.length);
      rest = event == evBounce ? t.reversed.toList() : t;
    }
    return Move(_replace(paths, i, rest), event, distance, route);
  }

  bool allFreeFull(List<Path?> paths) {
    for (var i = 0; i < paths.length; i++) {
      if (paths[i] != null) {
        final m = tap(paths, i);
        if (m == null || m.event != evExit) return false;
      }
    }
    return true;
  }

  /// An injective key for a board position (JSON.stringify of the paths in the JS).
  String key(List<Path?> paths) {
    final codes = <int>[];
    for (final path in paths) {
      if (path == null) {
        codes.add(1);
      } else {
        codes.add(path.length + 2);
        for (final c in path) {
          codes.add(cell(c) + 1);
        }
      }
    }
    return String.fromCharCodes(codes);
  }

  /// mechanics.js / hex/mechanics.js solve: depth-first over full geometry.
  Solved solveFull(List<Path?> paths, int budget, List<int> prefer) {
    final visited = <String>{};
    final moves = <int>[];
    var nodes = 0;
    var unknown = false;
    if (hex) {
      bool search(List<Path?> current, int pi) {
        if (allGone(current)) return true;
        final state = key(current);
        if (visited.contains(state)) return false;
        nodes++;
        if (nodes > budget) {
          unknown = true;
          return false;
        }
        visited.add(state);
        final p0 = pi < prefer.length ? prefer[pi] : -1;
        final tries = <(int, Move)>[];
        for (var i = 0; i < current.length; i++) {
          if (current[i] != null) {
            final m = tap(current, i);
            if (m != null) tries.add((i, m));
          }
        }
        ssort<(int, Move)>(tries, (a, b) {
          if (a.$1 == p0) return -1;
          if (b.$1 == p0) return 1;
          return (a.$2.event == evExit ? 0 : 1) - (b.$2.event == evExit ? 0 : 1);
        });
        for (final t in tries) {
          moves.add(t.$1);
          if (search(t.$2.paths, t.$1 == p0 ? pi + 1 : pi)) return true;
          moves.removeLast();
          if (unknown) return false;
        }
        return false;
      }

      final solved = search(paths, 0);
      return Solved(solved ? true : (unknown ? null : false), solved ? moves : <int>[], nodes);
    }
    final n = paths.length;
    final first = <int, int>{};
    final lastk = <int, int>{};
    final moved = List<int>.filled(n, 0);
    for (var k = 0; k < prefer.length; k++) {
      final i = prefer[k];
      if (!first.containsKey(i)) first[i] = k;
      lastk[i] = k;
    }
    bool search(List<Path?> current) {
      if (allGone(current)) return true;
      final k = key(current);
      if (visited.contains(k)) return false;
      nodes++;
      if (nodes > budget) {
        unknown = true;
        return false;
      }
      visited.add(k);
      final tries = <(int, Move, int)>[];
      for (var i = 0; i < current.length; i++) {
        final next = tap(current, i);
        if (next == null) continue;
        final rank = (moved[i] > 0 ? lastk : first)[i] ?? n * 4;
        final ev = next.event == evExit ? 0 : (next.event == evBounce ? 1 : 2);
        tries.add((i, next, rank * 3 + ev));
      }
      ssort<(int, Move, int)>(tries, (a, b) => a.$3 != b.$3 ? a.$3 - b.$3 : a.$1 - b.$1);
      for (final t in tries) {
        moves.add(t.$1);
        moved[t.$1]++;
        if (search(t.$2.paths)) return true;
        moved[t.$1]--;
        moves.removeLast();
        if (unknown) return false;
      }
      return false;
    }

    final solved = search(paths);
    return Solved(solved ? true : (unknown ? null : false), solved ? moves : <int>[], nodes);
  }
}

// ---------- game-engine.js kernel routing ----------

extension BoardKernels on Board {
  Geo geo() => Geo(this);

  /// Without spinners every rope keeps one fixed track (mirrors included), so
  /// replays and searches run on the compact offset kernels.
  bool tracked(Geo g) {
    if (springs.isNotEmpty) return false;
    if (g.tracked < 0) {
      final ok = hex
          ? hexCompile(w, h, mirrors, somePaths(ropes)) != null
          : sqBoard(somePaths(ropes), w, h, g.sqm) != null;
      g.tracked = ok ? 1 : 0;
    }
    return g.tracked == 1;
  }

  bool allFree(Geo g, List<Path?> paths) {
    if (tracked(g)) {
      return hex ? hexCompileExn(w, h, mirrors, paths).free() : sqFree(paths, w, h, g.sqm);
    }
    return g.allFreeFull(paths);
  }

  Replayed replay(Geo g, List<int> moves, List<Path?> paths) {
    if (tracked(g)) {
      return hex ? hexReplay(w, h, mirrors, moves, paths) : sqReplay(paths, w, h, moves, g.sqm);
    }
    var taps = 0;
    var automatic = false;
    final events = <int>[];
    var cur = paths;
    for (final i in moves) {
      final m = g.tap(cur, i);
      if (m == null) return Replayed(false, taps, events, cur);
      if (!automatic) taps++;
      cur = m.paths;
      events.add(m.event);
      if (allFree(g, cur)) automatic = true;
    }
    return Replayed(allGone(cur), taps, events, cur);
  }

  Replayed replayPlan(Geo g, List<int> plan) => replay(g, plan, somePaths(ropes));

  Solved solve(Geo g, List<Path?> paths, int budget, List<int> prefer) {
    if (!tracked(g)) return g.solveFull(paths, budget, prefer);
    return hex ? hexSolve(w, h, mirrors, paths, budget, prefer) : sqSolve(paths, w, h, budget, prefer, g.sqm);
  }

  List<int> frozen(Geo g, List<Path?> paths) {
    if (tracked(g)) {
      return hex ? hexCompileExn(w, h, mirrors, paths).frozen() : sqFrozen(paths, w, h, g.sqm);
    }
    final remaining = List<Path?>.of(paths);
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < remaining.length; i++) {
        if (remaining[i] != null && g.tap(remaining, i) != null) {
          remaining[i] = null;
          changed = true;
        }
      }
    }
    final out = <int>[];
    for (var i = 0; i < remaining.length; i++) {
      if (remaining[i] != null) out.add(i);
    }
    return out;
  }

  /// Breadth-first search over player taps; once every remaining rope has a clear
  /// exit, the rest of the certificate is an automatic suffix.
  Par minimumTaps(Geo g, List<int> fallback, int budget) {
    final verified = replayPlan(g, fallback);
    if (!verified.solved) throw GenError('Par requires a complete solution');
    final start = somePaths(ropes);
    final qpaths = <List<Path?>>[start];
    final qparent = <int>[-1];
    final qmove = <int>[-1];
    final qdepth = <int>[0];
    final seen = <String>{g.key(start)};
    var q = 0;
    while (q < qpaths.length) {
      if (q >= budget) return Par(List<int>.of(fallback), verified.taps, false);
      final paths = qpaths[q];
      final depth = qdepth[q];
      if (depth >= verified.taps) {
        q++;
        continue;
      }
      if (allFree(g, paths)) {
        final plan = <int>[];
        var node = q;
        while (qparent[node] >= 0) {
          plan.add(qmove[node]);
          node = qparent[node];
        }
        final out = plan.reversed.toList();
        var any = false;
        for (var i = 0; i < paths.length; i++) {
          if (paths[i] != null) {
            out.add(i);
            any = true;
          }
        }
        return Par(out, imax(any ? 1 : 0, depth), true);
      }
      for (var i = 0; i < paths.length; i++) {
        if (paths[i] == null) continue;
        final next = g.tap(paths, i);
        if (next == null) continue;
        final k = g.key(next.paths);
        if (seen.contains(k)) continue;
        seen.add(k);
        qpaths.add(next.paths);
        qparent.add(q);
        qmove.add(i);
        qdepth.add(depth + 1);
      }
      q++;
    }
    return Par(List<int>.of(fallback), verified.taps, true);
  }
}
