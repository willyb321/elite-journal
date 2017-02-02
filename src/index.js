/**
 * @file The main file. Controls most things
 * @author willyb321
 * @copyright MIT
 */
/* eslint-disable no-undef */
/** global: LogWatcher */
import electron, {Menu, dialog, ipcMain} from 'electron';
import path from 'path';
import os from 'os';
import {autoUpdater} from 'electron-updater';
import fs from 'fs-extra';
import tableify from 'tableify';
import _ from 'underscore';
import isDev from 'electron-is-dev';
import jsonfile from 'jsonfile';
import bugsnag from 'bugsnag';
import openAboutWindow from 'about-window';
import storage from 'electron-json-storage';
import moment from 'moment';
import shell from 'electron';

const app = electron.app;
bugsnag.register('2ec6a43af0f3ef1f61f751191d6bd847', {appVersion: app.getVersion(), sendCode: true});
let win;
/** Autoupdater on update available */
autoUpdater.on('update-available', info => { // eslint-disable-line no-unused-vars
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'New update available.',
		message: 'Press OK to download the update, and the application will download the update and then tell you when its done.'
	});
	win.loadURL(`file:///${__dirname}/index.html`);
});
/** Autoupdater on downloaded */
autoUpdater.on('update-downloaded', (event, info) => { // eslint-disable-line no-unused-vars
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'Update ready to install.',
		message: 'The update is downloaded, and will be installed on quit. The version downloaded is: ' + event.version
	});
});
/** Autoupdater if error */
autoUpdater.on('error', error => {
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'Update ready to install.',
		message: `Sorry, we've had an error. The message is ` + error
	});
	if (!isDev && uncaughtErr(error) !== {out: true}) {
		bugsnag.notify(error);
	}
});

autoUpdater.on('download-progress', percent => {
	win.setProgressBar(percent.percent, {mode: 'normal'});
	process.mainContents.executeJavaScript(`dlProgress(${Math.round(percent.percent * 100) / 100})`);
});
let loadFile;
const stopdrop = `<script>document.addEventListener('dragover', event => event.preventDefault()); document.addEventListener('drop', event => event.preventDefault()); const {ipcRenderer} = require('electron'); document.ondrop=(a=>{a.preventDefault();for(let b of a.dataTransfer.files)ipcRenderer.send("asynchronous-drop",b.path);return!1});</script>`;
const webview = `<webview id="foo" src="${__dirname}/filter.html" style="display:inline-flex; position:fixed; float: right; top:0;" nodeintegration="on"></webview>`;
let JSONParsedEvent = [];
let JSONParsed = []; // eslint-disable-line prefer-const
const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
const css = '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/node_modules/izitoast/dist/css/iziToast.css"><script src="https://use.fontawesome.com/a39359b6f9.js"></script><style>html, body{padding: 0;margin: 0;}#rectangle{width: 100%;height: 100%;background: red;}body{background-color: #313943;color: #bbc8d8;font-family: \'Lato\';font-size: 22px;font-weight: 500;line-height: 36px;margin-bottom: 36px;text-align: center;animation: fadein 0.5s;/* Cover the whole window */height: 100%;/* Make sure this matches the native window background color that you pass to * electron.BrowserWindow({...}), otherwise your app startup will look janky. */background: #313943;}header{position: absolute;width: 500px;height: 250px;top: 50%;left: 50%;margin-top: -125px;margin-left: -250px;text-align: center;}header h1{font-size: 60px;font-weight: 100;margin: 0;padding: 0;}#grad{background: -webkit-linear-gradient(left, #5A3F37, #2C7744);/* For Safari 5.1 to 6.0 */background: -o-linear-gradient(right, #5A3F37, #2C7744);/* For Opera 11.1 to 12.0 */background: -moz-linear-gradient(right, #5A3F37, #2C7744);/* For Firefox 3.6 to 15 */background: linear-gradient(to right, #5A3F37, #2C7744);/* Standard syntax */}hr{display: flex}@keyframes fadein{from{opacity: 0;}to{opacity: 1;}}.app{/* Disable text selection, or your app will feel like a web page */-webkit-user-select: none;-webkit-app-region: drag;/* Cover the whole window */height: 100%;/* Make sure this matches the native window background color that you pass to * electron.BrowserWindow({...}), otherwise your app startup will look janky. */background: #313943;/* Smoother startup */animation: fadein 0.5s;}body::-webkit-scrollbar{width: 1em;}body::-webkit-scrollbar-track{-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);}body::-webkit-scrollbar-thumb{background-color: darkgrey;outline: 1px solid slategrey;}</style><link href="https://fonts.googleapis.com/css?family=Lato:400,400italic,700" rel="stylesheet" type="text/css">';
// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();
// prevent window being garbage collected
let mainWindow;
/**
 * @description Makes the main window
 */
