# Monkey Fist for Android and iOS (Flutter)

A native version of the Monkey Fist rope puzzle: one Dart/Flutter codebase for
Android phones and tablets, iPhone and iPad. It plays the same 120 Journey levels
and the same Custom sets as the web game. Every level is regenerated on the
device from its seed with a Dart port of the generator, and it matches the
JavaScript output exactly.

All six web songs are synthesized offline, with the same score, grooves, seeded
melody variations, four arrangements, and quieter thinking passages.
**Music: Off → Soft → Full** is independent of sound effects and is saved between
sessions. Music starts Off, plays during puzzles, and pauses on the level list,
results, or when the app is backgrounded. Bars stream over the
`monkey_fist/music` channel to an AudioTrack on Android (media volume) and to
AVAudioEngine on iOS (mixing with other audio, like the effects); one bar plays
while the next waits. No music files are downloaded or bundled.

See [REPORT.md](REPORT.md) for what was ported, parity results and timings.

The app has the same three screens as the web game, laid out the same way:
**Levels** (Journey or Custom, your stars, Play or Continue, and the levels), the
**puzzle**, and **Settings**. Custom builds a set from a seed (or a pasted set
code), grid, number of levels, difficulty range, size, mirrors, springs and
colossal maps; every Custom level is open and each set keeps its own scores.
**Copy set link** shares the set as a web link. The Settings gear is in the top-right corner of Levels and of the
puzzle. Continue returns to the puzzle in progress with its taps and undos. The
settings screen contains:

- Sound effects and background music: Off / Soft / Full, independently.
- Movement speed: Slow / Normal / Fast.
- Art style: Rope / Tiles, including matching mirrors and springs.
- High contrast: black backgrounds, clearer grid lines and stronger UI outlines.

The board is drawn as on the web: springs fold a rope back over its own drawn
line while its arrowhead turns around and the spinner spins half a turn; a head
on a mirror turns with the bend; mirrors and springs no rope can reach any more
fade away, and after auto-solve the empty grid fades before the result.

Changes are saved automatically. Opening Settings pauses the puzzle and music;
returning applies the preferences without resetting the board, taps or progress.
The puzzle toolbar has Undo, Hint, Solve and Restart, plus Fit while zoomed in.
In portrait the title and score sit above the board and the toolbar below it; on
wide screens (wider than 6:5) the title and toolbar move to the left and the
score to the right, so the board keeps the full height. Controls adapt to small
screens, landscape and larger text.

## Layout

```
flutter/
  lib/core/      the generator, pure Dart (no Flutter imports; runs under `dart test`)
    util.dart        Pt/Board types, mulberry32, FNV-1a, Math.round, stable sort, toFixed
    square.dart      square offset kernels (levels.js)
    weave.dart       square woven builder (levels.js)
    hex.dart         Hex kernels and Hex woven builder (hex/engine.js)
    mech.dart        full-geometry taps, mirrors, spinners, solvers (mechanics.js, hex/mechanics.js)
    metrics.dart     dependency metrics: the interaction score (dependency-metrics.js)
    gridgen.dart     grid generator (grid-generator.js)
    engine.dart      set codes, level specs, layoutKey, generate, unlocks (game-engine.js)
    journey_data.dart  the 120 Journey specs, generated from ../grid-journey.js
  lib/game/      game logic, pure Dart except progress.dart
    game_state.dart  taps, queued motions, traffic, undo, hints, auto-solve, stars, camera,
                     hit-testing, spring folds, mirror turns and feature fades (as drawn)
    curve.dart       the rope's filleted centerline, shared by the game layer and the painter
    sounds.dart      the sounds.js effects as offline synthesis to WAV
    levels.dart      level generation in an isolate, with a cache and prefetch
    progress.dart    scores per set, chapter unlocks, Custom options (shared_preferences)
  lib/ui/        Flutter widgets: level list, game screen, CustomPainter, rope art, audio
  test/core/     parity and game-logic tests (`dart test`)
  test/          widget, rendering and storage tests (`flutter test`)
  tool/          gen_journey.cjs (regenerate the Journey table and fixtures), bench.dart
```

## Run

You need the Flutter SDK (stable; developed with Flutter 3.50 / Dart 3.14).

```sh
cd flutter
flutter pub get
flutter run            # a connected device or a running emulator/simulator
```

## Test

```sh
cd flutter
dart test test/core    # generator parity (120 Journey levels + 15 custom sets) and game logic
flutter test           # everything, including widget, rendering and storage tests
```

`test/core/parity_test.dart` prints Journey generation time per level. To keep
the rendered boards and app screenshots from the tests as PNGs:

