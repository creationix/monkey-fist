// grid-generator.js: fixed board dimensions, candidates chosen by measured play.
import 'dart:math' as math;

import 'hex.dart';
import 'mech.dart';
import 'metrics.dart';
import 'square.dart';
import 'util.dart';
import 'weave.dart';

class Spec {
  final bool hex;
  final int w, h;
  final double difficulty;
  final bool mirrors, springs;
  final String seed;
  final bool requireSlide;
  final int minMirrors, minSprings;
  final bool colossal;
  const Spec({
    required this.hex,
    required this.w,
    required this.h,
    required this.difficulty,
    required this.mirrors,
    required this.springs,
    required this.seed,
    this.requireSlide = false,
    this.minMirrors = 0,
    this.minSprings = 0,
    this.colossal = false,
  });
}

class Level {
  final Board board;
  final int par;
  final bool exact;
  final double coverage, wins, challenge;
  String layoutKey;
  Level(this.board, this.par, this.exact, this.coverage, this.wins, this.challenge, this.layoutKey);
}

double _coverage(Board b) {
  var sum = 0;
  for (final p in b.ropes) {
    sum += p.length;
  }
  return sum / (b.w * b.h - b.mirrors.length - b.springs.length);
}

bool _adjacent(Pt a, Pt b, bool hex) {
  final dq = b.q - a.q, dr = b.r - a.r;
  if (hex) return hexDirIndex(dq, dr) >= 0;
  return (dq == 0 && (dr == 1 || dr == -1)) || (dr == 0 && (dq == 1 || dq == -1));
}

bool _valid(Board b, Geo g) {
  final used = List<bool>.filled(b.w * b.h, false);
  for (final p in b.springs) {
    used[g.cell(p)] = true;
  }
  for (final m in b.mirrors) {
    used[g.cell(m.cell)] = true;
  }
  for (final path in b.ropes) {
    if (path.length < 2) return false;
    for (var i = 0; i < path.length; i++) {
      final p = path[i];
      if (!g.inside(p) || used[g.cell(p)]) return false;
      if (i > 0 && !_adjacent(path[i - 1], p, b.hex)) return false;
      used[g.cell(p)] = true;
    }
  }
  return true;
}

class _Core {
  final List<Path> ropes;
  final List<List<int>> stops;
  final List<int> plan;
  _Core(this.ropes, this.stops, this.plan);
}

