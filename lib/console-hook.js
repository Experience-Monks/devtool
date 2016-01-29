/*
  Shims devtool console to behave like
  node, printing to process stdout/stderr.
 */

var nodeConsole = require('console');

module.exports = function consoleHook () {
  var methods = [ 'error', 'info', 'log', 'warn', 'debug' ];
  methods.forEach(function (k) {
    var browserFn = global.console[k];
    var nodeFn = nodeConsole[k];
    global.console[k] = function () {
      var ret = browserFn.apply(this, arguments);
      if (nodeFn) { // 'debug' only exists in browser console
        ret = nodeFn.apply(this, arguments);
      }
      return ret;
    };
  });
};
