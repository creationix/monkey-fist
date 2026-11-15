// grid-generator.js: fixed board dimensions, candidates chosen by measured play.

///|
pub(all) struct Spec {
  hex : Bool
  w : Int32
  h : Int32
  difficulty : Double
  mirrors : Bool
  springs : Bool
  seed : String
  require_slide : Bool
  min_mirrors : Int32
  min_springs : Int32
  colossal : Bool
}

///|
pub(all) struct Level {
  board : Board
  par : Int32
  exact : Bool
  coverage : Double
  wins : Double
  challenge : Double
  layout_key : String
}

///|
fn coverage(b : Board) -> Double {
  let mut sum = 0
  for p in b.ropes {
    sum += p.length()
  }
  sum.to_double() /
  (b.w * b.h - b.mirrors.length() - b.springs.length()).to_double()
}

///|
fn adjacent(a : Pt, b : Pt, hex : Bool) -> Bool {
  let dq = b.q - a.q
  let dr = b.r - a.r
  if hex {
    hex_dir_index(dq, dr) >= 0
  } else {
    (dq == 0 && (dr == 1 || dr == -1)) || (dr == 0 && (dq == 1 || dq == -1))
  }
}

///|
fn valid(b : Board, g : Geo) -> Bool {
  let used = FixedArray::make(b.w * b.h, false)
  for p in b.springs {
    used[g.cell(p)] = true
  }
  for m in b.mirrors {
    used[g.cell(m.cell)] = true
  }
  for path in b.ropes {
    if path.length() < 2 {
      return false
    }
    for i, p in path {
      if !g.inside(p) || used[g.cell(p)] {
        return false
      }
      if i > 0 && !adjacent(path[i - 1], p, b.hex) {
        return false
      }
      used[g.cell(p)] = true
    }
  }
  true
}

///|
priv struct Core {
  ropes : Array[Path]
  stops : Array[Array[Int32]]
  plan : Array[Int32]
}

///|
fn repeated_core(
  hex : Bool,
  w : Int32,
  height : Int32,
  d : Double,
  rng : Rng,
) -> Core? {
  let options : Array[Array[Path]] = []
  let maximum = imin(imin(10, imin(w, height) / 2), imax(w, height) - 4)
  let wanted = js_round(
    3.0 + dmax(0.0, dmin(1.0, (d - 60.0) / 40.0)) * (maximum - 3).to_double(),
  )
  let mut depth = imin(maximum, wanted)
  while depth >= 3 {
    let roomy = imin(w, height) >= 10
    let extra = if roomy { rng.below(3) } else { 0 }
    let bottom = if roomy { 2 + rng.below(3) } else { 2 }
    let side = if roomy { 1 + rng.below(2) } else { 1 }
    let a : Path = []
    let b : Path = []
    let left = -depth - 3 - extra
    for r in 1..<=depth {
      a.push({ q: 0, r, })
    }
    for q = -1; q >= left; q = q - 1 {
      a.push({ q, r: depth, })
    }
    let mut column = left
    for r = depth - 1; r >= 0; r = r - 1 {
      let next = if extra > 0 && r > 0 && r % 3 == 1 { left - 1 } else { left }
      if next != column {
        a.push({ q: next, r: r + 1, })
      }
      a.push({ q: next, r, })
      column = next
    }
    for q = left + 1; q <= -depth - 2; q = q + 1 {
      a.push({ q, r: 0, })
    }
    for q = -depth; q <= -1; q = q + 1 {
      b.push({ q, r: 0, })
    }
    for q = -1; q >= -side; q = q - 1 {
      b.push({ q, r: -1, })
    }
    for r = -2; r >= -bottom; r = r - 1 {
      b.push({ q: -side, r, })
    }
    for q = 1 - side; q <= 0; q = q + 1 {
      b.push({ q, r: -bottom, })
    }
    for r = 1 - bottom; r <= -1; r = r + 1 {
      b.push({ q: 0, r, })
    }
    for turn in 0..<(if hex { 6 } else { 4 }) {
      for flip in [false, true] {
        let ropes = [a, b].map(path => {
          path.map(p => {
            let mut q = p.q
            let mut r = p.r
            if flip {
              let t = q
              q = r
              r = t
            }
            for _ in 0..<turn {
              let t = q
              if hex {
                q = -r
                r = t + r
              } else {
                q = -r
                r = t
              }
            }
            { q, r, }
          })
        })
        let mut r0 = 1000000
        let mut r1 = -1000000
        for path in ropes {
          for p in path {
            r0 = imin(r0, p.r)
            r1 = imax(r1, p.r)
          }
        }
        let rows = r1 - r0 + 1
        if rows > height {
          continue
        }
        let row = rng.below(height - rows + 1)
        let mut x0 = 1000000
        let mut x1 = -1000000
        for path in ropes {
          for p in path {
            let c = p.q + (if hex { floor_div(p.r - r0 + row, 2) } else { 0 })
            x0 = imin(x0, c)
            x1 = imax(x1, c)
          }
        }
        let width = x1 - x0 + 1
        if width > w {
          continue
        }
        let col = rng.below(w - width + 1)
        options.push(
          ropes.map(path => {
            path.map(p => { q: p.q - x0 + col, r: p.r - r0 + row, })
          }),
        )
      }
    }
    if options.length() > 0 {
      break
    }
    depth -= 1
  }
  if options.length() == 0 {
    return None
  }
  let chosen = options[rng.below(options.length())]
  let board : Board = {
    hex,
    w,
    h: height,
    ropes: chosen,
    mirrors: [],
    springs: [],
    plan: [],
  }
  let g = board.geo()
  let solution = board.solve(g, some_paths(chosen), 2000, [])
  if solution.solved != Some(true) {
    return None
  }
  let proven = board.minimum_taps(g, solution.moves, 20000)
  let stops = chosen.map(_ => [])
  let offsets = FixedArray::make(chosen.length(), 0)
  let mut paths = some_paths(chosen)
  for i in proven.plan {
    guard g.tap(paths, i) is Some(mv) else { return None }
    if mv.event == EV_SLIDE {
      offsets[i] += mv.distance
      stops[i].push(offsets[i])
    }
    paths = mv.paths
  }
  Some({ ropes: chosen, stops, plan: proven.plan, })
}