_Core? _repeatedCore(bool hex, int w, int height, double d, Rng rng) {
  final options = <List<Path>>[];
  final maximum = imin(imin(10, imin(w, height) ~/ 2), imax(w, height) - 4);
  final wanted = jsRound(3.0 + dmax(0.0, dmin(1.0, (d - 60.0) / 40.0)) * (maximum - 3));
  var depth = imin(maximum, wanted);
  while (depth >= 3) {
    final roomy = imin(w, height) >= 10;
    final extra = roomy ? rng.below(3) : 0;
    final bottom = roomy ? 2 + rng.below(3) : 2;
    final side = roomy ? 1 + rng.below(2) : 1;
    final a = <Pt>[], b = <Pt>[];
    final left = -depth - 3 - extra;
    for (var r = 1; r <= depth; r++) {
      a.add(Pt(0, r));
    }
    for (var q = -1; q >= left; q--) {
      a.add(Pt(q, depth));
    }
    var column = left;
    for (var r = depth - 1; r >= 0; r--) {
      final next = (extra > 0 && r > 0 && r % 3 == 1) ? left - 1 : left;
      if (next != column) a.add(Pt(next, r + 1));
      a.add(Pt(next, r));
      column = next;
    }
    for (var q = left + 1; q <= -depth - 2; q++) {
      a.add(Pt(q, 0));
    }
    for (var q = -depth; q <= -1; q++) {
      b.add(Pt(q, 0));
    }
    for (var q = -1; q >= -side; q--) {
      b.add(Pt(q, -1));
    }
    for (var r = -2; r >= -bottom; r--) {
      b.add(Pt(-side, r));
    }
    for (var q = 1 - side; q <= 0; q++) {
      b.add(Pt(q, -bottom));
    }
    for (var r = 1 - bottom; r <= -1; r++) {
      b.add(Pt(0, r));
    }
    for (var turnN = 0; turnN < (hex ? 6 : 4); turnN++) {
      for (final flip in [false, true]) {
        final ropes = [
          for (final path in [a, b])
            [
              for (final p in path)
                () {
                  var q = p.q, r = p.r;
                  if (flip) {
                    final t = q;
                    q = r;
                    r = t;
                  }
                  for (var k = 0; k < turnN; k++) {
                    final t = q;
                    if (hex) {
                      q = -r;
                      r = t + r;
                    } else {
                      q = -r;
                      r = t;
                    }
                  }
                  return Pt(q, r);
                }()
            ]
        ];
        var r0 = 1000000, r1 = -1000000;
        for (final path in ropes) {
          for (final p in path) {
            r0 = imin(r0, p.r);
            r1 = imax(r1, p.r);
          }
        }
        final rows = r1 - r0 + 1;
        if (rows > height) continue;
        final row = rng.below(height - rows + 1);
        var x0 = 1000000, x1 = -1000000;
        for (final path in ropes) {
          for (final p in path) {
            final c = p.q + (hex ? floorDiv(p.r - r0 + row, 2) : 0);
            x0 = imin(x0, c);
            x1 = imax(x1, c);
          }
        }
        final width = x1 - x0 + 1;
        if (width > w) continue;
        final col = rng.below(w - width + 1);
        options.add([
          for (final path in ropes) [for (final p in path) Pt(p.q - x0 + col, p.r - r0 + row)]
        ]);
      }
    }
    if (options.isNotEmpty) break;
    depth--;
  }
  if (options.isEmpty) return null;
  final chosen = options[rng.below(options.length)];
  final board = Board(hex: hex, w: w, h: height, ropes: chosen, mirrors: [], springs: [], plan: []);
  final g = board.geo();
  final solution = board.solve(g, somePaths(chosen), 2000, <int>[]);
  if (solution.solved != true) return null;
  final proven = board.minimumTaps(g, solution.moves, 20000);
  final stops = [for (final _ in chosen) <int>[]];
  final offsets = List<int>.filled(chosen.length, 0);
  var paths = somePaths(chosen);
  for (final i in proven.plan) {
    final mv = g.tap(paths, i);
    if (mv == null) return null;
    if (mv.event == evSlide) {
      offsets[i] += mv.distance;
      stops[i].add(offsets[i]);
    }
    paths = mv.paths;
  }
  return _Core(chosen, stops, proven.plan);
}

List<Mirror> _placeMirrors(bool hex, int w, int height, int count, Rng rng, List<bool> avoid) {
  final cells = <Pt>[];
  for (var i = 0; i < w * height; i++) {
    final p = hex ? hexPoint(i, w) : Pt(i % w, i ~/ w);
    final column = p.q + (hex ? floorDiv(p.r, 2) : 0);
    if (column > 0 && column < w - 1 && p.r > 0 && p.r < height - 1 && !avoid[i]) cells.add(p);
  }
  final out = <Mirror>[];
  final near = List<bool>.filled(w * height, false);
  int index(Pt p) => hex ? hexCell(p, w) : p.r * w + p.q;
  var tries = 0;
  while (out.length < count && cells.isNotEmpty && tries < count * 40) {
    tries++;
    final p = cells[rng.below(cells.length)];
    if (near[index(p)]) continue;
    if (hex) {
      out.add(Mirror(p, rng.below(3)));
    } else {
      out.add(Mirror(p, rng.next() < 0.5 ? 0 : 1));
    }
    near[index(p)] = true;
    for (var d = 0; d < (hex ? 6 : 4); d++) {
      final q = hex ? Pt(p.q + hexDq[d], p.r + hexDr[d]) : Pt(p.q + sqDx[d], p.r + sqDy[d]);
      near[index(q)] = true;
    }
  }
  return out;
}

