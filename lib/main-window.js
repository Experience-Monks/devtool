var assign = require('object-assign');
var path = require('path');

var electron = require('electron');
var BrowserWindow = electron.BrowserWindow;

module.exports = createMainWindow;
function createMainWindow (url, argv, cb) {
  argv = argv || {};

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
      webSecurity: false // To avoid errors on Windows
    }
  }, bounds);
  var mainWindow = new BrowserWindow(opts);

  // Close after timeout
  if (typeof argv.timeout === 'number') {
    setTimeout(function () {
      mainWindow.close();
    }, argv.timeout);
  }

  // On first load, we trigger the app execution
  var webContents = mainWindow.webContents;
  webContents.once('did-finish-load', function () {
    cb();

    if (!argv.headless) {
      webContents.once('devtools-opened', function () {
        // If debugger is desired, only run after it's open
        run();

        // Hide the main window frame so windows
        // users aren't seeing a tiny frame.
        if (!argv.show) mainWindow.hide();

        // Also send stdin to user app
        sendStdin();
      });

      // Launch debugger
      webContents.openDevTools({ detach: true });
    } else {
      run();

      // TODO: Find out why this timeout is necessary.
      // stdin is not triggering if sent immediately
      setTimeout(function () {
        sendStdin();
      }, 500);
    }
  });

  mainWindow.loadURL(url);
  return mainWindow;

  function run () {
    // Ensure we run whenever the page is refreshed,
    // but only after domready.
    webContents.on('dom-ready', function () {
      webContents.send('run-entry');
    });

    // Initial execution after debugger is ready
    webContents.send('run-entry');
  }

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
}
