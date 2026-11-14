// Square boards without spinners: the compact offset kernels of levels.js. A rope
// can only occupy cells of its own track (its body, then its way out as fixed
// mirrors bend it), so a board is one offset per rope.

///|
pub let sq_dx : FixedArray[Int32] = [1, 0, -1, 0]

///|
pub let sq_dy : FixedArray[Int32] = [0, 1, 0, -1]

///|
/// Fixed two-sided mirrors by cell (y * W + x): -1 none, 0 '/', 1 '\'. `keys`
/// keeps insertion order, as a JS Map does.
pub(all) struct SqMirrors {
  slope : FixedArray[Int32]
  keys : Array[Int32]
}

///|
pub fn SqMirrors::empty() -> SqMirrors {
  { slope: [], keys: [], }
}

///|
pub fn SqMirrors::of_board(b : Board) -> SqMirrors {
  let m = { slope: FixedArray::make(b.w * b.h, -1), keys: [], }
  for x in b.mirrors {
    m.set(x.cell.r * b.w + x.cell.q, x.kind)
  }
  m
}

///|
pub fn SqMirrors::set(self : SqMirrors, c : Int32, s : Int32) -> Unit {
  if self.slope[c] < 0 {
    self.keys.push(c)
  }
  self.slope[c] = s
}

///|
pub fn SqMirrors::get(self : SqMirrors, c : Int32) -> Int32 {
  if c >= 0 && c < self.slope.length() {
    self.slope[c]
  } else {
    -1
  }
}

///|
pub fn SqMirrors::has(self : SqMirrors, c : Int32) -> Bool {
  self.get(c) >= 0
}

///|
pub fn SqMirrors::size(self : SqMirrors) -> Int32 {
  self.keys.length()
}

///|
fn turn(s : Int32, dx : Int32, dy : Int32) -> (Int32, Int32) {
  if s == 0 {
    (-dy, -dx)
  } else {
    (dy, dx)
  }
}

///|
pub fn head_dir(path : Path) -> (Int32, Int32) {
  let h = path[path.length() - 1]
  let p = path[path.length() - 2]
  (h.q - p.q, h.r - p.r)
}

///|
fn exit_dir(path : Path, w : Int32, m : SqMirrors) -> (Int32, Int32) {
  let h = last(path)
  let (dx, dy) = head_dir(path)
  let s = m.get(h.r * w + h.q)
  if s < 0 {
    (dx, dy)
  } else {
    turn(s, dx, dy)
  }
}

// Scratch marks for duplicate checks, grown on demand.

///|
let marks : Array[Int32] = []

///|
let mark_stamp : Ref[Int32] = { val: 0, }

///|
fn next_stamp(size : Int32) -> Int32 {
  while marks.length() < size {
    marks.push(0)
  }
  mark_stamp.val += 1
  mark_stamp.val
}

///|
fn has_dup(out : Array[Int32], start : Int32) -> Bool {
  let mut top = 0
  for k in start..<out.length() {
    top = imax(top, out[k] + 1)
  }
  let s = next_stamp(top)
  for k in start..<out.length() {
    let c = out[k]
    if marks[c] == s {
      return true
    }
    marks[c] = s
  }
  false
}

///|
/// Append to `out` the cells a head at (x, y) passes moving (dx, dy), up to the
/// edge. False if that way out would enter a cell twice.
pub fn ray_cells(
  x0 : Int32,
  y0 : Int32,
  dx0 : Int32,
  dy0 : Int32,
  w : Int32,
  h : Int32,
  m : SqMirrors,
  out : Array[Int32],
) -> Bool {
  let start = out.length()
  let mut turned = false
  let mut x = x0
  let mut y = y0
  let mut dx = dx0
  let mut dy = dy0
  while true {
    x += dx
    y += dy
    if x < 0 || y < 0 || x >= w || y >= h {
      break
    }
    let c = y * w + x
    let s = m.get(c)
    out.push(c)
    if s >= 0 {
      let (a, b) = turn(s, dx, dy)
      dx = a
      dy = b
      turned = true
      if out.length() - start > 2 * w * h {
        return false
      }
    }
  }
  !(turned && has_dup(out, start))
}

