var noop = function () {};

module.exports = function requireHook (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  opts = opts || {};
  cb = cb || noop;

  var path = require('path');
  var remote = require('electron').remote;
  var Module = require('module');
  var syntaxError = require('syntax-error');
  var fs = remote.require('fs');
  var stripBOM = require('strip-bom');
  var combineSourceMap = require('combine-source-map');
  var browserResolve = require('browser-resolve');

  var entry = opts.entry;
  var basedir = opts.basedir || remote.process.cwd();

  var hasSetMain = false;
  var currentWrapFile = null;

  require.extensions['.js'] = function devtoolCompileModule (module, file) {
    // set the main module so that Node.js scripts run correctly
    if (!hasSetMain && entry && file === entry) {
      hasSetMain = true;
      module.parent = null; // pretend like we have no parent for this
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
      console.warn('Error compiling module: ' + file + '\n' + (realErr.annotated || realErr.message));
      console.error(err.stack);
      cb(err);
    }
  };

  // Include source maps for required modules
  var wrap = Module.wrap;
  Module.wrap = function devtoolWrapModule (script) {
    // Setup source maps and inject a hidden debugger statement
    var original = script;
    var columnOffset = 0;
    if (opts.debugBreak && currentWrapFile === entry) {
      var debugExpr = 'debugger;';
      script = debugExpr + script;
      columnOffset = debugExpr.length;
    }

    var wrapScript = moduleWrap(script);
    if (!currentWrapFile) return wrapScript;
    var sourceFile = path.relative(basedir, currentWrapFile)
      .replace(/\\/g, '/');
    var sourceRoot = basedir;
    var sourceMap = combineSourceMap.create(undefined, sourceRoot).addFile(
        { sourceFile: sourceFile, source: original },
        { line: 0, column: columnOffset });
    return [
      combineSourceMap.removeComments(wrapScript),
      sourceMap.comment()
    ].join('\n');
  };

  function moduleWrap (script) {
    if (opts.browserGlobals) {
      // Use native module wrapper
      return wrap.call(Module, script);
    } else {
      // Use custom module wrapper that undefines window/document
      return '(function (exports, require, module, __filename, __dirname, process, global, window, navigator, document, self) { ' +
        script +
        ' });';
    }
  }

  // Use browser field resolution for require statements
  if (opts.browserField) {
    var nativeResolve = Module._resolveFilename;
    Module._resolveFilename = function devtoolResolveFilename (filename, parent) {
      try {
        // Try to use a browser resolver first...
        return browserResolve.sync(filename, {
          filename: parent.filename,
          paths: parent.paths
        });
      } catch (e) {
        // Otherwise fall back to native; e.g. for Electron requires
        return nativeResolve.call(Module, filename, parent);
      }
    };
  }
};
