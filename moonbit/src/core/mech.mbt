// Full-geometry movement for both grids (mechanics.js, hex/mechanics.js): every
// tap and its animated route, mirrors turning, spinners reversing, and the
// bounded full-path solvers. Plus the kernel routing of game-engine.js.

///|
/// Per-board lookup tables, built once per board.
pub(all) struct Geo {
  hex : Bool
  w : Int
  h : Int
  mirror : FixedArray[Int]
  spring : FixedArray[Bool]
  nmirrors : Int
  nsprings : Int
  occ : FixedArray[Int]
  mut stamp : Int
  mut tracked : Int
  sqm : SqMirrors
}

///|
pub fn Geo::new(b : Board) -> Geo {
  let mirror = FixedArray::make(b.w * b.h, -1)
  let spring = FixedArray::make(b.w * b.h, false)
  let g = {
    hex: b.hex,
    w: b.w,
    h: b.h,
    mirror,
    spring,
    nmirrors: b.mirrors.length(),
    nsprings: b.springs.length(),
    occ: FixedArray::make(b.w * b.h, 0),
    stamp: 0,
    tracked: -1,
    sqm: if b.hex { SqMirrors::empty() } else { SqMirrors::of_board(b) },
  }
  for m in b.mirrors {
    mirror[g.cell(m.cell)] = m.kind
  }
  for p in b.springs {
    spring[g.cell(p)] = true
  }
  g
}

///|
pub fn Geo::cell(self : Geo, p : Pt) -> Int {
  if self.hex {
    hex_cell(p, self.w)
  } else {
    p.r * self.w + p.q
  }
}

///|
pub fn Geo::inside(self : Geo, p : Pt) -> Bool {
  if self.hex {
    hex_inside(self.w, self.h, p)
  } else {
    p.q >= 0 && p.r >= 0 && p.q < self.w && p.r < self.h
  }
}

///|
pub(all) struct Move {
  paths : Array[Path?]
  event : Int
  distance : Int
  route : Array[Pt]
}

///|
/// The direction a rope leaves in: its head's direction, turned by a mirror under the head.
pub fn Geo::direction(self : Geo, path : Path) -> (Int, Int) {
  let (dq, dr) = head_dir(path)
  let m = self.mirror[self.cell(last(path))]
  if m < 0 {
    (dq, dr)
  } else if self.hex {
    let d = hex_reflect(hex_dir_index(dq, dr), m)
    (hex_dq[d], hex_dr[d])
  } else {
    turn(m, dq, dr)
  }
}

///|
fn Geo::mark(self : Geo, paths : Array[Path?]) -> Int {
  self.stamp += 1
  let s = self.stamp
  for p in paths {
    if p is Some(path) {
      for c in path {
        self.occ[self.cell(c)] = s
      }
    }
  }
  s
}

///|
fn replace(paths : Array[Path?], i : Int, p : Path?) -> Array[Path?] {
  let next = paths.copy()
  next[i] = p
  next
}

///|
fn tail(route : Array[Pt], n : Int) -> Path {
  route[route.length() - n:].to_owned()
}

