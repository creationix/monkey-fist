// Square boards without spinners: the compact offset kernels of levels.js. A rope
// can only occupy cells of its own track (its body, then its way out as fixed
// mirrors bend it), so a board is one offset per rope.
import 'util.dart';

const List<int> sqDx = [1, 0, -1, 0];
const List<int> sqDy = [0, 1, 0, -1];

/// Fixed two-sided mirrors by cell (y * W + x): -1 none, 0 '/', 1 '\'. `keys`
/// keeps insertion order, as a JS Map does.
class SqMirrors {
  final List<int> slope;
  final List<int> keys;
  SqMirrors(this.slope, this.keys);
  factory SqMirrors.empty() => SqMirrors(<int>[], <int>[]);
  factory SqMirrors.sized(int n) => SqMirrors(List<int>.filled(n, -1), <int>[]);
  factory SqMirrors.ofBoard(Board b) {
    final m = SqMirrors.sized(b.w * b.h);
    for (final x in b.mirrors) {
      m.set(x.cell.r * b.w + x.cell.q, x.kind);
    }
    return m;
  }
  void set(int c, int s) {
    if (slope[c] < 0) keys.add(c);
    slope[c] = s;
  }

  int get(int c) => c >= 0 && c < slope.length ? slope[c] : -1;
  bool has(int c) => get(c) >= 0;
  int get size => keys.length;
}

(int, int) turn(int s, int dx, int dy) => s == 0 ? (-dy, -dx) : (dy, dx);

(int, int) headDir(Path path) {
  final h = path[path.length - 1];
  final p = path[path.length - 2];
  return (h.q - p.q, h.r - p.r);
}

(int, int) _exitDir(Path path, int w, SqMirrors m) {
  final h = lastPt(path);
  final (dx, dy) = headDir(path);
  final s = m.get(h.r * w + h.q);
  return s < 0 ? (dx, dy) : turn(s, dx, dy);
}

// Scratch marks for duplicate checks, grown on demand.
final List<int> marks = <int>[];
int _markStamp = 0;

int nextStamp(int size) {
  while (marks.length < size) {
    marks.add(0);
  }
  _markStamp += 1;
  return _markStamp;
}

bool hasDup(List<int> out, int start) {
  var top = 0;
  for (var k = start; k < out.length; k++) {
    top = imax(top, out[k] + 1);
  }
  final s = nextStamp(top);
  for (var k = start; k < out.length; k++) {
    final c = out[k];
    if (marks[c] == s) return true;
    marks[c] = s;
  }
  return false;
}

/// Append to `out` the cells a head at (x, y) passes moving (dx, dy), up to the
/// edge. False if that way out would enter a cell twice.
bool rayCells(int x0, int y0, int dx0, int dy0, int w, int h, SqMirrors m, List<int> out) {
  final start = out.length;
  var turned = false;
  var x = x0, y = y0, dx = dx0, dy = dy0;
  while (true) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= w || y >= h) break;
    final c = y * w + x;
    final s = m.get(c);
    out.add(c);
    if (s >= 0) {
      final t = turn(s, dx, dy);
      dx = t.$1;
      dy = t.$2;
      turned = true;
      if (out.length - start > 2 * w * h) return false;
    }
  }
  return !(turned && hasDup(out, start));
}

bool selfBlocked(Path path, int w, int h, SqMirrors m) {
  final hd = lastPt(path);
  if (m.size > 0) {
    final (dx, dy) = _exitDir(path, w, m);
    final ahead = <int>[];
    if (!rayCells(hd.q, hd.r, dx, dy, w, h, m, ahead)) return true;
    final s = nextStamp(w * h);
    for (final p in path) {
      marks[p.r * w + p.q] = s;
    }
    for (final c in ahead) {
      if (marks[c] == s) return true;
    }
    return false;
  }
  final (dx, dy) = headDir(path);
  for (final p in path) {
    if (dx != 0) {
      if (p.r == hd.r && (p.q - hd.q) * dx > 0) return true;
    } else if (p.q == hd.q && (p.r - hd.r) * dy > 0) {
      return true;
    }
  }
  return false;
}

const int gone = 32767;

