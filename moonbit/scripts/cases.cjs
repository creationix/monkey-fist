// Custom-set parity sample: square and Hex, mirrors, spinners or both, several
// sizes and difficulties, and one colossal map. `index` picks the level in the set.
module.exports = [
  { opts: { grid: 'square', min: 1, max: 100, width: 4, height: 5, count: 10, seed: 'PARITY' }, index: 3 },
  { opts: { grid: 'hex', min: 1, max: 100, width: 6, height: 8, count: 10, seed: 'PARITY' }, index: 7 },
  { opts: { grid: 'square', min: 1, max: 100, width: 10, height: 14, count: 20, seed: 'PLAIN' }, index: 19 },
  { opts: { grid: 'hex', min: 1, max: 100, width: 10, height: 14, count: 20, seed: 'PLAIN' }, index: 12 },
  { opts: { grid: 'square', min: 20, max: 90, width: 9, height: 12, count: 8, mirrors: true, seed: 'MIRROR' }, index: 5 },
  { opts: { grid: 'hex', min: 20, max: 90, width: 9, height: 12, count: 8, mirrors: true, seed: 'MIRROR' }, index: 6 },
  { opts: { grid: 'square', min: 30, max: 80, width: 8, height: 10, count: 6, springs: true, seed: 'SPRING' }, index: 2 },
  { opts: { grid: 'hex', min: 30, max: 80, width: 8, height: 10, count: 6, springs: true, seed: 'SPRING' }, index: 4 },
  { opts: { grid: 'square', min: 50, max: 100, width: 12, height: 16, count: 5, mirrors: true, springs: true, seed: 'BOTH' }, index: 4 },
  { opts: { grid: 'hex', min: 50, max: 100, width: 12, height: 16, count: 5, mirrors: true, springs: true, seed: 'BOTH' }, index: 3 },
  { opts: { grid: 'mixed', min: 1, max: 100, width: 16, height: 20, count: 4, mirrors: true, seed: 'WIDE' }, index: 2 },
  { opts: { grid: 'mixed', min: 1, max: 100, width: 20, height: 24, count: 4, seed: 'WIDE' }, index: 3 },
  { opts: { grid: 'square', min: 60, max: 60, width: 24, height: 24, count: 1, springs: true, seed: 'BIGSQ' }, index: 0 },
  { opts: { grid: 'square', min: 70, max: 70, width: 40, height: 40, count: 1, mirrors: true, springs: true, colossal: true, seed: 'COLOSSAL' }, index: 0 },
  { opts: { grid: 'hex', min: 70, max: 70, width: 32, height: 32, count: 1, mirrors: true, colossal: true, seed: 'COLOSSAL' }, index: 0 },
];
