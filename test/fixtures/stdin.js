require('get-stdin')()
  .then(function (data) {
    process.stdout.write(data.toString());
    window.close();
  })
  .catch(function (err) {
    process.stdout.write(err.message + '\n');
    process.exit(1);
  });
