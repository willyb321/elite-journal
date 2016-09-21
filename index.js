'use strict';
const electron = require('electron');
const tableify = require('tableify');

const app = electron.app;
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

	win.loadURL(`file://${__dirname}/index2.html`);
	win.on('closed', onClosed);

	return win;
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', () => {
	mainWindow = createMainWindow();
});
const LineByLineReader = require('line-by-line');

const	lr = new LineByLineReader('journal.json');

lr.on('error', err => {
	return console.log(err);
});

lr.on('line', line => {
	const test = JSON.parse(line);
	const html = tableify(test);
	const fs = require('fs');

	fs.appendFile('./index2.html', html, err => {
		if (err) {
			return console.log(err);
		}
		console.log('The file was saved!');
	});
});

lr.on('end', () => {
	console.log('done!');
});
