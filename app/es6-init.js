const appRoot = require('path').join(__dirname, '..');

require('electron-compile').init(appRoot, require.resolve('./index'));
