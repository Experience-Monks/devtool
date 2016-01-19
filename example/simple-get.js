var get = require('simple-get');
var concat = require('concat-stream');

console.log('Requesting google.com');
get('http://google.com/', function (err, res) {
  if (err) throw err;
  res.pipe(concat(function (body) {
    console.log('Total bytes:', body.toString().length);
    if (process.env.NODE_ENV !== 'development') window.close();
  }));
});
