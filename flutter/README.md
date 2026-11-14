# Monkey Fist for Android and iOS (Flutter)

A native version of the Monkey Fist rope puzzle: one Dart/Flutter codebase for
Android phones and tablets, iPhone and iPad. It plays the same 120 Journey levels
as the web game. Every level is regenerated on the device from its seed with a
Dart port of the generator, and it matches the JavaScript output exactly.

See [REPORT.md](REPORT.md) for what was ported, parity results and timings.

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
    game_state.dart  taps, queued motions, traffic, undo, hints, auto-solve, stars, camera, hit-testing
    sounds.dart      the sounds.js effects as offline synthesis to WAV
    levels.dart      level generation in an isolate, with a cache and prefetch
    progress.dart    chapter unlocks and best scores (shared_preferences)
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

Requirements: the Android SDK (command-line tools, a platform and build tools,
with their licences accepted: `sdkmanager --licenses`) and a JDK (17 or newer).
Run `flutter doctor` to check.

```sh
flutter build apk --release          # a universal APK in build/app/outputs/flutter-apk/
flutter build appbundle --release    # an .aab for Google Play
```

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
