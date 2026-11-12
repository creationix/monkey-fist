/* global MFHex */
'use strict';
importScripts('../random.js?v=1', 'engine.js?v=4');
onmessage = ({ data }) => {
  try { postMessage({ level: MFHex.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
