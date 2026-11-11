// Canonical seeded-set identities and non-destructive migration from the old two-screen UI.
(function (root) {
  'use strict';
  const L = typeof module !== 'undefined' && module.exports ? require('./levels.js') : MFLevels;
  const DEFAULT_SEED = 'MONKEYFIST';
  const defaults = slide => ({ mode: 'C', count: 60, big: false, slide: !!slide, seed: DEFAULT_SEED });
  function normalize(opts) {
    if (opts.mode === 'T') return { mode: 'T', count: [...L.SET_COUNTS, 12].includes(opts.count) ? opts.count : 20,
      big: !!opts.big, slide: true, seed: L.cleanSeed(opts.seed) || DEFAULT_SEED };
    return { mode: L.SET_MODES.includes(opts.mode) ? opts.mode : 'C', count: L.SET_COUNTS.includes(opts.count) ? opts.count : 60,
      big: !!opts.big, slide: !!opts.slide, seed: L.cleanSeed(opts.seed) || DEFAULT_SEED };
  }
  const code = opts => L.encodeCode(normalize(opts));
  function options(id) {
    if (id === 'campaign' || id === 'slide') return defaults(id === 'slide');
    return L.parseCode(id);
  }
  function migrate(save) {
    save.sets = save.sets || {};
    // The former curated Twists stars do not describe the new procedural boards.
    // Archive only those results, leaving every other style's progress untouched.
    if (save.twistsGen !== 1) {
      for (const code of Object.keys(save.sets)) if ((L.parseCode(code) || {}).mode === 'T') {
        save.twistsArchive = save.twistsArchive || {};
        save.twistsArchive[code] = save.sets[code]; delete save.sets[code];
      }
      save.twistsGen = 1;
    }
    for (const legacy of ['campaign', 'slide']) {
      const old = save.sets[legacy]; if (!old) continue;
      const id = code(options(legacy)), target = save.sets[id] || { max: 1, stars: {} };
      target.max = Math.max(target.max || 1, old.max || 1);
      target.stars = target.stars || {};
      for (const [level, stars] of Object.entries(old.stars || {})) target.stars[level] = Math.max(target.stars[level] || 0, stars);
      for (const [level, time] of Object.entries(old.times || {})) {
        target.times = target.times || {};
        target.times[level] = Math.min(target.times[level] || Infinity, time);
      }
      save.sets[id] = target;
      delete save.sets[legacy]; // Migrate once; a later explicit reset must not resurrect the old alias.
    }
    if (!save.setUI) {
      // The previous Custom screen held draft options, not the set selected by the Play button.
      // Preserve that draft as a recent set while continuing the existing default campaign.
      if (save.custom && L.SET_MODES.includes(save.custom.mode)) {
        const previous = code(save.custom);
        save.recent = [previous, ...(save.recent || []).filter(k => k !== previous)].slice(0, 6);
      }
      save.custom = defaults(save.slide !== false && !save.kid); save.setUI = 1;
    }
    save.custom = normalize(save.custom || defaults(true));
    save.recent = (save.recent || []).filter(id => !!options(id)).slice(0, 6);
    return save;
  }
  const api = { DEFAULT_SEED, defaults, normalize, code, options, migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFSets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
