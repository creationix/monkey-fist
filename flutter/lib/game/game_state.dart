// The game layer of app.js: state, taps and queued motions with shared-path
// traffic, automatic release, undo, hints, auto-solve, scoring and stars, the
// camera (fit, rotation, zoom and pan) and hit-testing. Pure Dart: the Flutter
// widgets only draw what this exposes, forward taps and play the effects it emits.
import 'dart:math' as math;

import '../core/engine.dart';
import '../core/hex.dart';
import '../core/mech.dart';
import '../core/square.dart';
import '../core/util.dart';

/// Sound effects, as in sounds.js. `arg` carries a pitch index or the star count.
enum Sfx { activate, slide, reflect, spring, pop, bump, thud, blocked, undo, hint, win }

typedef SfxSink = void Function(Sfx kind, int arg);

class Motion {
  final int i;
  final Path path;
  final List<Pt> route;
  final int event;
  final Path? finalPath;
  final double distance;
  final double impactAt; // bounce: progress at which the head reaches the spring; -1 otherwise
  final Pt? spring;
  double progress = 0;
  double speed = 0;
  bool impacted = false;
  bool swished = false;
  bool waiting = false;
  final bool automatic;
  Motion? queued;
  final Map<int, int> visits;
  List<(Motion, double, double)> traffic = [];
  final int popNote;
  final List<int> reflections;
  int nextReflection = 0;
  final int serial;
  Motion({
    required this.i,
    required this.path,
    required this.route,
    required this.event,
    required this.finalPath,
    required this.distance,
    required this.impactAt,
    required this.spring,
    required this.automatic,
    required this.visits,
    required this.popNote,
    required this.reflections,
    required this.serial,
  });
}

class Snapshot {
  final List<Path?> paths;
  final List<int> plan;
  final bool lost;
  Snapshot(this.paths, this.plan, this.lost);
}

/// A point in screen pixels.
class Vec {
  final double x, y;
  const Vec(this.x, this.y);
}

int _cellKey(Pt p) => (p.q + 4096) * 8192 + p.r + 4096;

class GameState {
  final Level level;
  final Geo geo;
  final SfxSink sfx;
  late List<Path?> paths;
  late List<int> plan;
  final Map<int, Motion> moves = {};
  int taps = 0;
  int undos = 3;
  final List<Snapshot> history = [];
  bool auto = false;
  bool ended = false;
  bool lost = false;
  bool usedAuto = false;
  double outro = 0; // 0..1 fade of the empty grid after auto-solve
  int hint = -1;
  double hintTime = 0;
  int bump = -1;
  double bumpTime = 0;
  int clearNo = 0;
  int stars = -1;
  List<int> frozen = [];
  int serial = 0;
  double speedFactor = 1.0;
  double clock = 0;
  final Map<int, double> activations = {};
  final Map<int, double> springAngle = {};
  String notice = '';
  double noticeTime = 0;
  void Function(int stars)? onFinish;

  // ---- view ----
  double width = 360, height = 640;
  double padTop = 80, padBottom = 90, padLeft = 12, padRight = 12;
  bool rotated = false;
  double fitScale = 30, zoom = 1, camX = 0, camY = 0;
  double scale = 30, ox = 0, oy = 0;
  double _cx = 0, _cy = 0, _bw = 0, _bh = 0;

  GameState(this.level, {SfxSink? sfx})
      : geo = level.board.geo(),
        sfx = sfx ?? ((_, _) {}) {
    restart();
  }

  Board get board => level.board;
  int get par => level.par;
  int get ropesLeft => paths.where((p) => p != null).length;
  bool get moving => moves.isNotEmpty;
  bool get zoomable => fitScale < 56;

  void restart() {
    paths = somePaths(board.ropes);
    plan = List<int>.of(board.plan);
    moves.clear();
    taps = 0;
    undos = 3;
    history.clear();
    auto = false;
    ended = false;
    lost = false;
    usedAuto = false;
    outro = 0;
    hint = -1;
    hintTime = 0;
    bump = -1;
    clearNo = 0;
    stars = -1;
    frozen = [];
    activations.clear();
    springAngle.clear();
    _say('');
  }

  void _say(String text) {
    notice = text;
    noticeTime = text.isEmpty ? 0 : 1.6;
  }

  // ---------------------------------------------------------------- camera

  (double, double) project(double q, double r) =>
      board.hex ? (q + r / 2.0, r * math.sqrt(3) / 2.0) : (q, r);

  Vec screenAt(double q, double r) {
    var (x, y) = project(q, r);
    if (rotated) (x, y) = (-y, x);
    return Vec(ox + x * scale, oy + y * scale);
  }

