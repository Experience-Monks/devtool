require('get-stdin')()
  .then(function (data) {
    process.stdout.write(data.toString(), function () {
      window.close();
    });
  })
  .catch(function (err) {
    process.stdout.write(err.message + '\n', function () {
      process.exit(1);
    });
  });
