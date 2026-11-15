// The square woven builder of levels.js: a board is built backwards from the solved
// board together with its replayable intentions (lay, knot, trap). Every random draw
// happens in the same order as the JS, so the same seed weaves the same board.

///|
pub(all) struct WeaveCfg {
  w : Int32
  h : Int32
  len_lo : Int32
  len_hi : Int32
  min_len : Int32
  straight : Double
  cover : Double
  tap_depth : Double
  tie : Int32
  bait : Int32
  pull : Int32
  mirrors : SqMirrors
  initial_ropes : Array[Path]
  initial_stops : Array[Array[Int32]]
  initial_plan : Array[Int32]?
}

///|
pub(all) struct Woven {
  ropes : Array[Path]
  taps : Array[Int32]
  knots : Int32
  traps : Int32
}

///|
const WALKED : Int32 = -2

///|
const KEPT : Int32 = -3

///|
const MIRROR : Int32 = -4

///|
const MIN_ROPES : Int32 = 3

///|
const MIN_COVERAGE_SLIDE : Double = 0.72

///|
const MIN_COVERAGE_SMALL : Double = 0.6

///|
const MIN_BLOCKED_SHARE : Double = 0.5

///|
const SMALL_W : Int32 = 5

///|
const KNOT_TRIES : Int32 = 12

///|
const TRIES_PER_STEP : Int32 = 6

///|
const MAX_STUCK : Int32 = 4

///|
pub fn knots_wanted(d : Double) -> Int32 {
  if d < 12.0 {
    0
  } else {
    js_round(0.6 * d.sqrt())
  }
}

///|
pub(all) struct Style {
  name : String
  min_len : Int32
  straight : Double
  len_lo : Int32
  twisty : Bool
}

///|
pub fn Style::len_hi(self : Style, w : Int32) -> Int32 {
  match self.name {
    "short" => 5
    "medium" => 8
    _ => imax(8, w)
  }
}

///|
pub let styles : FixedArray[Style] = [
  { name: "short", min_len: 2, straight: 0.5, len_lo: 3, twisty: false, },
  { name: "medium", min_len: 2, straight: 0.35, len_lo: 4, twisty: false, },
  { name: "twisty", min_len: 3, straight: 0.2, len_lo: 6, twisty: true, },
]

///|
/// The board the replay runs on, taking one more rope at a time with its
/// intentions: the offsets it is meant to stop at, in order, before it leaves.
struct Intentions {
  w : Int32
  h : Int32
  mirrors : SqMirrors
  b : SqBoard
  paths : Array[Path]
  stops : Array[Array[Int32]]
  cost : FixedArray[Int32]
  dep : FixedArray[Int32]
  cell_at : FixedArray[Int32]
  rope_at : FixedArray[Int32]
  cell_by : FixedArray[Int32]
  done : FixedArray[Int32]
  mut taps : Array[Int32]
  mut cost_sum : Int32
}

///|
fn Intentions::new(w : Int32, h : Int32, mirrors : SqMirrors) -> Intentions {
  let n = w * h
  let b : SqBoard = {
    n: 0,
    left: 0,
    occ: FixedArray::make(n, 0),
    at: FixedArray::make(n, 0),
    seq: [],
    len: FixedArray::make(n, 0),
    off: FixedArray::make(n, 0),
    was: FixedArray::make(n, 0),
    now: FixedArray::make(n, 0),
  }
  {
    w,
    h,
    mirrors,
    b,
    paths: [],
    stops: [],
    cost: FixedArray::make(n, 0),
    dep: FixedArray::make(n, 0),
    cell_at: FixedArray::make(n, 0),
    rope_at: FixedArray::make(n, 0),
    cell_by: FixedArray::make(n, 0),
    done: FixedArray::make(n, 0),
    taps: [],
    cost_sum: 0,
  }
}

///|
fn Intentions::add(self : Intentions, path : Path, st : Array[Int32]) -> Int32 {
  let b = self.b
  let hd = last(path)
  let (dx, dy) = head_dir(path)
  let w = self.w
  let h = self.h
  let q = path.map(c => c.r * w + c.q)
  if self.mirrors.size() > 0 {
    if !ray_cells(hd.q, hd.r, dx, dy, w, h, self.mirrors, q) {
      abort("Unchecked looping track")
    }
  } else {
    let mut x = hd.q + dx
    let mut y = hd.r + dy
    while x >= 0 && y >= 0 && x < w && y < h {
      q.push(y * w + x)
      x += dx
      y += dy
    }
  }
  b.seq.push(FixedArray::from_array(q))
  b.len[b.n] = path.length()
  self.paths.push(path)
  self.stops.push(st)
  b.n += 1
  b.n - 1
}

