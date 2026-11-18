# The woven builder in Encantis, second version

Work in progress: `weave(rng, cfg)` of `../builder/` (v1, written for Encantis
0.2.1), rewritten for the Encantis compiler of creationix/encantis at
57d6e1ad00e6145bf4bb17408ec872949d06d702 (branch claude/generics-modules) and
the container library in `lib/`. v1 stays as it is: the record of 0.2.1.

Build and check:

```
bun <encantis>/packages/cli/src/cli.ts wasm moonbit/encantis/builder-v2/weave.ents -o moonbit/encantis/builder-v2/weave.wasm
node moonbit/encantis/builder/check-weave.cjs moonbit/encantis/builder-v2/weave.wasm
```