///|
pub fn Geo::tap(self : Geo, paths : Array[Path?], i : Int) -> Move? {
  guard paths[i] is Some(path) else { return None }
  let s = self.mark(paths)
  let route = path.copy()
  let (dq0, dr0) = self.direction(path)
  let mut p = last(path)
  let mut dq = dq0
  let mut dr = dr0
  let mut distance = 0
  if self.hex {
    let seen : Array[Int] = []
    let mut d = hex_dir_index(dq, dr)
    while true {
      let next = { q: p.q + hex_dq[d], r: p.r + hex_dr[d] }
      if !self.inside(next) {
        for _ in 0..<(path.length() + 2) {
          p = { q: p.q + hex_dq[d], r: p.r + hex_dr[d] }
          route.push(p)
          distance += 1
        }
        return Some({ paths: replace(paths, i, None), event: EV_EXIT, distance, route })
      }
      let c = self.cell(next)
      if self.occ[c] == s {
        break
      }
      if self.spring[c] {
        route.push(next)
        distance += 1
        let back = tail(route, path.length())
        back.rev_in_place()
        return Some({
          paths: replace(paths, i, Some(back)),
          event: EV_BOUNCE,
          distance,
          route,
        })
      }
      if contains(seen, c) {
        return None
      }
      seen.push(c)
      p = next
      route.push(p)
      distance += 1
      let axis = self.mirror[c]
      if axis >= 0 {
        d = hex_reflect(d, axis)
      }
    }
    if distance == 0 {
      return None
    }
    return Some({
      paths: replace(paths, i, Some(tail(route, path.length()))),
      event: EV_SLIDE,
      distance,
      route,
    })
  }
  let seen : Array[Int] = []
  let mut event = EV_SLIDE
  while true {
    let state = ((p.r * self.w + p.q) * 3 + dq + 1) * 3 + dr + 1
    if contains(seen, state) {
      return None
    }
    seen.push(state)
    let nq = p.q + dq
    let nr = p.r + dr
    if nq < 0 || nr < 0 || nq >= self.w || nr >= self.h {
      event = EV_EXIT
      for _ in 0..<(path.length() + 2) {
        p = { q: p.q + dq, r: p.r + dr }
        route.push(p)
        distance += 1
      }
      break
    }
    let c = nr * self.w + nq
    if self.occ[c] == s {
      break
    }
    p = { q: nq, r: nr }
    route.push(p)
    distance += 1
    if self.spring[c] {
      event = EV_BOUNCE
      break
    }
    let m = self.mirror[c]
    if m >= 0 {
      let (a, b) = turn(m, dq, dr)
      dq = a
      dr = b
    }
  }
  if event == EV_SLIDE && distance == 0 {
    return None
  }
  let rest = if event == EV_EXIT {
    None
  } else {
    let t = tail(route, path.length())
    if event == EV_BOUNCE {
      t.rev_in_place()
    }
    Some(t)
  }
  Some({ paths: replace(paths, i, rest), event, distance, route })
}

///|
pub fn Geo::all_free_full(self : Geo, paths : Array[Path?]) -> Bool {
  for i in 0..<paths.length() {
    if paths[i] is Some(_) {
      match self.tap(paths, i) {
        Some(m) if m.event == EV_EXIT => ()
        _ => return false
      }
    }
  }
  true
}

///|
/// An injective key for a board position (JSON.stringify of the paths in the JS).
fn Geo::key(self : Geo, paths : Array[Path?]) -> String {
  let sb = StringBuilder()
  for p in paths {
    match p {
      None => sb.write_char(Int::unsafe_to_char(1))
      Some(path) => {
        sb.write_char(Int::unsafe_to_char(path.length() + 2))
        for c in path {
          sb.write_char(Int::unsafe_to_char(self.cell(c) + 1))
        }
      }
    }
  }
  sb.to_string()
}

