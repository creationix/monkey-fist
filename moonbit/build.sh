#!/bin/sh
# Build both backends and copy the release artifacts the page loads (committed, so
# the page needs no build step). Requires the MoonBit toolchain (moon).
set -e
cd "$(dirname "$0")"
moon build --target wasm-gc --release
moon build --target js --release
cp _build/wasm-gc/release/build/api/api.wasm dist/mf.wasm
cp _build/js/release/build/api/api.js dist/mf.js
ls -l dist
