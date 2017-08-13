/**
 * @file The file what opens watched logs.
 * @author willyb321
 * @copyright MIT
 */
import electron, {webContents} from 'electron';
import _ from 'lodash';
import moment from 'moment';
import pug from 'pug'
import tableify from 'tableify';
import {logPath, currentData} from '../main/index';
import path from 'path';
import bugsnag from 'bugsnag';
import {LogWatcher} from './log-watcher';
bugsnag.register('2ec6a43af0f3ef1f61f751191d6bd847', {appVersion: electron.app.getVersion(), sendCode: true});
/**
 * @description New watching code. See lib/log-watcher.js for the info.
 * @param stop - if the watching should be stopped.
 */
export function watchGood(stop) {
	const watcher = new LogWatcher(logPath);
	let toPug = [];
	let tablified = [];
	watcher.on('error', err => {
		bugsnag.notify(err);
	});
	watcher.on('finished', () => {
		console.log('it stopped');
		const compiledWatch = pug.renderFile(path.join(__dirname, '..', 'logload.pug'), {
			basedir: path.join(__dirname, '..'),
			data: toPug,
			tabled: tablified
		});
		currentData.log = compiledWatch;
		webContents.getFocusedWebContents().loadURL('data:text/html,' + compiledWatch, {baseURLForDataURL: `file://${path.join(__dirname, '..')}`});
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
			tablified.push(tableify(parsed));
		});
	});
	if (stop === 1) {
		watcher.stop();
	}
}
