// Hex boards without spinners: the woven builder and the compact offset kernels of
// hex/engine.js. Axial q/r coordinates; cell indices are offset columns.
import 'square.dart';
import 'util.dart';

const List<int> hexDq = [1, 0, -1, -1, 0, 1];
const List<int> hexDr = [0, 1, 1, 0, -1, -1];

bool hexInside(int w, int h, Pt p) =>
    p.r >= 0 && p.r < h && p.q + floorDiv(p.r, 2) >= 0 && p.q + floorDiv(p.r, 2) < w;

int hexCell(Pt p, int w) => p.r * w + p.q + floorDiv(p.r, 2);

Pt hexPoint(int c, int w) {
  final r = c ~/ w;
  return Pt(c % w - r ~/ 2, r);
}

int hexReflect(int d, int axis) => ((2 * axis - d) % 6 + 6) % 6;

int hexDirIndex(int dq, int dr) {
  for (var d = 0; d < 6; d++) {
    if (hexDq[d] == dq && hexDr[d] == dr) return d;
  }
  return -1;
}

SqMirrors hexMirrors(int w, int h, List<Mirror> mirrors) {
  final m = SqMirrors.sized(w * h);
  for (final x in mirrors) {
    m.set(hexCell(x.cell, w), x.kind);
  }
  return m;
}

/// Append the cells ahead of `head` moving in direction d, to the edge; false if
/// the way out would enter a cell twice. Turning mirror cells go to `turns`.
bool _rayTrack(int w, int h, int head, int d0, SqMirrors m, List<int> out, List<int>? turns) {
  final start = out.length;
  var p = hexPoint(head, w);
  var d = d0;
  var turned = false;
  while (true) {
    p = Pt(p.q + hexDq[d], p.r + hexDr[d]);
    if (!hexInside(w, h, p)) break;
    final c = hexCell(p, w);
    final axis = m.get(c);
    out.add(c);
    if (axis >= 0) {
      final e = hexReflect(d, axis);
      if (e != d) {
        turned = true;
        if (turns != null && !containsInt(turns, c)) turns.add(c);
      }
      d = e;
      if (out.length - start > 2 * w * h) return false;
    }
  }
  return !(turned && hasDup(out, start));
}

int _exitIndex(int w, Path path, SqMirrors m) {
  final (dq, dr) = headDir(path);
  final d = hexDirIndex(dq, dr);
  final axis = m.get(hexCell(lastPt(path), w));
  return axis < 0 ? d : hexReflect(d, axis);
}

/// Mirror cells on which some rope's way out actually turns.
List<int> hexTurning(int w, int h, List<Mirror> mirrors, List<Path> paths) {
  final bent = hexMirrors(w, h, mirrors);
  final turns = <int>[];
  for (final path in paths) {
    _rayTrack(w, h, hexCell(lastPt(path), w), _exitIndex(w, path, bent), bent, <int>[], turns);
  }
  return turns;
}

class HexBoard {
  final int w, n;
  final List<List<int>> tracks;
  final List<int> lengths, offsets, occupied, at, reach;
  int left;
  HexBoard(this.w, this.n, this.tracks, this.lengths, this.offsets, this.occupied, this.at, this.reach, this.left);

  /// Where rope i would stop: its new offset, -1 if it would leave, -2 if gone.
  int to(int i) {
    if (i < 0 || i >= n || offsets[i] < 0) return -2;
    final track = tracks[i];
    final length = lengths[i];
    var p = offsets[i] + length;
    while (p < track.length && occupied[track[p]] < 0) {
      p++;
    }
    return p == track.length ? -1 : p - length;
  }

  void place(int i, int target) {
    final from = offsets[i];
    final track = tracks[i];
    final length = lengths[i];
    if (from >= 0) {
      for (var j = from; j < from + length; j++) {
        occupied[track[j]] = -1;
      }
      left--;
    }
    if (target >= 0) {
      for (var j = target; j < target + length; j++) {
        occupied[track[j]] = i;
        at[track[j]] = j;
      }
      left++;
    }
    offsets[i] = target;
  }

