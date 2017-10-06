/**
 * @file The file what opens watched logs.
 * @author willyb321
 * @copyright MIT
 */
/**
 * @module Watcher-Process
 */
import {webContents} from 'electron';
import _ from 'lodash';
import moment from 'moment';
import pug from 'pug'
import tableify from 'tableify';
import {logPath, currentData, win} from '../main/index';
import path from 'path';
import {LogWatcher} from './log-watcher';
import Raven from 'raven';

Raven.config('https://8f7736c757ed4d2882fc24a2846d1ce8:adbedad11d84421097182d6713727606@sentry.io/226655', {
	release: require('electron').app.getVersion(),
	autoBreadcrumbs: true
}).install();
/**
 * @description New watching code. See lib/log-watcher.js for the info.
 * @param stop {boolean} - if the watching should be stopped.
 */
export function watchGood(stop) {
	const watcher = new LogWatcher(logPath, 3);
	let toPug = [];
	let tablified = [];
	watcher.on('error', err => {
		console.log('Error in watcher');
		Raven.captureException(err);
	});
	watcher.on('finished', () => {
		console.log('it stopped');
		currentData.events = _.uniq(currentData.events);
		const compiledWatch = pug.renderFile(path.join(__dirname, '..', 'logload.pug'), {
			basedir: path.join(__dirname, '..'),
			data: toPug,
			tabled: tablified,
			events: currentData.events
		});
		currentData.log = compiledWatch;
		win.loadURL('data:text/html,' + compiledWatch, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
	});

	watcher.on('stopped', () => {
		console.log('nah its stopped');
	});
	watcher.on('data', obs => {
		obs.forEach(ob => {
			const parsed = ob;
			_.each(Object.keys(parsed), elem => {
				if (!(elem.endsWith('_Localised') || !parsed[elem].toString().startsWith('$'))) {
					delete parsed[elem];
				}
			});
			parsed.timestamp = moment(parsed.timestamp).format('h:mm a - D/M ');
			toPug.push(parsed);
			currentData.events.push(parsed.event);
			tablified.push(tableify(parsed, undefined, undefined, true));
		});
	});
	if (stop) {
		watcher.stop();
	}
}
