# devtool

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Runs Node.js programs inside Chrome DevTools (using [Electron](https://github.com/atom/electron/)).

```sh
# open a Node program in Chrome's DevTools
devtool src/index.js
```

This allows you to profile, debug and develop typical Node.js programs with some of the features of Chrome DevTools.

The recording below shows setting breakpoints within an HTTP server.

![movie](http://i.imgur.com/V4RQSZ2.gif)

## Usage

```sh
Usage:
  devtool [entry] [opts]

Options:
  --watch, -w     enable file watching (for development)
  --quit, -q      quit application on fatal errors
  --console, -c   redirect console logs to terminal
  --index, -i     specify a different index.html file
  --poll, -p      enable polling when --watch is given
  --show, -s      show the browser window (default false)
  --headless, -h  do not open the DevTools window
```

Examples:

```sh
# watch/dev a JS file, with a custom index.html
devtool src/index.js --index index.html --watch

# redirect console and pipe results to a file
devtool main.js -q -c > foo.txt

# open a REPL window
devtool
```

## Use Cases

### Debugging / Profiling

For example, we can use this to profile and debug [browserify](https://github.com/substack/node-browserify), a node program that would not typically run inside Chrome DevTools. Here we use [`console.profile()`](https://developer.chrome.com/devtools/docs/console-api), a feature of Chrome.

```js
// build.js
var browserify = require('browserify');

// Start DevTools profiling...
console.profile('build');

// Bundle some browser application
browserify('client.js').bundle(function (err, src) {
  if (err) throw err;
  
  // Finish DevTools profiling...
  console.profileEnd('build');
});
```

Now we can run `devtool` on our file:

```sh
devtool build.js
```

Some screenshots of the profiling and debugging experience:

![profile](http://i.imgur.com/vSu7Lcz.png)

![debug](http://i.imgur.com/O4DZHyv.png)

### REPL

We can also use the DevTools Console as a basic Node REPL with some nice additional features. The require statements will be relative to your current working directory. You can run the command without any entry file, like this:

```sh
devtool
```

![console](http://i.imgur.com/bnInBHA.png)

### Browser APIs

You can also mix Node modules with browser APIs, such as Canvas and WebGL. See [example/streetview.js](./example/streetview.js) and the respective script in [package.json](./package.json), which grabs a StreetView panorama with some [Google Client APIs](https://developers.google.com/discovery/libraries?hl=en) and writes the PNG image to `process.stdout`.

Example:

```sh
devtool street.js --index street.html --quit > street.png
```

Result:

![street](http://i.imgur.com/GzqrTK2.png)

### Other Examples

See the [examples/](./examples/) folder for more ideas, and the [package.json](./package.json) scripts which run them.

## Features

This is built on [Electron](https://github.com/atom/electron/), so it includes the Console, Profile, Debugger, etc. It also includes some additional features on top of Electron:

- Improved error handling (more detailed syntax errors in console)
- Improved source map support for required files
- Makes various Node features behave as expected, like `require.main` and `process.argv`
- Console redirection back to terminal (optional)
- File watching for development and quit-on-error flags for unit testing (e.g. continuous integration)
- Handles `process.exit` and error codes

## Gotchas

Since this is running in Electron and Chromium, instead of Node, you might run into some oddities and gotchas. For example, `window` is present, which some modules may use to detect Node/Browser environments.

Apps will not terminate automatically. Instead, you must call `window.close()` from your scripts to end the process.

Some modules that use native addons may not work within Electron.

## Roadmap / Contributing

This project is experimental and has not been tested on a wide range of applications. If you want to help, please open an issue or submit a PR. Some outstanding areas to explore:

- Adding a `--timeout` option to auto-close after X seconds
- Supporting `"browser"` field in `package.json`
- Supporting `process.stdin` and piping
- Improving syntax error handling, e.g. adding it to Sources panel
- Exposing an API for programmatic usage
- Adding unit tests

You can `git clone` and `npm install` this repo to start working from source.

## See Also
#### `hihat`

If you like this, you might also like [hihat](https://github.com/Jam3/hihat). It is very similar, but more focused on running and testing *browser* applications. Hihat uses [browserify](https://www.npmjs.com/package/browserify) to bundle everything into a single source file.

In some ways, `devtool` is a spiritual successor to `hihat`. The architecture is cleaner and better suited for large Node/Electron applications.

## License

MIT, see [LICENSE.md](http://github.com/Jam3/devtool/blob/master/LICENSE.md) for details.
