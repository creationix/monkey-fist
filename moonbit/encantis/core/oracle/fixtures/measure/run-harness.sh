#!/bin/bash
# MoonBit's own tests and parity script, unchanged, through the game's glue, on each Encantis build.
set -u
C=/home/user/mf-core/moonbit/encantis/core; B=/home/user/mf-core-scratch/measure/builds
for w in "$C/core.wasm" "$B/core-O.wasm" "$C/test/g7.wasm" "$B/g7-O.wasm"; do
  n=$(basename $w .wasm); H=/home/user/mf-core-scratch/measure/h-$n
  echo "=================== $n ($w)"
  sh $C/oracle/setup-harness.sh $H $w > /dev/null
  (cd $H/moonbit && node scripts/parity.mjs /home/user/mf-core-scratch/reference.json wasm all 2>&1 | tail -3)
  case $n in core*) export MF_MEASUREMENTS=$C/oracle/fixtures/journey-port-measurements.json ;; *) unset MF_MEASUREMENTS ;; esac
  (cd $H/moonbit && node --test --test-name-pattern=wasm tests/parity.test.cjs tests/generator.test.cjs tests/assist.test.cjs tests/measurements-wasm.test.cjs 2>&1 | grep -E '^not ok|^ok|^# (tests|pass|fail)|^    not ok|^    ok' )
done