```sh
MF_RENDER_DIR=/tmp/mf flutter test test/render_test.dart test/app_test.dart
```

Benchmark the generator on its own, JIT and AOT:

```sh
dart run tool/bench.dart
dart compile exe tool/bench.dart -o /tmp/mf-bench && /tmp/mf-bench
```

If `grid-journey.js` or the generator changes in the web game, regenerate the
Journey table and the expected values with `node tool/gen_journey.cjs`, then port
the generator change and run the parity tests.

## Build for Android

After editing the web song definitions, run `python3 tool/gen_music.py` from
`flutter/` to update the shared score. The native synthesizer is in
`lib/game/music.dart`; `test/core/music_test.dart` checks its output and timing.

Requirements: the Android SDK (command-line tools, a platform and build tools,
with their licences accepted: `sdkmanager --licenses`) and a JDK (17 or newer).
Run `flutter doctor` to check.

```sh
flutter build apk --debug            # quick, debuggable APK for local testing
flutter build apk --release          # a universal APK in build/app/outputs/flutter-apk/
flutter build appbundle --release    # an .aab for Google Play
```

### Local development on Linux

Install [Flutter stable](https://docs.flutter.dev/install/manual) and
[Android Studio](https://developer.android.com/studio). This project needs
Flutter 3.50 / Dart 3.14 or later. Android Studio includes a Java runtime, the
SDK Manager, and the Device Manager for creating Android emulators.

For installations in `~/develop/flutter`, `~/develop/android-studio`, and
`~/Android/Sdk`, add these exports to your shell configuration:

```sh
export FLUTTER_ROOT="$HOME/develop/flutter"
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/develop/android-studio/jbr"
export PATH="$FLUTTER_ROOT/bin:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Open a new terminal, then configure Flutter and install the SDK packages used by
Flutter 3.50. Review and accept the SDK licenses when prompted:

```sh
flutter config --android-sdk "$ANDROID_HOME" --jdk-dir "$JAVA_HOME"
sdkmanager --licenses
sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.1.0' \
  'ndk;28.2.13676358' 'cmake;3.22.1' 'emulator' \
  'system-images;android-36;google_apis;x86_64'
flutter doctor -v
```

The `x86_64` image is for Intel/AMD Linux machines. For a local virtual phone,
use Android Studio **More Actions → Virtual Device Manager** (or **Tools →
Device Manager** in an open project), or create one from the terminal:

```sh
echo no | avdmanager create avd --name Monkey_Fist_API_36 \
  --package 'system-images;android-36;google_apis;x86_64' --device pixel_5
emulator -accel-check                # Linux requires accessible /dev/kvm
emulator -avd Monkey_Fist_API_36 -memory 2048 -cores 2
```

Gradle is limited to a 2 GB heap and two workers, and its daemon exits after
one minute idle, to leave room for the emulator. The first build downloads and
compiles dependencies; if memory is tight, close the emulator during that build
and reopen it to install the APK.

Keep the emulator running and use another terminal for the app:

```sh
cd /path/to/monkey-fist/flutter
flutter pub get
flutter devices
flutter run -d emulator-5554         # use the device ID printed above
```

In `flutter run`, press `r` for hot reload, `R` for a full restart, and `q` to
stop. For a standalone APK, build and install it directly:

```sh
flutter build apk --debug
adb -s emulator-5554 install -r build/app/outputs/flutter-apk/app-debug.apk
```

The release APK is `build/app/outputs/flutter-apk/app-release.apk`. You can
copy it to a physical Android device and install it, or enable USB debugging,
authorize the computer on the phone, and use its ID with `flutter run -d` or
`adb -s`. Use `flutter test` for the automated suite; it does not need an emulator.

The template release build is signed with the debug key. For Play Store
releases, create an upload keystore and configure `android/key.properties` and
`signingConfigs` in `android/app/build.gradle.kts` (see
https://docs.flutter.dev/deployment/android). The application id is
`com.monkeyfist.monkey_fist`; change it before the first release if you want
a different one.

## Build for iOS and iPadOS

Requirements: a Mac with Xcode and CocoaPods, and an Apple Developer account
for signing.

```sh
flutter build ios --release          # then archive in Xcode, or:
flutter build ipa --release          # an .ipa for App Store Connect / TestFlight
```

Open `ios/Runner.xcworkspace` in Xcode to choose the team and bundle identifier
(currently `com.monkeyfist.monkeyFist`) under Signing & Capabilities. The app
supports portrait and landscape on iPhone and iPad.