  Vec screen(Pt p) => screenAt(p.q.toDouble(), p.r.toDouble());

  /// Every cell of the board, in index order.
  List<Pt> cells() => List<Pt>.generate(board.w * board.h, (c) => board.hex ? hexPoint(c, board.w) : Pt(c % board.w, c ~/ board.w));

  /// Fit the board between the control bands, rotating it by 90° when that
  /// makes it larger (as app.js does). Resets zoom and pan.
  void resize(double w, double h, {double top = 80, double bottom = 90, double left = 12, double right = 12}) {
    width = w;
    height = h;
    padTop = top;
    padBottom = bottom;
    padLeft = left;
    padRight = right;
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (final p in cells()) {
      final (x, y) = project(p.q.toDouble(), p.r.toDouble());
      x0 = math.min(x0, x);
      x1 = math.max(x1, x);
      y0 = math.min(y0, y);
      y1 = math.max(y1, y);
    }
    x0 -= 0.6;
    x1 += 0.6;
    y0 -= 0.6;
    y1 += 0.6;
    final bw = x1 - x0, bh = y1 - y0;
    final uw = math.max(80.0, w - left - right), uh = math.max(80.0, h - top - bottom);
    final normal = math.min(uw / bw, uh / bh), turned = math.min(uw / bh, uh / bw);
    rotated = turned > normal;
    fitScale = math.max(1.0, math.min(110.0, rotated ? turned : normal));
    _cx = rotated ? -(y1 + y0) / 2 : (x1 + x0) / 2;
    _cy = rotated ? (x1 + x0) / 2 : (y1 + y0) / 2;
    _bw = (rotated ? bh : bw);
    _bh = (rotated ? bw : bh);
    zoom = 1;
    camX = 0;
    camY = 0;
    _applyCamera();
  }

  double get _centerX => padLeft + math.max(80.0, width - padLeft - padRight) / 2;
  double get _centerY => padTop + math.max(80.0, height - padTop - padBottom) / 2;

  void _applyCamera() {
    // Keep the board covering the free band when zoomed (input.js constrain).
    final uw = math.max(80.0, width - padLeft - padRight), uh = math.max(80.0, height - padTop - padBottom);
    final bw = _bw * fitScale * zoom, bh = _bh * fitScale * zoom;
    final mx = math.max(0.0, (bw - uw) / 2), my = math.max(0.0, (bh - uh) / 2);
    camX = camX.clamp(-mx, mx);
    camY = camY.clamp(-my, my);
    scale = fitScale * zoom;
    ox = _centerX + camX - _cx * scale;
    oy = _centerY + camY - _cy * scale;
  }

  /// The board's panel rectangle in screen pixels: (x, y, w, h).
  (double, double, double, double) panel() {
    final bw = _bw * scale, bh = _bh * scale;
    return (_centerX + camX - bw / 2 - 8, _centerY + camY - bh / 2 - 8, bw + 16, bh + 16);
  }

  void zoomAt(double factor, double px, double py) {
    if (!zoomable) return;
    final next = (zoom * factor).clamp(1.0, 8.0);
    final ratio = next / zoom;
    camX = px - _centerX - (px - _centerX - camX) * ratio;
    camY = py - _centerY - (py - _centerY - camY) * ratio;
    zoom = next;
    _applyCamera();
  }

  void panBy(double dx, double dy) {
    if (zoom <= 1) return;
    camX += dx;
    camY += dy;
    _applyCamera();
  }

  void fit() {
    zoom = 1;
    camX = 0;
    camY = 0;
    _applyCamera();
  }

  // ---------------------------------------------------------------- play

  Iterable<Motion> allMotions() sync* {
    for (final m in moves.values) {
      Motion? x = m;
      while (x != null) {
        yield x;
        x = x.queued;
      }
    }
  }

  void _prepareTraffic(Motion m) {
    m.traffic = [];
    for (final before in allMotions()) {
      if (before.i == m.i) continue;
      for (var index = m.path.length; index < m.route.length; index++) {
        final crossing = before.visits[_cellKey(m.route[index])];
        if (crossing != null) {
          m.traffic.add((before, (crossing + 1).toDouble(), math.max(0, index - m.path.length).toDouble()));
        }
      }
    }
  }

  double _motionLimit(Motion m, Map<int, double> positions) {
    var limit = m.distance;
    m.traffic = m.traffic.where((gate) {
      final (before, clear, stop) = gate;
      final tail = positions[before.serial];
      if (tail == null || tail >= clear) return false;
      limit = math.min(limit, stop);
      return true;
    }).toList();
    return limit;
  }

