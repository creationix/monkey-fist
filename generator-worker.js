/* global MFGame */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=31', 'mechanics.js?v=31', 'twist-circuits.js?v=34', 'twists.js?v=32', 'hex/engine.js?v=5', 'hex/mirrors.js?v=4', 'game-engine.js?v=4');
onmessage = ({ data }) => {
  try { postMessage(data.type === 'guide' ? { solution: MFGame.guide(data.level, data.paths, data.budget, data.prefer) } : { level: MFGame.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