  bool free() {
    for (var i = 0; i < n; i++) {
      if (offsets[i] >= 0 && to(i) != -1) return false;
    }
    return true;
  }

  List<Path?> paths() => List<Path?>.generate(n, (i) {
        if (offsets[i] < 0) return null;
        final t = tracks[i];
        return List<Pt>.generate(lengths[i], (j) => hexPoint(t[offsets[i] + j], w));
      });

  /// Optimistically let every rope use cells another could eventually vacate.
  List<int> _relaxed() {
    for (var i = 0; i < n; i++) {
      reach[i] = offsets[i];
    }
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < n; i++) {
        if (reach[i] < 0) continue;
        final track = tracks[i];
        final length = lengths[i];
        var next = reach[i];
        while (true) {
          final j = next + length;
          if (j >= track.length) {
            next = -1;
            break;
          }
          final c = track[j];
          final owner = occupied[c];
          if (owner >= 0 && reach[owner] >= 0 && (owner == i ? next : reach[owner]) <= at[c]) break;
          next++;
        }
        if (next != reach[i]) {
          reach[i] = next;
          changed = true;
        }
      }
    }
    return reach;
  }

  bool dead() {
    final r = _relaxed();
    for (var i = 0; i < n; i++) {
      if (r[i] >= 0) return true;
    }
    return false;
  }

  List<int> frozen() {
    final r = _relaxed();
    final out = <int>[];
    for (var i = 0; i < n; i++) {
      if (offsets[i] >= 0 && r[i] == offsets[i]) out.add(i);
    }
    return out;
  }
}

HexBoard? hexCompile(int w, int h, List<Mirror> mirrors, List<Path?> paths) {
  final n = paths.length;
  final area = w * h;
  final tracks = <List<int>>[];
  final lengths = List<int>.filled(n, 0);
  final offsets = List<int>.filled(n, -1);
  final occupied = List<int>.filled(area, -1);
  final at = List<int>.filled(area, 0);
  final bent = hexMirrors(w, h, mirrors);
  var left = 0;
  for (var i = 0; i < n; i++) {
    final path = paths[i];
    if (path == null) {
      tracks.add(const <int>[]);
      continue;
    }
    final track = [for (final p in path) hexCell(p, w)];
    for (var j = 0; j < track.length; j++) {
      occupied[track[j]] = i;
      at[track[j]] = j;
    }
    if (bent.size > 0) {
      if (!_rayTrack(w, h, track[track.length - 1], _exitIndex(w, path, bent), bent, track, null)) return null;
    } else {
      final (dq, dr) = headDir(path);
      var p = Pt(lastPt(path).q + dq, lastPt(path).r + dr);
      while (hexInside(w, h, p)) {
        track.add(hexCell(p, w));
        p = Pt(p.q + dq, p.r + dr);
      }
    }
    tracks.add(track);
    lengths[i] = path.length;
    offsets[i] = 0;
    left++;
  }
  return HexBoard(w, n, tracks, lengths, offsets, occupied, at, List<int>.filled(n, 0), left);
}

HexBoard hexCompileExn(int w, int h, List<Mirror> mirrors, List<Path?> paths) {
  final b = hexCompile(w, h, mirrors, paths);
  if (b == null) throw GenError("A rope's way out passes a cell twice");
  return b;
}

Replayed hexReplay(int w, int h, List<Mirror> mirrors, List<int> moves, List<Path?> paths) {
  final board = hexCompileExn(w, h, mirrors, paths);
  final events = <int>[];
  var taps = 0;
  var automatic = false;
  for (final i in moves) {
    final target = board.to(i);
    if (target == -2 || target == board.offsets[i]) return Replayed(false, taps, events, board.paths());
    if (!automatic) taps++;
    board.place(i, target);
    events.add(target < 0 ? evExit : evSlide);
    if (board.free()) automatic = true;
  }
  return Replayed(board.left == 0, taps, events, board.paths());
}