int knotsFor(double d) => knotsWanted(300.0 * math.pow(dmax(0.0, d) / 100.0, 1.3).toDouble());

Board? _woven(bool hex, int w, int height, double d, Rng rng, Style style, bool longRopes, int mirrorCount,
    bool coreWanted) {
  final area = w * height;
  final strength = d / 100.0;
  final length = longRopes ? imin(w, height) * 2 : imax(7, jsRound((imin(w, height) * 2).toDouble()));
  final core = (coreWanted && !longRopes) ? _repeatedCore(hex, w, height, d, rng) : null;
  var mirrors = <Mirror>[];
  if (mirrorCount > 0) {
    final avoid = List<bool>.filled(area, false);
    if (core != null) {
      final tracks = hex
          ? hexCompileExn(w, height, [], somePaths(core.ropes)).tracks
          : sqTracks(somePaths(core.ropes), w, height, SqMirrors.empty())!;
      for (final t in tracks) {
        for (final x in t) {
          avoid[x] = true;
        }
      }
    }
    mirrors = _placeMirrors(hex, w, height, mirrorCount, rng, avoid);
    if (mirrors.isEmpty) return null;
  }
  final iropes = core?.ropes ?? <Path>[];
  final istops = core?.stops ?? <List<int>>[];
  final iplan = core?.plan;
  final kf = knotsFor(d).toDouble();
  if (hex) {
    final knots = imax(
        imax(area >= 30 && d >= 20.0 ? 1 : 0, jsRound(area / (longRopes ? 50.0 : 32.0) * strength * strength)),
        longRopes ? 0 : jsRound(kf * dmin(1.0, area / 150.0) * 0.7));
    final traps = longRopes ? 0 : jsRound(kf * dmin(1.0, area / 150.0));
    final raw = hexBuild(
        rng,
        HexCfg(
            w: w,
            h: height,
            stage: jsRound(d * 0.59),
            coverage: 0.99,
            length: length,
            tapDepth: strength * 8.0,
            mirrors: mirrors,
            knots: knots,
            traps: traps,
            initialRopes: iropes,
            initialStops: istops,
            initialPlan: iplan));
    if (raw == null) return null;
    final turning = mirrors.isNotEmpty ? hexTurning(w, height, mirrors, raw.ropes) : <int>[];
    return Board(
        hex: true,
        w: w,
        h: height,
        ropes: raw.ropes,
        mirrors: mirrors.where((m) => containsInt(turning, hexCell(m.cell, w))).toList(),
        springs: [],
        plan: raw.plan);
  }
  final knots = longRopes ? jsRound(area / 40.0 * strength) : knotsFor(d);
  final traps = longRopes ? jsRound(area / 70.0 * strength) : knotsFor(d);
  final mmap = SqMirrors.sized(area);
  for (final m in mirrors) {
    mmap.set(m.cell.r * w + m.cell.q, m.kind);
  }
  final raw = weave(
      rng,
      WeaveCfg(
          w: w,
          h: height,
          lenLo: longRopes ? 6 : style.lenLo,
          lenHi: longRopes ? length : imax(style.lenLo, style.lenHi(imin(w, height))),
          minLen: longRopes ? 2 : style.minLen,
          straight: style.straight,
          cover: 0.99,
          tapDepth: strength * 8.0,
          tie: knots,
          bait: traps,
          pull: longRopes ? 5 : 3,
          mirrors: mmap,
          initialRopes: iropes,
          initialStops: istops,
          initialPlan: iplan));
  if (raw == null) return null;
  final used = List<bool>.filled(area, false);
  if (mirrors.isNotEmpty) {
    for (final t in sqTracks(somePaths(raw.ropes), w, height, mmap)!) {
      for (final c in t) {
        used[c] = true;
      }
    }
  }
  return Board(
      hex: false,
      w: w,
      h: height,
      ropes: raw.ropes,
      mirrors: mirrors.where((m) => used[m.cell.r * w + m.cell.q]).toList(),
      springs: [],
      plan: raw.taps);
}

