// Hex boards without spinners: the woven builder and the compact offset kernels of
// hex/engine.js. Axial q/r coordinates; cell indices are offset columns.

///|
pub let hex_dq : FixedArray[Int] = [1, 0, -1, -1, 0, 1]

///|
pub let hex_dr : FixedArray[Int] = [0, 1, 1, 0, -1, -1]

///|
pub fn hex_inside(w : Int, h : Int, p : Pt) -> Bool {
  p.r >= 0 && p.r < h && p.q + floor_div(p.r, 2) >= 0 && p.q + floor_div(p.r, 2) < w
}

///|
pub fn hex_cell(p : Pt, w : Int) -> Int {
  p.r * w + p.q + floor_div(p.r, 2)
}

///|
pub fn hex_point(c : Int, w : Int) -> Pt {
  let r = c / w
  { q: c % w - r / 2, r }
}

///|
pub fn hex_reflect(d : Int, axis : Int) -> Int {
  ((2 * axis - d) % 6 + 6) % 6
}

///|
pub fn hex_dir_index(dq : Int, dr : Int) -> Int {
  for d in 0..<6 {
    if hex_dq[d] == dq && hex_dr[d] == dr {
      return d
    }
  }
  -1
}

///|
pub fn hex_mirrors(w : Int, h : Int, mirrors : Array[Mirror]) -> SqMirrors {
  let m = { slope: FixedArray::make(w * h, -1), keys: [] }
  for x in mirrors {
    m.set(hex_cell(x.cell, w), x.kind)
  }
  m
}

///|
/// Append the cells ahead of `head` moving in direction d, to the edge; false if
/// the way out would enter a cell twice. Turning mirror cells go to `turns`.
fn ray_track(
  w : Int,
  h : Int,
  head : Int,
  d0 : Int,
  m : SqMirrors,
  out : Array[Int],
  turns : Array[Int]?,
) -> Bool {
  let start = out.length()
  let mut p = hex_point(head, w)
  let mut d = d0
  let mut turned = false
  while true {
    p = { q: p.q + hex_dq[d], r: p.r + hex_dr[d] }
    if !hex_inside(w, h, p) {
      break
    }
    let c = hex_cell(p, w)
    let axis = m.get(c)
    out.push(c)
    if axis >= 0 {
      let e = hex_reflect(d, axis)
      if e != d {
        turned = true
        if turns is Some(t) && !contains(t, c) {
          t.push(c)
        }
      }
      d = e
      if out.length() - start > 2 * w * h {
        return false
      }
    }
  }
  !(turned && has_dup(out, start))
}

///|
fn exit_index(w : Int, path : Path, m : SqMirrors) -> Int {
  let (dq, dr) = head_dir(path)
  let d = hex_dir_index(dq, dr)
  let axis = m.get(hex_cell(last(path), w))
  if axis < 0 {
    d
  } else {
    hex_reflect(d, axis)
  }
}

///|
/// Mirror cells on which some rope's way out actually turns.
pub fn hex_turning(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  paths : Array[Path],
) -> Array[Int] {
  let bent = hex_mirrors(w, h, mirrors)
  let turns = []
  for path in paths {
    ignore(
      ray_track(
        w,
        h,
        hex_cell(last(path), w),
        exit_index(w, path, bent),
        bent,
        [],
        Some(turns),
      ),
    )
  }
  turns
}

///|
pub(all) struct HexBoard {
  w : Int
  n : Int
  tracks : Array[FixedArray[Int]]
  lengths : FixedArray[Int]
  offsets : FixedArray[Int]
  occupied : FixedArray[Int]
  at : FixedArray[Int]
  reach : FixedArray[Int]
  mut left : Int
}

