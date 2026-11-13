/* global MFGame */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=37', 'mechanics.js?v=31', 'hex/engine.js?v=12', 'hex/mechanics.js?v=1', 'dependency-metrics.js?v=1', 'grid-generator.js?v=7', 'grid-journey.js?v=10', 'game-engine.js?v=17');
onmessage = ({ data }) => {
  try { postMessage(data.type === 'features' ? { features: MFGame.reachableFeatures(data.level, data.paths, data.budget) } : data.type === 'guide' ? { solution: MFGame.guide(data.level, data.paths, data.budget, data.prefer) } : { level: MFGame.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
