# The G7 review's probes

Small scripts the review of G7 used to look further than its oracles (DX-LOG, "review of G7"). They
read the review's rows where noted (`/home/user/mf-core-scratch/review-g7/quality*`, made by
`../quality-g7-review.cjs`) and otherwise run on test/g7.wasm and the JS at 9e69e3a.

| Script | What |
| --- | --- |
| `mutant-reach.cjs <mutant.wasm> <codes...> [--port]` | levels of set codes where a mutant (mutate-g7.sh's `m<k>.wasm`) differs from test/g7.wasm |
| `mutant-reach-spec.cjs <mutant.wasm> [n]` | the same on small requireSlide specs (the Journey's chapter 1) |
| `spinner-index.cjs <codes...>` | which candidate cell wins in the JS's addSpinners (tryCells), over its own calls |
| `search-budget.cjs <codes...>` | how much of searchSpinner's node budget the JS's solves use |
| `deep-class.cjs <class> <js sfx> <port sfx> [--out f] [--in f,...]` | one class at many more seeds a side |
| `replicates.cjs <classes...>` | the replicate sets P2 against A+B, and P+P2 against A+B |
| `exchangeable.cjs` | over every class and metric: is D(A,B) the smallest of the three a third of the time |
| `direction.cjs [metrics]` | the sign of P - (A+B)/2 per class, and all Hex classes pooled |
| `diversity.cjs <classes...>` | distinct maps per set |
