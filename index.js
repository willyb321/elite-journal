/**
 * @file The main file. Controls most things
 * @author willyb321
 */
const electron = require('electron');
const {Menu} = require('electron');
const {dialog} = require('electron');
const {ipcMain} = require('electron');
const path = require('path');
const os = require('os');
const {autoUpdater} = require('electron-auto-updater'); // eslint-disable-line no-unused-vars
const fs = require('fs-extra');
const tableify = require('tableify');
const LineByLineReader = require('line-by-line');
const _ = require('underscore');
const isDev = require('electron-is-dev');
const jsonfile = require('jsonfile');
const bugsnag = require('bugsnag');
const watch = require('node-watch');
const openAboutWindow = require('about-window').default;
const storage = require('electron-json-storage');
const LogWatcher = require('./lib/log-watcher.js').LogWatcher;

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
let watching;
let watcher;
let loadFile;
const stopdrop = `<script>document.addEventListener('dragover', event => event.preventDefault()); document.addEventListener('drop', event => event.preventDefault()); const {ipcRenderer} = require('electron'); document.ondrop=(a=>{a.preventDefault();for(let b of a.dataTransfer.files)ipcRenderer.send("asynchronous-drop",b.path);return!1});</script>`;
const webview = `<webview id="foo" src="${__dirname}/filter.html" style="display:inline-flex; position:fixed; float: right; top:0%;" nodeintegration="on"></webview>`;
let JSONParsedEvent = [];
let JSONParsed = []; // eslint-disable-line prefer-const
const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
let htmlDone; // eslint-disable-line no-unused-vars
const css = '<link rel="stylesheet" href="./node_modules/izitoast/dist/css/iziToast.min.css"><script src="https://use.fontawesome.com/a39359b6f9.js"></script><style>html, body{padding: 0;margin: 0;}#rectangle{width: 100%;height: 100%;background: red;}body{background-color: #313943;color: #bbc8d8;font-family: \'Lato\';font-size: 22px;font-weight: 500;line-height: 36px;margin-bottom: 36px;text-align: center;animation: fadein 0.5s;/* Cover the whole window */height: 100%;/* Make sure this matches the native window background color that you pass to * electron.BrowserWindow({...}), otherwise your app startup will look janky. */background: #313943;}header{position: absolute;width: 500px;height: 250px;top: 50%;left: 50%;margin-top: -125px;margin-left: -250px;text-align: center;}header h1{font-size: 60px;font-weight: 100;margin: 0;padding: 0;}#grad{background: -webkit-linear-gradient(left, #5A3F37, #2C7744);/* For Safari 5.1 to 6.0 */background: -o-linear-gradient(right, #5A3F37, #2C7744);/* For Opera 11.1 to 12.0 */background: -moz-linear-gradient(right, #5A3F37, #2C7744);/* For Firefox 3.6 to 15 */background: linear-gradient(to right, #5A3F37, #2C7744);/* Standard syntax */}hr{display: flex}@keyframes fadein{from{opacity: 0;}to{opacity: 1;}}.app{/* Disable text selection, or your app will feel like a web page */-webkit-user-select: none;-webkit-app-region: drag;/* Cover the whole window */height: 100%;/* Make sure this matches the native window background color that you pass to * electron.BrowserWindow({...}), otherwise your app startup will look janky. */background: #313943;/* Smoother startup */animation: fadein 0.5s;}</style><link href="https://fonts.googleapis.com/css?family=Lato:400,400italic,700" rel="stylesheet" type="text/css">';
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
		if (data) {
			console.log(data);
			if (data.out === false) {
				bugsnag.notify(err);
				return data;
			} else if (data.out === true) {
				dialog.showErrorBox('Error!', 'Please report the following: \n' + err);
				return data;
			}
		}
		if (error) {
			console.log(error);
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
 * @description Allows one to opt-out of bugsnag reports.
 * @param yes - if yes === 0 then opt in, if === 1 opt out.
 */
function optOut(yes) {
	storage.get('optOut', (error, data) => {
		if (data) {
			console.log(data);
			if (data.out === false) {
				console.log('in');
			} else if (data.out === true) {
				console.log('out');
			}
		}
		if (error) {
			console.log(error);
		}
	});
	if (yes === 1) {
		storage.set('optOut', {out: true}, err => {
			if (err) {
				console.log(err);
			}
			dialog.showMessageBox({
				type: 'info',
				buttons: [],
				title: 'Opted back into diagnostics',
				message: 'You have opted out of auto crash/error reporting.'
			});
			yes = undefined;
		});
	} else if (yes === 0) {
		storage.set('optOut', {out: false}, err => {
			if (err) {
				console.log(err);
				bugsnag.notify(new Error(err));
			}
			dialog.showMessageBox({
				type: 'info',
				buttons: [],
				title: 'Opted back into diagnostics',
				message: 'You have opted into auto crash/error reporting.'
			});
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
 * @param  {Array} loadFile - Array with path to loaded file.
 * @param  {String} html - HTML that was generated.
 * @param  {Boolean} watching - Whether or not logs are being watched.
 * @description Reads a loaded log line by line and generates JSONParsed.
 */
function lineReader(loadFile, html, watching) { // eslint-disable-line no-unused-vars
	JSONParsed = [];
	const lr = new LineByLineReader(loadFile[0]);
	lr.on('error', err => {
		console.log(err);
	});
	lr.on('line', line => {
		let lineParse = JSON.parse(line); // eslint-disable-line prefer-const
		JSONParsed.push(lineParse);
		let htmlTabled = tableify(lineParse) + '<hr>'; // eslint-disable-line prefer-const
		html += htmlTabled;
	});
	lr.on('end', err => {
		if (err) {
			console.log(err.message);
		}
		if (watching === true) { // eslint-disable-line no-negated-condition
			process.htmlDone = html;
			process.htmlDone = process.htmlDone.replace('undefined', '');
			watchOpen(JSONParsed);
		} else if (watching === false) {
			process.htmlDone = html;
			process.htmlDone = process.htmlDone.replace('undefined', '');
			win.loadURL('data:text/html,' + css + '<hr>' + stopdrop + process.htmlDone);
			process.logLoaded = true;
			loadFile = '';
		}
	}); // eslint-disable-line semi
}

/**
 * @param  {Array}
 * @return {String}
 * Not really very good, but it was used to check if a loaded log was line delimited or not.
 */
function logorjson(loadFile) {
	try {
		let obj = jsonfile.readFileSync(loadFile); // eslint-disable-line prefer-const
		JSON.parse(obj);
	} catch (err) {
		return err.name;
	}
}
/**
 * Code thats used to reduce duplication in loading.
 */
function loadInit() {
	let html;
	process.alterateLoad = true;
	loadFile = dialogLoad();
	let logorJSON = logorjson(loadFile); // eslint-disable-line prefer-const
	console.log(logorJSON);
	loadAlternate(logorJSON, loadFile, html);
}
/**
 * Figures out how to load the file that was selected in loadInit()
 * @param logorJSON
 * @param loadFile
 * @param html
 */
function loadAlternate(logorJSON, loadFile, html) {
	watching = false;
	if ((/\.(json)$/i).test(loadFile)) {
		loadOutput();
		loadFile = '';
		logorJSON = '';
	} else if ((/\.(log)$/i).test(loadFile)) {
		lineReader(loadFile, html, watching);
		logorJSON = '';
	} else if ((/\.(html)$/i).test(loadFile)) {
		win.loadURL(loadFile[0]);
		logorJSON = '';
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
	let logorJSON = logorjson(loadFile);
	console.log(logorJSON);
	if ((/\.(json)$/i).test(process.logDropPath)) {
		loadOutputDropped();
		loadFile = '';
		logorJSON = '';
		process.logDropped = false;
	} else if ((/\.(log)$/i).test(process.logDropPath) && logorJSON === 'SyntaxError') {
		lineReader(loadFile, html);
		logorJSON = '';
	} else if ((/\.(html)$/i).test(loadFile)) {
		win.loadURL(loadFile);
		loadFile = '';
		logorJSON = '';
	}
}
/**
 * Saves a loaded log as HTML
 */
function funcSaveHTML() {
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
/**
 * Loads the JSON that the program outputted.
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
 * Loads the JSON outputted by the program if it was dropped.
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
 * Used to save loaded file as JSON.
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
	process.mainContents.executeJavaScript(`const iziToast = require('izitoast'); iziToast.show({title: 'Loading!', message: 'Please wait!', position: 'bottomCenter', image: 'icon.png', timeout: '10000'})`);
	watcher.on('error', err => {
		bugsnag.notify(err);
	});
	watcher.on('finished', () => {
		console.log('it stopped');
		JSONParsed = JSONParsed.reverse();
		process.htmlDone = process.htmlDone.replace('undefined', '');
		win.loadURL('data:text/html,' + css + stopdrop + `<script>function scroll() {window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);} window.onload = scroll;</script>` + process.htmlDone);
		// JSONParsed = [];
		// process.htmlDone = '';
	});

	watcher.on('stopped', () => {
		console.log('nah its stopped');
	});
	watcher.on('data', obs => {
		// obs = obs.reverse();
		obs.forEach(ob => {
			const {timestamp, event} = ob;
			JSONParsed.push('\n' + event, timestamp); // eslint-disable-line no-useless-concat
			process.htmlDone += '<hr>' + tableify(event, timestamp);
			console.log('\n' + timestamp, event);
			delete ob.timestamp;
			delete ob.event;
			Object.keys(ob).forEach(k => {
				if (k === 'StarPos') {
					process.htmlDone += '(x / y / z) <br>' + tableify(ob[k].join('<br>')) + '<br>';
				} else if (k === 'Systems') {
					process.htmlDone += '<br>Systems Sold: <br>' + tableify(ob[k].join('<br>')) + '<br>';
				} else if (typeof ob[k] === 'object') {
					let objtoarr = _.allKeys(ob[k]); // eslint-disable-line prefer-const
					process.htmlDone += '<br>' + k + tableify(objtoarr.join('<br>')) + '<br>';
				} else {
					process.htmlDone += tableify(k) + ': ' + tableify(ob[k]) + '<br>';
					console.log('\t' + k, ob[k]);
					JSONParsed.push(k + ': ' + ob[k]);
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
});
/**
 * Called when app is ready, and checks for updates.
 */
app.on('ready', () => {
	opted();
	mainWindow = createMainWindow();
	win.loadURL(`file:///${__dirname}/index.html`);
	// watchGood();
	if (!isDev) {
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
