/**
 * @file The file what controls opting out of bugsnag.
 * @author willyb321
 * @licence MIT
 */

/** global: stopdrop */
import {dialog} from 'electron';
import bugsnag from 'bugsnag';
import storage from 'electron-json-storage';
/**
 * @module
 */
/**
 * @description Allows one to opt-out of bugsnag reports.
 * @param yes - if yes === 0 then opt in, if === 1 opt out.
 */
export default function optOut(yes) {
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
