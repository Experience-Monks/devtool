/*
  Using Google Client Libraries with Node.js APIs.
  This demo uses a custom `streetview.html` index.
  This uses the --browser-field flag to resolve
  our require flags.

    npm run example:streetview
 */

var awesome = require('awesome-streetview');
var render = require('google-panorama-equirectangular');
var toBuffer = require('electron-canvas-to-buffer');
var googlePano = require('google-panorama-by-location');

googlePano(awesome(), function (err, result) {
  if (err) throw err;
  render(result.id, {
    tiles: result.tiles,
    crossOrigin: 'Anonymous',
    zoom: 1
  }).on('complete', function (canvas) {
    var buffer = toBuffer(canvas, 'image/png');
    process.stdout.write(buffer);
    window.close();
  });
});
