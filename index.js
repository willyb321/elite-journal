'use strict';
const electron = require('electron');
const {Menu} = require('electron');
const {dialog} = require('electron');
const {ipcMain} = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs.extra');
const tableify = require('tableify');
const LineByLineReader = require('line-by-line');
const _ = require('underscore');
const GhReleases = require('electron-gh-releases');
const jsonfile = require('jsonfile');

const dragndrop = `<hr><webview id="bar" src="${__dirname}/drop.html" style="display:inline-flex; width:100%; height:75px" nodeintegration="on"></webview>`;
const webview = `<webview id="foo" src="${__dirname}/filter.html" style="display:inline-flex; width:400px; height:200px" nodeintegration="on"></webview>`;
let JSONParsedEvent = [];
const app = electron.app;
if (require('electron-squirrel-startup')) app.quit(); // eslint-disable-line curly

let loadFile;
const options = {
	repo: 'willyb321/elite-journal',
	currentVersion: app.getVersion()
};
const updater = new GhReleases(options);
// Check for updates
// `status` returns true if there is a new update available
updater.check((err, status) => {
	if (!err && status) {
		// Download the update
		updater.download();
	}
});
// When an update has been downloaded
updater.on('update-downloaded', info => { // eslint-disable-line no-unused-vars
	// Restart the app and install the update
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'Update available.',
		message: 'Press OK to install the update, and the application will download the update and then restart.'
	});
	updater.install();
});
// Access electrons autoUpdater
updater.autoUpdater; // eslint-disable-line no-unused-expressions
let JSONParsed = []; // eslint-disable-line prefer-const
const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
let win; // eslint-disable-line no-var
let htmlDone; // eslint-disable-line no-unused-vars
const css = '<script src="https://use.fontawesome.com/a39359b6f9.js"></script><style>html, body{padding: 0;margin: 0;}#rectangle{width: 100%;height: 100%;background: red;}body{background-color: #313943;color: #bbc8d8;font-family: \'Lato\';font-size: 22px;font-weight: 500;line-height: 36px;margin-bottom: 36px;text-align: center;animation: fadein 0.5s;/* Cover the whole window */height: 100%;/* Make sure this matches the native window background color that you pass to * electron.BrowserWindow({...}), otherwise your app startup will look janky. */background: #313943;}header{position: absolute;width: 500px;height: 250px;top: 50%;left: 50%;margin-top: -125px;margin-left: -250px;text-align: center;}header h1{font-size: 60px;font-weight: 100;margin: 0;padding: 0;}#grad{background: -webkit-linear-gradient(left, #5A3F37, #2C7744);/* For Safari 5.1 to 6.0 */background: -o-linear-gradient(right, #5A3F37, #2C7744);/* For Opera 11.1 to 12.0 */background: -moz-linear-gradient(right, #5A3F37, #2C7744);/* For Firefox 3.6 to 15 */background: linear-gradient(to right, #5A3F37, #2C7744);/* Standard syntax */}hr{color: red;}@keyframes fadein{from{opacity: 0;}to{opacity: 1;}}.app{/* Disable text selection, or your app will feel like a web page */-webkit-user-select: none;-webkit-app-region: drag;/* Cover the whole window */height: 100%;/* Make sure this matches the native window background color that you pass to * electron.BrowserWindow({...}), otherwise your app startup will look janky. */background: #313943;/* Smoother startup */animation: fadein 0.5s;}</style><link href="https://fonts.googleapis.com/css?family=Lato:400,400italic,700" rel="stylesheet" type="text/css">';
// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();
// prevent window being garbage collected
let mainWindow;

function createMainWindow() {
	win = new electron.BrowserWindow({
		width: 600,
		height: 400,
		backgroundColor: '#313943'
	});
	process.mainContents = win.webContents;
	win.on('closed', onClosed);
}

function onClosed() {
	// dereference the window
	// for multiple windows store them in an array
	mainWindow = null;
}

