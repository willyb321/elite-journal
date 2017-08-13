/**
 * @file The file what opens logs.
 * @author willyb321
 * @copyright MIT
 */
/**
 * @module Reader
 */
import LineByLineReader from 'line-by-line';
import {dialog, webContents} from 'electron';
import _ from 'lodash';
import moment from 'moment';
import pug from 'pug'
import tableify from 'tableify';
import {logPath, currentData} from '../main/index';
import path from 'path';

/**
 * Opens dialog that returns the path of a log file.
 * @returns {Promise} Array with path.
 */
export function getLogPath() {
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
 * Reads log files line by line, then compiles with Pug and loads it.
 */
export function readLog() {
	let log;
	let toPug = [];
	let tablified = [];
	getLogPath()
		.then(logs => {
			log = logs[0];
			const lr = new LineByLineReader(log);
			lr.on('error', err => {
				console.log(err);
			});
			lr.on('line', line => {
				const parsed = JSON.parse(line);
				_.each(Object.keys(parsed), elem => {
					if (!(elem.endsWith('_Localised') || !parsed[elem].toString().startsWith('$'))) {
						delete parsed[elem];
					}
				});
				parsed.timestamp = moment(parsed.timestamp).format('h:mm a - D/M ');
				toPug.push(parsed);
				tablified.push(tableify(parsed));
			});
			lr.on('end', err => {
				if (err) {
					console.error(err);
				} else {
					const compiledLog = pug.renderFile(path.join(__dirname, '..', 'logload.pug'), {
						basedir: path.join(__dirname, '..'),
						data: toPug,
						tabled: tablified,
						filename: log
					});
					currentData.log = compiledLog;
					webContents.getFocusedWebContents().loadURL('data:text/html,' + compiledLog, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
				}
			})
		})
		.catch(() => {
			dialog.showMessageBox({type: 'info', title: 'No log selected.', message: 'Try again.'})
		});
}
