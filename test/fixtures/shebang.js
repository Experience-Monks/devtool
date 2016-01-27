#!/usr/bin/env node
require('does-not-exist'); // <-- deliberate error
process.stdout.write('foo', () => window.close());
