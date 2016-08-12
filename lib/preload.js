/*
  This file helps make Electron behave more
  like Node.js by shimming certain features.
 */

(function () {
  var electron = require('electron');
  var serialize = require('serializerr');
  var browserGlobals = require('./browser-globals');
  var requireHook = require('./require-hook');
  var consoleHook = require('./console-hook');
  var timerHook = require('./timer-hook');
  var mockProcess = require('mock-stdin');
  var browserResolve = require('browser-resolve');
  var nodeResolve = require('resolve');
  var remote = electron.remote;

  var ipc = electron.ipcRenderer;
  var _process = remote.process;
  var cwd = _process.cwd();

  // get an absolute path to our entry point
  var globals = remote.getGlobal('__electronDevtoolGlobals');
  var entry = globals.entry;

  // setup setTimeout/etc to be more Node-like
  if (globals.nodeTimers !== false) {
    timerHook();
  }

  // setup process to be more like Node.js
  hookProcess();

  // if we should pipe DevTools console back to terminal
  if (globals.console) {
    consoleHook();
  }

  // in DevTools console (i.e. REPL), these will be
  // undefined to mimic Node REPL
  delete global.__dirname;
  delete global.__filename;

  // delete some browser globals
  if (globals.browserGlobals === false) {
    browserGlobals.forEach(function (key) {
      delete global[key];
    });
  }

  // When there is an uncaught exception in the entry
  // script, we may want to quit the devtool (i.e. for CI)
  // or just print an error in DevTools console (i.e. for dev)
  var shouldQuit = globals.quit;
  if (shouldQuit) {
    window.onerror = function (a, b, c, d, err) {
      fatalError(err);
      return true;
    };
  }

  // Enable service workers
  electron.webFrame.registerURLSchemeAsPrivileged('file');
  electron.webFrame.registerURLSchemeAsSecure('file');
  electron.webFrame.registerURLSchemeAsBypassingCSP('file');

  // hook into the internal require for a few features:
  //  - better error reporting on syntax errors and missing modules
  //  - require.main acts like node.js CLI
  //  - injecting debugger with --break
  //  - undefining window/document/self/navigator
  //  - adding source maps so the files show up in DevTools Sources
  requireHook({
    entry: entry,
    sourceMaps: globals.sourceMaps,
    debugBreak: globals.debugBreak,
    browserGlobals: globals.browserGlobals,
    browserField: globals.browserField,
    basedir: cwd
  });

  var firstRun = true;
  // boot up entry application when DOM is ready
  ipc.on('run-entry', function () {
    if (Array.isArray(globals.requirePaths)) {
      globals.requirePaths.forEach(doRequire);
    }
    if (entry) require(entry);
    if (firstRun) {
      // Tell the main thread to send along stdin
      firstRun = false;
      ipc.send('first-run');
    }
  });

  function doRequire (file) {
    var result;
    var resolveOpt = { basedir: cwd };
    if (globals.browserField) {
      result = browserResolve.sync(file, resolveOpt);
    } else {
      result = nodeResolve.sync(file, resolveOpt);
    }
    require(result);
  }

  function fatalError (err) {
    ipc.send('error', JSON.stringify(serialize(err)));
  }

  function hookProcess () {
    // setup renderer process to look a bit more like node
    process.chdir(cwd);
    process.argv = _process.argv.slice();
    process.exit = function (code) {
      _process.exit(code || 0);
    };

    // Remove the Electron argument to make it more
    // like Node.js argv handling. User can still
    // grab remote.process.argv for original.
    process.argv.shift();

    // if -- is passed, all options after it will be the
    // new user arguments
    var stopIdx = process.argv.indexOf('--');
    if (stopIdx >= 0) {
      var start = process.argv.slice(0, entry ? 2 : 1);
      process.argv = start.concat(process.argv.slice(stopIdx + 1));
    }

    // like node, ensure we use the full file path instead
    // of the relative path that the user specified in CLI
    if (entry) {
      process.argv[1] = entry;
    }

    // renderer streams should have same isTTY as main
    var isTTY = globals._processTTY;
    process.stdout.isTTY = isTTY.stdout;
    process.stderr.isTTY = isTTY.stderr;

    if (/^win/.test(process.platform)) {
      // clear the property first to avoid error from mockProcess
      Object.defineProperty(process, 'stdin', {
        value: undefined,
        configurable: true,
        writable: false
      });
      // now mock stdin
      mockProcess.stdin();
    } else {
      process.stdin._read = function () {
        this.push('');
      };
    }

    process.stdin.isTTY = isTTY.stdin;

    // send along any stdin
    ipc.on('stdin', function (event, data) {
      process.stdin.push(data);
    });
  }
})();
