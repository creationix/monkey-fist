# Monkey Fist in MoonBit: port report

**Short answer.** The whole generator core is ported to MoonBit. It reproduces the
JS game exactly: all 120 Journey levels and a 15-case custom sample match, on both
the wasm-gc and JS backends. A playable slice runs one Journey level at a time on
both grids, with game logic in MoonBit and about 200 lines of JS glue.

The wasm-gc build generates the Journey about **7× faster** than the JS (Chromium:
59 ms vs 412 ms per level on average). Most of that gain comes from data
representation, not the language. Where the JS already uses typed arrays, or once
the JS hot path is rewritten with the same integer representation, wasm-gc is
about **1.3–2×** faster. MoonBit's JS backend is no faster than hand-written JS, and 10–25% slower on the fairest comparison.

The MoonBit source is the **same size** as the JS it replaces: about 35k tokens
and about 1,290 decision points each. I don't recommend switching the game to
MoonBit; the recommendation section explains why and what to do instead.

Reference for every comparison: commit `9e69e3a` on main. Toolchain: moon
0.1.20261104 and moonc v0.10.20; Node 22.23.4; Chromium 153 (headless, software
rendering, Linux container).

## 1. What was ported, and what wasn't

### Ported: the generator core (`src/core`, about 35k tokens)

| JS (9e69e3a) | MoonBit | Notes |
| --- | --- | --- |
| `random.js` | `random.mbt` | mulberry32, FNV-1a `hashString`, base 36; bit-identical (unit-tested against V8 values) |
| `levels.js` offset kernels | `square.mbt` | tracks (`rayCells`), slide/place, relaxation, frozen ropes, solver, `fewestPlayerTaps`, `postponeExits`, replay, casual playouts, loops |
| `levels.js` builder | `weave.mbt` | the whole woven builder: intention board, lay/knot/trap, knot spots, seeded cores, packing, `finished` checks |
| `hex/engine.js` | `hex.mbt` | Hex kernels and the Hex woven builder (mutual-wait pairs, strands, traps, aimed mirrors) |
| `mechanics.js`, `hex/mechanics.js` | `mech.mbt` | full-geometry tap and route, mirrors, spinners, both full-path solvers; game-engine's kernel routing (`tracked`), `replay`, `solve`, `allFree`, `frozenRopes`, `minimumTaps` |
| `dependency-metrics.js` | `metrics.mbt` | the `interaction` score that selection reads, including SCCs, transitive reduction and coupled groups |
| `grid-generator.js` | `gridgen.mbt` | candidates, repeated-slide core, mirror placement, spinners, par scoring, feature checks, casual rate and selection |
| `game-engine.js` | `engine.mbt` | set codes (parse and format), level specs, `layoutKey` (the same JSON text, hashed), `generate` |
| `grid-journey.js` | `journey.mbt` | generated from `grid-journey.js` by `scripts/gen-journey.cjs` |

### Not ported from the core (about 2.2k JS tokens, about 6%)

Nothing on the generation or play path uses these:

- `levels.js`: `ray`, `occupancy`, `advance`, `deadRopes`, `fewestTaps`.
- The trim-and-transpose branch of `finished`. It never runs, because the grid
  generator always keeps bounds.
- `mechanics.js`: `replay`, `score` and `minimum`. game-engine has its own
  versions of these.
- The descriptive outputs of `dependency-metrics.js` (edges, forks, depth and so
  on), which nothing selects on.
- Some stats fields of `grid-generator.js`: `constructionStats` and the
  repeated/interleaved counts. They are only compared against spec minimums that
  no Journey or Custom spec sets.
- `game-engine.js`: `reachableFeatures` (the feature fade-out), `normalize` for
  free-form custom options, and `available`/`unlock` (chapter locks).

### Ported: a playable vertical slice of the app layer (`src/game`, about 7.4k tokens)

The slice runs one Journey level end to end, on both grids:

- Full-geometry taps with animated routes.
- Queued moves with the shared-path traffic gating from `app.js`
  (`prepareTraffic`/`motionLimit`).
- Automatic release, and the lost (knotted) state.
- Undo (3, +1 tap each), hints (+2), auto-solve (0 stars) and stars at par.
- Camera fit for square and Hex.
- Hit-testing taps against rope polylines.
- A display list for Canvas2D.
- The sound design of `sounds.js`: every effect's voices, pitches, timings and
  rate limits are computed in MoonBit, and the glue only synthesizes them.