///|
pub fn self_blocked(path : Path, w : Int32, h : Int32, m : SqMirrors) -> Bool {
  let hd = last(path)
  if m.size() > 0 {
    let (dx, dy) = exit_dir(path, w, m)
    let ahead = []
    if !ray_cells(hd.q, hd.r, dx, dy, w, h, m, ahead) {
      return true
    }
    let s = next_stamp(w * h)
    for p in path {
      marks[p.r * w + p.q] = s
    }
    for c in ahead {
      if marks[c] == s {
        return true
      }
    }
    return false
  }
  let (dx, dy) = head_dir(path)
  for p in path {
    if dx != 0 {
      if p.r == hd.r && (p.q - hd.q) * dx > 0 {
        return true
      }
    } else if p.q == hd.q && (p.r - hd.r) * dy > 0 {
      return true
    }
  }
  false
}

///|
/// The compact board: seq[i] is rope i's track, len[i] its length and off[i] how
/// far along it has slid (-1 once it has left).
pub(all) struct SqBoard {
  mut n : Int32
  mut left : Int32
  occ : FixedArray[Int32]
  at : FixedArray[Int32]
  seq : Array[FixedArray[Int32]]
  len : FixedArray[Int32]
  off : FixedArray[Int32]
  was : FixedArray[Int32]
  now : FixedArray[Int32]
}

///|
pub const GONE : Int32 = 32767

///|
/// None if some rope's way out passes a cell twice.
pub fn sq_board(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  m : SqMirrors,
) -> SqBoard? {
  let n = paths.length()
  let occ = FixedArray::make(w * h, -1)
  let at = FixedArray::make(w * h, 0)
  let seq = []
  let len = FixedArray::make(n, 0)
  let off = FixedArray::make(n, -1)
  let bent = m.size() > 0
  let mut left = 0
  for i in 0..<n {
    match paths[i] {
      None => seq.push(FixedArray::make(0, 0))
      Some(path) => {
        let hd = last(path)
        let (dx, dy) = if bent { exit_dir(path, w, m) } else { head_dir(path) }
        let s = path.map(p => p.r * w + p.q)
        if bent {
          if !ray_cells(hd.q, hd.r, dx, dy, w, h, m, s) {
            return None
          }
        } else {
          let mut x = hd.q + dx
          let mut y = hd.r + dy
          while x >= 0 && y >= 0 && x < w && y < h {
            s.push(y * w + x)
            x += dx
            y += dy
          }
        }
        seq.push(FixedArray::from_array(s))
        len[i] = path.length()
        for j in 0..<path.length() {
          occ[s[j]] = i
          at[s[j]] = j
        }
        off[i] = 0
        left += 1
      }
    }
  }
  Some({
    n,
    left,
    occ,
    at,
    seq,
    len,
    off,
    was: FixedArray::make(n, 0),
    now: FixedArray::make(n, 0),
  })
}

///|
pub fn sq_board_exn(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  m : SqMirrors,
) -> SqBoard {
  match sq_board(paths, w, h, m) {
    Some(b) => b
    None => abort("A rope's way out passes a cell twice")
  }
}

///|
/// Where rope i would stop if tapped: its new offset, or -1 if it would leave.
pub fn SqBoard::slide_to(b : SqBoard, i : Int32) -> Int32 {
  let s = b.seq[i]
  let mut p = b.off[i] + b.len[i]
  while p < s.length() && b.occ[s[p]] == -1 {
    p += 1
  }
  if p == s.length() {
    -1
  } else {
    p - b.len[i]
  }
}

///|
pub fn SqBoard::place(b : SqBoard, i : Int32, to : Int32) -> Unit {
  let s = b.seq[i]
  let l = b.len[i]
  let from = b.off[i]
  if from >= 0 {
    for p in from..<(from + l) {
      b.occ[s[p]] = -1
    }
    b.left -= 1
  }
  if to >= 0 {
    for p in to..<(to + l) {
      b.occ[s[p]] = i
      b.at[s[p]] = p
    }
    b.left += 1
  }
  b.off[i] = to
}

///|
/// The relaxation: how many ropes certainly can never leave.
pub fn SqBoard::relax(b : SqBoard) -> Int32 {
  let n = b.n
  let was = b.was
  let now = b.now
  let mut waiting = 0
  for i in 0..<n {
    let v = if b.off[i] < 0 { GONE } else { b.off[i] }
    was[i] = v
    now[i] = v
    if b.off[i] >= 0 {
      waiting += 1
    }
  }
  let mut moved = true
  while moved && waiting > 0 {
    moved = false
    for i in 0..<n {
      if was[i] == GONE {
        continue
      }
      let s = b.seq[i]
      let l = b.len[i]
      let mut r = was[i]
      while true {
        let p = r + l
        if p >= s.length() {
          r = GONE
          break
        }
        let c = s[p]
        let z = b.occ[c]
        if z != -1 && (z == i || was[z] <= b.at[c]) {
          break
        }
        r += 1
      }
      if r != was[i] {
        now[i] = r
        moved = true
        if r == GONE {
          waiting -= 1
        }
      }
    }
    for i in 0..<n {
      was[i] = now[i]
    }
  }
  waiting
}

