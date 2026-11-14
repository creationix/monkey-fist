// dependency-metrics.js: causal relationships observed during the manual part of a
// verified solution. Only `interaction`, the term the generator's selection reads,
// is computed; the JS also reports descriptive counts that nothing selects on.

///|
priv struct Snap {
  event : Int32 // 0 exit, 1 blocked, 2 loop, 3 bounce
  distance : Int32
  blocker : Int32
}

///|
fn snapshot(g : Geo, paths : Array[Path?]) -> Array[Snap?] {
  let s = g.mark(paths)
  let owner = FixedArray::make(g.w * g.h, -1)
  for i, p in paths {
    if p is Some(path) {
      for c in path {
        owner[g.cell(c)] = i
      }
    }
  }
  let seen : Array[Int32] = []
  paths.map(fn(p) {
    guard p is Some(path) else { return None }
    let mut pt = last(path)
    let (dq0, dr0) = g.direction(path)
    let mut dq = dq0
    let mut dr = dr0
    let mut distance = 0
    seen.clear()
    for _ in 0..<=(g.w * g.h * 6) {
      let next = { q: pt.q + dq, r: pt.r + dr, }
      if !g.inside(next) {
        return Some({ event: 0, distance, blocker: -1, })
      }
      let c = g.cell(next)
      if g.occ[c] == s {
        return Some({ event: 1, distance, blocker: owner[c], })
      }
      let state = if g.hex { c } else { (c * 3 + dq + 1) * 3 + dr + 1 }
      if contains(seen, state) {
        return Some({ event: 2, distance: 0, blocker: -1, })
      }
      seen.push(state)
      distance += 1
      pt = next
      if g.spring[c] {
        return Some({ event: 3, distance, blocker: -1, })
      }
      let m = g.mirror[c]
      if m >= 0 {
        if g.hex {
          let d = hex_reflect(hex_dir_index(dq, dr), m)
          dq = hex_dq[d]
          dr = hex_dr[d]
        } else {
          let (a, b) = turn(m, dq, dr)
          dq = a
          dr = b
        }
      }
    }
    Some({ event: 2, distance: 0, blocker: -1, })
  })
}

///|
pub fn interaction(
  b : Board,
  g : Geo,
  plan : Array[Int32],
  manual : Int32,
) -> Double {
  let n = b.ropes.length()
  let dependents : Array[Array[Int32]] = Array::makei(n, _ => [])
  let mut paths = some_paths(b.ropes)
  let mut before = snapshot(g, paths)
  let actions = FixedArray::make(n, 0)
  let last_action = FixedArray::make(n, -1)
  let last_freed = FixedArray::make(n, -1)
  let revisited = FixedArray::make(n, false)
  let mut revisited_count = 0
  let steps = imin(plan.length(), imax(0, manual))
  for step in 0..<steps {
    let id = plan[step]
    guard g.tap(paths, id) is Some(mv) else { break }
    let after = snapshot(g, mv.paths)
    for j in 0..<n {
      if j == id {
        continue
      }
      guard before[j] is Some(a) else { continue }
      guard after[j] is Some(bb) else { continue }
      if a.blocker != id || bb.event == 2 {
        continue
      }
      if bb.distance > a.distance || (bb.event == 0 && a.event != 0) {
        if !contains(dependents[id], j) {
          dependents[id].push(j)
        }
        last_freed[j] = step
      }
    }
    if actions[id] > 0 && last_freed[id] > last_action[id] && !revisited[id] {
      revisited[id] = true
      revisited_count += 1
    }
    actions[id] += 1
    last_action[id] = step
    paths = mv.paths
    before = after
  }
  graph_interaction(dependents, n, revisited_count)
}

