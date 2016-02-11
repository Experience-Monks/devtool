var img = new window.Image();
img.onload = function () {
  console.log('load');
};
img.onerror = function () {
  console.log('error');
};
img.src = 'test/fixtures/baboon.png';
