// The square woven builder of levels.js: a board is built backwards from the solved
// board together with its replayable intentions (lay, knot, trap). Every random draw
// happens in the same order as the JS, so the same seed weaves the same board.
import 'dart:math' as math;

import 'square.dart';
import 'util.dart';

class WeaveCfg {
  final int w, h, lenLo, lenHi, minLen;
  final double straight, cover, tapDepth;
  final int tie, bait, pull;
  final SqMirrors mirrors;
  final List<Path> initialRopes;
  final List<List<int>> initialStops;
  final List<int>? initialPlan;
  WeaveCfg({
    required this.w,
    required this.h,
    required this.lenLo,
    required this.lenHi,
    required this.minLen,
    required this.straight,
    required this.cover,
    required this.tapDepth,
    required this.tie,
    required this.bait,
    required this.pull,
    required this.mirrors,
    required this.initialRopes,
    required this.initialStops,
    required this.initialPlan,
  });
}

class Woven {
  final List<Path> ropes;
  final List<int> taps;
  final int knots, traps;
  Woven(this.ropes, this.taps, this.knots, this.traps);
}

const int _walked = -2;
const int _kept = -3;
const int _mirror = -4;
const int _minRopes = 3;
const double _minCoverageSlide = 0.72;
const double _minCoverageSmall = 0.6;
const double _minBlockedShare = 0.5;
const int _smallW = 5;
const int _knotTries = 12;
const int _triesPerStep = 6;
const int _maxStuck = 4;

int knotsWanted(double d) => d < 12.0 ? 0 : jsRound(0.6 * math.sqrt(d));

class Style {
  final String name;
  final int minLen;
  final double straight;
  final int lenLo;
  final bool twisty;
  const Style(this.name, this.minLen, this.straight, this.lenLo, this.twisty);
  int lenHi(int w) => name == 'short' ? 5 : (name == 'medium' ? 8 : imax(8, w));
}

const List<Style> styles = [
  Style('short', 2, 0.5, 3, false),
  Style('medium', 2, 0.35, 4, false),
  Style('twisty', 3, 0.2, 6, true),
];

/// The board the replay runs on, taking one more rope at a time with its
/// intentions: the offsets it is meant to stop at, in order, before it leaves.
class _Intentions {
  final int w, h;
  final SqMirrors mirrors;
  final SqBoard b;
  final List<Path> paths = [];
  final List<List<int>> stops = [];
  final List<int> cost, dep, cellAt, ropeAt, cellBy, done;
  List<int> taps = [];
  int costSum = 0;
  _Intentions(this.w, this.h, this.mirrors)
      : b = SqBoard(
            0,
            0,
            List<int>.filled(w * h, 0),
            List<int>.filled(w * h, 0),
            <List<int>>[],
            List<int>.filled(w * h, 0),
            List<int>.filled(w * h, 0),
            List<int>.filled(w * h, 0),
            List<int>.filled(w * h, 0)),
        cost = List<int>.filled(w * h, 0),
        dep = List<int>.filled(w * h, 0),
        cellAt = List<int>.filled(w * h, 0),
        ropeAt = List<int>.filled(w * h, 0),
        cellBy = List<int>.filled(w * h, 0),
        done = List<int>.filled(w * h, 0);

  int add(Path path, List<int> st) {
    final hd = lastPt(path);
    final (dx, dy) = headDir(path);
    final q = [for (final c in path) c.r * w + c.q];
    if (mirrors.size > 0) {
      if (!rayCells(hd.q, hd.r, dx, dy, w, h, mirrors, q)) throw GenError('Unchecked looping track');
    } else {
      var x = hd.q + dx, y = hd.r + dy;
      while (x >= 0 && y >= 0 && x < w && y < h) {
        q.add(y * w + x);
        x += dx;
        y += dy;
      }
    }
    b.seq.add(q);
    b.len[b.n] = path.length;
    paths.add(path);
    stops.add(st);
    b.n++;
    return b.n - 1;
  }

