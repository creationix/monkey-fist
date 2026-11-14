// dependency-metrics.js: causal relationships observed during the manual part of a
// verified solution. Only `interaction`, the term the generator's selection reads,
// is computed; the JS also reports descriptive counts that nothing selects on.
import 'hex.dart';
import 'mech.dart';
import 'square.dart';
import 'util.dart';

class _Snap {
  final int event; // 0 exit, 1 blocked, 2 loop, 3 bounce
  final int distance;
  final int blocker;
  const _Snap(this.event, this.distance, this.blocker);
}

const _loop = _Snap(2, 0, -1);

List<_Snap?> _snapshot(Geo g, List<Path?> paths) {
  final s = g.mark(paths);
  final owner = List<int>.filled(g.w * g.h, -1);
  for (var i = 0; i < paths.length; i++) {
    final path = paths[i];
    if (path != null) {
      for (final c in path) {
        owner[g.cell(c)] = i;
      }
    }
  }
  final seen = <int>[];
  _Snap? one(Path? path) {
    if (path == null) return null;
    var pt = lastPt(path);
    var (dq, dr) = g.direction(path);
    var distance = 0;
    seen.clear();
    for (var k = 0; k <= g.w * g.h * 6; k++) {
      final next = Pt(pt.q + dq, pt.r + dr);
      if (!g.inside(next)) return _Snap(0, distance, -1);
      final c = g.cell(next);
      if (g.occ[c] == s) return _Snap(1, distance, owner[c]);
      final state = g.hex ? c : (c * 3 + dq + 1) * 3 + dr + 1;
      if (containsInt(seen, state)) return _loop;
      seen.add(state);
      distance++;
      pt = next;
      if (g.spring[c]) return _Snap(3, distance, -1);
      final m = g.mirror[c];
      if (m >= 0) {
        if (g.hex) {
          final d = hexReflect(hexDirIndex(dq, dr), m);
          dq = hexDq[d];
          dr = hexDr[d];
        } else {
          final t = turn(m, dq, dr);
          dq = t.$1;
          dr = t.$2;
        }
      }
    }
    return _loop;
  }

  return [for (final p in paths) one(p)];
}

double interaction(Board b, Geo g, List<int> plan, int manual) {
  final n = b.ropes.length;
  final dependents = List<List<int>>.generate(n, (_) => <int>[]);
  var paths = somePaths(b.ropes);
  var before = _snapshot(g, paths);
  final actions = List<int>.filled(n, 0);
  final lastAction = List<int>.filled(n, -1);
  final lastFreed = List<int>.filled(n, -1);
  final revisited = List<bool>.filled(n, false);
  var revisitedCount = 0;
  final steps = imin(plan.length, imax(0, manual));
  for (var step = 0; step < steps; step++) {
    final id = plan[step];
    final mv = g.tap(paths, id);
    if (mv == null) break;
    final after = _snapshot(g, mv.paths);
    for (var j = 0; j < n; j++) {
      if (j == id) continue;
      final a = before[j];
      if (a == null) continue;
      final bb = after[j];
      if (bb == null) continue;
      if (a.blocker != id || bb.event == 2) continue;
      if (bb.distance > a.distance || (bb.event == 0 && a.event != 0)) {
        if (!containsInt(dependents[id], j)) dependents[id].add(j);
        lastFreed[j] = step;
      }
    }
    if (actions[id] > 0 && lastFreed[id] > lastAction[id] && !revisited[id]) {
      revisited[id] = true;
      revisitedCount++;
    }
    actions[id]++;
    lastAction[id] = step;
    paths = mv.paths;
    before = after;
  }
  return _graphInteraction(dependents, n, revisitedCount);
}

