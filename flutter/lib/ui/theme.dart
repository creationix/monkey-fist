import 'package:material_ui/material_ui.dart';

// style.css: --text, --muted, --accent, --panel and the page background.
const kText = Color(0xffeff8f6);
const kMuted = Color(0xff94b5bb);
const kAccent = Color(0xfff5bd69);
const kPanel = Color(0xff16323e);
const kBackground = Color(0xff091d27);
const kButton = Color(0xff173a49);
const kDialog = Color(0xff102c38);

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

ThemeData monkeyTheme({bool highContrast = false}) {
  final base = ThemeData(
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: kAccent,
      onPrimary: Color(0xff14242a),
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
      centerTitle: false,
      elevation: 0,
    ),
  );
}
