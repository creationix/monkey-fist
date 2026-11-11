(function (root) {
  'use strict';
  const rope = (...points) => points.map(([x, y]) => ({ x, y }));
  const levels = [
    { title: 'Around the corner', kind: 'Mirror', note: 'Tap the rope. The thin mirror turns it 90° and reflects from either side.',
      W: 6, H: 6, ropes: [rope([0, 3], [1, 3], [2, 3])], mirrors: [{ cell: 21, slope: '/' }] },
    { title: 'Clear the crossing', kind: 'Mirrors', note: 'Ropes still block each other after a turn. Clear the crossing, then follow the mirrors.',
      W: 7, H: 7, ropes: [rope([0, 5], [1, 5]), rope([3, 3], [2, 3])], mirrors: [{ cell: 37, slope: '/' }, { cell: 16, slope: '\\' }] },
    { title: 'The key rope', kind: 'Gate', note: 'The striped gate opens when the rope with its matching key symbol leaves.',
      W: 6, H: 6, ropes: [rope([0, 2], [1, 2], [2, 2]), rope([4, 4], [4, 5])], gates: [{ cell: 16, key: 1 }] },
    { title: 'A chain of keys', kind: 'Gates', note: 'One key opens the next route. Work out which rope can leave first.',
      W: 7, H: 7, ropes: [rope([0, 1], [1, 1]), rope([4, 3], [5, 3]), rope([2, 5], [2, 6])], gates: [{ cell: 10, key: 1 }, { cell: 27, key: 2 }] },
    { title: 'Bounce back', kind: 'Spring', note: 'A spring swaps the rope’s head and tail when it hits. Tap it again to leave from the new arrow end.',
      W: 6, H: 5, ropes: [rope([0, 2], [1, 2], [2, 2])], springs: [16] },
    { title: 'Room to bounce', kind: 'Spring', note: 'Another rope is in the way of the spring. Make room for the bounce.',
      W: 7, H: 6, ropes: [rope([0, 2], [1, 2], [2, 2]), rope([4, 3], [4, 2])], springs: [19] },
    { title: 'Bend, then bounce', kind: 'Mirror + spring', note: 'Follow the arrow around the mirror. The spring reverses the whole rope, and the mirror works both ways.',
      W: 7, H: 7, ropes: [rope([0, 4], [1, 4], [2, 4])], mirrors: [{ cell: 31, slope: '/' }], springs: [10] },
    { title: 'Open the bounce route', kind: 'All three', note: 'Free the key rope, follow the mirror, then bounce back. Every move is still just a tap.',
      W: 7, H: 7, ropes: [rope([0, 4], [1, 4], [2, 4]), rope([5, 5], [5, 6])], mirrors: [{ cell: 31, slope: '/' }], springs: [10], gates: [{ cell: 24, key: 1 }] },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = levels.concat(require('./sandbox-generated.js'));
  else root.MFSandboxLevels = levels.concat(root.MFSandboxGenerated || []);
})(typeof globalThis !== 'undefined' ? globalThis : this);
