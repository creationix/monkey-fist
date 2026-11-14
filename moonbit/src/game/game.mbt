// The game layer of app.js, in MoonBit: state, taps and queued motions with shared-
// path traffic, automatic release, undo, hints, auto-solve, scoring, camera fit,
// hit-testing, a display list for Canvas2D, and sound design. The JS glue only
// draws the display list, plays the voice list and forwards DOM events.

///|
priv struct Motion {
  i : Int32
  path : @core.Path
  route : Array[@core.Pt]
  event : Int32
  final_path : @core.Path?
  distance : Double
  mut progress : Double
  mut speed : Double
  mut hold : Double
  mut impacted : Bool
  mut swished : Bool
  mut waiting : Bool
  automatic : Bool
  mut queued : Motion?
  visits : Map[Int32, Int32]
  mut traffic : Array[(Motion, Double, Double)]
  pop_note : Int32
  reflections : Array[Int32]
  mut next_reflection : Int32
  serial : Int32
}

///|
priv struct Snapshot {
  paths : Array[@core.Path?]
  plan : Array[Int32]
  lost : Bool
}

///|
priv struct Game {
  mut level : @core.Level?
  mut geo : @core.Geo?
  mut paths : Array[@core.Path?]
  mut plan : Array[Int32]
  moves : Map[Int32, Motion]
  mut taps : Int32
  mut undos : Int32
  history : Array[Snapshot]
  mut auto : Bool
  mut ended : Bool
  mut lost : Bool
  mut used_auto : Bool
  mut outro : Double
  mut hint : Int32
  mut hint_time : Double
  mut bump : Int32
  mut bump_time : Double
  mut clear_no : Int32
  mut stars : Int32
  mut frozen : Array[Int32]
  mut serial : Int32
  mut speed_factor : Double
  // view
  mut width : Double
  mut height : Double
  mut top : Double
  mut bottom : Double
  mut scale : Double
  mut ox : Double
  mut oy : Double
  // effects
  voices : Array[Double]
  last_at : Map[Int32, Double]
  mut clock : Double
  noise_rng : @core.Rng
  activations : Map[Int32, Double]
  mut notice : String
}

///|
let game : Game = {
  level: None,
  geo: None,
  paths: [],
  plan: [],
  moves: Map([]),
  taps: 0,
  undos: 3,
  history: [],
  auto: false,
  ended: false,
  lost: false,
  used_auto: false,
  outro: 0.0,
  hint: -1,
  hint_time: 0.0,
  bump: -1,
  bump_time: 0.0,
  clear_no: 0,
  stars: -1,
  frozen: [],
  serial: 0,
  speed_factor: 1.0,
  width: 360.0,
  height: 640.0,
  top: 80.0,
  bottom: 90.0,
  scale: 30.0,
  ox: 0.0,
  oy: 0.0,
  voices: [],
  last_at: Map([]),
  clock: 0.0,
  noise_rng: @core.mulberry32(7),
  activations: Map([]),
  notice: "",
}

///|
fn board() -> @core.Board {
  game.level.unwrap().board
}

///|
fn geo() -> @core.Geo {
  game.geo.unwrap()
}

///|
/// Start a level that the generator has produced.
pub fn start(l : @core.Level) -> Unit {
  game.level = Some(l)
  game.geo = Some(l.board.geo())
  game.paths = @core.some_paths(l.board.ropes)
  game.plan = l.board.plan.copy()
  game.moves.clear()
  game.taps = 0
  game.undos = 3
  game.history.clear()
  game.auto = false
  game.ended = false
  game.lost = false
  game.used_auto = false
  game.outro = 0.0
  game.hint = -1
  game.hint_time = 0.0
  game.bump = -1
  game.clear_no = 0
  game.stars = -1
  game.frozen = []
  game.activations.clear()
  game.notice = ""
  fit()
}

// ---------- camera ----------

///|
fn project(p : @core.Pt) -> (Double, Double) {
  if board().hex {
    (
      p.q.to_double() + p.r.to_double() / 2.0,
      p.r.to_double() * 3.0.sqrt() / 2.0,
    )
  } else {
    (p.q.to_double(), p.r.to_double())
  }
}

///|
fn screen(p : @core.Pt) -> (Double, Double) {
  let (x, y) = project(p)
  (game.ox + x * game.scale, game.oy + y * game.scale)
}