///|
fn graph_interaction(
  dependents : Array[Array[Int32]],
  n : Int32,
  revisited : Int32,
) -> Double {
  let prerequisites : Array[Array[Int32]] = Array::makei(n, _ => [])
  for from in 0..<n {
    for to in dependents[from] {
      prerequisites[to].push(from)
    }
  }
  // Tarjan's strongly connected components.
  let mut next_index = 0
  let indices = FixedArray::make(n, -1)
  let low = FixedArray::make(n, 0)
  let on_stack = FixedArray::make(n, false)
  let stack = []
  let components : Array[Array[Int32]] = []
  let component = FixedArray::make(n, 0)
  fn visit(v : Int32) -> Unit {
    indices[v] = next_index
    low[v] = next_index
    next_index += 1
    stack.push(v)
    on_stack[v] = true
    for x in dependents[v] {
      if indices[x] < 0 {
        visit(x)
        low[v] = imin(low[v], low[x])
      } else if on_stack[x] {
        low[v] = imin(low[v], indices[x])
      }
    }
    if low[v] != indices[v] {
      return
    }
    let group = []
    while true {
      let x = stack.pop().unwrap()
      on_stack[x] = false
      component[x] = components.length()
      group.push(x)
      if x == v {
        break
      }
    }
    components.push(group)
  }

  for i in 0..<n {
    if indices[i] < 0 {
      visit(i)
    }
  }
  let k = components.length()
  let arcs : Array[Array[Int32]] = Array::makei(k, _ => [])
  let indegree = FixedArray::make(k, 0)
  for i in 0..<n {
    for j in dependents[i] {
      let a = component[i]
      let c = component[j]
      if a != c && !contains(arcs[a], c) {
        arcs[a].push(c)
        indegree[c] += 1
      }
    }
  }
  let queue = []
  for i in 0..<k {
    if indegree[i] == 0 {
      queue.push(i)
    }
  }
  let mut q = 0
  while q < queue.length() {
    for c in arcs[queue[q]] {
      indegree[c] -= 1
      if indegree[c] == 0 {
        queue.push(c)
      }
    }
    q += 1
  }
  // reach[a]: components reachable from a, for transitive reduction.
  let reach = Array::makei(k, _ => FixedArray::make(k, false))
  for qi = queue.length() - 1; qi >= 0; qi = qi - 1 {
    let a = queue[qi]
    for c in arcs[a] {
      reach[a][c] = true
      for x in 0..<k {
        if reach[c][x] {
          reach[a][x] = true
        }
      }
    }
  }
  let essential = Array::makei(k, a => {
    arcs[a].filter(c => !arcs[a].iter().any(x => x != c && reach[x][c]))
  })
  let incoming = FixedArray::make(k, 0)
  for next in essential {
    for c in next {
      incoming[c] += 1
    }
  }
  let internal_joins = components.map(group => {
    group
    .filter(i => {
      prerequisites[i].filter(j => component[j] == component[i]).length() >= 2
    })
    .length()
  })
  let mut joins = 0
  for x in incoming {
    if x >= 2 {
      joins += 1
    }
  }
  for x in internal_joins {
    joins += x
  }
  let junctions = Array::makei(k, i => {
    (if incoming[i] >= 2 { 1 } else { 0 }) +
    (if internal_joins[i] > 0 { 1 } else { 0 })
  })
  let branch = FixedArray::makei(k, i => junctions[i])
  for a in queue {
    for c in essential[a] {
      branch[c] = imax(branch[c], branch[a] + junctions[c])
    }
  }
  let mut mutual = 0
  for group in components {
    if group.length() > 1 {
      mutual += group.length()
    }
  }
  let mut branching = 0
  for x in branch {
    branching = imax(branching, x)
  }
  // The largest group of ropes coupled by any relationship.
  let seen = FixedArray::make(n, false)
  let mut largest = 0
  for i in 0..<n {
    if seen[i] {
      continue
    }
    let group = [i]
    seen[i] = true
    let mut gq = 0
    while gq < group.length() {
      let v = group[gq]
      for x in prerequisites[v] {
        if !seen[x] {
          seen[x] = true
          group.push(x)
        }
      }
      for x in dependents[v] {
        if !seen[x] {
          seen[x] = true
          group.push(x)
        }
      }
      gq += 1
    }
    if group.length() > 1 {
      largest = imax(largest, group.length())
    }
  }
  let nd = n.to_double()
  let connected = largest.to_double() / dmax(1.0, nd)
  let evidence = 3.0 * dmin(joins.to_double() / dmax(1.0, nd * 0.25), 1.0) +
    2.5 * mutual.to_double() / dmax(1.0, nd) +
    2.0 * revisited.to_double() / dmax(1.0, nd) +
    1.5 * dmin(branching.to_double() / 4.0, 1.0)
  to_fixed(evidence * (0.4 + 0.6 * connected), 4)
}

///|
/// Number(x.toFixed(digits)) for the small non-negative values used here: the
/// nearest decimal with `digits` places, larger on a tie.
pub fn to_fixed(x : Double, digits : Int32) -> Double {
  let mut scale = 1.0
  for _ in 0..<digits {
    scale *= 10.0
  }
  let y = x * scale
  let f = y.floor()
  let n = if y - f >= 0.5 { f + 1.0 } else { f }
  n / scale
}
