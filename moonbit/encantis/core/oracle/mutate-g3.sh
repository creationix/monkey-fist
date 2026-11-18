#!/bin/bash
# How much G3's oracle sees: builds test/g3.wasm once for each seeded change of hex.ents in
# mutants-g3.cjs, then runs check-g3.cjs on a quarter of the positions of the boards with at
# most 30 ropes, then check-g3-wide.cjs (550 synthetic and aimed boards, 8 s), then --extra on 4
# edge boards (4x4 twice, 4x24, 48x8 with 6 mirrors), and the full check only when those pass. A
# mutant is killed when a check fails (or traps, or times out).
#
#   moonbit/encantis/core/oracle/mutate-g3.sh <work dir> [first] [last]
#   MUTANTS=mutants-g3-review.cjs moonbit/encantis/core/oracle/mutate-g3.sh <work dir>
#
# Each mutant is built in its own copy of core/ under the work dir (never in place). One line
# per mutant goes to <work dir>/results.tsv: index, name, then quick=<exit>, wide=<exit>,
# extra=<exit> and full=<exit> for the runs made, with the first kinds that failed. Run it under
# the machine's lock for big jobs. (mutate-g2.sh's shape.)
set -u
W=$1
ORA=$(cd "$(dirname "$0")" && pwd)
CORE=$(dirname "$ORA")
ENCANTIS=${ENCANTIS:-"bun /home/user/enc-wt/main/packages/cli/src/cli.ts"}
MUTANTS=${MUTANTS:-mutants-g3.cjs}  # or mutants-g3-review.cjs (the review's 15)
N=$(node -e "console.log(require('$ORA/$MUTANTS').length)")
FIRST=${2:-0}
LAST=${3:-$((N - 1))}
mkdir -p "$W"
(cd "$CORE" && $ENCANTIS wasm test/g3.ents -o "$W/base.wasm" > /dev/null)
kinds() { grep -oE '^  [a-z_]+:' "$1" | head -3 | tr -d ' :' | tr '\n' ,; }
for k in $(seq "$FIRST" "$LAST"); do
  name=$(node -e "console.log(require('$ORA/$MUTANTS')[$k][0])")
  rm -rf "$W/c$k" && mkdir -p "$W/c$k" && cp -r "$CORE/." "$W/c$k/" && rm -f "$W/c$k"/test/*.wasm
  if ! node -e "
    const fs = require('fs'), [n, o, w] = require('$ORA/$MUTANTS')[$k];
    const s = fs.readFileSync('$CORE/hex.ents', 'utf8'), i = s.indexOf(o);
    if (i < 0 || s.indexOf(o, i + 1) >= 0) process.exit(2);
    fs.writeFileSync('$W/c$k/hex.ents', s.slice(0, i) + w + s.slice(i + o.length));"; then
    printf '%s\t%s\tnot-unique\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  M=$W/m$k.wasm
  if ! (cd "$W/c$k" && timeout 120 $ENCANTIS wasm test/g3.ents -o "$M" > "$W/m$k.build" 2>&1); then
    printf '%s\t%s\tno-build\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  rm -rf "$W/c$k"
  if cmp -s "$M" "$W/base.wasm"; then printf '%s\t%s\tsame-wasm\n' "$k" "$name" >> "$W/results.tsv"; continue; fi
  line="$k	$name"
  timeout 300 node "$ORA/check-g3.cjs" "$M" --max-ropes 30 --frac 0.25 > "$W/m$k.quick" 2>&1; q=$?
  line="$line	quick=$q($(kinds "$W/m$k.quick"))"
  if [ $q = 0 ]; then
    timeout 300 node "$ORA/check-g3-wide.cjs" "$M" > "$W/m$k.wide" 2>&1; q=$?
    line="$line	wide=$q($(kinds "$W/m$k.wide"))"
  fi
  if [ $q = 0 ]; then
    timeout 300 node "$ORA/check-g3.cjs" "$M" --extra --only X3,X4,X10,X16 > "$W/m$k.extra" 2>&1; e=$?
    line="$line	extra=$e($(kinds "$W/m$k.extra"))"
    if [ $e = 0 ]; then
      timeout 900 node "$ORA/check-g3.cjs" "$M" > "$W/m$k.full" 2>&1; f=$?
      line="$line	full=$f($(kinds "$W/m$k.full"))"
    fi
  fi
  printf '%s\n' "$line" >> "$W/results.tsv"
done