///|
fn screen_at(x : Double, y : Double) -> (Double, Double) {
  if board().hex {
    (
      game.ox + (x + y / 2.0) * game.scale,
      game.oy + y * 3.0.sqrt() / 2.0 * game.scale,
    )
  } else {
    (game.ox + x * game.scale, game.oy + y * game.scale)
  }
}

///|
/// Fit the board between the top and bottom control bands.
fn fit() -> Unit {
  guard game.level is Some(l) else { return }
  let b = l.board
  let mut x0 = 1.0e9
  let mut x1 = -1.0e9
  let mut y0 = 1.0e9
  let mut y1 = -1.0e9
  for c in 0..<(b.w * b.h) {
    let p = if b.hex {
      @core.hex_point(c, b.w)
    } else {
      { q: c % b.w, r: c / b.w, }
    }
    let (x, y) = project(p)
    x0 = @core.dmin(x0, x)
    x1 = @core.dmax(x1, x)
    y0 = @core.dmin(y0, y)
    y1 = @core.dmax(y1, y)
  }
  x0 -= 0.6
  x1 += 0.6
  y0 -= 0.6
  y1 += 0.6
  let uw = @core.dmax(80.0, game.width - 24.0)
  let uh = @core.dmax(80.0, game.height - game.top - game.bottom)
  game.scale = @core.dmax(
    1.0,
    @core.dmin(110.0, @core.dmin(uw / (x1 - x0), uh / (y1 - y0))),
  )
  game.ox = game.width / 2.0 - (x0 + x1) / 2.0 * game.scale
  game.oy = game.top + uh / 2.0 - (y0 + y1) / 2.0 * game.scale
}

///|
pub fn resize(w : Double, h : Double, top : Double, bottom : Double) -> Unit {
  game.width = w
  game.height = h
  game.top = top
  game.bottom = bottom
  fit()
}

// ---------- effects ----------

///|
/// Voice list for the glue: tone = [0, freq, dur, wave, vol, delay, to, attack],
/// noise = [1, dur, vol, from, to, delay, 0, 0]. Waves: 0 sine, 1 triangle.
fn tone(
  f : Double,
  dur : Double,
  wave : Int32,
  vol : Double,
  delay~ : Double = 0.0,
  to~ : Double = 0.0,
  attack~ : Double = 0.008,
) -> Unit {
  for x in [0.0, f, dur, wave.to_double(), vol, delay, to, attack] {
    game.voices.push(x)
  }
}

///|
fn noise(
  dur : Double,
  vol : Double,
  from : Double,
  to : Double,
  delay~ : Double = 0.0,
) -> Unit {
  for x in [1.0, dur, vol, from, to, delay, 0.0, 0.0] {
    game.voices.push(x)
  }
}

///|
fn pluck(f : Double, vol : Double, delay : Double, dur : Double) -> Unit {
  tone(f, dur, 0, vol, delay~)
  tone(f * 4.0, 0.09, 0, vol * 0.35, delay~)
  tone(f * 2.0, dur * 0.5, 1, vol * 0.25, delay~)
}

///|
const SFX_ACTIVATE = 0

///|
const SFX_SLIDE = 1

///|
const SFX_REFLECT = 2

///|
const SFX_SPRING = 3

///|
const SFX_POP = 4

///|
const SFX_BUMP = 5

///|
const SFX_THUD = 6

///|
const SFX_BLOCKED = 7

///|
const SFX_UNDO = 8

///|
const SFX_HINT = 9

///|
const SFX_WIN = 10

///|
let gaps : FixedArray[Double] = [
  25.0, 45.0, 40.0, 80.0, 45.0, 110.0, 60.0, 90.0, 80.0, 250.0, 150.0,
]

///|
let bass : Double = 65.41

///|
let melody : FixedArray[Double] = [523.25, 587.33, 659.25, 783.99]

