// rope-art.js curve(), polyline() and trace(): a rope's centerline with true
// circular fillets at bends (or straight corners for Tiles), parametrized by
// length. Pure Dart, so the game layer can time and fold spring reflections
// along exactly the line the painter draws.
import 'dart:math' as math;

/// One piece of a centerline: a straight run, or an arc when [radius] > 0.
class CurveSegment {
  // Straight: (ax, ay) + along * (dx, dy).
  final double ax, ay, dx, dy;
  // Arc: center (cx, cy), radius, start angle, and the turn's sign.
  final double cx, cy, radius, angle, sign;
  final double start, end;
  const CurveSegment.line(this.ax, this.ay, this.dx, this.dy, this.start, this.end)
      : cx = 0,
        cy = 0,
        radius = 0,
        angle = 0,
        sign = 0;
  const CurveSegment.arc(this.cx, this.cy, this.radius, this.angle, this.sign, this.start, this.end)
      : ax = 0,
        ay = 0,
        dx = 0,
        dy = 0;
  bool get isArc => radius > 0;
}

class Curve {
  final List<CurveSegment> segments;
  final double length;
  final double x0, y0;

  /// Lengths at the polyline's corners (Tiles only).
  final List<double>? breaks;
  const Curve._(this.segments, this.length, this.x0, this.y0, [this.breaks]);

  /// The point [s] along the line, offset [normal] to its left.
  (double, double) at(double s, [double normal = 0]) {
    if (segments.isEmpty) return (x0, y0);
    var lo = 0, hi = segments.length - 1;
    while (lo < hi) {
      final mid = (lo + hi) >> 1;
      if (segments[mid].end < s) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    final p = segments[lo];
    final along = s - p.start;
    if (!p.isArc) return (p.ax + along * p.dx - normal * p.dy, p.ay + along * p.dy + normal * p.dx);
    final angle = p.angle + p.sign * along / p.radius;
    final radius = p.radius - p.sign * normal;
    return (p.cx + radius * math.cos(angle), p.cy + radius * math.sin(angle));
  }

  static List<(double, double)> _distinct(List<(double, double)> input) {
    final out = <(double, double)>[];
    for (final p in input) {
      if (out.isEmpty || _dist(p, out.last) > .0001) out.add(p);
    }
    return out;
  }

  static double _dist((double, double) a, (double, double) b) {
    final dx = b.$1 - a.$1, dy = b.$2 - a.$2;
    return math.sqrt(dx * dx + dy * dy);
  }

  /// curve(): bends become circular fillets of the same radius on both grids.
  /// Points are in rope widths.
  static Curve rounded(List<(double, double)> input) {
    final points = _distinct(input);
    final segments = <CurveSegment>[];
    var length = 0.0;
    var end = points[0];
    void straight((double, double) b) {
      final n = _dist(end, b);
      if (n > .0001) {
        segments.add(CurveSegment.line(end.$1, end.$2, (b.$1 - end.$1) / n, (b.$2 - end.$2) / n, length, length + n));
        length += n;
      }
      end = b;
    }

    for (var i = 1; i < points.length - 1; i++) {
      final a = points[i - 1], b = points[i], c = points[i + 1];
      final before = _dist(a, b), after = _dist(b, c);
      final ux = (b.$1 - a.$1) / before, uy = (b.$2 - a.$2) / before;
      final vx = (c.$1 - b.$1) / after, vy = (c.$2 - b.$2) / after;
      final turn = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      if (turn.abs() < .001) continue;
      if (turn.abs() > math.pi - .001) {
        straight(b);
        continue;
      }
      // Short endpoint segments constrain the radius without overshooting them.
      final tangent = math.tan(turn.abs() / 2);
      final cut = math.min(.7 * tangent, math.min(before * .48, after * .48));
      final radius = cut / tangent, sign = turn.sign;
      final entry = (b.$1 - ux * cut, b.$2 - uy * cut), exit = (b.$1 + vx * cut, b.$2 + vy * cut);
      straight(entry);
      final cx = entry.$1 - uy * sign * radius, cy = entry.$2 + ux * sign * radius;
      final angle = math.atan2(entry.$2 - cy, entry.$1 - cx);
      final n = radius * turn.abs();
      segments.add(CurveSegment.arc(cx, cy, radius, angle, sign, length, length + n));
      length += n;
      end = exit;
    }
    straight(points.last);
    return Curve._(segments, length, points[0].$1, points[0].$2);
  }

  /// polyline(): straight runs between the points (the Tiles style).
  static Curve polyline(List<(double, double)> input) {
    final points = _distinct(input);
    final segments = <CurveSegment>[];
    final breaks = <double>[0];
    var length = 0.0;
    for (var i = 1; i < points.length; i++) {
      final a = points[i - 1], b = points[i], n = _dist(a, b);
      segments.add(CurveSegment.line(a.$1, a.$2, (b.$1 - a.$1) / n, (b.$2 - a.$2) / n, length, length + n));
      length += n;
      breaks.add(length);
    }
    return Curve._(segments, length, points[0].$1, points[0].$2, breaks);
  }
}

/// trace(): the drawn centerline of screen points [points] for a rope [width]
/// pixels wide, sampled in pixels.
class Trace {
  final Curve _body;
  final double _x, _y, _width;
  Trace._(this._body, this._x, this._y, this._width);

  factory Trace(List<(double, double)> points, double width, {bool tiles = false}) {
    final (x, y) = points[0];
    final normalized = [for (final (px, py) in points) ((px - x) / width, (py - y) / width)];
    return Trace._(tiles ? Curve.polyline(normalized) : Curve.rounded(normalized), x, y, width);
  }

  double get length => _body.length * _width;
  List<double>? get breaks => _body.breaks?.map((s) => s * _width).toList();

  (double, double) at(double s, [double normal = 0]) {
    final (px, py) = _body.at(s / _width, normal / _width);
    return (_x + px * _width, _y + py * _width);
  }
}
