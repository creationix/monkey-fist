/* global MFGame, MFMoonBit */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=37', 'mechanics.js?v=31', 'hex/engine.js?v=12', 'hex/mechanics.js?v=1', 'grid-journey.js?v=10', 'game-engine.js?v=18', 'moonbit/web/generator.js?v=2');
// Boards come from the MoonBit generator, loaded only by workers that weave.
onmessage = async ({ data }) => {
  try { postMessage(data.type === 'features' ? { features: MFGame.reachableFeatures(data.level, data.paths, data.budget) } : data.type === 'guide' ? { solution: MFGame.guide(data.level, data.paths, data.budget, data.prefer) } : { level: await MFMoonBit.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
