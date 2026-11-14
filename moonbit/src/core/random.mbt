// Deterministic random primitives, bit-for-bit equal to random.js: shared level
// codes and saved progress depend on these exact draws.

///|
/// mulberry32: the state is a wrapping 32-bit Int, so `*` is Math.imul.
pub(all) struct Rng {
  mut a : Int
}

///|
pub fn mulberry32(seed : Int) -> Rng {
  { a: seed }
}

///|
fn lsr(x : Int, n : Int) -> Int {
  (x.reinterpret_as_uint() >> n).reinterpret_as_int()
}

///|
pub fn Rng::next(self : Rng) -> Double {
  self.a = self.a + 0x6D2B79F5
  let a = self.a
  let mut t = (a ^ lsr(a, 15)) * (1 | a)
  t = (t + (t ^ lsr(t, 7)) * (61 | t)) ^ t
  (t ^ lsr(t, 14)).reinterpret_as_uint().to_double() / 4294967296.0
}

///|
/// Math.floor(rng() * n).
pub fn Rng::below(self : Rng, n : Int) -> Int {
  (self.next() * n.to_double()).floor().to_int()
}

///|
/// FNV-1a over UTF-16 code units, as hashString in random.js.
pub fn hash_string(s : String) -> UInt {
  let mut h = 0x811c9dc5U
  for i in 0..<s.length() {
    h = (h ^ s.code_unit_at(i).to_int().reinterpret_as_uint()) * 0x01000193U
  }
  h
}

///|
pub fn rng_of(s : String) -> Rng {
  mulberry32(hash_string(s).reinterpret_as_int())
}

///|
/// Number.prototype.toString(36) for an unsigned 32-bit value.
pub fn base36(u : UInt) -> String {
  let digits = "0123456789abcdefghijklmnopqrstuvwxyz"
  if u == 0 {
    return "0"
  }
  let out : Array[Char] = []
  let mut v = u
  while v > 0 {
    out.push(digits.get_char((v % 36).reinterpret_as_int()).unwrap())
    v = v / 36
  }
  out.rev_in_place()
  String::from_array(out)
}

///|
/// Math.round: halves round up, toward +Infinity.
pub fn js_round(x : Double) -> Int {
  let f = x.floor()
  if x - f >= 0.5 {
    f.to_int() + 1
  } else {
    f.to_int()
  }
}

///|
/// Math.floor(a / b) for b > 0.
pub fn floor_div(a : Int, b : Int) -> Int {
  if a >= 0 {
    a / b
  } else {
    -((-a + b - 1) / b)
  }
}

///|
/// Array.prototype.sort is stable in V8; every comparator here is consistent.
pub fn[T] ssort(a : Array[T], cmp : (T, T) -> Int) -> Unit {
  a.mut_view().stable_sort_by(cmp)
}

///|
pub fn imin(a : Int, b : Int) -> Int {
  if a < b {
    a
  } else {
    b
  }
}

///|
pub fn imax(a : Int, b : Int) -> Int {
  if a > b {
    a
  } else {
    b
  }
}

///|
pub fn dmin(a : Double, b : Double) -> Double {
  if a < b {
    a
  } else {
    b
  }
}

///|
pub fn dmax(a : Double, b : Double) -> Double {
  if a > b {
    a
  } else {
    b
  }
}

///|
/// Index of the first occurrence of x in a at or after `from`, or -1.
pub fn index_from(a : Array[Int], x : Int, from : Int) -> Int {
  for k in from..<a.length() {
    if a[k] == x {
      return k
    }
  }
  -1
}

///|
pub fn contains(a : Array[Int], x : Int) -> Bool {
  index_from(a, x, 0) >= 0
}

///|
/// [...new Set(a)]: first occurrences, in order.
pub fn unique(a : Array[Int]) -> Array[Int] {
  let out = []
  for x in a {
    if !contains(out, x) {
      out.push(x)
    }
  }
  out
}

///|
/// A key for a list of small non-negative ints, for visited sets.
pub fn key_of(a : FixedArray[Int]) -> String {
  let sb = StringBuilder()
  for x in a {
    sb.write_char(Int::unsafe_to_char(x + 1))
  }
  sb.to_string()
}
