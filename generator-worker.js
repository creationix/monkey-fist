/* global MFGame, MFMoonBit */
'use strict';
importScripts('random.js?v=1', 'levels.js?v=38', 'mechanics.js?v=31', 'hex/engine.js?v=13', 'hex/mechanics.js?v=2', 'grid-journey.js?v=10', 'game-engine.js?v=19', 'moonbit/web/generator.js?v=3');
// Boards, hints and feature checks all come from MoonBit, loaded once per worker.
onmessage = async ({ data }) => {
  try {
    const m = await MFMoonBit.ready();
    postMessage(data.type === 'features' ? { features: m.reachableFeatures(data.level, data.paths, data.budget) } : data.type === 'guide' ? { solution: m.guide(data.level, data.paths, data.budget, data.prefer) } : { level: m.generate(data) });
  } catch (error) { postMessage({ error: error.message }); }
};
