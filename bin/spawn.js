// spawns devtool with given CLI arguments
const spawn = require('child_process').spawn;
const electron = require('electron-prebuilt');
const through = require('through2');
const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'server.js');

module.exports = spawnDevtool;
function spawnDevtool (args) {
  var helperRegex = /[\d\-\s\:\.]+\sElectron\sHelper\[[\d\:\.]+\]/;
  var serverArgs = [ serverPath ].concat(args);
  var proc = spawn(electron, serverArgs, {
    stdio: [ process.stdin, 'pipe', 'pipe' ]
  });
  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(through(function (data, enc, next) {
    if (!helperRegex.test(data.toString())) {
      // Hide some Chromium/Electron logs on OSX
      this.push(data);
    }
    next();
  })).pipe(process.stderr);

  proc.on('close', function (code) {
    process.exit(code);
  });
  return proc;
}
