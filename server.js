var path = require('path');
var fs = require('fs');
var assign = require('object-assign');
var createWatch = require('./lib/file-watch');

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var ipc = electron.ipcMain;

var argv = require('minimist')(process.argv.slice(2), {
  '--': true,
  boolean: [
    'console', 'quit', 'poll', 'show', 'headless',
    'browser-field', 'version'
  ],
  string: [ 'index' ],
  alias: {
    timeout: 't',
    headless: 'h',
    'browser-field': [ 'bf', 'browserField' ],
    watch: 'w',
    quit: 'q',
    version: 'v',
    console: 'c',
    index: 'i',
    poll: 'p',
    show: 's'
  }
});

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

  // We can't just use show: false apparently.
  // Instead we show a zero-size window and
  // hide it once the detached DevTools are opened.
  // https://github.com/Jam3/devtool/issues/2
  var emptyWindow = { width: 0, height: 0, x: 0, y: 0 };
  var bounds = argv.show ? undefined : emptyWindow;
  var opts = assign({
    webPreferences: {
      preload: path.join(__dirname, 'lib', 'preload.js'),
      nodeIntegration: true,
      webSecurity: false
    }
  }, bounds);
  mainWindow = new BrowserWindow(opts);

  if (typeof argv.timeout === 'number') {
    setTimeout(function () {
      mainWindow.close();
    }, argv.timeout);
  }

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
      mainWindow.reload();
    });
  }

  ipc.on('error', function (event, errObj) {
    var err = JSON.parse(errObj);
    bail(err.stack);
  });

  var webContents = mainWindow.webContents;
  webContents.on('dom-ready', function () {
    webContents.send('dom-ready');
  });

  webContents.once('did-finish-load', function () {
    global.__electronQuitOnError = argv.quit;
    if (!argv.headless) {
      webContents.once('devtools-opened', function () {
        // We will hide the main window frame, especially
        // useful for windows users.
        if (!argv.show) mainWindow.hide();
        // TODO: More work needs to be done for LiveEdit.
        // if (entryFile) {
        //   webContents.removeWorkSpace(cwd);
        //   webContents.addWorkSpace(cwd);
        // }
        sendStdin();
      });
      webContents.openDevTools({ detach: true });
    } else {
      // TODO: Find out why this timeout is necessary.
      // stdin is not triggering if sent immediately
      setTimeout(function () {
        sendStdin();
      }, 500);
    }
  });

  mainWindow.loadURL(mainIndexURL);
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  function sendStdin () {
    process.stdin
      .on('data', function (data) {
        mainWindow.send('stdin', data);
      })
      .on('end', function () {
        mainWindow.send('stdin', null);
      })
      .resume();
  }

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
