import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:monkey_fist/ui/tile_art.dart';

void main() {
  testWidgets('translucent shaft and arrow share one fill without a neck seam', (tester) async {
    await tester.runAsync(() async {
      final recorder = PictureRecorder();
      drawTiles(Canvas(recorder), const [Offset(40, 60), Offset(100, 60)], 20,
          const Color(0xffffaa33), const Offset(1, 0));
      final picture = recorder.endRecording();
      final image = await picture.toImage(150, 120);
      final data = (await image.toByteData(format: ImageByteFormat.rawRgba))!;
      int alpha(int x, int y) => data.getUint8((y * 150 + x) * 4 + 3);
      for (final x in [50, 90, 95, 100, 105]) {
        expect(alpha(x, 60), inInclusiveRange(131, 135), reason: 'no overlapping fill at x=$x');
      }
      expect(alpha(120, 20), 0);
      image.dispose();
      picture.dispose();
    });
  });

  testWidgets('short segments, square/hex bends, and reversing folds render', (tester) async {
    await tester.runAsync(() async {
      for (final points in <List<Offset>>[
        [const Offset(40, 60), const Offset(41, 60)],
        [const Offset(40, 60), const Offset(40, 60)],
        [const Offset(40, 100), const Offset(100, 100), const Offset(100, 40)],
        [const Offset(40, 100), const Offset(100, 100), const Offset(130, 48)],
        [const Offset(40, 100), const Offset(100, 100), const Offset(40, 100)],
      ]) {
        final recorder = PictureRecorder();
        final canvas = Canvas(recorder);
        drawTiles(canvas, points, 20, const Color(0xff37d5ac), const Offset(1, 0), moving: true);
        strokeTiles(canvas, points, 20, 26, const Color(0x55ffffff), head: const Offset(1, 0));
        final picture = recorder.endRecording();
        final image = await picture.toImage(180, 150);
        expect(await image.toByteData(format: ImageByteFormat.png), isNotNull);
        image.dispose();
        picture.dispose();
      }
    });
  });
}