///|
/// mechanics.js / hex/mechanics.js solve: depth-first over full geometry.
fn Geo::solve_full(
  self : Geo,
  paths : Array[Path?],
  budget : Int,
  prefer : Array[Int],
) -> Solved {
  let visited : Map[String, Bool] = Map([])
  let moves = []
  let mut nodes = 0
  let mut unknown = false
  if self.hex {
    fn search(current : Array[Path?], preferred : ArrayView[Int]) -> Bool {
      if all_gone(current) {
        return true
      }
      let state = self.key(current)
      if visited.contains(state) {
        return false
      }
      nodes += 1
      if nodes > budget {
        unknown = true
        return false
      }
      visited[state] = true
      let p0 = if preferred.length() > 0 { preferred[0] } else { -1 }
      let tries : Array[(Int, Move)] = []
      for i in 0..<current.length() {
        if current[i] is Some(_) && self.tap(current, i) is Some(m) {
          tries.push((i, m))
        }
      }
      ssort(tries, (a, b) => if a.0 == p0 {
        -1
      } else if b.0 == p0 {
        1
      } else {
        (if a.1.event == EV_EXIT { 0 } else { 1 }) -
        (if b.1.event == EV_EXIT { 0 } else { 1 })
      })
      for t in tries {
        moves.push(t.0)
        if search(t.1.paths, if t.0 == p0 { preferred[1:] } else { preferred }) {
          return true
        }
        ignore(moves.pop())
        if unknown {
          return false
        }
      }
      false
    }

    let solved = search(paths, prefer[:])
    return {
      solved: if solved {
        Some(true)
      } else if unknown {
        None
      } else {
        Some(false)
      },
      moves: if solved { moves } else { [] },
      nodes,
    }
  }
  let n = paths.length()
  let first : Map[Int, Int] = Map([])
  let lastk : Map[Int, Int] = Map([])
  let moved = FixedArray::make(n, 0)
  for k, i in prefer {
    if !first.contains(i) {
      first[i] = k
    }
    lastk[i] = k
  }
  fn search(current : Array[Path?]) -> Bool {
    if all_gone(current) {
      return true
    }
    let key = self.key(current)
    if visited.contains(key) {
      return false
    }
    nodes += 1
    if nodes > budget {
      unknown = true
      return false
    }
    visited[key] = true
    let tries : Array[(Int, Move, Int)] = []
    for i in 0..<current.length() {
      guard self.tap(current, i) is Some(next) else { continue }
      let rank = match (if moved[i] > 0 { lastk } else { first }).get(i) {
        Some(r) => r
        None => n * 4
      }
      let ev = if next.event == EV_EXIT {
        0
      } else if next.event == EV_BOUNCE {
        1
      } else {
        2
      }
      tries.push((i, next, rank * 3 + ev))
    }
    ssort(tries, (a, b) => if a.2 != b.2 { a.2 - b.2 } else { a.0 - b.0 })
    for t in tries {
      moves.push(t.0)
      moved[t.0] += 1
      if search(t.1.paths) {
        return true
      }
      moved[t.0] -= 1
      ignore(moves.pop())
      if unknown {
        return false
      }
    }
    false
  }

  let solved = search(paths)
  {
    solved: if solved {
      Some(true)
    } else if unknown {
      None
    } else {
      Some(false)
    },
    moves: if solved { moves } else { [] },
    nodes,
  }
}

// ---------- game-engine.js kernel routing ----------

///|
pub fn Board::geo(self : Board) -> Geo {
  Geo::new(self)
}

///|
/// Without spinners every rope keeps one fixed track (mirrors included), so
/// replays and searches run on the compact offset kernels.
pub fn Board::tracked(self : Board, g : Geo) -> Bool {
  if self.springs.length() > 0 {
    return false
  }
  if g.tracked < 0 {
    let ok = if self.hex {
      hex_compile(self.w, self.h, self.mirrors, some_paths(self.ropes)) is Some(_)
    } else {
      sq_board(some_paths(self.ropes), self.w, self.h, g.sqm) is Some(_)
    }
    g.tracked = if ok { 1 } else { 0 }
  }
  g.tracked == 1
}

///|
pub fn Board::all_free(self : Board, g : Geo, paths : Array[Path?]) -> Bool {
  if self.tracked(g) {
    if self.hex {
      hex_compile_exn(self.w, self.h, self.mirrors, paths).free()
    } else {
      sq_free(paths, self.w, self.h, g.sqm)
    }
  } else {
    g.all_free_full(paths)
  }
}

