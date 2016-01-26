if (!module.parent) {
  process.stdout.write('no-parent', function () {
    window.close();
  });
} else {
  process.stdout.write('parent', function () {
    window.close();
  });
}