Board? _addSpinners(Board start, Rng rng, int count) {
  var board = start;
  for (var round = 0; round < count; round++) {
    final g = board.geo();
    final blocked = List<bool>.filled(board.w * board.h, false);
    for (final path in board.ropes) {
      for (final p in path) {
        blocked[g.cell(p)] = true;
      }
    }
    for (final m in board.mirrors) {
      blocked[g.cell(m.cell)] = true;
    }
    for (final p in board.springs) {
      blocked[g.cell(p)] = true;
    }
    for (final path in board.ropes) {
      final (dq, dr) = g.direction(path);
      final p = Pt(lastPt(path).q + dq, lastPt(path).r + dr);
      if (g.inside(p)) blocked[g.cell(p)] = true;
    }
    final manual = board.replayPlan(g, board.plan).taps;
    final routes = <Pt>[];
    var paths = somePaths(board.ropes);
    for (var step = 0; step < manual; step++) {
      final i = board.plan[step];
      final mv = g.tap(paths, i)!;
      final len = paths[i]!.length;
      for (var k = len; k < mv.route.length; k++) {
        routes.add(mv.route[k]);
      }
      paths = mv.paths;
    }
    final seen = <Pt>{};
    List<Pt> fresh(List<Pt> group) {
      final cells = group.where((p) {
        if (!g.inside(p) || blocked[g.cell(p)] || seen.contains(p)) return false;
        seen.add(p);
        return true;
      }).toList();
      for (var i = cells.length - 1; i > 0; i--) {
        final j = rng.below(i + 1);
        final t = cells[i];
        cells[i] = cells[j];
        cells[j] = t;
      }
      return cells;
    }

    final b0 = board;
    Board? tryCells(List<Pt> cells) {
      // Eager, like the JS (map then find): every candidate is evaluated.
      final first = [for (final c in cells.take(16)) _withSpinner(b0, c)];
      for (final x in first) {
        if (x != null) return x;
      }
      final second = [for (final c in cells.take(8)) _searchSpinner(b0, c)];
      for (final x in second) {
        if (x != null) return x;
      }
      return null;
    }

    final placed = tryCells(fresh(routes)) ?? tryCells(fresh(_waysOut(board)));
    if (placed == null) return null;
    board = placed;
  }
  return board;
}

List<Pt> _waysOut(Board board) {
  final out = <Pt>[];
  final w = board.w;
  if (board.hex) {
    final tracks = hexCompileExn(board.w, board.h, board.mirrors, somePaths(board.ropes)).tracks;
    for (var i = 0; i < tracks.length; i++) {
      final t = tracks[i];
      for (var k = board.ropes[i].length; k < t.length; k++) {
        out.add(hexPoint(t[k], w));
      }
    }
  } else {
    final tracks = sqTracks(somePaths(board.ropes), board.w, board.h, SqMirrors.ofBoard(board))!;
    for (var i = 0; i < tracks.length; i++) {
      final t = tracks[i];
      for (var k = board.ropes[i].length; k < t.length; k++) {
        out.add(Pt(t[k] % w, t[k] ~/ w));
      }
    }
  }
  return out;
}

Board? _withSpinner(Board board, Pt cell) {
  final b = board.withSprings([...board.springs, cell], board.plan);
  final g = b.geo();
  var paths = somePaths(b.ropes);
  for (var step = 0; step < b.plan.length; step++) {
    final i = b.plan[step];
    final mv = g.tap(paths, i);
    if (mv == null) return null;
    if (mv.event == evBounce && lastPt(mv.route) == cell) {
      final a = [...b.plan.sublist(0, step + 1), i, ...b.plan.sublist(step + 1)];
      final z = [...b.plan, i];
      for (final plan in [a, z]) {
        if (_bounceStep(b, g, plan, cell) == step) return b.withPlan(plan);
      }
      return null;
    }
    paths = mv.paths;
  }
  return null;
}