/// The compact board: seq[i] is rope i's track, len[i] its length and off[i] how
/// far along it has slid (-1 once it has left).
class SqBoard {
  int n;
  int left;
  final List<int> occ;
  final List<int> at;
  final List<List<int>> seq;
  final List<int> len;
  final List<int> off;
  final List<int> was;
  final List<int> now;
  SqBoard(this.n, this.left, this.occ, this.at, this.seq, this.len, this.off, this.was, this.now);

  /// Where rope i would stop if tapped: its new offset, or -1 if it would leave.
  int slideTo(int i) {
    final s = seq[i];
    var p = off[i] + len[i];
    while (p < s.length && occ[s[p]] == -1) {
      p++;
    }
    return p == s.length ? -1 : p - len[i];
  }

  void place(int i, int to) {
    final s = seq[i];
    final l = len[i];
    final from = off[i];
    if (from >= 0) {
      for (var p = from; p < from + l; p++) {
        occ[s[p]] = -1;
      }
      left--;
    }
    if (to >= 0) {
      for (var p = to; p < to + l; p++) {
        occ[s[p]] = i;
        at[s[p]] = p;
      }
      left++;
    }
    off[i] = to;
  }

  /// The relaxation: how many ropes certainly can never leave.
  int relax() {
    var waiting = 0;
    for (var i = 0; i < n; i++) {
      final v = off[i] < 0 ? gone : off[i];
      was[i] = v;
      now[i] = v;
      if (off[i] >= 0) waiting++;
    }
    var moved = true;
    while (moved && waiting > 0) {
      moved = false;
      for (var i = 0; i < n; i++) {
        if (was[i] == gone) continue;
        final s = seq[i];
        final l = len[i];
        var r = was[i];
        while (true) {
          final p = r + l;
          if (p >= s.length) {
            r = gone;
            break;
          }
          final c = s[p];
          final z = occ[c];
          if (z != -1 && (z == i || was[z] <= at[c])) break;
          r++;
        }
        if (r != was[i]) {
          now[i] = r;
          moved = true;
          if (r == gone) waiting--;
        }
      }
      for (var i = 0; i < n; i++) {
        was[i] = now[i];
      }
    }
    return waiting;
  }

  bool allFree() {
    for (var i = 0; i < n; i++) {
      if (off[i] >= 0 && slideTo(i) >= 0) return false;
    }
    return true;
  }

  List<Path?> paths(int w) => List<Path?>.generate(n, (i) {
        if (off[i] < 0) return null;
        final s = seq[i];
        return List<Pt>.generate(len[i], (j) {
          final c = s[off[i] + j];
          return Pt(c % w, c ~/ w);
        });
      });
}

/// Null if some rope's way out passes a cell twice.
SqBoard? sqBoard(List<Path?> paths, int w, int h, SqMirrors m) {
  final n = paths.length;
  final occ = List<int>.filled(w * h, -1);
  final at = List<int>.filled(w * h, 0);
  final seq = <List<int>>[];
  final len = List<int>.filled(n, 0);
  final off = List<int>.filled(n, -1);
  final bent = m.size > 0;
  var left = 0;
  for (var i = 0; i < n; i++) {
    final path = paths[i];
    if (path == null) {
      seq.add(const <int>[]);
      continue;
    }
    final hd = lastPt(path);
    final (dx, dy) = bent ? _exitDir(path, w, m) : headDir(path);
    final s = [for (final p in path) p.r * w + p.q];
    if (bent) {
      if (!rayCells(hd.q, hd.r, dx, dy, w, h, m, s)) return null;
    } else {
      var x = hd.q + dx, y = hd.r + dy;
      while (x >= 0 && y >= 0 && x < w && y < h) {
        s.add(y * w + x);
        x += dx;
        y += dy;
      }
    }
    seq.add(s);
    len[i] = path.length;
    for (var j = 0; j < path.length; j++) {
      occ[s[j]] = i;
      at[s[j]] = j;
    }
    off[i] = 0;
    left++;
  }
  return SqBoard(n, left, occ, at, seq, len, off, List<int>.filled(n, 0), List<int>.filled(n, 0));
}

SqBoard sqBoardExn(List<Path?> paths, int w, int h, SqMirrors m) {
  final b = sqBoard(paths, w, h, m);
  if (b == null) throw GenError("A rope's way out passes a cell twice");
  return b;
}