  void drop() {
    b.n--;
    b.seq.removeLast();
    paths.removeLast();
    stops.removeLast();
  }

  void setUp() {
    b.occ.fillRange(0, b.occ.length, -1);
    b.left = 0;
    for (var i = 0; i < b.n; i++) {
      b.off[i] = -1;
      b.place(i, 0);
    }
  }

  /// Tap rope i if that does what is meant for it next. True if it moved.
  bool tap(int i) {
    final q = b.seq[i];
    final l = b.len[i];
    final from = b.off[i];
    var p = from + l;
    var lay = ropeAt[i];
    var by = -1;
    while (p < q.length && b.occ[q[p]] == -1) {
      if (cellAt[q[p]] > lay) {
        lay = cellAt[q[p]];
        by = cellBy[q[p]];
      }
      p++;
    }
    final to = p == q.length ? -1 : p - l;
    final st = stops[i];
    final want = done[i] < st.length ? st[done[i]] : -1;
    if (to != want) return false;
    if (to >= 0) {
      final z = b.occ[q[p]];
      if (ropeAt[z] > lay) {
        lay = ropeAt[z];
        by = z;
      }
    }
    lay++;
    final end = to < 0 ? from + l : imin(from + l, to);
    for (var c = from; c < end; c++) {
      cellAt[q[c]] = lay;
      cellBy[q[c]] = i;
    }
    b.place(i, to);
    ropeAt[i] = lay;
    taps.add(i);
    if (to < 0) {
      cost[i] = lay;
      dep[i] = by;
      costSum += lay;
    } else {
      done[i]++;
    }
    return true;
  }

  bool replay(List<int> list, int fresh) {
    setUp();
    cellAt.fillRange(0, cellAt.length, -1);
    for (var i = 0; i < b.n; i++) {
      ropeAt[i] = -1;
      done[i] = 0;
    }
    taps = [];
    costSum = 0;
    var moved = true;
    while (moved && b.left > 0) {
      moved = false;
      for (final i in list) {
        if (b.off[i] >= 0 && tap(i)) {
          moved = true;
          while (fresh >= 0 && b.off[fresh] >= 0 && tap(fresh)) {}
        }
      }
    }
    return b.left == 0;
  }

  int trial(Path path, List<int> st, List<int> order) {
    final id = add(path, st);
    final list = [id, ...order];
    final ok = replay(list, id);
    final sum = costSum;
    drop();
    return ok ? sum : -1;
  }
}

class _Spot {
  final int c, di, room, against, gap;
  _Spot(this.c, this.di, this.room, this.against, this.gap);
}

class _Lane {
  final List<int> cells;
  final int free;
  final List<int> ids;
  _Lane(this.cells, this.free, this.ids);
}

class _Shaped {
  final List<int> cells;
  final Path path;
  final _Lane lane;
  _Shaped(this.cells, this.path, this.lane);
}

/// A candidate addition: a rope (lane set), a knot (pull > 0, rest) or a trap (gap).
class _Cand {
  final Path path;
  final _Lane? lane;
  final int gain, bends, pull;
  final List<int> rest, gap;
  _Cand(this.path, this.lane, this.gain, this.bends, this.pull, this.rest, this.gap);
}

