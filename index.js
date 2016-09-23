'use strict';
const fs = require('fs');
const electron = require('electron');
const tableify = require('tableify');
const {dialog} = require('electron');
const LineByLineReader = require('line-by-line');

const app = electron.app;
let file;
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
	file = dialog.showOpenDialog({properties: ['openFile', 'multiSelections']});

	win.on('closed', onClosed);
	const lr = new LineByLineReader(file[0]);

	lr.on('error', err => {
		return console.log(err);
	});

	lr.on('line', line => {
		const lineParse = JSON.parse(line);
		const html = tableify(lineParse);
		fs.appendFile(`${process.resourcesPath}/index2.html`, html, err => {
			if (err) {
				return console.log(err);
			}
		});
		fs.appendFile(`${process.resourcesPath}/index2.html`, '<hr>', err => {
			if (err) {
				return console.log(err);
			}
		});
	});
	fs.appendFile(`${process.resourcesPath}/index2.html`, '<script src="https://use.fontawesome.com/a39359b6f9.js"></script><link rel="stylesheet" href="./app.asar/index.css"><link href="https://fonts.googleapis.com/css?family=Lato:400,400italic,700" rel="stylesheet" type="text/css">', err => {
		if (err) {
			return console.log(err);
		}
	});
	lr.on('end', () => {
		console.log('done!');
		console.log('The file was saved!');
		win.loadURL(`file://${process.resourcesPath}/index2.html`);
	});
	return win;
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
	fs.writeFile(`${process.resourcesPath}/index2.html`, '', err => {
		if (err) {
			return console.log(err);
		}
	});
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', () => {
	mainWindow = createMainWindow();
});
