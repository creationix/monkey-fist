#!/bin/sh
# Build both backends and copy the release artifacts the pages load (committed, so
# the pages need no build step). Requires the MoonBit toolchain (moon).
#   dist/mf.wasm, dist/mf.js    the whole MoonBit game (index.html, benchmarks)
#   dist/gen.wasm, dist/gen.js  the generator alone, for the JS game (web/generator.js)
set -e
cd "$(dirname "$0")"
moon build --target wasm-gc --release
moon build --target js --release
cp _build/wasm-gc/release/build/api/api.wasm dist/mf.wasm
cp _build/js/release/build/api/api.js dist/mf.js
cp _build/wasm-gc/release/build/gen/gen.wasm dist/gen.wasm
# The JS generator is a classic script (importScripts in a worker, or a script tag):
# its exports go on one global, MFCore, instead of five.
sed 's/^  globalThis\.\([a-z_]*\) = /  (globalThis.MFCore ||= {}).\1 = /' _build/js/release/build/gen/gen.js > dist/gen.js
ls -l dist
