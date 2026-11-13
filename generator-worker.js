/* global MFGame */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=31', 'mechanics.js?v=30', 'twist-circuits.js?v=32', 'twists.js?v=32', 'hex/engine.js?v=5', 'hex/mirrors.js?v=2', 'game-engine.js?v=2');
onmessage = ({ data }) => {
  try { postMessage(data.type === 'guide' ? { solution: MFGame.guide(data.level, data.paths, data.budget, data.prefer) } : { level: MFGame.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
