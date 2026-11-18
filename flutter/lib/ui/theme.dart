import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

// The web game's style.css tokens: --text, --muted, --accent, --surface and the page.
const kText = Color(0xffeff8f6);
const kMuted = Color(0xff94b5bb);
const kAccent = Color(0xfff5bd69);
const kOnAccent = Color(0xff14242a);
const kPanel = Color(0xff16323e);
const kBackground = Color(0xff091d27);
const kButton = Color(0xff173a49);
const kDialog = Color(0xff102c38);
const kSolved = Color(0xff2b4a50);

const backgroundGradient = BoxDecoration(
  gradient: RadialGradient(
    center: Alignment(0.4, -0.7),
    radius: 1.3,
    colors: [Color(0xff163e4c), kBackground],
    stops: [0, 0.8],
  ),
);

BoxDecoration appBackground(bool highContrast) => highContrast
    ? const BoxDecoration(color: Colors.black)
    : backgroundGradient;

Color appMuted(BuildContext context) =>
    Theme.of(context).colorScheme.onSurfaceVariant;

/// Side padding that centers a page column of at most [max] pixels, as the
/// web game's `.column` does, so headers and content share one edge.
double pageSide(double width, {double max = 840}) {
  final pad = width <= 600 ? 18.0 : 24.0;
  return math.max(pad, (width - max) / 2 + pad);
}

/// A pinned page header's background: the top slice of the full-screen page
/// background, so the header is seamless with the page behind it.
class PageBackdrop extends StatelessWidget {
  final bool highContrast;
  const PageBackdrop({super.key, required this.highContrast});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return ClipRect(
      child: OverflowBox(
        alignment: Alignment.topCenter,
        minWidth: size.width,
        maxWidth: size.width,
        minHeight: size.height,
        maxHeight: size.height,
        child: DecoratedBox(
          decoration: appBackground(highContrast),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

/// The square or hexagon grid mark from the web game's icon set.
class GridIcon extends StatelessWidget {
  final bool hex;
  final double size;
  final Color? color;
  const GridIcon({super.key, required this.hex, this.size = 13, this.color});

  @override
  Widget build(BuildContext context) => CustomPaint(
    size: Size.square(size),
    painter: _GridIconPainter(hex, color ?? appMuted(context)),
  );
}

class _GridIconPainter extends CustomPainter {
  final bool hex;
  final Color color;
  _GridIconPainter(this.hex, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 24;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.3 * k
      ..strokeJoin = StrokeJoin.round
      ..color = color;
    if (!hex) {
      canvas.drawRRect(
        RRect.fromLTRBR(5 * k, 5 * k, 19 * k, 19 * k, Radius.circular(1.5 * k)),
        paint,
      );
      return;
    }
    const points = [
      (12.0, 3.5),
      (19.4, 7.75),
      (19.4, 16.25),
      (12.0, 20.5),
      (4.6, 16.25),
      (4.6, 7.75),
    ];
    final path = Path()..moveTo(points[0].$1 * k, points[0].$2 * k);
    for (final (x, y) in points.skip(1)) {
      path.lineTo(x * k, y * k);
    }
    canvas.drawPath(path..close(), paint);
  }

  @override
  bool shouldRepaint(_GridIconPainter old) =>
      old.hex != hex || old.color != color;
}

ThemeData monkeyTheme({bool highContrast = false}) {
  final base = ThemeData(
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: kAccent,
      onPrimary: kOnAccent,
      surface: highContrast ? const Color(0xff050a0c) : kDialog,
      onSurface: kText,
      secondary: kMuted,
      secondaryContainer: highContrast
          ? const Color(0xff14262c)
          : const Color(0xff224653),
      onSecondaryContainer: kText,
      onSurfaceVariant: highContrast ? const Color(0xffc7dadd) : kMuted,
      outline: highContrast ? const Color(0xff82999e) : const Color(0xff36515c),
      outlineVariant: highContrast
          ? const Color(0xff4c6368)
          : const Color(0xff29444f),
      surfaceContainerHighest: highContrast ? const Color(0xff101a1e) : kButton,
      // The web's --field: text fields, selects and unselected set tabs.
      surfaceContainerLowest: highContrast ? const Color(0xff010304) : const Color(0xff0b222d),
    ),
    scaffoldBackgroundColor: highContrast ? Colors.black : kBackground,
    useMaterial3: true,
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: kText, displayColor: kText),
    dialogTheme: DialogThemeData(
      backgroundColor: highContrast ? const Color(0xff050a0c) : kDialog,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      centerTitle: false,
      elevation: 0,
    ),
  );
}