Board? _searchSpinner(Board board, Pt cell) {
  final b = board.withSprings([...board.springs, cell], board.plan);
  final g = b.geo();
  final solution = b.solve(g, somePaths(b.ropes), jsRound(12000.0 / b.ropes.length), board.plan);
  if (solution.solved == true && _bounceStep(b, g, solution.moves, cell) >= 0) return b.withPlan(solution.moves);
  return null;
}

int _bounceStep(Board b, Geo g, List<int> plan, Pt at) {
  final played = b.replayPlan(g, plan);
  if (!played.solved) return -1;
  final start = somePaths(b.ropes);
  var paths = start;
  for (var step = 0; step < played.taps; step++) {
    final mv = g.tap(paths, plan[step])!;
    if (mv.event == evBounce && lastPt(mv.route) == at) {
      final m = g.tap(start, plan[step]);
      return (m != null && m.event == evBounce) ? -1 : step;
    }
    paths = mv.paths;
  }
  return -1;
}

bool _featuresUsed(Board b, Geo g) {
  final wanted = List<bool>.filled(b.w * b.h, false);
  var left = 0;
  for (final p in b.springs) {
    if (!wanted[g.cell(p)]) {
      wanted[g.cell(p)] = true;
      left++;
    }
  }
  for (final m in b.mirrors) {
    if (!wanted[g.cell(m.cell)]) {
      wanted[g.cell(m.cell)] = true;
      left++;
    }
  }
  var paths = somePaths(b.ropes);
  for (final i in b.plan) {
    final mv = g.tap(paths, i);
    if (mv == null) return false;
    final len = paths[i]!.length;
    for (var k = len; k < mv.route.length; k++) {
      final p = mv.route[k];
      if (g.inside(p) && wanted[g.cell(p)]) {
        wanted[g.cell(p)] = false;
        left--;
      }
    }
    paths = mv.paths;
  }
  return left == 0;
}

class _FeatureStats {
  final int usedMirrors, usedSprings, manualMirrors, manualSprings;
  _FeatureStats(this.usedMirrors, this.usedSprings, this.manualMirrors, this.manualSprings);
}

_FeatureStats? _featureStats(Board b, Geo g, List<int> plan, int manual) {
  final area = b.w * b.h;
  final turned = List<bool>.filled(area, false);
  final bounced = List<bool>.filled(area, false);
  final mturned = List<bool>.filled(area, false);
  final mbounced = List<bool>.filled(area, false);
  var paths = somePaths(b.ropes);
  for (var step = 0; step < plan.length; step++) {
    final i = plan[step];
    final path = paths[i];
    final mv = g.tap(paths, i);
    if (mv == null) return null;
    final len = path!.length;
    for (var at = len; at < mv.route.length; at++) {
      final p = mv.route[at];
      if (!g.inside(p)) continue;
      final m = g.mirror[g.cell(p)];
      if (m < 0) continue;
      final before = mv.route[at - 1];
      final dq = p.q - before.q, dr = p.r - before.r;
      final (int, int) o;
      if (b.hex) {
        final d = hexReflect(hexDirIndex(dq, dr), m);
        o = (hexDq[d], hexDr[d]);
      } else {
        o = turn(m, dq, dr);
      }
      final (oq, or) = o;
      if (oq != dq || or != dr) {
        turned[g.cell(p)] = true;
        if (step < manual) mturned[g.cell(p)] = true;
      }
    }
    if (mv.event == evBounce) {
      final c = g.cell(lastPt(mv.route));
      bounced[c] = true;
      if (step < manual) mbounced[c] = true;
    }
    paths = mv.paths;
  }
  int count(List<bool> a) => a.where((x) => x).length;
  return _FeatureStats(count(turned), count(bounced), count(mturned), count(mbounced));
}