///|
/// sounds.js effects, rate-limited per effect as there.
fn sfx(kind : Int32, arg : Int32) -> Unit {
  let now = game.clock * 1000.0
  match game.last_at.get(kind) {
    Some(t) if now - t < gaps[kind] => return
    _ => ()
  }
  game.last_at[kind] = now
  match kind {
    SFX_ACTIVATE => {
      tone(240.0, 0.055, 0, 0.04, to=180.0, attack=0.003)
      tone(360.0, 0.03, 0, 0.012, delay=0.004, to=270.0, attack=0.003)
    }
    SFX_SLIDE => {
      noise(0.3, 0.12, 450.0, 1700.0)
      tone(260.0, 0.2, 0, 0.04, to=520.0)
    }
    SFX_REFLECT => {
      let f = bass * [4.0, 5.0, 6.0][(if arg < 0 { -arg } else { arg }) % 3]
      tone(f, 0.22, 0, 0.23, to=f * 0.96)
      tone(f * 2.0, 0.07, 0, 0.035)
      tone(f * 1.5, 0.14, 1, 0.07, delay=0.035)
      noise(0.045, 0.06, 750.0, 260.0)
    }
    SFX_SPRING => {
      tone(170.0, 0.38, 0, 0.28, to=108.0)
      tone(340.0, 0.13, 1, 0.055, to=150.0)
      noise(0.045, 0.06, 500.0, 120.0)
    }
    SFX_POP => {
      let streak = @core.imax(1, arg)
      let step = (streak - 1) % 10
      let index = if step < 6 { step } else { 10 - step }
      let lift = if (streak - 1) / 10 % 2 == 1 { 0.5 } else { 1.0 }
      pluck(
        melody[index % 4] * lift,
        0.3 + game.noise_rng.next() * 0.06,
        0.0,
        0.45,
      )
      if streak % 3 == 0 {
        pluck(melody[(index + 2) % 4] * lift, 0.16, 0.09, 0.4)
      }
      if streak % 10 == 0 {
        for i, f in melody {
          pluck(f * 2.0, 0.12, 0.05 + i.to_double() * 0.06, 0.5)
        }
      }
    }
    SFX_BUMP => {
      tone(140.0, 0.28, 0, 0.6, to=55.0)
      noise(0.16, 0.35, 300.0, 90.0)
      tone(110.0, 0.2, 1, 0.2, delay=0.01, to=70.0)
    }
    SFX_THUD => {
      tone(170.0, 0.14, 0, 0.3, to=90.0)
      noise(0.07, 0.14, 420.0, 160.0)
    }
    SFX_BLOCKED => {
      tone(392.0, 0.07, 0, 0.1, to=370.0)
      tone(311.0, 0.11, 0, 0.09, delay=0.08, to=294.0)
    }
    SFX_UNDO => tone(620.0, 0.16, 0, 0.2, to=330.0)
    SFX_HINT => {
      pluck(880.0, 0.35, 0.0, 0.25)
      pluck(1318.5, 0.35, 0.09, 0.4)
    }
    _ => win_sound(arg)
  }
}

///|
fn win_sound(stars : Int32) -> Unit {
  if stars == 0 {
    tone(bass * 1.08, 1.1, 0, 0.18, to=bass, attack=0.045)
    tone(bass * 1.5, 1.35, 0, 0.055, delay=0.06, attack=0.07)
    tone(bass * 2.0, 0.8, 0, 0.025, delay=0.02, attack=0.035)
    tone(bass * 4.0, 1.15, 0, 0.055, delay=0.035, attack=0.05)
    tone(bass * 6.0, 0.95, 0, 0.025, delay=0.07, attack=0.08)
    return
  }
  let phrases : Array[Array[(Double, Double)]] = [
    [],
    [(0.0, 1.5), (0.2, 2.0)],
    [(0.0, 1.0), (0.12, 1.125), (0.24, 1.25), (0.42, 1.5), (0.74, 2.0)],
    [
      (0.0, 1.0),
      (0.09, 1.25),
      (0.18, 1.5),
      (0.32, 2.0),
      (0.46, 1.5),
      (0.61, 2.0),
    ],
  ]
  let phrase = phrases[stars]
  let root = bass * 4.0
  let end = phrase[phrase.length() - 1].0
  tone(bass, if stars == 1 { 0.45 } else { 1.05 }, 0, 0.16, attack=0.025)
  tone(
    bass * 2.0,
    if stars == 1 {
      0.38
    } else {
      0.8
    },
    0,
    0.055,
    delay=0.015,
    attack=0.02,
  )
  for index, note in phrase {
    let (delay, ratio) = note
    let last = index == phrase.length() - 1
    let pitch = root * ratio
    let length = match stars {
      1 => if last { 0.28 } else { 0.18 }
      2 => if last { 0.65 } else { 0.22 }
      _ => if last { 0.99 } else { 0.32 }
    }
    tone(pitch, length, 1, 0.16, delay~, attack=0.012)
    let upper = if stars == 1 {
      if last {
        0.22
      } else {
        0.07
      }
    } else if last {
      if stars == 2 {
        0.48
      } else {
        0.6
      }
    } else {
      0.16
    }
    tone(pitch * 2.0, upper, 0, 0.025, delay~, attack=0.018)
  }
  match stars {
    1 => tone(root, 0.26, 0, 0.045, delay=end, attack=0.03)
    2 => {
      tone(root * 1.25, 0.7, 0, 0.055, delay=end, attack=0.025)
      tone(root * 1.5, 0.7, 0, 0.045, delay=end, attack=0.025)
    }
    _ => {
      tone(bass * 3.0, 0.95, 0, 0.045, delay=end, attack=0.03)
      tone(root, 0.95, 0, 0.045, delay=end, attack=0.025)
      tone(root * 2.5, 0.95, 1, 0.065, delay=end, attack=0.025)
      tone(root * 3.0, 0.95, 0, 0.05, delay=end, attack=0.03)
    }
  }
}