(List<_Spot>, List<_Spot>, List<_Spot>) _knotSpots(
    List<int> occ, List<int> rest, int w, int h, SqMirrors mirrors, int pull) {
  final tight = <_Spot>[], chain = <_Spot>[], gapped = <_Spot>[];
  for (var c = 0; c < w * h; c++) {
    if (occ[c] != -1) continue;
    final x = c % w, y = c ~/ w;
    for (var di = 0; di < 4; di++) {
      final dx = sqDx[di], dy = sqDy[di];
      final ax = x + dx, ay = y + dy;
      if (ax < 0 || ay < 0 || ax >= w || ay >= h) continue;
      final o = occ[ay * w + ax];
      final against = o == -1 ? rest[ay * w + ax] : -1;
      if (o >= 0 || against >= 0) {
        var room = 0;
        var bx = x - dx, by = y - dy;
        while (room <= pull && bx >= 0 && by >= 0 && bx < w && by < h && occ[by * w + bx] == -1) {
          room++;
          bx -= dx;
          by -= dy;
        }
        if (room >= 2) {
          final s = _Spot(c, di, room, against, 0);
          if (o >= 0) {
            tight.add(s);
          } else {
            chain.add(s);
          }
        }
        continue;
      }
      if (mirrors.size > 0) {
        final ahead = <int>[];
        if (!rayCells(x, y, dx, dy, w, h, mirrors, ahead)) continue;
        var gap = 0;
        while (gap < ahead.length && gap <= pull && (occ[ahead[gap]] == -1 || occ[ahead[gap]] == _mirror)) {
          gap++;
        }
        if (gap > 0 && gap <= pull && gap < ahead.length && occ[ahead[gap]] >= 0) {
          gapped.add(_Spot(c, di, 0, -1, gap));
        }
        continue;
      }
      var gap = 0;
      var nx = ax, ny = ay;
      while (gap <= pull && nx >= 0 && ny >= 0 && nx < w && ny < h && occ[ny * w + nx] == -1) {
        gap++;
        nx += dx;
        ny += dy;
      }
      if (gap > 0 && gap <= pull && nx >= 0 && ny >= 0 && nx < w && ny < h && occ[ny * w + nx] >= 0) {
        gapped.add(_Spot(c, di, 0, -1, gap));
      }
    }
  }
  return (tight, chain, gapped);
}

