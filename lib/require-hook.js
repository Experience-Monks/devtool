module.exports = function requireHook (opts) {
  opts = opts || {};

  var path = require('path');
  var remote = require('electron').remote;
  var Module = require('module');
  var syntaxError = require('syntax-error');
  var fs = remote.require('fs');
  var stripBOM = require('strip-bom');
  var combineSourceMap = require('combine-source-map');
  var convertSourceMap = require('convert-source-map');
  var browserResolve = require('browser-resolve');

  var entry = opts.entry;
  var basedir = opts.basedir || remote.process.cwd();
  var useSourceMaps = opts.sourceMaps !== false;

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
    // Setup source maps and inject a hidden debugger statement
    var original = script;
    if (opts.debugBreak && currentWrapFile === entry) {
      var debugExpr = 'debugger;';
      script = debugExpr + script;
    }

    // bail early if we don't have a path
    if (!currentWrapFile || !useSourceMaps) return moduleWrap(script);

    var sourceFile = path.relative(basedir, currentWrapFile).replace(/\\/g, '/');
    var sourceFileName = path.basename(sourceFile);
    var sourceFileDir = path.dirname(sourceFile);
    var hasComment = convertSourceMap.commentRegex.test(script);
    var hasMapFile = convertSourceMap.mapFileCommentRegex.test(script);

    // if we have a map pointing to a file, inline it as base64
    if (!hasComment && hasMapFile) {
      try {
        var sm = convertSourceMap.fromMapFileSource(original, sourceFileDir);
        script = [
          combineSourceMap.removeComments(script),
          convertSourceMap.fromObject(sm.sourcemap).toComment()
        ].join('\n');
        hasComment = true; // now we have base64 comment
      } catch (err) {
        // Don't attempt to handle source maps for this file,
        // it is most likely a comment about source maps and not
        // a *real* source map comment!
      }
    }

    var wrapScript = moduleWrap(script);

    // do not make any more alterations to the source maps
    if (hasComment || hasMapFile) return wrapScript;

    // Otherwise, if no source maps exist, we can generate a new one
    var sourceMap = combineSourceMap.create(sourceFileName, basedir)
        .addFile({ sourceFile: sourceFile, source: original });
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
