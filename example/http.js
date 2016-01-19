/*
  Debugging an http server with devtool.

    npm run http
 */

var http = require('http');

var server = http.createServer(function (req, res) {
  console.log('Requesting', req.url);
  if (req.url === '/') {
    res.end('Hello, world!');
  } else {
    res.statusCode = 404;
    res.end('404 not found =(');
  }
}).listen(8080, function () {
  console.log('Listening on http://localhost:8080/');
});

window.onbeforeunload = function () {
  server.close();
};