// ---------- play ----------

///|
fn cell_of(p : @core.Pt) -> Int32 {
  // A key for any point, on or off the board.
  (p.q + 4096) * 8192 + p.r + 4096
}

///|
fn all_motions() -> Array[Motion] {
  let out = []
  for _, m in game.moves {
    let mut x : Motion? = Some(m)
    while x is Some(y) {
      out.push(y)
      x = y.queued
    }
  }
  out
}

///|
fn prepare_traffic(m : Motion) -> Unit {
  m.traffic = []
  for before in all_motions() {
    if before.i == m.i {
      continue
    }
    for index in m.path.length()..<m.route.length() {
      if before.visits.get(cell_of(m.route[index])) is Some(crossing) {
        m.traffic.push(
          (
            before,
            (crossing + 1).to_double(),
            @core.imax(0, index - m.path.length()).to_double(),
          ),
        )
      }
    }
  }
}

///|
fn motion_limit(m : Motion, positions : Map[Int32, Double]) -> Double {
  let mut limit = m.distance
  m.traffic = m.traffic.filter(gate => {
    let (before, clear, stop) = gate
    match positions.get(before.serial) {
      None => false
      Some(tail) =>
        if tail >= clear {
          false
        } else {
          limit = @core.dmin(limit, stop)
          true
        }
    }
  })
  limit
}

///|
fn positions() -> Map[Int32, Double] {
  let out = Map([])
  for m in all_motions() {
    out[m.serial] = m.progress
  }
  out
}

///|
fn mirror_crossings(route : Array[@core.Pt], length : Int32) -> Array[Int32] {
  let g = geo()
  let out = []
  for i in length..<route.length() {
    let p = route[i]
    let before = route[i - 1]
    if !g.inside(p) || g.mirror[g.cell(p)] < 0 {
      continue
    }
    let (dq, dr) = (p.q - before.q, p.r - before.r)
    let (oq, or_) = g.direction([before, p])
    if oq != dq || or_ != dr {
      out.push(i - length + 1)
    }
  }
  out
}

///|
fn rope_left() -> Int32 {
  game.paths.filter(p => p is Some(_)).length()
}

