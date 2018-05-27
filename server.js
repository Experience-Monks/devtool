var path = require('path');
var fs = require('fs');
var createWatch = require('./lib/file-watch');
var createMainWindow = require('./lib/main-window');
var parseArgs = require('./lib/parse-args');
var mime = require('mime');

var electron = require('electron');
var app = electron.app;
var ipc = electron.ipcMain;
var globals;

var exitWithCode1 = false;
process.removeAllListeners('uncaughtException');
process.stdin.pause();

var argv = parseArgs(process.argv.slice(2));
globals = argv.globals;

app.commandLine.appendSwitch('disable-http-cache');
if (!argv.verbose) {
  app.commandLine.appendSwitch('v', '-1');
  app.commandLine.appendSwitch('vmodule', 'console=0');
}

if (argv.version || argv.v) {
  console.log('devtool ' + require('./package.json').version);
  console.log('electron ' + process.versions.electron);
  console.log('node ' + process.versions.node);
  console.log('chrome ' + process.versions.chrome);
  process.exit(0);
}

// inject V8 flags
if (argv.config && argv.config.v8) {
  var flags = []
      .concat(argv.config.v8.flags)
      .filter(Boolean);
  flags.forEach(function (flag) {
    app.commandLine.appendSwitch('js-flags', flag);
  });
}

// determine absolute path to entry file
var cwd = process.cwd();
var entryFile = argv._[0];
if (entryFile) {
  entryFile = path.isAbsolute(entryFile) ? entryFile : path.resolve(cwd, entryFile);
  try {
    entryFile = require.resolve(entryFile);
    globals.entry = entryFile; // setup entry for preload
  } catch (err) {
    console.error(err.stack ? err.stack : err);
    process.exit(1);
  }
}

var watcher = null;
var mainWindow = null;
app.on('window-all-closed', function () {
  app.quit();
});

// Quit the server with the correct exit code
app.on('quit', function () {
  if (watcher) watcher.close();
  if (exitWithCode1) process.exit(1);
});

app.on('ready', function () {
  electron.protocol.registerServiceWorkerSchemes(['file:']);

  // Get starting HTML file
  var htmlFile = path.resolve(__dirname, 'lib', 'index.html');
  var customHtml = false; // if we should watch it as well
  if (argv.index) {
    customHtml = true;
    htmlFile = path.isAbsolute(argv.index) ? argv.index : path.resolve(cwd, argv.index);
  }

  var mainIndexURL = 'file://' + __dirname + '/index.html';

  // Replace index.html with custom one
  electron.protocol.interceptBufferProtocol('file', function (request, callback) {
    // We can't just spin up a local server for this, see here:
    // https://github.com/atom/electron/issues/2414

    var file = request.url;
    if (file === mainIndexURL) {
      file = htmlFile;
    } else if (file.indexOf('file://') === 0) {
      // All other assets should be relative to the user's cwd
      file = file.substring(7);
      file = path.resolve(cwd, path.relative(__dirname, file));
    }

    fs.readFile(file, function (err, data) {
      // Could convert Node error codes to Chromium for better reporting
      if (err) return callback(-6);
      callback({
        data: data,
        mimeType: mime.lookup(file)
      });
    });
  }, function (err) {
    if (err) fatal(err);
  });

  // Setup the BrowserWindow
  mainWindow = createMainWindow(entryFile, mainIndexURL, argv, function () {
    // When we first launch, ensure the quit flag is set to the user args
    globals.quit = argv.quit;

    // Focus the devtools.
    app.focus();
  });

  // De-reference for GC
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Setup the file watcher
  if (argv.watch) {
    var globs = [].concat(argv.watch).filter(function (f) {
      return typeof f === 'string';
    });
    if (globs.length === 0) globs = [ '**/*.{js,json}' ];
    if (customHtml && globs.indexOf(htmlFile) === -1) {
      // also watch the specified --index HTML file
      globs.push(htmlFile);
    }
    watcher = createWatch(globs, argv);
    watcher.on('change', function (file) {
      if (mainWindow) mainWindow.reload();
    });
  }

  // Fatal error in renderer
  ipc.on('error', function (event, errObj) {
    var err = JSON.parse(errObj);
    bail(err.stack);
  });

  function bail (err) {
    console.error(err.stack ? err.stack : err);
    if (globals.quit) {
      exitWithCode1 = true;
      if (mainWindow) mainWindow.close();
    }
  }

  function fatal (err) {
    globals.quit = true;
    bail(err);
  }
});
