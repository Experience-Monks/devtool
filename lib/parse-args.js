var minimist = require('minimist');
var rc = require('rc');

module.exports = function parseArgs (args) {
  var argv = fromArray(args);

  // use config search by default
  if (typeof argv.config === 'undefined') argv.config = true;
  if (argv.config !== false) {
    // search rc paths
    argv.config = rc('devtool', {
      browserWindow: {
        detachDevTools: true
      }
    });
  } else {
    // explicitly disable config searching
    argv.config = { _: [] };
  }

  // Clean up the config object a bit
  delete argv.config.config;
  delete argv.config.C;

  // We use globals to communicate some information from
  // renderer / server without async ipc.
  global.__electronDevtoolGlobals = {
    console: argv.console,
    sourceMaps: argv.sourceMaps,
    browserField: argv.browserField,
    debugBreak: argv.debugBreak,
    browserGlobals: argv.browserGlobals,
    nodeTimers: argv.nodeTimers,
    requirePaths: [].concat(argv.require).filter(Boolean),
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

module.exports.fromArray = fromArray;
function fromArray (args) {
  return minimist(args, {
    '--': true,
    boolean: [
      'console', 'quit', 'poll', 'show', 'headless',
      'browserField', 'version', 'break', 'browserGlobals',
      'nodeTimers', 'verbose', 'sourceMaps'
    ],
    string: [ 'index', 'require' ],
    default: {
      browserGlobals: true,
      sourceMaps: true,
      nodeTimers: true
    },
    alias: {
      config: 'C',
      debugBreak: 'break',
      sourceMaps: [ 'source-maps', 'sm' ],
      timeout: 't',
      headless: 'h',
      nodeTimers: [ 'node-timers', 'nt' ],
      browserGlobals: [ 'bg', 'browser-globals' ],
      browserField: [ 'bf', 'browser-field' ],
      watch: 'w',
      quit: 'q',
      require: 'r',
      version: 'v',
      console: 'c',
      index: 'i',
      poll: 'p',
      show: 's'
    }
  });
}
