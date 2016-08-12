var assign = require('object-assign');
var path = require('path');
var deepExtend = require('deep-extend');

var electron = require('electron');
var ipc = electron.ipcMain;
var BrowserWindow = electron.BrowserWindow;

var concat = require('concat-stream');

module.exports = createMainWindow;
function createMainWindow (entry, url, argv, onReady) {
  argv = argv || {};

  // On OSX, when detaching devtool you get a browser window.
  // We will have to hide it manually and set its bounds to zero.
  // On Windows, we can use argv.show to hide. More discussion:
  // https://github.com/Jam3/devtool/issues/2
  var emptyWindow = {
    useContentSize: true,
    width: 0,
    height: 0,
    x: 0,
    y: 0
  };
  var bounds = argv.show ? undefined : emptyWindow;
  var opts = assign({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      webSecurity: false // To avoid errors on Windows
    },
    show: argv.show
  }, bounds);

  // Deep merge in config.browserWindow options
  var config = argv.config;
  if (config.browserWindow) {
    opts = deepExtend(opts, config.browserWindow);
  }

  // boot up any desired extensions
  var extNames = [];
  var exts = [].concat(config.devToolsExtensions).filter(Boolean);
  exts.forEach(function (ext) {
    var result = BrowserWindow.addDevToolsExtension(ext);
    if (result) extNames.push(result);
  });
  electron.app.on('will-quit', clearExtensions);

  var mainWindow = new BrowserWindow(opts);
  var closed = false;
  mainWindow.on('closed', function () {
    // Stop writing stdin to ipc when closed
    closed = true;
  });

  // On first load, we trigger the app execution
  var webContents = mainWindow.webContents;

  // Send along stdin after first run
  ipc.once('first-run', onFirstRun);

  if (argv.headless) {
    // Run without any debugger/DevTools
    run();
  } else {
    // Run with a DevTools window and debugger instance
    webContents.once('devtools-opened', function () {
      // Hide the main window frame so windows
      // users aren't seeing a tiny frame.
      if (!argv.show) {
        mainWindow.hide();

        // If only devtools are shown and now window
        // quit app when devtools is closed.
        // Used setImmediate because the event was thrown before devtools opened
        // and process.nextTick didn't work
        setImmediate(function () {
          webContents.once('devtools-closed', function () {
            // Weird timeout is necessary for election@1.3.3 to
            // avoid errors on OSX from Cmd+W
            setTimeout(() => mainWindow.close(), 50);
          });
        });
      }

      // Run app
      run();
    });

    // Launch debugger
    var detach = config.detachDevTools !== false;
    webContents.openDevTools({ detach: detach });
  }

  return mainWindow;

  function clearExtensions () {
    // TODO: This is currently not clearing
    // extensions from cache due to a bug in Electron,
    // it seems. Also, it does not handle node.js exits
    // like Ctrl + C or process.exit.
    extNames.forEach(function (name) {
      BrowserWindow.removeDevToolsExtension(name);
    });
    extNames.length = 0;
  }

  function run () {
    // Called before we load the app
    onReady();

    // Ensure we run whenever the page is refreshed,
    // but only after domready.
    webContents.on('dom-ready', function () {
      webContents.send('run-entry');
    });

    // Load index.html
    mainWindow.loadURL(url);
  }

  function onFirstRun () {
    // Close after timeout
    // The timer is started after entry is run
    if (typeof argv.timeout === 'number') {
      setTimeout(function () {
        mainWindow.close();
      }, argv.timeout);
    }

    if (entry) {
      // has entry file, so pipe std along
      process.stdin
        .on('data', function (data) {
          if (!closed) mainWindow.send('stdin', data);
        })
        .on('end', function () {
          if (!closed) mainWindow.send('stdin', null);
        });
    } else {
      // Does not have entry file, so execute the stdin
      // An alternative solution might be to use
      // snippet-stream to enable streaming eval (i.e.
      // for stdin that doesn't "end").
      process.stdin.pipe(concat(function (body) {
        body = body.toString();

        // TODO: Cleaner solution for --break on JS stdin
        // if (argv.debugBreak) body = 'debugger;' + body;

        if (!closed) webContents.executeJavaScript(body);
      }));
    }

    process.stdin.resume();
  }
}
