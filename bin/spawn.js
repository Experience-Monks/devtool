// spawns devtool with given CLI arguments
const spawn = require('child_process').spawn;
const electron = require('electron');
const through = require('through2');
const path = require('path');
const parseArgs = require('../lib/parse-args').fromArray;

const serverPath = path.resolve(__dirname, '..', 'server.js');

module.exports = spawnDevtool;
function spawnDevtool (args) {
  var argv = parseArgs(args);
  var helperRegex = /[\d\-\s\:\.]+\sElectron\sHelper\[[\d\:\.]+\]/;
  var serverArgs = [ serverPath ].concat(args);
  var proc = spawn(electron, serverArgs, {
    stdio: [ process.stdin, 'pipe', 'pipe' ]
  });
  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(through(function (data, enc, next) {
    // Hide some Chromium/Electron logs on OSX
    if (argv.verbose || !helperRegex.test(data.toString())) {
      this.push(data);
    }
    next();
  })).pipe(process.stderr);

  proc.on('close', function (code) {
    process.exit(code);
  });
  return proc;
}
