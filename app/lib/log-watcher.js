/**
 * @file The file that does the watcher processing.
 * @author willyb321
 * @copyright MIT
 */
/**
 * @module Watcher
 */
'use strict';
const events = require('events');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const debug = require('debug')('wotch');
const Raven = require('raven');

Raven.config('https://8f7736c757ed4d2882fc24a2846d1ce8:adbedad11d84421097182d6713727606@sentry.io/226655', {
	release: (!module.parent ? require('../package').version : require('electron').app.getVersion()),
	autoBreadcrumbs: true
}).install();

/**
 * Interval in MS to poll directory at.
 * @type {number}
 */
const POLL_INTERVAL = 1000;
/**
 * Default path to journal files for Elite.
 * @type {string}
 */
const DEFAULT_SAVE_DIR = path.join(
	os.homedir(),
	'Saved Games',
	'Frontier Developments',
	'Elite Dangerous'
);
/**
 * @class
 */
class LogWatcher extends events.EventEmitter {
	/**
	 * Construct the log watcher.
	 * @param dirpath {string} The directory to watch.
	 * @param maxfiles {number} Maximum amount of files to process.
	 */
	constructor(dirpath, maxfiles) {
		super();

		this._dirpath = dirpath || DEFAULT_SAVE_DIR;
		this._filter = isCommanderLog;
		this._maxfiles = maxfiles || 3;
		this._logDetailMap = {};
		this._ops = [];
		this._op = null;
		this._timer = null;
		this._die = false;

		this._loop();
	}

	/**
	 * Bury a file
	 * @param filename {string} File to bury.
	 */
	bury(filename) {
		debug('bury', {filename});
		this._logDetailMap[filename].tombstoned = true;
	}

	/**
	 * Stop running
	 */
	stop() {
		debug('stop');

		if (this._op === null) {
			clearTimeout(this._timer);
			this.emit('stopped');
		} else {
			this._ops.splice(this._ops.length);
			this._die = true;
		}
	}

	/**
	 * The main loop
	 */
	_loop() {
		debug('_loop', {opcount: this._ops.length});

		this._op = null;

		if (this._ops.length === 0) {
			this._timer = setTimeout(() => {
				this._ops.push(callback => this._poll(callback));
				setImmediate(() => this._loop());
			}, POLL_INTERVAL);
			return;
		}

		this._op = this._ops.shift();

		try {
			this._op(err => {
				if (err) {
					this.emit('error', err);
				} else if (this._die) {
					this.emit('stopped');
				} else {
					setImmediate(() => this._loop());
				}
			});
		} catch (err) {
			this.emit('error', err);
				// Assumption: it crashed BEFORE an async wait
				// otherwise, we'll end up with more simultaneous
				// activity
			setImmediate(() => this._loop());
		}
	}

	/**
	 * Poll the logs directory for new/updated files.
	 * @param callback {function}
	 */
	_poll(callback) {
		debug('_poll');

		const unseen = {};
		Object.keys(this._logDetailMap).forEach(filename => {
			if (!this._logDetailMap[filename].tombstoned) {
				unseen[filename] = true;
			}
		});

		fs.readdir(this._dirpath, (err, filenames) => {
			if (err) {
				callback(err);
			} else {
				const files = filenames.slice(filenames.length - this._maxfiles, filenames.length);
				files.forEach(filename => {
					filename = path.join(this._dirpath, filename);
					if (this._filter(filename)) {
						delete unseen[filename];
						this._ops.push(cb => this._statfile(filename, cb));
					}
				});

				Object.keys(unseen).forEach(filename => {
					this.bury(filename);
				});

				callback(null);
			}
		});
	}

	/**
	 * Stat the new/updated files in log directory
	 * @param filename {string} Path to file to get stats of.
	 * @param callback
	 */
	_statfile(filename, callback) {
		debug('_statfile', {filename});

		fs.stat(filename, (err, stats) => {
			if (err && err.code === 'ENOENT') {
				if (this._logDetailMap[filename]) {
					this.bury(filename);
				}
				callback(null); // File deleted
			} else if (err) {
				callback(err);
			} else {
				this._ops.push(cb => this._process(filename, stats, cb));
				callback(null);
			}
		});
	}

