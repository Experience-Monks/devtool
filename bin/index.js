#!/usr/bin/env node
const spawn = require('child_process').spawn;
const electron = require('electron-prebuilt');
const path = require('path');
const serverPath = path.join(__dirname, '../server.js');

var args = [ serverPath ].concat(process.argv.slice(2));
var proc = spawn(electron, args, {
  stdio: [ process.stdin, 'pipe', 'pipe' ]
});
proc.stdout.pipe(process.stdout);
proc.stderr.pipe(process.stderr);

proc.on('close', function (code) {
  process.exit(code);
});