///|
pub fn hex_compile(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  paths : Array[Path?],
) -> HexBoard? {
  let n = paths.length()
  let area = w * h
  let tracks = []
  let lengths = FixedArray::make(n, 0)
  let offsets = FixedArray::make(n, -1)
  let occupied = FixedArray::make(area, -1)
  let at = FixedArray::make(area, 0)
  let bent = hex_mirrors(w, h, mirrors)
  let mut left = 0
  for i in 0..<n {
    match paths[i] {
      None => tracks.push(FixedArray::make(0, 0))
      Some(path) => {
        let track = path.map(p => hex_cell(p, w))
        for j in 0..<track.length() {
          occupied[track[j]] = i
          at[track[j]] = j
        }
        if bent.size() > 0 {
          if !ray_track(
              w,
              h,
              track[track.length() - 1],
              exit_index(w, path, bent),
              bent,
              track,
              None,
            ) {
            return None
          }
        } else {
          let (dq, dr) = head_dir(path)
          let mut p = { q: last(path).q + dq, r: last(path).r + dr }
          while hex_inside(w, h, p) {
            track.push(hex_cell(p, w))
            p = { q: p.q + dq, r: p.r + dr }
          }
        }
        tracks.push(FixedArray::from_array(track))
        lengths[i] = path.length()
        offsets[i] = 0
        left += 1
      }
    }
  }
  Some({
    w,
    n,
    tracks,
    lengths,
    offsets,
    occupied,
    at,
    reach: FixedArray::make(n, 0),
    left,
  })
}

///|
pub fn hex_compile_exn(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  paths : Array[Path?],
) -> HexBoard {
  match hex_compile(w, h, mirrors, paths) {
    Some(b) => b
    None => abort("A rope's way out passes a cell twice")
  }
}

///|
/// Where rope i would stop: its new offset, -1 if it would leave, -2 if gone.
pub fn HexBoard::to(self : HexBoard, i : Int) -> Int {
  if i < 0 || i >= self.n || self.offsets[i] < 0 {
    return -2
  }
  let track = self.tracks[i]
  let length = self.lengths[i]
  let mut p = self.offsets[i] + length
  while p < track.length() && self.occupied[track[p]] < 0 {
    p += 1
  }
  if p == track.length() {
    -1
  } else {
    p - length
  }
}

///|
pub fn HexBoard::place(self : HexBoard, i : Int, target : Int) -> Unit {
  let from = self.offsets[i]
  let track = self.tracks[i]
  let length = self.lengths[i]
  if from >= 0 {
    for j in from..<(from + length) {
      self.occupied[track[j]] = -1
    }
    self.left -= 1
  }
  if target >= 0 {
    for j in target..<(target + length) {
      self.occupied[track[j]] = i
      self.at[track[j]] = j
    }
    self.left += 1
  }
  self.offsets[i] = target
}

///|
pub fn HexBoard::free(self : HexBoard) -> Bool {
  for i in 0..<self.n {
    if self.offsets[i] >= 0 && self.to(i) != -1 {
      return false
    }
  }
  true
}

///|
pub fn HexBoard::paths(self : HexBoard) -> Array[Path?] {
  Array::makei(self.n, i => if self.offsets[i] < 0 {
    None
  } else {
    let t = self.tracks[i]
    Some(
      Array::makei(self.lengths[i], j => hex_point(t[self.offsets[i] + j], self.w)),
    )
  })
}

///|
/// Optimistically let every rope use cells another could eventually vacate.
fn HexBoard::relaxed(self : HexBoard) -> FixedArray[Int] {
  let reach = self.reach
  for i in 0..<self.n {
    reach[i] = self.offsets[i]
  }
  let mut changed = true
  while changed {
    changed = false
    for i in 0..<self.n {
      if reach[i] < 0 {
        continue
      }
      let track = self.tracks[i]
      let length = self.lengths[i]
      let mut next = reach[i]
      while true {
        let j = next + length
        if j >= track.length() {
          next = -1
          break
        }
        let c = track[j]
        let owner = self.occupied[c]
        if owner >= 0 &&
          reach[owner] >= 0 &&
          (if owner == i { next } else { reach[owner] }) <= self.at[c] {
          break
        }
        next += 1
      }
      if next != reach[i] {
        reach[i] = next
        changed = true
      }
    }
  }
  reach
}

///|
pub fn HexBoard::dead(self : HexBoard) -> Bool {
  let reach = self.relaxed()
  for i in 0..<self.n {
    if reach[i] >= 0 {
      return true
    }
  }
  false
}

///|
pub fn HexBoard::frozen(self : HexBoard) -> Array[Int] {
  let reach = self.relaxed()
  let out = []
  for i in 0..<self.n {
    if self.offsets[i] >= 0 && reach[i] == self.offsets[i] {
      out.push(i)
    }
  }
  out
}

///|
fn offsets_key(o : FixedArray[Int]) -> String {
  key_of(o)
}