- Hints and replanning come from a synchronous solve in MoonBit, with no worker.

The JS glue (`web/game.js` and `web/mf-core.js`, about 3.9k tokens) does the
Canvas2D stroking, Web Audio nodes, pointer and button events, localStorage (best
stars) and the level picker. Open `moonbit/index.html` and choose a level;
`?engine=js` forces the JS build.

### Not ported from the app layer

- Braided rope art (`rope-art.js`): ropes are drawn as plain strokes with a dashed
  core.
- Music (`music.js`).
- Zoom, pan and pinch (`input.js`).
- Keyboard selection.
- Menus, the Custom set editor, chapters and unlocks.
- Feature fade-out.
- The spinner flip animation: a bouncing rope jumps to its reversed position.
- Reduced motion, fullscreen, dark mode, graphics mode and the service worker.

Generation runs on the main thread. It is fast enough (at most about 200 ms for
a Journey level in Chromium), but a worker would still be the right home for
colossal maps.

## 2. Parity

`tests/parity.test.cjs` checks the following against `scripts/grid-journey-measurements.json`
and `tests/custom-expected.json` (dumped from the JS at 9e69e3a by
`scripts/dump-reference.cjs`). `scripts/parity.mjs` compares full boards field
by field.

| Set | Cases | wasm-gc | JS backend |
| --- | ---: | --- | --- |
| Journey (`J3-MONKEYFIST`), levels 1–120 | 120 | 120/120 identical | 120/120 identical |
| Custom sample | 15 | 15/15 identical | 15/15 identical |

"Identical" means the same ropes, mirrors, spinners, plan, par, `exact` flag and
`layoutKey`.

The custom sample (`scripts/cases.cjs`) covers:

- square only, Hex only and mixed sets;
- plain boards, mirrors, spinners and both;
- sizes 4×5, 6×8, 8×10, 9×12, 10×14, 12×16, 16×20, 20×24 and 24×24;
- difficulties from 1 to 100;
- two colossal maps: square 40×40 with mirrors and spinners, and Hex 32×32 with
  mirrors.

Parity held on the first complete run. The semantics that needed care:

- **32-bit hashing.** `Math.imul` and `>>>` map directly onto MoonBit's wrapping
  `Int` and `UInt`.
- **`Math.pow`.** On the wasm-gc backend, MoonBit's `@math.pow` is an fdlibm
  port. It matched V8 on every value the generator uses, which is unit-tested,
  but bit-identity isn't guaranteed in general. On the JS backend it compiles to
  `Math.pow`.
- **`Math.round`.** MoonBit's `Double::round` rounds halves up, as JS does, on
  both backends.
- **`Math.floor` of negatives.** Hex `floor(r / 2)` uses an explicit `floor_div`.
- **Sort stability.** MoonBit's `stable_sort_by` matches V8's TimSort, since every
  comparator here is consistent.
- **Insertion order.** MoonBit's `Map` is insertion-ordered like a JS `Map`. The
  builders depend on that, for example when picking idle mirrors.
- **`Number(x.toFixed(4))`.** The selection score reads this. It is emulated with
  scale-and-round. That can differ from the exact-decimal rule within about one
  ulp of a tie, which didn't happen in any tested case.
- **Eager evaluation.** `map(...).find(Boolean)` in `addSpinners` evaluates every
  candidate. The port keeps that, to measure the same work (see §5).

## 3. Benchmarks

Generation numbers are single full runs; repeated runs moved the totals by under
6%. Raw
data is in `bench/*.json`. To reproduce:

- `node scripts/bench-node.mjs <checkout of 9e69e3a>`
- `node bench/browser.mjs <this repo URL> <9e69e3a URL>`
- `node scripts/js-control.cjs <checkout>`

### Journey generation, all 120 levels (ms per level)

| Engine | Node mean | Node median | Node max | Node total | Chromium mean | Chromium median | Chromium max | Chromium total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| JS reference | 525.7 | 415.9 | 2354 | 63.1 s | 411.5 | 339.5 | 1658 | 49.4 s |
| MoonBit wasm-gc | 71.5 | 51.7 | 242 | 8.6 s | 59.2 | 41.9 | 202 | 7.1 s |
| MoonBit → JS | 139.8 | 104.1 | 497 | 16.8 s | 112.8 | 85.4 | 393 | 13.5 s |

Speed-up over the JS: about **7×** on wasm-gc and **3.7×** on the JS backend.