///|
pub fn SqBoard::all_free(b : SqBoard) -> Bool {
  for i in 0..<b.n {
    if b.off[i] >= 0 && b.slide_to(i) >= 0 {
      return false
    }
  }
  true
}

///|
pub fn SqBoard::paths(b : SqBoard, w : Int32) -> Array[Path?] {
  Array::makei(b.n, i => {
    if b.off[i] < 0 {
      None
    } else {
      let s = b.seq[i]
      Some(
        Array::makei(b.len[i], j => {
          let c = s[b.off[i] + j]
          { q: c % w, r: c / w, }
        }),
      )
    }
  })
}

///|
pub fn sq_frozen(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  m : SqMirrors,
) -> Array[Int32] {
  let b = sq_board_exn(paths, w, h, m)
  ignore(b.relax())
  let out = []
  for i in 0..<b.n {
    if b.now[i] == b.off[i] {
      out.push(i)
    }
  }
  out
}

///|
/// solved: Some(true), Some(false) when certainly unsolvable, None when the budget ran out.
pub(all) struct Solved {
  solved : Bool?
  moves : Array[Int32]
  nodes : Int32
}

///|
pub fn sq_solve(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  budget : Int32,
  prefer : Array[Int32],
  m : SqMirrors,
) -> Solved {
  let b = sq_board_exn(paths, w, h, m)
  let n = b.n
  let hopeless : Map[String, Bool] = Map([])
  let moves = []
  let limit = if budget == 0 { 20000 } else { budget }
  let rank = FixedArray::make(n, 1000000)
  let later = FixedArray::make(n, 1000000)
  for k, i in prefer {
    if i >= 0 && i < n {
      if rank[i] == 1000000 {
        rank[i] = k
      }
      later[i] = k
    }
  }
  let mut nodes = 0
  let mut gave_up = false
  fn search() -> Bool {
    if b.left == 0 {
      return true
    }
    nodes += 1
    if nodes > limit {
      gave_up = true
      return false
    }
    let key = key_of(b.off)
    if hopeless.contains(key) {
      return false
    }
    if b.relax() > 0 {
      hopeless[key] = true
      return false
    }
    let tries : Array[(Int32, Int32, Int32)] = []
    for i in 0..<n {
      if b.off[i] < 0 {
        continue
      }
      let to = b.slide_to(i)
      if to != b.off[i] {
        let r = if b.off[i] != 0 { later[i] } else { rank[i] }
        tries.push((i, to, r * 2 + (if to < 0 { 0 } else { 1 })))
      }
    }
    ssort(tries, (x, y) => if x.2 != y.2 { x.2 - y.2 } else { x.0 - y.0 })
    for t in tries {
      let from = b.off[t.0]
      b.place(t.0, t.1)
      moves.push(t.0)
      if search() {
        return true
      }
      ignore(moves.pop())
      b.place(t.0, from)
      if gave_up {
        return false
      }
    }
    hopeless[key] = true
    false
  }

  let solved = search()
  {
    solved: if solved {
      Some(true)
    } else if gave_up {
      None
    } else {
      Some(false)
    },
    moves,
    nodes,
  }
}

///|
/// Only player taps count: once no rope blocks another, the rest is automatic.
pub fn sq_player_taps(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  taps : Array[Int32],
  m : SqMirrors,
) -> Int32? {
  let b = sq_board_exn(paths, w, h, m)
  let mut count = 0
  let mut auto = false
  for i in taps {
    if b.off[i] < 0 {
      continue
    }
    let to = b.slide_to(i)
    if to == b.off[i] {
      return None
    }
    if !auto {
      count += 1
    }
    b.place(i, to)
    if !auto && b.all_free() {
      auto = true
    }
  }
  if b.left > 0 {
    None
  } else {
    Some(count)
  }
}

///|
pub(all) struct Par {
  plan : Array[Int32]
  par : Int32
  exact : Bool
}

