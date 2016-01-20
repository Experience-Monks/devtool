if (require.main === module) {
  process.stdout.write('is main');
} else {
  process.stdout.write('is not main');
}

window.close();