///|
fn place_mirrors(
  hex : Bool,
  w : Int32,
  height : Int32,
  count : Int32,
  rng : Rng,
  avoid : FixedArray[Bool],
) -> Array[Mirror] {
  let cells = []
  for i in 0..<(w * height) {
    let p = if hex { hex_point(i, w) } else { { q: i % w, r: i / w, } }
    let column = p.q + (if hex { floor_div(p.r, 2) } else { 0 })
    if column > 0 && column < w - 1 && p.r > 0 && p.r < height - 1 && !avoid[i] {
      cells.push(p)
    }
  }
  let out = []
  let near = FixedArray::make(w * height, false)
  let index = (p : Pt) => if hex { hex_cell(p, w) } else { p.r * w + p.q }
  let mut tries = 0
  while out.length() < count && cells.length() > 0 && tries < count * 40 {
    tries += 1
    let p = cells[rng.below(cells.length())]
    if near[index(p)] {
      continue
    }
    if hex {
      out.push({ cell: p, kind: rng.below(3), })
    } else {
      out.push({ cell: p, kind: if rng.next() < 0.5 { 0 } else { 1 }, })
    }
    near[index(p)] = true
    for d in 0..<(if hex { 6 } else { 4 }) {
      let q = if hex {
        { q: p.q + hex_dq[d], r: p.r + hex_dr[d], }
      } else {
        { q: p.q + sq_dx[d], r: p.r + sq_dy[d], }
      }
      near[index(q)] = true
    }
  }
  out
}

///|
pub fn knots_for(d : Double) -> Int32 {
  knots_wanted(300.0 * @math.pow(dmax(0.0, d) / 100.0, 1.3))
}

