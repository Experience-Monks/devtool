// Unfortunately Node.js and Browser return
// different interfaces for timers.
// Here we "normalize" them and make them look
// a little more Node-like.
// Also, we can't simply use `require('timers')` since
// Electron doesn't seem to support them.

var sliced = require('sliced');
module.exports = function timerHook () {
  var timerFuncs = [
    'setTimeout',
    'setInterval',
    'setImmediate'
  ];
  timerFuncs.forEach(function (key) {
    var browserFunc = global[key];
    var Ctor = key === 'setImmediate' ? Immediate : Timeout;
    global[key] = function () {
      var args = sliced(arguments);
      var value = browserFunc.apply(this, args);
      return new Ctor(value);
    };
  });

  var clearFuncs = [
    'clearTimeout',
    'clearInterval',
    'clearImmediate'
  ];
  clearFuncs.forEach(function (key) {
    var browserFunc = global[key];
    global[key] = function (timer) {
      if (timer && typeof timer.id !== 'undefined') {
        timer = timer.id;
      }
      return browserFunc.call(this, timer);
    };
  });
};

function Immediate (id) {
  this.id = id;
}

function Timeout (id) {
  this.id = id;
}

Timeout.prototype.unref = function () {};
Timeout.prototype.ref = function () {};
