// The exported surface: plain numbers in and out, so the same JS glue drives the
// JS and wasm-gc builds. Strings go in one code unit at a time; results come out
// through an Int buffer.

///|
let input : Array[Int] = []

///|
let output : Array[Int] = []

///|
let current : Ref[@core.Level?] = { val: None }

///|
#export_name("in_reset")
pub fn in_reset() -> Unit {
  input.clear()
}

///|
#export_name("in_push")
pub fn in_push(c : Int) -> Unit {
  input.push(c)
}

///|
#export_name("out_len")
pub fn out_len() -> Int {
  output.length()
}

///|
#export_name("out_get")
pub fn out_get(i : Int) -> Int {
  output[i]
}

///|
fn input_string() -> String {
  String::from_array(input.map(c => Int::unsafe_to_char(c)))
}

///|
fn put_string(s : String) -> Unit {
  output.push(s.length())
  for i in 0..<s.length() {
    output.push(s.code_unit_at(i).to_int())
  }
}

///|
fn put_level(l : @core.Level) -> Unit {
  output.clear()
  let b = l.board
  output.push(if b.hex { 1 } else { 0 })
  output.push(b.w)
  output.push(b.h)
  output.push(l.par)
  output.push(if l.exact { 1 } else { 0 })
  output.push(b.ropes.length())
  for p in b.ropes {
    output.push(p.length())
    for c in p {
      output.push(c.q)
      output.push(c.r)
    }
  }
  output.push(b.mirrors.length())
  for m in b.mirrors {
    output.push(m.cell.q)
    output.push(m.cell.r)
    output.push(m.kind)
  }
  output.push(b.springs.length())
  for p in b.springs {
    output.push(p.q)
    output.push(p.r)
  }
  output.push(b.plan.length())
  for i in b.plan {
    output.push(i)
  }
  put_string(l.layout_key)
}

///|
/// Generate level `index` of the set whose code is in the input buffer.
/// Returns 1 and fills the output buffer, or 0 if the code is invalid or no board fits.
#export_name("generate")
pub fn generate(index : Int) -> Int {
  guard @core.parse_code(input_string()) is Some(o) else { return 0 }
  match @core.generate(o, index) {
    Some(l) => {
      current.val = Some(l)
      put_level(l)
      1
    }
    None => 0
  }
}

///|
/// Casual playouts on the current level (benchmark hook).
#export_name("bench_casual")
pub fn bench_casual(games : Int) -> Double {
  guard current.val is Some(l) else { return -1.0 }
  @core.bench_casual(l.board, games)
}

///|
/// The par search on the current level (benchmark hook). Returns par.
#export_name("bench_par")
pub fn bench_par() -> Int {
  guard current.val is Some(l) else { return -1 }
  @core.bench_par(l.board)
}

///|
/// The solver from the start position (benchmark hook). Returns nodes.
#export_name("bench_solve")
pub fn bench_solve(budget : Int) -> Int {
  guard current.val is Some(l) else { return -1 }
  let b = l.board
  let g = b.geo()
  b.solve(g, @core.some_paths(b.ropes), budget, []).nodes
}
