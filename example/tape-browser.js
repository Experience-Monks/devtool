/*
  This file gets browserified and then piped into
  devtool, then piped to `faucet` for pretty-printing TAP.

    npm run example:tape-browser
 */

var test = require('tape');

test('runs in the browser', function (t) {
  t.notEqual(typeof document, 'undefined', 'document exists');
  t.end();
});
