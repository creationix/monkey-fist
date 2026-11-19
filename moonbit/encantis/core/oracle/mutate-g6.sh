#!/bin/bash
# G6's review: how much G6's oracles see. Builds test/g6.wasm once for each seeded change of
# play.ents or metrics.ents in mutants-g6-review.cjs, then runs check-g6-limits.cjs (1 s),
# check-g6.cjs (all parts, 6 s) and check-g6-review.cjs (the 361 fixture boards, cached; about
# 30 s) in turn, stopping at the first that fails. A mutant is killed when a check fails (or
# traps, or times out).
#
#   moonbit/encantis/core/oracle/mutate-g6.sh <work dir> [first] [last]
#
# Each mutant is built in its own copy of core/ under the work dir (never in place). One line per
# mutant goes to <work dir>/results.tsv: index, name, then limits=<exit>, g6=<exit>,
# review=<exit> for the runs made, with the first kinds that failed. Run it under the machine's
# lock for big jobs. (mutate-g3.sh's shape.)
set -u
W=$1
ORA=$(cd "$(dirname "$0")" && pwd)
CORE=$(dirname "$ORA")
ENCANTIS=${ENCANTIS:-"bun /home/user/enc-wt/main/packages/cli/src/cli.ts"}
MUTANTS=mutants-g6-review.cjs
N=$(node -e "console.log(require('$ORA/$MUTANTS').length)")
FIRST=${2:-0}
LAST=${3:-$((N - 1))}
mkdir -p "$W"
for k in $(seq "$FIRST" "$LAST"); do
  name=$(node -e "console.log(require('$ORA/$MUTANTS')[$k][0])")
  file=$(node -e "console.log(require('$ORA/$MUTANTS')[$k][1])")
  rm -rf "$W/c$k" && mkdir -p "$W/c$k" && cp -r "$CORE/." "$W/c$k/" && rm -f "$W/c$k"/test/*.wasm
  if ! node -e "
    const fs = require('fs'), [n, f, o, w] = require('$ORA/$MUTANTS')[$k];
    const s = fs.readFileSync('$CORE/' + f, 'utf8'), i = s.indexOf(o);
    if (i < 0 || s.indexOf(o, i + 1) >= 0) process.exit(2);
    fs.writeFileSync('$W/c$k/' + f, s.slice(0, i) + w + s.slice(i + o.length));"; then
    printf '%s\t%s\tnot-unique\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  M=$W/m$k.wasm
  if ! (cd "$W/c$k" && timeout 120 $ENCANTIS wasm test/g6.ents -o "$M" > "$W/m$k.build" 2>&1); then
    printf '%s\t%s\tno-build\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  line="$k	$name"
  timeout 120 node "$ORA/check-g6-limits.cjs" "$M" > "$W/m$k.limits" 2>&1; e=$?
  line="$line	limits=$e"
  if [ $e = 0 ]; then
    timeout 300 node "$ORA/check-g6.cjs" "$M" > "$W/m$k.g6" 2>&1; e=$?
    line="$line	g6=$e"
    [ $e != 0 ] && line="$line ($(grep -oE '^  [a-zA-Z]+:' "$W/m$k.g6" | head -3 | tr -d ' :' | tr '\n' ,))"
  fi
  if [ $e = 0 ]; then
    timeout 900 node "$ORA/check-g6-review.cjs" "$M" > "$W/m$k.review" 2>&1; e=$?
    line="$line	review=$e"
    [ $e != 0 ] && line="$line ($(grep -oE '^  [a-zA-Z]+:' "$W/m$k.review" | head -3 | tr -d ' :' | tr '\n' ,))"
  fi
  printf '%s\n' "$line" >> "$W/results.tsv"
  rm -rf "$W/c$k"
done
echo "done: $W/results.tsv"
