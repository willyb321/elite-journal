'use strict';
const electron = require('electron');
const tableify = require('tableify');
const {dialog} = require('electron');
const LineByLineReader = require('line-by-line');
const fs = require('fs');

const app = electron.app;
var file;
// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// prevent window being garbage collected
let mainWindow;

function onClosed() {
// dereference the window
// for multiple windows store them in an array
	mainWindow = null;
}

function createMainWindow() {
	const win = new electron.BrowserWindow({
		width: 600,
		height: 400
	});
	file = dialog.showOpenDialog({properties: ['openFile', 'multiSelections']})

	win.on('closed', onClosed);
	const lr = new LineByLineReader(file[0]);

lr.on('error', err => {
	return console.log(err);
});

lr.on('line', line => {
	const test = JSON.parse(line);
	const html = tableify(test);

	fs.appendFile('./index2.html', html, err => {
		if (err) {
			return console.log(err);
		}
		console.log('The file was saved!');
	});
});

lr.on('end', () => {
	console.log('done!');
	win.loadURL(`file://${__dirname}/index2.html`);
});
	return win;
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
	fs.writeFile('./index2.html', "", err => {
		if (err) {
			return console.log(err);
		}
	})
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', () => {
	mainWindow = createMainWindow();

});

