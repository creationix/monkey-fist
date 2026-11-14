import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import 'game/levels.dart';
import 'game/progress.dart';
import 'ui/audio.dart';
import 'ui/home_screen.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  final progress = await Progress.load();
  final audio = SfxPlayer(enabled: progress.sound);
  runApp(MonkeyFistApp(progress: progress, store: LevelStore(), audio: audio));
}

class MonkeyFistApp extends StatelessWidget {
  final Progress progress;
  final LevelStore store;
  final SfxPlayer audio;
  const MonkeyFistApp({super.key, required this.progress, required this.store, required this.audio});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Monkey Fist',
      debugShowCheckedModeBanner: false,
      theme: monkeyTheme(),
      home: HomeScreen(progress: progress, store: store, audio: audio),
    );
  }
}
