# devtool

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

### WORK IN PROGRESS

Documentation is currently being written for this module. Check back soon!

---

Runs Node.js source code through Chromium DevTools (using Electron).

This allows you to profile, debug and develop typical Node.js programs with some of the features of Chrome DevTools.

## Example

For example, we can use this to profile and debug [browserify](https://github.com/substack/node-browserify), a node program that would not typically work within the browser's DevTools.

```js
var browserify = require('browserify');

// Start DevTools profiling...
console.profile('build');

browserify('client.js').bundle(function (err, src) {
  if (err) throw err;
  
  // Finish DevTools profiling...
  console.profileEnd('build');
});
```

Here are some screenshots after the profile has run, and also during debugging of a hot code path.

## Features

This builds on Electron, providing some additional features:

- Improved error handling (more detailed syntax errors in console)
- Improved source map support for required files
- Makes various Node features behave as expected, like `require.main` and `process.argv`
- Console redirection back to terminal (optional)
- File watching for development and quit-on-error flags for unit testing (e.g. continuous integration)
- Exit error codes

## Usage

[![NPM](https://nodei.co/npm/devtool.png)](https://www.npmjs.com/package/devtool)

## License

MIT, see [LICENSE.md](http://github.com/Jam3/devtool/blob/master/LICENSE.md) for details.
