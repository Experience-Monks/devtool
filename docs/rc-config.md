# rc configuration

You can configure advanced Node and Electron options through a `rc` file. Options are *deep merged* in, rather than replaced entirely.

Currently the following config options are supported:

- `browserWindow` – options to use when creating the [BrowserWindow](https://github.com/atom/electron/blob/master/docs/api/browser-window.md)
- `v8` – an object with `flags`, an array of strings like `"--harmony-arrow-function"`
- `detachDevTools` – a boolean, default `true`, to create DevTools detached or attached to the main window
- `devToolsExtensions` – an array of paths to Chrome DevTool Extensions, see [DevTools Extensions](devtools-extensions) for details

By default, config will search for a local `.devtoolrc`, or looking up the folder tree to root/home directories. See [here](https://github.com/dominictarr/rc#standards) for details.

You can explicitly pass a config file like so:

```sh
devtool src/index.js --config conf/opts.json
```

Or disable config lookup entirely:

```sh
devtool src/index.js --no-config
```

For example, you can add the following `.devtoolrc` file in the same directory as your project.

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

> :bulb: The `.devtoolrc` supports comments in JSON.

Some V8 flags may need to be set before initialization. You can pass these as options to electron like so:

```sh
devtool src/index.js --js-flags="--harmony-proxies"
```

## DevTools Extensions

The following extensions should work with Electron (and thus `devtool`).

- [chrome-devtools-zerodarkmatrix-theme](https://github.com/mauricecruz/chrome-devtools-zerodarkmatrix-theme)

You can add this to a `~/.devtoolrc` file so that it persists across all uses of the app. For example, after cloning the above theme:

```js
{
  "devToolsExtensions": [
    "/path/to/chrome-devtools-zerodarkmatrix-theme/theme-extension"
  ]
}
```

For themes to work, you also need to open `Settings -> Experiments` in the DevTools panel and check `"Allow custom UI themes"`. This will persist for future runs.

![Theme](http://i.imgur.com/nXWan6H.png)

## Clearing Extensions

Currently, Electron does not remove the theme from the Chrome application cache.

You can paste this in the `devtool` REPL to find out where the cache is, and then delete the `DevTools Extensions` file in that folder:

```js
require('electron').remote.require('app').getPath('userData')
```

Alternatively, you can go to `Settings -> General -> Restore Defaults and Reload` while using devtool.