///|
/// Tap rope i (a player tap unless `automatic`).
pub fn tap(i : Int32, automatic : Bool, solve_fast : Bool) -> Unit {
  guard game.level is Some(_) else { return }
  if i < 0 || i >= game.paths.length() || game.paths[i] is None || game.ended {
    return
  }
  let mut previous = game.moves.get(i)
  if solve_fast {
    while previous is Some(p) && p.queued is Some(q) {
      previous = Some(q)
    }
  }
  if !solve_fast &&
    previous is Some(p) &&
    (p.event != @core.EV_BOUNCE || p.queued is Some(_)) {
    return
  }
  if game.auto && !automatic {
    return
  }
  if !automatic {
    game.taps += 1
    game.hint = -1
  }
  let path = game.paths[i].unwrap()
  guard geo().tap(game.paths, i) is Some(mv) else {
    game.bump = i
    game.bump_time = 0.25
    if !automatic {
      sfx(SFX_BLOCKED, 0)
    }
    return
  }
  if !automatic {
    game.history.push({
      paths: game.paths,
      plan: game.plan.copy(),
      lost: game.lost,
    })
  }
  if game.bump == i {
    game.bump = -1
  }
  let route = mv.route.copy()
  let mut distance = mv.distance.to_double()
  let reflections = mirror_crossings(route, path.length())
  if mv.event == @core.EV_EXIT {
    let a = route[route.length() - 1]
    let b = route[route.length() - 2]
    let (dq, dr) = (a.q - b.q, a.r - b.r)
    let extra = (@core.dmax(game.width, game.height) * 2.0 / game.scale)
      .ceil()
      .to_int() +
      4
    for n in 1..<=extra {
      route.push({ q: a.q + dq * n, r: a.r + dr * n, })
    }
    distance += extra.to_double()
  }
  let visits = Map([])
  for k, p in route {
    visits[cell_of(p)] = k
  }
  game.serial += 1
  if mv.event == @core.EV_EXIT {
    game.clear_no += 1
  }
  let m : Motion = {
    i,
    path,
    route,
    event: mv.event,
    final_path: mv.paths[i],
    distance,
    progress: 0.0,
    speed: 0.0,
    hold: if mv.event == @core.EV_BOUNCE {
      1.0
    } else {
      0.0
    },
    impacted: false,
    swished: false,
    waiting: false,
    automatic,
    queued: None,
    visits,
    traffic: [],
    pop_note: if mv.event == @core.EV_EXIT {
      game.clear_no
    } else {
      0
    },
    reflections,
    next_reflection: 0,
    serial: game.serial,
  }
  prepare_traffic(m)
  m.waiting = m.distance > 0.0 && motion_limit(m, positions()) == 0.0
  match previous {
    Some(p) => p.queued = Some(m)
    None => game.moves[i] = m
  }
  commit(m, mv.paths)
  if !automatic && !solve_fast {
    game.activations[i] = 0.18
    sfx(SFX_ACTIVATE, 0)
  }
}

///|
fn commit(m : Motion, paths : Array[@core.Path?]) -> Unit {
  let was_lost = game.lost
  let previous_plan = game.plan
  let b = board()
  let g = geo()
  game.paths = paths
  if !m.automatic {
    game.plan = if previous_plan.length() > 0 && previous_plan[0] == m.i {
      previous_plan[1:].to_owned()
    } else {
      []
    }
    game.lost = false
    game.auto = b.all_free(g, paths)
  }
  if rope_left() > 0 {
    let mut any = false
    for k in 0..<paths.length() {
      if paths[k] is Some(_) && g.tap(paths, k) is Some(_) {
        any = true
        break
      }
    }
    if !any {
      game.lost = true
    }
  }
  if !m.automatic && !game.auto && !game.lost && game.plan.length() == 0 {
    seek_plan(previous_plan.filter(k => paths[k] is Some(_)), 900)
  }
  refresh_frozen()
  if game.lost && !was_lost {
    sfx(SFX_BUMP, 0)
    game.notice = "Knotted. Undo or restart."
  }
}

///|
/// game-engine.js guide(): try the preferred order first, then search. Fast
/// enough here to run synchronously instead of in a worker.
fn seek_plan(prefer : Array[Int32], budget : Int32) -> Unit {
  let b = board()
  let g = geo()
  let mut current = game.paths
  let moves = []
  for i in prefer {
    if current[i] is None {
      continue
    }
    guard g.tap(current, i) is Some(mv) else { break }
    moves.push(i)
    current = mv.paths
  }
  if @core.all_gone(current) {
    game.plan = moves
    return
  }
  let s = b.solve(g, game.paths, budget, prefer)
  if s.solved == Some(true) {
    game.plan = s.moves
  }
}

///|
fn refresh_frozen() -> Unit {
  game.frozen = if !game.auto && game.plan.length() == 0 {
    board().frozen(geo(), game.paths)
  } else {
    []
  }
}

