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
# (its status, not grep's: a pipe's status is its last command's, which hid a failing builder part)
out=$(node quality-hexbuild.cjs --builder --seeds 2 2>&1) || fail=1
echo "$out" | grep -v '^  '
# G4's review: the exact check on every H.build the generator makes for 22 codes the fixture lacks
# (2 levels each), on 32 cfgs the generator never makes (2 states each), and departure D2's
# free-cell list in a probe build that asserts it (a minute in all).
echo "== check-hexbuild-shadow.cjs --per 2"
out=$(node check-hexbuild-shadow.cjs --per 2 2>&1) || fail=1
echo "$out" | head -14
echo "== check-hexbuild-edges.cjs --states 2"
out=$(node check-hexbuild-edges.cjs --states 2 2>&1) || fail=1
echo "$out" | head -22
echo "== check-hexbuild-d2.cjs --seeds 1"
node check-hexbuild-d2.cjs --seeds 1 || fail=1
# G5: check-g5.cjs runs in the loop above (15 s with the JS's answers cached in
# /home/user/mf-core-scratch/g5/cache; about 10 minutes more to fill the cache on a fresh machine).
# The repeated-slide core on its recorded calls and 3,000 random ones, and the hints through the
# game's glue (assist.test, solver/check, check-features in a harness on test/g5.wasm; about 2 minutes).
echo "== check-core-rope.cjs"
node check-core-rope.cjs || fail=1
echo "== check-g5-harness.sh"
sh ./check-g5-harness.sh || fail=1
# G5's review: check-g5's battery on the 440 boards of four fixtures (to 48x48, 174 with spinners),
# with the game's auto-solve (guide 5,000, no preferred order) and the generator's minimumTaps.
# Seconds with the JS's answers cached in /home/user/mf-core-scratch/review-g5/cache; about an hour
# of JS to fill on a fresh machine (check-g5-review.cjs --fill --part i/3 in three workers).
echo "== check-g5-review.cjs"
node check-g5-review.cjs || fail=1
echo "== check-g5-budgets.cjs"
node check-g5-budgets.cjs || fail=1
echo "== stress-g5-stack.cjs (5 positions a board)"
out=$(node stress-g5-stack.cjs ../test/g5.wasm 5 2>&1) || fail=1  # (its status, not tail's)
echo "$out" | tail -1
# G6: check-g6.cjs runs in the loop above (all its parts: the 135 reference boards, boards derived
# from their plans, broken copies, the recorded calls and the Journey's stored measurements; 5 s with
# the JS's answers cached in /home/user/mf-core-scratch/g6/cache, about 4 minutes of JS to fill).
# Here the 79 boards of g1-extra (to 48x48 with spinners) too, cached the same way (longer to fill).
echo "== check-g6.cjs --extra --parts direct,derived"
node check-g6.cjs --extra --parts direct,derived || fail=1
# G6's review: check-g6's battery on the 361 boards of the g2, g3 and g5 fixtures, with random tap
# sequences, junk taps and casual play at new seeds (seconds with the JS's answers cached in
# /home/user/mf-core-scratch/review-g6/cache; about 25 minutes of JS in three workers to fill:
# check-g6-review.cjs --fill --part i/3), and casual play's step limit on synthetic boards (1 s).
echo "== check-g6-review.cjs"
node check-g6-review.cjs || fail=1
echo "== check-g6-limits.cjs"
out=$(node check-g6-limits.cjs 2>&1) || fail=1
echo "$out" | tail -1
[ $fail = 0 ] && echo "check-all: every check passed" || echo "check-all: FAILED"
exit $fail
