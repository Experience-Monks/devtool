// a thin wrapper around chokidar file watching files
var chokidar = require('chokidar');
var assign = require('object-assign');
var EventEmitter = require('events').EventEmitter;

var ignores = [
  'node_modules/**', 'bower_components/**',
  '.git', '.hg', '.svn', '.DS_Store',
  '*.swp', 'thumbs.db', 'desktop.ini'
];

module.exports = function fileWatch (glob, opt) {
  opt = assign({
    ignored: ignores,
    ignoreInitial: true
  }, opt);

  if (opt.poll) {
    opt.usePolling = true;
  }

  var emitter = new EventEmitter();
  var closed = false;
  var ready = false;

  var watcher = chokidar.watch(glob, opt);
  watcher.on('change', function (file) {
    emitter.emit('change', file);
  });

  // chokidar@1.0.0-r6 only allows close after ready event
  watcher.once('ready', function () {
    ready = true;
    if (closed) watcher.close();
  });

  emitter.close = function () {
    if (closed) return;
    if (ready) watcher.close();
    closed = true;
  };
  return emitter;
};
