/* global MFGame */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=35', 'mechanics.js?v=31', 'twist-circuits.js?v=39', 'hex/engine.js?v=11', 'hex/mirrors.js?v=9', 'dependency-metrics.js?v=1', 'grid-generator.js?v=6', 'grid-journey.js?v=8', 'game-engine.js?v=16');
onmessage = ({ data }) => {
  try { postMessage(data.type === 'features' ? { features: MFGame.reachableFeatures(data.level, data.paths, data.budget) } : data.type === 'guide' ? { solution: MFGame.guide(data.level, data.paths, data.budget, data.prefer) } : { level: MFGame.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
