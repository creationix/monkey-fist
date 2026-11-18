#!/bin/sh
# Build a harness in which moonbit/tests/*.test.cjs and moonbit/scripts/*.mjs run UNCHANGED
# against another wasm build of the core (an Encantis port), by laying out the files they
# expect around it:
#   setup-harness.sh <dir> <gen.wasm> [api.wasm]
#     <gen.wasm> becomes dist/gen.wasm (web/generator.js surface: in_reset in_push out_len out_get
#                outf_get generate generate_spec measure target_challenge win_ceiling guide features)
#     [api.wasm] becomes dist/mf.wasm and _build/wasm-gc/release/build/api/api.wasm (web/mf-core.js
#                surface: in_reset in_push out_len out_get generate, plus bench_casual bench_par
#                bench_solve for bench-node.mjs). Default: <gen.wasm>.
# The JS game files are symlinks into this checkout; tests/, web/, scripts/, bench/ are copies;
# dist/*.js and _build/js are MoonBit's JS builds (the "MoonBit JS" and fallback backends).
set -e
SRC=$(cd "$(dirname "$0")/../../../.." && pwd); H=$1; GEN=$(realpath "$2"); API=$(realpath "${3:-$2}")
rm -rf "$H"; mkdir -p "$H/scripts" "$H/moonbit/dist" "$H/moonbit/_build/wasm-gc/release/build/api" "$H/moonbit/_build/js/release/build/api"
for f in game-engine.js levels.js mechanics.js random.js grid-journey.js hex; do ln -s "$SRC/$f" "$H/$f"; done
ln -s "$SRC/scripts/grid-journey-measurements.json" "$SRC/scripts/code-metrics.cjs" "$H/scripts/"
cp -r "$SRC/moonbit/tests" "$SRC/moonbit/web" "$SRC/moonbit/scripts" "$SRC/moonbit/bench" "$H/moonbit/"
ln -s "$SRC/moonbit/src" "$H/moonbit/src"
cp "$(dirname "$0")/measurements-wasm.test.cjs" "$H/moonbit/tests/"
cp "$SRC/moonbit/dist/gen.js" "$SRC/moonbit/dist/mf.js" "$H/moonbit/dist/"
cp "$SRC/moonbit/dist/mf.js" "$H/moonbit/_build/js/release/build/api/api.js"
cp "$GEN" "$H/moonbit/dist/gen.wasm"
cp "$API" "$H/moonbit/dist/mf.wasm"; cp "$API" "$H/moonbit/_build/wasm-gc/release/build/api/api.wasm"
echo "harness $H: gen.wasm <- $GEN; mf.wasm, api.wasm <- $API"