Solved hexSolve(int w, int h, List<Mirror> mirrors, List<Path?> paths, int budget, List<int> prefer) {
  final board = hexCompileExn(w, h, mirrors, paths);
  final seen = <String>{};
  final moves = <int>[];
  var nodes = 0;
  var exhausted = false;
  bool search(int pi) {
    if (board.left == 0) return true;
    final state = keyOf(board.offsets);
    if (seen.contains(state)) return false;
    nodes++;
    if (nodes > budget) {
      exhausted = true;
      return false;
    }
    seen.add(state);
    if (board.dead()) return false;
    final p0 = pi < prefer.length ? prefer[pi] : -1;
    final tries = <(int, int)>[];
    for (var i = 0; i < paths.length; i++) {
      final target = board.to(i);
      if (target != -2 && target != board.offsets[i]) tries.add((i, target));
    }
    ssort<(int, int)>(tries, (a, b) {
      if (a.$1 == p0) return -1;
      if (b.$1 == p0) return 1;
      return (a.$2 < 0 ? 0 : 1) - (b.$2 < 0 ? 0 : 1);
    });
    for (final t in tries) {
      final (i, target) = t;
      final from = board.offsets[i];
      board.place(i, target);
      moves.add(i);
      if (search(i == p0 ? pi + 1 : pi)) return true;
      board.place(i, from);
      moves.removeLast();
      if (exhausted) break;
    }
    return false;
  }

  final solved = search(0);
  return Solved(solved ? true : (exhausted ? null : false), solved ? moves : <int>[], nodes);
}

