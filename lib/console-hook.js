var sliced = require('sliced');
var nodeConsole = require('console');

module.exports = function consoleHook () {
  var methods = [ 'error', 'info', 'log', 'warn', 'debug' ];
  methods.forEach(function (k) {
    var browserFn = global.console[k];
    var nodeFn = nodeConsole[k];
    global.console[k] = function () {
      var args = sliced(arguments);
      var ret = browserFn.apply(this, args);
      if (nodeFn) { // 'debug' only exists in browser console
        ret = nodeFn.apply(this, args);
      }
      return ret;
    };
  });
};
