#!/bin/sh
# Runs the oracle of every group that has one, against its wasm, for regressions after a
# compiler change (PORT-PLAN.md, rule 3). Build first: ../build.sh.
#
#   moonbit/encantis/core/oracle/check-all.sh
#
# Each check-gN.cjs (and check-gN-wide.cjs) runs on its default wasm (test/gN.wasm).
# Groups add lines for more (the weave fixture of G2, the harness of G7).
cd "$(dirname "$0")"
fail=0
for c in check-g*.cjs; do
  [ -f "$c" ] || continue
  echo "== $c"
  node "$c" || fail=1
done
[ $fail = 0 ] && echo "check-all: every check passed" || echo "check-all: FAILED"
exit $fail
