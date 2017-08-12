/**
 * @file The main file. Controls most things
 * @author willyb321
 * @copyright MIT
 */
/* eslint-disable no-undef */
/** global: LogWatcher */
import electron, {Menu, dialog, ipcMain as ipc, shell} from 'electron';
import path from 'path';
import os from 'os';
import {autoUpdater} from 'electron-updater';
import fs from 'fs-extra';
import tableify from 'tableify';
import _ from 'lodash';
import isDev from 'electron-is-dev';
import LineByLineReader from 'line-by-line';
import bugsnag from 'bugsnag';
import openAboutWindow from 'about-window';
import moment from 'moment';
import windowStateKeeper from 'electron-window-state';
import {LogWatcher} from '../lib/log-watcher';
const pug = require('pug');
require('electron-debug')();
const app = electron.app;
bugsnag.register('2ec6a43af0f3ef1f61f751191d6bd847', {appVersion: app.getVersion(), sendCode: true});
let win;
let currentLoaded;
let watcherData;
/** Autoupdater on update available */
autoUpdater.on('update-available', info => { // eslint-disable-line no-unused-vars
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'New update available.',
		message: 'Press OK to download the update, and the application will download the update and then tell you when its done. The version downloaded is: ' + info.version
	});
	win.loadURL(`file:///${__dirname}/../html/index.html`);
});
/** Autoupdater on downloaded */
autoUpdater.on('update-downloaded', (event, info) => { // eslint-disable-line no-unused-vars
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'Update ready to install.',
		message: 'The update is downloaded, and will be installed on quit.'
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
/**
 * @description Emitted on download progress.
 */
autoUpdater.on('download-progress', percent => {
	win.setProgressBar(percent.percent, {mode: 'normal'});
});

const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');

// Prevent window being garbage collected
let mainWindow;

/**
 * @description Makes the main window
 */
function createMainWindow() {
	let mainWindowState = windowStateKeeper({ // eslint-disable-line prefer-const
		defaultWidth: 600,
		defaultHeight: 400
	});
	win = new electron.BrowserWindow({
		show: false,
		x: mainWindowState.x,
		y: mainWindowState.y,
		width: mainWindowState.width,
		height: mainWindowState.height,
		backgroundColor: '#fff'
	});
	mainWindowState.manage(win);
	process.mainContents = win.webContents;
	win.on('closed', onClosed);
}

/**
 * Called by createMainWindow() on closing.
 */
function onClosed() {
	// Dereference the window
	// for multiple windows store them in an array
	mainWindow = null;
}
ipc.on('loadLog', () => {
	readLog();
});
ipc.on('watchLog', () => {
	watchGood(false);
	Menu.getApplicationMenu().items[0].submenu.items[3].checked = true;
});
/**
 * Called when app is ready, and checks for updates.
 */
app.on('ready', () => {
	mainWindow = createMainWindow();
	win.once('ready-to-show', () => {
		win.show();
	});
	fs.ensureDir(logPath, err => {
		if (err) {
			console.log(err);
		}
	});
	win.loadURL(`file:///${__dirname}/../html/index.html`);
	// WatchGood();
	if (!isDev && process.env.NODE_ENV !== 'test') {
		autoUpdater.checkForUpdates();
	}
});

function getLogPath() {
	return new Promise((resolve, reject) => {
		const files = dialog.showOpenDialog({
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
		if (files) {
			process.loadfile = files;
			resolve(files)
		} else {
			reject();
		}
	})
}

/**
 * @description New watching code. See lib/log-watcher.js for the info.
 * @param stop - if the watching should be stopped.
 */
function watchGood(stop) {
	const watcher = new LogWatcher(logPath);
	let toPug = [];
	let tablified = [];
	watcher.on('error', err => {
		bugsnag.notify(err);
	});
	watcher.on('finished', () => {
		console.log('it stopped');
		const compiledWatch = pug.renderFile(__dirname + '/../logload.pug', {
			basedir: path.join(__dirname, '..'),
			data: toPug,
			tabled: tablified
		});
		currentLoaded = compiledWatch;
		win.loadURL('data:text/html,' + compiledWatch, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
	});

	watcher.on('stopped', () => {
		console.log('nah its stopped');
	});
	watcher.on('data', obs => {
		obs.forEach(ob => {
			const parsed = ob;
			_.each(Object.keys(parsed), elem => {
				if (!(elem.endsWith('_Localised') || !parsed[elem].toString().startsWith('$'))) delete parsed[elem];
			});
			parsed.timestamp = moment(parsed.timestamp).format('h:mm a - D/M ');
			toPug.push(parsed);
			tablified.push(tableify(parsed));
		});
	});
	if (stop === 1) {
		watcher.stop();
	}
}
/**
 * When all windows are closed, quit the app.
 */
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
function saveHTML() {
	if (currentLoaded) {
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
			fs.writeFile(fileName, currentLoaded, err => {
				if (err) {
					console.log(err);
				}
			});
		})
	}
}



function readLog() {
	let log;
	let toPug = [];
	let tablified = [];
	getLogPath()
		.then(logs => {
			console.log(logs);
			log = logs[0];
			const lr = new LineByLineReader(log);
			lr.on('error', err => {
				console.log(err);
			});
			lr.on('line', line => {
				const parsed = JSON.parse(line);
				_.each(Object.keys(parsed), elem => {
					if (!(elem.endsWith('_Localised') || !parsed[elem].toString().startsWith('$'))) delete parsed[elem];
				});
				parsed.timestamp = moment(parsed.timestamp).format('h:mm a - D/M ');
				toPug.push(parsed);
				tablified.push(tableify(parsed));
			});
			lr.on('end', err => {
				if (err) {
					console.error(err);
				} else {
					const compiledLog = pug.renderFile(__dirname + '/../logload.pug', {
						basedir: path.join(__dirname, '..'),
							data: toPug,
							tabled: tablified,
							filename: log
					});
					currentLoaded = compiledLog;
					console.log(toPug[0]);
					console.log(tablified[0]);
					console.log(`${__dirname}${path.sep}`);
					win.loadURL('data:text/html,' + compiledLog, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
				}
			})
		})
		.catch(() => {
			dialog.showMessageBox({type: 'info', title: 'No log selected.', message: 'Try again.'})
		});
}

function rawLog() {
	if (Array.isArray(process.loadfile) === true) {
		shell.openItem(process.loadfile[0]);
	} else if (typeof process.loadfile === 'string') {
		shell.openItem(process.loadfile);
	} else {
		console.log(process.loadfile);
	}
}

/**
 * Menu constructor
 * @type {Array}
 */
const template = [{
	label: 'File',
	submenu: [{
		label: 'Save as HTML',
		accelerator: 'CmdOrCtrl+S',
		click: saveHTML
	}, {
		label: 'Load',
		accelerator: 'CmdOrCtrl+O',
		click: readLog
	}, {
		label: 'Homepage',
		click: () => {
			win.loadURL(`file:///${__dirname}/../html/index.html`);
		}
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
		click: rawLog
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
			shell.openExternal('http://electron.atom.io');
		}
	}, {
		label: 'The Github Repo',
		click() {
			shell.openExternal('https://github.com/willyb321/elite-journal');
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
			icon_path: path.join(__dirname, '..', 'icon.png'), // eslint-disable-line camelcase
			bug_report_url: 'https://github.com/willyb321/elite-journal/issues', // eslint-disable-line camelcase
			homepage: 'https://github.com/willyb321/elite-journal'
		})
	}
	]
}];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
