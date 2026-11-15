// The web Tiles style: one translucent silhouette, with clipped bevels and a
// joined arrow neck. All coordinates below are measured in strand widths.
import 'dart:math' as math;
import 'dart:ui';

import 'rope_art.dart' show shade;

class _Line {
  final List<Offset> points;
  final List<Offset> directions = [];
  final List<double> breaks = [0];
  _Line(List<Offset> input) : points = [] {
    for (final p in input) {
      if (points.isEmpty || (p - points.last).distance > .0001) points.add(p);
    }
    for (var i = 1; i < points.length; i++) {
      final delta = points[i] - points[i - 1], length = delta.distance;
      directions.add(delta / length);
      breaks.add(breaks.last + length);
    }
  }
  double get length => breaks.last;
  Offset at(double distance) {
    if (directions.isEmpty) return points.first;
    var i = 0;
    while (i < directions.length - 1 && breaks[i + 1] < distance) {
      i++;
    }
    return points[i] + directions[i] * (distance - breaks[i]);
  }
}

final _cache = <String, Path>{};

Path _outline(List<Offset> points, double width, Offset? head, bool moving) {
  final origin = points.first;
  final normalized = [for (final p in points) (p - origin) / width];
  final key =
      '${head?.dx.toStringAsFixed(3)},${head?.dy.toStringAsFixed(3)}/'
      '${normalized.map((p) => '${p.dx.toStringAsFixed(3)},${p.dy.toStringAsFixed(3)}').join(';')}';
  if (!moving) {
    final hit = _cache.remove(key);
    if (hit != null) {
      _cache[key] = hit;
      return hit;
    }
  }
  final line = _Line(normalized);
  var body = line;
  final arrow = <Offset>[];
  if (head != null) {
    final back = math.min(.3, line.length), end = line.length - back;
    final shaft = [
      for (var i = 0; i < line.points.length; i++)
        if (line.breaks[i] < end) line.points[i],
      line.at(end),
    ];
    body = _Line(shaft);
    Offset at(double x, double y) =>
        line.points.last +
        Offset(head.dx * x - head.dy * y, head.dy * x + head.dx * y);
    arrow.addAll([
      at(-back, .5),
      at(-back, .77),
      at(1.1, 0),
      at(-back, -.77),
      at(-back, -.5),
    ]);
  }
  final left = <Offset>[], right = <Offset>[];
  for (var i = 0; i < body.points.length && body.directions.isNotEmpty; i++) {
    final p = body.points[i];
    final incoming = body.directions[math.max(0, i - 1)],
        outgoing = body.directions[math.min(i, body.directions.length - 1)];
    final cross = incoming.dx * outgoing.dy - incoming.dy * outgoing.dx;
    final dot = incoming.dx * outgoing.dx + incoming.dy * outgoing.dy;
    for (final sign in [1.0, -1.0]) {
      final side = sign == 1 ? left : right;
      if (i > 0 && i < body.points.length - 1 && dot > -.999) {
        final scale = sign * .5 / (1 + dot);
        final miter =
            p +
            Offset(
              -(incoming.dy + outgoing.dy) * scale,
              (incoming.dx + outgoing.dx) * scale,
            );
        final reach = (miter - p).distance, limit = .5 / math.cos(math.pi / 6);
        if (cross * sign > .001 || reach <= limit + .000001) {
          side.add(miter);
        } else {
          final projection = .5 * math.sqrt((1 + dot) / 2),
              cut = (limit - projection) / (reach - projection);
          for (final d in [incoming, outgoing]) {
            final edge = p + Offset(-d.dy * sign * .5, d.dx * sign * .5);
            side.add(edge + (miter - edge) * cut);
          }
        }
      } else {
        side.add(p + Offset(-incoming.dy * sign * .5, incoming.dx * sign * .5));
        if (cross.abs() > .001) {
          side.add(
            p + Offset(-outgoing.dy * sign * .5, outgoing.dx * sign * .5),
          );
        }
      }
    }
  }
  final border = [...left, ...arrow, ...right.reversed];
  final path = Path();
  if (border.isNotEmpty) path.addPolygon(border, true);
  if (!moving) {
    _cache[key] = path;
    if (_cache.length > 240) _cache.remove(_cache.keys.first);
  }
  return path;
}

void drawTiles(
  Canvas canvas,
  List<Offset> points,
  double width,
  Color color,
  Offset? head, {
  bool moving = false,
}) {
  if (points.length < 2 || width <= 0) return;
  final outline = _outline(points, width, head, moving);
  canvas.save();
  canvas.translate(points.first.dx, points.first.dy);
  canvas.scale(width, width);
  canvas.drawPath(
    outline,
    Paint()..color = color.withValues(alpha: color.a * .52),
  );
  final rim = Paint()
    ..style = PaintingStyle.stroke
    ..strokeJoin = StrokeJoin.miter
    ..strokeMiterLimit = 1.25;
  canvas.drawPath(
    outline,
    rim
      ..color = shade(color, -.05).withValues(alpha: color.a * .9)
      ..strokeWidth = .11,
  );
  canvas.drawPath(
    outline,
    rim
      ..color = Color.fromRGBO(255, 255, 255, color.a * .42)
      ..strokeWidth = .025,
  );
  canvas.restore();
}

void strokeTiles(
  Canvas canvas,
  List<Offset> points,
  double width,
  double strokeWidth,
  Color color, {
  Offset? head,
  bool moving = false,
  MaskFilter? blur,
}) {
  if (points.length < 2 || width <= 0) return;
  final outline = _outline(points, width, head, moving);
  canvas.save();
  canvas.translate(points.first.dx, points.first.dy);
  canvas.scale(width, width);
  canvas.drawPath(
    outline,
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.miter
      ..strokeMiterLimit = 1.25
      ..strokeWidth = math.max(.08, (strokeWidth - width) / width)
      ..color = color
      ..maskFilter = blur,
  );
  canvas.restore();
}