///|
fn woven(
  hex : Bool,
  w : Int32,
  height : Int32,
  d : Double,
  rng : Rng,
  style : Style,
  long_ropes : Bool,
  mirror_count : Int32,
  core_wanted : Bool,
) -> Board? {
  let area = w * height
  let strength = d / 100.0
  let length = if long_ropes {
    imin(w, height) * 2
  } else {
    imax(7, js_round((imin(w, height) * 2).to_double()))
  }
  let core = if core_wanted && !long_ropes {
    repeated_core(hex, w, height, d, rng)
  } else {
    None
  }
  let mut mirrors : Array[Mirror] = []
  if mirror_count > 0 {
    let avoid = FixedArray::make(area, false)
    if core is Some(c) {
      let tracks = if hex {
        hex_compile_exn(w, height, [], some_paths(c.ropes)).tracks
      } else {
        sq_tracks(some_paths(c.ropes), w, height, SqMirrors::empty()).unwrap()
      }
      for t in tracks {
        for x in t {
          avoid[x] = true
        }
      }
    }
    mirrors = place_mirrors(hex, w, height, mirror_count, rng, avoid)
    if mirrors.length() == 0 {
      return None
    }
  }
  let (iropes, istops, iplan) = match core {
    Some(c) => (c.ropes, c.stops, Some(c.plan))
    None => ([], [], None)
  }
  let kf = knots_for(d).to_double()
  if hex {
    let knots = imax(
      imax(
        if area >= 30 && d >= 20.0 {
          1
        } else {
          0
        },
        js_round(
          area.to_double() /
          (if long_ropes { 50.0 } else { 32.0 }) *
          strength *
          strength,
        ),
      ),
      if long_ropes {
        0
      } else {
        js_round(kf * dmin(1.0, area.to_double() / 150.0) * 0.7)
      },
    )
    let traps = if long_ropes {
      0
    } else {
      js_round(kf * dmin(1.0, area.to_double() / 150.0))
    }
    guard hex_build(rng, {
        w,
        h: height,
        stage: js_round(d * 0.59),
        coverage: 0.99,
        length,
        tap_depth: strength * 8.0,
        mirrors,
        knots,
        traps,
        initial_ropes: iropes,
        initial_stops: istops,
        initial_plan: iplan,
      })
      is Some(raw) else {
      return None
    }
    let turning = if mirrors.length() > 0 {
      hex_turning(w, height, mirrors, raw.ropes)
    } else {
      []
    }
    return Some({
      hex: true,
      w,
      h: height,
      ropes: raw.ropes,
      mirrors: mirrors.filter(m => contains(turning, hex_cell(m.cell, w))),
      springs: [],
      plan: raw.plan,
    })
  }
  let knots = if long_ropes {
    js_round(area.to_double() / 40.0 * strength)
  } else {
    knots_for(d)
  }
  let traps = if long_ropes {
    js_round(area.to_double() / 70.0 * strength)
  } else {
    knots_for(d)
  }
  let mmap = { slope: FixedArray::make(area, -1), keys: [], }
  for m in mirrors {
    mmap.set(m.cell.r * w + m.cell.q, m.kind)
  }
  guard weave(rng, {
      w,
      h: height,
      len_lo: if long_ropes {
        6
      } else {
        style.len_lo
      },
      len_hi: if long_ropes {
        length
      } else {
        imax(style.len_lo, style.len_hi(imin(w, height)))
      },
      min_len: if long_ropes {
        2
      } else {
        style.min_len
      },
      straight: style.straight,
      cover: 0.99,
      tap_depth: strength * 8.0,
      tie: knots,
      bait: traps,
      pull: if long_ropes {
        5
      } else {
        3
      },
      mirrors: mmap,
      initial_ropes: iropes,
      initial_stops: istops,
      initial_plan: iplan,
    })
    is Some(raw) else {
    return None
  }
  let used = FixedArray::make(area, false)
  if mirrors.length() > 0 {
    for t in sq_tracks(some_paths(raw.ropes), w, height, mmap).unwrap() {
      for c in t {
        used[c] = true
      }
    }
  }
  Some({
    hex: false,
    w,
    h: height,
    ropes: raw.ropes,
    mirrors: mirrors.filter(m => used[m.cell.r * w + m.cell.q]),
    springs: [],
    plan: raw.taps,
  })
}

///|
fn pt_key(p : Pt) -> Int32 {
  (p.q + 4096) * 8192 + p.r + 4096
}