///|
pub fn undo() -> Unit {
  if game.level is None ||
    game.undos == 0 ||
    game.history.length() == 0 ||
    game.auto ||
    game.ended {
    return
  }
  let s = game.history.pop().unwrap()
  game.paths = s.paths
  game.plan = s.plan
  game.lost = s.lost
  game.moves.clear()
  game.activations.clear()
  game.bump = -1
  game.undos -= 1
  game.taps += 1
  game.hint = -1
  refresh_frozen()
  if game.plan.length() == 0 && !game.lost {
    seek_plan([], 900)
  }
  sfx(SFX_UNDO, 0)
  game.notice = "Undo · +1 tap"
}

///|
pub fn hint() -> Unit {
  if game.level is None || game.auto || game.ended || game.lost {
    return
  }
  if game.plan.length() == 0 {
    seek_plan([], 900)
    if game.plan.length() == 0 {
      game.notice = "No route found."
      return
    }
  }
  if game.moves.contains(game.plan[0]) {
    return
  }
  if game.hint == game.plan[0] && game.hint_time > 0.0 {
    game.hint_time = 3.0
    return
  }
  game.hint = game.plan[0]
  game.hint_time = 3.0
  game.taps += 2
  sfx(SFX_HINT, 0)
  game.notice = "Hint · +2 taps"
}

///|
pub fn auto_solve() -> Unit {
  if game.level is None || game.ended || game.used_auto || rope_left() == 0 {
    return
  }
  let b = board()
  let g = geo()
  let mut plan = if b.all_free(g, game.paths) {
    let p = []
    for i, x in game.paths {
      if x is Some(_) {
        p.push(i)
      }
    }
    p
  } else {
    game.plan.copy()
  }
  if plan.length() == 0 || !b.replay(g, plan, game.paths).solved {
    seek_plan([], 5000)
    plan = game.plan.copy()
    if plan.length() == 0 {
      game.notice = "No route found."
      return
    }
  }
  game.used_auto = true
  game.hint = -1
  for i in plan {
    if game.paths[i] is Some(_) {
      tap(i, true, true)
    }
  }
  game.plan = []
  game.auto = true
  game.lost = false
}

///|
fn finish() -> Unit {
  game.ended = true
  let par = game.level.unwrap().par
  game.stars = if game.used_auto {
    0
  } else if game.taps <= par {
    3
  } else if game.taps <= par + 2 {
    2
  } else {
    1
  }
  sfx(SFX_WIN, game.stars)
}

///|
fn point_at(route : Array[@core.Pt], t : Double) -> (Double, Double) {
  let i = @core.imin(route.length() - 2, t.floor().to_int())
  let f = t - i.to_double()
  let a = route[i]
  let b = route[i + 1]
  (
    a.q.to_double() + (b.q - a.q).to_double() * f,
    a.r.to_double() + (b.r - a.r).to_double() * f,
  )
}

///|
/// The rope's visible points in grid units (fractional while moving).
fn visible(i : Int32) -> Array[(Double, Double)] {
  match game.moves.get(i) {
    Some(m) if !(m.impacted && m.event == @core.EV_BOUNCE) => {
      let start = m.progress
      let end = start + (m.path.length() - 1).to_double()
      let pts = [point_at(m.route, start)]
      for k = start.floor().to_int() + 1; k.to_double() < end; k = k + 1 {
        pts.push((m.route[k].q.to_double(), m.route[k].r.to_double()))
      }
      pts.push(point_at(m.route, end))
      pts
    }
    Some(m) =>
      m.final_path.unwrap().map(p => (p.q.to_double(), p.r.to_double()))
    None =>
      match game.paths[i] {
        Some(p) => p.map(p => (p.q.to_double(), p.r.to_double()))
        None => []
      }
  }
}

///|
fn exit_cleared(i : Int32) -> Bool {
  let margin = game.scale * 0.52
  for p in visible(i) {
    let (x, y) = screen_at(p.0, p.1)
    if x > -margin &&
      x < game.width + margin &&
      y > -margin &&
      y < game.height + margin {
      return false
    }
  }
  true
}