List<int> sqFrozen(List<Path?> paths, int w, int h, SqMirrors m) {
  final b = sqBoardExn(paths, w, h, m);
  b.relax();
  final out = <int>[];
  for (var i = 0; i < b.n; i++) {
    if (b.now[i] == b.off[i]) out.add(i);
  }
  return out;
}

/// solved: true, false when certainly unsolvable, null when the budget ran out.
class Solved {
  final bool? solved;
  final List<int> moves;
  final int nodes;
  Solved(this.solved, this.moves, this.nodes);
}

Solved sqSolve(List<Path?> paths, int w, int h, int budget, List<int> prefer, SqMirrors m) {
  final b = sqBoardExn(paths, w, h, m);
  final n = b.n;
  final hopeless = <String>{};
  final moves = <int>[];
  final limit = budget == 0 ? 20000 : budget;
  final rank = List<int>.filled(n, 1000000);
  final later = List<int>.filled(n, 1000000);
  for (var k = 0; k < prefer.length; k++) {
    final i = prefer[k];
    if (i >= 0 && i < n) {
      if (rank[i] == 1000000) rank[i] = k;
      later[i] = k;
    }
  }
  var nodes = 0;
  var gaveUp = false;
  bool search() {
    if (b.left == 0) return true;
    nodes++;
    if (nodes > limit) {
      gaveUp = true;
      return false;
    }
    final key = keyOf(b.off);
    if (hopeless.contains(key)) return false;
    if (b.relax() > 0) {
      hopeless.add(key);
      return false;
    }
    final tries = <(int, int, int)>[];
    for (var i = 0; i < n; i++) {
      if (b.off[i] < 0) continue;
      final to = b.slideTo(i);
      if (to != b.off[i]) {
        final r = b.off[i] != 0 ? later[i] : rank[i];
        tries.add((i, to, r * 2 + (to < 0 ? 0 : 1)));
      }
    }
    ssort<(int, int, int)>(tries, (x, y) => x.$3 != y.$3 ? x.$3 - y.$3 : x.$1 - y.$1);
    for (final t in tries) {
      final from = b.off[t.$1];
      b.place(t.$1, t.$2);
      moves.add(t.$1);
      if (search()) return true;
      moves.removeLast();
      b.place(t.$1, from);
      if (gaveUp) return false;
    }
    hopeless.add(key);
    return false;
  }

  final solved = search();
  return Solved(solved ? true : (gaveUp ? null : false), moves, nodes);
}

/// Only player taps count: once no rope blocks another, the rest is automatic.
int? sqPlayerTaps(List<Path?> paths, int w, int h, List<int> taps, SqMirrors m) {
  final b = sqBoardExn(paths, w, h, m);
  var count = 0;
  var auto = false;
  for (final i in taps) {
    if (b.off[i] < 0) continue;
    final to = b.slideTo(i);
    if (to == b.off[i]) return null;
    if (!auto) count++;
    b.place(i, to);
    if (!auto && b.allFree()) auto = true;
  }
  return b.left > 0 ? null : count;
}

class Par {
  final List<int> plan;
  final int par;
  final bool exact;
  Par(this.plan, this.par, this.exact);
}