///|
fn Intentions::drop(self : Intentions) -> Unit {
  self.b.n -= 1
  ignore(self.b.seq.pop())
  ignore(self.paths.pop())
  ignore(self.stops.pop())
}

///|
fn Intentions::set_up(self : Intentions) -> Unit {
  let b = self.b
  b.occ.fill(-1)
  b.left = 0
  for i in 0..<b.n {
    b.off[i] = -1
    b.place(i, 0)
  }
}

///|
/// Tap rope i if that does what is meant for it next. True if it moved.
fn Intentions::tap(self : Intentions, i : Int32) -> Bool {
  let b = self.b
  let q = b.seq[i]
  let l = b.len[i]
  let from = b.off[i]
  let mut p = from + l
  let mut lay = self.rope_at[i]
  let mut by = -1
  while p < q.length() && b.occ[q[p]] == -1 {
    if self.cell_at[q[p]] > lay {
      lay = self.cell_at[q[p]]
      by = self.cell_by[q[p]]
    }
    p += 1
  }
  let to = if p == q.length() { -1 } else { p - l }
  let st = self.stops[i]
  let want = if self.done[i] < st.length() { st[self.done[i]] } else { -1 }
  if to != want {
    return false
  }
  if to >= 0 {
    let z = b.occ[q[p]]
    if self.rope_at[z] > lay {
      lay = self.rope_at[z]
      by = z
    }
  }
  lay += 1
  let end = if to < 0 { from + l } else { imin(from + l, to) }
  for c in from..<end {
    self.cell_at[q[c]] = lay
    self.cell_by[q[c]] = i
  }
  b.place(i, to)
  self.rope_at[i] = lay
  self.taps.push(i)
  if to < 0 {
    self.cost[i] = lay
    self.dep[i] = by
    self.cost_sum += lay
  } else {
    self.done[i] += 1
  }
  true
}

///|
fn Intentions::replay(
  self : Intentions,
  list : Array[Int32],
  fresh : Int32,
) -> Bool {
  let b = self.b
  self.set_up()
  self.cell_at.fill(-1)
  for i in 0..<b.n {
    self.rope_at[i] = -1
    self.done[i] = 0
  }
  self.taps = []
  self.cost_sum = 0
  let mut moved = true
  while moved && b.left > 0 {
    moved = false
    for i in list {
      if b.off[i] >= 0 && self.tap(i) {
        moved = true
        while fresh >= 0 && b.off[fresh] >= 0 && self.tap(fresh) {

        }
      }
    }
  }
  b.left == 0
}

///|
fn Intentions::trial(
  self : Intentions,
  path : Path,
  st : Array[Int32],
  order : Array[Int32],
) -> Int32 {
  let id = self.add(path, st)
  let list = [id]
  for x in order {
    list.push(x)
  }
  let ok = self.replay(list, id)
  let sum = self.cost_sum
  self.drop()
  if ok {
    sum
  } else {
    -1
  }
}

///|
struct Spot {
  c : Int32
  di : Int32
  room : Int32
  against : Int32
  gap : Int32
}

///|
struct Lane {
  cells : Array[Int32]
  free : Int32
  ids : Array[Int32]
}

///|
struct Shaped {
  cells : Array[Int32]
  path : Path
  lane : Lane
}

///|
/// A candidate addition: a rope (lane set), a knot (pull > 0, rest) or a trap (gap).
struct Cand {
  path : Path
  lane : Lane?
  gain : Int32
  bends : Int32
  pull : Int32
  rest : Array[Int32]
  gap : Array[Int32]
}

