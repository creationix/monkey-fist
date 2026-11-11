(function (root) {
  'use strict';
  function draw(c, level, paths, X, Y, size, color) {
    c.save();
    function tile(cell, stroke, alpha = 1) {
      const x = X(cell % level.W), y = Y(Math.floor(cell / level.W));
      c.globalAlpha = alpha; c.fillStyle = '#143646'; c.strokeStyle = stroke; c.lineWidth = 2;
      c.beginPath();
      if (c.roundRect) c.roundRect(x - size * .43, y - size * .43, size * .86, size * .86, size * .12);
      else c.rect(x - size * .43, y - size * .43, size * .86, size * .86);
      c.fill(); c.stroke(); return [x, y];
    }
    for (const mirror of level.mirrors || []) {
      const [x, y] = tile(mirror.cell, '#7ce6ec'), slope = mirror.slope === '/' ? -1 : 1;
      c.lineCap = 'round'; c.beginPath(); c.moveTo(x - size * .3, y - slope * size * .3); c.lineTo(x + size * .3, y + slope * size * .3);
      c.strokeStyle = '#7ce6ec'; c.lineWidth = Math.max(3, size * .075); c.stroke();
      c.strokeStyle = '#d9ffff'; c.lineWidth = Math.max(1, size * .02); c.stroke();
    }
    for (const cell of level.springs || []) {
      const [x, y] = tile(cell, '#d4a5ff'); c.strokeStyle = '#d4a5ff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - size * .28, y - size * .26);
      for (let j = 0; j < 5; j++) c.lineTo(x + size * (j % 2 ? -.25 : .25), y - size * .2 + j * size * .1);
      c.lineTo(x + size * .28, y + size * .26); c.stroke();
    }
    const keys = [...new Set((level.gates || []).map(g => g.key))];
    for (const gate of level.gates || []) {
      const closed = !!paths[gate.key], col = color(gate.key), [x, y] = tile(gate.cell, col, closed ? 1 : .25);
      c.strokeStyle = col; c.lineWidth = size * .06;
      if (closed) for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * size * .2, y - size * .32); c.lineTo(x + i * size * .2, y + size * .32); c.stroke(); }
      c.fillStyle = '#143646'; c.fillRect(x - size * .15, y - size * .17, size * .3, size * .34);
      c.fillStyle = col; c.font = `900 ${size * .25}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String.fromCharCode(65 + keys.indexOf(gate.key)), x, y);
    }
    c.restore();
  }
  root.MFMechanicsRender = { draw };
})(typeof globalThis !== 'undefined' ? globalThis : this);