Woven? weave(Rng rng, WeaveCfg cfg) {
  final w = cfg.w, h = cfg.h, nn = w * h;
  final occ = List<int>.filled(nn, -1);
  final mirrors = cfg.mirrors;
  Pt xy(int c) => Pt(c % w, c ~/ w);
  bool blocked(Path path) => selfBlocked(path, w, h, mirrors);
  for (final c in mirrors.keys) {
    occ[c] = _mirror;
  }
  final ib = _Intentions(w, h, mirrors);
  final b = ib.b;
  var order = <int>[];
  var total0 = 0, bendSum = 0, covered = 0, knots = 0, traps = 0;
  final mirrorUsed = List<bool>.filled(nn, false);
  var mirrorsUsed = 0;
  final rest = List<int>.filled(nn, -1);

  // ---- shaping ropes ----
  List<int> grow(int start, int first, double straight) {
    final want = cfg.lenLo + rng.below(cfg.lenHi - cfg.lenLo + 1);
    final cells = [start];
    var last = -1;
    occ[start] = -2;
    while (cells.length < want) {
      final c = cells[cells.length - 1];
      final x = c % w, y = c ~/ w;
      final opts = <int>[];
      for (var d = 0; d < 4; d++) {
        final nx = x + sqDx[d], ny = y + sqDy[d];
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && occ[ny * w + nx] == -1) opts.add(d);
      }
      if (opts.isEmpty || (cells.length == 1 && first >= 0 && !containsInt(opts, first))) break;
      final int d;
      if (cells.length == 1 && first >= 0) {
        d = first;
      } else if (last >= 0 && containsInt(opts, last) && rng.next() < straight) {
        d = last;
      } else {
        d = opts[rng.below(opts.length)];
      }
      last = d;
      final nc = (y + sqDy[d]) * w + x + sqDx[d];
      cells.add(nc);
      occ[nc] = -2;
    }
    for (final c in cells) {
      occ[c] = -1;
    }
    return cells;
  }

  _Lane? wayOut(int x, int y, int d) {
    final cells = <int>[];
    final dx = sqDx[d], dy = sqDy[d];
    if (mirrors.size > 0) {
      if (!rayCells(x, y, dx, dy, w, h, mirrors, cells)) return null;
    } else {
      var a = x + dx, bb = y + dy;
      while (a >= 0 && bb >= 0 && a < w && bb < h) {
        cells.add(bb * w + a);
        a += dx;
        bb += dy;
      }
    }
    final ids = <int>[];
    var free = 0;
    for (final c in cells) {
      final o = occ[c];
      if (o == -1) {
        free++;
      } else if (o >= 0 && !containsInt(ids, o)) {
        ids.add(o);
      }
    }
    return _Lane(cells, free, ids);
  }

  int dirIndex(int dx, int dy) {
    for (var d = 0; d < 4; d++) {
      if (sqDx[d] == dx && sqDy[d] == dy) return d;
    }
    throw GenError('bad direction');
  }

  _Shaped? shape(int start, double straight, int dir) {
    final s = xy(start);
    if (dir >= 0 || rng.next() < 0.75) {
      final opts = <(int, _Lane, int)>[];
      var sum = 0;
      for (var d = 0; d < 4; d++) {
        if (dir >= 0 && d != dir) continue;
        final bx = s.q - sqDx[d], by = s.r - sqDy[d];
        if (bx < 0 || by < 0 || bx >= w || by >= h || occ[by * w + bx] != -1) continue;
        final lane = wayOut(s.q, s.r, d);
        if (lane == null) continue;
        opts.add((d, lane, lane.cells.length + 1));
        sum += lane.cells.length + 1;
      }
      if (opts.isNotEmpty) {
        var r = rng.next() * sum;
        var o = opts[opts.length - 1];
        for (final cand in opts) {
          r -= cand.$3;
          if (r < 0.0) {
            o = cand;
            break;
          }
        }
        final cells = grow(start, (o.$1 + 2) % 4, straight);
        final path = cells.map(xy).toList().reversed.toList();
        if (cells.length >= cfg.minLen && !blocked(path)) return _Shaped(cells, path, o.$2);
      }
      if (dir >= 0) return null;
    }
    final cells = grow(start, -1, straight);
    if (cells.length < cfg.minLen) return null;
    final a = cells.map(xy).toList();
    final bpath = a.reversed.toList();
    final ok = <_Shaped>[];
    for (final p in [a, bpath]) {
      if (!blocked(p)) {
        final hd = lastPt(p);
        final (dx, dy) = headDir(p);
        ok.add(_Shaped(cells, p, wayOut(hd.q, hd.r, dirIndex(dx, dy))!));
      }
    }
    if (ok.isEmpty) return null;
    if (ok.length == 2 &&
        (ok[1].lane.cells.length > ok[0].lane.cells.length ||
            (ok[1].lane.cells.length == ok[0].lane.cells.length && rng.next() < 0.5))) {
      return ok[1];
    }
    return ok[0];
  }

  int trial(Path path, List<int> st) => ib.trial(path, st, order);

  void commit(_Cand c) {
    final id = ib.add(c.path, c.pull > 0 ? [c.pull] : <int>[]);
    if (mirrors.size > 0) {
      for (final cell in b.seq[id]) {
        if (mirrors.has(cell) && !mirrorUsed[cell]) {
          mirrorUsed[cell] = true;
          mirrorsUsed++;
        }
      }
    }
    ib.replay([id, ...order], id);
    total0 = ib.costSum;
    order = unique(ib.taps);
    for (final p in ib.paths[id]) {
      occ[p.r * w + p.q] = id;
    }
    covered += ib.paths[id].length;
    bendSum += c.bends;
    if (c.pull > 0) {
      knots++;
      for (final cell in c.rest) {
        rest[cell] = id;
      }
    }
    if (c.gap.isNotEmpty) {
      traps++;
      for (final cell in c.gap) {
        if (occ[cell] == -1) occ[cell] = _kept;
      }
    }
  }

  // ---- how the board stands ----
  var ahead = <List<int>>[];
  var blk = <List<int>>[];
  final lanes = List<List<int>>.generate(nn, (_) => <int>[]);
  final up = List<int>.filled(nn, 0);
  void survey() {
    ahead = [];
    blk = [];
    for (var c = 0; c < nn; c++) {
      lanes[c].clear();
    }
    for (var i = 0; i < b.n; i++) {
      final q = b.seq[i];
      final free = <int>[];
      final ids = <int>[];
      for (var p = b.len[i]; p < q.length; p++) {
        final o = occ[q[p]];
        if (o == -1) {
          free.add(q[p]);
          lanes[q[p]].add(i);
        } else if (o >= 0 && !containsInt(ids, o)) {
          ids.add(o);
        }
      }
      ahead.add(free);
      blk.add(ids);
    }
    for (var i = 0; i < b.n; i++) {
      up[i] = 0;
    }
    final byCost = List<int>.of(order);
    ssort<int>(byCost, (x, y) => ib.cost[y] - ib.cost[x]);
    for (final i in byCost) {
      final d = ib.dep[i];
      if (d >= 0 && up[i] + 1 > up[d]) up[d] = up[i] + 1;
    }
  }

  // kind: 0 deep, 1 leaf, 2 inner, 3 any, 4 plain, 5 mirror
  int pickParent(int kind) {
    var sum = 0;
    final wts = List<int>.generate(ib.paths.length, (i) {
      final int v;
      if (ahead[i].isEmpty) {
        v = 0;
      } else if (kind == 2) {
        v = ib.cost[i] > 0 ? 1 : 0;
      } else if (ib.cost[i] > 0) {
        v = 0;
      } else if (kind == 0) {
        v = (up[i] + 1) * (up[i] + 1);
      } else {
        v = 1;
      }
      sum += v;
      return v;
    });
    if (sum == 0) return -1;
    var r = rng.next() * sum;
    for (var i = 0; i < wts.length; i++) {
      r -= wts[i];
      if (r < 0.0) return i;
    }
    return wts.length - 1;
  }

  (int, int)? aimed() {
    final idle = mirrors.keys.where((c) => !mirrorUsed[c]).toList();
    if (idle.isEmpty) return null;
    final m = idle[rng.below(idle.length)];
    final di = rng.below(4);
    final j = 1 + rng.below(3);
    final x = m % w - sqDx[di] * j;
    final y = m ~/ w - sqDy[di] * j;
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    for (var k = 0; k < j; k++) {
      final c = (y + sqDy[di] * k) * w + x + sqDx[di] * k;
      if (occ[c] != -1) return null;
    }
    return (y * w + x, di);
  }

  _Cand? candidate(int kind, int at) {
    var start = at >= 0 ? at : -1;
    var dir = -1;
    if (kind == 5) {
      final a = aimed();
      if (a == null) return null;
      start = a.$1;
      dir = a.$2;
    }
    final parent = (start >= 0 || kind == 3 || kind == 4) ? -1 : pickParent(kind);
    if (parent >= 0) start = ahead[parent][rng.below(ahead[parent].length)];
    var t = 0;
    while (start < 0 && t < 6) {
      final c = rng.below(nn);
      if (occ[c] == -1) start = c;
      t++;
    }
    if (start < 0) return null;
    final c = shape(start, kind == 4 ? 1.0 : cfg.straight, dir);
    if (c == null) return null;
    final sum = trial(c.path, <int>[]);
    if (sum < 0) return null;
    return _Cand(c.path, c.lane, sum - total0, bendsOf(c.path), 0, <int>[], <int>[]);
  }

  // ---- knots and traps ----
  final mark = List<int>.filled(nn + 1, 0);
  var stamp = 0;
  void below(List<int> blockers) {
    stamp++;
    final stack = List<int>.of(blockers);
    for (final z in stack) {
      mark[z] = stamp;
    }
    while (stack.isNotEmpty) {
      final x = stack.removeLast();
      for (final y in blk[x]) {
        if (mark[y] != stamp) {
          mark[y] = stamp;
          stack.add(y);
        }
      }
    }
  }

  bool tied(int cell) {
    for (final id in lanes[cell]) {
      if (mark[id] == stamp) return true;
    }
    return false;
  }

  Path toPath(List<int> cells) => cells.map(xy).toList().reversed.toList();

  (List<int>, List<int>)? walk(_Spot spot, int k) {
    final back = (spot.di + 2) % 4;
    final want = imax(k + 2, cfg.lenLo + rng.below(cfg.lenHi - cfg.lenLo + 1));
    final cells = [spot.c];
    final tail = <int>[];
    var last = back;
    var got = false;
    occ[spot.c] = _walked;
    while (cells.length + tail.length < want + k) {
      final body = cells.length < want;
      final c = (body || tail.isEmpty) ? cells[cells.length - 1] : tail[tail.length - 1];
      final x = c % w, y = c ~/ w;
      final opts = <int>[];
      for (var di = 0; di < 4; di++) {
        final nx = x + sqDx[di], ny = y + sqDy[di];
        final nc = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && occ[nc] == -1 && (!body || !tied(nc))) opts.add(di);
      }
      if (opts.isEmpty) break;
      var di = 0;
      if (body) {
        if (cells.length <= k + 1) {
          if (!containsInt(opts, back)) break;
          di = back;
        } else {
          di = (containsInt(opts, last) && rng.next() < cfg.straight) ? last : opts[rng.below(opts.length)];
        }
      } else {
        final ties = got ? <int>[] : opts.where((o) => tied((y + sqDy[o]) * w + x + sqDx[o])).toList();
        di = ties.isNotEmpty ? ties[rng.below(ties.length)] : opts[rng.below(opts.length)];
      }
      last = di;
      final nc = (y + sqDy[di]) * w + x + sqDx[di];
      occ[nc] = _walked;
      if (body) {
        cells.add(nc);
      } else {
        tail.add(nc);
        if (tied(nc)) got = true;
      }
    }
    for (final c in cells) {
      occ[c] = -1;
    }
    for (final c in tail) {
      occ[c] = -1;
    }
    if (cells.length < imax(cfg.minLen, k + 2) || blocked(toPath(cells))) return null;
    if (k > 0) {
      if (tail.length < k || !got) return null;
      final joined = [...cells.sublist(k), ...tail];
      if (blocked(toPath(joined))) return null;
    }
    return (cells, tail);
  }

  _Cand? knot(_Spot spot) {
    final lane = wayOut(spot.c % w, spot.c ~/ w, spot.di);
    if (lane == null) return null;
    if (spot.against >= 0) {
      below([...lane.ids, spot.against]);
    } else {
      below(lane.ids);
    }
    if (tied(spot.c)) return null;
    final k = 1 + rng.below(imin(cfg.pull, spot.room - 1));
    final wk = walk(spot, k);
    if (wk == null) return null;
    final (cells, tail) = wk;
    final joined = [...cells.sublist(k), ...tail];
    final first = toPath(joined);
    final sum = trial(first, [k]);
    if (sum < 0) return null;
    return _Cand(first, null, sum - total0, bendsOf(first), k, cells.sublist(0, k), <int>[]);
  }

  _Cand? trap(_Spot spot) {
    final lane = wayOut(spot.c % w, spot.c ~/ w, spot.di);
    if (lane == null) return null;
    final gap = lane.cells.sublist(0, spot.gap);
    below(lane.ids);
    if (tied(spot.c) || !gap.any(tied)) return null;
    final wk = walk(spot, 0);
    if (wk == null) return null;
    final path = toPath(wk.$1);
    final sum = trial(path, <int>[]);
    if (sum < 0) return null;
    final id = ib.add(path, <int>[]);
    ib.setUp();
    b.place(id, spot.gap);
    final dead = b.relax();
    ib.drop();
    if (dead > 0) return _Cand(path, null, sum - total0, bendsOf(path), 0, <int>[], gap);
    return null;
  }

  const sMin = 0;
  const sMax = 999999;
  final meanLen = (cfg.lenLo + cfg.lenHi) / 2.0 * 0.85;
  final coverGoal = cfg.cover * nn;

  bool seedCore() {
    final occupied = List<bool>.filled(nn, false);
    var size = 0;
    for (var i = 0; i < cfg.initialRopes.length; i++) {
      final path = cfg.initialRopes[i];
      if (path.length < 2) return false;
      for (final p in path) {
        if (p.q < 0 || p.r < 0 || p.q >= w || p.r >= h || occupied[p.r * w + p.q]) return false;
        occupied[p.r * w + p.q] = true;
        size++;
      }
      final st = i < cfg.initialStops.length ? List<int>.of(cfg.initialStops[i]) : <int>[];
      ib.add(List<Pt>.of(path), st);
    }
    order = cfg.initialPlan != null
        ? List<int>.of(cfg.initialPlan!)
        : List<int>.generate(ib.paths.length, (i) => i);
    if (!ib.replay(order, -1)) return false;
    total0 = ib.costSum;
    bendSum = 0;
    for (final p in ib.paths) {
      bendSum += bendsOf(p);
    }
    covered = size;
    knots = ib.stops.where((s) => s.isNotEmpty).length;
    for (var i = 0; i < ib.paths.length; i++) {
      for (final p in ib.paths[i]) {
        occ[p.r * w + p.q] = i;
      }
      for (final offset in ib.stops[i]) {
        for (var j = b.len[i]; j < b.len[i] + offset; j++) {
          if (occ[b.seq[i][j]] == -1) rest[b.seq[i][j]] = i;
        }
      }
    }
    order = unique(ib.taps);
    return true;
  }

  _Cand? fits(_Cand? c, int budget) {
    if (c == null) return null;
    return (c.gain + c.bends <= budget && bendSum + c.bends <= sMax) ? c : null;
  }

  _Cand? knotOrTrap(int n, double room, int budget) {
    final wantKnots = cfg.tie - knots;
    final wantTraps = cfg.bait - traps;
    if (n < 2 || (wantKnots <= 0 && wantTraps <= 0) || !(rng.next() < (2 * (wantKnots + wantTraps)) / room)) {
      return null;
    }
    final (tight, chain, gapped) = _knotSpots(occ, rest, w, h, mirrors, cfg.pull);
    final knotFirst = wantKnots > 0 && (wantTraps <= 0 || knots <= traps);
    var k = 0;
    while (k < 2 * _knotTries) {
      final isKnot = k < _knotTries ? knotFirst : !knotFirst;
      if ((isKnot ? wantKnots : wantTraps) <= 0) {
        k = k < _knotTries ? _knotTries - 1 : 2 * _knotTries;
        k++;
        continue;
      }
      final List<_Spot> list;
      if (!isKnot) {
        list = gapped;
      } else if (chain.isNotEmpty && (rng.next() < 0.5 || tight.isEmpty)) {
        list = chain;
      } else {
        list = tight;
      }
      if (list.isEmpty) {
        k++;
        continue;
      }
      final spot = list[rng.below(list.length)];
      final c = fits(isKnot ? knot(spot) : trap(spot), budget);
      if (c != null) return c;
      k++;
    }
    return null;
  }

  const kindsAny = [3];
  const kindsPlain = [4];
  const kindsDeep = [0, 0, 1, 2, 0, 3, 1, 2];
  const kindsLeaf = [1, 2, 3, 1, 2, 4, 3, 1];
  const kindsInner = [2, 3, 4, 2, 3, 4, 2, 3];
  _Cand? bestRope(int n, int budget, double desire, int need) {
    final List<int> kinds;
    if (n == 0) {
      kinds = kindsAny;
    } else if (budget < 1) {
      kinds = kindsPlain;
    } else if (desire >= 2.0) {
      kinds = kindsDeep;
    } else if (desire >= 1.0) {
      kinds = kindsLeaf;
    } else {
      kinds = kindsInner;
    }
    final aim = mirrors.size > mirrorsUsed && b.n >= 1;
    _Cand? best;
    var bestMiss = 1.0e300;
    for (var k = 0; k < _triesPerStep; k++) {
      final kind = (aim && k == 0) ? 5 : kinds[k % kinds.length];
      final c = fits(candidate(kind, -1), budget);
      if (c == null) continue;
      final lane = c.lane!;
      final lands = need > 0 && c.gain + c.bends >= need && (covered + c.path.length) >= _minCoverageSlide * nn;
      final reaches = aim && lane.cells.any((cell) => mirrors.has(cell) && !mirrorUsed[cell]);
      final miss = (c.gain - desire).abs() +
          rng.next() * 0.6 -
          (desire >= 2.0 ? imin(lane.free, 4) * 0.2 : 0.0) -
          (lands ? 100.0 : 0.0) -
          (reaches ? 1.5 : 0.0);
      if (miss < bestMiss) {
        best = c;
        bestMiss = miss;
      }
    }
    return best;
  }

  _Cand? nextAddition(int score) {
    final n = b.n;
    final budget = sMax - score;
    final room = dmax(1.0, (coverGoal - covered) / meanLen);
    final desire = cfg.tapDepth;
    survey();
    return knotOrTrap(n, room, budget) ?? bestRope(n, budget, desire, sMin - score);
  }

  void layRopes() {
    var stuck = 0;
    for (var it = 0; it < 2 * nn; it++) {
      final score = total0 + bendSum;
      if (score >= sMin && b.n >= _minRopes && covered >= coverGoal) break;
      final best = nextAddition(score);
      if (best == null) {
        stuck++;
        if (stuck > _maxStuck) break;
        continue;
      }
      stuck = 0;
      commit(best);
    }
  }

  void packGaps() {
    for (var round = 0; round < 2; round++) {
      final empty = <int>[];
      for (var c = 0; c < nn; c++) {
        if (occ[c] == -1) empty.add(c);
      }
      for (var i = empty.length - 1; i > 0; i--) {
        final j = rng.below(i + 1);
        final t = empty[i];
        empty[i] = empty[j];
        empty[j] = t;
      }
      for (final cell in empty) {
        if (occ[cell] != -1) continue;
        final budget = sMax - total0 - bendSum;
        for (var tr = 0; tr < 3; tr++) {
          final c = candidate(budget < 1 ? 4 : 3, cell);
          if (c == null) continue;
          if (c.gain + c.bends > budget || bendSum + c.bends > sMax) continue;
          commit(c);
          break;
        }
      }
    }
  }

  if (cfg.initialRopes.isNotEmpty && !seedCore()) return null;
  layRopes();
  packGaps();
  final n = b.n;
  if (n < _minRopes || !ib.replay(order, -1)) return null;
  return _finished(cfg, ib);
}