///|
pub fn sq_fewest_player_taps(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  known : Array[Int32],
  budget : Int32,
  m : SqMirrors,
) -> Par? {
  let count = match sq_player_taps(paths, w, h, known, m) {
    None => return None
    Some(c) => c
  }
  let b = sq_board_exn(paths, w, h, m)
  let limit = if budget == 0 { 6000 } else { budget }
  let moves = []
  let tried : Map[String, Int32] = Map([])
  let rank = FixedArray::make(b.n, 1000000)
  let later = FixedArray::make(b.n, 1000000)
  for k, i in known {
    if rank[i] == 1000000 {
      rank[i] = k
    }
    later[i] = k
  }
  let mut nodes = 0
  let mut gave_up = false
  let blockers = FixedArray::make(b.n, false)
  fn bound() -> Int32 {
    blockers.fill(false)
    let mut total = 0
    for i in 0..<b.n {
      if b.off[i] >= 0 {
        let seq = b.seq[i]
        for p in (b.off[i] + b.len[i])..<seq.length() {
          let z = b.occ[seq[p]]
          if z >= 0 && !blockers[z] {
            blockers[z] = true
            total += 1
          }
        }
      }
    }
    total
  }

  let lower = imax(if b.left > 0 { 1 } else { 0 }, bound())
  fn search(remaining : Int32) -> Bool {
    if b.all_free() {
      return true
    }
    if remaining == 0 || bound() > remaining {
      return false
    }
    nodes += 1
    if nodes > limit {
      gave_up = true
      return false
    }
    let key = key_of(b.off)
    if tried.get(key) is Some(t) && t >= remaining {
      return false
    }
    if b.relax() > 0 {
      tried[key] = 1000000
      return false
    }
    let choices : Array[(Int32, Int32, Int32)] = []
    for i in 0..<b.n {
      if b.off[i] >= 0 {
        let to = b.slide_to(i)
        if to != b.off[i] {
          choices.push((i, to, if b.off[i] != 0 { later[i] } else { rank[i] }))
        }
      }
    }
    ssort(choices, (x, y) => if x.2 != y.2 { x.2 - y.2 } else { x.0 - y.0 })
    for t in choices {
      let from = b.off[t.0]
      b.place(t.0, t.1)
      moves.push(t.0)
      if search(remaining - 1) {
        return true
      }
      ignore(moves.pop())
      b.place(t.0, from)
      if gave_up {
        return false
      }
    }
    tried[key] = remaining
    false
  }

  let mut k = lower
  while k < count && !gave_up {
    if search(k) {
      let manual = moves.length()
      for i in 0..<b.n {
        if b.off[i] >= 0 {
          moves.push(i)
        }
      }
      return Some({ plan: moves, par: manual, exact: true, })
    }
    k += 1
  }
  Some({ plan: known.copy(), par: count, exact: !gave_up, })
}

///|
pub fn sq_play(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  taps : Array[Int32],
  m : SqMirrors,
) -> Array[Path?] {
  let b = sq_board_exn(paths, w, h, m)
  for i in taps {
    if b.off[i] >= 0 {
      b.place(i, b.slide_to(i))
    }
  }
  b.paths(w)
}

///|
pub const EV_EXIT : Int32 = 0

///|
pub const EV_BOUNCE : Int32 = 1

///|
pub const EV_SLIDE : Int32 = 2

///|
pub(all) struct Replayed {
  solved : Bool
  taps : Int32
  events : Array[Int32]
  paths : Array[Path?]
}

///|
pub fn sq_replay(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  taps : Array[Int32],
  m : SqMirrors,
) -> Replayed {
  let b = sq_board_exn(paths, w, h, m)
  let events = []
  let mut count = 0
  let mut auto = false
  for i in taps {
    let to = if b.off[i] < 0 { b.off[i] } else { b.slide_to(i) }
    if to == b.off[i] {
      return { solved: false, taps: count, events, paths: b.paths(w), }
    }
    if !auto {
      count += 1
    }
    b.place(i, to)
    events.push(if to < 0 { EV_EXIT } else { EV_SLIDE })
    if b.all_free() {
      auto = true
    }
  }
  { solved: b.left == 0, taps: count, events, paths: b.paths(w), }
}

///|
pub fn sq_free(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  m : SqMirrors,
) -> Bool {
  sq_board_exn(paths, w, h, m).all_free()
}

///|
/// Each rope's whole track as cell indices; None if a way out passes a cell twice.
pub fn sq_tracks(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  m : SqMirrors,
) -> Array[FixedArray[Int32]]? {
  match sq_board(paths, w, h, m) {
    Some(b) => Some(b.seq)
    None => None
  }
}