### Kernel micro-benchmarks (Node, best of 5, ms)

All three engines give identical results on every row.

| Board (Journey level) | Kernel | JS | wasm-gc | MoonBit→JS |
| --- | --- | ---: | ---: | ---: |
| L107 square, 12×15, 50 ropes (offset kernels) | casual ×1000 | 22.2 | 13.4 | 24.6 |
|  | par search | 15.4 | 11.6 | 20.8 |
| L118 square + mirrors, 12×13, 33 ropes (offset kernels) | casual ×1000 | 15.0 | 8.8 | 16.7 |
|  | par search | 10.3 | 7.3 | 13.8 |
| L114 Hex, 11×16, 18 ropes (offset kernels) | casual ×1000 | 22.7 | 4.6 | 10.3 |
|  | par search | 13.9 | 2.3 | 4.7 |
| L116 Hex + mirrors, 12×14 (offset kernels) | casual ×1000 | 23.8 | 5.7 | 11.3 |
| L120 square + mirrors + spinners, 12×14, 38 ropes (full geometry) | casual ×100 | 834 | 24.5 | 44.2 |
|  | par search | 19.6 | 0.82 | 1.6 |
| L60 square + mirrors + spinners (full geometry) | solve, 2000 nodes | 121 | 9.3 | 16.6 |
| L89 square + spinners (full geometry) | casual ×100 | 225 | 6.9 | 14.1 |

### Language or representation? (`scripts/js-control.cjs`)

The square offset kernels are the fairest comparison: both sides use typed arrays
and the same string state keys. There, wasm-gc is **1.3–1.7×** faster than the JS,
and MoonBit→JS runs at **0.75–0.9×** the speed of the JS: 10–25% slower.

The large gaps come from full-geometry play on spinner boards. The JS builds a
`Set` of `"q,r"` strings on every tap and uses `JSON.stringify` keys for visited
states; the port uses integer cells and a stamp array. A CPU profile of Journey
levels 61–120 in JS shows:

- 42% of the time in the two `tap` functions;
- about 11% in solver searches with `JSON.stringify` keys;
- 10% in garbage collection.

To separate the effects, I rewrote only the JS full-geometry tap with the port's
integer representation, keeping the same algorithm and the same results:

| Casual ×100 | Original JS | JS with integer cells | MoonBit→JS | wasm-gc |
| --- | ---: | ---: | ---: | ---: |
| L30 | 115 | 9.4 | 12.6 | 6.6 |
| L60 | 125 | 16.5 | 10.3 | 5.5 |
| L89 | 173 | 12.3 | 13.3 | 6.6 |
| L120 | 607 | 41.4 | 42.7 | 23.1 |

Plain JS gets 10–15× from representation alone, and wasm-gc adds about 2×
(1.4–3×) on top of that. The JS full-geometry numbers vary by up to about 30%
between runs (L120 casual measured 607, 802 and 834 ms in three runs), because
they are dominated by allocation and GC. The MoonBit numbers vary by under 10%. The Hex offset kernels (5× in the table above) are a smaller version of
the same story: `compile()` builds closures and plain arrays per board and keys
states with `offsets.join(',')`.

### Startup and load size

| Artifact | Bytes | gzip -9 | Load time |
| --- | ---: | ---: | --- |
| JS core: 9 scripts, including `grid-journey.js` | 156,623 | 44,570 | 31 ms to load and run in Chromium |
| MoonBit core only, wasm-gc | 131,517 | 52,162 | — |
| MoonBit core only, JS build | 526,334 | 72,231 | — |
| Shipped `dist/mf.wasm` (core + game) | 167,735 | 65,067 | 5 ms fetch+compile+instantiate in Chromium; 2 ms in Node |
| Shipped `dist/mf.js` (core + game) | 637,999 | 85,395 | 18 ms import in Chromium; 15 ms in Node |
| JS app layer (app, input, rope-art, audio, music, sounds, worker) | 110,154 | 33,815 | — |
| Slice glue (`game.js`, `mf-core.js`, `index.html`) | 15,600 | 6,504 | — |

wasm-gc is smaller raw but slightly larger gzipped. The JS backend's output is
3.4× the size of the source JS, and its long mangled names (for example
`_M0FP310monkeyfist2mf4core…`) don't gzip away. Startup is negligible on every
path.

### Frame cost while animating (Chromium, 420×800 @2×, auto-solve, ms per frame)

The same levels were auto-solved in both pages; the runs took 475 vs 503 frames
on L60.

