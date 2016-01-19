var path = require('path');
var noop = function () {};

module.exports = function requireHook (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  opts = opts || {};
  cb = cb || noop;

  var remote = require('electron').remote;
  var Module = require('module');
  var syntaxError = require('syntax-error');
  var fs = remote.require('fs');
  var stripBOM = require('strip-bom');
  var combineSourceMap = require('combine-source-map');
  var entry = opts.entry;
  // var basedir = opts.basedir || remote.process.cwd();

  var hasSetMain = false;
  var currentWrapFile = null;

  require.extensions['.js'] = function devtoolCompileModule (module, file) {
    // set the main module so that Node.js scripts run correctly
    if (!hasSetMain && entry && file === entry) {
      hasSetMain = true;
      process.mainModule = module;
    }

    var code = fs.readFileSync(file, 'utf8');
    try {
      currentWrapFile = file;
      module._compile(stripBOM(code), file);
      cb(null);
    } catch (err) {
      // improve Electron's error handling (i.e. SyntaxError)
      var realErr = syntaxError(code, file) || err;
      var msg = 'Error compiling module: ' + file + '\n' + (realErr.annotated || realErr.message);
      console.error(msg);
      cb(new Error(msg));
    }
  };

  // Include source maps for required modules
  var wrap = Module.wrap;
  Module.wrap = function (script) {
    var wrapScript = wrap.call(wrap, script);
    if (!currentWrapFile) return wrapScript;
    var baseFileDir = path.dirname(entry);
    // TODO: Use path.dirname(entry) or opts.basedir ?
    var sourceFile = path.relative(baseFileDir, currentWrapFile)
      .replace(/\\/g, '/');
    var sourceMap = combineSourceMap.create().addFile(
        { sourceFile: sourceFile, source: script },
        { line: 0 });
    return [
      combineSourceMap.removeComments(wrapScript),
      sourceMap.comment()
    ].join('\n');
  };
};
