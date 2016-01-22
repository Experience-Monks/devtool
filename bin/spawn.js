// spawns devtool with given CLI arguments
const spawn = require('child_process').spawn;
const electron = require('electron-prebuilt');
const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'server.js');

module.exports = spawnDevtool;
function spawnDevtool (args) {
  var serverArgs = [ serverPath ].concat(args);
  var proc = spawn(electron, serverArgs, {
    stdio: [ process.stdin, 'pipe', 'pipe' ]
  });
  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(process.stderr);

  proc.on('close', function (code) {
    process.exit(code);
  });
  return proc;
}
