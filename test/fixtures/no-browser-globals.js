process.stdout.write(JSON.stringify({
  window: typeof window,
  document: typeof document,
  navigator: typeof navigator
}), function () {
  process.exit(0);
});