function createMainWindow() {
	win = new electron.BrowserWindow({
		width: 600,
		height: 400,
		backgroundColor: '#313943'
	});
	process.mainContents = win.webContents;
	win.on('closed', onClosed);
}
/**
 * Called by createMainWindow() on closing.
 */
function onClosed() {
	// dereference the window
	// for multiple windows store them in an array
	mainWindow = null;
}
/**
 * @description Checks whether user is opted in our out
 */
function opted() {
	storage.get('optOut', (err, data) => {
		if (err) {
			uncaughtErr(err);
		}
		return !(data.out === false || data.out === undefined);
	});
}

/**
 * Used by various functions to show a dialog for loading files into the program
 */
function dialogLoad() {
	return dialog.showOpenDialog({
		defaultPath: logPath,
		buttonLabel: 'Load File',
		filters: [{
			name: 'Logs and saved HTML/JSON',
			extensions: ['log', 'html', 'json']
		}, {
			name: 'All files',
			extensions: ['*']
		}]
	}, {
		properties: ['openFile']
	});
}
/**
 * On any uncaught exception notifys bugsnag and console logs the error.
 * @param err - The error.
 */
function uncaughtErr(err) {
	storage.get('optOut', (error, data) => {
		if (data && !error) {
			console.log(data);
			if (data.out === false) {
				bugsnag.notify(err);
				return data;
			} else if (data.out === true) {
				dialog.showErrorBox('Error!', 'Please report the following: \n' + err);
				return data;
			}
		} else {
			console.error(error.stack || error);
			return err;
		}
	});
	console.log('ERROR! The error is: ' + err || err.stack);
}
/**
 * @description catches uncaught errors.
 * @param err - The error.
 */
process.on('uncaughtException', err => {
	uncaughtErr(err);
});
/**
 * This is used for filtering.
 */
