/* global MFHex */
'use strict';
importScripts('engine.js?v=3');
onmessage = ({ data }) => {
  try { postMessage({ level: MFHex.generate(data) }); }
  catch (error) { postMessage({ error: error.message }); }
};
