var path = require('path');
var fs = require('fs');
var createWatch = require('./lib/file-watch');
var createMainWindow = require('./lib/main-window');

var electron = require('electron');
var app = electron.app;
var ipc = electron.ipcMain;

var argv = require('./lib/parse-args')(process.argv.slice(2));

if (argv.version || argv.v) {
  console.log(require('./package.json').version);
  process.exit(0);
}

app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('v', 0);
app.commandLine.appendSwitch('vmodule', 'console=0');

var exitWithCode1 = false;
global.__electronQuitOnError = true; // true until app starts
process.removeAllListeners('uncaughtException');
process.on('uncaughtException', onUnhandledError);
process.on('unhandledRejection', onUnhandledError);

function onUnhandledError (err) {
  console.error(err.stack ? err.stack : err);
  if (global.__electronQuitOnError) {
    exitWithCode1 = true;
    app.quit();
  }
}

// determine absolute path to entry file
var cwd = process.cwd();
var entryFile = argv._[0];
if (entryFile) {
  entryFile = path.isAbsolute(entryFile) ? entryFile : path.resolve(cwd, entryFile);
  try {
    entryFile = require.resolve(entryFile);
  } catch (e) {
    onUnhandledError(e);
  }
}

// We use this to communicate with the preload.js script
// There may be a cleaner way that does not pollute globals.
process.stdin.pause();
global.__electronEntryFile = entryFile;
global.__electronConsoleHook = argv.console;
global.__electronBrowserResolve = argv.browserField;
global.__electronProcessTTY = {
  stdin: process.stdin.isTTY,
  stdout: process.stdout.isTTY,
  stderr: process.stderr.isTTY
};

// Get starting HTML file
var htmlFile = path.resolve(__dirname, 'lib', 'index.html');
var customHtml = false; // if we should watch it as well
if (argv.index) {
  customHtml = true;
  htmlFile = path.isAbsolute(argv.index) ? argv.index : path.resolve(cwd, argv.index);
}
var htmlData = fs.readFileSync(htmlFile);

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
  var mainIndexURL = 'file://' + __dirname + '/index.html';

  // Replace index.html with custom one
  electron.protocol.interceptBufferProtocol('file', function (request, callback) {
    // We can't just spin up a local server for this, see here:
    // https://github.com/atom/electron/issues/2414
    if (request.url === mainIndexURL) {
      callback({
        data: htmlData,
        mimeType: 'text/html'
      });
    } else {
      callback(request);
    }
  }, function (err) {
    if (err) fatal(err);
  });

  // Setup the BrowserWindow
  mainWindow = createMainWindow(mainIndexURL, argv, function () {
    global.__electronQuitOnError = argv.quit;
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
    if (global.__electronQuitOnError) {
      exitWithCode1 = true;
      if (mainWindow) mainWindow.close();
    }
  }

  function fatal (err) {
    global.__electronQuitOnError = true;
    bail(err);
  }
});