double _graphInteraction(List<List<int>> dependents, int n, int revisited) {
  final prerequisites = List<List<int>>.generate(n, (_) => <int>[]);
  for (var from = 0; from < n; from++) {
    for (final to in dependents[from]) {
      prerequisites[to].add(from);
    }
  }
  // Tarjan's strongly connected components.
  var nextIndex = 0;
  final indices = List<int>.filled(n, -1);
  final low = List<int>.filled(n, 0);
  final onStack = List<bool>.filled(n, false);
  final stack = <int>[];
  final components = <List<int>>[];
  final component = List<int>.filled(n, 0);
  void visit(int v) {
    indices[v] = nextIndex;
    low[v] = nextIndex;
    nextIndex++;
    stack.add(v);
    onStack[v] = true;
    for (final x in dependents[v]) {
      if (indices[x] < 0) {
        visit(x);
        low[v] = imin(low[v], low[x]);
      } else if (onStack[x]) {
        low[v] = imin(low[v], indices[x]);
      }
    }
    if (low[v] != indices[v]) return;
    final group = <int>[];
    while (true) {
      final x = stack.removeLast();
      onStack[x] = false;
      component[x] = components.length;
      group.add(x);
      if (x == v) break;
    }
    components.add(group);
  }

  for (var i = 0; i < n; i++) {
    if (indices[i] < 0) visit(i);
  }
  final k = components.length;
  final arcs = List<List<int>>.generate(k, (_) => <int>[]);
  final indegree = List<int>.filled(k, 0);
  for (var i = 0; i < n; i++) {
    for (final j in dependents[i]) {
      final a = component[i], c = component[j];
      if (a != c && !containsInt(arcs[a], c)) {
        arcs[a].add(c);
        indegree[c]++;
      }
    }
  }
  final queue = <int>[];
  for (var i = 0; i < k; i++) {
    if (indegree[i] == 0) queue.add(i);
  }
  var q = 0;
  while (q < queue.length) {
    for (final c in arcs[queue[q]]) {
      indegree[c]--;
      if (indegree[c] == 0) queue.add(c);
    }
    q++;
  }
  // reach[a]: components reachable from a, for transitive reduction.
  final reach = List<List<bool>>.generate(k, (_) => List<bool>.filled(k, false));
  for (var qi = queue.length - 1; qi >= 0; qi--) {
    final a = queue[qi];
    for (final c in arcs[a]) {
      reach[a][c] = true;
      for (var x = 0; x < k; x++) {
        if (reach[c][x]) reach[a][x] = true;
      }
    }
  }
  final essential = List<List<int>>.generate(
      k, (a) => arcs[a].where((c) => !arcs[a].any((x) => x != c && reach[x][c])).toList());
  final incoming = List<int>.filled(k, 0);
  for (final next in essential) {
    for (final c in next) {
      incoming[c]++;
    }
  }
  final internalJoins = [
    for (final group in components)
      group.where((i) => prerequisites[i].where((j) => component[j] == component[i]).length >= 2).length
  ];
  var joins = 0;
  for (final x in incoming) {
    if (x >= 2) joins++;
  }
  for (final x in internalJoins) {
    joins += x;
  }
  final junctions = List<int>.generate(k, (i) => (incoming[i] >= 2 ? 1 : 0) + (internalJoins[i] > 0 ? 1 : 0));
  final branch = List<int>.of(junctions);
  for (final a in queue) {
    for (final c in essential[a]) {
      branch[c] = imax(branch[c], branch[a] + junctions[c]);
    }
  }
  var mutual = 0;
  for (final group in components) {
    if (group.length > 1) mutual += group.length;
  }
  var branching = 0;
  for (final x in branch) {
    branching = imax(branching, x);
  }
  // The largest group of ropes coupled by any relationship.
  final seen = List<bool>.filled(n, false);
  var largest = 0;
  for (var i = 0; i < n; i++) {
    if (seen[i]) continue;
    final group = [i];
    seen[i] = true;
    var gq = 0;
    while (gq < group.length) {
      final v = group[gq];
      for (final x in prerequisites[v]) {
        if (!seen[x]) {
          seen[x] = true;
          group.add(x);
        }
      }
      for (final x in dependents[v]) {
        if (!seen[x]) {
          seen[x] = true;
          group.add(x);
        }
      }
      gq++;
    }
    if (group.length > 1) largest = imax(largest, group.length);
  }
  final nd = n.toDouble();
  final connected = largest / dmax(1.0, nd);
  final evidence = 3.0 * dmin(joins / dmax(1.0, nd * 0.25), 1.0) +
      2.5 * mutual / dmax(1.0, nd) +
      2.0 * revisited / dmax(1.0, nd) +
      1.5 * dmin(branching / 4.0, 1.0);
  return toFixed(evidence * (0.4 + 0.6 * connected), 4);
}
