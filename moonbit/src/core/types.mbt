// Shared board types. Coordinates are q/r as in the game; the square kernels
// read q as x and r as y.

///|
#derive(Eq, Hash, Debug)
pub(all) struct Pt {
  q : Int32
  r : Int32
}

///|
pub type Path = Array[Pt]

///|
/// A fixed two-sided mirror. Square: kind 0 is '/', 1 is '\'. Hex: kind is the axis (0-2).
#derive(Eq, Debug)
pub(all) struct Mirror {
  cell : Pt
  kind : Int32
}

///|
pub(all) struct Board {
  hex : Bool
  w : Int32
  h : Int32
  ropes : Array[Path]
  mirrors : Array[Mirror]
  springs : Array[Pt]
  mut plan : Array[Int32]
}

///|
pub fn Board::with_springs(
  self : Board,
  springs : Array[Pt],
  plan : Array[Int32],
) -> Board {
  { ..self, springs, plan, }
}

///|
pub fn Board::with_plan(self : Board, plan : Array[Int32]) -> Board {
  { ..self, plan, }
}

///|
pub fn some_paths(ropes : Array[Path]) -> Array[Path?] {
  ropes.map(p => Some(p))
}

///|
pub fn all_gone(paths : Array[Path?]) -> Bool {
  for p in paths {
    if p is Some(_) {
      return false
    }
  }
  true
}

///|
pub fn last(p : Path) -> Pt {
  p[p.length() - 1]
}

///|
pub fn slice(p : Array[Pt], a : Int32, b : Int32) -> Array[Pt] {
  p[a:b].to_owned()
}