| Level | JS game: script | JS game: whole task | Slice: script | Slice: whole task | Slice: MoonBit update + display list | Slice: canvas glue |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 60 | 1.91 | 5.39 | 0.36 | 4.35 | 0.068 | 0.254 |
| 57 (Hex) | 2.43 | 7.05 | 0.42 | 5.10 | 0.079 | 0.296 |
| 119 | 1.81 | 5.47 | 0.44 | 4.80 | 0.080 | 0.313 |

This comparison isn't like for like. The JS game draws braided rope art, and most
of its script time is Canvas calls that would stay in JS glue in any port. Game
logic costs well under 0.1 ms per frame in MoonBit, and rasterizing dominates
both pages. Frame time is no reason to switch.

## 4. Code size

These counts come from `scripts/mbt-metrics.cjs`, measured like
`scripts/code-metrics.cjs`:

- **Tokens:** comments excluded.
- **Functions:** `fn` plus lambdas, compared with JS `function` and `=>`.
- **Decision points:** `if`, `for`, `while`, `guard`, `catch`, `&&`, `||` and
  match arms, compared with JS `case` and `?`.

| Code | Tokens | Functions | Decisions | Lines |
| --- | ---: | ---: | ---: | ---: |
| JS core replaced (8 files) | 36,666 | 426 | 1,296 | 2,313 |
| MoonBit core (9 files) | 35,382 | 262 | 1,286 | 5,898 |
| JS app layer (6 files; the slice covers part of it) | 30,443 | 283 | 832 | 1,647 |
| MoonBit game layer (slice) | 7,405 | 47 | 234 | 1,219 |
| MoonBit export surface | 1,061 | 26 | 16 | 235 |
| Remaining JS glue (`web/*.js`) | 3,911 | 54 | 63 | 199 |
| Journey table: JS / MoonBit | 4,193 / 5,651 | — | — | 125 / 1,566 |

The ported core is the same size as the JS it replaces. Allowing for the about
2.2k JS tokens left unported, MoonBit is about 4% larger. Line counts are 2.5×
higher only because `moon fmt` puts one statement per line, where the JS packs
long lines. Types removed no logic. They did replace two things:

- string-matched exceptions, such as `/twice/.test(error.message)`, with
  `Option`;
- `null`/`undefined` juggling with `Option`.

Closures capturing mutable locals made a direct translation of the builders
possible. The slice's game layer is not comparable in scope with the app layer;
it implements roughly the `G` state and `tap`, `commit`, `update`, `undo`,
`hint`, `autoSolve` and `finish` parts of `app.js`, plus the effect design of
`sounds.js`.

## 5. Bugs and awkward spots

### In the JS, found while porting

1. **`addSpinners` evaluates every candidate eagerly.**
   `cells.slice(0, 16).map(withSpinner).find(Boolean)` (and the same for
   `searchSpinner`) builds and verifies all 16 + 8 candidate boards even after
   the first one succeeds. Short-circuiting gives identical Journey output (all
   120 layoutKeys match) and cuts JS Journey generation from 63.9 s to 53.3 s
   (**−16%**). The port keeps the eager form so the benchmarks compare the same
   work.
2. **A `null` from `featureStats` skips the mechanic checks.**
   `if (mechanicStats && (...)) continue` accepts a candidate unchecked when
   `featureStats` returns `null` (a failed tap). The plan was replayed just
   before, so this is latent, but the guard is inverted from what it means.
3. **Hex `intentions` counts slides in a `Uint8Array`.** `done[i]` wraps after
   255 slides of one rope. This is latent and harmless at current sizes.
4. **Dead configuration paths in `weave`.** Under the grid generator's
   configuration, `lands` is always false (`need = -score ≤ 0`), and
   `pace`/`depth`, `sMin`/`sMax` and `floor` are constants, because `tapDepth`
   is always set. The trim/transpose branch of `finished` never runs. All of
   this could be deleted from the JS.
5. **String-keyed geometry is the main JS performance problem (§3).** This is a
   design issue, not a bug: integer cells would give the JS most of the speed-up
   with no new toolchain.

### In MoonBit and its toolchain

1. **Strings across the wasm-gc boundary need JS String Builtins.** Chrome has
   them, but Node 22 doesn't; it ignores the flag. The exports therefore use a
   numeric protocol: push a code unit at a time in, and read ints and doubles out
   by index. That is clumsy, but it works identically for both backends and costs
   about 0.07 ms for a whole frame's display list.
