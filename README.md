# Monkey Fist

A tap-to-untangle puzzle with colorful braided ropes on square and hexagonal grids.

**Play:** https://creationix.github.io/monkey-fist/

The game has two front ends, and a generator port, that share one design and
generate the same levels:

- [`web/`](web/README.md): the browser game in plain JavaScript, with no build
  step. It is the reference for rules and generation, and GitHub Pages publishes
  it.
- [`flutter/`](flutter/README.md): the native app for Android, iOS and iPadOS,
  with the generator ported to Dart.
- [`moonbit/`](moonbit/README.md): the generator in MoonBit, compiled to
  WebAssembly. The web game loads it through `web/moonbit`, a link to this folder.

Workflows in `.github/workflows` publish the web game to Pages, build the
Android APK, and check that the iOS app compiles.