function dialogLoad() {
	return dialog.showOpenDialog({
		defaultPath: logPath,
		buttonLabel: 'Load File',
		filters: [{
			name: 'Logs and saved HTML',
			extensions: ['log', 'html']
		}, {
			name: 'All files',
			extensions: ['*']
		},
			name: 'Saved JSON',
			extensions: ['json']
		]
	}, {
		properties: ['openFile']
	});
}
process.on('uncaughtException', err => {
	console.log('ERROR! The error is: ' + err.message);
});

function getChecked() {
	ipcMain.on('asynchronous-message', (event, arg) => {
		if (arg === 'All Events') {
			win.loadURL('data:text/html,' + webview + dragndrop + '<hr>' + css + process.htmlDone); // eslint-disable-line no-useless-concat
		} else {
			console.log(arg);
			process.filteredEvent = arg;
			JSONParsedEvent = [];
			process.filteredHTML = '';
			loadFilter();
			process.isFiltered = true;
		}
	});
	ipcMain.on('asynchronous-message-value', (event, arg) => {
		process.selectedValue = arg;
		console.log(arg);
		event.sender.send('asynchronous-reply', arg);
	});
}

function sortaSorter() {
	if (process.logLoaded === true) {
		process.filterOpen = true;
		const filterList = _.pluck(JSONParsed, 'event');
		process.unique = filterList.filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
		process.unique = process.unique.sort();
		global.eventsFilter = {
			prop1: process.unique
		};
		win.loadURL('data:text/html,' + webview + css + dragndrop + '<hr>' + process.htmlDone); // eslint-disable-line no-useless-concat
		getChecked();
	} else {
		dialog.showMessageBox({
			type: 'info',
			buttons: [],
			title: 'Please load a file first',
			message: 'Please load a file before attempting to filter things that don\'t exist'
		});
	}
}

function findEvents() {
	for (let i = 0; i < JSONParsed.length; i++) {
		if (JSONParsed[i].event === process.filteredEvent) {
			JSONParsedEvent.push(JSONParsed[i]);
		}
	}
}

function loadFilter() {
	findEvents();
	for (let i = 0; i < JSONParsedEvent.length; i++) {
		process.filteredHTML += tableify(JSONParsedEvent[i]) + '<hr>'; // eslint-disable-line prefer-const
	}
	process.filteredHTML = process.filteredHTML.replace('undefined', '');
	win.loadURL('data:text/html,' + webview + css + dragndrop + '<hr>' + process.filteredHTML); // eslint-disable-line no-useless-concat
}

function loadAlternate() {
	let html;
	process.alterateLoad = true;
	loadFile = dialogLoad();
	if (loadFile !== undefined) {
		JSONParsed = [];
		const lr = new LineByLineReader(loadFile[0]);
		lr.on('error', err => {
			console.log(err);
		});
		lr.on('line', function (line) { // eslint-disable-line prefer-arrow-callback
			let lineParse = JSON.parse(line); // eslint-disable-line prefer-const
			JSONParsed.push(lineParse);
			let htmlTabled = tableify(lineParse) + '<hr>'; // eslint-disable-line prefer-const
			html += htmlTabled;
		});
		lr.on('end', err => {
			if (err) {
				console.log(err.message);
			}
			process.htmlDone = html;
			process.htmlDone = process.htmlDone.replace('undefined', '');
			win.loadURL('data:text/html,' + css + dragndrop + '<hr>' + process.htmlDone);
			process.logLoaded = true;
			loadFile = '';
		});
	}
}

function loadByDrop() {
	let html;
	process.alterateLoad = true;
	JSONParsed = [];
	const lr = new LineByLineReader(process.logDropPath);
	lr.on('error', err => {
		console.log(err);
	});
	lr.on('line', function (line) { // eslint-disable-line prefer-arrow-callback
		let lineParse = JSON.parse(line); // eslint-disable-line prefer-const
		JSONParsed.push(lineParse);
		let htmlTabled = tableify(lineParse) + '<hr>'; // eslint-disable-line prefer-const
		html += htmlTabled;
	});
	lr.on('end', err => {
		if (err) {
			console.log(err.message);
		}
		process.htmlDone = html;
		process.htmlDone = process.htmlDone.replace('undefined', '');
		win.loadURL('data:text/html,' + css + dragndrop + '<hr>' + process.htmlDone);
		process.logLoaded = true;
		loadFile = '';
		process.logDropped = false;
	});
}

