# rc configuration

You can configure advanced Node and Electron options through a `rc` file. Options are *deep merged* in, rather than replaced entirely.

Currently the following config options are supported:

- `browserWindow` – options to use when creating the [BrowserWindow](https://github.com/atom/electron/blob/master/docs/api/browser-window.md)
- `detachDevTools` – a boolean, default `true`, to create DevTools detached or attached to the main window
- `v8` – an object with `flags`, an array of strings like `"--harmony-arrow-function"`

By default, config will search for a local `.devtoolrc`, or looking up the folder tree to root/home directories. See [here](https://github.com/dominictarr/rc#standards) for details.

You can explicitly pass a config file like so:

```sh
devtool src/index.js --config conf/opts.json
```

Or disable config lookup entirely:

```sh
devtool src/index.js --no-config
```

The JSON supports comments. For example, you can add the following `.devtoolrc` file in the same directory as your project.

```js
{
  "browserWindow": {
    "webPreferences": {
      "webSecurity": false,
      "webgl": false
    },
    "width": 500,
    "height": 500,
    "show": true,
    "useContentSize": true
  },
  "detachDevTools": false,
  "v8": {
    "flags": [
      "--harmony-arrow-functions"
    ]
  }
}
```