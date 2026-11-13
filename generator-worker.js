/* global MFGame */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=33', 'mechanics.js?v=31', 'twist-circuits.js?v=37', 'twists.js?v=32', 'hex/engine.js?v=8', 'hex/mirrors.js?v=7', 'difficulty.js?v=1', 'journey.js?v=1', 'grid-generator.js?v=1', 'grid-journey.js?v=1', 'game-engine.js?v=9');
onmessage = ({ data }) => {
  try { postMessage(data.type === 'features' ? { features: MFGame.reachableFeatures(data.level, data.paths, data.budget) } : data.type === 'guide' ? { solution: MFGame.guide(data.level, data.paths, data.budget, data.prefer) } : { level: MFGame.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
