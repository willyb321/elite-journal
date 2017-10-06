/**
 * @file The main file. Controls most things
 * @author willyb321
 * @copyright MIT
 */

/**
 * @module Index
 */
console.time('Imports');
console.time('FullStart');
console.time('electron');
import {Menu, BrowserWindow, dialog, ipcMain as ipc, shell} from 'electron';
console.timeEnd('electron');
console.time('path');
import path from 'path';
console.timeEnd('path');
console.time('os');
import os from 'os';
console.timeEnd('os');
console.time('autoupdater');
import {autoUpdater} from 'electron-updater';
console.timeEnd('autoupdater');
console.time('fs-extra');
import fs from 'fs-extra';
console.timeEnd('fs-extra');
console.time('pug');
import pug from 'pug';
console.timeEnd('pug');
console.time('isDev');
import isDev from 'electron-is-dev';
console.timeEnd('isDev');
console.time('about');
import openAboutWindow from 'about-window';
console.timeEnd('about');
console.time('winstate');
import windowStateKeeper from 'electron-window-state';
console.timeEnd('winstate');
console.time('readLog');
import {getLogPath, readLog} from '../lib/log-process';
console.timeEnd('readLog');
console.time('watchLog');
import {watchGood} from '../lib/watcher-process';
console.timeEnd('watchLog');
console.time('raven');
import Raven from'raven';
console.timeEnd('raven');
console.time('utils');
import {getMenuItem} from '../lib/utils';
console.timeEnd('utils');
console.time('debug');
require('electron-debug')();
console.timeEnd('debug');
console.timeEnd('Imports');
const app = require('electron').app;

export let win;
export const currentData = {
	log: null,
	events: [],
	filteringFor: null,
	currentPath: null
};
Raven.config('https://8f7736c757ed4d2882fc24a2846d1ce8:adbedad11d84421097182d6713727606@sentry.io/226655', {
	release: app.getVersion(),
	autoBreadcrumbs: true
}).install();

/** Autoupdater on update available */
autoUpdater.on('update-available', info => { // eslint-disable-line no-unused-vars
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'New update available.',
		message: 'Press OK to download the update, and the application will download the update and then tell you when its done. The version downloaded is: ' + info.version
	});
	win.loadURL(`file:///${__dirname}/../html/index.html`);
	const compiledReleaseNotes = pug.renderFile(path.join(__dirname, '..', 'releasenotes.pug'), {
		basedir: path.join(__dirname, '..'),
		version: info.version,
		notesHTML: info.releaseNotes
	});
	win.loadURL('data:text/html,' + compiledReleaseNotes, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
});
/** Autoupdater on downloaded */
autoUpdater.on('update-downloaded', () => { // eslint-disable-line no-unused-vars
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'Update ready to install.',
		message: 'The update is downloaded, and will be installed on quit.'
	});
});
/** Autoupdater if error */
autoUpdater.on('error', err => {
	Raven.captureException(err);
	dialog.showMessageBox({
		type: 'info',
		buttons: [],
		title: 'Update ready to install.',
		message: `Sorry, we've had an error. The message is ` + err
	});
});
/**
 * @description Emitted on download progress.
 */
autoUpdater.on('download-progress', percent => {
	win.setProgressBar(percent.percent, {mode: 'normal'});
});

export const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');

// Prevent window being garbage collected
let mainWindow;

/**
 * @description Makes the main window
 */
function createMainWindow() {
	let mainWindowState = windowStateKeeper({ // eslint-disable-line prefer-const
		defaultWidth: 1280,
		defaultHeight: 720
	});
	win = new BrowserWindow({
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
	getLogPath()
		.then(log => {
			readLog(log[0]);
		})
		.catch(() => {
			dialog.showMessageBox({type: 'info', title: 'No log selected.', message: 'Try again.'})
		});
});
ipc.on('watchLog', () => {
	watchGood(false);
	getMenuItem('Watch logs').checked = true;
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
			Raven.captureException(err);
		}
	});
	win.loadURL(`file:///${__dirname}/../html/index.html`);
	console.timeEnd('FullStart');
	// WatchGood();
	if (!isDev && process.env.NODE_ENV !== 'test') {
		autoUpdater.checkForUpdates();
	}
});

ipc.on('filter', (event, args) => {
	console.log(args);
	currentData.filteringFor = args;
	readLog(currentData.currentPath, args);
});

/**
 * When all windows are closed, quit the app.
 */
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

/**
 * Save current log as HTML.
 */
function saveHTML() {
	if (currentData.log) {
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
			fs.writeFile(fileName, currentData.log, err => {
				if (err) {
					Raven.captureException(err);
				}
			});
		})
	}
}

/**
 * Open current loaded log in default program.
 */
function rawLog() {
	if (Array.isArray(process.loadfile) === true) {
		shell.openItem(process.loadfile[0]);
	} else if (typeof process.loadfile === 'string') {
		shell.openItem(process.loadfile);
	} else {
		console.log(process.loadfile);
	}
}

const template = [{
	label: 'File',
	submenu: [{
		label: 'Save as HTML',
		accelerator: 'CmdOrCtrl+S',
		click: saveHTML
	}, {
		label: 'Load',
		accelerator: 'CmdOrCtrl+O',
		click: () => {
			getLogPath()
				.then(log => {
					readLog(log[0]);
				})
				.catch(() => {
					dialog.showMessageBox({type: 'info', title: 'No log selected.', message: 'Try again.'})
				});
		}
	}, {
		label: 'Homepage',
		click: () => {
			currentData.log = null;
			win.loadURL(`file:///${__dirname}/../html/index.html`);
		}
	}, {
		label: 'Watch logs',
		accelerator: 'CmdOrCtrl+L',
		type: 'checkbox',
		id: 'checked',
		click(checked) {
			const stop = true;
			console.log(checked.checked);
			if (checked.checked === true) {
				watchGood(false);
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
			icon_path: path.join(__dirname, '..', 'html', 'icon.png'), // eslint-disable-line camelcase
			bug_report_url: 'https://github.com/willyb321/elite-journal/issues', // eslint-disable-line camelcase
			homepage: 'https://github.com/willyb321/elite-journal'
		})
	}
	]
}];

export const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
