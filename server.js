var path = require('path');
var fs = require('fs');
var createWatch = require('./lib/file-watch');

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var ipc = electron.ipcMain;

var argv = require('minimist')(process.argv.slice(2), {
  '--': true,
  boolean: [
    'console', 'quit', 'poll', 'show', 'headless',
    'browser-field'
  ],
  string: [ 'index' ],
  alias: {
    headless: 'h',
    'browser-field': [ 'bf', 'browserField' ],
    watch: 'w',
    quit: 'q',
    console: 'c',
    index: 'i',
    poll: 'p',
    show: 's'
  }
});

app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('v', 0);
app.commandLine.appendSwitch('vmodule', 'console=0');

process.stdin.pause();
global.__electronQuitOnError = true; // true until app starts
global.__electronEntryFile = argv._[0];
global.__electronConsoleHook = argv.console;
global.__electronBrowserResolve = argv.browserField;
global.__electronProcessTTY = {
  stdin: process.stdin.isTTY,
  stdout: process.stdout.isTTY,
  stderr: process.stderr.isTTY
};

var exitWithCode1 = false;
process.on('uncaughtException', function (err) {
  console.error(err);
  if (global.__electronQuitOnError) {
    exitWithCode1 = true;
    app.quit();
  }
});

var cwd = process.cwd();
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
  // bail on invalid input
  if (global.__electronEntryFile) {
    var filename = global.__electronEntryFile;
    if (!path.extname(filename)) {
      filename += '.js'; // TODO: should support full require.resolve
    }
    fs.stat(filename, function (err, stat) {
      if (err) return fatal(err);
      if (!stat.isFile()) return fatal('Given entry is not a file! Usage:\n  devtool index.js');
    });
  }

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

  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'lib', 'preload.js'),
      nodeIntegration: true
    },
    show: argv.show
  });

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
      webContents.openDevTools();
      webContents.once('devtools-opened', sendStdin);
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
