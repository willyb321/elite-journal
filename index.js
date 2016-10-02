'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs.extra');
const electron = require('electron');
const tableify = require('tableify');
const {dialog} = require('electron');
const LineByLineReader = require('line-by-line');
const _ = require('underscore');
const GhReleases = require('electron-gh-releases');
const {Menu} = require('electron');
const s = require('string');
const format = require('json-nice');

let JSONParsedEvent = [];
const app = electron.app;
if (require('electron-squirrel-startup')) return; // eslint-disable-line curly

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
	dialog.showMessageBox({type: 'info', buttons: [], title: 'Update ready to install', message: 'Press OK to install the update, and the application will do its thing.'});
	updater.install();
});

// Access electrons autoUpdater
updater.autoUpdater; // eslint-disable-line no-unused-expressions

let JSONParsed = []; // eslint-disable-line prefer-const
const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
let win; // eslint-disable-line no-var
let htmlDone; // eslint-disable-line no-unused-vars
let alternateLoad; // eslint-disable-line no-unused-vars
const css = '<script src="https://use.fontawesome.com/a39359b6f9.js"></script><style>body {padding: 0; margin: 0; } body {background-color: #313943; color: #bbc8d8; font-family: \'Lato\'; font-size: 22px; font-weight: 500; line-height: 36px; margin-bottom: 36px; text-align: center; } header {position: absolute; width: 500px; height: 250px; top: 50%; left: 50%; margin-top: -125px; margin-left: -250px; text-align: center; } header h1 {font-size: 60px; font-weight: 100; margin: 0; padding: 0; } #grad {background: -webkit-linear-gradient(left, #5A3F37 , #2C7744); /* For Safari 5.1 to 6.0 */ background: -o-linear-gradient(right, #5A3F37 , #2C7744); /* For Opera 11.1 to 12.0 */ background: -moz-linear-gradient(right,#5A3F37 , #2C7744); /* For Firefox 3.6 to 15 */ background: linear-gradient(to right, #5A3F37 , #2C7744); /* Standard syntax */ } hr {color: red; }</style><link href="https://fonts.googleapis.com/css?family=Lato:400,400italic,700" rel="stylesheet" type="text/css">';
// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();
// prevent window being garbage collected
let mainWindow;
function createMainWindow() {
	win = new electron.BrowserWindow({
		width: 600,
		height: 400
	});
	process.mainContents = win.webContents;
	win.on('closed', onClosed);

// menu functions be here
}
function onClosed() {
// dereference the window
// for multiple windows store them in an array
	mainWindow = null;
}
function dialogLoad() {
	return dialog.showOpenDialog({defaultPath: logPath, buttonLabel: 'Load File', filters: [{name: 'Logs and saved HTML', extensions: ['log', 'html']}, {name: 'All file', extensions: ['*']}]}, {properties: ['openFile']});
}
process.on('uncaughtException', err => {
	console.log('ERROR! ERROR: ' + err.message);
});
function getChecked() {
	const {ipcMain} = require('electron');

	ipcMain.on('asynchronous-message', (event, arg) => {
		if (arg === 'All Events') {
			win.loadURL('data:text/html,' + `<webview id="foo" src="${__dirname}/filter.html" style="display:inline-flex; width:400px; height:200px" nodeintegration="on"></webview>` + css + process.htmlDone); // eslint-disable-line no-useless-concat
		} else {
			console.log(arg);
			process.filteredEvent = arg;
			JSONParsedEvent = [];
			process.filteredHTML = '';
			loadFilter();
			process.isFiltered = true;
			event.sender.send('asynchronous-reply', arg);
		}});
	ipcMain.on('asynchronous-message-value', (event, arg) => {
		process.selectedValue = arg;
	});
}
function sortaSorter() {
	if (process.logLoaded === true) {
		process.filterOpen = true;
		const filterList = _.pluck(JSONParsed, 'event');
		process.unique = filterList.filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
		for (let i = 0; i < process.unique.length; i++) {
			process.htmlForm += ' ' + process.unique[i] + '<br>';
		}
		process.htmlFormStripped = s(process.htmlForm).strip('undefined');
		global.sharedObj = {prop1: process.htmlFormStripped};
		global.test = {prop1: process.unique};

		win.loadURL('data:text/html,' + `<webview id="foo" src="${__dirname}/filter.html" style="display:inline-flex; width:400px; height:200px" nodeintegration="on"></webview>` + css + '<hr>' + process.htmlDone); // eslint-disable-line no-useless-concat
		getChecked();
	} else {
		dialog.showMessageBox({type: 'info', buttons: [], title: 'Please load a file first', message: 'Please load a file before attempting to filter things that don\'t exist'});
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
	win.loadURL('data:text/html,' + `<webview id="foo" src="${__dirname}/filter.html" style="display:inline-flex; width:400px; height:200px" nodeintegration="on"></webview>` + `<script type="text/javascript">const webview=document.getElementById('foo');webview.addEventListener('dom-ready', ()=>{foo.document.getElementById("myForm").elements['plswork'].selectedIndex = ${process.selectedEvent}()})</script>` + css + '<hr>' + process.filteredHTML); // eslint-disable-line no-useless-concat
}
function loadAlternate() {
	let html;
	JSONParsed = [];
	process.alterateLoad = true;
	let loadFile = dialogLoad();
	const lr = new LineByLineReader(loadFile[0]);
	lr.on('error', err => {
		console.log(err);
	});
	lr.on('line', function (line) { // eslint-disable-line prefer-arrow-callback
		let lineParse = JSON.parse(line); // eslint-disable-line prefer-const
		JSONParsed.push(lineParse);
		let htmlTabled = tableify(lineParse) + '<hr>';  // eslint-disable-line prefer-const
		html += htmlTabled;
	});
	lr.on('end', err => {
		if (err) {
			console.log(err.message);
		}
		process.htmlDone = html;
		process.htmlDone = process.htmlDone.replace('undefined', '');
		win.loadURL('data:text/html,' + css + '<hr>' + process.htmlDone);
		process.logLoaded = true;
		loadFile = '';
	});
}
function funcSave() {
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
		}}
);
}
function funcSaveJSON() {
	dialog.showSaveDialog(fileName => {
		if (fileName === undefined) {
			console.log('You didn\'t save the file');
			return;
		}
		// const JSONParsedSave = JSON.stringify(JSONParsed);
		if (process.isFiltered === true) {
			const JSONParsedEventSave = JSON.stringify(JSONParsedEvent);
			fs.writeFile(fileName, JSONParsedEventSave, err => {
				if (err) {
					console.log(err.message);
				}
			});
		} else {
			fs.writeFile(fileName, format(JSONParsed), err => {
				if (err) {
					console.log(err.message);
				}
			});
		}
	});
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
	win.loadURL('data:text/html,' + css + '<br><h1>Please load a file using the "File" menu</h1>');
});

