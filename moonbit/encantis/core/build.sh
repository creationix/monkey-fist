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

# --- G7: the core (once it exists) ---
if [ -f core.ents ]; then wasm core.ents core.wasm; fi