  Map<int, double> _positions() => {for (final m in allMotions()) m.serial: m.progress};

  List<int> _mirrorCrossings(List<Pt> route, int length) {
    final out = <int>[];
    for (var i = length; i < route.length; i++) {
      final p = route[i], before = route[i - 1];
      if (!geo.inside(p) || geo.mirror[geo.cell(p)] < 0) continue;
      final (oq, or) = geo.direction([before, p]);
      if (oq != p.q - before.q || or != p.r - before.r) out.add(i - length + 1);
    }
    return out;
  }

  /// Whether rope i accepts a tap now (not mid-flight, except a bouncing rope
  /// with nothing queued, which can queue its next move).
  bool tappable(int i) {
    final m = moves[i];
    return m == null || (m.event == evBounce && m.queued == null);
  }

  /// Tap rope i (a player tap unless `automatic`).
  void tap(int i, {bool automatic = false, bool solveFast = false}) {
    if (i < 0 || i >= paths.length || paths[i] == null || ended) return;
    var previous = moves[i];
    if (solveFast) {
      while (previous != null && previous.queued != null) {
        previous = previous.queued;
      }
    }
    if (!solveFast && previous != null && (previous.event != evBounce || previous.queued != null)) return;
    if (auto && !automatic) return;
    if (!automatic) {
      taps++;
      hint = -1;
    }
    final path = paths[i]!;
    final mv = geo.tap(paths, i);
    if (mv == null) {
      bump = i;
      bumpTime = 0.25;
      if (!automatic) sfx(Sfx.blocked, 0);
      return;
    }
    if (!automatic) history.add(Snapshot(paths, List<int>.of(plan), lost));
    if (bump == i) bump = -1;
    final route = List<Pt>.of(mv.route);
    var distance = mv.distance.toDouble();
    final reflections = _mirrorCrossings(route, path.length);
    var impactAt = -1.0;
    Pt? spring;
    if (mv.event == evExit) {
      final a = route[route.length - 1], b = route[route.length - 2];
      final dq = a.q - b.q, dr = a.r - b.r;
      final extra = (math.max(width, height) * 2.0 / scale).ceil() + 4;
      for (var n = 1; n <= extra; n++) {
        route.add(Pt(a.q + dq * n, a.r + dr * n));
      }
      distance += extra;
    } else if (mv.event == evBounce) {
      // Fold the route back over the rope's own body: the head enters the
      // spring cell, then slides back to the old tail at the incoming speed.
      spring = route.last;
      impactAt = distance;
      final l = path.length;
      for (var k = route.length - 2; k >= route.length - l; k--) {
        route.add(route[k]);
      }
      distance += l - 1;
    }
    final visits = <int, int>{};
    for (var k = 0; k < route.length; k++) {
      visits[_cellKey(route[k])] = k;
    }
    serial++;
    if (mv.event == evExit) clearNo++;
    final m = Motion(
      i: i,
      path: path,
      route: route,
      event: mv.event,
      finalPath: mv.paths[i],
      distance: distance,
      impactAt: impactAt,
      spring: spring,
      automatic: automatic,
      visits: visits,
      popNote: mv.event == evExit ? clearNo : 0,
      reflections: reflections,
      serial: serial,
    );
    _prepareTraffic(m);
    m.waiting = m.distance > 0 && _motionLimit(m, _positions()) == 0;
    if (previous != null) {
      previous.queued = m;
    } else {
      moves[i] = m;
    }
    _commit(m, mv.paths);
    if (!automatic && !solveFast) {
      activations[i] = 0.18;
      sfx(Sfx.activate, 0);
    }
  }

  void _commit(Motion m, List<Path?> next) {
    final wasLost = lost;
    final previousPlan = plan;
    paths = next;
    if (!m.automatic) {
      plan = previousPlan.isNotEmpty && previousPlan[0] == m.i ? previousPlan.sublist(1) : <int>[];
      lost = false;
      auto = board.allFree(geo, paths);
    }
    if (ropesLeft > 0) {
      var any = false;
      for (var k = 0; k < paths.length; k++) {
        if (paths[k] != null && geo.tap(paths, k) != null) {
          any = true;
          break;
        }
      }
      if (!any) lost = true;
    }
    if (!m.automatic && !auto && !lost && plan.isEmpty) {
      _seekPlan(previousPlan.where((k) => paths[k] != null).toList(), 900);
    }
    _refreshFrozen();
    if (lost && !wasLost) {
      sfx(Sfx.bump, 0);
      _say('Knotted. Undo or restart.');
    }
  }