	/**
	 * Process the files
	 * @param filename {string} Filename to check
	 * @param stats {object} Last modified etc
	 * @param callback {function}
	 */
	_process(filename, stats, callback) {
		debug('_process', {filename, stats});
		let CURRENT_FILE = 0;
		setImmediate(callback, null);
		const info = this._logDetailMap[filename];

		if (info === undefined && CURRENT_FILE < this._maxfiles) {
			this._logDetailMap[filename] = {
				ino: stats.ino,
				mtime: stats.mtime,
				size: stats.size,
				watermark: 0,
				tombstoned: false
			};
			CURRENT_FILE++;
			this._ops.push(cb => this._read(filename, cb));
			return;
		}

		if (info.tombstoned) {
			return;
		}

		if (info.ino !== stats.ino) {
				// File replaced... can't trust it any more
				// if the client API supported replay from scratch, we could do that
				// but we can't yet, so:
			CURRENT_FILE = 0;
			this.bury(filename);
		} else if (stats.size > info.size) {
				// File not replaced; got longer... assume append
			this._ops.push(cb => this._read(filename, cb));
		} else if (info.ino === stats.ino && info.size === stats.size) {
				// Even if mtime is different, treat it as unchanged
				// e.g. ^Z when COPY CON to a fake log
				// don't queue read
		}

		info.mtime = stats.mtime;
		info.size = stats.size;
	}

	/**
	 * Read the files
	 * @param filename {string} The filename to read.
	 * @param callback {function}
	 */
	_read(filename, callback) {
		const {watermark, size} = this._logDetailMap[filename];
		debug('_read', {filename, watermark, size});

		let leftover = Buffer.from('', 'utf8');

		const s = fs.createReadStream(filename, {
			flags: 'r',
			start: watermark,
			end: size
		});
		const finish = err => {
			if (err) {
					// On any error, emit the error and bury the file.
				this.emit('error', err);
				this.bury(filename);
			}
			setImmediate(callback, null);
			callback = () => {
			}; // No-op
		};
		s.once('error', finish);

		s.once('end', finish);

		s.on('data', chunk => {
			const sThis = this;
			Raven.context(function () {
				Raven.captureBreadcrumb({
					data: {
						chunk: chunk.toString()
					}
				});
				const idx = chunk.lastIndexOf('\n');
				if (idx < 0) {
					leftover = Buffer.concat([leftover, chunk]);
				} else {
					sThis._logDetailMap[filename].watermark += idx + 1;
					try {
						const obs = Buffer.concat([leftover, chunk.slice(0, idx + 1)])
							.toString('utf8')
							.replace(/\u000e/igm, '')
							.replace(/\u000f/igm, '')
							.split(/[\r\n]+/)
							.filter(l => l.length > 0)
							.map(l => {
								try {
									return JSON.parse(l)
								} catch (e) {
									debug('json.parse error', {line: l});
									Raven.context(function () {
										Raven.captureBreadcrumb({
											message: 'File that crashed log watcher',
											data: {
												filename
											}
										});
										Raven.captureBreadcrumb({
											message: 'Log-watcher JSON.parse failed',
											data: {
												line: l,
												chunk: chunk.toString()
											}
										});
										Raven.captureException(e);
									})
								}
							});
						leftover = chunk.slice(idx + 1);
						setImmediate(() => sThis.emit('data', obs) && sThis.emit('finished'));
					} catch (err) {
						finish(err);
					}
				}
			});
		});
	}
	}
/**
 * Get the path of the logs.
 * @param fpath {string} Path to check.
 * @returns {boolean} True if the directory contains journal files.
 */
function isCommanderLog(fpath) {
	const base = path.basename(fpath);
	return base.indexOf('Journal.') === 0 && path.extname(fpath) === '.log';
}

module.exports = {
	LogWatcher,
	isCommanderLog
};

if (!module.parent) {
	process.on('uncaughtException', err => {
		console.error(err.stack || err);
		throw new Error(err.stack || err);
	});

	const watcher = new LogWatcher(DEFAULT_SAVE_DIR, 1040);
	watcher.on('error', err => {
		watcher.stop();
		console.error(err.stack || err);
		throw new Error(err.stack || err);
	});
	watcher.on('data', obs => {
		// obs.forEach(ob => {
		// 	const {timestamp, event} = ob;
		// 	console.log('\n' + timestamp, event);
		// 	delete ob.timestamp;
		// 	delete ob.event;
		// 	Object.keys(ob).sort().forEach(k => {
		// 		// console.log('\t' + k, ob[k]);
		// 	});
		// });
	});
}
