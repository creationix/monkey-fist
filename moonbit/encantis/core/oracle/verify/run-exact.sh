#!/bin/bash
# Verification: exact parity reruns with seeds of my own (run under the lock).
set -u
export MF_REF=/home/user/mf-core-scratch/verify/ref-9e69e3a
V=/home/user/mf-core-scratch/verify; C=/home/user/mf-verify/moonbit/encantis/core; O=$C/oracle
cd $O
run() { echo "== $* ($(date +%T))"; timeout 3600 "$@" 2>&1 | tail -${TAILN:-6}; echo "exit ${PIPESTATUS[0]}"; }
SQ="U3-S-1-100-12-12-60-MS-VFYS1 60 U3-S-1-100-6-8-60-N-VFYS2 60 U3-S-1-100-20-20-20-M-VFYS3 20 U3-S-1-100-24-8-20-S-VFYS4 20 U3-S-1-100-32-32-4-MSC-VFYS5 4"
HX="U3-H-1-100-10-10-60-S-VFYH1 60 U3-H-1-100-14-12-60-MS-VFYH2 60 U3-H-1-100-24-24-20-M-VFYH3 20 U3-H-1-100-6-20-30-N-VFYH4 30 U3-H-1-100-32-32-4-MSC-VFYH5 4 U3-M-1-100-16-12-40-MS-VFYM1 40"
run node $V/exact-gen.cjs $C/test/g7.wasm js $SQ $HX
run node $V/exact-gen.cjs $C/core.wasm port $SQ $HX
echo "== negative control: core.wasm compared exactly on a Hex code must differ"
TAILN=3 run node $V/exact-gen.cjs $C/core.wasm js U3-H-1-100-10-10-60-S-VFYH1 5
run node check-g1-wide.cjs
run node check-g2-wide.cjs --seed 91357
run node check-g3-wide.cjs --seed 24680
run node check-g6-fuzz.cjs --seed 7 --boards 2000
run node check-g6-fuzz.cjs --seed 8 --boards 2000
run node check-core-rope.cjs --wide 4000 --seed 777
TAILN=14 run node check-hexbuild-shadow.cjs --suffix VF --per 2
run node check-g7-units.cjs
run node check-g7-units.cjs --port
run node check-g7-robust.cjs --wasm ../core.wasm
run node check-g7-robust.cjs
run node check-journey-port.cjs
run node check-g7-review-assist.cjs --codes U3-H-1-100-12-12-12-MS-VFYA1,U3-H-1-100-20-20-6-M-VFYA2,U3-M-1-100-10-14-12-S-VFYA3
for w in core g7; do
  H=$V/h-$w; [ $w = core ] && W=$C/core.wasm || W=$C/test/g7.wasm
  sh ./setup-harness.sh $H $W > /dev/null
  echo "== harness $w: parity.mjs ($(date +%T))"
  (cd $H/moonbit && node scripts/parity.mjs /home/user/mf-core-scratch/reference.json wasm all 2>&1 | tail -1)
  [ $w = core ] && export MF_MEASUREMENTS=$O/fixtures/journey-port-measurements.json || unset MF_MEASUREMENTS
  (cd $H/moonbit && node --test --test-name-pattern=wasm tests/parity.test.cjs tests/generator.test.cjs tests/assist.test.cjs tests/measurements-wasm.test.cjs 2>&1 | grep -E '^not ok|^ok|^# (tests|pass|fail)')
done
echo "== done $(date +%T)"