///|
fn add_spinners(start : Board, rng : Rng, count : Int32) -> Board? {
  let mut board = start
  for _ in 0..<count {
    let g = board.geo()
    let blocked = FixedArray::make(board.w * board.h, false)
    for path in board.ropes {
      for p in path {
        blocked[g.cell(p)] = true
      }
    }
    for m in board.mirrors {
      blocked[g.cell(m.cell)] = true
    }
    for p in board.springs {
      blocked[g.cell(p)] = true
    }
    for path in board.ropes {
      let (dq, dr) = g.direction(path)
      let p = { q: last(path).q + dq, r: last(path).r + dr, }
      if g.inside(p) {
        blocked[g.cell(p)] = true
      }
    }
    let manual = board.replay_plan(g, board.plan).taps
    let routes = []
    let mut paths = some_paths(board.ropes)
    for step in 0..<manual {
      let i = board.plan[step]
      let mv = g.tap(paths, i).unwrap()
      let len = paths[i].unwrap().length()
      for k in len..<mv.route.length() {
        routes.push(mv.route[k])
      }
      paths = mv.paths
    }
    let seen : Map[Int32, Bool] = Map([])
    fn fresh(group : Array[Pt]) -> Array[Pt] {
      let cells = group.filter(p => {
        if !g.inside(p) || blocked[g.cell(p)] || seen.contains(pt_key(p)) {
          return false
        }
        seen[pt_key(p)] = true
        true
      })
      for i = cells.length() - 1; i > 0; i = i - 1 {
        let j = rng.below(i + 1)
        let t = cells[i]
        cells[i] = cells[j]
        cells[j] = t
      }
      cells
    }

    fn try_cells(cells : Array[Pt]) -> Board? {
      // Eager, like the JS (map then find): every candidate is evaluated.
      let first = cells[0:imin(16, cells.length())]
        .to_owned()
        .map(c => with_spinner(board, c))
      for x in first {
        if x is Some(_) {
          return x
        }
      }
      let second = cells[0:imin(8, cells.length())]
        .to_owned()
        .map(c => search_spinner(board, c))
      for x in second {
        if x is Some(_) {
          return x
        }
      }
      None
    }

    let placed = match try_cells(fresh(routes)) {
      Some(b) => Some(b)
      None => try_cells(fresh(ways_out(board)))
    }
    guard placed is Some(b) else { return None }
    board = b
  }
  Some(board)
}

///|
fn ways_out(board : Board) -> Array[Pt] {
  let out = []
  let w = board.w
  if board.hex {
    let tracks = hex_compile_exn(
        board.w,
        board.h,
        board.mirrors,
        some_paths(board.ropes),
      ).tracks
    for i, t in tracks {
      for k in board.ropes[i].length()..<t.length() {
        out.push(hex_point(t[k], w))
      }
    }
  } else {
    let tracks = sq_tracks(
      some_paths(board.ropes),
      board.w,
      board.h,
      SqMirrors::of_board(board),
    ).unwrap()
    for i, t in tracks {
      for k in board.ropes[i].length()..<t.length() {
        out.push({ q: t[k] % w, r: t[k] / w, })
      }
    }
  }
  out
}

///|
fn with_spinner(board : Board, cell : Pt) -> Board? {
  let springs = board.springs.copy()
  springs.push(cell)
  let b = board.with_springs(springs, board.plan)
  let g = b.geo()
  let mut paths = some_paths(b.ropes)
  for step in 0..<b.plan.length() {
    let i = b.plan[step]
    guard g.tap(paths, i) is Some(mv) else { return None }
    if mv.event == EV_BOUNCE && last(mv.route) == cell {
      let a = b.plan[0:step + 1].to_owned()
      a.push(i)
      for k in (step + 1)..<b.plan.length() {
        a.push(b.plan[k])
      }
      let z = b.plan.copy()
      z.push(i)
      for plan in [a, z] {
        if bounce_step(b, g, plan, cell) == step {
          return Some(b.with_plan(plan))
        }
      }
      return None
    }
    paths = mv.paths
  }
  None
}

///|
fn search_spinner(board : Board, cell : Pt) -> Board? {
  let springs = board.springs.copy()
  springs.push(cell)
  let b = board.with_springs(springs, board.plan)
  let g = b.geo()
  let solution = b.solve(
    g,
    some_paths(b.ropes),
    js_round(12000.0 / b.ropes.length().to_double()),
    board.plan,
  )
  if solution.solved == Some(true) &&
    bounce_step(b, g, solution.moves, cell) >= 0 {
    Some(b.with_plan(solution.moves))
  } else {
    None
  }
}

