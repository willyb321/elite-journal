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
import Raven from 'raven';
Raven.config('https://8f7736c757ed4d2882fc24a2846d1ce8:adbedad11d84421097182d6713727606@sentry.io/226655', {
	release: require('electron').app.getVersion(),
	autoBreadcrumbs: true
}).install();
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
export function readLog(log, filter) {
	let toPug = [];
	let tablified = [];
	if (!filter) {
		filter = 'All Events';
	}
	currentData.currentPath = log;
	const lr = new LineByLineReader(log);
	lr.on('error', err => {
		Raven.captureException(err);
	});
	lr.on('line', line => {
		let parsed = JSON.parse(line);
		if (filter && parsed.event !== filter && filter !== 'All Events') {
			parsed = null;
		}
		if (parsed) {
			_.each(Object.keys(parsed), elem => {
				if (!(elem.endsWith('_Localised') || !parsed[elem].toString().startsWith('$'))) {
					delete parsed[elem];
				}
			});
			parsed.timestamp = moment(parsed.timestamp).format('h:mm a - D/M ');
			toPug.push(parsed);
			currentData.events.push(parsed.event);
			tablified.push(tableify(parsed, undefined, undefined, true));
		}
	});
	lr.on('end', err => {
		if (err) {
			Raven.captureException(err);
		} else {
			currentData.events = _.uniq(currentData.events);
			const filterLog = pug.renderFile(path.join(__dirname, '..', 'filter.pug'), {
				basedir: path.join(__dirname, '..'),
				events: currentData.events,
				currentEvent: filter || 'All Events'
			});
			const compiledLog = pug.renderFile(path.join(__dirname, '..', 'logload.pug'), {
				basedir: path.join(__dirname, '..'),
				data: toPug,
				tabled: tablified,
				filename: log,
				events: currentData.events,
				filterLog
			});
			currentData.log = compiledLog;
			webContents.getAllWebContents()[0].loadURL('data:text/html,' + compiledLog, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
			// webContents.getFocusedWebContents().loadURL('data:text/html,' + compiledLog, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
		}
	})
}
