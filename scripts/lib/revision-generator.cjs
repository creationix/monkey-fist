// Load a generator and all of its relative dependencies from one Git commit.
// The VM isolates module globals; repository code is still trusted code.
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { isBuiltin } = require('node:module');

function loadGenerator(revision, { cwd = path.resolve(__dirname, '../..') } = {}) {
  if (typeof revision !== 'string' || !revision.trim()) throw Error('A generator Git revision is required');
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  let ref;
  try { ref = git(['rev-parse', '--verify', '--end-of-options', revision + '^{commit}']).trim(); }
  catch { throw Error('Cannot resolve generator Git revision ' + JSON.stringify(revision) + ' in ' + cwd); }
  const modules = new Map(), context = vm.createContext({});

  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    let source;
    try { source = git(['show', ref + ':' + filename]); }
    catch { throw Error('Cannot load generator dependency ' + filename + ' at ' + ref); }
    const module = { exports: {} }; modules.set(filename, module);
    try {
      if (filename.endsWith('.json')) module.exports = JSON.parse(source);
      else {
        const localRequire = specifier => {
          if (isBuiltin(specifier)) return require(specifier);
          if (!specifier.startsWith('./') && !specifier.startsWith('../')) throw Error('Unsupported generator dependency ' + JSON.stringify(specifier));
          let target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
          if (target === '..' || target.startsWith('../') || path.posix.isAbsolute(target)) throw Error('Generator dependency leaves the repository: ' + specifier);
          if (!path.posix.extname(target)) target += '.js';
          if (!/\.(?:js|cjs|json)$/.test(target)) throw Error('Unsupported generator dependency file ' + target);
          return load(target);
        };
        const script = new vm.Script('(function(require,module,exports,__filename,__dirname){\n' + source + '\n})', { filename: ref + ':' + filename });
        script.runInContext(context)(localRequire, module, module.exports, filename, path.posix.dirname(filename));
      }
      return module.exports;
    } catch (error) { modules.delete(filename); throw error; }
  }

  const engine = load('game-engine.js');
  if (typeof engine.generate !== 'function' || typeof engine.spec !== 'function' || !engine.DEFAULT) throw Error('Revision ' + ref + ' does not expose a compatible game generator');
  // Copy plain board/settings data out of the VM so consumers get ordinary
  // objects, without mixing historical caches into the live engine's modules.
  const plain = value => JSON.parse(JSON.stringify(value));
  return { ref, engine, DEFAULT: plain(engine.DEFAULT),
    generate: options => plain(engine.generate(options)),
    spec: (options, index) => plain(engine.spec(options, index)) };
}

module.exports = { loadGenerator };