///|
pub fn hex_replay(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  moves : Array[Int],
  paths : Array[Path?],
) -> Replayed {
  let board = hex_compile_exn(w, h, mirrors, paths)
  let events = []
  let mut taps = 0
  let mut automatic = false
  for i in moves {
    let target = board.to(i)
    if target == -2 || target == board.offsets[i] {
      return { solved: false, paths: board.paths(), events, taps }
    }
    if !automatic {
      taps += 1
    }
    board.place(i, target)
    events.push(if target < 0 { EV_EXIT } else { EV_SLIDE })
    if board.free() {
      automatic = true
    }
  }
  { solved: board.left == 0, paths: board.paths(), events, taps }
}

///|
pub fn hex_solve(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  paths : Array[Path?],
  budget : Int,
  prefer : Array[Int],
) -> Solved {
  let board = hex_compile_exn(w, h, mirrors, paths)
  let seen : Map[String, Bool] = Map([])
  let moves = []
  let mut nodes = 0
  let mut exhausted = false
  fn search(preferred : ArrayView[Int]) -> Bool {
    if board.left == 0 {
      return true
    }
    let state = offsets_key(board.offsets)
    if seen.contains(state) {
      return false
    }
    nodes += 1
    if nodes > budget {
      exhausted = true
      return false
    }
    seen[state] = true
    if board.dead() {
      return false
    }
    let p0 = if preferred.length() > 0 { preferred[0] } else { -1 }
    let tries : Array[(Int, Int)] = []
    for i in 0..<paths.length() {
      let target = board.to(i)
      if target != -2 && target != board.offsets[i] {
        tries.push((i, target))
      }
    }
    ssort(tries, (a, b) => if a.0 == p0 {
      -1
    } else if b.0 == p0 {
      1
    } else {
      (if a.1 < 0 { 0 } else { 1 }) - (if b.1 < 0 { 0 } else { 1 })
    })
    for t in tries {
      let (i, target) = t
      let from = board.offsets[i]
      board.place(i, target)
      moves.push(i)
      if search(if i == p0 { preferred[1:] } else { preferred }) {
        return true
      }
      board.place(i, from)
      ignore(moves.pop())
      if exhausted {
        break
      }
    }
    false
  }

  let solved = search(prefer[:])
  {
    solved: if solved {
      Some(true)
    } else if exhausted {
      None
    } else {
      Some(false)
    },
    moves: if solved { moves } else { [] },
    nodes,
  }
}

