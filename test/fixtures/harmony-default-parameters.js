function foobar (a = 'baz') {
  process.stdout.write(a, () => {
    window.close();
  });
}

foobar();