///|
fn bounce_step(b : Board, g : Geo, plan : Array[Int32], at : Pt) -> Int32 {
  let played = b.replay_plan(g, plan)
  if !played.solved {
    return -1
  }
  let start = some_paths(b.ropes)
  let mut paths = start
  for step in 0..<played.taps {
    let mv = g.tap(paths, plan[step]).unwrap()
    if mv.event == EV_BOUNCE && last(mv.route) == at {
      return match g.tap(start, plan[step]) {
        Some(m) if m.event == EV_BOUNCE => -1
        _ => step
      }
    }
    paths = mv.paths
  }
  -1
}

///|
fn features_used(b : Board, g : Geo) -> Bool {
  let wanted = FixedArray::make(b.w * b.h, false)
  let mut left = 0
  for p in b.springs {
    if !wanted[g.cell(p)] {
      wanted[g.cell(p)] = true
      left += 1
    }
  }
  for m in b.mirrors {
    if !wanted[g.cell(m.cell)] {
      wanted[g.cell(m.cell)] = true
      left += 1
    }
  }
  let mut paths = some_paths(b.ropes)
  for i in b.plan {
    guard g.tap(paths, i) is Some(mv) else { return false }
    let len = paths[i].unwrap().length()
    for k in len..<mv.route.length() {
      let p = mv.route[k]
      if g.inside(p) && wanted[g.cell(p)] {
        wanted[g.cell(p)] = false
        left -= 1
      }
    }
    paths = mv.paths
  }
  left == 0
}

///|
priv struct FeatureStats {
  used_mirrors : Int32
  used_springs : Int32
  manual_mirrors : Int32
  manual_springs : Int32
}

///|
fn feature_stats(
  b : Board,
  g : Geo,
  plan : Array[Int32],
  manual : Int32,
) -> FeatureStats? {
  let area = b.w * b.h
  let turned = FixedArray::make(area, false)
  let bounced = FixedArray::make(area, false)
  let mturned = FixedArray::make(area, false)
  let mbounced = FixedArray::make(area, false)
  let mut paths = some_paths(b.ropes)
  for step, i in plan {
    let path = paths[i]
    guard g.tap(paths, i) is Some(mv) else { return None }
    let len = path.unwrap().length()
    for at in len..<mv.route.length() {
      let p = mv.route[at]
      if !g.inside(p) {
        continue
      }
      let m = g.mirror[g.cell(p)]
      if m < 0 {
        continue
      }
      let before = mv.route[at - 1]
      let dq = p.q - before.q
      let dr = p.r - before.r
      let (oq, or_) = if b.hex {
        let d = hex_reflect(hex_dir_index(dq, dr), m)
        (hex_dq[d], hex_dr[d])
      } else {
        turn(m, dq, dr)
      }
      if oq != dq || or_ != dr {
        turned[g.cell(p)] = true
        if step < manual {
          mturned[g.cell(p)] = true
        }
      }
    }
    if mv.event == EV_BOUNCE {
      let c = g.cell(last(mv.route))
      bounced[c] = true
      if step < manual {
        mbounced[c] = true
      }
    }
    paths = mv.paths
  }
  let count = (a : FixedArray[Bool]) => a.iter().filter(x => x).count()
  Some({
    used_mirrors: count(turned),
    used_springs: count(bounced),
    manual_mirrors: count(mturned),
    manual_springs: count(mbounced),
  })
}

///|
fn regional(b : Board) -> Bool {
  if b.w < 8 || b.h < 8 {
    return true
  }
  let area = [0, 0, 0, 0]
  let used = [0, 0, 0, 0]
  let zone = (p : Pt) => {
    let col = p.q + (if b.hex { floor_div(p.r, 2) } else { 0 })
    (if col.to_double() >= b.w.to_double() / 2.0 { 1 } else { 0 }) +
    2 * (if p.r.to_double() >= b.h.to_double() / 2.0 { 1 } else { 0 })
  }
  for i in 0..<(b.w * b.h) {
    let p = if b.hex { hex_point(i, b.w) } else { { q: i % b.w, r: i / b.w, } }
    area[zone(p)] += 1
  }
  for path in b.ropes {
    for p in path {
      used[zone(p)] += 1
    }
  }
  for i in 0..<4 {
    if !(used[i].to_double() / area[i].to_double() >= 0.55) {
      return false
    }
  }
  true
}

