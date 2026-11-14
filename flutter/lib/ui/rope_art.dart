// rope-art.js in Flutter: a continuous braid that follows rounded bends (true
// circular fillets), matching arrowheads, and reduced detail at small sizes.
// Geometry is computed in rope units (one rope width = 1) and cached for ropes
// at rest.
import 'dart:collection';
import 'dart:math' as math;
import 'dart:ui';

Color shade(Color c, double amount) {
  int ch(double x) {
    final v = amount < 0 ? x * (1 + amount) : x + (255 - x) * amount;
    return v.round().clamp(0, 255);
  }

  return Color.fromARGB(255, ch(c.r * 255), ch(c.g * 255), ch(c.b * 255));
}

class _Seg {
  // Straight: a + along * dir. Arc: center, radius, start angle, sign.
  final Offset? a;
  final double dx, dy;
  final Offset? center;
  final double radius, angle, sign;
  final double start, end;
  _Seg.line(this.a, this.dx, this.dy, this.start, this.end)
      : center = null,
        radius = 0,
        angle = 0,
        sign = 0;
  _Seg.arc(this.center, this.radius, this.angle, this.sign, this.start, this.end)
      : a = null,
        dx = 0,
        dy = 0;
}

class RopeCurve {
  final Path line;
  final double length;
  final List<_Seg> _segs;
  final Offset _first;
  RopeCurve._(this.line, this.length, this._segs, this._first);

  /// The point `s` along the centerline, offset `normal` to its left.
  Offset at(double s, [double normal = 0]) {
    if (_segs.isEmpty) return _first;
    var lo = 0, hi = _segs.length - 1;
    while (lo < hi) {
      final mid = (lo + hi) >> 1;
      if (_segs[mid].end < s) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    final p = _segs[lo];
    final along = s - p.start;
    if (p.center == null) {
      return Offset(p.a!.dx + along * p.dx - normal * p.dy, p.a!.dy + along * p.dy + normal * p.dx);
    }
    final angle = p.angle + p.sign * along / p.radius;
    final radius = p.radius - p.sign * normal;
    return Offset(p.center!.dx + radius * math.cos(angle), p.center!.dy + radius * math.sin(angle));
  }

  static RopeCurve of(List<Offset> input) {
    final points = <Offset>[];
    for (var i = 0; i < input.length; i++) {
      if (i == 0 || (input[i] - input[i - 1]).distance > .0001) points.add(input[i]);
    }
    final segs = <_Seg>[];
    final line = Path();
    var length = 0.0;
    var end = points[0];
    line.moveTo(end.dx, end.dy);
    void straight(Offset b) {
      final n = (b - end).distance;
      if (n > .0001) {
        segs.add(_Seg.line(end, (b.dx - end.dx) / n, (b.dy - end.dy) / n, length, length + n));
        length += n;
        line.lineTo(b.dx, b.dy);
      }
      end = b;
    }

    for (var i = 1; i < points.length - 1; i++) {
      final a = points[i - 1], b = points[i], c = points[i + 1];
      final before = (b - a).distance, after = (c - b).distance;
      final ux = (b.dx - a.dx) / before, uy = (b.dy - a.dy) / before;
      final vx = (c.dx - b.dx) / after, vy = (c.dy - b.dy) / after;
      final turn = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      if (turn.abs() < .001) continue;
      if (turn.abs() > math.pi - .001) {
        straight(b);
        continue;
      }
      final tangent = math.tan(turn.abs() / 2);
      final cut = math.min(.7 * tangent, math.min(before * .48, after * .48));
      final radius = cut / tangent;
      final sign = turn.sign;
      final entry = Offset(b.dx - ux * cut, b.dy - uy * cut), exit = Offset(b.dx + vx * cut, b.dy + vy * cut);
      straight(entry);
      final center = Offset(entry.dx - uy * sign * radius, entry.dy + ux * sign * radius);
      final angle = math.atan2(entry.dy - center.dy, entry.dx - center.dx);
      final n = radius * turn.abs();
      segs.add(_Seg.arc(center, radius, angle, sign, length, length + n));
      length += n;
      line.arcTo(Rect.fromCircle(center: center, radius: radius), angle, turn, false);
      end = exit;
    }
    straight(points.last);
    return RopeCurve._(line, length, segs, points[0]);
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
