/**
 * @file The file what opens logs.
 * @author willyb321
 * @copyright MIT
 */
/* eslint-disable no-undef */
/** global: JSONParsed */
/** global: uncaughtErr */
/** global: stopdrop */
/** global: css */
/** global: win */
import LineByLineReader from 'line-by-line';
import tableify from 'tableify';
/**
 * @module
 */
/**
 * @param  {Array} loadFile - Array with path to loaded file.
 * @param  {String} html - HTML that was generated.
 * @description Reads a loaded log line by line and generates JSONParsed.
 */
export default function lineReader(loadFile, html) { // eslint-disable-line no-unused-vars
	JSONParsed = [];
	const lr = new LineByLineReader(loadFile[0]);
	lr.on('error', err => {
		console.log(err);
	});
	lr.on('line', line => {
		let lineParse = JSON.parse(line); // eslint-disable-line prefer-const
		JSONParsed.push(lineParse);
		html += tableify(lineParse) + '<hr>';
	});
	lr.on('end', err => {
		if (err) {
			uncaughtErr(err);
		}
		process.htmlDone = html;
		process.htmlDone = process.htmlDone.replace('undefined', '');
		win.loadURL('data:text/html,' + css + '<hr>' + stopdrop + process.htmlDone);
		process.logLoaded = true;
		loadFile = [];
	});
}