///|
fn trivial(b : Board, g : Geo) -> Bool {
  if b.ropes.length() <= 3 {
    return false
  }
  let start = some_paths(b.ropes)
  for i in 0..<b.ropes.length() {
    if g.tap(start, i) is Some(mv) && b.all_free(g, mv.paths) {
      return true
    }
  }
  false
}

///|
fn postpone(b : Board, g : Geo, plan : Array[Int32]) -> Array[Int32] {
  let mut best = plan
  let mut taps = b.replay_plan(g, plan).taps
  for k = imin(taps, best.length()) - 1; k >= 0; k = k - 1 {
    let i = best[k]
    if index_from(best, i, k + 1) >= 0 {
      continue
    }
    let trial = best[0:k].to_owned()
    for j in (k + 1)..<best.length() {
      trial.push(best[j])
    }
    trial.push(i)
    let r = b.replay_plan(g, trial)
    if r.solved && r.taps < taps {
      best = trial
      taps = r.taps
    }
  }
  best
}

///|
/// Par: unneeded exits postponed to the automatic release, then a bounded search.
fn score(b : Board, g : Geo, skip : Bool) -> Par {
  if skip {
    return { plan: b.plan, par: b.replay_plan(g, b.plan).taps, exact: false, }
  }
  let budget = 2500
  if b.springs.length() == 0 && !b.hex {
    let paths = some_paths(b.ropes)
    let start = match sq_postpone_exits(paths, b.w, b.h, b.plan, g.sqm) {
      Some(t) => t
      None => b.plan
    }
    return sq_fewest_player_taps(paths, b.w, b.h, start, budget, g.sqm).unwrap()
  }
  if b.springs.length() == 0 {
    let start = match hex_postpone_exits(b.w, b.h, b.mirrors, b.ropes, b.plan) {
      Some(p) => p
      None => b.plan
    }
    return hex_fewest_player_taps(b.w, b.h, b.mirrors, b.ropes, start, budget)
  }
  let start = postpone(b, g, b.plan)
  if b.ropes.length() <= 12 {
    b.minimum_taps(g, start, 1200)
  } else {
    { plan: start, par: b.replay_plan(g, start).taps, exact: false, }
  }
}

///|
fn casual_rate(b : Board, g : Geo, rng : Rng, games : Int32) -> Double {
  if b.springs.length() == 0 && !b.hex {
    return sq_casual_wins(some_paths(b.ropes), b.w, b.h, rng, games, g.sqm)
  }
  if b.springs.length() == 0 {
    return hex_casual_wins(b.w, b.h, b.mirrors, b.ropes, rng, games)
  }
  let mut wins = 0
  for _ in 0..<games {
    let mut paths = some_paths(b.ropes)
    for _ in 0..<(b.ropes.length() * 6 + 20) {
      let moves = []
      for i in 0..<paths.length() {
        if paths[i] is Some(_) && g.tap(paths, i) is Some(m) {
          moves.push(m)
        }
      }
      if moves.length() == 0 {
        break
      }
      let exits = moves.filter(m => m.event == EV_EXIT)
      let pool = if exits.length() > 0 { exits } else { moves }
      paths = pool[rng.below(pool.length())].paths
      if all_gone(paths) {
        wins += 1
        break
      }
    }
  }
  wins.to_double() / imax(1, games).to_double()
}

///|
pub fn target_challenge(d : Double) -> Double {
  0.5 + 9.5 * @math.pow(dmax(0.0, dmin(100.0, d)) / 100.0, 1.3)
}

///|
pub fn win_ceiling(d : Double) -> Double {
  1.0 - 0.5 * dmax(0.0, dmin(1.0, (d - 30.0) / 70.0))
}

