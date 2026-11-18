#!/bin/bash
# How much G2's oracles see (G2's review): builds test/g2.wasm once for each seeded change of
# square.ents in mutants-g2.cjs, then runs check-g2.cjs on a quarter of its positions and
# check-g2-wide.cjs on 150 synthetic boards (with the aimed ones), and the full checks only
# when those pass. A mutant is killed when a check fails (or times out).
#
#   moonbit/encantis/core/oracle/mutate-g2.sh <work dir> [first] [last]
#
# Each mutant is built in its own copy of core/ under the work dir (never in place). One line
# per mutant goes to <work dir>/results.tsv: index, name, then g2=<exit>(<run> <first kinds
# that failed>) and wide=<exit>(...). About an hour for all 55; run it under the machine's
# lock for big jobs.
set -u
W=$1
ORA=$(cd "$(dirname "$0")" && pwd)
CORE=$(dirname "$ORA")
ENCANTIS=${ENCANTIS:-"bun /home/user/enc-wt/main/packages/cli/src/cli.ts"}
N=$(node -e "console.log(require('$ORA/mutants-g2.cjs').length)")
FIRST=${2:-0}
LAST=${3:-$((N - 1))}
mkdir -p "$W"
(cd "$CORE" && $ENCANTIS wasm test/g2.ents -o "$W/base.wasm" > /dev/null)
kinds() { grep -oE '^  [a-z]+:' "$1" | head -3 | tr -d ' :' | tr '\n' ,; }
for k in $(seq "$FIRST" "$LAST"); do
  name=$(node -e "console.log(require('$ORA/mutants-g2.cjs')[$k][0])")
  rm -rf "$W/c$k" && mkdir -p "$W/c$k" && cp -r "$CORE/." "$W/c$k/" && rm -f "$W/c$k"/test/*.wasm
  if ! node -e "
    const fs = require('fs'), [n, o, w] = require('$ORA/mutants-g2.cjs')[$k];
    const s = fs.readFileSync('$CORE/square.ents', 'utf8'), i = s.indexOf(o);
    if (i < 0 || s.indexOf(o, i + 1) >= 0) process.exit(2);
    fs.writeFileSync('$W/c$k/square.ents', s.slice(0, i) + w + s.slice(i + o.length));"; then
    printf '%s\t%s\tnot-unique\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  M=$W/m$k.wasm
  if ! (cd "$W/c$k" && timeout 120 $ENCANTIS wasm test/g2.ents -o "$M" > "$W/m$k.build" 2>&1); then
    printf '%s\t%s\tno-build\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  if cmp -s "$M" "$W/base.wasm"; then printf '%s\t%s\tsame-wasm\n' "$k" "$name" >> "$W/results.tsv"; continue; fi
  timeout 120 node "$ORA/check-g2.cjs" "$M" --no-weave --frac 0.25 > "$W/m$k.g2" 2>&1; g2=$?; g2run=quarter
  if [ $g2 = 0 ]; then timeout 300 node "$ORA/check-g2.cjs" "$M" --no-weave > "$W/m$k.g2" 2>&1; g2=$?; g2run=full; fi
  timeout 120 node "$ORA/check-g2-wide.cjs" "$M" --boards 150 --no-generated > "$W/m$k.wide" 2>&1; wide=$?; wrun=150
  if [ $wide = 0 ]; then timeout 300 node "$ORA/check-g2-wide.cjs" "$M" > "$W/m$k.wide" 2>&1; wide=$?; wrun=full; fi
  printf '%s\t%s\tg2=%s(%s %s)\twide=%s(%s %s)\n' "$k" "$name" $g2 $g2run "$(kinds "$W/m$k.g2")" $wide $wrun "$(kinds "$W/m$k.wide")" >> "$W/results.tsv"
done
