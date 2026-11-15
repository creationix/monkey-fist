// The generator alone, for the JS game: plain numbers in and out, so one loader drives
// the JS and wasm-gc builds. Strings go in one code unit at a time; results come out
// through an Int buffer.

///|
let input : Array[Int32] = []

///|
let output : Array[Int32] = []

///|
/// The last level's measured doubles: casual win rate, challenge, coverage.
let output_f : Array[Double] = []

///|
let current : Ref[@core.Level?] = { val: None }


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
  for n in [
    l.slides,
    l.bounces,
    l.repeated,
    l.automatic,
    l.used_mirrors,
    l.used_springs,
    l.manual_mirrors,
    l.manual_springs,
  ] {
    output.push(n)
  }
  output_f.clear()
  output_f.push(l.wins)
  output_f.push(l.challenge)
  output_f.push(l.coverage)
  current.val = Some(l)
}

///|
#export_name("outf_get")
pub fn outf_get(i : Int32) -> Double {
  output_f[i]
}

///|
fn put(l : @core.Level?) -> Int32 {
  match l {
    Some(l) => {
      put_level(l)
      1
    }
    None => 0
  }
}

///|
/// Generate level `index` of the set whose code is in the input buffer.
/// Returns 1 and fills the output buffer, or 0 if the code is invalid or no board fits.
#export_name("generate")
pub fn generate(index : Int32) -> Int32 {
  guard @core.parse_code(input_string()) is Some(o) else { return 0 }
  put(@core.generate(o, index))
}

///|
/// Generate from a specification whose seed is in the input buffer (the Journey
/// builder's candidates). Returns 1 and fills the output buffers, or 0.
#export_name("generate_spec")
pub fn generate_spec(
  hex : Int32,
  w : Int32,
  h : Int32,
  difficulty : Double,
  mirrors : Int32,
  springs : Int32,
  require_slide : Int32,
  min_mirrors : Int32,
  min_springs : Int32,
  colossal : Int32,
) -> Int32 {
  put(
    @core.generate_spec({
      hex: hex == 1,
      w,
      h,
      difficulty,
      mirrors: mirrors == 1,
      springs: springs == 1,
      seed: input_string(),
      require_slide: require_slide == 1,
      min_mirrors,
      min_springs,
      colossal: colossal == 1,
    }),
  )
}

///|
/// How often a casual player wins the last level, over `games` games seeded by
/// the string in the input buffer.
#export_name("measure")
pub fn measure(games : Int32) -> Double {
  match current.val {
    Some(l) => @core.casual_measure(l.board, input_string(), games)
    None => -1.0
  }
}

///|
#export_name("target_challenge")
pub fn target_challenge(d : Double) -> Double {
  @core.target_challenge(d)
}

///|
#export_name("win_ceiling")
pub fn win_ceiling(d : Double) -> Double {
  @core.win_ceiling(d)
}

///|
/// The board, current ropes and preferred order in the input buffer: hex, W, H,
/// then counted lists of ropes (each a counted list of q, r), mirrors (q, r, kind)
/// and springs (q, r), then the current paths (a count of 0 is a rope that left)
/// and the preferred move order.
fn read_position() -> (@core.Board, Array[@core.Path?], Array[Int32]) {
  let mut k = 0
  let next = () => {
    k += 1
    input[k - 1]
  }
  let cells = () => Array::makei(next(), _ => {
    let q = next()
    @core.Pt::{ q, r: next() }
  })
  let hex = next() == 1
  let w = next()
  let h = next()
  let ropes = Array::makei(next(), _ => cells())
  let mirrors = Array::makei(next(), _ => {
    let q = next()
    let r = next()
    @core.Mirror::{ cell: @core.Pt::{ q, r }, kind: next() }
  })
  let springs = cells()
  let paths : Array[@core.Path?] = Array::makei(next(), _ => {
    let p = cells()
    if p.length() == 0 {
      None
    } else {
      Some(p)
    }
  })
  let prefer = Array::makei(next(), _ => next())
  (@core.Board::{ hex, w, h, ropes, mirrors, springs, plan: [] }, paths, prefer)
}

///|
/// A plan from the position in the input buffer (game-engine.js guide). Output:
/// solved (1, 0, or -1 when the budget ran out), nodes searched, then the moves.
#export_name("guide")
pub fn guide(budget : Int32) -> Unit {
  let (b, paths, prefer) = read_position()
  let s = @core.guide(b, paths, budget, prefer)
  output.clear()
  output.push(
    match s.solved {
      Some(true) => 1
      Some(false) => 0
      None => -1
    },
  )
  output.push(s.nodes)
  for m in s.moves {
    output.push(m)
  }
}

///|
/// The mirrors and springs still within reach from the position in the input
/// buffer, as indices (mirrors first, then springs) in the output buffer.
#export_name("features")
pub fn features(budget : Int32) -> Unit {
  let (b, paths, _) = read_position()
  output.clear()
  for i in @core.reachable_features(b, paths, budget) {
    output.push(i)
  }
}
