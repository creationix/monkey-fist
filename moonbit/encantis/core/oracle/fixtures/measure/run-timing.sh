#!/bin/bash
# The measurement session's timings, run under the lock: Node steady (interleaved rounds), Node cold,
# Chromium steady, Chromium cold, the custom sample (bench-g7.mjs --custom).
set -u
H=/home/user/mf-core-scratch/measure/harness; O=/home/user/mf-core-scratch/measure/bench; REF=/home/user/mf-core-scratch/ref-9e69e3a
E=../dist/enc
ENGS=("Encantis core.wasm=$E/core.wasm" "Encantis core -O=$E/core-O.wasm" "Encantis g7 (JS mode)=$E/g7.wasm" "Encantis g7 -O (JS mode)=$E/g7-O.wasm" "Encantis core wasm-opt -O3=$E/core-O3.wasm")
ENCARGS=(); Q=""
for e in "${ENGS[@]}"; do ENCARGS+=(--enc "$e"); Q="$Q&enc=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$e")"; done
NAMES=("JS reference" "MoonBit wasm-gc" "MoonBit JS"); for e in "${ENGS[@]}"; do NAMES+=("${e%%=*}"); done
echo "start $(date +%T) load $(cat /proc/loadavg)"
cd $H/moonbit/scripts
echo "== node steady $(date +%T)"
node bench-node.mjs $REF 120 --rounds 6 --kernel-reps 5 --out $O/node-steady.json "${ENCARGS[@]}"
echo "== node cold $(date +%T) load $(cat /proc/loadavg)"
rm -f $O/node-cold.jsonl
for rep in 1 2 3 4 5; do for n in "${NAMES[@]}"; do node bench-node.mjs $REF --cold "$n" --out $O/node-cold.jsonl "${ENCARGS[@]}"; done; done
cd $H/moonbit/bench
echo "== chromium steady $(date +%T) load $(cat /proc/loadavg)"
GEN_ONLY=1 OUT=$O/chromium-steady.json BENCH_QUERY="rounds=6$Q" CHROMIUM_PATH=/opt/pw-browsers/chromium node browser.mjs http://127.0.0.1:4186/ http://127.0.0.1:4187/
echo "== chromium cold $(date +%T) load $(cat /proc/loadavg)"
rm -f $O/chromium-cold.jsonl
for rep in 1 2 3 4 5; do for n in "${NAMES[@]}"; do
  GEN_ONLY=1 OUT=$O/cold-tmp.json BENCH_QUERY="cold=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$n")$Q" CHROMIUM_PATH=/opt/pw-browsers/chromium node browser.mjs http://127.0.0.1:4186/ http://127.0.0.1:4187/ | tail -1
  node -e 'const o=require(process.argv[1]); console.log(JSON.stringify({browser:o.browser, ...o.generation}))' $O/cold-tmp.json >> $O/chromium-cold.jsonl
done; done
echo "== custom sample (bench-g7.mjs --custom, 6 rounds) $(date +%T) load $(cat /proc/loadavg)"
node /home/user/mf-core/moonbit/encantis/core/oracle/bench-g7.mjs 6 --custom --out $O/custom-g7.jsonl
echo "end $(date +%T) load $(cat /proc/loadavg)"
