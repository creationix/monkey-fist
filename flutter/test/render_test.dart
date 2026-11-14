// Renders boards with the real painter (headless) and checks the app shell
// builds. Set MF_RENDER_DIR to keep the PNGs for a look.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter_test/flutter_test.dart';
import 'package:monkey_fist/core/engine.dart';
import 'package:monkey_fist/game/game_state.dart';
import 'package:monkey_fist/ui/board_painter.dart';

Future<void> _render(int index, String name, {void Function(GameState g)? play}) async {
  final g = GameState(generate(journeyOpts, index)!);
  const size = ui.Size(420, 820);
  g.resize(size.width, size.height, top: 90, bottom: 96);
  play?.call(g);
  final recorder = ui.PictureRecorder();
  final canvas = ui.Canvas(recorder);
  canvas.drawRect(const ui.Rect.fromLTWH(0, 0, 420, 820), ui.Paint()..color = const ui.Color(0xff0e2a35));
  BoardPainter(g, 0).paint(canvas, size);
  final image = await recorder.endRecording().toImage(420, 820);
  final png = await image.toByteData(format: ui.ImageByteFormat.png);
  expect(png, isNotNull);
  final dir = Platform.environment['MF_RENDER_DIR'];
  if (dir != null) File('$dir/$name.png').writeAsBytesSync(png!.buffer.asUint8List());
}

void main() {
  testWidgets('boards render', (tester) async {
    await tester.runAsync(() async {
      await _render(0, 'l001-hex');
      await _render(10, 'l011-square');
      await _render(59, 'l060-mirrors-springs');
      await _render(104, 'l105');
      await _render(115, 'l116-hex-mirrors');
      await _render(59, 'l060-moving', play: (g) {
        for (final i in g.board.plan.take(3)) {
          g.tap(i);
        }
        for (var k = 0; k < 9; k++) {
          g.update(1 / 60);
        }
      });
    });
  });
}
