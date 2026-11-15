// Loads the MoonBit core (wasm-gc or its JS build) behind one small API. This and the
// game glue are the only JavaScript; everything else is compiled MoonBit.
const decode = (out) => {
  let k = 0; const next = () => out[k++];
  const hex = next() === 1, W = next(), H = next(), par = next(), exact = next() === 1;
  const ropes = Array.from({ length: next() }, () => Array.from({ length: next() }, () => ({ q: next(), r: next() })));
  const mirrors = Array.from({ length: next() }, () => { const q = next(), r = next(), kind = next(); return hex ? { cell: { q, r }, axis: kind } : { cell: { q, r }, slope: kind ? '\\' : '/' }; });
  const springs = Array.from({ length: next() }, () => ({ q: next(), r: next() }));
  const plan = Array.from({ length: next() }, () => next());
  const layoutKey = String.fromCharCode(...Array.from({ length: next() }, () => next()));
  return { grid: hex ? 'hex' : 'square', W, H, par, exact, ropes, mirrors, springs, plan, layoutKey };
};
export function wrap(x) {
  const pushString = s => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
  const readOut = () => { const n = x.out_len(), out = new Array(n); for (let i = 0; i < n; i++) out[i] = x.out_get(i); return out; };
  return {
    raw: x,
    // code: a set code (J3-MONKEYFIST or U3-...); returns the board or null.
    generate(code, index) { pushString(code); return x.generate(index) ? decode(readOut()) : null; },
    benchCasual: games => x.bench_casual(games),
    benchPar: () => x.bench_par(),
    benchSolve: budget => x.bench_solve(budget),
  };
}
export async function loadWasm(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return wrap(instance.exports);
}
export async function loadJs(url) { return wrap(await import(url)); }
