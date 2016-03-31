module.exports = function requireHook (opts) {
  opts = opts || {};

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
    } catch (err) {
      // Try to improve error messages for better UX.
      var realErr = syntaxError(code, file);
      if (realErr && realErr.annotated) {
        // We found a nice error message for the user.
        err.message = realErr.annotated;
      } else {
        // Did not get a nice error. Let's improve it by
        // adding the file.
        // We might get here e.g. if using ES6 features not
        // supported in V8/Node.
        err.message = '\n' + file + '\n' + err.message;
      }

      // And throw the original so Chrome debugger
      // can stop on it. When --quit is passed, this
      // will trigger window.onerror.
      throw err;
    }
  };

  // Include source maps for required modules
  var wrap = Module.wrap;
  Module.wrap = function devtoolWrapModule (script) {
    // If no options that require it, don't modify script contents
    if (!opts.debugBreak && opts.browserGlobals) return wrap.call(Module, script)

    // Setup source maps and inject a hidden debugger statement
    var original = script;
    if (opts.debugBreak && currentWrapFile === entry) {
      var debugExpr = 'debugger;';
      script = debugExpr + script;
    }

    var wrapScript = moduleWrap(script);
    if (!currentWrapFile) return wrapScript;
    var sourceFile = path.relative(basedir, currentWrapFile)
      .replace(/\\/g, '/');
    var sourceRoot = basedir;
    var sourceMap = combineSourceMap.create(undefined, sourceRoot).addFile(
        { sourceFile: sourceFile, source: original });
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
        '\n});';
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
