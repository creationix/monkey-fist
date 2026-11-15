# Monkey Fist in MoonBit

An experiment: the Monkey Fist generator core and a playable slice of the game,
written in [MoonBit](https://www.moonbitlang.com) and compiled to wasm-gc, with a
JS-backend fallback. Every Journey level regenerates identically to the JS game
(reference commit `9e69e3a`). Measurements, parity results and a recommendation
are in [REPORT.md](REPORT.md).

- **Play:** open `index.html` (served from the repository root, for example at
  `/moonbit/`). Use the picker to choose a Journey level; add `?engine=js` to use
  the JS build.
- **Build:** run `./build.sh`. This needs `moon`, installed from
  https://cli.moonbitlang.com/install/unix.sh. The built files in `dist/` are
  committed, so the page needs no build step.
- **Test:**
  - `moon test` runs the MoonBit unit tests.
  - From the repository root, start `python3 -m http.server 4173 --bind 127.0.0.1`,
    then run
    `CHROMIUM_PATH=/opt/pw-browsers/chromium MF_TEST_URL=http://127.0.0.1:4173/ node --test moonbit/tests/*.test.cjs`
    for parity on both backends and the Chromium play tests.