Par? sqFewestPlayerTaps(List<Path?> paths, int w, int h, List<int> known, int budget, SqMirrors m) {
  final count = sqPlayerTaps(paths, w, h, known, m);
  if (count == null) return null;
  final b = sqBoardExn(paths, w, h, m);
  final limit = budget == 0 ? 6000 : budget;
  final moves = <int>[];
  final tried = <String, int>{};
  final rank = List<int>.filled(b.n, 1000000);
  final later = List<int>.filled(b.n, 1000000);
  for (var k = 0; k < known.length; k++) {
    final i = known[k];
    if (rank[i] == 1000000) rank[i] = k;
    later[i] = k;
  }
  var nodes = 0;
  var gaveUp = false;
  final blockers = List<bool>.filled(b.n, false);
  int bound() {
    blockers.fillRange(0, blockers.length, false);
    var total = 0;
    for (var i = 0; i < b.n; i++) {
      if (b.off[i] >= 0) {
        final seq = b.seq[i];
        for (var p = b.off[i] + b.len[i]; p < seq.length; p++) {
          final z = b.occ[seq[p]];
          if (z >= 0 && !blockers[z]) {
            blockers[z] = true;
            total++;
          }
        }
      }
    }
    return total;
  }

  final lower = imax(b.left > 0 ? 1 : 0, bound());
  bool search(int remaining) {
    if (b.allFree()) return true;
    if (remaining == 0 || bound() > remaining) return false;
    nodes++;
    if (nodes > limit) {
      gaveUp = true;
      return false;
    }
    final key = keyOf(b.off);
    final t0 = tried[key];
    if (t0 != null && t0 >= remaining) return false;
    if (b.relax() > 0) {
      tried[key] = 1000000;
      return false;
    }
    final choices = <(int, int, int)>[];
    for (var i = 0; i < b.n; i++) {
      if (b.off[i] >= 0) {
        final to = b.slideTo(i);
        if (to != b.off[i]) choices.add((i, to, b.off[i] != 0 ? later[i] : rank[i]));
      }
    }
    ssort<(int, int, int)>(choices, (x, y) => x.$3 != y.$3 ? x.$3 - y.$3 : x.$1 - y.$1);
    for (final t in choices) {
      final from = b.off[t.$1];
      b.place(t.$1, t.$2);
      moves.add(t.$1);
      if (search(remaining - 1)) return true;
      moves.removeLast();
      b.place(t.$1, from);
      if (gaveUp) return false;
    }
    tried[key] = remaining;
    return false;
  }

  var k = lower;
  while (k < count && !gaveUp) {
    if (search(k)) {
      final manual = moves.length;
      for (var i = 0; i < b.n; i++) {
        if (b.off[i] >= 0) moves.add(i);
      }
      return Par(moves, manual, true);
    }
    k++;
  }
  return Par(List<int>.of(known), count, !gaveUp);
}

List<Path?> sqPlay(List<Path?> paths, int w, int h, List<int> taps, SqMirrors m) {
  final b = sqBoardExn(paths, w, h, m);
  for (final i in taps) {
    if (b.off[i] >= 0) b.place(i, b.slideTo(i));
  }
  return b.paths(w);
}

const int evExit = 0;
const int evBounce = 1;
const int evSlide = 2;

class Replayed {
  final bool solved;
  final int taps;
  final List<int> events;
  final List<Path?> paths;
  Replayed(this.solved, this.taps, this.events, this.paths);
}

Replayed sqReplay(List<Path?> paths, int w, int h, List<int> taps, SqMirrors m) {
  final b = sqBoardExn(paths, w, h, m);
  final events = <int>[];
  var count = 0;
  var auto = false;
  for (final i in taps) {
    final to = b.off[i] < 0 ? b.off[i] : b.slideTo(i);
    if (to == b.off[i]) return Replayed(false, count, events, b.paths(w));
    if (!auto) count++;
    b.place(i, to);
    events.add(to < 0 ? evExit : evSlide);
    if (b.allFree()) auto = true;
  }
  return Replayed(b.left == 0, count, events, b.paths(w));
}

bool sqFree(List<Path?> paths, int w, int h, SqMirrors m) => sqBoardExn(paths, w, h, m).allFree();

/// Each rope's whole track as cell indices; null if a way out passes a cell twice.
List<List<int>>? sqTracks(List<Path?> paths, int w, int h, SqMirrors m) => sqBoard(paths, w, h, m)?.seq;

