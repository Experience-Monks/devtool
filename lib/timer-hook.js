/*
  Shims global timers to behave like node,
  returning values with ref() and unref().
  This is on by default; you can disable with
  --no-node-timers or --no-nt
 */

var timers = require('timers');

module.exports = function timerHook () {
  global.setTimeout = wrapWithActivateUvLoop(timers.setTimeout);
  global.setInterval = wrapWithActivateUvLoop(timers.setInterval);
  global.clearTimeout = timers.clearTimeout;
  global.clearInterval = timers.clearInterval;
};

function wrapWithActivateUvLoop (func) {
  return function updateTimerLoop () {
    process.activateUvLoop();
    return func.apply(this, arguments);
  };
}