///|
fn knot_spots(
  occ : FixedArray[Int32],
  rest : FixedArray[Int32],
  w : Int32,
  h : Int32,
  mirrors : SqMirrors,
  pull : Int32,
) -> (Array[Spot], Array[Spot], Array[Spot]) {
  let tight = []
  let chain = []
  let gapped = []
  for c in 0..<(w * h) {
    if occ[c] != -1 {
      continue
    }
    let x = c % w
    let y = c / w
    for di in 0..<4 {
      let dx = sq_dx[di]
      let dy = sq_dy[di]
      let ax = x + dx
      let ay = y + dy
      if ax < 0 || ay < 0 || ax >= w || ay >= h {
        continue
      }
      let o = occ[ay * w + ax]
      let against = if o == -1 { rest[ay * w + ax] } else { -1 }
      if o >= 0 || against >= 0 {
        let mut room = 0
        let mut bx = x - dx
        let mut by = y - dy
        while room <= pull &&
              bx >= 0 &&
              by >= 0 &&
              bx < w &&
              by < h &&
              occ[by * w + bx] == -1 {
          room += 1
          bx -= dx
          by -= dy
        }
        if room >= 2 {
          let s = { c, di, room, against, gap: 0, }
          if o >= 0 {
            tight.push(s)
          } else {
            chain.push(s)
          }
        }
        continue
      }
      if mirrors.size() > 0 {
        let ahead = []
        if !ray_cells(x, y, dx, dy, w, h, mirrors, ahead) {
          continue
        }
        let mut gap = 0
        while gap < ahead.length() &&
              gap <= pull &&
              (occ[ahead[gap]] == -1 || occ[ahead[gap]] == MIRROR) {
          gap += 1
        }
        if gap > 0 &&
          gap <= pull &&
          gap < ahead.length() &&
          occ[ahead[gap]] >= 0 {
          gapped.push({ c, di, room: 0, against: -1, gap, })
        }
        continue
      }
      let mut gap = 0
      let mut nx = ax
      let mut ny = ay
      while gap <= pull &&
            nx >= 0 &&
            ny >= 0 &&
            nx < w &&
            ny < h &&
            occ[ny * w + nx] == -1 {
        gap += 1
        nx += dx
        ny += dy
      }
      if gap > 0 &&
        gap <= pull &&
        nx >= 0 &&
        ny >= 0 &&
        nx < w &&
        ny < h &&
        occ[ny * w + nx] >= 0 {
        gapped.push({ c, di, room: 0, against: -1, gap, })
      }
    }
  }
  (tight, chain, gapped)
}

