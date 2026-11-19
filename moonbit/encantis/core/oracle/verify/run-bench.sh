#!/bin/bash
# Verification timings, under the lock: (1) Node interleaved (the extended bench-node.mjs, 6 rounds, 8 engines);
# (2) Node isolated (iso-bench.mjs: one engine per fresh process, 6 rounds, engines alternated, 2 processes each);
# (3) Node cold (bench-node --cold, 5 fresh processes per engine, interleaved); (4) Chromium interleaved (6 rounds);
# (5) Chromium cold (5 fresh browsers per engine); (6) compile times (compile-times.mjs, 5 rounds) + hover on gridgen.
set -u
V=/home/user/mf-core-scratch/verify; H=$V/hbench; O=$V/bench; REF=$V/ref-9e69e3a; E=../dist/enc
ENGS=("Encantis core.wasm=$E/core.wasm" "Encantis core -O=$E/core-O.wasm" "Encantis g7 (JS mode)=$E/g7.wasm" "Encantis g7 -O (JS mode)=$E/g7-O.wasm" "Encantis core wasm-opt -O3=$E/core-O3.wasm")
ENCARGS=(); Q=""
for e in "${ENGS[@]}"; do ENCARGS+=(--enc "$e"); Q="$Q&enc=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$e")"; done
COLD=("JS reference" "MoonBit wasm-gc" "MoonBit JS" "Encantis core.wasm" "Encantis g7 (JS mode)" "Encantis g7 -O (JS mode)")
enc_q() { node -e 'console.log(encodeURIComponent(process.argv[1]))' "$1"; }
echo "start $(date +%T) load $(cat /proc/loadavg)"
STEP=${STEP:-123456}
cd $H/moonbit/scripts
if [[ $STEP == *1* ]]; then
echo "== (1) node interleaved $(date +%T)"
timeout 3600 node bench-node.mjs $REF 120 --rounds 6 --kernel-reps 5 --out $O/node-steady.json "${ENCARGS[@]}" 2>&1 | grep -v "^L[0-9]"
fi
if [[ $STEP == *2* ]]; then
echo "== (2) node isolated $(date +%T) load $(cat /proc/loadavg)"
rm -f $O/node-iso.jsonl
for rep in 1 2; do for e in $H/moonbit/dist/enc/core.wasm $H/moonbit/dist/enc/g7.wasm mbwasm mbjs; do timeout 1200 node $V/iso-bench.mjs $e 6 $O/node-iso.jsonl; done; done
timeout 2400 node $V/iso-bench.mjs js 3 $O/node-iso.jsonl
fi
if [[ $STEP == *3* ]]; then
echo "== (3) node cold $(date +%T) load $(cat /proc/loadavg)"
rm -f $O/node-cold.jsonl
for rep in 1 2 3 4 5; do for n in "${COLD[@]}"; do timeout 300 node bench-node.mjs $REF --cold "$n" --out $O/node-cold.jsonl "${ENCARGS[@]}" > /dev/null; done; done
fi
cd $H/moonbit/bench
if [[ $STEP == *4* ]]; then
echo "== (4) chromium interleaved $(date +%T) load $(cat /proc/loadavg)"
GEN_ONLY=1 OUT=$O/chromium-steady.json BENCH_QUERY="rounds=6$Q" CHROMIUM_PATH=/opt/pw-browsers/chromium timeout 3600 node browser.mjs http://127.0.0.1:4196/ http://127.0.0.1:4197/
fi
if [[ $STEP == *5* ]]; then
echo "== (5) chromium cold $(date +%T) load $(cat /proc/loadavg)"
rm -f $O/chromium-cold.jsonl
for rep in 1 2 3 4 5; do for n in "${COLD[@]}"; do
  GEN_ONLY=1 OUT=$O/cold-tmp.json BENCH_QUERY="cold=$(enc_q "$n")$Q" CHROMIUM_PATH=/opt/pw-browsers/chromium timeout 600 node browser.mjs http://127.0.0.1:4196/ http://127.0.0.1:4197/ > /dev/null
  node -e 'const o=require(process.argv[1]); console.log(JSON.stringify({browser:o.browser, ...o.generation}))' $O/cold-tmp.json >> $O/chromium-cold.jsonl
done; done
fi
if [[ $STEP == *6* ]]; then
echo "== (6) compile times $(date +%T) load $(cat /proc/loadavg)"
timeout 3600 node /home/user/mf-verify/moonbit/encantis/core/oracle/compile-times.mjs $V/mbt 5 --out $O/compile-times.json 2>&1 | tail -20
cd /home/user/mf-verify/moonbit/encantis/core
L=$(grep -n "^export func grid_generate" gridgen.ents | cut -d: -f1)
for k in 1 2 3; do s=$(date +%s%N); bun /home/user/enc-wt/main/packages/cli/src/cli.ts hover gridgen.ents:$L:grid_generate > /dev/null; e=$(date +%s%N); echo "hover gridgen.ents:$L:grid_generate $(( (e-s)/1000000 )) ms"; done
fi
echo "end $(date +%T) load $(cat /proc/loadavg)"