///|
pub fn hex_postpone_exits(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  ropes : Array[Path],
  plan : Array[Int],
) -> Array[Int]? {
  let start = some_paths(ropes)
  let mut best = plan.copy()
  let mut result = hex_replay(w, h, mirrors, best, start)
  if !result.solved {
    return None
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
      let r = hex_replay(w, h, mirrors, trial, start)
      if r.solved && r.taps < result.taps {
        best = trial
        result = r
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
pub fn hex_casual_wins(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  ropes : Array[Path],
  rng : Rng,
  games : Int,
) -> Double {
  let mut wins = 0
  let exits = []
  let moves = []
  let start = some_paths(ropes)
  for _ in 0..<games {
    let b = hex_compile_exn(w, h, mirrors, start)
    while true {
      exits.clear()
      moves.clear()
      for i in 0..<ropes.length() {
        if b.offsets[i] >= 0 {
          let t = b.to(i)
          if t == -1 {
            exits.push(i)
          } else if t != b.offsets[i] {
            moves.push(i)
            moves.push(t)
          }
        }
      }
      if exits.length() > 0 {
        b.place(exits[rng.below(exits.length())], -1)
      } else if moves.length() > 0 {
        let k = 2 * (rng.next() * moves.length().to_double() / 2.0).floor().to_int()
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
pub fn hex_fewest_player_taps(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  ropes : Array[Path],
  fallback : Array[Int],
  budget : Int,
) -> Par {
  let start = some_paths(ropes)
  let verified = hex_replay(w, h, mirrors, fallback, start)
  if !verified.solved {
    abort("Par requires a replayable Hex solution")
  }
  let b = hex_compile_exn(w, h, mirrors, start)
  let n = b.n
  let moves = []
  let tried : Map[String, Int] = Map([])
  let rank = FixedArray::make(n, 1000000)
  let later = FixedArray::make(n, 1000000)
  for step, id in fallback {
    if rank[id] == 1000000 {
      rank[id] = step
    }
    later[id] = step
  }
  let mut nodes = 0
  let mut exhausted = false
  let blockers = FixedArray::make(n, false)
  fn bound() -> Int {
    blockers.fill(false)
    let mut count = 0
    for i in 0..<n {
      if b.offsets[i] >= 0 {
        let t = b.tracks[i]
        for k in (b.offsets[i] + b.lengths[i])..<t.length() {
          let owner = b.occupied[t[k]]
          if owner >= 0 && !blockers[owner] {
            blockers[owner] = true
            count += 1
          }
        }
      }
    }
    count
  }

  fn search(remaining : Int) -> Bool {
    if b.free() {
      return true
    }
    if remaining == 0 || bound() > remaining {
      return false
    }
    nodes += 1
    if nodes > budget {
      exhausted = true
      return false
    }
    let state = offsets_key(b.offsets)
    if tried.get(state) is Some(t) && t >= remaining {
      return false
    }
    if b.dead() {
      tried[state] = 1000000
      return false
    }
    let choices : Array[(Int, Int, Int)] = []
    for i in 0..<n {
      let to = b.to(i)
      if to != -2 && to != b.offsets[i] {
        choices.push((i, to, if b.offsets[i] != 0 { later[i] } else { rank[i] }))
      }
    }
    ssort(choices, (a, c) => if a.2 != c.2 { a.2 - c.2 } else { a.0 - c.0 })
    for t in choices {
      let (i, to, _) = t
      let from = b.offsets[i]
      b.place(i, to)
      moves.push(i)
      if search(remaining - 1) {
        return true
      }
      ignore(moves.pop())
      b.place(i, from)
      if exhausted {
        return false
      }
    }
    tried[state] = remaining
    false
  }

  let mut taps = imax(1, bound())
  while taps < verified.taps && !exhausted {
    if search(taps) {
      let manual = moves.length()
      for i in 0..<n {
        if b.offsets[i] >= 0 {
          moves.push(i)
        }
      }
      return { plan: moves, par: manual, exact: true }
    }
    taps += 1
  }
  { plan: fallback.copy(), par: verified.taps, exact: !exhausted }
}

///|
struct HexIntent {
  moves : Array[Int]
  cost : Int
}

///|
/// Replay exact slide destinations (stops are head cells, in order per rope).
fn hex_intentions(
  w : Int,
  h : Int,
  mirrors : Array[Mirror],
  ropes : Array[Path],
  stops : Array[Array[Int]],
  certificate : Array[Int]?,
) -> HexIntent? {
  let b = hex_compile_exn(w, h, mirrors, some_paths(ropes))
  let n = ropes.length()
  let done = FixedArray::make(n, 0)
  let released = FixedArray::make(w * h, 0)
  let moved_at = FixedArray::make(n, 0)
  let moves = []
  let mut cost = 0
  fn step(i : Int) -> Bool {
    let from = b.offsets[i]
    let target = b.to(i)
    if target == -2 || target == from {
      return false
    }
    let expected = stops[i]
    let stop = if done[i] < expected.length() { expected[done[i]] } else { -1 }
    let length = b.lengths[i]
    let track = b.tracks[i]
    if stop >= 0 {
      if target < 0 || track[target + length - 1] != stop {
        return false
      }
    } else if target != -1 {
      return false
    }
    let mut layer = moved_at[i]
    let end = if target < 0 { track.length() } else { target + length }
    for j in (from + length)..<end {
      layer = imax(layer, released[track[j]])
    }
    if target >= 0 {
      let owner = b.occupied[track[end]]
      if owner >= 0 {
        layer = imax(layer, moved_at[owner])
      }
    }
    layer += 1
    moved_at[i] = layer
    let stop_at = if target < 0 { from + length } else { imin(from + length, target) }
    for j in from..<stop_at {
      released[track[j]] = layer
    }
    b.place(i, target)
    done[i] += 1
    moves.push(i)
    if target < 0 {
      cost += layer
    }
    true
  }

  match certificate {
    Some(cert) =>
      for i in cert {
        if !step(i) {
          return None
        }
      }
    None => {
      let mut changed = true
      while changed && b.left > 0 {
        changed = false
        for i = n - 1; i >= 0; i = i - 1 {
          if step(i) {
            changed = true
          }
        }
      }
    }
  }
  if b.left > 0 {
    None
  } else {
    Some({ moves, cost })
  }
}

///|
pub(all) struct HexCfg {
  w : Int
  h : Int
  stage : Int
  coverage : Double
  length : Int
  tap_depth : Double
  mirrors : Array[Mirror]
  knots : Int
  traps : Int
  initial_ropes : Array[Path]
  initial_stops : Array[Array[Int]]
  initial_plan : Array[Int]?
}

///|
pub(all) struct HexBuilt {
  ropes : Array[Path]
  plan : Array[Int]
}

///|
struct HexShape {
  path : Path
  ids : Array[Int]
  ray : Array[Int]
  turns : Array[Int]
}

///|
pub fn hex_build(rng : Rng, cfg : HexCfg) -> HexBuilt? {
  let w = cfg.w
  let h = cfg.h
  let area = w * h
  let points = Array::makei(area, i => hex_point(i, w))
  let neighbours = Array::makei(area, c => FixedArray::makei(6, d => {
    let q : Pt = { q: points[c].q + hex_dq[d], r: points[c].r + hex_dr[d] }
    if hex_inside(w, h, q) {
      hex_cell(q, w)
    } else {
      -1
    }
  }))
  let occupied = FixedArray::make(area, -1)
  let seen = FixedArray::make(area, 0)
  let forward = FixedArray::make(area, 0)
  let mirrors = cfg.mirrors
  let ropes : Array[Path] = []
  let stops : Array[Array[Int]] = []
  let mut stamp = 0
  let mut covered = 0
  let mut knots = 0
  let mut result : HexIntent = { moves: [], cost: 0 }
  let bent = hex_mirrors(w, h, mirrors)
  let tile = FixedArray::make(area, false)
  for c in bent.keys {
    tile[c] = true
  }
  let kept = FixedArray::make(area, false)
  fn free(c : Int) -> Bool {
    c >= 0 && occupied[c] < 0 && !tile[c] && !kept[c]
  }

  fn ray(head : Int, d : Int) -> Array[Int]? {
    let out = []
    if bent.size() > 0 {
      if ray_track(w, h, head, d, bent, out, None) {
        Some(out)
      } else {
        None
      }
    } else {
      let mut c = neighbours[head][d]
      while c >= 0 {
        out.push(c)
        c = neighbours[c][d]
      }
      Some(out)
    }
  }

  fn intent(cert : Array[Int]?) -> HexIntent? {
    hex_intentions(w, h, mirrors, ropes, stops, cert)
  }

  fn shape(want : Int, aim : (Int, Int)?) -> HexShape? {
    let minimum = 2
    let mut head = match aim {
      Some((hd, _)) => hd
      None => -1
    }
    if aim is None {
      for _ in 0..<24 {
        let c = rng.below(area)
        if free(c) {
          head = c
          break
        }
      }
    }
    if head < 0 {
      return None
    }
    let dir = match aim {
      Some((_, d)) => d
      None => rng.below(6)
    }
    let back = (dir + 3) % 6
    let second = neighbours[head][back]
    if !free(second) {
      return None
    }
    let turns = []
    let ahead = []
    if bent.size() > 0 {
      if !ray_track(w, h, head, dir, bent, ahead, Some(turns)) {
        return None
      }
    } else {
      let mut c = neighbours[head][dir]
      while c >= 0 {
        ahead.push(c)
        c = neighbours[c][dir]
      }
    }
    stamp += 1
    let body = [head, second]
    seen[head] = stamp
    seen[second] = stamp
    for c in ahead {
      forward[c] = stamp
    }
    if forward[second] == stamp {
      return None
    }
    let mut previous = back
    while body.length() < want {
      let choices = []
      let tip = body[body.length() - 1]
      for d in 0..<6 {
        let c = neighbours[tip][d]
        if free(c) && seen[c] != stamp && forward[c] != stamp {
          choices.push(d)
        }
      }
      if choices.length() == 0 {
        break
      }
      previous = if contains(choices, previous) && rng.next() < 0.38 {
        previous
      } else {
        choices[rng.below(choices.length())]
      }
      let c = neighbours[tip][previous]
      seen[c] = stamp
      body.push(c)
    }
    if body.length() < minimum {
      return None
    }
    body.rev_in_place()
    Some({ path: body.map(c => points[c]), ids: body, ray: ahead, turns })
  }

  // Optional repeated-slide core, replayed before any gap-filling additions.
  if cfg.initial_ropes.length() > 0 {
    let used = FixedArray::make(area, false)
    let mut size = 0
    for path in cfg.initial_ropes {
      if path.length() < 2 {
        return None
      }
      for p in path {
        if !hex_inside(w, h, p) || used[hex_cell(p, w)] {
          return None
        }
      }
      for p in path {
        used[hex_cell(p, w)] = true
        size += 1
      }
      ropes.push(path.copy())
    }
    let core = hex_compile_exn(w, h, mirrors, some_paths(ropes))
    for i in 0..<ropes.length() {
      let offs = if i < cfg.initial_stops.length() {
        cfg.initial_stops[i]
      } else {
        []
      }
      stops.push(offs.map(o => core.tracks[i][o + core.lengths[i] - 1]))
    }
    guard intent(cfg.initial_plan) is Some(r) else { return None }
    result = r
    for i, path in ropes {
      for p in path {
        occupied[hex_cell(p, w)] = i
      }
    }
    covered = size
    knots = stops.filter(s => s.length() > 0).length()
  }
  // Mutual-wait pairs: at least one rope of each must slide.
  let stage = cfg.stage
  let mut attempt = 0
  while attempt < imax(5000, area * 24) && knots < cfg.knots {
    attempt += 1
    let length = imin(38, 7 + stage / 2)
    let base = 4 + stage / 14
    guard shape(base + rng.below(length), None) is Some(a) else { continue }
    for c in a.ids {
      occupied[c] = 9999
    }
    let bs = shape(base + rng.below(length), None)
    for c in a.ids {
      occupied[c] = -1
    }
    guard bs is Some(bb) else { continue }
    if !a.ray.iter().any(c => contains(bb.ids, c)) ||
      !bb.ray.iter().any(c => contains(a.ids, c)) {
      continue
    }
    let i = ropes.length()
    ropes.push(a.path)
    ropes.push(bb.path)
    stops.push([])
    stops.push([])
    let board = hex_compile_exn(w, h, mirrors, some_paths(ropes))
    let mut trial : HexIntent? = None
    for id in [i, i + 1] {
      let target = board.to(id)
      if target <= 0 {
        continue
      }
      stops[id] = [board.tracks[id][target + board.lengths[id] - 1]]
      trial = intent(None)
      if trial is Some(_) {
        break
      }
      stops[id] = []
    }
    guard trial is Some(t) else {
      ignore(ropes.pop())
      ignore(ropes.pop())
      ignore(stops.pop())
      ignore(stops.pop())
      continue
    }
    result = t
    knots += 1
    for c in a.ids {
      occupied[c] = i
    }
    for c in bb.ids {
      occupied[c] = i + 1
    }
    covered += a.ids.length() + bb.ids.length()
  }
  // Long, winding additions that make many existing ropes wait.
  let mut attempts = 0
  let turned_by = FixedArray::make(area, false)
  let mut turned_count = 0
  fn aim_at() -> (Int, Int)? {
    let idle = mirrors.filter(m => !turned_by[hex_cell(m.cell, w)])
    if idle.length() == 0 {
      return None
    }
    let m = idle[rng.below(idle.length())]
    let c = hex_cell(m.cell, w)
    let dirs = [0, 1, 2, 3, 4, 5].filter(e => e % 3 != m.kind % 3)
    let d = dirs[rng.below(dirs.length())]
    let j = 1 + rng.below(3)
    let mut head = c
    let mut k = 0
    while k < j && head >= 0 {
      head = neighbours[head][(d + 3) % 6]
      k += 1
    }
    let mut x = head
    k = 0
    while k < j && x >= 0 {
      if !free(x) {
        return None
      }
      k += 1
      x = neighbours[x][d]
    }
    if head >= 0 {
      Some((head, d))
    } else {
      None
    }
  }

  fn note_turns(path : Path) -> Unit {
    if bent.size() > 0 {
      let t = []
      ignore(
        ray_track(
          w,
          h,
          hex_cell(last(path), w),
          exit_index(w, path, bent),
          bent,
          [],
          Some(t),
        ),
      )
      for c in t {
        if !turned_by[c] {
          turned_by[c] = true
          turned_count += 1
        }
      }
    }
  }

  for path in ropes {
    note_turns(path)
  }
  let mut traps = 0
  fn try_trap() -> Bool {
    let board = hex_compile_exn(w, h, mirrors, some_paths(ropes))
    let way_out = Array::makei(ropes.length(), i => {
      let s = FixedArray::make(area, false)
      let t = board.tracks[i]
      for k in board.lengths[i]..<t.length() {
        s[t[k]] = true
      }
      s
    })
    let spots : Array[(Int, Int, Int, Array[Int])] = []
    let deadly : Array[(Int, Int, Int, Array[Int])] = []
    for c in 0..<area {
      if !free(c) {
        continue
      }
      for d in 0..<6 {
        if !free(neighbours[c][(d + 3) % 6]) {
          continue
        }
        guard ray(c, d) is Some(ahead) else { continue }
        let mut gap = 0
        while gap < ahead.length() && gap < 4 && occupied[ahead[gap]] < 0 {
          gap += 1
        }
        if gap >= 1 &&
          gap <= 3 &&
          gap < ahead.length() &&
          occupied[ahead[gap]] >= 0 {
          let mut ok = true
          for k in 0..<gap {
            if kept[ahead[k]] {
              ok = false
            }
          }
          if !ok {
            continue
          }
          let cells = ahead[0:gap].to_owned()
          let spot = (c, d, gap, cells)
          let blocker = occupied[ahead[gap]]
          spots.push(spot)
          if blocker < way_out.length() {
            let wo = way_out[blocker]
            if wo[c] || cells.iter().any(x => wo[x]) {
              deadly.push(spot)
            }
          }
        }
      }
    }
    let pool = if deadly.length() > 0 { deadly } else { spots }
    for _ in 0..<16 {
      if pool.length() == 0 {
        break
      }
      let (sc, sd, sgap, scells) = pool[rng.below(pool.length())]
      let want = 3 +
        (rng.next() * dmax(2.0, cfg.length.to_double() / 2.0)).floor().to_int()
      guard shape(want, Some((sc, sd))) is Some(shaped) else { continue }
      let id = ropes.length()
      ropes.push(shaped.path)
      stops.push([])
      let trial = intent(None)
      let mut fatal = false
      if trial is Some(_) {
        let board = hex_compile_exn(w, h, mirrors, some_paths(ropes))
        if board.to(id) == sgap {
          board.place(id, sgap)
          fatal = board.dead()
        }
      }
      if !fatal {
        ignore(ropes.pop())
        ignore(stops.pop())
        continue
      }
      result = trial.unwrap()
      note_turns(shaped.path)
      for c in shaped.ids {
        occupied[c] = id
      }
      covered += shaped.ids.length()
      for x in scells {
        kept[x] = true
      }
      traps += 1
      return true
    }
    false
  }

  let limit = area * 22
  while covered.to_double() < area.to_double() * cfg.coverage && attempts < limit {
    if traps < cfg.traps &&
      ropes.length() >= 2 &&
      rng.next() < 0.5 &&
      try_trap() {
      continue
    }
    let mut best : (HexShape, HexIntent, Double)? = None
    let aim = bent.size() > turned_count
    let mut n = 0
    while n < 12 {
      let old = attempts
      attempts += 1
      if !(old < limit) {
        break
      }
      let want = 4 +
        ((0.45 + 0.55 * rng.next()) * cfg.length.to_double()).floor().to_int()
      let aim_spot = if aim && n < 4 { aim_at() } else { None }
      n += 1
      guard shape(want, aim_spot) is Some(s) else { continue }
      ropes.push(s.path)
      stops.push([])
      let trial = intent(None)
      ignore(ropes.pop())
      ignore(stops.pop())
      guard trial is Some(t) else { continue }
      let mut fresh = 0
      for c in s.turns {
        if !turned_by[c] {
          fresh += 1
        }
      }
      let gain = (t.cost - result.cost).to_double() * (cfg.tap_depth - 1.0) +
        (s.ids.length() * 4).to_double() +
        (30 * fresh).to_double()
      match best {
        Some((_, _, g)) if !(gain > g) => ()
        _ => best = Some((s, t, gain))
      }
    }
    guard best is Some((s, t, _)) else { continue }
    let id = ropes.length()
    ropes.push(s.path)
    stops.push([])
    result = t
    note_turns(s.path)
    for c in s.ids {
      occupied[c] = id
    }
    covered += s.ids.length()
  }
  if intent(Some(result.moves)) is None {
    abort("Hex weaving certificate failed")
  }
  Some({ ropes, plan: result.moves })
}
