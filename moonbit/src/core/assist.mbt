// The game's assistance: hints and auto-solve (game-engine.js guide) and which
// mirrors and springs a rope could still reach (reachableFeatures).

///|
/// Try the preferred order first: an earlier exit can make later taps of the same
/// rope redundant, and the old certificate often still solves the board. Otherwise
/// search from `paths` with the budget.
pub fn guide(
  b : Board,
  paths : Array[Path?],
  budget : Int32,
  prefer : Array[Int32],
) -> Solved {
  let g = b.geo()
  let mut current = paths
  let moves = []
  for i in prefer {
    if current[i] is None {
      continue
    }
    guard g.tap(current, i) is Some(mv) else { break }
    moves.push(i)
    current = mv.paths
  }
  if all_gone(current) {
    return { solved: Some(true), moves, nodes: 0 }
  }
  b.solve(g, paths, budget, prefer)
}

///|
/// The mirrors and springs (indices: mirrors first, then springs) that some rope
/// could still pass. Each rope runs alone and may stop after any unit step: a
/// superset of real play, so only a feature no trajectory reaches is reported
/// gone. A spent budget keeps every feature rather than guessing.
pub fn reachable_features(
  b : Board,
  paths : Array[Path?],
  budget : Int32,
) -> Array[Int32] {
  let g = b.geo()
  let feature : Map[Int32, Int32] = Map([])
  for k, m in b.mirrors {
    feature[g.cell(m.cell)] = k
  }
  for k, p in b.springs {
    feature[g.cell(p)] = b.mirrors.length() + k
  }
  let total = b.mirrors.length() + b.springs.length()
  let everything = Array::makei(total, k => k)
  if total == 0 {
    return []
  }
  let live : Map[Int32, Bool] = Map([]) // feature index, in the order reached
  let mut visited = 0
  for original in paths {
    guard original is Some(start) else { continue }
    let mut path = start
    let seen : Set[String] = Set([])
    while true {
      if visited >= budget {
        return everything
      }
      visited += 1
      let cells = path.map(p => g.cell(p))
      let state = cells.map(c => c.to_string()).join(";")
      if seen.contains(state) {
        break
      }
      seen.add(state)
      let head = path[path.length() - 1]
      let previous = path[path.length() - 2]
      let mut dq = head.q - previous.q
      let mut dr = head.r - previous.r
      for m in b.mirrors {
        if m.cell.q == head.q && m.cell.r == head.r {
          live[feature[g.cell(head)]] = true
          if b.hex {
            let incoming = hex_dir_index(dq, dr)
            let out = (2 * m.kind - incoming + 6) % 6
            dq = hex_dq[out]
            dr = hex_dr[out]
          } else if m.kind == 0 {
            let t = dq
            dq = -dr
            dr = -t
          } else {
            let t = dq
            dq = dr
            dr = t
          }
          break
        }
      }
      let next = { q: head.q + dq, r: head.r + dr }
      if !g.inside(next) {
        break
      }
      let at = g.cell(next)
      if cells.contains(at) {
        break
      }
      if feature.get(at) is Some(k) {
        live[k] = true
      }
      if live.length() == total {
        return everything
      }
      let moved = path[1:].to_owned()
      moved.push(next)
      path = moved
      if feature.get(at) is Some(k) && k >= b.mirrors.length() {
        path = path.rev()
      }
    }
  }
  live.keys().to_array()
}
