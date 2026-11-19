# The verification of REPORT.md (19 Nov)

Scripts of the independent check in REPORT.md §8. They name their paths absolutely (the worktree
`/home/user/mf-verify`, scratch `/home/user/mf-core-scratch/verify/`, a reference made with
`git archive 9e69e3a`); their output is in `../fixtures/verify/`.

| File | What it does |
| --- | --- |
| `exact-gen.cjs <wasm> js\|port <code> <n> ...` | whole levels of set codes, the real `G.generate` at 9e69e3a against the wasm through `web/generator.js`, every field; in `port` mode Hex levels are checked valid by the JS's kernels instead |
| `quality-verify.cjs --levels [--part k/n]`, `--report` | generation quality of core.wasm against the real JS on set codes of my own (suffixes VQA, VQB, VQP): KS at 1% per class and metric, failure rates, validity, check (c) on square |
| `iso-bench.mjs <engine> <rounds> <out>` | the 120 Journey levels with one engine per fresh process (no other engine's garbage in the heap) |
| `analyze-bench.cjs <dir>` | the report's figures from a bench session's JSON (it reproduces §2 from `../fixtures/measure/`) |
| `journey-diff.cjs` | core.wasm's Journey against the JS's: positions that differ, new and moved maps |
| `sizes.cjs`, `peak.cjs` | §3.1's sizes; the stack peak of the Journey and the custom sample |
| `run-exact.sh`, `run-chain.sh`, `run-bench.sh` | the sessions, run under the lock |