///|
pub fn Board::replay(
  self : Board,
  g : Geo,
  moves : Array[Int],
  paths : Array[Path?],
) -> Replayed {
  if self.tracked(g) {
    if self.hex {
      return hex_replay(self.w, self.h, self.mirrors, moves, paths)
    }
    return sq_replay(paths, self.w, self.h, moves, g.sqm)
  }
  let mut taps = 0
  let mut automatic = false
  let events = []
  let mut cur = paths
  for i in moves {
    guard g.tap(cur, i) is Some(m) else {
      return { solved: false, paths: cur, taps, events }
    }
    if !automatic {
      taps += 1
    }
    cur = m.paths
    events.push(m.event)
    if self.all_free(g, cur) {
      automatic = true
    }
  }
  { solved: all_gone(cur), paths: cur, taps, events }
}

///|
pub fn Board::replay_plan(self : Board, g : Geo, plan : Array[Int]) -> Replayed {
  self.replay(g, plan, some_paths(self.ropes))
}

///|
pub fn Board::solve(
  self : Board,
  g : Geo,
  paths : Array[Path?],
  budget : Int,
  prefer : Array[Int],
) -> Solved {
  if !self.tracked(g) {
    return g.solve_full(paths, budget, prefer)
  }
  if self.hex {
    hex_solve(self.w, self.h, self.mirrors, paths, budget, prefer)
  } else {
    sq_solve(paths, self.w, self.h, budget, prefer, g.sqm)
  }
}

///|
pub fn Board::frozen(self : Board, g : Geo, paths : Array[Path?]) -> Array[Int] {
  if self.tracked(g) {
    if self.hex {
      return hex_compile_exn(self.w, self.h, self.mirrors, paths).frozen()
    }
    return sq_frozen(paths, self.w, self.h, g.sqm)
  }
  let remaining = paths.copy()
  let mut changed = true
  while changed {
    changed = false
    for i in 0..<remaining.length() {
      if remaining[i] is Some(_) && g.tap(remaining, i) is Some(_) {
        remaining[i] = None
        changed = true
      }
    }
  }
  let out = []
  for i, p in remaining {
    if p is Some(_) {
      out.push(i)
    }
  }
  out
}

///|
/// Breadth-first search over player taps; once every remaining rope has a clear
/// exit, the rest of the certificate is an automatic suffix.
pub fn Board::minimum_taps(
  self : Board,
  g : Geo,
  fallback : Array[Int],
  budget : Int,
) -> Par {
  let verified = self.replay_plan(g, fallback)
  if !verified.solved {
    abort("Par requires a complete solution")
  }
  let start = some_paths(self.ropes)
  let qpaths : Array[Array[Path?]] = [start]
  let qparent = [-1]
  let qmove = [-1]
  let qdepth = [0]
  let seen : Map[String, Bool] = Map([])
  seen[g.key(start)] = true
  let mut q = 0
  while q < qpaths.length() {
    if q >= budget {
      return { plan: fallback.copy(), par: verified.taps, exact: false }
    }
    let paths = qpaths[q]
    let depth = qdepth[q]
    if depth >= verified.taps {
      q += 1
      continue
    }
    if self.all_free(g, paths) {
      let plan = []
      let mut node = q
      while qparent[node] >= 0 {
        plan.push(qmove[node])
        node = qparent[node]
      }
      plan.rev_in_place()
      let mut any = false
      for i, p in paths {
        if p is Some(_) {
          plan.push(i)
          any = true
        }
      }
      return { plan, par: imax(if any { 1 } else { 0 }, depth), exact: true }
    }
    for i in 0..<paths.length() {
      if paths[i] is None {
        continue
      }
      guard g.tap(paths, i) is Some(next) else { continue }
      let key = g.key(next.paths)
      if seen.contains(key) {
        continue
      }
      seen[key] = true
      qpaths.push(next.paths)
      qparent.push(q)
      qmove.push(i)
      qdepth.push(depth + 1)
    }
    q += 1
  }
  { plan: fallback.copy(), par: verified.taps, exact: true }
}