///|
/// Advance the animation by dt seconds.
pub fn update(dt : Double) -> Unit {
  guard game.level is Some(_) else { return }
  game.clock += dt
  if game.hint_time > 0.0 {
    game.hint_time -= dt
    if game.hint_time <= 0.0 {
      game.hint = -1
    }
  }
  if game.bump >= 0 {
    game.bump_time -= dt
    if game.bump_time <= 0.0 {
      game.bump = -1
    }
  }
  for id in game.activations.keys().to_array() {
    let r = game.activations[id]
    if r <= dt {
      game.activations.remove(id)
    } else {
      game.activations[id] = r - dt
    }
  }
  let motion_dt = dt * game.speed_factor
  let pos = positions()
  for id in game.moves.keys().to_array() {
    guard game.moves.get(id) is Some(m) else { continue }
    let travel = motion_dt * (if m.event == @core.EV_EXIT { 0.5 } else { 1.0 })
    if !m.impacted {
      m.speed = @core.dmin(38.0, m.speed + travel * 100.0)
    }
    let limit = motion_limit(m, pos)
    let proposed = m.progress + m.speed * travel
    m.progress = @core.dmin(limit, proposed)
    m.waiting = limit < m.distance && proposed >= limit
    if !m.swished && m.progress > 0.0 {
      m.swished = true
      sfx(SFX_SLIDE, 0)
    }
    if m.waiting {
      m.speed = 0.0
    }
    while m.next_reflection < m.reflections.length() &&
          m.progress >= m.reflections[m.next_reflection].to_double() {
      sfx(SFX_REFLECT, m.next_reflection)
      m.next_reflection += 1
    }
    if m.progress >= m.distance - 0.001 ||
      (m.event == @core.EV_EXIT && exit_cleared(id)) {
      let mut remaining = motion_dt
      if m.event == @core.EV_BOUNCE && !m.impacted {
        m.progress = m.distance
        let speed = if m.distance > 0.0 { m.speed } else { 38.0 }
        m.speed = speed
        // The return run covers the rope's own length at the incoming speed.
        m.hold = m.path.length().to_double() / speed
        remaining = if m.distance > 0.0 {
          @core.dmax(0.0, (proposed - m.distance) / speed)
        } else {
          motion_dt
        }
        m.impacted = true
        sfx(SFX_SPRING, 0)
      }
      m.hold -= remaining
      if m.hold <= 0.0 {
        match m.queued {
          Some(q) => game.moves[id] = q
          None => game.moves.remove(id)
        }
        if m.event == @core.EV_EXIT {
          sfx(SFX_POP, m.pop_note)
        } else if m.event != @core.EV_BOUNCE &&
          (
            m.reflections.length() == 0 ||
            m.reflections[m.reflections.length() - 1].to_double() != m.distance
          ) {
          sfx(SFX_THUD, 0)
        }
      }
    }
  }
  if !game.ended && rope_left() == 0 && game.moves.is_empty() {
    if game.used_auto {
      game.outro = @core.dmin(1.0, game.outro + motion_dt)
    }
    if !game.used_auto || game.outro >= 1.0 {
      finish()
    }
  } else if game.auto && !game.ended {
    for i, p in game.paths {
      if p is Some(_) && !game.moves.contains(i) {
        tap(i, true, false)
        break
      }
    }
  }
}

// ---------- input ----------

///|
fn seg_distance(
  px : Double,
  py : Double,
  ax : Double,
  ay : Double,
  bx : Double,
  by : Double,
) -> Double {
  let dx = bx - ax
  let dy = by - ay
  let len = dx * dx + dy * dy
  let t = if len == 0.0 {
    0.0
  } else {
    @core.dmax(0.0, @core.dmin(1.0, ((px - ax) * dx + (py - ay) * dy) / len))
  }
  let ex = px - ax - dx * t
  let ey = py - ay - dy * t
  (ex * ex + ey * ey).sqrt()
}

///|
fn head_unit(i : Int32) -> (Double, Double) {
  let pts = visible(i)
  let n = pts.length()
  let (ax, ay) = screen_at(pts[n - 2].0, pts[n - 2].1)
  let (bx, by) = screen_at(pts[n - 1].0, pts[n - 1].1)
  let len = ((bx - ax) * (bx - ax) + (by - ay) * (by - ay)).sqrt()
  if len == 0.0 {
    (0.0, -1.0)
  } else {
    ((bx - ax) / len, (by - ay) / len)
  }
}