bool _regional(Board b) {
  if (b.w < 8 || b.h < 8) return true;
  final area = [0, 0, 0, 0];
  final used = [0, 0, 0, 0];
  int zone(Pt p) {
    final col = p.q + (b.hex ? floorDiv(p.r, 2) : 0);
    return (col >= b.w / 2.0 ? 1 : 0) + 2 * (p.r >= b.h / 2.0 ? 1 : 0);
  }

  for (var i = 0; i < b.w * b.h; i++) {
    final p = b.hex ? hexPoint(i, b.w) : Pt(i % b.w, i ~/ b.w);
    area[zone(p)]++;
  }
  for (final path in b.ropes) {
    for (final p in path) {
      used[zone(p)]++;
    }
  }
  for (var i = 0; i < 4; i++) {
    if (!(used[i] / area[i] >= 0.55)) return false;
  }
  return true;
}

bool _trivial(Board b, Geo g) {
  if (b.ropes.length <= 3) return false;
  final start = somePaths(b.ropes);
  for (var i = 0; i < b.ropes.length; i++) {
    final mv = g.tap(start, i);
    if (mv != null && b.allFree(g, mv.paths)) return true;
  }
  return false;
}

List<int> _postpone(Board b, Geo g, List<int> plan) {
  var best = plan;
  var taps = b.replayPlan(g, plan).taps;
  for (var k = imin(taps, best.length) - 1; k >= 0; k--) {
    final i = best[k];
    if (indexFrom(best, i, k + 1) >= 0) continue;
    final trial = best.sublist(0, k);
    for (var j = k + 1; j < best.length; j++) {
      trial.add(best[j]);
    }
    trial.add(i);
    final r = b.replayPlan(g, trial);
    if (r.solved && r.taps < taps) {
      best = trial;
      taps = r.taps;
    }
  }
  return best;
}

/// Par: unneeded exits postponed to the automatic release, then a bounded search.
Par _score(Board b, Geo g, bool skip) {
  if (skip) return Par(b.plan, b.replayPlan(g, b.plan).taps, false);
  const budget = 2500;
  if (b.springs.isEmpty && !b.hex) {
    final paths = somePaths(b.ropes);
    final start = sqPostponeExits(paths, b.w, b.h, b.plan, g.sqm) ?? b.plan;
    return sqFewestPlayerTaps(paths, b.w, b.h, start, budget, g.sqm)!;
  }
  if (b.springs.isEmpty) {
    final start = hexPostponeExits(b.w, b.h, b.mirrors, b.ropes, b.plan) ?? b.plan;
    return hexFewestPlayerTaps(b.w, b.h, b.mirrors, b.ropes, start, budget);
  }
  final start = _postpone(b, g, b.plan);
  if (b.ropes.length <= 12) return b.minimumTaps(g, start, 1200);
  return Par(start, b.replayPlan(g, start).taps, false);
}

double _casualRate(Board b, Geo g, Rng rng, int games) {
  if (b.springs.isEmpty && !b.hex) return sqCasualWins(somePaths(b.ropes), b.w, b.h, rng, games, g.sqm);
  if (b.springs.isEmpty) return hexCasualWins(b.w, b.h, b.mirrors, b.ropes, rng, games);
  var wins = 0;
  for (var game = 0; game < games; game++) {
    var paths = somePaths(b.ropes);
    for (var t = 0; t < b.ropes.length * 6 + 20; t++) {
      final moves = <Move>[];
      for (var i = 0; i < paths.length; i++) {
        if (paths[i] != null) {
          final m = g.tap(paths, i);
          if (m != null) moves.add(m);
        }
      }
      if (moves.isEmpty) break;
      final exits = moves.where((m) => m.event == evExit).toList();
      final pool = exits.isNotEmpty ? exits : moves;
      paths = pool[rng.below(pool.length)].paths;
      if (allGone(paths)) {
        wins++;
        break;
      }
    }
  }
  return wins / imax(1, games);
}

double targetChallenge(double d) => 0.5 + 9.5 * math.pow(dmax(0.0, dmin(100.0, d)) / 100.0, 1.3).toDouble();

double winCeiling(double d) => 1.0 - 0.5 * dmax(0.0, dmin(1.0, (d - 30.0) / 70.0));

