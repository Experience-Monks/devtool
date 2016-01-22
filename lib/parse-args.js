var minimist = require('minimist');

module.exports = function parseArgs (args) {
  return minimist(args, {
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
};
