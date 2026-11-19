// G4's timing hook: hex_build of the MoonBit core behind the word contract of the Encantis
// port's test/g4.ents (t_build, t_bench), for oracle/bench-g4.cjs. Scratch only.

///|
let input : Array[Int32] = []

///|
let output : Array[Int32] = []

///|
let last : Ref[Int32] = { val: 0 }

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
#export_name("rng_state")
pub fn rng_state() -> Int32 {
  last.val
}

///|
fn cfg_of(coverage : Double, tap_depth : Double) -> @core.HexCfg {
  let mut k = 0
  fn next() -> Int32 {
    let v = input[k]
    k += 1
    v
  }

  let w = next()
  let h = next()
  let stage = next()
  let length = next()
  let knots = next()
  let traps = next()
  let mirrors : Array[@core.Mirror] = []
  for _ in 0..<next() {
    let q = next()
    let r = next()
    let kind = next()
    mirrors.push({ cell: { q, r }, kind })
  }
  let ropes : Array[Array[@core.Pt]] = []
  for _ in 0..<next() {
    let p : Array[@core.Pt] = []
    for _ in 0..<next() {
      let q = next()
      let r = next()
      p.push({ q, r })
    }
    ropes.push(p)
  }
  let stops : Array[Array[Int32]] = []
  for _ in 0..<next() {
    let s = []
    for _ in 0..<next() {
      s.push(next())
    }
    stops.push(s)
  }
  let plan : Array[Int32]? = if next() == 1 {
    let p = []
    for _ in 0..<next() {
      p.push(next())
    }
    Some(p)
  } else {
    None
  }
  {
    w,
    h,
    stage,
    coverage,
    length,
    tap_depth,
    mirrors,
    knots,
    traps,
    initial_ropes: ropes,
    initial_stops: stops,
    initial_plan: plan,
  }
}

///|
#export_name("t_build")
pub fn t_build(state : Int32, coverage : Double, tap_depth : Double) -> Int32 {
  let cfg = cfg_of(coverage, tap_depth)
  let rng = @core.mulberry32(state)
  let r = @core.hex_build(rng, cfg)
  last.val = rng.a
  output.clear()
  match r {
    None => 0
    Some(b) => {
      output.push(b.ropes.length())
      for p in b.ropes {
        output.push(p.length())
        for c in p {
          output.push(c.q)
          output.push(c.r)
        }
      }
      output.push(b.plan.length())
      for i in b.plan {
        output.push(i)
      }
      1
    }
  }
}

///|
/// hex_build `reps` times from the same state on the cfg in the input: the summed rope and
/// plan counts (the timing loop's check that every build ran).
#export_name("t_bench")
pub fn t_bench(state : Int32, coverage : Double, tap_depth : Double, reps : Int32) -> Int32 {
  let cfg = cfg_of(coverage, tap_depth)
  let mut sum = 0
  for _ in 0..<reps {
    match @core.hex_build(@core.mulberry32(state), cfg) {
      None => ()
      Some(b) => sum += b.ropes.length() + b.plan.length()
    }
  }
  sum
}
