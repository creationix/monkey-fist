#!/bin/bash
# Under the lock: exact-gen with the corrected codes (g7 JS mode, core port mode, the negative control), then the
# quality comparison on my own seeds (3 workers), then its report.
set -u
export MF_REF=/home/user/mf-core-scratch/verify/ref-9e69e3a
V=/home/user/mf-core-scratch/verify; C=/home/user/mf-verify/moonbit/encantis/core
cd $V
SQ="U3-S-1-100-12-12-60-MS-VFYS1 60 U3-S-1-100-6-8-60-N-VFYS2 60 U3-S-1-100-20-20-20-M-VFYS3 20 U3-S-1-100-24-8-20-S-VFYS4 20 U3-S-1-100-32-32-4-MSC-VFYS5 4"
HX="U3-H-1-100-10-10-60-S-VFYH1 60 U3-H-1-100-14-12-60-MS-VFYH2 60 U3-H-1-100-24-24-20-M-VFYH3 20 U3-H-1-100-6-20-30-N-VFYH4 30 U3-H-1-100-32-32-4-MSC-VFYH5 4 U3-M-1-100-16-12-40-MS-VFYM1 40"
echo "== exact-gen g7 js $(date +%T)"; timeout 3600 node exact-gen.cjs $C/test/g7.wasm js $SQ $HX 2>&1 | tail -15
echo "== exact-gen core port $(date +%T)"; timeout 3600 node exact-gen.cjs $C/core.wasm port $SQ $HX 2>&1 | tail -15
echo "== negative control $(date +%T)"; timeout 600 node exact-gen.cjs $C/core.wasm js U3-H-1-100-10-10-60-S-VFYH1 5 2>&1 | tail -3
echo "== quality levels $(date +%T)"
for k in 0 1 2; do timeout 5400 node quality-verify.cjs --levels --part $k/3 > quality-part$k.log 2>&1 & done; wait
echo "== quality report $(date +%T)"; node quality-verify.cjs --report > quality-report.txt 2>&1; tail -3 quality-report.txt
echo "== chain done $(date +%T)"
