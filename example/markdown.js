/*

  This demo renders markdown documents to an image.

  - Reads markdown from stdin
  - Renders it to the document.body with GFM
  - Shows the browser window and captures the screen
  - Writes PNG to process.stdout

    npm run example:markdown
 */

var marked = require('marked');
var remote = require('electron').remote;

var css = require.resolve('github-markdown-css/github-markdown.css');
var cssFile = require('fs').readFileSync(css, 'utf8');
require('insert-css')(cssFile);

require('get-stdin')()
  .then(function (src) {
    capture(src.toString());
  }, function (err) {
    console.error(err);
    process.exit(1);
  });

function capture (md) {
  document.body.className = 'markdown-body';
  document.body.innerHTML = marked(md);

  var browserWindow = remote.getCurrentWindow();
  browserWindow.show();
  browserWindow.setContentSize(720, 640);
  setTimeout(function () { // wait for images to render
    browserWindow.capturePage(function (data) {
      process.stdout.write(data.toPng(), function () {
        window.close();
      });
    });
  }, 500);
}