function funcSave() {
	if (process.logLoaded === true) {
		dialog.showSaveDialog(fileName => {
			if (fileName === undefined) {
				console.log('You didn\'t save the file');
				return;
			}
			// fileName is a string that contains the path and filename created in the save file dialog.
			if (process.isFiltered === true) {
				fs.writeFile(fileName, css + process.filteredHTML, err => {
					if (err) {
						console.log(err.message);
					}
				});
			} else {
				fs.writeFile(fileName, css + process.htmlDone, err => {
					if (err) {
						console.log(err.message);
					}
				});
			}
		});
	} else {
		dialog.showMessageBox({
			type: 'info',
			buttons: [],
			title: 'Please load a file first',
			message: 'Please load a file before attempting to save things that don\'t exist'
		});
	}
}

function loadOutput() {
	const loadFile = dialogLoad();
	jsonfile.readFile(loadFile[0], {spaces: 2}, (err, obj) => {
		console.dir(obj);
		console.log(err);
	});
}

function funcSaveJSON() {
	if (process.logLoaded === true) {
		dialog.showSaveDialog(fileName => {
			if (fileName === undefined) {
				console.log('You didn\'t save the file');
				return;
			}
			if (process.isFiltered === true) {
				const JSONParsedEventSave = JSON.stringify(JSONParsedEvent);
				jsonfile.writeFile(fileName, JSONParsedEventSave, err => {
					console.error(err);
				});
			} else {
				jsonfile.writeFile(fileName, JSONParsed, err => {
					console.error(err);
				});
			}
		});
	} else {
		dialog.showMessageBox({
			type: 'info',
			buttons: [],
			title: 'Please load a file first',
			message: 'Please load a file before attempting to save things that don\'t exist'
		});
	}
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
ipcMain.on('asynchronous-drop', (event, arg) => {
	console.log(arg);
	process.logDropPath = arg;
	process.logDropped = true;
	loadByDrop();
});
app.on('ready', () => {
	mainWindow = createMainWindow();
	win.loadURL(`file:///${__dirname}/index.html`);
});
const template = [{
	label: 'File',
	submenu: [{
		label: 'Save as HTML',
		accelerator: 'CmdOrCtrl+S',
		click: funcSave
	}, {
		label: 'Save as JSON',
		accelerator: 'CmdOrCtrl+Shift+S',
		click: funcSaveJSON
	}, {
		label: 'Load',
		accelerator: 'CmdOrCtrl+O',
		click: loadAlternate
	}, {
		label: 'Load outputted JSON',
		accelerator: 'CmdrOrCtrl+Shift+O',
		click: loadOutput
	}]
}, {
	label: 'Filtering',
	submenu: [{
		label: 'Filter for:',
		accelerator: 'CmdOrCtrl+F',
		click: sortaSorter
	}]
}, {
	label: 'Edit',
	submenu: [{
		role: 'selectall'
	}]
}, {
	label: 'View',
	submenu: [{
		label: 'Reload',
		accelerator: 'CmdOrCtrl+R',
		click(item, focusedWindow) {
			if (focusedWindow) {
				focusedWindow.reload();
			}
		}
	}, {
		role: 'togglefullscreen'
	}]
}, {
	role: 'window',
	submenu: [{
		role: 'minimize'
	}, {
		role: 'close'
	}]
}, {
	role: 'help',
	submenu: [{
		label: 'Learn More about Electron',
		click() {
			require('electron').shell.openExternal('http://electron.atom.io');
		}
	}, {
		label: 'The Github Repo',
		click() {
			require('electron').shell.openExternal('https://github.com/willyb321/elite-journal');
		}
	}]
}
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
