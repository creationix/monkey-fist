#!/bin/sh
# Runs the oracle of every group that has one, against its wasm, for regressions after a
# compiler change (PORT-PLAN.md, rule 3). Build first: ../build.sh.
#
#   moonbit/encantis/core/oracle/check-all.sh
#
# Each check-gN*.cjs (check-gN.cjs, check-gN-wide.cjs, check-g2-weave-big.cjs) runs on its
# default wasm (test/gN.wasm).
# Groups add lines for more (the weave fixture of G2, the harness of G7).
cd "$(dirname "$0")"
fail=0
for c in check-g*.cjs; do
  [ -f "$c" ] || continue
  echo "== $c"
  node "$c" || fail=1
done
# G2: the square kernel on the extra boards (48x48 included), and the woven builder alone
# (test/weave.wasm) on builder's fixture and builder-v2's other seeds and sizes.
echo "== check-g2.cjs --extra"
node check-g2.cjs --extra --no-weave || fail=1
for s in ../../builder/check-weave.cjs ../../builder-v2/other-seeds.cjs ../../builder-v2/other-sizes.cjs; do
  echo "== $(basename $s) test/weave.wasm"
  out=$(node $s ../test/weave.wasm 2>&1) || fail=1
  echo "$out" | grep -v '^  ' | tail -2
done
[ $fail = 0 ] && echo "check-all: every check passed" || echo "check-all: FAILED"
exit $fail
