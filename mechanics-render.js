(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16), channel = x => Math.round(amount < 0 ? x * (1 + amount) : x + (255 - x) * amount);
    return `rgb(${channel(n >> 16)},${channel(n >> 8 & 255)},${channel(n & 255)})`;
  }
  function round(c, x, y, w, h, radius, fill, stroke, width) {
    c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, radius); else c.rect(x, y, w, h);
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  // Same outlined cord, dark weave, and soft central highlight as the ropes.
  function cord(c, points, width, col, weave = true) {
    const path = () => { c.beginPath(); c.moveTo(...points[0]); for (const p of points.slice(1)) c.lineTo(...p); };
    c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);
    path(); c.strokeStyle = shade(col, -.55); c.lineWidth = width * 1.35; c.stroke();
    path(); c.strokeStyle = col; c.lineWidth = width; c.stroke();
    if (weave) {
      c.setLineDash([width * .2, width * .35]); c.lineCap = 'butt'; path();
      c.strokeStyle = shade(col, -.38); c.lineWidth = width * .9; c.globalAlpha = .6; c.stroke();
      c.setLineDash([]); c.lineCap = 'round'; c.globalAlpha = 1;
    }
    path(); c.strokeStyle = shade(col, .65); c.lineWidth = width * .22; c.globalAlpha = .4; c.stroke(); c.globalAlpha = 1;
  }
  function wood(c, x, y, w, h, size) {
    round(c, x, y + size * .035, w, h, size * .07, '#09151d');
    const gradient = c.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#e8bb75'); gradient.addColorStop(.4, '#bb8148'); gradient.addColorStop(1, '#87532f');
    round(c, x, y, w, h, size * .07, gradient, '#533b2b', size * .045);
    c.strokeStyle = '#f6d59c'; c.lineWidth = size * .018; c.globalAlpha = .5;
    c.beginPath(); c.moveTo(x + w * .3, y + h * .16); c.lineTo(x + w * .3, y + h * .82); c.stroke(); c.globalAlpha = 1;
  }
  function badge(c, x, y, size, col, letter, angle = 0) {
    c.save(); c.translate(x, y); c.rotate(angle);
    const r = size * .18;
    c.fillStyle = '#503b28'; c.beginPath(); c.arc(0, size * .025, r * 1.12, 0, TAU); c.fill();
    const gold = c.createLinearGradient(-r, -r, r, r); gold.addColorStop(0, '#fff1bc'); gold.addColorStop(.48, '#ddb867'); gold.addColorStop(1, '#a57337');
    c.fillStyle = gold; c.strokeStyle = '#72502e'; c.lineWidth = size * .025; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = shade(col, -.5); c.beginPath(); c.arc(0, 0, r * .72, 0, TAU); c.fill();
    c.fillStyle = '#fff3cc'; c.font = `900 ${size * .235}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, 0, size * .01);
    c.restore();
  }
  function draw(c, level, paths, X, Y, size, color, options = {}) {
    c.save();
    const place = cell => { c.save(); c.translate(X(cell % level.W), Y(Math.floor(cell / level.W))); };
    for (const mirror of level.mirrors || []) {
      place(mirror.cell); c.rotate(mirror.slope === '/' ? -Math.PI / 4 : Math.PI / 4);
      // A freestanding polished beam with equal edges: visibly two-sided, never a triangle.
      round(c, -size * .48, -size * .085 + size * .045, size * .96, size * .22, size * .08, '#0a1920');
      const silver = c.createLinearGradient(0, -size * .1, 0, size * .1);
      silver.addColorStop(0, '#5c989e'); silver.addColorStop(.2, '#b8e8e8'); silver.addColorStop(.45, '#f1ffff'); silver.addColorStop(.55, '#8fc9d0'); silver.addColorStop(1, '#3f7d88');
      round(c, -size * .47, -size * .1, size * .94, size * .2, size * .06, silver, '#2e5862', size * .035);
      c.strokeStyle = '#edffff'; c.lineWidth = size * .025; c.beginPath(); c.moveTo(-size * .32, -size * .055); c.lineTo(size * .32, -size * .055); c.stroke();
      for (const sign of [-1, 1]) {
        wood(c, sign * size * .43 - size * .075, -size * .14, size * .15, size * .28, size);
        cord(c, [[sign * size * .43, -size * .15], [sign * size * .43, size * .15]], size * .045, '#e8d291');
      }
      c.restore();
    }
    for (const cell of level.springs || []) {
      place(cell);
      const pressed = options.pressed && options.pressed.has(cell), squash = pressed ? .78 : 1;
      // Four padded contact faces around a visible, shaded steel coil.
      wood(c, -size * .34, -size * .34, size * .68, size * .68, size);
      round(c, -size * .255, -size * .27, size * .51, size * .54, size * .09, '#35434a', '#65462e', size * .025);
      for (let turn = 0; turn < 5; turn++) {
        const y = (-.19 + turn * .095) * size * squash;
        c.beginPath(); c.ellipse(0, y + size * .02, size * .18, size * .075 * squash, 0, 0, TAU);
        c.strokeStyle = '#152731'; c.lineWidth = size * .065; c.stroke();
        c.beginPath(); c.ellipse(0, y, size * .18, size * .075 * squash, 0, 0, TAU);
        c.strokeStyle = '#91b9c1'; c.lineWidth = size * .043; c.stroke();
        c.beginPath(); c.ellipse(0, y, size * .18, size * .075 * squash, 0, Math.PI, TAU);
        c.strokeStyle = '#e2f3ee'; c.lineWidth = size * .02; c.stroke();
      }
      for (let side = 0; side < 4; side++) {
        c.save(); c.rotate(side * Math.PI / 2);
        cord(c, [[-size * .19, -size * .32], [size * .19, -size * .32]], size * .1, pressed ? '#f8df9b' : '#d1af70'); c.restore();
      }
      c.restore();
    }
    const keys = [...new Set((level.gates || []).map(g => g.key))];
    for (const gate of level.gates || []) {
      place(gate.cell);
      const closed = !!paths[gate.key], col = color(gate.key);
      // Lashed posts and braided rope bars belong to the same world as the ropes.
      // Open gates retract to the posts, leaving the centre visibly unobstructed.
      for (const sign of [-1, 1]) wood(c, sign * size * .31 - size * .065, -size * .36, size * .13, size * .72, size);
      for (const row of [-.2, .2]) {
        if (closed) cord(c, [[-size * .32, row * size], [size * .32, row * size]], size * .095, col);
        else for (const sign of [-1, 1]) cord(c, [[sign * size * .33, (row - .07) * size], [sign * size * .28, (row + .07) * size]], size * .075, col);
      }
      if (closed) {
        cord(c, [[0, -size * .2], [0, size * .2]], size * .1, col);
        badge(c, 0, 0, size, col, String.fromCharCode(65 + keys.indexOf(gate.key)), options.angle || 0);
      }
      c.restore();
    }
    c.restore();
  }
  root.MFMechanicsRender = { draw, badge };
})(typeof globalThis !== 'undefined' ? globalThis : this);
