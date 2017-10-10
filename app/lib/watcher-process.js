/**
 * @file The file what opens watched logs.
 * @author willyb321
 * @copyright MIT
 */
/**
 * @module Watcher-Process
 */
import _ from 'lodash';
import moment from 'moment';
import pug from 'pug'
import tableify from 'tableify';
import {logPath, currentData, win} from '../main/index';
import log from 'electron-log';
import path from 'path';
import {LogWatcher} from './log-watcher';
import Raven from 'raven';

let watcher;

Raven.config('https://8f7736c757ed4d2882fc24a2846d1ce8:adbedad11d84421097182d6713727606@sentry.io/226655', {
	release: require('electron').app.getVersion(),
	autoBreadcrumbs: true
}).install();
/**
 * @description New watching code. See lib/log-watcher.js for the info.
 * @param stop {boolean} - if the watching should be stopped.
 */
export function watchGood(stop) {
	if (!watcher) {
		watcher = new LogWatcher(logPath, 3);
	}
	currentData.watching = true;
	let toPug = [];
	let tablified = [];
	watcher.on('error', err => {
		log.info('Error in watcher');
		Raven.captureException(err);
	});
	watcher.on('finished', () => {
		currentData.watchingFinished++;
		log.info('Watcher finished a file');
		currentData.events = _.uniq(currentData.events);
		const compiledWatch = pug.renderFile(path.join(__dirname, '..', 'logload.pug'), {
			basedir: path.join(__dirname, '..'),
			data: toPug,
			watching: true,
			tabled: tablified,
			events: currentData.events
		});
		currentData.log = compiledWatch;
		if (currentData.watchingFinished === 3) {
			log.info('Loading data from watcher into window.');
			win.loadURL('data:text/html,' + compiledWatch, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
		}
	});

	watcher.on('stopped', () => {
		currentData.watching = false;
	});
	watcher.on('data', obs => {
		if (obs) {
			obs.forEach(ob => {
				const parsed = ob || {};
				_.each(Object.keys(parsed), elem => {
					if (parsed && elem && !(elem.endsWith('_Localised') || !parsed[elem].toString().startsWith('$'))) {
						delete parsed[elem];
					}
				});
				parsed.timestamp = moment(parsed.timestamp).format('h:mm a - D/M ');
				toPug.push(parsed);
				currentData.events.push(parsed.event);
				tablified.push(tableify(parsed, undefined, undefined, true));
			});
		}
	});
	if (stop) {
		watcher.stop();
		currentData.watching = false;
	}
}
