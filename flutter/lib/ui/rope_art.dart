// rope-art.js in Flutter: a continuous braid that follows rounded bends (true
// circular fillets), matching arrowheads, and reduced detail at small sizes.
// Geometry is computed in rope units (one rope width = 1) and cached for ropes
// at rest.
import 'dart:collection';
import 'dart:math' as math;
import 'dart:ui';

import '../game/curve.dart';

Color shade(Color c, double amount) {
  int ch(double x) {
    final v = amount < 0 ? x * (1 + amount) : x + (255 - x) * amount;
    return v.round().clamp(0, 255);
  }

  return Color.fromARGB(255, ch(c.r * 255), ch(c.g * 255), ch(c.b * 255));
}

/// The drawn centerline: game/curve.dart's fillets, as a Path for painting.
class RopeCurve {
  final Path line;
  final Curve _curve;
  RopeCurve._(this.line, this._curve);

  double get length => _curve.length;

  /// The point `s` along the centerline, offset `normal` to its left.
  Offset at(double s, [double normal = 0]) {
    final (x, y) = _curve.at(s, normal);
    return Offset(x, y);
  }

  static RopeCurve of(List<Offset> input) {
    final curve = Curve.rounded([for (final p in input) (p.dx, p.dy)]);
    final line = Path()..moveTo(curve.x0, curve.y0);
    for (final s in curve.segments) {
      final n = s.end - s.start;
      if (s.isArc) {
        line.arcTo(Rect.fromCircle(center: Offset(s.cx, s.cy), radius: s.radius), s.angle, s.sign * n / s.radius, false);
      } else {
        line.lineTo(s.ax + s.dx * n, s.ay + s.dy * n);
      }
    }
    return RopeCurve._(line, curve);
  }
}

void _polygon(Path path, List<Offset> pts) {
  path.moveTo(pts[0].dx, pts[0].dy);
  for (var i = 1; i < pts.length; i++) {
    path.lineTo(pts[i].dx, pts[i].dy);
  }
  path.close();
}

/// The braid stitches: three paths (base, highlight tracer, shadow tracer).
List<Path> _weave(Offset Function(double, double) at, double length, int detail,
    {double offset = 0, bool head = false}) {
  final paths = [Path(), Path(), Path()];
  if (detail == 0) return paths;
  final rows = detail == 2 ? 4 : 2;
  final pitch = detail == 2 ? .5 : .85;
  final lane = 1 / rows;
  final from = head ? -.4 : 0.0, to = head ? 1.15 : length;
  for (var col = ((from + offset) / pitch).floor() - 1; col <= ((to + offset) / pitch).ceil() + 1; col++) {
    for (var row = head ? -rows ~/ 2 : 0; row < (head ? (rows * 1.5).toInt() : rows); row++) {
      final n = (row - (rows - 1) / 2) * lane;
      final odd = row % 2 != 0;
      final sign = odd ? -1 : 1;
      final s = col * pitch - offset + (odd ? pitch / 2 : 0), half = pitch * .38, skew = pitch * .18 * sign;
      final tracer = ((col + row * 2) % 10 + 10) % 10;
      final group = detail == 2 && tracer < 2 ? tracer + 1 : 0;
      final lo = math.max(from, s - half), hi = math.min(to, s + half);
      if (lo >= hi) continue;
      _polygon(paths[group], [
        at(lo - skew, n - lane * .43),
        at(hi - skew, n - lane * .43),
        at(hi + skew, n + lane * .43),
        at(lo + skew, n + lane * .43),
      ]);
    }
  }
  return paths;
}

class _Geometry {
  final RopeCurve body;
  final List<Path> braid;
  final List<Path> head;
  _Geometry(this.body, this.braid, this.head);
}

final LinkedHashMap<String, _Geometry> _cache = LinkedHashMap();

