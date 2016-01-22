var minimist = require('minimist');

module.exports = function parseArgs (args) {
  var argv = minimist(args, {
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

  // We use globals to communicate some information from
  // renderer / server without async ipc.
  global.__electronDevtoolGlobals = {
    console: argv.console,
    browserField: argv.browserField,
    debugBreak: argv.debugBreak,
    entry: null, // resolved in server.js
    quit: true, // true until app launches
    _processTTY: {
      stdin: process.stdin.isTTY,
      stdout: process.stdout.isTTY,
      stderr: process.stderr.isTTY
    }
  };
  argv.globals = global.__electronDevtoolGlobals;
  return argv;
};