/// Move exits the rest of the solution does not need to the automatic release.
List<int>? sqPostponeExits(List<Path?> paths, int w, int h, List<int> taps, SqMirrors m) {
  var best = List<int>.of(taps);
  var count = sqPlayerTaps(paths, w, h, best, m);
  if (count == null) return null;
  for (var round = 0; round < 2; round++) {
    var improved = false;
    for (var k = best.length - 1; k >= 0; k--) {
      final i = best[k];
      if (indexFrom(best, i, k + 1) >= 0) continue;
      final trial = best.sublist(0, k);
      for (var j = k + 1; j < best.length; j++) {
        trial.add(best[j]);
      }
      trial.add(i);
      final c = sqPlayerTaps(paths, w, h, trial, m);
      if (c != null && c < count!) {
        best = trial;
        count = c;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return best;
}

/// The casual player: tap a rope that can leave if there is one, otherwise any
/// rope that can move, at random. Returns the share of games it wins.
double sqCasualWins(List<Path?> paths, int w, int h, Rng rng, int games, SqMirrors m) {
  final b = sqBoardExn(paths, w, h, m);
  final exits = <int>[];
  final moves = <int>[];
  var wins = 0;
  for (var g = 0; g < games; g++) {
    b.occ.fillRange(0, b.occ.length, -1);
    b.left = 0;
    for (var i = 0; i < b.n; i++) {
      b.off[i] = -1;
      b.place(i, 0);
    }
    while (true) {
      exits.clear();
      moves.clear();
      for (var i = 0; i < b.n; i++) {
        if (b.off[i] >= 0) {
          final to = b.slideTo(i);
          if (to < 0) {
            exits.add(i);
          } else if (to != b.off[i]) {
            moves.add(i);
            moves.add(to);
          }
        }
      }
      if (exits.isNotEmpty) {
        b.place(exits[rng.below(exits.length)], -1);
      } else if (moves.isNotEmpty) {
        final k = 2 * (rng.next() * moves.length / 2.0).floor();
        b.place(moves[k], moves[k + 1]);
      } else {
        break;
      }
      if (b.left == 0) {
        wins++;
        break;
      }
    }
  }
  return wins / imax(1, games);
}

int bendsOf(Path path) {
  var n = 0;
  for (var i = 2; i < path.length; i++) {
    if (path[i].q - path[i - 1].q != path[i - 1].q - path[i - 2].q ||
        path[i].r - path[i - 1].r != path[i - 1].r - path[i - 2].r) {
      n++;
    }
  }
  return n;
}

/// Every rope standing in each rope's way out, in track order.
List<List<int>> _sqBlockers(SqBoard b) => List<List<int>>.generate(b.n, (i) {
      final s = b.seq[i];
      final seen = <int>[];
      for (var p = b.len[i]; p < s.length; p++) {
        final o = b.occ[s[p]];
        if (o != -1 && !containsInt(seen, o)) seen.add(o);
      }
      return seen;
    });

/// Strongly connected groups of the "waits for" links (Tarjan, iterative).
List<List<int>> _groupsOf(List<List<int>> blk) {
  final n = blk.length;
  final index = List<int>.filled(n, -1);
  final low = List<int>.filled(n, 0);
  final on = List<bool>.filled(n, false);
  final stack = <int>[];
  final groups = <List<int>>[];
  var next = 0;
  for (var root = 0; root < n; root++) {
    if (index[root] >= 0) continue;
    final workV = <int>[root];
    final workPos = <int>[0];
    index[root] = next;
    low[root] = next;
    next++;
    stack.add(root);
    on[root] = true;
    while (workV.isNotEmpty) {
      final top = workV.length - 1;
      final v = workV[top];
      if (workPos[top] < blk[v].length) {
        final x = blk[v][workPos[top]];
        workPos[top]++;
        if (index[x] < 0) {
          index[x] = next;
          low[x] = next;
          next++;
          stack.add(x);
          on[x] = true;
          workV.add(x);
          workPos.add(0);
        } else if (on[x] && index[x] < low[v]) {
          low[v] = index[x];
        }
      } else {
        workV.removeLast();
        workPos.removeLast();
        if (workV.isNotEmpty) {
          final u = workV[workV.length - 1];
          if (low[v] < low[u]) low[u] = low[v];
        }
        if (low[v] == index[v]) {
          final group = <int>[];
          while (true) {
            final x = stack.removeLast();
            on[x] = false;
            group.add(x);
            if (x == v) break;
          }
          groups.add(group);
        }
      }
    }
  }
  return groups;
}

/// Ropes that wait on one another in a circle (membership only).
List<bool> sqLooped(SqBoard b) {
  final out = List<bool>.filled(b.n, false);
  for (final g in _groupsOf(_sqBlockers(b))) {
    if (g.length > 1) {
      for (final i in g) {
        out[i] = true;
      }
    }
  }
  return out;
}
