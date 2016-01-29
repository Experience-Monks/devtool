var timer = setTimeout(() => null, 0);
process.stdout.write(typeof timer.unref, () => process.exit());
