const rope = (...points) => points.map(([x, y]) => ({ x, y }));
module.exports = {
  wall: { W: 5, H: 4, ropes: [rope([0, 1], [1, 1])], walls: [8] },
  gate: { W: 5, H: 4, ropes: [rope([0, 1], [1, 1]), rope([4, 2], [4, 3])], gates: [{ cell: 8, key: 1 }] },
  gateCycle: { W: 5, H: 4, ropes: [rope([0, 0], [1, 0]), rope([0, 2], [1, 2])], gates: [{ cell: 3, key: 1 }, { cell: 13, key: 0 }] },
};
