var spawn = require('cross-spawn-async');
var path = require('path');
var concat = require('concat-stream');
// var assign = require('object-assign');

var cmd = path.resolve(__dirname, '..', 'bin', 'index.js');
var test = require('tape');

setup('loads images', 'image-src.js', 'ok\nok', [ '-h' ]);
setup('loads images with custom index', 'image-src.js', 'ok\nok', [
  '-h',
  '--index',
  path.resolve(__dirname, 'fixtures', 'index.html')
]);

setup('use Node timers for unref()', 'timers.js', 'function', [ '-h' ]);
setup('use Browser timers', 'timers.js', 'undefined', [ '-h', '--no-node-timers' ]);

rejectedPromise('gets rejected Bluebird promise');
rejectedPromise('gets rejected Bluebird promise with --no-bg', [ '--no-bg' ]);
// TODO: Exit code 1 for rejected bluebird promises...?
// rejectedPromise('gets rejected Bluebird promise and quits', [ '-q' ]);

test('respect NODE_PATH for resolving requires', function (t) {
  t.plan(1);
  t.timeoutAfter(4000);
  t.ok(true, 'CURRENTLY FAILING TEST!');
  // var entry = [ path.resolve(__dirname, 'fixtures', 'node-path.js') ];
  // var env = assign({}, process.env, {
  //   NODE_PATH: path.resolve(__dirname, 'fixtures', 'foo')
  // });
  // var proc = spawn(cmd, entry.concat([]), {
  //   env: env
  // });
  // proc.stderr.pipe(process.stderr);
  // proc.stdout.pipe(concat(function (body) {
  //   t.equal(body.toString(), 'foo/one');
  // }));
});

setup('module.parent from main', 'no-parent.js', 'no-parent');
setup('module.parent from other', 'no-parent-other.js', 'parent');

setup('test --config=file v8 flags', 'harmony_object_values_entries.js',
  '[["foo","bar"]]',
  [ '--js-flags=--harmony_object_values_entries', '--config', path.resolve(__dirname, 'fixtures', 'harmony.json') ]);

// May fail since Chrome now supports almost 100% ES6 ...
// setup('js-flags from CLI', 'harmony-proxies.js', 'object\n', [
//   '--js-flags=--harmony-proxies', '--console', '--timeout', '1000'
// ]);

setup('process.argv', 'argv.js', JSON.stringify([
  path.resolve(__dirname, 'fixtures', 'argv.js'),
  '--foobar'
]), [ '--foobar' ]);

setup('closes on --timeout',
  path.resolve(__dirname, 'fixtures', 'node_modules', 'foo', 'node.js'),
  'node', [ '--timeout', 1000 ]);

setup('process.argv with full stop', 'argv.js', JSON.stringify([
  path.resolve(__dirname, 'fixtures', 'argv.js'),
  'some', '--arg'
]), [ '--foobar', '--bar', '--', 'some', '--arg' ]);

test('process.stdin', function (t) {
  t.plan(1);
  t.timeoutAfter(4000);

  var entry = [ path.resolve(__dirname, 'fixtures', 'stdin.js') ];
  var proc = spawn(cmd, entry.concat([ '-q', '-h' ]));
  proc.stdout.pipe(concat(function (body) {
    t.equal(body.toString(), 'beep boop\n');
  }));
  proc.stdin.write('beep boop\n');
  proc.stdin.end();
});

test('require.resolve entry file', function (t) {
  t.plan(1);
  t.timeoutAfter(4000);
  var entry = [ 'test/fixtures/node_modules/foo' ];
  var proc = spawn(cmd, entry.concat([ '--timeout', 1000 ]));
  proc.stdout.pipe(concat(function (body) {
    t.equal(body.toString(), 'node');
  }));
});

setup('process.cwd()', 'cwd.js', process.cwd(), [ ]);
setup('require.main', 'main.js', 'is main');
setup('browser field resolution enabled', 'browser-field.js', 'browser', [ '--browser-field' ]);
setup('browser field resolution enabled', 'no-browser-globals.js', JSON.stringify({
  window: 'undefined',
  document: 'undefined',
  navigator: 'undefined'
}), [ '--no-browser-globals' ]);
setup('browser field resolution disabled', 'browser-field.js', 'node', [ ]);
setup('index.html', 'close.js', 'beep boop\n', [
  '--console',
  '--index',
  path.resolve(__dirname, 'fixtures', 'index.html')
]);
setup('require.main from other module', 'main-other.js', 'is not main');

exitCode('exit code 0', 'exit-0.js', 0);
exitCode('exit code 1', 'exit-1.js', 1);
exitCode('quits on error', 'quit-on-error.js', 1, [ '--quit' ]);

test('console redirection', function (t) {
  t.plan(2);
  t.timeoutAfter(4000);

  var entry = [ path.resolve(__dirname, 'fixtures', 'console.js') ];
  var proc = spawn(cmd, entry.concat([ '--console', '--headless' ]));
  proc.stdout.pipe(concat(function (body) {
    t.equal(body.toString(), 'beep boop\n');
  }));
  proc.stderr.pipe(concat(function (body) {
    t.equal(body.toString(), 'foobaz\n');
  }));
});

function setup (msg, inputFile, outputStr, args) {
  args = args || [];
  test(msg, function (t) {
    t.plan(1);
    t.timeoutAfter(4000);

    var entry = [ path.resolve(__dirname, 'fixtures', inputFile) ];
    var proc = spawn(cmd, entry.concat(args));
    proc.stdout.pipe(concat(function (body) {
      t.equal(body.toString(), outputStr);
    }));
    proc.stderr.pipe(process.stderr);
  });
}

function rejectedPromise (msg, args) {
  test(msg, function (t) {
    t.plan(1);
    t.timeoutAfter(6000);
    var entry = [ 'test/fixtures/bluebird-reject.js' ];
    var proc = spawn(cmd, entry.concat([ '-c', '-h', '-t', 1000 ]).concat(args || []));
    proc.stderr.pipe(concat(function (body) {
      t.ok(body.toString().indexOf('Rejecting promise!') >= 0, 'finds rejected promise');
    }));
  });
}

function exitCode (msg, inputFile, expectedCode, args) {
  args = args || [];
  test(msg, function (t) {
    t.plan(1);
    t.timeoutAfter(4000);

    var entry = [ path.resolve(__dirname, 'fixtures', inputFile) ];
    var proc = spawn(cmd, entry.concat(args));
    proc.on('close', function (code) {
      t.equal(code, expectedCode, 'matches exit code');
    });
  });
}
