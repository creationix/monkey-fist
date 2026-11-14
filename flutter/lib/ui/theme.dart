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

ThemeData monkeyTheme() {
  final base = ThemeData(
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: kAccent,
      onPrimary: Color(0xff14242a),
      surface: kDialog,
      onSurface: kText,
      secondary: kMuted,
    ),
    scaffoldBackgroundColor: kBackground,
    useMaterial3: true,
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: kText, displayColor: kText),
    dialogTheme: const DialogThemeData(backgroundColor: kDialog),
  );
}
