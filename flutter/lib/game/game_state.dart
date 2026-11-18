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
import 'curve.dart';

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
  final Pt? spring; // the spring a bounce reflects from
  // A bounce's head enters the spring cell, then the rope folds back over its
  // own drawn line for bounceDuration seconds (hold counts down). rotation is
  // the spinner's resting angle when the approach began.
  double hold = 0, bounceDuration = 0, bounceLength = 0;
  double? rotation;
  Trace? springTrace;
  String springTraceKey = '';
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

/// What the painter draws for a rope: screen points, the arrowhead's unit
/// direction, and where a reflecting rope folds back over itself (or -1).
class RopeDrawing {
  final List<Vec> points;
  final Vec head;
  final int foldIndex;
  const RopeDrawing(this.points, this.head, [this.foldIndex = -1]);
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
  // Spinner angles by cell: each bounce turns its spinner half a turn.
  final Map<int, double> springRotations = {};
  // Mirrors and springs no rope can reach any more fade out (by cell).
  final Map<int, double> _featureAlpha = {};
  Set<int> _liveFeatures = {};
  bool _featuresDirty = true;
  bool fading = false;
  String graphics = 'rope';
  bool get tiles => graphics == 'tiles';
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
    springRotations.clear();
    _resetFeatures();
    _say('');
  }

  void _resetFeatures() {
    _featureAlpha.clear();
    for (final m in board.mirrors) {
      _featureAlpha[geo.cell(m.cell)] = 1;
    }
    for (final p in board.springs) {
      _featureAlpha[geo.cell(p)] = 1;
    }
    _liveFeatures = _featureAlpha.keys.toSet();
    _featuresDirty = true;
    fading = false;
  }

  /// A mirror's or spring's opacity: 0 once no rope can reach it.
  double featureOpacity(Pt p) => geo.inside(p) ? _featureAlpha[geo.cell(p)] ?? 1 : 1;

  /// A feature stays while a cord occupies it or any queued animation will pass
  /// through it, even when the logical board has already moved past that move.
  void _updateFeatures(double dt) {
    fading = false;
    if (_featureAlpha.isEmpty) return;
    if (_featuresDirty) {
      _featuresDirty = false;
      _liveFeatures = allGone(paths) ? <int>{} : reachableFeatures(geo, paths, 10000);
    }
    final live = Set<int>.of(_liveFeatures);
    void keep(Pt p) {
      if (geo.inside(p)) live.add(geo.cell(p));
    }

    for (final path in paths) {
      path?.forEach(keep);
    }
    for (final m in allMotions()) {
      for (var k = m.progress.floor(); k < m.route.length; k++) {
        keep(m.route[k]);
      }
    }
    for (final key in _featureAlpha.keys.toList()) {
      final alpha = _featureAlpha[key]!, target = live.contains(key) ? 1.0 : 0.0;
      final next = alpha + (target - alpha).sign * math.min((target - alpha).abs(), dt);
      _featureAlpha[key] = next;
      if (next != target) fading = true;
    }
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
  /// makes it larger (as app.js does). Zoom and pan carry over, constrained to
  /// the new view; a board that no longer zooms returns to fit.
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
    if (!zoomable) {
      zoom = 1;
      camX = 0;
      camY = 0;
    }
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
    _tween = null;
    final next = (zoom * factor).clamp(1.0, 8.0);
    final ratio = next / zoom;
    camX = px - _centerX - (px - _centerX - camX) * ratio;
    camY = py - _centerY - (py - _centerY - camY) * ratio;
    zoom = next;
    _applyCamera();
  }

  void panBy(double dx, double dy) {
    if (zoom <= 1) return;
    _tween = null;
    camX += dx;
    camY += dy;
    _applyCamera();
  }

  // Fit eases the camera back over .22 s (ease-out cubic), as on the web.
  (double, double, double, double)? _tween; // from zoom, x, y; elapsed 0..1
  bool get cameraMoving => _tween != null;

  void fit() => _tween = (zoom, camX, camY, 0);

  void _stepCamera(double dt) {
    final t = _tween;
    if (t == null) return;
    final (z, x, y, time) = t;
    final now = math.min(1.0, time + dt / .22), ease = 1 - math.pow(1 - now, 3);
    zoom = z + (1 - z) * ease;
    camX = x * (1 - ease);
    camY = y * (1 - ease);
    _tween = now < 1 ? (z, x, y, now) : null;
    _applyCamera();
  }

  /// Bring a rope's head into view when zoomed in: near an edge or under the
  /// controls, the camera centers it.
  void _focus(int i) {
    final path = paths[i];
    if (path == null) return;
    final p = screen(path.last), pad = math.min(48.0, math.min(width / 4, height / 4));
    if (p.x < math.max(pad, padLeft) ||
        p.x > width - math.max(pad, padRight) ||
        p.y < math.max(pad, padTop) ||
        p.y > height - math.max(pad, padBottom)) {
      _tween = null;
      camX += _centerX - p.x;
      camY += _centerY - p.y;
      _applyCamera();
    }
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

  /// The turn a mirror at route[index] gives the rope: (incoming, outgoing).
  ((int, int), (int, int))? _mirrorTurn(List<Pt> route, int index) {
    if (index < 1 || index >= route.length) return null;
    final p = route[index], before = route[index - 1];
    if (!geo.inside(p) || geo.mirror[geo.cell(p)] < 0) return null;
    final incoming = (p.q - before.q, p.r - before.r), outgoing = geo.direction([before, p]);
    return incoming == outgoing ? null : (incoming, outgoing);
  }

  List<int> _mirrorCrossings(List<Pt> route, int length) {
    // A head already resting on a mirror has reflected on its previous move.
    return [
      for (var i = length; i < route.length; i++)
        if (_mirrorTurn(route, i) != null) i - length + 1,
    ];
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
      spring = route.last;
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
      spring: spring,
      automatic: automatic,
      visits: visits,
      popNote: mv.event == evExit ? clearNo : 0,
      reflections: reflections,
      serial: serial,
    );
    if (spring != null) {
      final settled = [for (final c in route.sublist(route.length - path.length)) screen(c)];
      m.hold = m.bounceDuration = 1;
      m.bounceLength = Trace([for (final v in settled) (v.x, v.y)], scale * .4, tiles: tiles).length / scale;
    }
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
    _featuresDirty = true;
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
    springRotations.clear();
    _resetFeatures();
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
      _focus(hint);
      return;
    }
    hint = plan[0];
    hintTime = 3;
    _focus(hint);
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
    _stepCamera(dt);
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
    // Use the earlier frame's tail positions, so a follower cannot cut through
    // a crossing that its predecessor is still clearing during this frame.
    final pos = _positions();
    for (final id in moves.keys.toList()) {
      final m = moves[id];
      if (m == null) continue;
      // Half-speed departures keep the shared-path clearance readable.
      final travel = motionDt * (m.event == evExit ? 0.5 : 1.0);
      if (!m.impacted) m.speed = math.min(38.0, m.speed + travel * 100.0);
      final limit = _motionLimit(m, pos);
      final proposed = m.progress + m.speed * travel;
      m.progress = math.min(limit, proposed);
      m.waiting = limit < m.distance && proposed >= limit;
      if (!m.swished && m.progress > 0) {
        m.swished = true;
        sfx(Sfx.slide, 0);
      }
      if (m.waiting) m.speed = 0;
      if (m.spring != null && m.progress >= m.distance - 1) {
        m.rotation ??= springRotations[geo.cell(m.spring!)] ?? 0;
      }
      while (m.nextReflection < m.reflections.length && m.progress >= m.reflections[m.nextReflection]) {
        sfx(Sfx.reflect, m.nextReflection);
        m.nextReflection++;
      }
      if (m.progress < m.distance - 0.001 && !(m.event == evExit && _exitCleared(id))) continue;
      var remaining = motionDt;
      if (m.event == evBounce && !m.impacted) {
        m.progress = m.distance;
        final from = ropeDrawing(id)!;
        final track = Trace([for (final v in from.points) (v.x, v.y)], scale * .4, tiles: tiles);
        // Carry the incoming velocity through the reflection. An already
        // adjacent rope starts its return at the normal cruising speed.
        final speed = m.distance > 0 ? m.speed : 38.0;
        m.speed = speed;
        m.hold = m.bounceDuration = track.length / scale / speed;
        remaining = m.distance > 0 ? math.max(0, (proposed - m.distance) / speed) : motionDt;
        m.rotation ??= springRotations[geo.cell(m.spring!)] ?? 0;
        m.impacted = true;
        sfx(Sfx.spring, 0);
      }
      m.hold -= remaining;
      if (m.hold > 0) continue;
      if (m.spring != null) springRotations[geo.cell(m.spring!)] = (m.rotation ?? 0) + math.pi;
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
    _updateFeatures(motionDt);
    if (!ended && ropesLeft == 0 && moves.isEmpty) {
      // After auto-solve the empty grid fades for a second (at normal speed);
      // either way, the result waits for cleared features to fade.
      if (usedAuto) outro = math.min(1.0, outro + motionDt);
      if (!fading && (!usedAuto || outro >= 1.0)) _finish();
    } else if (auto && !ended) {
      for (var i = 0; i < paths.length; i++) {
        if (paths[i] != null && !moves.containsKey(i)) {
          tap(i, automatic: true);
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- drawing

  /// The rope as drawn: screen points and its arrowhead direction. A head on a
  /// mirror turns with the bend and leads out of it, so the arrow's neck
  /// follows the reflected cord; [settled] gives a moving rope's final pose.
  RopeDrawing? ropeDrawing(int i, {bool settled = false}) {
    final m = moves[i];
    final moving = settled ? null : m;
    final Path? cells = settled ? (m?.finalPath ?? paths[i]) : (m == null ? paths[i] : null);
    if (moving == null && (cells == null || cells.length < 2)) return null;
    final points = moving != null
        ? [for (final (q, r) in visible(i)) screenAt(q, r)]
        : [for (final c in cells!) screen(c)];
    final tip = points.last;
    final route = moving?.route ?? cells!;
    final end = moving != null ? moving.progress + moving.path.length - 1 : (cells!.length - 1).toDouble();
    final Vec previous;
    if (moving != null) {
      final (q, r) = _pointAt(route, end - .001);
      previous = screenAt(q, r);
    } else {
      final (dq, dr) = geo.direction(cells!);
      previous = screenAt((cells.last.q - dq).toDouble(), (cells.last.r - dr).toDouble());
    }
    var length = math.sqrt(math.pow(tip.x - previous.x, 2) + math.pow(tip.y - previous.y, 2));
    if (length == 0) length = 1;
    var head = Vec((tip.x - previous.x) / length, (tip.y - previous.y) / length);
    final index = end.round(), turn = _mirrorTurn(route, index), proximity = (end - index).abs();
    if (turn != null && proximity < .5) {
      final ((iq, ir), (oq, or)) = turn;
      final at = route[index], center = screen(at);
      final a = screenAt((at.q + iq).toDouble(), (at.r + ir).toDouble());
      final b = screenAt((at.q + oq).toDouble(), (at.r + or).toDouble());
      final ax = a.x - center.x, ay = a.y - center.y, bx = b.x - center.x, by = b.y - center.y;
      final t = ((end - index + .35) / .35).clamp(0.0, 1.0), ease = t * t * (3 - 2 * t);
      final angle = math.atan2(ay, ax) + math.atan2(ax * by - ay * bx, ax * bx + ay * by) * ease;
      head = Vec(math.cos(angle), math.sin(angle));
      // Lead the arrow out of the bend so its neck follows the reflected cord.
      // The lead fades on either side, keeping stopped and moving poses continuous.
      final next = Pt(at.q + oq, at.r + or);
      var clearance = .26;
      for (var j = 0; j < paths.length; j++) {
        final p = paths[j];
        if (j == i || p == null || p.last != next) continue;
        final (nq, nr) = geo.direction(p);
        final from = screen(next), toward = screenAt((next.q + nq).toDouble(), (next.r + nr).toDouble());
        final nx = toward.x - from.x, ny = toward.y - from.y;
        // Leave room for the arrowhead of a facing neighbor, not just its cord.
        if ((nx * bx + ny * by) / (math.sqrt(nx * nx + ny * ny) * math.sqrt(bx * bx + by * by)) < .51) clearance = .03;
        break;
      }
      final lead = scale * clearance * (1 - proximity / .5);
      points.add(Vec(tip.x + head.x * lead, tip.y + head.y * lead));
    }
    return RopeDrawing(points, head);
  }

  /// How far a bounce has folded back over itself (0..1), or null.
  double? springTurn(Motion? m) {
    if (m == null || !m.impacted || m.bounceDuration == 0) return null;
    return (1 - m.hold / m.bounceDuration).clamp(0.0, 1.0);
  }

  /// The spin a bounce gives its spinner: half a turn from the dot before the
  /// spring until the rope has folded back.
  double springSpin(Motion? m) {
    if (m == null) return 0;
    final approach = (m.progress - (m.distance - 1)).clamp(0.0, 1.0);
    final returned = (springTurn(m) ?? 0) * m.bounceLength;
    return math.pi * (approach + returned) / (1 + m.bounceLength);
  }

  /// A reflecting rope: its drawn line folds back on itself at the spring, the
  /// returning strand on top, while the arrowhead turns around.
  RopeDrawing? _springDrawing(int i, double turn) {
    final from = ropeDrawing(i), to = ropeDrawing(i, settled: true);
    if (from == null || to == null) return from ?? to;
    if (turn <= 0) return from;
    if (turn >= 1) return to;
    final m = moves[i]!, s = scale;
    final key = '$ox,$oy,$s,$rotated,$graphics';
    if (m.springTraceKey != key) {
      m.springTraceKey = key;
      m.springTrace = Trace([for (final v in from.points) (v.x, v.y)], s * .4, tiles: tiles);
    }
    final track = m.springTrace!, length = track.length, progress = length * turn;
    // A 180-degree turn folds the route directly back onto itself. Include the
    // reflection point exactly; the returning head is painted after the body.
    (double, double) at(double d) => track.at(d <= length ? d : 2 * length - d);
    final count = math.max(2, (length / (s * .12)).ceil());
    final samples = <double>[progress, progress + length];
    for (var n = 1; n < count; n++) {
      samples.add(progress + length * n / count);
    }
    if (progress > 0 && progress < length) samples.add(length);
    for (final anchor in track.breaks ?? const <double>[]) {
      for (final d in [anchor, 2 * length - anchor]) {
        if (d > progress && d < progress + length) samples.add(d);
      }
    }
    samples.sort();
    final points = <Vec>[];
    for (final d in samples) {
      final (x, y) = at(d);
      points.add(Vec(x, y));
    }
    final tip = points.last;
    final (bx, by) = track.at(length - progress + .01);
    var angle = math.atan2(tip.y - by, tip.x - bx);
    if (turn < .08) {
      final e = turn / .08;
      angle = math.atan2(from.head.y, from.head.x) + math.pi * e * e * (3 - 2 * e);
    }
    return RopeDrawing(points, Vec(math.cos(angle), math.sin(angle)), samples.indexOf(length));
  }

  /// The rope as it appears this frame, including a fold at a spring.
  RopeDrawing? drawing(int i) {
    final turn = springTurn(moves[i]);
    return turn != null ? _springDrawing(i, turn) : ropeDrawing(i);
  }

  // ---------------------------------------------------------------- input

  static double _segDistance(double px, double py, double ax, double ay, double bx, double by) {
    final dx = bx - ax, dy = by - ay;
    final len = dx * dx + dy * dy;
    final t = len == 0 ? 0.0 : (((px - ax) * dx + (py - ay) * dy) / len).clamp(0.0, 1.0);
    final ex = px - ax - dx * t, ey = py - ay - dy * t;
    return math.sqrt(ex * ex + ey * ey);
  }

  /// The rope under a screen point, or -1.
  int pick(double px, double py) {
    if (auto) return -1;
    var best = -1;
    var distance = math.max(scale * 0.43, 14.0);
    for (var i = 0; i < paths.length; i++) {
      if (paths[i] == null || !tappable(i)) continue;
      final d = drawing(i);
      if (d == null) continue;
      final tip = d.points.last;
      final pts = [...d.points, Vec(tip.x + d.head.x * scale * 0.35, tip.y + d.head.y * scale * 0.35)];
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

  /// A spinner's angle: its resting turn plus the spin of a rope bouncing on it.
  double springRotation(Pt p) {
    Motion? active;
    for (final m in moves.values) {
      if (m.spring == p) {
        active = m;
        break;
      }
    }
    return (active?.rotation ?? springRotations[geo.cell(p)] ?? 0) + springSpin(active);
  }
}