_Geometry _geometry(List<Offset> points, double width, int detail, bool moving) {
  final origin = points[0];
  final normalized = [for (final p in points) Offset((p.dx - origin.dx) / width, (p.dy - origin.dy) / width)];
  String? key;
  if (!moving) {
    final sb = StringBuffer('$detail/');
    for (final p in normalized) {
      sb
        ..write(p.dx.toStringAsFixed(3))
        ..write(',')
        ..write(p.dy.toStringAsFixed(3))
        ..write(';');
    }
    key = sb.toString();
    final hit = _cache.remove(key);
    if (hit != null) {
      _cache[key] = hit;
      return hit;
    }
  }
  final body = RopeCurve.of(normalized);
  final g = _Geometry(body, _weave(body.at, body.length, detail),
      _weave((x, y) => Offset(x, y), 0, detail, offset: body.length, head: true));
  if (key != null) {
    _cache[key] = g;
    if (_cache.length > 400) _cache.remove(_cache.keys.first);
  }
  return g;
}

void _ink(Canvas canvas, List<Path> paths, Color color) {
  final fills = [shade(color, .12), shade(color, .38), shade(color, -.35)];
  for (var i = 0; i < 3; i++) {
    canvas.drawPath(paths[i], Paint()..color = fills[i]);
  }
}

/// A braided rope through `points` (screen pixels), `width` pixels wide, with an
/// arrowhead along `head` (a unit vector) at the last point.
void drawRope(Canvas canvas, List<Offset> points, double width, Color color, Offset? head,
    {bool moving = false, double alpha = 1}) {
  if (points.length < 2) return;
  final detail = width < 7 ? 0 : (width < 14 ? 1 : 2);
  final g = _geometry(points, width, detail, moving);
  final origin = points[0];
  canvas.save();
  canvas.translate(origin.dx, origin.dy);
  canvas.scale(width, width);
  final stroke = Paint()
    ..style = PaintingStyle.stroke
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;
  canvas.drawPath(g.body.line, stroke..color = shade(color, -.55)..strokeWidth = 1.15);
  canvas.drawPath(g.body.line, stroke..color = shade(color, -.12)..strokeWidth = 1);
  _ink(canvas, g.braid, color);
  canvas.drawPath(g.body.line, stroke..color = const Color(0x20ffffff)..strokeWidth = .28);
  canvas.restore();
  if (head == null) return;
  final tip = points.last;
  final triangle = Path();
  _polygon(triangle, const [Offset(-.3, -.77), Offset(1.1, 0), Offset(-.3, .77)]);
  canvas.save();
  canvas.translate(tip.dx, tip.dy);
  canvas.rotate(math.atan2(head.dy, head.dx));
  canvas.scale(width, width);
  canvas.drawPath(triangle, Paint()..color = shade(color, -.12));
  canvas.save();
  canvas.clipPath(triangle);
  _ink(canvas, g.head, color);
  canvas.restore();
  final volume = Paint()
    ..shader = Gradient.linear(const Offset(0, -.8), const Offset(0, .8),
        const [Color(0x25000000), Color(0x22ffffff), Color(0x30000000)], const [0, .45, 1]);
  canvas.drawPath(triangle, volume);
  final wing = Path()
    ..moveTo(-.3, -.49)
    ..lineTo(-.3, -.77)
    ..lineTo(1.1, 0)
    ..lineTo(-.3, .77)
    ..lineTo(-.3, .49);
  canvas.drawPath(
      wing,
      Paint()
        ..style = PaintingStyle.stroke
        ..color = shade(color, -.55)
        ..strokeWidth = .13
        ..strokeJoin = StrokeJoin.round);
  canvas.restore();
}

/// A plain stroke along the rope's centerline (glows, flashes, waiting halos).
void strokeRope(Canvas canvas, List<Offset> points, double width, double strokeWidth, Color color,
    {bool moving = false, MaskFilter? blur}) {
  if (points.length < 2) return;
  final g = _geometry(points, width, 0, moving);
  canvas.save();
  canvas.translate(points[0].dx, points[0].dy);
  canvas.scale(width, width);
  canvas.drawPath(
      g.body.line,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color
        ..strokeWidth = strokeWidth / width
        ..maskFilter = blur);
  canvas.restore();
}