  /// game-engine.js guide(): try the preferred order first, then a bounded
  /// search. Fast enough in Dart to run synchronously on a tap.
  void _seekPlan(List<int> prefer, int budget) {
    var current = paths;
    final out = <int>[];
    for (final i in prefer) {
      if (current[i] == null) continue;
      final mv = geo.tap(current, i);
      if (mv == null) break;
      out.add(i);
      current = mv.paths;
    }
    if (allGone(current)) {
      plan = out;
      return;
    }
    final s = board.solve(geo, paths, budget, prefer);
    if (s.solved == true) plan = s.moves;
  }

  void _refreshFrozen() {
    frozen = (!auto && plan.isEmpty) ? board.frozen(geo, paths) : <int>[];
  }

  bool get canUndo => undos > 0 && history.isNotEmpty && !auto && !ended;

  void undo() {
    if (!canUndo) return;
    final s = history.removeLast();
    paths = s.paths;
    plan = s.plan;
    lost = s.lost;
    moves.clear();
    activations.clear();
    bump = -1;
    undos--;
    taps++;
    hint = -1;
    _refreshFrozen();
    if (plan.isEmpty && !lost) _seekPlan(<int>[], 900);
    sfx(Sfx.undo, 0);
    _say('Undo · +1 tap');
  }

  bool get canHint => !auto && !ended && !lost;

  void showHint() {
    if (!canHint) return;
    if (plan.isEmpty) {
      _seekPlan(<int>[], 900);
      if (plan.isEmpty) {
        _say('No route found.');
        return;
      }
    }
    if (moves.containsKey(plan[0])) return;
    if (hint == plan[0] && hintTime > 0) {
      hintTime = 3;
      return;
    }
    hint = plan[0];
    hintTime = 3;
    taps += 2;
    sfx(Sfx.hint, 0);
    _say('Hint · +2 taps');
  }

  bool get canAutoSolve => !ended && !usedAuto && ropesLeft > 0;

  void autoSolve() {
    if (!canAutoSolve) return;
    var p = board.allFree(geo, paths)
        ? [for (var i = 0; i < paths.length; i++) if (paths[i] != null) i]
        : List<int>.of(plan);
    if (p.isEmpty || !board.replay(geo, p, paths).solved) {
      _seekPlan(<int>[], 5000);
      p = List<int>.of(plan);
      if (p.isEmpty) {
        _say('No route found.');
        return;
      }
    }
    usedAuto = true;
    hint = -1;
    _say('');
    for (final i in p) {
      if (paths[i] != null) tap(i, automatic: true, solveFast: true);
    }
    plan = [];
    auto = true;
    lost = false;
  }

  void _finish() {
    ended = true;
    stars = usedAuto ? 0 : (taps <= par ? 3 : (taps <= par + 2 ? 2 : 1));
    sfx(Sfx.win, stars);
    onFinish?.call(stars);
  }

  // ---------------------------------------------------------------- animation

  (double, double) _pointAt(List<Pt> route, double t) {
    final i = math.min(route.length - 2, t.floor());
    final f = t - i;
    final a = route[i], b = route[i + 1];
    return (a.q + (b.q - a.q) * f, a.r + (b.r - a.r) * f);
  }

  /// The rope's visible points in grid units (fractional while moving).
  List<(double, double)> visible(int i) {
    final m = moves[i];
    if (m != null) {
      final start = m.progress;
      final end = start + m.path.length - 1;
      final pts = <(double, double)>[_pointAt(m.route, start)];
      for (var k = start.floor() + 1; k < end; k++) {
        pts.add((m.route[k].q.toDouble(), m.route[k].r.toDouble()));
      }
      pts.add(_pointAt(m.route, end));
      return pts;
    }
    final p = paths[i];
    return p == null ? [] : [for (final c in p) (c.q.toDouble(), c.r.toDouble())];
  }

  bool _exitCleared(int i) {
    final margin = scale * 0.52;
    for (final (q, r) in visible(i)) {
      final s = screenAt(q, r);
      if (s.x > -margin && s.x < width + margin && s.y > -margin && s.y < height + margin) return false;
    }
    return true;
  }