///|
/// Move exits the rest of the solution does not need to the automatic release.
pub fn sq_postpone_exits(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  taps : Array[Int32],
  m : SqMirrors,
) -> Array[Int32]? {
  let mut best = taps.copy()
  let mut count = match sq_player_taps(paths, w, h, best, m) {
    None => return None
    Some(c) => c
  }
  for _ in 0..<2 {
    let mut improved = false
    for k = best.length() - 1; k >= 0; k = k - 1 {
      let i = best[k]
      if index_from(best, i, k + 1) >= 0 {
        continue
      }
      let trial = best[0:k].to_owned()
      for j in (k + 1)..<best.length() {
        trial.push(best[j])
      }
      trial.push(i)
      if sq_player_taps(paths, w, h, trial, m) is Some(c) && c < count {
        best = trial
        count = c
        improved = true
      }
    }
    if !improved {
      break
    }
  }
  Some(best)
}

///|
/// The casual player: tap a rope that can leave if there is one, otherwise any
/// rope that can move, at random. Returns the share of games it wins.
pub fn sq_casual_wins(
  paths : Array[Path?],
  w : Int32,
  h : Int32,
  rng : Rng,
  games : Int32,
  m : SqMirrors,
) -> Double {
  let b = sq_board_exn(paths, w, h, m)
  let exits = []
  let moves = []
  let mut wins = 0
  for _ in 0..<games {
    b.occ.fill(-1)
    b.left = 0
    for i in 0..<b.n {
      b.off[i] = -1
      b.place(i, 0)
    }
    while true {
      exits.clear()
      moves.clear()
      for i in 0..<b.n {
        if b.off[i] >= 0 {
          let to = b.slide_to(i)
          if to < 0 {
            exits.push(i)
          } else if to != b.off[i] {
            moves.push(i)
            moves.push(to)
          }
        }
      }
      if exits.length() > 0 {
        b.place(exits[rng.below(exits.length())], -1)
      } else if moves.length() > 0 {
        let k = 2 *
          (rng.next() * moves.length().to_double() / 2.0).floor().to_int()
        b.place(moves[k], moves[k + 1])
      } else {
        break
      }
      if b.left == 0 {
        wins += 1
        break
      }
    }
  }
  wins.to_double() / imax(1, games).to_double()
}

///|
pub fn bends_of(path : Path) -> Int32 {
  let mut n = 0
  for i in 2..<path.length() {
    if path[i].q - path[i - 1].q != path[i - 1].q - path[i - 2].q ||
      path[i].r - path[i - 1].r != path[i - 1].r - path[i - 2].r {
      n += 1
    }
  }
  n
}

///|
/// Every rope standing in each rope's way out, in track order.
fn sq_blockers(b : SqBoard) -> Array[Array[Int32]] {
  Array::makei(b.n, i => {
    let s = b.seq[i]
    let seen = []
    for p in b.len[i]..<s.length() {
      let o = b.occ[s[p]]
      if o != -1 && !contains(seen, o) {
        seen.push(o)
      }
    }
    seen
  })
}

///|
/// Strongly connected groups of the "waits for" links (Tarjan, iterative).
fn groups_of(blk : Array[Array[Int32]]) -> Array[Array[Int32]] {
  let n = blk.length()
  let index = FixedArray::make(n, -1)
  let low = FixedArray::make(n, 0)
  let on = FixedArray::make(n, false)
  let stack = []
  let groups = []
  let mut next = 0
  for root in 0..<n {
    if index[root] >= 0 {
      continue
    }
    let work : Array[(Int32, Ref[Int32])] = [(root, { val: 0, })]
    index[root] = next
    low[root] = next
    next += 1
    stack.push(root)
    on[root] = true
    while work.length() > 0 {
      let (v, pos) = work[work.length() - 1]
      if pos.val < blk[v].length() {
        let x = blk[v][pos.val]
        pos.val += 1
        if index[x] < 0 {
          index[x] = next
          low[x] = next
          next += 1
          stack.push(x)
          on[x] = true
          work.push((x, { val: 0, }))
        } else if on[x] && index[x] < low[v] {
          low[v] = index[x]
        }
      } else {
        ignore(work.pop())
        if work.length() > 0 {
          let u = work[work.length() - 1].0
          if low[v] < low[u] {
            low[u] = low[v]
          }
        }
        if low[v] == index[v] {
          let group = []
          while true {
            let x = stack.pop().unwrap()
            on[x] = false
            group.push(x)
            if x == v {
              break
            }
          }
          groups.push(group)
        }
      }
    }
  }
  groups
}

///|
/// Ropes that wait on one another in a circle (membership only).
pub fn sq_looped(b : SqBoard) -> FixedArray[Bool] {
  let out = FixedArray::make(b.n, false)
  for g in groups_of(sq_blockers(b)) {
    if g.length() > 1 {
      for i in g {
        out[i] = true
      }
    }
  }
  out
}
