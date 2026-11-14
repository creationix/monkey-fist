// game-engine.js: set codes, level specifications, layout keys and generate().

///|
pub let grid_version : Int32 = 8

///|
pub(all) struct SetOpts {
  journey : Bool
  grid : Char // 'S', 'H' or 'M'
  min : Int32
  max : Int32
  w : Int32
  h : Int32
  count : Int32
  mirrors : Bool
  springs : Bool
  colossal : Bool
  seed : String
}

///|
pub let journey_opts : SetOpts = {
  journey: true,
  grid: 'M',
  min: 1,
  max: 100,
  w: 10,
  h: 14,
  count: 120,
  mirrors: true,
  springs: true,
  colossal: false,
  seed: "MONKEYFIST",
}

///|
pub fn set_code(o : SetOpts) -> String {
  if o.journey {
    return "J3-MONKEYFIST"
  }
  let flags = (if o.mirrors { "M" } else { "" }) +
    (if o.springs { "S" } else { "" }) +
    (if o.colossal { "C" } else { "" })
  "U3-\{o.grid}-\{o.min}-\{o.max}-\{o.w}-\{o.h}-\{o.count}-\{if flags == "" { "N" } else { flags }}-\{o.seed}"
}

///|
fn digits(s : String, lo : Int32, hi : Int32) -> Int32? {
  if s.length() < lo || s.length() > hi {
    return None
  }
  let mut v = 0
  for i in 0..<s.length() {
    let c = s.code_unit_at(i).to_int()
    if c < 48 || c > 57 {
      return None
    }
    v = v * 10 + c - 48
  }
  Some(v)
}

///|
/// parseCode: a Journey or U3 Custom set code, or None.
pub fn parse_code(text : String) -> SetOpts? {
  let t = text.trim().to_upper().to_owned()
  if t == "J3-MONKEYFIST" {
    return Some(journey_opts)
  }
  let parts = t.split("-").map(p => p.to_owned()).to_array()
  if parts.length() != 9 || parts[0] != "U3" {
    return None
  }
  let grid = match parts[1] {
    "S" => 'S'
    "H" => 'H'
    "M" => 'M'
    _ => return None
  }
  guard digits(parts[2], 1, 3) is Some(min) else { return None }
  guard digits(parts[3], 1, 3) is Some(max) else { return None }
  guard digits(parts[4], 1, 2) is Some(w) else { return None }
  guard digits(parts[5], 1, 2) is Some(h) else { return None }
  guard digits(parts[6], 1, 3) is Some(count) else { return None }
  let f = parts[7]
  if !["N", "M", "S", "MS", "C", "MC", "SC", "MSC"].contains(f) {
    return None
  }
  let seed = parts[8]
  if seed.length() < 1 || seed.length() > 12 {
    return None
  }
  for i in 0..<seed.length() {
    let c = seed.code_unit_at(i).to_int()
    if !((c >= 48 && c <= 57) || (c >= 65 && c <= 90)) {
      return None
    }
  }
  let mirrors = f.contains("M")
  let springs = f.contains("S")
  let colossal = f.contains("C")
  let lo = if mirrors || springs { 8 } else { 4 }
  let hi = if colossal { 48 } else { 24 }
  if min < 1 ||
    max > 100 ||
    min > max ||
    w < lo ||
    w > hi ||
    h < lo ||
    h > hi ||
    count < 1 ||
    count > 200 {
    return None
  }
  Some({
    journey: false,
    grid,
    min,
    max,
    w,
    h,
    count,
    mirrors,
    springs,
    colossal,
    seed,
  })
}

///|
pub fn level_spec(o : SetOpts, index : Int32) -> Spec {
  let i = imax(0, imin(o.count - 1, index))
  if o.journey {
    return journey[i]
  }
  let hex = match o.grid {
    'H' => true
    'S' => false
    _ => i % 2 == 1
  }
  {
    hex,
    w: o.w,
    h: o.h,
    difficulty: o.min.to_double() +
    (o.max - o.min).to_double() *
    i.to_double() /
    imax(1, o.count - 1).to_double(),
    mirrors: o.mirrors,
    springs: o.springs,
    seed: base36(hash_string("grid/3/" + set_code(o) + "/" + i.to_string()))
    .to_upper()
    .to_string(),
    require_slide: false,
    min_mirrors: 0,
    min_springs: 0,
    colossal: o.colossal,
  }
}

///|
/// The layout hash: FNV-1a over the same JSON text game-engine.js hashes.
pub fn layout_key(b : Board) -> String {
  let sb = StringBuilder()
  sb.write_string(if b.hex { "[\"hex\"," } else { "[\"square\"," })
  sb.write_string("\{b.w},\{b.h},[")
  for i, path in b.ropes {
    if i > 0 {
      sb.write_char(',')
    }
    sb.write_char('[')
    for j, p in path {
      if j > 0 {
        sb.write_char(',')
      }
      sb.write_string("[\{p.q},\{p.r}]")
    }
    sb.write_char(']')
  }
  sb.write_string("],[")
  for i, m in b.mirrors {
    if i > 0 {
      sb.write_char(',')
    }
    let kind = if b.hex {
      m.kind.to_string()
    } else if m.kind == 0 {
      "\"/\""
    } else {
      "\"\\\\\""
    }
    sb.write_string("[\{m.cell.q},\{m.cell.r},\{kind}]")
  }
  sb.write_string("],[")
  for i, p in b.springs {
    if i > 0 {
      sb.write_char(',')
    }
    sb.write_string("[\{p.q},\{p.r}]")
  }
  sb.write_string("]]")
  let data = sb.to_string()
  base36(hash_string(data)) + "-" + base36(hash_string("layout:" + data))
}

///|
pub fn generate(o : SetOpts, index : Int32) -> Level? {
  match grid_generate(level_spec(o, index)) {
    Some(l) => Some({ ..l, layout_key: layout_key(l.board), })
    None => None
  }
}