/// The finished level (bounds always kept): checked and measured, or null if it
/// is too sparse or too loose.
Woven? _finished(WeaveCfg cfg, _Intentions ib) {
  final w = cfg.w, h = cfg.h, n = ib.b.n;
  final ropes = ib.paths.map((p) => List<Pt>.of(p)).toList();
  final solution = List<int>.of(ib.taps);
  var cells = 0;
  for (final p in ropes) {
    cells += p.length;
  }
  final filled = cells / (w * h);
  var blocked = 0;
  for (var i = 0; i < n; i++) {
    if (ib.cost[i] > 0) blocked++;
  }
  final share = blocked / n;
  if (w <= _smallW) {
    if (filled < _minCoverageSmall) return null;
  } else if (filled < _minCoverageSlide || share < _minBlockedShare) {
    return null;
  }
  final start = somePaths(ropes);
  if (!allGone(sqPlay(start, w, h, solution, cfg.mirrors))) return null;
  final fin = sqBoardExn(start, w, h, cfg.mirrors);
  final looped = sqLooped(fin);
  var tiedUp = 0, fatal = 0;
  for (var i = 0; i < n; i++) {
    if (ib.stops[i].isNotEmpty && looped[i]) tiedUp++;
    final to = fin.slideTo(i);
    if (to > 0) {
      fin.place(i, to);
      if (fin.relax() > 0) fatal++;
      fin.place(i, 0);
    }
  }
  return Woven(ropes, solution, tiedUp, fatal);
}
