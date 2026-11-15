// The generator alone, for the JS game: plain numbers in and out, so one loader drives
// the JS and wasm-gc builds. Strings go in one code unit at a time; results come out
// through an Int buffer.

///|
let input : Array[Int32] = []

///|
let output : Array[Int32] = []


///|
#export_name("in_reset")
pub fn in_reset() -> Unit {
  input.clear()
}

///|
#export_name("in_push")
pub fn in_push(c : Int32) -> Unit {
  input.push(c)
}

///|
#export_name("out_len")
pub fn out_len() -> Int32 {
  output.length()
}

///|
#export_name("out_get")
pub fn out_get(i : Int32) -> Int32 {
  output[i]
}

///|
fn input_string() -> String {
  String::from_array(input.map(c => Int32::unsafe_to_char(c)))
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
pub fn generate(index : Int32) -> Int32 {
  guard @core.parse_code(input_string()) is Some(o) else { return 0 }
  match @core.generate(o, index) {
    Some(l) => {
      put_level(l)
      1
    }
    None => 0
  }
}
