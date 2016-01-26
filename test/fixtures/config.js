var browserWindow = require('electron').remote.getCurrentWindow();
console.log(JSON.stringify(browserWindow.getContentSize()));
