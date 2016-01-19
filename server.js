var path = require('path');
var fs = require('fs');
var createWatch = require('./lib/file-watch');

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var ipc = electron.ipcMain;

var argv = require('minimist')(process.argv.slice(2), {
  boolean: [ 'console', 'quit', 'poll', 'show' ],
  string: [ 'index' ],
  alias: {
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

global.__shouldElectronQuitOnError = true; // true until app starts
global.__electronEntryFile = argv._[0];
global.__electronConsoleHook = argv.console;
if (!global.__electronEntryFile) {
  console.error('No entry file specified! Usage:\n  devtool index.js');
  process.exit(1);
}

var exitWithCode1 = false;
process.on('uncaughtException', function (err) {
  console.error(err);
  if (global.__shouldElectronQuitOnError) {
    exitWithCode1 = true;
    app.quit();
  }
});

var cwd = process.cwd();
var htmlFile = path.resolve(__dirname, 'lib', 'index.html');
if (argv.index) {
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
  fs.stat(global.__electronEntryFile, function (err, stat) {
    if (err) return fatal(err);
    if (!stat.isFile()) return fatal('Given entry is not a file! Usage:\n  devtool index.js');
  });

  var mainIndexURL = 'file://' + __dirname + '/index.html';
  electron.protocol.interceptBufferProtocol('file', function (request, callback) {
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
  webContents.once('did-finish-load', function () {
    global.__shouldElectronQuitOnError = argv.quit;
    mainWindow.openDevTools();
  });

  mainWindow.loadURL(mainIndexURL);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  function bail (err) {
    console.error(err.stack ? err.stack : err);
    if (global.__shouldElectronQuitOnError) {
      exitWithCode1 = true;
      if (mainWindow) mainWindow.close();
    }
  }

  function fatal (err) {
    global.__shouldElectronQuitOnError = true;
    bail(err);
  }
});