List<int>? hexPostponeExits(int w, int h, List<Mirror> mirrors, List<Path> ropes, List<int> plan) {
  final start = somePaths(ropes);
  var best = List<int>.of(plan);
  var result = hexReplay(w, h, mirrors, best, start);
  if (!result.solved) return null;
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
      final r = hexReplay(w, h, mirrors, trial, start);
      if (r.solved && r.taps < result.taps) {
        best = trial;
        result = r;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return best;
}

double hexCasualWins(int w, int h, List<Mirror> mirrors, List<Path> ropes, Rng rng, int games) {
  var wins = 0;
  final exits = <int>[];
  final moves = <int>[];
  final start = somePaths(ropes);
  for (var g = 0; g < games; g++) {
    final b = hexCompileExn(w, h, mirrors, start);
    while (true) {
      exits.clear();
      moves.clear();
      for (var i = 0; i < ropes.length; i++) {
        if (b.offsets[i] >= 0) {
          final t = b.to(i);
          if (t == -1) {
            exits.add(i);
          } else if (t != b.offsets[i]) {
            moves.add(i);
            moves.add(t);
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

Par hexFewestPlayerTaps(int w, int h, List<Mirror> mirrors, List<Path> ropes, List<int> fallback, int budget) {
  final start = somePaths(ropes);
  final verified = hexReplay(w, h, mirrors, fallback, start);
  if (!verified.solved) throw GenError('Par requires a replayable Hex solution');
  final b = hexCompileExn(w, h, mirrors, start);
  final n = b.n;
  final moves = <int>[];
  final tried = <String, int>{};
  final rank = List<int>.filled(n, 1000000);
  final later = List<int>.filled(n, 1000000);
  for (var step = 0; step < fallback.length; step++) {
    final id = fallback[step];
    if (rank[id] == 1000000) rank[id] = step;
    later[id] = step;
  }
  var nodes = 0;
  var exhausted = false;
  final blockers = List<bool>.filled(n, false);
  int bound() {
    blockers.fillRange(0, n, false);
    var count = 0;
    for (var i = 0; i < n; i++) {
      if (b.offsets[i] >= 0) {
        final t = b.tracks[i];
        for (var k = b.offsets[i] + b.lengths[i]; k < t.length; k++) {
          final owner = b.occupied[t[k]];
          if (owner >= 0 && !blockers[owner]) {
            blockers[owner] = true;
            count++;
          }
        }
      }
    }
    return count;
  }

  bool search(int remaining) {
    if (b.free()) return true;
    if (remaining == 0 || bound() > remaining) return false;
    nodes++;
    if (nodes > budget) {
      exhausted = true;
      return false;
    }
    final state = keyOf(b.offsets);
    final t0 = tried[state];
    if (t0 != null && t0 >= remaining) return false;
    if (b.dead()) {
      tried[state] = 1000000;
      return false;
    }
    final choices = <(int, int, int)>[];
    for (var i = 0; i < n; i++) {
      final to = b.to(i);
      if (to != -2 && to != b.offsets[i]) choices.add((i, to, b.offsets[i] != 0 ? later[i] : rank[i]));
    }
    ssort<(int, int, int)>(choices, (a, c) => a.$3 != c.$3 ? a.$3 - c.$3 : a.$1 - c.$1);
    for (final t in choices) {
      final (i, to, _) = t;
      final from = b.offsets[i];
      b.place(i, to);
      moves.add(i);
      if (search(remaining - 1)) return true;
      moves.removeLast();
      b.place(i, from);
      if (exhausted) return false;
    }
    tried[state] = remaining;
    return false;
  }

  var taps = imax(1, bound());
  while (taps < verified.taps && !exhausted) {
    if (search(taps)) {
      final manual = moves.length;
      for (var i = 0; i < n; i++) {
        if (b.offsets[i] >= 0) moves.add(i);
      }
      return Par(moves, manual, true);
    }
    taps++;
  }
  return Par(List<int>.of(fallback), verified.taps, !exhausted);
}

class _HexIntent {
  final List<int> moves;
  final int cost;
  _HexIntent(this.moves, this.cost);
}

/// Replay exact slide destinations (stops are head cells, in order per rope).
_HexIntent? _hexIntentions(int w, int h, List<Mirror> mirrors, List<Path> ropes, List<List<int>> stops,
    List<int>? certificate) {
  final b = hexCompileExn(w, h, mirrors, somePaths(ropes));
  final n = ropes.length;
  final done = List<int>.filled(n, 0);
  final released = List<int>.filled(w * h, 0);
  final movedAt = List<int>.filled(n, 0);
  final moves = <int>[];
  var cost = 0;
  bool step(int i) {
    final from = b.offsets[i];
    final target = b.to(i);
    if (target == -2 || target == from) return false;
    final expected = stops[i];
    final stop = done[i] < expected.length ? expected[done[i]] : -1;
    final length = b.lengths[i];
    final track = b.tracks[i];
    if (stop >= 0) {
      if (target < 0 || track[target + length - 1] != stop) return false;
    } else if (target != -1) {
      return false;
    }
    var layer = movedAt[i];
    final end = target < 0 ? track.length : target + length;
    for (var j = from + length; j < end; j++) {
      layer = imax(layer, released[track[j]]);
    }
    if (target >= 0) {
      final owner = b.occupied[track[end]];
      if (owner >= 0) layer = imax(layer, movedAt[owner]);
    }
    layer++;
    movedAt[i] = layer;
    final stopAt = target < 0 ? from + length : imin(from + length, target);
    for (var j = from; j < stopAt; j++) {
      released[track[j]] = layer;
    }
    b.place(i, target);
    done[i]++;
    moves.add(i);
    if (target < 0) cost += layer;
    return true;
  }

  if (certificate != null) {
    for (final i in certificate) {
      if (!step(i)) return null;
    }
  } else {
    var changed = true;
    while (changed && b.left > 0) {
      changed = false;
      for (var i = n - 1; i >= 0; i--) {
        if (step(i)) changed = true;
      }
    }
  }
  return b.left > 0 ? null : _HexIntent(moves, cost);
}

class HexCfg {
  final int w, h, stage;
  final double coverage;
  final int length;
  final double tapDepth;
  final List<Mirror> mirrors;
  final int knots, traps;
  final List<Path> initialRopes;
  final List<List<int>> initialStops;
  final List<int>? initialPlan;
  HexCfg({
    required this.w,
    required this.h,
    required this.stage,
    required this.coverage,
    required this.length,
    required this.tapDepth,
    required this.mirrors,
    required this.knots,
    required this.traps,
    required this.initialRopes,
    required this.initialStops,
    required this.initialPlan,
  });
}

class HexBuilt {
  final List<Path> ropes;
  final List<int> plan;
  HexBuilt(this.ropes, this.plan);
}

class _HexShape {
  final Path path;
  final List<int> ids, ray, turns;
  _HexShape(this.path, this.ids, this.ray, this.turns);
}

HexBuilt? hexBuild(Rng rng, HexCfg cfg) {
  final w = cfg.w, h = cfg.h, area = w * h;
  final points = List<Pt>.generate(area, (i) => hexPoint(i, w));
  final neighbours = List<List<int>>.generate(area, (c) => List<int>.generate(6, (d) {
        final q = Pt(points[c].q + hexDq[d], points[c].r + hexDr[d]);
        return hexInside(w, h, q) ? hexCell(q, w) : -1;
      }));
  final occupied = List<int>.filled(area, -1);
  final seen = List<int>.filled(area, 0);
  final forward = List<int>.filled(area, 0);
  final mirrors = cfg.mirrors;
  final ropes = <Path>[];
  final stops = <List<int>>[];
  var stamp = 0, covered = 0, knots = 0;
  var result = _HexIntent(<int>[], 0);
  final bent = hexMirrors(w, h, mirrors);
  final tile = List<bool>.filled(area, false);
  for (final c in bent.keys) {
    tile[c] = true;
  }
  final kept = List<bool>.filled(area, false);
  bool free(int c) => c >= 0 && occupied[c] < 0 && !tile[c] && !kept[c];

  List<int>? ray(int head, int d) {
    final out = <int>[];
    if (bent.size > 0) {
      return _rayTrack(w, h, head, d, bent, out, null) ? out : null;
    }
    var c = neighbours[head][d];
    while (c >= 0) {
      out.add(c);
      c = neighbours[c][d];
    }
    return out;
  }

  _HexIntent? intent(List<int>? cert) => _hexIntentions(w, h, mirrors, ropes, stops, cert);

  _HexShape? shape(int want, (int, int)? aim) {
    const minimum = 2;
    var head = aim != null ? aim.$1 : -1;
    if (aim == null) {
      for (var k = 0; k < 24; k++) {
        final c = rng.below(area);
        if (free(c)) {
          head = c;
          break;
        }
      }
    }
    if (head < 0) return null;
    final dir = aim != null ? aim.$2 : rng.below(6);
    final back = (dir + 3) % 6;
    final second = neighbours[head][back];
    if (!free(second)) return null;
    final turns = <int>[];
    final ahead = <int>[];
    if (bent.size > 0) {
      if (!_rayTrack(w, h, head, dir, bent, ahead, turns)) return null;
    } else {
      var c = neighbours[head][dir];
      while (c >= 0) {
        ahead.add(c);
        c = neighbours[c][dir];
      }
    }
    stamp++;
    final body = [head, second];
    seen[head] = stamp;
    seen[second] = stamp;
    for (final c in ahead) {
      forward[c] = stamp;
    }
    if (forward[second] == stamp) return null;
    var previous = back;
    while (body.length < want) {
      final choices = <int>[];
      final tip = body[body.length - 1];
      for (var d = 0; d < 6; d++) {
        final c = neighbours[tip][d];
        if (free(c) && seen[c] != stamp && forward[c] != stamp) choices.add(d);
      }
      if (choices.isEmpty) break;
      previous = (containsInt(choices, previous) && rng.next() < 0.38) ? previous : choices[rng.below(choices.length)];
      final c = neighbours[tip][previous];
      seen[c] = stamp;
      body.add(c);
    }
    if (body.length < minimum) return null;
    final ids = body.reversed.toList();
    return _HexShape([for (final c in ids) points[c]], ids, ahead, turns);
  }

  // Optional repeated-slide core, replayed before any gap-filling additions.
  if (cfg.initialRopes.isNotEmpty) {
    final used = List<bool>.filled(area, false);
    var size = 0;
    for (final path in cfg.initialRopes) {
      if (path.length < 2) return null;
      for (final p in path) {
        if (!hexInside(w, h, p) || used[hexCell(p, w)]) return null;
      }
      for (final p in path) {
        used[hexCell(p, w)] = true;
        size++;
      }
      ropes.add(List<Pt>.of(path));
    }
    final core = hexCompileExn(w, h, mirrors, somePaths(ropes));
    for (var i = 0; i < ropes.length; i++) {
      final offs = i < cfg.initialStops.length ? cfg.initialStops[i] : <int>[];
      stops.add([for (final o in offs) core.tracks[i][o + core.lengths[i] - 1]]);
    }
    final r = intent(cfg.initialPlan);
    if (r == null) return null;
    result = r;
    for (var i = 0; i < ropes.length; i++) {
      for (final p in ropes[i]) {
        occupied[hexCell(p, w)] = i;
      }
    }
    covered = size;
    knots = stops.where((s) => s.isNotEmpty).length;
  }
  // Mutual-wait pairs: at least one rope of each must slide.
  final stage = cfg.stage;
  var attempt = 0;
  while (attempt < imax(5000, area * 24) && knots < cfg.knots) {
    attempt++;
    final length = imin(38, 7 + stage ~/ 2);
    final base = 4 + stage ~/ 14;
    final a = shape(base + rng.below(length), null);
    if (a == null) continue;
    for (final c in a.ids) {
      occupied[c] = 9999;
    }
    final bs = shape(base + rng.below(length), null);
    for (final c in a.ids) {
      occupied[c] = -1;
    }
    if (bs == null) continue;
    final bb = bs;
    if (!a.ray.any((c) => containsInt(bb.ids, c)) || !bb.ray.any((c) => containsInt(a.ids, c))) continue;
    final i = ropes.length;
    ropes.add(a.path);
    ropes.add(bb.path);
    stops.add(<int>[]);
    stops.add(<int>[]);
    final board = hexCompileExn(w, h, mirrors, somePaths(ropes));
    _HexIntent? trial;
    for (final id in [i, i + 1]) {
      final target = board.to(id);
      if (target <= 0) continue;
      stops[id] = [board.tracks[id][target + board.lengths[id] - 1]];
      trial = intent(null);
      if (trial != null) break;
      stops[id] = <int>[];
    }
    if (trial == null) {
      ropes.removeLast();
      ropes.removeLast();
      stops.removeLast();
      stops.removeLast();
      continue;
    }
    result = trial;
    knots++;
    for (final c in a.ids) {
      occupied[c] = i;
    }
    for (final c in bb.ids) {
      occupied[c] = i + 1;
    }
    covered += a.ids.length + bb.ids.length;
  }
  // Long, winding additions that make many existing ropes wait.
  var attempts = 0;
  final turnedBy = List<bool>.filled(area, false);
  var turnedCount = 0;
  (int, int)? aimAt() {
    final idle = mirrors.where((m) => !turnedBy[hexCell(m.cell, w)]).toList();
    if (idle.isEmpty) return null;
    final m = idle[rng.below(idle.length)];
    final c = hexCell(m.cell, w);
    final dirs = [0, 1, 2, 3, 4, 5].where((e) => e % 3 != m.kind % 3).toList();
    final d = dirs[rng.below(dirs.length)];
    final j = 1 + rng.below(3);
    var head = c;
    var k = 0;
    while (k < j && head >= 0) {
      head = neighbours[head][(d + 3) % 6];
      k++;
    }
    var x = head;
    k = 0;
    while (k < j && x >= 0) {
      if (!free(x)) return null;
      k++;
      x = neighbours[x][d];
    }
    return head >= 0 ? (head, d) : null;
  }

  void noteTurns(Path path) {
    if (bent.size > 0) {
      final t = <int>[];
      _rayTrack(w, h, hexCell(lastPt(path), w), _exitIndex(w, path, bent), bent, <int>[], t);
      for (final c in t) {
        if (!turnedBy[c]) {
          turnedBy[c] = true;
          turnedCount++;
        }
      }
    }
  }

  for (final path in ropes) {
    noteTurns(path);
  }
  var traps = 0;
  bool tryTrap() {
    final board = hexCompileExn(w, h, mirrors, somePaths(ropes));
    final wayOut = List<List<bool>>.generate(ropes.length, (i) {
      final s = List<bool>.filled(area, false);
      final t = board.tracks[i];
      for (var k = board.lengths[i]; k < t.length; k++) {
        s[t[k]] = true;
      }
      return s;
    });
    final spots = <(int, int, int, List<int>)>[];
    final deadly = <(int, int, int, List<int>)>[];
    for (var c = 0; c < area; c++) {
      if (!free(c)) continue;
      for (var d = 0; d < 6; d++) {
        if (!free(neighbours[c][(d + 3) % 6])) continue;
        final ahead = ray(c, d);
        if (ahead == null) continue;
        var gap = 0;
        while (gap < ahead.length && gap < 4 && occupied[ahead[gap]] < 0) {
          gap++;
        }
        if (gap >= 1 && gap <= 3 && gap < ahead.length && occupied[ahead[gap]] >= 0) {
          var ok = true;
          for (var k = 0; k < gap; k++) {
            if (kept[ahead[k]]) ok = false;
          }
          if (!ok) continue;
          final cells = ahead.sublist(0, gap);
          final spot = (c, d, gap, cells);
          final blocker = occupied[ahead[gap]];
          spots.add(spot);
          if (blocker < wayOut.length) {
            final wo = wayOut[blocker];
            if (wo[c] || cells.any((x) => wo[x])) deadly.add(spot);
          }
        }
      }
    }
    final pool = deadly.isNotEmpty ? deadly : spots;
    for (var tr = 0; tr < 16; tr++) {
      if (pool.isEmpty) break;
      final (sc, sd, sgap, scells) = pool[rng.below(pool.length)];
      final want = 3 + (rng.next() * dmax(2.0, cfg.length / 2.0)).floor();
      final shaped = shape(want, (sc, sd));
      if (shaped == null) continue;
      final id = ropes.length;
      ropes.add(shaped.path);
      stops.add(<int>[]);
      final trial = intent(null);
      var fatal = false;
      if (trial != null) {
        final board = hexCompileExn(w, h, mirrors, somePaths(ropes));
        if (board.to(id) == sgap) {
          board.place(id, sgap);
          fatal = board.dead();
        }
      }
      if (!fatal) {
        ropes.removeLast();
        stops.removeLast();
        continue;
      }
      result = trial!;
      noteTurns(shaped.path);
      for (final c in shaped.ids) {
        occupied[c] = id;
      }
      covered += shaped.ids.length;
      for (final x in scells) {
        kept[x] = true;
      }
      traps++;
      return true;
    }
    return false;
  }

  final limit = area * 22;
  while (covered < area * cfg.coverage && attempts < limit) {
    if (traps < cfg.traps && ropes.length >= 2 && rng.next() < 0.5 && tryTrap()) continue;
    (_HexShape, _HexIntent, double)? best;
    final aim = bent.size > turnedCount;
    var n = 0;
    while (n < 12) {
      final old = attempts;
      attempts++;
      if (!(old < limit)) break;
      final want = 4 + ((0.45 + 0.55 * rng.next()) * cfg.length).floor();
      final aimSpot = (aim && n < 4) ? aimAt() : null;
      n++;
      final s = shape(want, aimSpot);
      if (s == null) continue;
      ropes.add(s.path);
      stops.add(<int>[]);
      final trial = intent(null);
      ropes.removeLast();
      stops.removeLast();
      if (trial == null) continue;
      var fresh = 0;
      for (final c in s.turns) {
        if (!turnedBy[c]) fresh++;
      }
      final gain = (trial.cost - result.cost) * (cfg.tapDepth - 1.0) + (s.ids.length * 4) + (30 * fresh);
      if (best == null || gain > best.$3) best = (s, trial, gain);
    }
    if (best == null) continue;
    final (s, t, _) = best;
    final id = ropes.length;
    ropes.add(s.path);
    stops.add(<int>[]);
    result = t;
    noteTurns(s.path);
    for (final c in s.ids) {
      occupied[c] = id;
    }
    covered += s.ids.length;
  }
  if (intent(result.moves) == null) throw GenError('Hex weaving certificate failed');
  return HexBuilt(ropes, result.moves);
}
