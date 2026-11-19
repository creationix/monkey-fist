#!/bin/sh
# Builds the wasm files of the Encantis core and runs the inline tests of its modules.
#
#   moonbit/encantis/core/build.sh
#
# ENCANTIS is the compiler's CLI (default: the worktree of encantis this port is pinned
# to). Each group appends its lines below its own heading; the file stops at the first
# failure. core.wasm is built once core.ents exists (G7).
set -e
cd "$(dirname "$0")"
ENCANTIS=${ENCANTIS:-"bun /home/user/enc-wt/main/packages/cli/src/cli.ts"}

wasm() {
  printf 'wasm %s: ' "$1"
  $ENCANTIS wasm "$1" -o "$2"
}

inline() {
  for f in "$@"; do
    out=$($ENCANTIS test "$f" 2>&1 | tail -1)
    printf 'test %s: %s\n' "$f" "$out"
    case "$out" in *" passed, 0 failed") ;; *) exit 1 ;; esac
  done
}

# --- G1: foundations ---
inline lib/stack.ents lib/vec.ents lib/set.ents lib/map.ents lib/sort.ents lib/text.ents
inline random.ents fmath.ents board.ents keys.ents codes.ents
wasm test/g1.ents test/g1.wasm

# --- G2: the square world (square kernel; weave from builder-v2) ---
inline weave-rng.ents weave-board.ents weave.ents square.ents
wasm test/weave.ents test/weave.wasm
wasm test/g2.ents test/g2.wasm

# --- G3: the Hex offset kernel ---
inline hex.ents
wasm test/g3.ents test/g3.wasm

# --- G4: the Hex woven builder ---
inline lib/fixedvec.ents hexbuild.ents
wasm test/g4.ents test/g4.wasm

# --- G5: full geometry, the routing to the kernels, the hints, the repeated-slide core ---
inline mech.ents assist.ents core-rope.ents
wasm test/g5.ents test/g5.wasm

# --- G7: the core (once it exists) ---
if [ -f core.ents ]; then wasm core.ents core.wasm; fi
