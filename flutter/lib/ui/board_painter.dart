// Draws a GameState with CustomPainter, following app.js: the board panel and
// grid, glass mirrors in cord-bound frames, copper spring spinners, braided
// ropes with arrowheads, hint glows, frozen ropes darkened.
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../core/hex.dart';
import '../core/util.dart' show Pt;
import '../game/game_state.dart';
import 'rope_art.dart';
import 'tile_art.dart';

const List<Color> palette = [
  Color(0xff37d5ac),
  Color(0xfff9bd4a),
  Color(0xffa987f5),
  Color(0xfff785ac),
  Color(0xff58b7ef),
  Color(0xfff7a251),
  Color(0xffe8dca1),
  Color(0xfff46f73),
  Color(0xff73d677),
];

class BoardPainter extends CustomPainter {
  final GameState g;
  final int frame;
  final bool oled;
  final String graphics;
  BoardPainter(this.g, this.frame, {this.oled = false, this.graphics = 'rope'}) : super();
  bool get tiles => graphics == 'tiles';

  Offset _o(Vec v) => Offset(v.x, v.y);

  Color _color(int i) {
    final base = palette[i % palette.length];
    if (!g.frozen.contains(i) || g.moves.containsKey(i)) return base;
    return Color.fromARGB(255, (base.r * 255 * .45).round(), (base.g * 255 * .45).round(), (base.b * 255 * .45).round());
  }

