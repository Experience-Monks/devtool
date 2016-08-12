# devtool

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Runs Node.js programs inside Chrome DevTools (using [Electron](https://github.com/atom/electron/)).

```sh
# runs a Node.js app in DevTools
devtool src/app.js
```

This allows you to profile, debug and develop typical Node.js programs with some of the features of Chrome DevTools. See my blog post [Debugging Node.js With Chrome DevTools](http://mattdesl.svbtle.com/debugging-nodejs-in-chrome-devtools) for more details.

The recording below shows setting breakpoints within an HTTP server.

![movie](http://i.imgur.com/V4RQSZ2.gif)

> *Note:* This tool is still in early stages. So far it has only been tested on a couple of OSX machines. :)

## Install

Install globally with `npm`.

```sh
npm install devtool -g
```

## Usage

Run the command to open a new DevTools window.

```txt
Usage:
  devtool [entry] [opts]

Options:
  --watch, -w             enable file watching (for development)
  --quit, -q              quit application on fatal errors
  --console, -c           redirect console logs to terminal
  --index, -i             specify a different index.html file
  --poll, -p              enable polling when --watch is given
  --show, -s              show the browser window (default false)
  --headless, -h          do not open the DevTools window
  --timeout, -t           if specified, will close after X seconds
  --break                 insert a breakpoint in entry point
  --config                a path to .devtoolrc config file
  --verbose               verbose Chromium logging
  --version, -v           log versions of underlying tools
  --require, -r           require path(s) before running entry
  --browser-field, --bf   resolve using "browser" field
  --no-source-maps,
                --no-sm   disable source map generation
  --no-node-timers,
                --no-nt   use browser timers
  --no-browser-globals,   
                --no-bg   removes window,document,navigator from required files
```

Examples:

```sh
# watch/dev a JS file, with a custom index.html
devtool src/index.js --index index.html --watch

# redirect console and pipe results to a file
devtool main.js -q -c > foo.txt

# open a REPL window
devtool

# pipe content into process.stdin
devtool writer.js < README.md

# pass clean arg list to app.js
devtool app.js --watch -- entry

# register with babel before requiring our app
devtool -r babel-register app.js
```

You can specify `--watch` multiple times to watch different files/globs. If a custom `--index` is passed, it will also be watched for changes. 

If `--` is given, anything after it will be used as the arguments for the app's `process.argv`. This way you can avoid polluting your program arguments with those specific to `devtool`.

The `--browser-field` or `--bf` makes the `require()` statements respect the [package.json `"browser"` field](https://gist.github.com/defunctzombie/4339901).

The `--no-browser-globals` or `--no-bg` flag makes required modules behave a little more like Node, in that `window`, `navigator`, `document` and some other browser globals will be undefined in required files. Note: the console and REPL may still show some of these globals.

### Advanced Configuration

You can also specify advanced Electron/Node options in a `rc` configuration file, such as DevTools themes and V8 flags. See [rc configuration](./docs/rc-config.md) for more details.

### Further Documentation

See my blog post [Debugging Node.js With Chrome DevTools](http://mattdesl.svbtle.com/debugging-nodejs-in-chrome-devtools) for more details.

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

> *Note:* Performance may vary between Node and Electron, so always take the results with a grain of salt!

You can also set an initial breakpoint with the `--break` flag. This will insert a `debugger` statement (hidden behind source maps) at the start of your entry file. This way, you can add breakpoints without having to reload the program or manually add them to your source code.

```sh
# run app but break on start
devtool src/index.js --break
```

### REPL

We can also use the DevTools Console as a basic Node REPL with some nice additional features. The require statements will be relative to your current working directory. You can run the command without any entry file, like this:

```sh
devtool
```

![console](http://i.imgur.com/bnInBHA.png)

When you don't specify an entry file, you can pipe JavaScript in to execute it in the browser. For example:

```sh
browserify client.js | devtool -c
```

### Browser APIs

You can also mix Node modules with browser APIs, such as Canvas and WebGL. See [example/streetview.js](./example/streetview.js) and the respective script in [package.json](./package.json), which grabs a StreetView panorama with some [Google Client APIs](https://developers.google.com/discovery/libraries?hl=en) and writes the PNG image to `process.stdout`.

For this, you may want to use the `--bf` or `--browser-field` flag so that modules like [nets](http://npmjs.com/package/nets) will use Web APIs where possible.

Example:

```sh
devtool street.js --index street.html --quit --bf > street.png
```

Result:

![street](http://i.imgur.com/GzqrTK2.png)

> *Note:* For the output to drain correctly, we need to close the window *after* the buffer has been written.

```js
process.stdout.write(buffer, function () {
  window.close();
});
```

See [extract-streetview](https://github.com/Jam3/extract-streetview) for a practical implementation of this idea built on `devtool`.

### Grunt/Gulp/Mocha

To debug Grunt/Gulp/Mocha and other commands, you will need to pass the JavaScript file that runs them. You should also include `--` to avoid any argument conflicts.

```sh
# same as "gulp watch"
devtool node_modules/gulp/bin/gulp.js -c -- watch

# same as "grunt"
devtool node_modules/grunt-cli/bin/grunt -c --

# run a mocha test
devtool node_modules/mocha/bin/_mocha -qc -- ./tests/my-spec.js 
```

### Other Examples

See the [example/](./example/) folder for more ideas, and the [package.json](./package.json) scripts which run them.

- [example/markdown.js](./example/markdown.js) - Pipes a `.md` file into `process.stdin`, then renders GitHub Flavored Markdown to a PNG image
- [example/es2015.js](./example/es2015.js) - ES2015 transpiling
- [example/geolocate.js](./example/geolocate.js) - prints current `[ latitude, longitude ]` to `stdout`
- [example/http.js](./example/http.js) - a simple Node.js server that you can throw break points into
- [example/tape-browser.js](./example/tape-browser.js) - demonstrates piping JavaScript directly into devtool, e.g. for browser testing

Also see [devtool-examples](https://github.com/Jam3/devtool-examples) for more ideas.

## Features

This is built on [Electron](https://github.com/atom/electron/), so it includes the Console, Profile, Debugger, etc.

It also includes some additional features on top of Electron:

- Improved error handling (more detailed syntax errors in console)
- Improved source map support for required files
- Makes various Node features behave as expected, like `require.main`, `process.argv`, `process.stdin` and [timers](https://nodejs.org/api/timers.html)
- Console redirection back to terminal (optional)
- File watching for development and quit-on-error flags for unit testing (e.g. continuous integration)
- Handles `process.exit` and error codes
- Supports `"browser"` field resolution (optional)
- Can hide browser globals (like `window` and `navigator`) for better compatibility with Node.js modules (optional)
- Supports config files for V8 flags, color themes, and other options

## Gotchas

Since this is running in Electron and Chromium, instead of Node, you might run into some oddities and gotchas. 

- `window` and other browser APIs are present; this may affect modules using these globals to detect Browser/Node environments
  - The `--no-browser-globals` may help mitigate these issues
- You must call `window.close()` to stop the process; apps will not quit on their own
- If a native module does not work, you may need to [rebuild it for the right version of Electron](http://electron.atom.io/docs/v0.36.0/tutorial/using-native-node-modules/)
- If you want to close or exit after writing to stderr/stdout, you should do so after a callback: `outStream.write(buf, callback)`
- `setTimeout`, `setInterval` and related functions are shimmed for better compatibility with [Node.js `timers`](https://nodejs.org/api/timers.html)
- `process.stdin` does not work in Windows shells, see [this Electron issue](https://github.com/electron/electron/issues/4218)

## Roadmap / Contributing

This project is experimental and has not been tested on a wide range of applications or Node/OS environments. If you want to help, please open an issue or submit a PR. Some outstanding areas to explore:

- Improving syntax error handling, e.g. adding it to Sources panel
- Exposing an API for programmatic usage
- Exploring native addons
- Testing against a wide range of Node.js applications and modules

You can `git clone` and `npm install` this repo to start working from source. Type `npm run` to list all available commands.

## See Also / Comparisons
### `hihat`

If you like this, you might also like [hihat](https://github.com/Jam3/hihat). It is very similar, but more focused on running and testing *browser* applications. Hihat uses [browserify](https://www.npmjs.com/package/browserify) to bundle everything into a *single* source file, and uses [watchify](https://www.npmjs.com/package/watchify) for incremental file changes.

In some ways, `devtool` is a spiritual successor to `hihat`. The architecture is cleaner and better suited for large Node/Electron applications.

### `iron-node`

Another Electron-based debugger is [iron-node](https://github.com/s-a/iron-node). `iron-node` includes better support for native addons and a complex graphical interface that shows your `package.json` and `README.md`.

Whereas `devtool` is more focused on the command-line, Unix-style piping/redirection, and Electron/Browser APIs for interesting use-cases (e.g. [Google StreetView](#browser-apis)).

`devtool` shims various features to behave more like Node.js (like `require.main` and `process.exit`) and overrides the internal `require` mechanism for source maps, improved error handling and `"browser"` field resolution. 

### `node-inspector`

You may also like [node-inspector](https://github.com/node-inspector/node-inspector), which uses remote debugging instead of building on top of Electron.

This means your code will run in a true Node environment, without any `window` or other Browser/Electron APIs that may pollute scope and cause problems with certain modules. It has stronger support for large Node.js applications (i.e. native addons) and more control over the DevTools instance (i.e. can inject breakpoints and support Network requests).

However, since it re-implements much of the debugging experience, it may feel clunky and fragile compared to developing inside the latest Chrome DevTools (e.g. `console.profile()` does not exist).

Whereas `devtool` aims to make the experience feel more familiar to those coming from Chrome DevTools, and also promotes other features like Browser/Electron APIs.

## License

MIT, see [LICENSE.md](http://github.com/Jam3/devtool/blob/master/LICENSE.md) for details.
