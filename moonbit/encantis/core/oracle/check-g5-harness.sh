#!/bin/sh
# G5: the hints through the game's own glue. Builds a harness (setup-harness.sh) whose
# dist/gen.wasm is test/g5.wasm (guide and features, gen.mbt's exports) and runs, unchanged:
#   moonbit/tests/assist.test.cjs --test-name-pattern=wasm   521 positions, 2,084 checks
#   moonbit/encantis/solver/check.cjs                         its "moonbit wasm-gc" side is the port:
#                                                             against the old Encantis solver and MoonBit's JS build
# and moonbit/encantis/check-features.cjs on a copy with one substitution: its boards come from
# MFGame.generate instead of gen.generate (the port has no generate before G7; the Journey levels
# are the same), so that its "MoonBit" column is the port's reachableFeatures against the JS's.
#
#   moonbit/encantis/core/oracle/check-g5-harness.sh [gen.wasm] [harness dir]
set -e
cd "$(dirname "$0")"
SRC=$(cd ../../../.. && pwd)
WASM=$(realpath "${1:-../test/g5.wasm}")
H=${2:-$(mktemp -d)/harness}
sh ./setup-harness.sh "$H" "$WASM" "$SRC/moonbit/dist/mf.wasm" >/dev/null
mkdir -p "$H/moonbit/encantis"
cp -r "$SRC/moonbit/encantis/solver" "$H/moonbit/encantis/"
cp "$SRC/moonbit/encantis/features.wasm" "$H/moonbit/encantis/"
n=$(grep -c 'gen\.generate(' "$SRC/moonbit/encantis/check-features.cjs")
[ "$n" = 2 ] || { echo "check-features.cjs: expected 2 gen.generate( calls, found $n"; exit 1; }
sed 's/gen\.generate(/MFGame.generate(/g' "$SRC/moonbit/encantis/check-features.cjs" > "$H/moonbit/encantis/check-features.cjs"
fail=0
echo "-- assist.test.cjs (wasm)"
out=$(cd "$H/moonbit" && node --test --test-name-pattern=wasm tests/assist.test.cjs 2>&1) || fail=1
echo "$out" | grep -E '^(ok|not ok) |^# (pass|fail)'
echo "-- solver/check.cjs (the moonbit wasm-gc side is the port)"
out=$(cd "$H" && node moonbit/encantis/solver/check.cjs 2>&1) || fail=1
echo "$out"
echo "$out" | grep -q ' 0 mismatches$' || fail=1
echo "$out" | grep -E 'mismatches' | grep -vq ' 0 mismatches' && fail=1
echo "-- check-features.cjs (its MoonBit column is the port; boards from MFGame.generate)"
out=$(cd "$H" && node moonbit/encantis/check-features.cjs 2>&1) || fail=1
echo "$out"
echo "$out" | grep -q 'Encantis 0 mismatches vs JS, MoonBit 0;' || fail=1
[ $fail = 0 ] && echo "check-g5-harness: every check passed" || echo "check-g5-harness: FAILED"
exit $fail