const template = [
	{
		label: 'File',
		submenu: [
{label: 'Save as HTML', click: funcSave},
{label: 'Save as JSON', click: funcSaveJSON},
{label: 'Load', accelerator: 'CmdOrCtrl+O', click: loadAlternate}
		]
	},
	{
		label: 'Filtering',
		submenu: [

{label: 'Filter for:', accelerator: 'CmdOrCtrl+F', click: sortaSorter}
		]
	},
	{
		label: 'Edit',
		submenu: [
			{
				role: 'selectall'
			}
		]
	},
	{
		label: 'View',
		submenu: [
			{
				label: 'Reload',
				accelerator: 'CmdOrCtrl+R',
				click(item, focusedWindow) {
					if (focusedWindow) {
						focusedWindow.reload();
					}
				}
			},
			{
				role: 'togglefullscreen'
			}
		]
	},
	{
		role: 'window',
		submenu: [
			{
				role: 'minimize'
			},
			{
				role: 'close'
			}
		]
	},
	{
		role: 'help',
		submenu: [
			{
				label: 'Learn More about Electron',
				click() {
					require('electron').shell.openExternal('http://electron.atom.io');
				}
			},
			{
				label: 'The Github Repo',
				click() {
					require('electron').shell.openExternal('https://github.com/willy321/elite-journal');
				}
			}
		]
	}
];

if (process.platform === 'darwin') {
	const name = require('electron').remote.app.getName();

	template.unshift({
		label: name,
		submenu: [
			{
				role: 'about'
			},
			{
				type: 'separator'
			},
			{
				role: 'services',
				submenu: []
			},
			{
				type: 'separator'
			},
			{
				role: 'hide'
			},
			{
				role: 'hideothers'
			},
			{
				role: 'unhide'
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]
	});
// Edit menu.
	template[1].submenu.push(
		{
			type: 'separator'
		},
		{
			label: 'Speech',
			submenu: [
				{
					role: 'startspeaking'
				},
				{
					role: 'stopspeaking'
				}
			]
		}
);
// Window menu.
	template[3].submenu = [
		{
			label: 'Close',
			accelerator: 'CmdOrCtrl+W',
			role: 'close'
		},
		{
			label: 'Minimize',
			accelerator: 'CmdOrCtrl+M',
			role: 'minimize'
		},
		{
			label: 'Zoom',
			role: 'zoom'
		},
		{
			type: 'separator'
		},
		{
			label: 'Bring All to Front',
			role: 'front'
		}
	];
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