///|
pub fn grid_generate(s : Spec) -> Level? {
  let w = s.w
  let height = s.h
  let d = s.difficulty
  let rng = rng_of("grid/3/" + s.seed)
  let roll = rng.next()
  let twisty = imin(w, height) >= 7 && d >= 35.0
  let style = styles[if roll < 0.4 {
      0
    } else if roll < 0.73 || !twisty {
      1
    } else {
      2
    }]
  let colossal = s.colossal
  let strength = d / 100.0
  let spinner_count = if s.springs {
    imax(1, imax(1, s.min_springs))
  } else {
    0
  }
  let min_m = if s.min_mirrors > 0 { s.min_mirrors } else { 2 }
  let mirror_count = if !s.mirrors {
    0
  } else {
    imin(
      js_round((w * height).to_double() / 14.0),
      if s.hex {
        2 * min_m + 2
      } else {
        min_m + 2 + js_round(2.0 * strength)
      },
    )
  }
  let hardness = dmax(0.0, (d - 40.0) / 60.0)
  let sample_limit = if colossal { 3 } else { 10 }
  let min_coverage = if w * height <= 48 { 0.8 } else { 0.85 }
  let target = target_challenge(d)
  let ceiling = win_ceiling(d)
  let mut best : Level? = None
  let mut best_value = -1.0e300
  for attempt in 0..<sample_limit {
    let wants_core = d >= 60.0 && attempt % 2 == 0
    let mut cand = woven(
      s.hex,
      w,
      height,
      d,
      rng,
      style,
      colossal,
      mirror_count,
      wants_core,
    )
    if spinner_count > 0 && cand is Some(b) && valid(b, b.geo()) {
      cand = add_spinners(b, rng, spinner_count)
    }
    guard cand is Some(b) else { continue }
    let g = b.geo()
    let start = some_paths(b.ropes)
    if b.w != w ||
      b.h != height ||
      b.ropes.length() < 2 ||
      !valid(b, g) ||
      b.all_free(g, start) {
      continue
    }
    if (s.mirrors && b.mirrors.length() == 0) ||
      (s.springs && b.springs.length() == 0) {
      continue
    }
    let density = coverage(b)
    if density < min_coverage || !regional(b) {
      continue
    }
    let replayed = b.replay_plan(g, b.plan)
    if !replayed.solved || !features_used(b, g) {
      continue
    }
    let result = score(b, g, colossal)
    if b.mirrors.length() > 0 || b.springs.length() > 0 {
      if feature_stats(b, g, result.plan, result.par) is Some(m) &&
        (
          b.mirrors.length() < s.min_mirrors ||
          b.springs.length() < s.min_springs ||
          m.used_mirrors != b.mirrors.length() ||
          m.used_springs != b.springs.length() ||
          m.manual_mirrors < s.min_mirrors ||
          m.manual_springs < s.min_springs
        ) {
        continue
      }
    }
    let played = b.replay_plan(g, result.plan)
    let mut slides = 0
    let mut bounces = 0
    let mut any_slide = false
    for k, e in played.events {
      if e == EV_SLIDE {
        any_slide = true
        if k < result.par {
          slides += 1
        }
      } else if e == EV_BOUNCE && k < result.par {
        bounces += 1
      }
    }
    if (s.require_slide || density < 0.85) && !any_slide {
      continue
    }
    if result.par * 3 < b.ropes.length() || trivial(b, g) {
      continue
    }
    let inter = if colossal {
      0.0
    } else {
      interaction(b, g, result.plan, result.par)
    }
    let wins = if colossal {
      1.0
    } else {
      casual_rate(
        b,
        g,
        rng_of("casual/" + s.seed + "/" + attempt.to_string()),
        if b.springs.length() > 0 {
          10
        } else {
          32
        },
      )
    }
    let work = (slides + bounces).to_double()
    let challenge = work + 6.0 * (1.0 - wins)
    let value = density * 3.0 -
      (challenge - target).abs() * 0.5 -
      dmax(0.0, wins - ceiling) * 4.0 +
      (if colossal { 0.0 } else { hardness * inter * 0.25 })
    if value > best_value {
      best_value = value
      best = Some({
        board: b.with_plan(result.plan),
        par: result.par,
        exact: result.exact,
        coverage: density,
        wins,
        challenge,
        layout_key: "",
      })
    }
    if colossal ||
      (density >= 0.9 && (challenge - target).abs() <= 0.5 && wins <= ceiling) {
      break
    }
  }
  best
}

///|
pub fn bench_casual(b : Board, games : Int32) -> Double {
  casual_rate(b, b.geo(), rng_of("bench"), games)
}

///|
pub fn bench_par(b : Board) -> Int32 {
  score(b, b.geo(), false).par
}