2. **The toolchain moves fast.** In one session I hit deprecations or breaking
   changes in:
   - `derive(...)` → `#derive(...)`, and `derive(Show)` → `Debug`;
   - `to_array` → `to_owned`, and `rev_inplace` → `rev_in_place`;
   - `{}` as an empty map (now ambiguous, `Map([])`);
   - `move` becoming a reserved word;
   - the `warn-list` setting → `warnings`;
   - `typealias` syntax;
   - `moon.pkg.json`, which is no longer accepted (`moon.pkg` DSL instead).

   Code written today will need churn.
3. **The JS backend's output is large.** It is 3.4× the size of hand-written JS.
   Captured `let mut` locals become heap boxes (`MutLocal`), and there is no
   built-in minifier. It is also no faster than the JS (§3), so the JS fallback
   for browsers without wasm-gc (Safari before 18.2) costs size and buys nothing.
4. **Small API gaps.**
   - There is no `Array::stable_sort_by`; you need `arr.mut_view().stable_sort_by`.
   - Emulating a JS `for` loop that reassigns its counter and then `continue`s
     needed explicit increments, which are easy to get wrong.
   - I wrote a base-36 formatter before finding `UInt::to_string(radix=36)`.
5. **What helped.** Wrapping 32-bit integers, an insertion-ordered `Map`, local
   recursive functions, closures over mutable locals and exhaustive `match` made
   a line-by-line translation tractable. Parity held on the first full run.

## 6. Recommendation

**Don't switch the game to MoonBit.** For this codebase:

- **Speed.** The real gain comes from the representation changes the port made,
  and those can be made in JS. With the same representation, wasm-gc is
  1.3–2× faster on the kernels, and MoonBit's JS backend is no faster than JS
  (10–25% slower on the square offset kernels).
- **Code size.** It is unchanged (about 35k tokens either way), so there is no
  simplification.
- **Frame time.** It is dominated by Canvas rendering, which stays in JS glue in
  any port.
- **Costs.** The project prides itself on having no build step. Switching would
  add:
  - a fast-moving toolchain;
  - committed binary build artifacts;
  - a wasm-gc browser floor, or a 3.4× larger JS fallback;
  - a numeric interop layer.

What I'd do instead, in order:

1. In the JS, short-circuit the spinner candidate search. This is a one-line
   change that makes Journey generation 16% faster with identical output.
2. Move full-geometry taps (`mechanics.js`, `hex/mechanics.js`) and solver state
   keys from string `Set`s and `JSON.stringify` to integer cells, stamp arrays
   and compact keys. The control experiment shows 10–15× on spinner-board
   playouts. Spinner boards dominate late Journey levels, so this should recover
   most of the 7×, keeping parity, with no new toolchain.
3. Only if generation is still too slow after that (for example colossal Hex
   with spinners, which takes 8–17 s), consider MoonBit wasm-gc for the generator
   worker alone. The core here is a parity-tested drop-in for that, worth roughly
   another 1.5–2×. Keep the app layer in JS.

## 7. Where I stopped

- **Done.** The full generator core with exact parity, a playable single-level
  slice on both grids and both backends, tests, and Node and Chromium
  benchmarks.
- **Remaining for a full port of the app layer:**
  - braided rope rendering;
  - zoom, pan and pinch input;
  - menus, the Custom set editor, chapters and unlocks;
  - music;
  - feature fading (`reachableFeatures`) and the spinner flip animation;
  - keyboard play, settings, the service worker and PWA;
  - moving generation to a worker.

  Given §6, I don't think it is worth doing.

## Layout

```
moonbit/
  index.html, web/game.js   playable slice and its Canvas/Web Audio/DOM glue
  web/mf-core.js            loader + numeric interop (wasm-gc or JS build)
  dist/mf.wasm, dist/mf.js  committed builds (./build.sh regenerates them)
  src/core                  generator core       src/game  game layer       src/api  exports
  tests                     parity (Node) and play (Chromium) tests
  scripts                   reference dump, parity, Node benchmark, JS control, code metrics
  bench                     browser benchmark page/driver and raw results
```

Run the tests from the repository root with
`python3 -m http.server 4173 --bind 127.0.0.1`, then
`CHROMIUM_PATH=/opt/pw-browsers/chromium MF_TEST_URL=http://127.0.0.1:4173/ node --test moonbit/tests/*.test.cjs`
and `moon test` (inside `moonbit/`).