///|
/// The rope under a screen point, or -1.
pub fn pick(px : Double, py : Double) -> Int32 {
  if game.level is None || game.auto {
    return -1
  }
  let mut best = -1
  let mut distance = game.scale * 0.43
  for i, rope in game.paths {
    if rope is None {
      continue
    }
    if game.moves.get(i) is Some(m) &&
      (m.event != @core.EV_BOUNCE || m.queued is Some(_)) {
      continue
    }
    let pts = visible(i).map(p => screen_at(p.0, p.1))
    let (hx, hy) = head_unit(i)
    let tip = pts[pts.length() - 1]
    pts.push((tip.0 + hx * game.scale * 0.35, tip.1 + hy * game.scale * 0.35))
    for j in 1..<pts.length() {
      let v = seg_distance(
        px,
        py,
        pts[j - 1].0,
        pts[j - 1].1,
        pts[j].0,
        pts[j].1,
      )
      if v < distance {
        distance = v
        best = i
      }
    }
  }
  best
}

///|
pub fn pointer(px : Double, py : Double) -> Int32 {
  let i = pick(px, py)
  if i >= 0 {
    tap(i, false, false)
  }
  i
}

// ---------- drawing ----------

///|
/// The display list for one frame:
///   [1, x, y, size, hex]                    a grid cell
///   [2, x, y, size, angle]                  a mirror
///   [3, x, y, size, spin]                   a spinner
///   [4, colour, flags, n, x, y, ..., hx, hy] a rope (flags: 1 hint, 2 frozen, 4 waiting, 8 flash)
pub fn draw(out : Array[Double]) -> Unit {
  out.clear()
  guard game.level is Some(l) else { return }
  let b = l.board
  let s = game.scale
  for c in 0..<(b.w * b.h) {
    let p = if b.hex {
      @core.hex_point(c, b.w)
    } else {
      { q: c % b.w, r: c / b.w, }
    }
    let (x, y) = screen(p)
    for v in [1.0, x, y, s, if b.hex { 1.0 } else { 0.0 }] {
      out.push(v)
    }
  }
  for m in b.mirrors {
    let (x, y) = screen(m.cell)
    let angle = if b.hex {
      m.kind.to_double() * 3.141592653589793 / 3.0
    } else if m.kind == 0 {
      -3.141592653589793 / 4.0
    } else {
      3.141592653589793 / 4.0
    }
    for v in [2.0, x, y, s, angle] {
      out.push(v)
    }
  }
  for p in b.springs {
    let (x, y) = screen(p)
    for v in [3.0, x, y, s, game.clock * 2.0] {
      out.push(v)
    }
  }
  for i in 0..<game.paths.length() {
    let pts = visible(i)
    if pts.length() < 2 {
      continue
    }
    let mut flags = 0
    if game.hint == i {
      flags += 1
    }
    if @core.contains(game.frozen, i) && !game.moves.contains(i) {
      flags += 2
    }
    if game.moves.get(i) is Some(m) && m.waiting {
      flags += 4
    }
    if game.activations.contains(i) {
      flags += 8
    }
    out.push(4.0)
    out.push(i.to_double())
    out.push(flags.to_double())
    out.push(pts.length().to_double())
    let (dx, dy) = if game.bump == i {
      let (hx, hy) = head_unit(i)
      let t = @math.sin(game.bump_time / 0.25 * 3.141592653589793) * 0.1 * s
      (hx * t, hy * t)
    } else {
      (0.0, 0.0)
    }
    for p in pts {
      let (x, y) = screen_at(p.0, p.1)
      out.push(x + dx)
      out.push(y + dy)
    }
    let (hx, hy) = head_unit(i)
    out.push(hx)
    out.push(hy)
  }
}

///|
pub fn take_voices(out : Array[Double]) -> Unit {
  out.clear()
  for v in game.voices {
    out.push(v)
  }
  game.voices.clear()
}

///|
pub fn take_notice() -> String {
  let n = game.notice
  game.notice = ""
  n
}

///|
pub fn set_speed(f : Double) -> Unit {
  game.speed_factor = f
}

///|
/// [taps, par, ropes left, undos, stars (-1 while playing), auto, lost, moving]
pub fn status() -> Array[Int32] {
  guard game.level is Some(l) else { return [] }
  [
    game.taps,
    l.par,
    rope_left(),
    game.undos,
    game.stars,
    if game.auto {
      1
    } else {
      0
    },
    if game.lost {
      1
    } else {
      0
    },
    if game.moves.is_empty() {
      0
    } else {
      1
    },
  ]
}