Level? gridGenerate(Spec s) {
  final w = s.w, height = s.h, d = s.difficulty;
  final rng = rngOf('grid/3/${s.seed}');
  final roll = rng.next();
  final twisty = imin(w, height) >= 7 && d >= 35.0;
  final style = styles[roll < 0.4 ? 0 : ((roll < 0.73 || !twisty) ? 1 : 2)];
  final colossal = s.colossal;
  final strength = d / 100.0;
  final spinnerCount = s.springs ? imax(1, imax(1, s.minSprings)) : 0;
  final minM = s.minMirrors > 0 ? s.minMirrors : 2;
  final mirrorCount = !s.mirrors
      ? 0
      : imin(jsRound((w * height) / 14.0), s.hex ? 2 * minM + 2 : minM + 2 + jsRound(2.0 * strength));
  final hardness = dmax(0.0, (d - 40.0) / 60.0);
  final sampleLimit = colossal ? 3 : 10;
  final minCoverage = w * height <= 48 ? 0.8 : 0.85;
  final target = targetChallenge(d);
  final ceiling = winCeiling(d);
  Level? best;
  var bestValue = -1.0e300;
  for (var attempt = 0; attempt < sampleLimit; attempt++) {
    final wantsCore = d >= 60.0 && attempt % 2 == 0;
    var cand = _woven(s.hex, w, height, d, rng, style, colossal, mirrorCount, wantsCore);
    if (spinnerCount > 0 && cand != null && _valid(cand, cand.geo())) cand = _addSpinners(cand, rng, spinnerCount);
    if (cand == null) continue;
    final b = cand;
    final g = b.geo();
    final start = somePaths(b.ropes);
    if (b.w != w || b.h != height || b.ropes.length < 2 || !_valid(b, g) || b.allFree(g, start)) continue;
    if ((s.mirrors && b.mirrors.isEmpty) || (s.springs && b.springs.isEmpty)) continue;
    final density = _coverage(b);
    if (density < minCoverage || !_regional(b)) continue;
    final replayed = b.replayPlan(g, b.plan);
    if (!replayed.solved || !_featuresUsed(b, g)) continue;
    final result = _score(b, g, colossal);
    if (b.mirrors.isNotEmpty || b.springs.isNotEmpty) {
      final m = _featureStats(b, g, result.plan, result.par);
      if (m != null &&
          (b.mirrors.length < s.minMirrors ||
              b.springs.length < s.minSprings ||
              m.usedMirrors != b.mirrors.length ||
              m.usedSprings != b.springs.length ||
              m.manualMirrors < s.minMirrors ||
              m.manualSprings < s.minSprings)) {
        continue;
      }
    }
    final played = b.replayPlan(g, result.plan);
    var slides = 0, bounces = 0;
    var anySlide = false;
    for (var k = 0; k < played.events.length; k++) {
      final e = played.events[k];
      if (e == evSlide) {
        anySlide = true;
        if (k < result.par) slides++;
      } else if (e == evBounce && k < result.par) {
        bounces++;
      }
    }
    if ((s.requireSlide || density < 0.85) && !anySlide) continue;
    if (result.par * 3 < b.ropes.length || _trivial(b, g)) continue;
    final inter = colossal ? 0.0 : interaction(b, g, result.plan, result.par);
    final wins = colossal
        ? 1.0
        : _casualRate(b, g, rngOf('casual/${s.seed}/$attempt'), b.springs.isNotEmpty ? 10 : 32);
    final work = (slides + bounces).toDouble();
    final challenge = work + 6.0 * (1.0 - wins);
    final value = density * 3.0 -
        (challenge - target).abs() * 0.5 -
        dmax(0.0, wins - ceiling) * 4.0 +
        (colossal ? 0.0 : hardness * inter * 0.25);
    if (value > bestValue) {
      bestValue = value;
      best = Level(b.withPlan(result.plan), result.par, result.exact, density, wins, challenge, '');
    }
    if (colossal || (density >= 0.9 && (challenge - target).abs() <= 0.5 && wins <= ceiling)) break;
  }
  return best;
}