  /// Advance the animation by dt seconds.
  void update(double dt) {
    clock += dt;
    if (noticeTime > 0) {
      noticeTime -= dt;
      if (noticeTime <= 0) notice = '';
    }
    if (hintTime > 0) {
      hintTime -= dt;
      if (hintTime <= 0) hint = -1;
    }
    if (bump >= 0) {
      bumpTime -= dt;
      if (bumpTime <= 0) bump = -1;
    }
    for (final id in activations.keys.toList()) {
      final r = activations[id]!;
      if (r <= dt) {
        activations.remove(id);
      } else {
        activations[id] = r - dt;
      }
    }
    final motionDt = dt * speedFactor;
    final pos = _positions();
    for (final id in moves.keys.toList()) {
      final m = moves[id];
      if (m == null) continue;
      // Half-speed departures keep the shared-path clearance readable.
      final travel = motionDt * (m.event == evExit ? 0.5 : 1.0);
      if (!m.impacted) m.speed = math.min(38.0, m.speed + travel * 100.0);
      final limit = _motionLimit(m, pos);
      final before = m.progress;
      final proposed = m.progress + m.speed * travel;
      m.progress = math.min(limit, proposed);
      m.waiting = limit < m.distance && proposed >= limit;
      if (!m.swished && m.progress > 0) {
        m.swished = true;
        sfx(Sfx.slide, 0);
      }
      if (m.waiting) m.speed = 0;
      while (m.nextReflection < m.reflections.length && m.progress >= m.reflections[m.nextReflection]) {
        sfx(Sfx.reflect, m.nextReflection);
        m.nextReflection++;
      }
      if (m.spring != null) {
        // The coil spins from the dot before the spring until the tail settles.
        final from = math.max(before, m.impactAt - 1), to = m.progress;
        if (to > from) {
          final key = _cellKey(m.spring!);
          springAngle[key] = (springAngle[key] ?? 0) + math.pi * (to - from) / (m.distance - m.impactAt + 1);
        }
        if (!m.impacted && m.progress >= m.impactAt) {
          m.impacted = true;
          if (m.impactAt == 0) m.speed = 38;
          sfx(Sfx.spring, 0);
        }
      }
      if (m.progress >= m.distance - 0.001 || (m.event == evExit && _exitCleared(id))) {
        if (m.queued != null) {
          moves[id] = m.queued!;
        } else {
          moves.remove(id);
        }
        if (m.event == evExit) {
          sfx(Sfx.pop, m.popNote);
        } else if (m.event != evBounce && (m.reflections.isEmpty || m.reflections.last.toDouble() != m.distance)) {
          sfx(Sfx.thud, 0);
        }
      }
    }
    if (!ended && ropesLeft == 0 && moves.isEmpty) {
      if (usedAuto) outro = math.min(1.0, outro + motionDt);
      if (!usedAuto || outro >= 1.0) _finish();
    } else if (auto && !ended) {
      for (var i = 0; i < paths.length; i++) {
        if (paths[i] != null && !moves.containsKey(i)) {
          tap(i, automatic: true);
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- input

  static double _segDistance(double px, double py, double ax, double ay, double bx, double by) {
    final dx = bx - ax, dy = by - ay;
    final len = dx * dx + dy * dy;
    final t = len == 0 ? 0.0 : (((px - ax) * dx + (py - ay) * dy) / len).clamp(0.0, 1.0);
    final ex = px - ax - dx * t, ey = py - ay - dy * t;
    return math.sqrt(ex * ex + ey * ey);
  }

  /// Unit vector of the rope's head in screen space.
  Vec headUnit(List<Vec> pts) {
    final a = pts[pts.length - 2], b = pts[pts.length - 1];
    final len = math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    return len == 0 ? const Vec(0, -1) : Vec((b.x - a.x) / len, (b.y - a.y) / len);
  }

  /// The rope under a screen point, or -1.
  int pick(double px, double py) {
    if (auto) return -1;
    var best = -1;
    var distance = math.max(scale * 0.43, 14.0);
    for (var i = 0; i < paths.length; i++) {
      if (paths[i] == null || !tappable(i)) continue;
      final pts = [for (final (q, r) in visible(i)) screenAt(q, r)];
      if (pts.length < 2) continue;
      final h = headUnit(pts);
      final tip = pts.last;
      pts.add(Vec(tip.x + h.x * scale * 0.35, tip.y + h.y * scale * 0.35));
      for (var j = 1; j < pts.length; j++) {
        final v = _segDistance(px, py, pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y);
        if (v < distance) {
          distance = v;
          best = i;
        }
      }
    }
    return best;
  }

  /// A player tap at a screen point. Returns the rope tapped, or -1.
  int pointer(double px, double py) {
    final i = pick(px, py);
    if (i >= 0) tap(i);
    return i;
  }

  /// Spinner rotation for drawing.
  double springRotation(Pt p) => springAngle[_cellKey(p)] ?? 0;
}