function getChecked() {
	ipcMain.on('asynchronous-message', (event, arg) => {
		if (arg === 'All Events') {
			win.loadURL('data:text/html,' + webview + '<hr>' + stopdrop + css + process.htmlDone); // eslint-disable-line no-useless-concat
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
/**
 * Used for sorting and filtering events.
 */
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
		win.loadURL('data:text/html,' + webview + css + '<hr>' + stopdrop + process.htmlDone); // eslint-disable-line no-useless-concat
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

/**
 * Used to populate the JSONParsedEvent array, which is used to load filtered logs.
 */
function findEvents() {
	for (let i = 0; i < JSONParsed.length; i++) {
		if (JSONParsed[i].event === process.filteredEvent) {
			JSONParsedEvent.push(JSONParsed[i]);
		}
	}
}
/**
 * Generates the html from JSONParsedEvent and loads it.
 */
function loadFilter() {
	findEvents();
	for (let i = 0; i < JSONParsedEvent.length; i++) {
		process.filteredHTML += tableify(JSONParsedEvent[i]) + '<hr>'; // eslint-disable-line prefer-const
	}
	process.filteredHTML = process.filteredHTML.replace('undefined', '');
	win.loadURL('data:text/html,' + webview + css + '<hr>' + stopdrop + process.filteredHTML); // eslint-disable-line no-useless-concat
}

/**
 * Code thats used to reduce duplication in loading.
 */
function loadInit() {
	let html = ''; // eslint-disable-line prefer-const
	process.alterateLoad = true;
	loadFile = dialogLoad();
	loadAlternate(loadFile, html);
}
/**
 * @description Used in loading files to get the extension more efficiently.
 * @param fname the filename to process.
 * @returns {string} the extension of the file.
 */
function whatLoading(fname) {
	return fname.substr((~-fname.lastIndexOf('.') >>> 0) + 2);
}

/**
 * @description Figures out how to load the file that was selected in loadInit()
 * @param loadFile an array with the full path of the file being loaded.
 * @param html
 */
function loadAlternate(loadFile, html) {
	if (Array.isArray(loadFile) === true) {
		loadFile = loadFile[0];
	} else if (typeof loadFile === 'string') {
		loadFile = loadFile
	}
	const loadIt = whatLoading(loadFile);
	console.log(loadIt);
	switch (loadIt) {
		case 'json':
			loadOutput();
			loadFile = '';
			break;
		case 'log':
			lineReader(loadFile, html);
			break;
		case 'html':
			win.loadURL(loadFile);
			break;
		default:
			dialog.showMessageBox({
				type: 'info',
				buttons: [],
				title: 'Please load a file first',
				message: 'Please load a file before attempting to save things that don\'t exist'
			});
	}
}
/**
 * Used to load a file by dropping it on the application
 */
function loadByDrop() {
	let html;
	JSONParsed = [];
	loadFile = [];
	loadFile.push(process.logDropPath);
	if ((/\.(json)$/i).test(process.logDropPath)) {
		loadOutputDropped();
		loadFile = '';
		process.logDropped = false;
	} else if ((/\.(log)$/i).test(process.logDropPath)) {
		lineReader(loadFile, html);
	} else if ((/\.(html)$/i).test(loadFile)) {
		win.loadURL(loadFile);
		loadFile = '';
	}
}

function rawLog(loadFile) {
	if (Array.isArray(loadFile) === true) {
		shell.openItem(loadFile[0]);
	} else if (typeof loadFile === 'string') {
		shell.openItem(loadFile);
	} else {
		console.log(loadFile)
	}
}

/**
 * Saves a loaded log as HTML
 */
function funcSaveHTML() {
	if (process.logLoaded === true) {
		dialog.showSaveDialog({
			filters: [{
				name: 'HTML',
				extensions: ['html']
			}]
		}, fileName => {
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
/**
 * @description Loads the JSON that the program outputted.
 */
function loadOutput() {
	JSONParsed = [];
	process.htmlDone = '';
	jsonfile.readFile(loadFile[0], (err, obj) => {
		if (err) {
			console.log(err.message);
		}
		for (const prop in obj) {
			if (!obj.hasOwnProperty(prop)) { // eslint-disable-line no-prototype-builtins
				// The current property is not a direct property of p
				continue;
			}
			process.htmlDone += tableify(obj[prop]) + '<hr>';
			JSONParsed.push(obj[prop]);
		}
		process.logLoaded = true;
		win.loadURL('data:text/html,' + css + '<hr>' + stopdrop + process.htmlDone);
	});
}
/**
 * @description Loads the JSON outputted by the program if it was dropped.
 */
function loadOutputDropped() {
	JSONParsed = [];
	process.htmlDone = '';
	jsonfile.readFile(process.logDropPath, (err, obj) => {
		if (err) {
			console.log(err.message);
		}
		for (const prop in obj) {
			if (!obj.hasOwnProperty(prop)) { // eslint-disable-line no-prototype-builtins
				// The current property is not a direct property of p
				continue;
			}
			process.htmlDone += tableify(obj[prop]) + '<hr>';
			JSONParsed.push(obj[prop]);
		}
		process.logLoaded = true;
		win.loadURL('data:text/html,' + css + '<hr>' + stopdrop + process.htmlDone);
	});
}
/**
 * @description Used to save loaded file as JSON.
 */
function funcSaveJSON() {
	if (process.logLoaded === true) {
		dialog.showSaveDialog({
			filters: [{
				name: 'JSON',
				extensions: ['json']
			}]
		}, fileName => {
			if (fileName === undefined) {
				console.log('You didn\'t save the file');
				return;
			}
			if (process.isFiltered === true) {
				jsonfile.writeFile(fileName, JSONParsedEvent, err => {
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
/**
 * @description New watching code. See lib/log-watcher.js for the info.
 * @param stop - if the watching should be stopped.
 */
function watchGood(stop) {
	process.logLoaded = true;
	const watcher = new LogWatcher(logPath);
	process.mainContents.executeJavaScript(`const iziToast = require('./node_modules/izitoast/dist/js/iziToast.js'); iziToast.show({title: 'Loading!', message: 'Please wait!', position: 'bottomCenter', image: 'icon.png', timeout: '10000'})`);
	watcher.on('error', err => {
		bugsnag.notify(err);
	});
	watcher.on('finished', () => {
		console.log('it stopped');
		process.htmlDone = process.htmlDone.replace('undefined', '');
		win.loadURL('data:text/html,' + stopdrop + `<script></script>` + process.htmlDone);
		process.mainContents.on('did-finish-load', () => {
			fs.readFile(path.join(__dirname, 'index.css'), 'utf-8', (err, data) => {
				if (!err) {
					const formattedData = data.replace(/\s{2,10}/g, ' ').trim();
					process.mainContents.insertCSS(formattedData);
					process.mainContents.executeJavaScript(`function scroll() {window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);} scroll()`);
				} else if (err) {
					uncaughtErr(err);
				}
			});
		});
	});

	watcher.on('stopped', () => {
		console.log('nah its stopped');
	});
	watcher.on('data', obs => {
		obs.forEach(ob => {
			const {timestamp, event} = ob;
			JSONParsed.push('\n' + event, timestamp); // eslint-disable-line no-useless-concat
			process.htmlDone += '<hr>' + tableify(event + ` @ ${moment(timestamp).format('h:mm a - D/M ')}` + '<br>'); // eslint-disable-line no-useless-concat
			// console.log('\n' + timestamp, event);
			delete ob.timestamp;
			delete ob.event;
			Object.keys(ob).forEach(k => {
				if (k.endsWith('_Localised') || !ob[k].toString().startsWith('$')) {
					if (k === 'StarPos') {
						process.htmlDone += '(x / y / z) <br>' + tableify(ob[k].join('<br>')) + '<br>';
					} else if (k === 'Systems') {
						process.htmlDone += 'Systems Sold: <br>' + tableify(ob[k].join('<br>')) + '<br>';
					} else if (k === 'Materials') {
						let objtoarr = _.pairs(ob[k]); // eslint-disable-line prefer-const
						let objtoarrmerged = [].concat.apply([], objtoarr);
						objtoarrmerged = _.each(objtoarrmerged, (element, index, list) => {
							if (!isNaN(parseInt(element, 0))) {
								list[index] = element.toString() + '% <br>';
							}
						});
						process.htmlDone += k + ':<br>' + tableify(_.flatten(objtoarrmerged).join(' '));
					} else if (typeof ob[k] === 'object') {
						let objtoarr = _.pairs(ob[k]); // eslint-disable-line prefer-const
						const objtoarrmerged = [].concat.apply([], objtoarr);
						process.htmlDone += k + ':<br>' + tableify(_.flatten(objtoarrmerged).join(' <br>')) + ' <br> ';
					} else if (k === 'Ingredients') {
						let objtoarr = _.pairs(ob[k]); // eslint-disable-line prefer-const
						let objtoarrmerged = [].concat.apply([], objtoarr); // eslint-disable-line prefer-const
						process.htmlDone += k + ':<br>' + tableify(_.flatten(objtoarrmerged).join(' <br>')) + ' <br> ';
					} else {
						process.htmlDone += tableify(k) + ': ' + tableify(ob[k]) + '<br>';
						console.log('\t' + k, ob[k]);
						JSONParsed.push(k + '\n' + ob[k]);
					}
				}
			});
		});
	});
	if (stop === 1) {
		watcher.stop();
		process.logLoaded = false;
	}
}

/**
 * Called when all windows are closed.
 */
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
/**
 * Makes the main window.
 */
app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});
/**
 * Called when a file is dropped.
 */
ipcMain.on('asynchronous-drop', (event, arg) => {
	process.logDropPath = '';
	console.log(arg);
	process.logDropPath = arg;
	process.logDropped = true;
	loadByDrop();
	process.logDropped = false;
	console.log('waddup');
});
/**
 * Called when app is ready, and checks for updates.
 */
app.on('ready', () => {
	opted();
	mainWindow = createMainWindow();
	win.loadURL(`file:///${__dirname}/index.html`);
	// watchGood();
	if (!isDev && process.env.NODE_ENV !== 'test') {
		autoUpdater.checkForUpdates();
	}
});
/**
 * Menu constructor
 * @type {Array}
 */
const template = [{
	label: 'File',
	submenu: [{
		label: 'Save as HTML',
		accelerator: 'CmdOrCtrl+S',
		click: funcSaveHTML
	}, {
		label: 'Save as JSON',
		accelerator: 'CmdOrCtrl+Shift+S',
		click: funcSaveJSON
	}, {
		label: 'Load',
		accelerator: 'CmdOrCtrl+O',
		click: loadInit
	}, {
		label: 'Watch logs',
		accelerator: 'CmdOrCtrl+L',
		type: 'checkbox',
		id: 'checked',
		click(checked) {
			const stop = 1;
			console.log(checked.checked);
			if (checked.checked === true) {
				watchGood();
			} else if (checked.checked === false) {
				watchGood(stop);
			}
		}
	}, {
		label: 'Open raw log',
		click: rawLog(loadFile)
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
		click(focusedWindow) {
			if (focusedWindow) {
				win.reload();
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
	}, {
		label: 'What Version am I on?',
		click() {
			dialog.showMessageBox({
				type: 'info',
				buttons: [],
				title: 'Please load a file first',
				message: 'Current Version: ' + app.getVersion()
			});
		}
	}, {
		label: 'About',
		click: () => openAboutWindow({
			icon_path: path.join(__dirname, 'icon.png'), // eslint-disable-line camelcase
			bug_report_url: 'https://github.com/willyb321/elite-journal/issues', // eslint-disable-line camelcase
			homepage: 'https://github.com/willyb321/elite-journal'
		})
	}, {
		label: 'Opt-out of auto crash reporting.',
		type: 'checkbox',
		id: 'optout',
		checked: opted,
		click: optout => {
			let yes;
			if (optout.checked === false) {
				yes = 0;
				optOut(yes);
			} else if (optout.checked === true) {
				yes = 1;
				optOut(yes);
			}
		}
	}
	]
}];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
