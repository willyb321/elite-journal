'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs.extra');
const electron = require('electron');
const tableify = require('tableify');
const {dialog} = require('electron');
const LineByLineReader = require('line-by-line');

const JSONParsed = [];
const logPath = path.join(os.homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
const app = electron.app;
let loadFile;
let win; // eslint-disable-line no-var
let htmlDone; // eslint-disable-line no-unused-vars
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

	win.on('closed', onClosed);

// menu functions be here
}
function onClosed() {
// dereference the window
// for multiple windows store them in an array
	mainWindow = null;
}
function funcLoad() {
	loadFile = dialog.showOpenDialog({properties: ['openFile',
		{defaultPath: logPath}]});
	if (/\.[log]+$/i.test(loadFile) === true) {
		fs.writeFile(`${process.resourcesPath}/index2.html`, '', err => {
			if (err) {
				return console.log(err);
			}
		});
		readLine();
		win.loadURL(`file:///${loadFile}`);
	} else {
		console.log('Please load a .log file.');
	}
}
function readLine() {
	const loadPls = loadFile;
	const lr = new LineByLineReader(loadPls[0]);

	lr.on('error', err => {
		return console.log(err);
	});

	lr.on('line', line => {
		const lineParse = JSON.parse(line);
		JSONParsed.push(lineParse);
		const html = tableify(lineParse) + '<hr>';
		fs.appendFile(`${process.resourcesPath}/index2.html`, html, err => {
			if (err) {
				return console.log(err);
			}
		});
	});
	fs.appendFile(`${process.resourcesPath}/index2.html`, '<script src="https://use.fontawesome.com/a39359b6f9.js"></script><style>body {padding: 0; margin: 0; } body {background-color: #313943; color: #bbc8d8; font-family: \'Lato\'; font-size: 22px; font-weight: 500; line-height: 36px; margin-bottom: 36px; text-align: center; } header {position: absolute; width: 500px; height: 250px; top: 50%; left: 50%; margin-top: -125px; margin-left: -250px; text-align: center; } header h1 {font-size: 60px; font-weight: 100; margin: 0; padding: 0; } #grad {background: -webkit-linear-gradient(left, #5A3F37 , #2C7744); /* For Safari 5.1 to 6.0 */ background: -o-linear-gradient(right, #5A3F37 , #2C7744); /* For Opera 11.1 to 12.0 */ background: -moz-linear-gradient(right,#5A3F37 , #2C7744); /* For Firefox 3.6 to 15 */ background: linear-gradient(to right, #5A3F37 , #2C7744); /* Standard syntax */ } hr {color: red; }</style><link href="https://fonts.googleapis.com/css?family=Lato:400,400italic,700" rel="stylesheet" type="text/css">', err => {
		if (err) {
			return console.log(err);
		}
	});
	lr.on('end', () => {
		console.log('done!');
		console.log('The file was saved!');
		win.loadURL(`file://${process.resourcesPath}/index2.html`);
		// win.loadURL(`file://${process.resourcesPath}/index2.html`);
	});
	return win;
}
// function readLineMemory(converted) {
// 	// var html = '';
// 	loadFile = dialog.showOpenDialog({properties: ['openFile']});
// 	console.log(loadFile);
// 	var lr = new LineByLineReader(loadFile[0]);
// 	lr.on('error', err => {
// 		return console.log(err);
// 	});
// 	lr.on('line', function (line) {
// 		const lineParse = JSON.parse(line);
// 		JSONParsed.push(lineParse);
// 		var htmlTabled = tableify(lineParse) + '<hr>';
// 		html = html + htmlTabled;
// 	});
// 	lr.on('end', function () {
// 		html = 'data:text/html,' + html;
// 	});
// 	converted = html;
// }
// function lineMem(converted) {
// 	var html;
// 	loadFile = dialog.showOpenDialog({properties: ['openFile']});
// 	// console.log(loadFile);
// 	var lr = new LineByLineReader(loadFile[0]);
// 	lr.on('error', err => {
// 		return console.log(err);
// 	});
// 	lr.on('line', function (line) {
// 		let lineParse = JSON.parse(line);
// 		JSONParsed.push(lineParse);
// 		let htmlTabled = tableify(lineParse) + '<hr>';
// 		html = html + htmlTabled;
// 		process.htmlDone += html;
// 	});
// 	lr.on('end', function () {
// 		process.htmlDone = html;
// 	});
// }
// function test() {
// 	var willy = (lineMem(vampire));
// 	console.log(process.htmlDone);
// 	win.loadURL('data:text/html,' + encodeURIComponent(process.htmlDone));
// }
function funcSave() {
	dialog.showSaveDialog(fileName => {
		if (fileName === undefined) {
			console.log('You didn\'t save the file');
			return;
		}
// fileName is a string that contains the path and filename created in the save file dialog.
		fs.copy(`${process.resourcesPath}/index2.html`, fileName, err => {
			if (err) {
				console.log(err.message);
			}
		});
	}
);
}
function funcSaveJSON() {
	dialog.showSaveDialog(fileName => {
		if (fileName === undefined) {
			console.log('You didn\'t save the file');
			return;
		}
		const JSONParsedSave = JSON.stringify(JSONParsed);
		fs.writeFile(fileName, JSONParsedSave, err => {
			if (err) {
				console.log(err.message);
			}
		});
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
});

const {Menu} = require('electron');

const template = [
	{
		label: 'File',
		submenu: [
	{label: 'Save as HTML', click: funcSave},
	{label: 'Save as JSON', click: funcSaveJSON},
	{label: 'Load', click: funcLoad},
	{label: 'Load log(alternate)', click() {
		let html;
		loadFile = dialog.showOpenDialog({properties: ['openFile']});
	// console.log(loadFile);
		const lr = new LineByLineReader(loadFile[0]);
		lr.on('error', err => {
			return console.log(err);
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
			win.loadURL('data:text/html,' + css + process.htmlDone);
		});
	}}

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
				label: 'Learn More',
				click() {
					require('electron').shell.openExternal('http://electron.atom.io');
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
