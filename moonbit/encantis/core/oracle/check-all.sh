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
  [ "$c" = check-g3-review.cjs ] && continue  # run below, on a share of its positions
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
# G3: the Hex kernel on the extra boards (48x48 included). check-g3.cjs and check-g3-wide.cjs run
# in the loop above (about 210 s and 8 s; check-g3's JS is most of it: C15's fewest at 6,000).
echo "== check-g3.cjs --extra"
node check-g3.cjs --extra || fail=1
# G3's review: the game's and the generator's own calls (solve 5000, par, small fewest budgets,
# casual x32 at the generator's seeds) on 214 boards, 160 of them generated Hex levels. In full
# it takes about 400 s (the JS's fewest at 6,000 on 48x48 boards); a quarter here.
echo "== check-g3-review.cjs --frac 0.25"
node check-g3-review.cjs --frac 0.25 || fail=1
# G4: the Hex woven builder in its draw-exact mode on the 250 recorded builds (about 17 s),
# with 2 other seeds per cfg against the live JS, and hex_build as the core runs it (fewer
# draws) checked valid by the JS's kernels on 2 more seeds per cfg (the quality oracle's builder
# part; its distributions are printed too, the whole-level part is quality-hexbuild.cjs --levels).
echo "== check-hexbuild.cjs --seeds 2"
node check-hexbuild.cjs --seeds 2 || fail=1
echo "== quality-hexbuild.cjs --builder --seeds 2"
node quality-hexbuild.cjs --builder --seeds 2 | grep -v '^  ' || fail=1
[ $fail = 0 ] && echo "check-all: every check passed" || echo "check-all: FAILED"
exit $fail