///|
pub fn weave(rng : Rng, cfg : WeaveCfg) -> Woven? {
  let w = cfg.w
  let h = cfg.h
  let nn = w * h
  let occ = FixedArray::make(nn, -1)
  let mirrors = cfg.mirrors
  let xy = (c : Int32) => { q: c % w, r: c / w, }
  let blocked = (path : Path) => self_blocked(path, w, h, mirrors)
  for c in mirrors.keys {
    occ[c] = MIRROR
  }
  let ib = Intentions::new(w, h, mirrors)
  let b = ib.b
  let mut order : Array[Int32] = []
  let mut total0 = 0
  let mut bend_sum = 0
  let mut covered = 0
  let mut knots = 0
  let mut traps = 0
  let mirror_used = FixedArray::make(nn, false)
  let mut mirrors_used = 0
  let rest = FixedArray::make(nn, -1)

  // ---- shaping ropes ----
  fn grow(start : Int32, first : Int32, straight : Double) -> Array[Int32] {
    let want = cfg.len_lo + rng.below(cfg.len_hi - cfg.len_lo + 1)
    let cells = [start]
    let mut last = -1
    occ[start] = -2
    while cells.length() < want {
      let c = cells[cells.length() - 1]
      let x = c % w
      let y = c / w
      let opts = []
      for d in 0..<4 {
        let nx = x + sq_dx[d]
        let ny = y + sq_dy[d]
        if nx >= 0 && ny >= 0 && nx < w && ny < h && occ[ny * w + nx] == -1 {
          opts.push(d)
        }
      }
      if opts.length() == 0 ||
        (cells.length() == 1 && first >= 0 && !contains(opts, first)) {
        break
      }
      let d = if cells.length() == 1 && first >= 0 {
        first
      } else if last >= 0 && contains(opts, last) && rng.next() < straight {
        last
      } else {
        opts[rng.below(opts.length())]
      }
      last = d
      let nc = (y + sq_dy[d]) * w + x + sq_dx[d]
      cells.push(nc)
      occ[nc] = -2
    }
    for c in cells {
      occ[c] = -1
    }
    cells
  }

  fn way_out(x : Int32, y : Int32, d : Int32) -> Lane? {
    let cells = []
    let dx = sq_dx[d]
    let dy = sq_dy[d]
    if mirrors.size() > 0 {
      if !ray_cells(x, y, dx, dy, w, h, mirrors, cells) {
        return None
      }
    } else {
      let mut a = x + dx
      let mut bb = y + dy
      while a >= 0 && bb >= 0 && a < w && bb < h {
        cells.push(bb * w + a)
        a += dx
        bb += dy
      }
    }
    let ids = []
    let mut free = 0
    for c in cells {
      let o = occ[c]
      if o == -1 {
        free += 1
      } else if o >= 0 && !contains(ids, o) {
        ids.push(o)
      }
    }
    Some({ cells, free, ids, })
  }

  fn dir_index(dx : Int32, dy : Int32) -> Int32 {
    for d in 0..<4 {
      if sq_dx[d] == dx && sq_dy[d] == dy {
        return d
      }
    }
    abort("bad direction")
  }

  fn shape(start : Int32, straight : Double, dir : Int32) -> Shaped? {
    let s = xy(start)
    if dir >= 0 || rng.next() < 0.75 {
      let opts : Array[(Int32, Lane, Int32)] = []
      let mut sum = 0
      for d in 0..<4 {
        if dir >= 0 && d != dir {
          continue
        }
        let bx = s.q - sq_dx[d]
        let by = s.r - sq_dy[d]
        if bx < 0 || by < 0 || bx >= w || by >= h || occ[by * w + bx] != -1 {
          continue
        }
        guard way_out(s.q, s.r, d) is Some(lane) else { continue }
        opts.push((d, lane, lane.cells.length() + 1))
        sum += lane.cells.length() + 1
      }
      if opts.length() > 0 {
        let mut r = rng.next() * sum.to_double()
        let mut o = opts[opts.length() - 1]
        for cand in opts {
          r -= cand.2.to_double()
          if r < 0.0 {
            o = cand
            break
          }
        }
        let cells = grow(start, (o.0 + 2) % 4, straight)
        let path = cells.map(xy)
        path.rev_in_place()
        if cells.length() >= cfg.min_len && !blocked(path) {
          return Some({ cells, path, lane: o.1, })
        }
      }
      if dir >= 0 {
        return None
      }
    }
    let cells = grow(start, -1, straight)
    if cells.length() < cfg.min_len {
      return None
    }
    let a = cells.map(xy)
    let bpath = a.copy()
    bpath.rev_in_place()
    let ok : Array[Shaped] = []
    for p in [a, bpath] {
      if !blocked(p) {
        let hd = last(p)
        let (dx, dy) = head_dir(p)
        ok.push({
          cells,
          path: p,
          lane: way_out(hd.q, hd.r, dir_index(dx, dy)).unwrap(),
        })
      }
    }
    if ok.length() == 0 {
      return None
    }
    if ok.length() == 2 &&
      (
        ok[1].lane.cells.length() > ok[0].lane.cells.length() ||
        (
          ok[1].lane.cells.length() == ok[0].lane.cells.length() &&
          rng.next() < 0.5
        )
      ) {
      Some(ok[1])
    } else {
      Some(ok[0])
    }
  }

  fn trial(path : Path, st : Array[Int32]) -> Int32 {
    ib.trial(path, st, order)
  }

  fn commit(c : Cand) -> Unit {
    let id = ib.add(c.path, if c.pull > 0 { [c.pull] } else { [] })
    if mirrors.size() > 0 {
      for cell in b.seq[id] {
        if mirrors.has(cell) && !mirror_used[cell] {
          mirror_used[cell] = true
          mirrors_used += 1
        }
      }
    }
    let list = [id]
    for x in order {
      list.push(x)
    }
    ignore(ib.replay(list, id))
    total0 = ib.cost_sum
    order = unique(ib.taps)
    for p in ib.paths[id] {
      occ[p.r * w + p.q] = id
    }
    covered += ib.paths[id].length()
    bend_sum += c.bends
    if c.pull > 0 {
      knots += 1
      for cell in c.rest {
        rest[cell] = id
      }
    }
    if c.gap.length() > 0 {
      traps += 1
      for cell in c.gap {
        if occ[cell] == -1 {
          occ[cell] = KEPT
        }
      }
    }
  }

  // ---- how the board stands ----
  let mut ahead : Array[Array[Int32]] = []
  let mut blk : Array[Array[Int32]] = []
  let lanes : Array[Array[Int32]] = Array::makei(nn, _ => [])
  let up = FixedArray::make(nn, 0)
  fn survey() -> Unit {
    ahead = []
    blk = []
    for c in 0..<nn {
      lanes[c].clear()
    }
    for i in 0..<b.n {
      let q = b.seq[i]
      let free = []
      let ids = []
      for p in b.len[i]..<q.length() {
        let o = occ[q[p]]
        if o == -1 {
          free.push(q[p])
          lanes[q[p]].push(i)
        } else if o >= 0 && !contains(ids, o) {
          ids.push(o)
        }
      }
      ahead.push(free)
      blk.push(ids)
    }
    for i in 0..<b.n {
      up[i] = 0
    }
    let by_cost = order.copy()
    ssort(by_cost, (x, y) => ib.cost[y] - ib.cost[x])
    for i in by_cost {
      let d = ib.dep[i]
      if d >= 0 && up[i] + 1 > up[d] {
        up[d] = up[i] + 1
      }
    }
  }

  // kind: 0 deep, 1 leaf, 2 inner, 3 any, 4 plain, 5 mirror
  fn pick_parent(kind : Int32) -> Int32 {
    let mut sum = 0
    let wts = Array::makei(ib.paths.length(), i => {
      let v = if ahead[i].length() == 0 {
        0
      } else if kind == 2 {
        if ib.cost[i] > 0 {
          1
        } else {
          0
        }
      } else if ib.cost[i] > 0 {
        0
      } else if kind == 0 {
        (up[i] + 1) * (up[i] + 1)
      } else {
        1
      }
      sum += v
      v
    })
    if sum == 0 {
      return -1
    }
    let mut r = rng.next() * sum.to_double()
    for i in 0..<wts.length() {
      r -= wts[i].to_double()
      if r < 0.0 {
        return i
      }
    }
    wts.length() - 1
  }

  fn aimed() -> (Int32, Int32)? {
    let idle = mirrors.keys.filter(c => !mirror_used[c])
    if idle.length() == 0 {
      return None
    }
    let m = idle[rng.below(idle.length())]
    let di = rng.below(4)
    let j = 1 + rng.below(3)
    let x = m % w - sq_dx[di] * j
    let y = m / w - sq_dy[di] * j
    if x < 0 || y < 0 || x >= w || y >= h {
      return None
    }
    for k in 0..<j {
      let c = (y + sq_dy[di] * k) * w + x + sq_dx[di] * k
      if occ[c] != -1 {
        return None
      }
    }
    Some((y * w + x, di))
  }

  fn candidate(kind : Int32, at : Int32) -> Cand? {
    let mut start = if at >= 0 { at } else { -1 }
    let mut dir = -1
    if kind == 5 {
      guard aimed() is Some((s, d)) else { return None }
      start = s
      dir = d
    }
    let parent = if start >= 0 || kind == 3 || kind == 4 {
      -1
    } else {
      pick_parent(kind)
    }
    if parent >= 0 {
      start = ahead[parent][rng.below(ahead[parent].length())]
    }
    let mut t = 0
    while start < 0 && t < 6 {
      let c = rng.below(nn)
      if occ[c] == -1 {
        start = c
      }
      t += 1
    }
    if start < 0 {
      return None
    }
    guard shape(start, if kind == 4 { 1.0 } else { cfg.straight }, dir)
      is Some(c) else {
      return None
    }
    let sum = trial(c.path, [])
    if sum < 0 {
      return None
    }
    Some({
      path: c.path,
      lane: Some(c.lane),
      gain: sum - total0,
      bends: bends_of(c.path),
      pull: 0,
      rest: [],
      gap: [],
    })
  }

  // ---- knots and traps ----
  let mark = FixedArray::make(nn + 1, 0)
  let mut stamp = 0
  fn below(blockers : Array[Int32]) -> Unit {
    stamp += 1
    let stack = blockers.copy()
    for z in stack {
      mark[z] = stamp
    }
    while stack.length() > 0 {
      let x = stack.pop().unwrap()
      for y in blk[x] {
        if mark[y] != stamp {
          mark[y] = stamp
          stack.push(y)
        }
      }
    }
  }

  fn tied(cell : Int32) -> Bool {
    for id in lanes[cell] {
      if mark[id] == stamp {
        return true
      }
    }
    false
  }

  fn to_path(cells : Array[Int32]) -> Path {
    let p = cells.map(xy)
    p.rev_in_place()
    p
  }

  fn walk(spot : Spot, k : Int32) -> (Array[Int32], Array[Int32])? {
    let back = (spot.di + 2) % 4
    let want = imax(k + 2, cfg.len_lo + rng.below(cfg.len_hi - cfg.len_lo + 1))
    let cells = [spot.c]
    let tail = []
    let mut last = back
    let mut got = false
    occ[spot.c] = WALKED
    while cells.length() + tail.length() < want + k {
      let body = cells.length() < want
      let c = if body || tail.length() == 0 {
        cells[cells.length() - 1]
      } else {
        tail[tail.length() - 1]
      }
      let x = c % w
      let y = c / w
      let opts = []
      for di in 0..<4 {
        let nx = x + sq_dx[di]
        let ny = y + sq_dy[di]
        let nc = ny * w + nx
        if nx >= 0 &&
          ny >= 0 &&
          nx < w &&
          ny < h &&
          occ[nc] == -1 &&
          (!body || !tied(nc)) {
          opts.push(di)
        }
      }
      if opts.length() == 0 {
        break
      }
      let mut di = 0
      if body {
        if cells.length() <= k + 1 {
          if !contains(opts, back) {
            break
          }
          di = back
        } else {
          di = if contains(opts, last) && rng.next() < cfg.straight {
            last
          } else {
            opts[rng.below(opts.length())]
          }
        }
      } else {
        let ties = if got {
          []
        } else {
          opts.filter(o => tied((y + sq_dy[o]) * w + x + sq_dx[o]))
        }
        di = if ties.length() > 0 {
          ties[rng.below(ties.length())]
        } else {
          opts[rng.below(opts.length())]
        }
      }
      last = di
      let nc = (y + sq_dy[di]) * w + x + sq_dx[di]
      occ[nc] = WALKED
      if body {
        cells.push(nc)
      } else {
        tail.push(nc)
        if tied(nc) {
          got = true
        }
      }
    }
    for c in cells {
      occ[c] = -1
    }
    for c in tail {
      occ[c] = -1
    }
    if cells.length() < imax(cfg.min_len, k + 2) || blocked(to_path(cells)) {
      return None
    }
    if k > 0 {
      if tail.length() < k || !got {
        return None
      }
      let joined = cells[k:].to_owned()
      for c in tail {
        joined.push(c)
      }
      if blocked(to_path(joined)) {
        return None
      }
    }
    Some((cells, tail))
  }

  fn knot(spot : Spot) -> Cand? {
    guard way_out(spot.c % w, spot.c / w, spot.di) is Some(lane) else {
      return None
    }
    if spot.against >= 0 {
      let ids = lane.ids.copy()
      ids.push(spot.against)
      below(ids)
    } else {
      below(lane.ids)
    }
    if tied(spot.c) {
      return None
    }
    let k = 1 + rng.below(imin(cfg.pull, spot.room - 1))
    guard walk(spot, k) is Some((cells, tail)) else { return None }
    let joined = cells[k:].to_owned()
    for c in tail {
      joined.push(c)
    }
    let first = to_path(joined)
    let sum = trial(first, [k])
    if sum < 0 {
      None
    } else {
      Some({
        path: first,
        lane: None,
        gain: sum - total0,
        bends: bends_of(first),
        pull: k,
        rest: cells[0:k].to_owned(),
        gap: [],
      })
    }
  }

  fn trap(spot : Spot) -> Cand? {
    guard way_out(spot.c % w, spot.c / w, spot.di) is Some(lane) else {
      return None
    }
    let gap = lane.cells[0:spot.gap].to_owned()
    below(lane.ids)
    if tied(spot.c) || !gap.iter().any(c => tied(c)) {
      return None
    }
    guard walk(spot, 0) is Some((cells, _)) else { return None }
    let path = to_path(cells)
    let sum = trial(path, [])
    if sum < 0 {
      return None
    }
    let id = ib.add(path, [])
    ib.set_up()
    b.place(id, spot.gap)
    let dead = b.relax()
    ib.drop()
    if dead > 0 {
      Some({
        path,
        lane: None,
        gain: sum - total0,
        bends: bends_of(path),
        pull: 0,
        rest: [],
        gap,
      })
    } else {
      None
    }
  }

  let s_min = 0
  let s_max = 999999
  let mean_len = (cfg.len_lo + cfg.len_hi).to_double() / 2.0 * 0.85
  let cover_goal = cfg.cover * nn.to_double()

  fn seed_core() -> Bool {
    let occupied = FixedArray::make(nn, false)
    let mut size = 0
    for i in 0..<cfg.initial_ropes.length() {
      let path = cfg.initial_ropes[i]
      if path.length() < 2 {
        return false
      }
      for p in path {
        if p.q < 0 || p.r < 0 || p.q >= w || p.r >= h || occupied[p.r * w + p.q] {
          return false
        }
        occupied[p.r * w + p.q] = true
        size += 1
      }
      let st = if i < cfg.initial_stops.length() {
        cfg.initial_stops[i].copy()
      } else {
        []
      }
      ignore(ib.add(path.copy(), st))
    }
    order = match cfg.initial_plan {
      Some(p) => p.copy()
      None => Array::makei(ib.paths.length(), i => i)
    }
    if !ib.replay(order, -1) {
      return false
    }
    total0 = ib.cost_sum
    bend_sum = 0
    for p in ib.paths {
      bend_sum += bends_of(p)
    }
    covered = size
    knots = ib.stops.filter(s => s.length() > 0).length()
    for i in 0..<ib.paths.length() {
      for p in ib.paths[i] {
        occ[p.r * w + p.q] = i
      }
      for offset in ib.stops[i] {
        for j in b.len[i]..<(b.len[i] + offset) {
          if occ[b.seq[i][j]] == -1 {
            rest[b.seq[i][j]] = i
          }
        }
      }
    }
    order = unique(ib.taps)
    true
  }

  fn fits(c : Cand?, budget : Int32) -> Cand? {
    match c {
      Some(c) =>
        if c.gain + c.bends <= budget && bend_sum + c.bends <= s_max {
          Some(c)
        } else {
          None
        }
      None => None
    }
  }

  fn knot_or_trap(n : Int32, room : Double, budget : Int32) -> Cand? {
    let want_knots = cfg.tie - knots
    let want_traps = cfg.bait - traps
    if n < 2 ||
      (want_knots <= 0 && want_traps <= 0) ||
      !(rng.next() < (2 * (want_knots + want_traps)).to_double() / room) {
      return None
    }
    let (tight, chain, gapped) = knot_spots(occ, rest, w, h, mirrors, cfg.pull)
    let knot_first = want_knots > 0 && (want_traps <= 0 || knots <= traps)
    let mut k = 0
    while k < 2 * KNOT_TRIES {
      let is_knot = if k < KNOT_TRIES { knot_first } else { !knot_first }
      if (if is_knot { want_knots } else { want_traps }) <= 0 {
        k = if k < KNOT_TRIES { KNOT_TRIES - 1 } else { 2 * KNOT_TRIES }
        k += 1
        continue
      }
      let list = if !is_knot {
        gapped
      } else if chain.length() > 0 && (rng.next() < 0.5 || tight.length() == 0) {
        chain
      } else {
        tight
      }
      if list.length() == 0 {
        k += 1
        continue
      }
      let spot = list[rng.below(list.length())]
      let c = if is_knot { knot(spot) } else { trap(spot) }
      if fits(c, budget) is Some(c) {
        return Some(c)
      }
      k += 1
    }
    None
  }

  let kinds_any = [3]
  let kinds_plain = [4]
  let kinds_deep = [0, 0, 1, 2, 0, 3, 1, 2]
  let kinds_leaf = [1, 2, 3, 1, 2, 4, 3, 1]
  let kinds_inner = [2, 3, 4, 2, 3, 4, 2, 3]
  fn best_rope(
    n : Int32,
    budget : Int32,
    desire : Double,
    need : Int32,
  ) -> Cand? {
    let kinds = if n == 0 {
      kinds_any
    } else if budget < 1 {
      kinds_plain
    } else if desire >= 2.0 {
      kinds_deep
    } else if desire >= 1.0 {
      kinds_leaf
    } else {
      kinds_inner
    }
    let aim = mirrors.size() > mirrors_used && b.n >= 1
    let mut best : Cand? = None
    let mut best_miss = 1.0e300
    for k in 0..<TRIES_PER_STEP {
      let kind = if aim && k == 0 { 5 } else { kinds[k % kinds.length()] }
      guard fits(candidate(kind, -1), budget) is Some(c) else { continue }
      let lane = c.lane.unwrap()
      let lands = need > 0 &&
        c.gain + c.bends >= need &&
        (covered + c.path.length()).to_double() >=
        MIN_COVERAGE_SLIDE * nn.to_double()
      let reaches = aim &&
        lane.cells.iter().any(cell => mirrors.has(cell) && !mirror_used[cell])
      let miss = (c.gain.to_double() - desire).abs() +
        rng.next() * 0.6 -
        (if desire >= 2.0 { imin(lane.free, 4).to_double() * 0.2 } else { 0.0 }) -
        (if lands { 100.0 } else { 0.0 }) -
        (if reaches { 1.5 } else { 0.0 })
      if miss < best_miss {
        best = Some(c)
        best_miss = miss
      }
    }
    best
  }

  fn next_addition(score : Int32) -> Cand? {
    let n = b.n
    let budget = s_max - score
    let room = dmax(1.0, (cover_goal - covered.to_double()) / mean_len)
    let desire = cfg.tap_depth
    survey()
    match knot_or_trap(n, room, budget) {
      Some(c) => Some(c)
      None => best_rope(n, budget, desire, s_min - score)
    }
  }

  fn lay_ropes() -> Unit {
    let mut stuck = 0
    for _ in 0..<(2 * nn) {
      let score = total0 + bend_sum
      if score >= s_min && b.n >= MIN_ROPES && covered.to_double() >= cover_goal {
        break
      }
      match next_addition(score) {
        None => {
          stuck += 1
          if stuck > MAX_STUCK {
            break
          }
          continue
        }
        Some(best) => {
          stuck = 0
          commit(best)
        }
      }
    }
  }

  fn pack_gaps() -> Unit {
    for _ in 0..<2 {
      let empty = []
      for c in 0..<nn {
        if occ[c] == -1 {
          empty.push(c)
        }
      }
      for i = empty.length() - 1; i > 0; i = i - 1 {
        let j = rng.below(i + 1)
        let t = empty[i]
        empty[i] = empty[j]
        empty[j] = t
      }
      for cell in empty {
        if occ[cell] != -1 {
          continue
        }
        let budget = s_max - total0 - bend_sum
        for _ in 0..<3 {
          guard candidate(if budget < 1 { 4 } else { 3 }, cell) is Some(c) else {
            continue
          }
          if c.gain + c.bends > budget || bend_sum + c.bends > s_max {
            continue
          }
          commit(c)
          break
        }
      }
    }
  }

  if cfg.initial_ropes.length() > 0 && !seed_core() {
    return None
  }
  lay_ropes()
  pack_gaps()
  let n = b.n
  if n < MIN_ROPES || !ib.replay(order, -1) {
    return None
  }
  finished(cfg, ib)
}