  @override
  void paint(Canvas canvas, Size size) {
    final s = g.scale;
    final (px, py, pw, ph) = g.panel();
    final board = RRect.fromRectAndRadius(Rect.fromLTWH(px, py, pw, ph), Radius.circular(math.min(22, s * .4)));
    canvas.drawRRect(
        board,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: oled ? const [Color(0x04ffffff), Color(0x02ffffff)] : const [Color(0x0cffffff), Color(0x06ffffff)],
          ).createShader(board.outerRect));
    canvas.drawRRect(
        board,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5
          ..color = const Color(0x14ffffff));
    canvas.save();
    canvas.clipRRect(board);
    _grid(canvas);
    _mirrors(canvas);
    for (final p in g.board.springs) {
      _spring(canvas, p);
    }
    for (var i = 0; i < g.paths.length; i++) {
      if (!g.moves.containsKey(i) && g.paths[i] != null) _rope(canvas, i);
    }
    canvas.restore();
    // Moving ropes are drawn unclipped so departures stay visible off the board.
    for (final i in g.moves.keys) {
      _rope(canvas, i);
    }
    // Accepted taps flash the rope as it appears, over everything else.
    for (final MapEntry(key: i, value: remaining) in g.activations.entries) {
      _flash(canvas, i, .28 * math.min(1.0, remaining / .18));
    }
  }

  /// Fade a mirror or spring that no rope can reach any more.
  bool _fade(Canvas canvas, Pt cell, double opacity) {
    if (opacity <= 0) return false;
    if (opacity >= 1) {
      canvas.save();
    } else {
      final c = _o(g.screen(cell));
      canvas.saveLayer(Rect.fromCircle(center: c, radius: g.scale * .75),
          Paint()..color = Color.fromRGBO(0, 0, 0, opacity));
    }
    return true;
  }

  void _grid(Canvas canvas) {
    final s = g.scale;
    final b = g.board;
    final cells = g.cells();
    final lines = Path();
    final dots = Path();
    final radius = math.max(1.2, s * .035);
    final dirs = b.hex ? const [(1, 0), (0, 1), (-1, 1)] : const [(1, 0), (0, 1)];
    for (final p in cells) {
      final at = _o(g.screen(p));
      dots.addOval(Rect.fromCircle(center: at, radius: radius));
      for (final (dq, dr) in dirs) {
        final n = Pt(p.q + dq, p.r + dr);
        final inside = b.hex ? hexInside(b.w, b.h, n) : n.q >= 0 && n.r >= 0 && n.q < b.w && n.r < b.h;
        if (inside) {
          final to = _o(g.screen(n));
          lines.moveTo(at.dx, at.dy);
          lines.lineTo(to.dx, to.dy);
        }
      }
    }
    final fade = 1 - g.outro;
    canvas.drawPath(
        lines,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = math.max(.6, math.min(1, s * .025))
          ..color = (oled ? const Color(0x40b3d7d9) : const Color(0x13b3d7d9)).withValues(alpha: (oled ? .25 : .075) * fade));
    canvas.drawPath(dots, Paint()..color = (oled ? const Color(0xffb3d7d9).withValues(alpha: .36 * fade) : const Color(0xffb3d7d9).withValues(alpha: .11 * fade)));
  }

  void _mirrors(Canvas canvas) {
    final s = g.scale;
    for (final m in g.board.mirrors) {
      if (!_fade(canvas, m.cell, g.featureOpacity(m.cell))) continue;
      final (dq, dr) = g.board.hex ? (hexDq[m.kind], hexDr[m.kind]) : (m.kind == 0 ? (1, -1) : (1, 1));
      final a = g.screenAt(m.cell.q - dq * .37, m.cell.r - dr * .37);
      final b = g.screenAt(m.cell.q + dq * .37, m.cell.r + dr * .37);
      final length = math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
      canvas.save();
      canvas.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
      canvas.rotate(math.atan2(b.y - a.y, b.x - a.x));
      if (tiles) {
        final glass = Rect.fromLTWH(-length / 2, -s * .08, length, s * .16);
        canvas.drawRect(glass, Paint()..color = const Color(0x668edce0));
        canvas.drawRect(glass, Paint()..style = PaintingStyle.stroke..strokeJoin = StrokeJoin.bevel
          ..strokeWidth = s * .03..color = const Color(0xe69ad7d4));
        canvas.restore();
        canvas.restore();
        continue;
      }
      final line = Path()
        ..moveTo(-length / 2, 0)
        ..lineTo(length / 2, 0);
      final p = Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      canvas.drawPath(line, p..color = const Color(0xff091e27)..strokeWidth = s * .22);
      canvas.drawPath(line, p..color = const Color(0xff766f58)..strokeWidth = s * .17);
      canvas.drawPath(
          line,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeCap = StrokeCap.round
            ..strokeWidth = s * .105
            ..shader = const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xff688c87), Color(0xffa1b7a5), Color(0xff517d7d)],
              stops: [0, .45, 1],
            ).createShader(Rect.fromLTRB(-length / 2, -s * .06, length / 2, s * .06)));
      for (final sign in const [-1, 1]) {
        final x = sign * (length / 2 - s * .035);
        canvas.drawLine(Offset(x - s * .04, -s * .06), Offset(x + s * .04, s * .06),
            p..color = const Color(0xffb4a17c)..strokeWidth = s * .055);
        if (s > 24) {
          canvas.drawLine(Offset(x - s * .06, -s * .02), Offset(x + s * .02, s * .07),
              p..color = const Color(0x88dcc49a)..strokeWidth = s * .018);
        }
      }
      canvas.restore();
      canvas.restore();
    }
  }

  Path _gear(double s, {bool hole = false}) {
    final gear = Path();
    for (var i = 0; i < 32; i++) {
      final angle = i * math.pi / 16, radius = s * (i % 4 < 2 ? .36 : .285);
      final x = math.cos(angle) * radius, y = math.sin(angle) * radius;
      if (i == 0) {
        gear.moveTo(x, y);
      } else {
        gear.lineTo(x, y);
      }
    }
    gear.close();
    if (hole) {
      gear.addOval(Rect.fromCircle(center: Offset.zero, radius: s * .245));
      gear.fillType = PathFillType.evenOdd;
    }
    return gear;
  }

  void _spring(Canvas canvas, Pt spring) {
    if (!_fade(canvas, spring, g.featureOpacity(spring))) return;
    if (tiles) {
      _tileSpring(canvas, spring);
    } else {
      _ropeSpring(canvas, spring);
    }
    canvas.restore();
  }

  void _ropeSpring(Canvas canvas, Pt spring) {
    final s = g.scale;
    final p = g.screen(spring);
    canvas.save();
    canvas.translate(p.x, p.y);
    canvas.drawCircle(Offset(0, s * .025), s * .34, Paint()..color = const Color(0x55000000));
    canvas.drawCircle(
        Offset.zero,
        s * .3,
        Paint()
          ..shader = const RadialGradient(
            center: Alignment(-.33, -.4),
            radius: .9,
            colors: [Color(0xff6c5138), Color(0xff2d3029)],
          ).createShader(Rect.fromCircle(center: Offset.zero, radius: s * .32)));
    canvas.rotate(g.springRotation(spring));
    final gear = _gear(s, hole: true);
    canvas.drawPath(gear, Paint()..color = const Color(0xff887349));
    canvas.drawPath(
        gear,
        Paint()
          ..style = PaintingStyle.stroke
          ..color = const Color(0xffd6ba7a)
          ..strokeWidth = s * .025
          ..strokeJoin = StrokeJoin.bevel);
    final rim = [for (var i = 0; i < 25; i++) Offset(math.cos(i * math.pi / 12) * s * .285, math.sin(i * math.pi / 12) * s * .285)];
    drawRope(canvas, rim, s * .085, const Color(0xffb69b6c), null);
    final coil = Path();
    for (var t = 0.0; t <= math.pi * 5; t += .14) {
      final r = s * (.035 + .0115 * t), x = math.cos(t) * r, y = math.sin(t) * r;
      if (t == 0) {
        coil.moveTo(x, y);
      } else {
        coil.lineTo(x, y);
      }
    }
    final cp = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(coil, cp..color = const Color(0xff211e1a)..strokeWidth = s * .09);
    canvas.drawPath(
        coil,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = s * .058
          ..shader = const LinearGradient(
            colors: [Color(0xffefc78b), Color(0xffce9454), Color(0xff94603c)],
            stops: [0, .45, 1],
          ).createShader(Rect.fromLTRB(-s * .2, -s * .2, s * .2, s * .2)));
    canvas.translate(-s * .008, -s * .012);
    canvas.drawPath(coil, cp..color = const Color(0x66ffe0aa)..strokeWidth = s * .016);
    canvas.restore();
  }

  void _rope(Canvas canvas, int i) {
    final s = g.scale;
    final d = g.drawing(i);
    if (d == null || d.points.length < 2) return;
    final points = [for (final v in d.points) _o(v)];
    var minX = double.infinity, maxX = -double.infinity, minY = double.infinity, maxY = -double.infinity;
    for (final p in points) {
      minX = math.min(minX, p.dx);
      maxX = math.max(maxX, p.dx);
      minY = math.min(minY, p.dy);
      maxY = math.max(maxY, p.dy);
    }
    if (maxX < -s || minX > g.width + s || maxY < -s || minY > g.height + s) return;
    final move = g.moves[i];
    final h = _o(d.head);
    canvas.save();
    if (move != null && move.waiting) {
      _stroke(canvas, points, s * .4, s * .51, const Color(0x33fff1b4), h);
    }
    if (g.bump == i) {
      final t = math.sin(g.bumpTime / .25 * math.pi) * .1 * s;
      canvas.translate(h.dx * t, h.dy * t);
    }
    // Texture coordinates start at the moving tail; the weave moves with the rope.
    final moving = move != null && !move.waiting;
    if (g.hint == i) {
      final pulse = .5 + .5 * math.sin(g.clock * 7);
      _stroke(canvas, points, s * .4, s * .56 + s * .2 * pulse, const Color(0x88fff0b0), h,
          moving: moving, blur: MaskFilter.blur(BlurStyle.normal, s * (.12 + .07 * pulse)));
      _stroke(canvas, points, s * .4, s * .56, const Color(0xfffff1b4), h, moving: moving);
      if (!tiles) _arrow(canvas, points.last, h, s, s * .09, const Color(0xfffff1b4));
    }
    final color = _color(i);
    if (d.foldIndex > 0 && d.foldIndex < points.length - 1) {
      // Paint the whole returning strand over the outgoing one, arrowhead on top.
      _draw(canvas, points.sublist(0, d.foldIndex + 1), s * .4, color, null, moving: moving);
      _draw(canvas, points.sublist(d.foldIndex), s * .4, color, h, moving: moving);
    } else {
      _draw(canvas, points, s * .4, color, h, moving: moving);
    }
    canvas.restore();
  }

  void _flash(Canvas canvas, int i, double alpha) {
    final d = g.drawing(i);
    if (d == null || d.points.length < 2) return;
    final s = g.scale, move = g.moves[i];
    final points = [for (final v in d.points) _o(v)], h = _o(d.head);
    final color = const Color(0xfffff8dc).withValues(alpha: alpha);
    _stroke(canvas, points, s * .4, s * .43, color, h, moving: move != null && !move.waiting);
    if (!tiles) _arrow(canvas, points.last, h, s, 0, color, half: s * .308);
  }

  void _draw(Canvas canvas, List<Offset> points, double width, Color color, Offset? head, {bool moving = false}) {
    if (tiles) {
      drawTiles(canvas, points, width, color, head, moving: moving);
    } else {
      drawRope(canvas, points, width, color, head, moving: moving);
    }
  }

  void _stroke(Canvas canvas, List<Offset> points, double width, double strokeWidth, Color color, Offset head,
      {bool moving = false, MaskFilter? blur}) {
    if (tiles) {
      strokeTiles(canvas, points, width, strokeWidth, color, head: head, moving: moving, blur: blur);
    } else {
      strokeRope(canvas, points, width, strokeWidth, color, moving: moving, blur: blur);
    }
  }

  void _tileSpring(Canvas canvas, Pt spring) {
    final s = g.scale, p = g.screen(spring);
    canvas.save();
    canvas.translate(p.x, p.y);
    canvas.rotate(g.springRotation(spring));
    final gear = _gear(s);
    canvas.drawPath(gear, Paint()..color = const Color(0x61ffc169));
    final rim = Paint()..style = PaintingStyle.stroke..strokeJoin = StrokeJoin.bevel;
    canvas.drawPath(gear, rim..color = const Color(0xe6f4bf78)..strokeWidth = s * .035);
    canvas.drawPath(gear, rim..color = const Color(0x4dfff4cf)..strokeWidth = s * .01);
    final symbol = Path()..moveTo(-s * .14, s * .11)..lineTo(-s * .14, -s * .11)
      ..lineTo(s * .14, -s * .11)..lineTo(s * .14, s * .07)
      ..moveTo(s * .065, s * .015)..lineTo(s * .14, s * .12)..lineTo(s * .215, s * .015);
    canvas.drawPath(symbol, rim..color = const Color(0xd9ffd293)..strokeWidth = s * .038);
    canvas.restore();
  }

  void _arrow(Canvas canvas, Offset tip, Offset d, double s, double grow, Color fill, {double? half}) {
    final reach = s * .44 + grow, back = s * .12;
    half ??= s * .32 + grow;
    final path = Path()
      ..moveTo(tip.dx + d.dx * reach, tip.dy + d.dy * reach)
      ..lineTo(tip.dx - d.dx * back - d.dy * half, tip.dy - d.dy * back + d.dx * half)
      ..lineTo(tip.dx - d.dx * back + d.dy * half, tip.dy - d.dy * back - d.dx * half)
      ..close();
    canvas.drawPath(path, Paint()..color = fill);
  }

  @override
  bool shouldRepaint(BoardPainter old) => true;
}
