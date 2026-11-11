// Curated Twists pack. Solutions and player-tap pars are verified by the routed solver.
(function (root) {
  'use strict';
  const L = typeof module !== 'undefined' && module.exports ? require('./levels.js') : MFLevels;
  const PACK = [
  {
    "title": "Around the corner",
    "kind": "Mirror",
    "note": "Tap the rope. The thin mirror turns it 90° and reflects from either side.",
    "W": 6,
    "H": 6,
    "ropes": [
      [
        {
          "x": 0,
          "y": 3
        },
        {
          "x": 1,
          "y": 3
        },
        {
          "x": 2,
          "y": 3
        }
      ]
    ],
    "mirrors": [
      {
        "cell": 21,
        "slope": "/"
      }
    ],
    "solution": [
      0
    ],
    "par": 1,
    "parExact": true
  },
  {
    "title": "Clear the crossing",
    "kind": "Mirrors",
    "note": "Ropes still block each other after a turn. Clear the crossing, then follow the mirrors.",
    "W": 7,
    "H": 7,
    "ropes": [
      [
        {
          "x": 0,
          "y": 5
        },
        {
          "x": 1,
          "y": 5
        }
      ],
      [
        {
          "x": 3,
          "y": 3
        },
        {
          "x": 2,
          "y": 3
        }
      ]
    ],
    "mirrors": [
      {
        "cell": 37,
        "slope": "/"
      },
      {
        "cell": 16,
        "slope": "\\"
      }
    ],
    "solution": [
      1,
      0
    ],
    "par": 1,
    "parExact": true
  },
  {
    "title": "The key rope",
    "kind": "Gate",
    "note": "The striped gate opens when the rope with its matching key symbol leaves.",
    "W": 6,
    "H": 6,
    "ropes": [
      [
        {
          "x": 0,
          "y": 2
        },
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 2,
          "y": 2
        }
      ],
      [
        {
          "x": 4,
          "y": 4
        },
        {
          "x": 4,
          "y": 5
        }
      ]
    ],
    "gates": [
      {
        "cell": 16,
        "key": 1
      }
    ],
    "solution": [
      1,
      0
    ],
    "par": 1,
    "parExact": true
  },
  {
    "title": "A chain of keys",
    "kind": "Gates",
    "note": "One key opens the next route. Work out which rope can leave first.",
    "W": 7,
    "H": 7,
    "ropes": [
      [
        {
          "x": 0,
          "y": 1
        },
        {
          "x": 1,
          "y": 1
        }
      ],
      [
        {
          "x": 4,
          "y": 3
        },
        {
          "x": 5,
          "y": 3
        }
      ],
      [
        {
          "x": 2,
          "y": 5
        },
        {
          "x": 2,
          "y": 6
        }
      ]
    ],
    "gates": [
      {
        "cell": 10,
        "key": 1
      },
      {
        "cell": 27,
        "key": 2
      }
    ],
    "solution": [
      2,
      1,
      0
    ],
    "par": 2,
    "parExact": true
  },
  {
    "title": "Bounce back",
    "kind": "Spring",
    "note": "A spring swaps the rope’s head and tail on contact. Once every rope is free, the rest leave automatically.",
    "W": 6,
    "H": 5,
    "ropes": [
      [
        {
          "x": 0,
          "y": 2
        },
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 2,
          "y": 2
        }
      ]
    ],
    "springs": [
      16
    ],
    "solution": [
      0,
      0
    ],
    "par": 1,
    "parExact": true
  },
  {
    "title": "Room to bounce",
    "kind": "Spring",
    "note": "Another rope is in the way of the spring. Make room for the bounce.",
    "W": 7,
    "H": 6,
    "ropes": [
      [
        {
          "x": 0,
          "y": 2
        },
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 2,
          "y": 2
        }
      ],
      [
        {
          "x": 4,
          "y": 3
        },
        {
          "x": 4,
          "y": 2
        }
      ]
    ],
    "springs": [
      19
    ],
    "solution": [
      1,
      0,
      0
    ],
    "par": 2,
    "parExact": true
  },
  {
    "title": "Turn the key",
    "kind": "Mirror + gate",
    "note": "Free the key rope to open the route around the mirror.",
    "W": 7,
    "H": 7,
    "ropes": [
      [
        {
          "x": 0,
          "y": 4
        },
        {
          "x": 1,
          "y": 4
        },
        {
          "x": 2,
          "y": 4
        }
      ],
      [
        {
          "x": 5,
          "y": 5
        },
        {
          "x": 5,
          "y": 6
        }
      ]
    ],
    "mirrors": [
      {
        "cell": 31,
        "slope": "/"
      }
    ],
    "springs": [],
    "gates": [
      {
        "cell": 24,
        "key": 1
      }
    ],
    "solution": [
      1,
      0
    ],
    "par": 1,
    "parExact": true
  },
  {
    "title": "Bend, then bounce",
    "kind": "Mirror + spring",
    "note": "Follow the arrow around the mirror. The spring reverses the whole rope, and the mirror works both ways.",
    "W": 7,
    "H": 7,
    "ropes": [
      [
        {
          "x": 0,
          "y": 4
        },
        {
          "x": 1,
          "y": 4
        },
        {
          "x": 2,
          "y": 4
        }
      ]
    ],
    "mirrors": [
      {
        "cell": 31,
        "slope": "/"
      }
    ],
    "springs": [
      10
    ],
    "solution": [
      0,
      0
    ],
    "par": 1,
    "parExact": true
  },
  {
    "W": 7,
    "H": 6,
    "title": "A spring behind a gate",
    "kind": "Gate + spring",
    "note": "Open the gate, then use the spring to reverse the rope.",
    "ropes": [
      [
        {
          "x": 0,
          "y": 2
        },
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 2,
          "y": 2
        }
      ],
      [
        {
          "x": 5,
          "y": 4
        },
        {
          "x": 5,
          "y": 5
        }
      ]
    ],
    "gates": [
      {
        "cell": 18,
        "key": 1
      }
    ],
    "springs": [
      19
    ],
    "solution": [
      1,
      0,
      0
    ],
    "par": 2,
    "parExact": true
  },
  {
    "title": "Open the bounce route",
    "kind": "All three",
    "note": "Free the key rope, follow the mirror, then bounce back. Every move is still just a tap.",
    "W": 7,
    "H": 7,
    "ropes": [
      [
        {
          "x": 0,
          "y": 4
        },
        {
          "x": 1,
          "y": 4
        },
        {
          "x": 2,
          "y": 4
        }
      ],
      [
        {
          "x": 5,
          "y": 5
        },
        {
          "x": 5,
          "y": 6
        }
      ]
    ],
    "mirrors": [
      {
        "cell": 31,
        "slope": "/"
      }
    ],
    "springs": [
      10
    ],
    "gates": [
      {
        "cell": 24,
        "key": 1
      }
    ],
    "solution": [
      1,
      0,
      0
    ],
    "par": 2,
    "parExact": true
  },
  {
    "title": "The winding lock",
    "kind": "All three",
    "note": "Mirrors, gates, and springs share one board. Save taps by freeing the blockers first.",
    "W": 5,
    "H": 7,
    "ropes": [
      [
        {
          "x": 1,
          "y": 1
        },
        {
          "x": 0,
          "y": 1
        },
        {
          "x": 0,
          "y": 0
        },
        {
          "x": 1,
          "y": 0
        },
        {
          "x": 2,
          "y": 0
        },
        {
          "x": 2,
          "y": 1
        }
      ],
      [
        {
          "x": 2,
          "y": 5
        },
        {
          "x": 3,
          "y": 5
        },
        {
          "x": 4,
          "y": 5
        },
        {
          "x": 4,
          "y": 4
        },
        {
          "x": 4,
          "y": 3
        },
        {
          "x": 3,
          "y": 3
        },
        {
          "x": 2,
          "y": 3
        }
      ],
      [
        {
          "x": 1,
          "y": 3
        },
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 2,
          "y": 2
        },
        {
          "x": 3,
          "y": 2
        },
        {
          "x": 3,
          "y": 1
        },
        {
          "x": 3,
          "y": 0
        },
        {
          "x": 4,
          "y": 0
        },
        {
          "x": 4,
          "y": 1
        }
      ],
      [
        {
          "x": 1,
          "y": 5
        },
        {
          "x": 1,
          "y": 6
        },
        {
          "x": 0,
          "y": 6
        },
        {
          "x": 0,
          "y": 5
        },
        {
          "x": 0,
          "y": 4
        }
      ],
      [
        {
          "x": 2,
          "y": 6
        },
        {
          "x": 3,
          "y": 6
        },
        {
          "x": 4,
          "y": 6
        }
      ],
      [
        {
          "x": 1,
          "y": 4
        },
        {
          "x": 2,
          "y": 4
        }
      ]
    ],
    "springs": [
      10
    ],
    "mirrors": [
      {
        "cell": 14,
        "slope": "\\"
      }
    ],
    "gates": [
      {
        "cell": 23,
        "key": 1
      }
    ],
    "solution": [
      2,
      1,
      3,
      4,
      5,
      0,
      3
    ],
    "par": 5,
    "parExact": true
  },
  {
    "title": "The final twist",
    "kind": "All three",
    "note": "Mirrors, gates, and springs share one board. Save taps by freeing the blockers first.",
    "W": 7,
    "H": 9,
    "ropes": [
      [
        {
          "x": 2,
          "y": 8
        },
        {
          "x": 2,
          "y": 7
        },
        {
          "x": 2,
          "y": 6
        }
      ],
      [
        {
          "x": 0,
          "y": 3
        },
        {
          "x": 0,
          "y": 4
        },
        {
          "x": 0,
          "y": 5
        },
        {
          "x": 1,
          "y": 5
        },
        {
          "x": 2,
          "y": 5
        }
      ],
      [
        {
          "x": 6,
          "y": 4
        },
        {
          "x": 6,
          "y": 5
        },
        {
          "x": 6,
          "y": 6
        },
        {
          "x": 5,
          "y": 6
        }
      ],
      [
        {
          "x": 3,
          "y": 1
        },
        {
          "x": 2,
          "y": 1
        },
        {
          "x": 2,
          "y": 0
        },
        {
          "x": 1,
          "y": 0
        },
        {
          "x": 1,
          "y": 1
        }
      ],
      [
        {
          "x": 4,
          "y": 5
        },
        {
          "x": 4,
          "y": 4
        },
        {
          "x": 3,
          "y": 4
        },
        {
          "x": 3,
          "y": 3
        }
      ],
      [
        {
          "x": 3,
          "y": 0
        },
        {
          "x": 4,
          "y": 0
        },
        {
          "x": 4,
          "y": 1
        },
        {
          "x": 4,
          "y": 2
        }
      ],
      [
        {
          "x": 6,
          "y": 0
        },
        {
          "x": 5,
          "y": 0
        },
        {
          "x": 5,
          "y": 1
        },
        {
          "x": 5,
          "y": 2
        }
      ],
      [
        {
          "x": 3,
          "y": 7
        },
        {
          "x": 3,
          "y": 6
        },
        {
          "x": 4,
          "y": 6
        },
        {
          "x": 4,
          "y": 7
        }
      ],
      [
        {
          "x": 6,
          "y": 7
        },
        {
          "x": 6,
          "y": 8
        },
        {
          "x": 5,
          "y": 8
        }
      ],
      [
        {
          "x": 0,
          "y": 0
        },
        {
          "x": 0,
          "y": 1
        }
      ],
      [
        {
          "x": 1,
          "y": 6
        },
        {
          "x": 1,
          "y": 7
        },
        {
          "x": 1,
          "y": 8
        },
        {
          "x": 0,
          "y": 8
        }
      ],
      [
        {
          "x": 2,
          "y": 2
        },
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 0,
          "y": 2
        }
      ],
      [
        {
          "x": 6,
          "y": 3
        },
        {
          "x": 6,
          "y": 2
        },
        {
          "x": 6,
          "y": 1
        }
      ]
    ],
    "springs": [
      30
    ],
    "mirrors": [
      {
        "cell": 17,
        "slope": "\\"
      }
    ],
    "gates": [
      {
        "cell": 23,
        "key": 7
      }
    ],
    "solution": [
      7,
      2,
      10,
      11,
      4,
      1,
      0,
      0,
      2,
      6,
      8,
      3,
      5,
      6,
      9,
      12
    ],
    "par": 11,
    "parExact": true
  }
];

  function transform(level, bits) {
    const W = level.W, H = level.H, flipX = !!(bits & 1), flipY = !!(bits & 2), transpose = !!(bits & 4);
    const point = p => {
      const x = flipX ? W - 1 - p.x : p.x, y = flipY ? H - 1 - p.y : p.y;
      return transpose ? { x: y, y: x } : { x, y };
    };
    const width = transpose ? H : W, height = transpose ? W : H;
    const cell = c => { const p = point({ x: c % W, y: Math.floor(c / W) }); return p.y * width + p.x; };
    return { ...level, W: width, H: height, ropes: level.ropes.map(path => path.map(point)),
      mirrors: (level.mirrors || []).map(m => ({ cell: cell(m.cell), slope: flipX !== flipY ? (m.slope === '/' ? '\\' : '/') : m.slope })),
      springs: (level.springs || []).map(cell), gates: (level.gates || []).map(g => ({ cell: cell(g.cell), key: g.key })) };
  }
  function generateSet(opts) {
    const seed = L.cleanSeed(opts.seed) || 'MONKEYFIST';
    return { seed, mode: 'T', count: 12, big: false, slide: true, code: 'T12S-' + seed,
      levels: PACK.map((level, index) => ({ twist: true, index, seed, difficulty: level.par })) };
  }
  function levelFrom(d) {
    const bits = d.seed === 'MONKEYFIST' ? 0 : L.hashString(d.seed + '|' + d.index) & 7;
    const definition = transform(PACK[d.index], bits);
    return { W: definition.W, H: definition.H, ropes: definition.ropes, definition, twist: true,
      best: definition.solution.slice(), taps: definition.solution.slice(), par: definition.par, parExact: true };
  }
  const api = { PACK, transform, generateSet, levelFrom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFTwists = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
