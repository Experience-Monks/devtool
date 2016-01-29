/*
  Profiling/debugging browserify core.

    npm run example:browserify
 */

var browserify = require('browserify');
var path = require('path');

function run () {
  console.profile('build');
  browserify(path.resolve(__dirname, 'client.js'))
    .bundle(function (err, src) {
      if (err) throw err;
      console.profileEnd('build');
      console.log('bundle size in bytes:', src.length);
    });
}

if (require.main === module) {
  run();
}