///|
/// The finished level (bounds always kept): checked and measured, or None if it
/// is too sparse or too loose.
fn finished(cfg : WeaveCfg, ib : Intentions) -> Woven? {
  let w = cfg.w
  let h = cfg.h
  let n = ib.b.n
  let ropes = ib.paths.map(p => p.copy())
  let solution = ib.taps.copy()
  let mut cells = 0
  for p in ropes {
    cells += p.length()
  }
  let filled = cells.to_double() / (w * h).to_double()
  let mut blocked = 0
  for i in 0..<n {
    if ib.cost[i] > 0 {
      blocked += 1
    }
  }
  let share = blocked.to_double() / n.to_double()
  if w <= SMALL_W {
    if filled < MIN_COVERAGE_SMALL {
      return None
    }
  } else if filled < MIN_COVERAGE_SLIDE || share < MIN_BLOCKED_SHARE {
    return None
  }
  let start = some_paths(ropes)
  if !all_gone(sq_play(start, w, h, solution, cfg.mirrors)) {
    return None
  }
  let fin = sq_board_exn(start, w, h, cfg.mirrors)
  let looped = sq_looped(fin)
  let mut tied_up = 0
  let mut fatal = 0
  for i in 0..<n {
    if ib.stops[i].length() > 0 && looped[i] {
      tied_up += 1
    }
    let to = fin.slide_to(i)
    if to > 0 {
      fin.place(i, to)
      if fin.relax() > 0 {
        fatal += 1
      }
      fin.place(i, 0)
    }
  }
  Some({ ropes, taps: solution, knots: tied_up, traps: fatal, })
}
