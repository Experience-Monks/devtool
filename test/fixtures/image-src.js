load('test/fixtures/baboon.png')
  .then(() => {
    return write('ok\n');
  })
  .then(() => {
    return load('test/fixtures/does-not-exist.png');
  })
  .then(() => {
    return write('not-ok'); // The last promise should reject!
  }, () => {
    return write('ok');
  })
  .then(() => window.close());

function load (url) {
  return new Promise((resolve, reject) => {
    var img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image not found: ' + url));
    img.src = url;
  });
}

function write (msg) {
  return new Promise(resolve => process.stdout.write(msg, resolve));
}