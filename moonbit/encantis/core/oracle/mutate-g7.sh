#!/bin/bash
# G7's review: how much G7's oracles see. Builds test/g7.wasm once for each seeded change of
# gridgen.ents or gen.ents in mutants-g7-review.cjs, then runs, stopping at the first that fails:
#   units   check-g7-units.cjs (the JS's mode, 2,821 recorded calls; 5 s)
#   uport   check-g7-units.cjs --port (the port's mode; 5 s)
#   parity  parity.mjs on the 135 reference levels through the unchanged glue (a harness; 8 s)
#   jport   check-journey-port.cjs (the port's Journey against its search; 10 s)
#   robust  check-g7-robust.cjs (1 s)
# A mutant is killed when a check fails (or traps, or times out).
#
#   moonbit/encantis/core/oracle/mutate-g7.sh <work dir> [first] [last]
#
# Each mutant is built in its own copy of core/ under the work dir (never in place). One line per
# mutant goes to <work dir>/results.tsv. Run it under the machine's lock for big jobs.
set -u
W=$1
ORA=$(cd "$(dirname "$0")" && pwd)
CORE=$(dirname "$ORA")
ENCANTIS=${ENCANTIS:-"bun /home/user/enc-wt/main/packages/cli/src/cli.ts"}
MUTANTS=mutants-g7-review.cjs
N=$(node -e "console.log(require('$ORA/$MUTANTS').length)")
FIRST=${2:-0}
LAST=${3:-$((N - 1))}
mkdir -p "$W"
for k in $(seq "$FIRST" "$LAST"); do
  name=$(node -e "console.log(require('$ORA/$MUTANTS')[$k][0])")
  rm -rf "$W/c$k" && mkdir -p "$W/c$k" && cp -r "$CORE/." "$W/c$k/" && rm -f "$W/c$k"/test/*.wasm
  if ! node -e "
    const fs = require('fs'), [n, f, o, w] = require('$ORA/$MUTANTS')[$k];
    const s = fs.readFileSync('$CORE/' + f, 'utf8'), i = s.indexOf(o);
    if (i < 0 || s.indexOf(o, i + 1) >= 0) process.exit(2);
    fs.writeFileSync('$W/c$k/' + f, s.slice(0, i) + w + s.slice(i + o.length));"; then
    printf '%s\t%s\tnot-unique\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  M=$W/m$k.wasm
  if ! (cd "$W/c$k" && timeout 120 $ENCANTIS wasm test/g7.ents -o "$M" > "$W/m$k.build" 2>&1); then
    printf '%s\t%s\tno-build\n' "$k" "$name" >> "$W/results.tsv"; continue
  fi
  rm -rf "$W/c$k"
  line="$k	$name"
  killed=""
  timeout 300 node "$ORA/check-g7-units.cjs" --wasm "$M" > "$W/m$k.units" 2>&1 || killed="units"
  if [ -z "$killed" ]; then timeout 300 node "$ORA/check-g7-units.cjs" --port --wasm "$M" > "$W/m$k.uport" 2>&1 || killed="uport"; fi
  if [ -z "$killed" ]; then
    H=$W/h$k; sh "$ORA/setup-harness.sh" "$H" "$M" > /dev/null 2>&1
    (cd "$H/moonbit" && timeout 300 node scripts/parity.mjs /home/user/mf-core-scratch/reference.json wasm all) > "$W/m$k.parity" 2>&1
    tail -1 "$W/m$k.parity" | grep -q '135 match, 0 differ' || killed="parity"
    rm -rf "$H"
  fi
  if [ -z "$killed" ]; then timeout 300 node "$ORA/check-journey-port.cjs" --wasm "$M" > "$W/m$k.jport" 2>&1 || killed="jport"; fi
  if [ -z "$killed" ]; then timeout 300 node "$ORA/check-g7-robust.cjs" --wasm "$M" > "$W/m$k.robust" 2>&1 || killed="robust"; fi
  printf '%s\t%s\n' "$line" "${killed:-SURVIVED}" >> "$W/results.tsv"
done
