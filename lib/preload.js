(function () {
  var electron = require('electron');
  var path = require('path');
  var serialize = require('serializerr');
  var remote = electron.remote;
  var requireHook = require('./require-hook');

  var ipc = electron.ipcRenderer;
  var _process = remote.process;
  var cwd = _process.cwd();

  // get an absolute path to our entry point
  var entry = remote.getGlobal('__electronEntryFile');
  if (entry) {
    entry = path.isAbsolute(entry) ? entry : path.resolve(cwd, entry);
  }

  // setup process to be more like Node.js
  hookProcess();

  // if we should pipe DevTools console back to terminal
  if (remote.getGlobal('__electronConsoleHook')) {
    require('console-redirect/process');
  }

  // in DevTools console (i.e. REPL), these will be
  // undefined to mimic Node REPL
  delete global.__dirname;
  delete global.__filename;

  // When there is an uncaught exception in the entry
  // script, we may want to quit the devtool (i.e. for CI)
  // or just print an error in DevTools console (i.e. for dev)
  var shouldQuit = remote.getGlobal('__electronQuitOnError');
  if (shouldQuit) {
    window.onerror = function (a, b, c, d, err) {
      fatalError(err);
      return true;
    };
  }

  // hook into the internal require for a few features:
  //  - better error reporting on syntax errors and missing modules
  //  - require.main acts like node.js CLI
  //  - add source maps so the files show up in DevTools Sources
  requireHook({
    entry: entry,
    basedir: cwd,
    browserField: remote.getGlobal('__electronBrowserResolve')
  }, function (err) {
    if (err && shouldQuit) {
      fatalError(err);
    }
  });

  // boot up entry application when DOM is ready
  ipc.on('dom-ready', function () {
    if (entry) require(entry);
  });

  function fatalError (err) {
    ipc.send('error', JSON.stringify(serialize(err)));
  }

  function hookProcess () {
    // setup renderer process to look a bit more like node
    process.chdir(cwd);
    process.argv = _process.argv.slice();
    process.exit = _process.exit.bind(_process);

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

    var isTTY = remote.getGlobal('__electronProcessTTY');
    process.stdin.isTTY = isTTY.stdin;
    process.stdout.isTTY = isTTY.stdout;
    process.stderr.isTTY = isTTY.stderr;
    process.stdin._read = function () {
      this.push('');
    };

    ipc.on('stdin', function (event, data) {
      process.stdin.push(data);
    });
  }
})();
