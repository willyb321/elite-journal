'use strict';

const events = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');

const debug = require('debug')('wotch');

const POLL_INTERVAL = 1000;

const DEFAULT_SAVE_DIR = path.join(
	os.homedir(),
	'Saved Games',
	'Frontier Developments',
	'Elite Dangerous'
);

class LogWatcher extends events.EventEmitter {
	constructor(dirpath, filter) {
		super();

		this._dirpath = dirpath || DEFAULT_SAVE_DIR;
		this._filter = filter || isCommanderLog;

		this._logDetailMap = {};
		this._ops = [];
		this._op = null;
		this._timer = null;
		this._die = false;

		this._loop();
	}

	bury(filename) {
		debug('bury', {filename});
		this._logDetailMap[filename].tombstoned = true;
	}

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
			// assumption: it crashed BEFORE an async wait
			// otherwise, we'll end up with more simultaneous
			// activity
			setImmediate(() => this._loop());
		}
	}

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
				filenames.forEach(filename => {
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

	_statfile(filename, callback) {
		debug('_statfile', {filename});

		fs.stat(filename, (err, stats) => {
			if (err && err.code === 'ENOENT') {
				if (this._logDetailMap[filename]) {
					this.bury(filename);
				}
				callback(null); // file deleted
			} else if (err) {
				callback(err);
			} else {
				this._ops.push(cb => this._process(filename, stats, cb));
				callback(null);
			}
		});
	}

	_process(filename, stats, callback) {
		debug('_process', {filename, stats});

		setImmediate(callback, null);
		const info = this._logDetailMap[filename];

		if (info === undefined) {
			this._logDetailMap[filename] = {
				ino: stats.ino,
				mtime: stats.mtime,
				size: stats.size,
				watermark: 0,
				tombstoned: false
			};
			this._ops.push(cb => this._read(filename, cb));
			return;
		}

		if (info.tombstoned) {
			return;
		}

		if (info.ino !== stats.ino) {
			// file replaced... can't trust it any more
			// if the client API supported replay from scratch, we could do that
			// but we can't yet, so:
			this.bury(filename);
		} else if (stats.size > info.size) {
			// file not replaced; got longer... assume append
			this._ops.push(cb => this._read(filename, cb));
		} else if (info.ino === stats.ino && info.size === stats.size) {
			// even if mtime is different, treat it as unchanged
			// e.g. ^Z when COPY CON to a fake log
			// don't queue read
		}

		info.mtime = stats.mtime;
		info.size = stats.size;
	}

	_read(filename, callback) {
		const {watermark, size} = this._logDetailMap[filename];
		debug('_read', {filename, watermark, size});

		let leftover = new Buffer('', 'utf8');

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
			callback = () => {}; // no-op
		};

		s.once('error', finish);

		s.once('end', finish);

		s.on('data', chunk => {
			const idx = chunk.lastIndexOf('\n');
			if (idx < 0) {
				leftover = Buffer.concat([leftover, chunk]);
			} else {
				this._logDetailMap[filename].watermark += idx + 1;
				try {
					const obs = Buffer.concat([leftover, chunk.slice(0, idx + 1)])
						.toString('utf8')
						.split(/[\r\n]+/)
						.filter(l => l.length > 0)
						.map(l => JSON.parse(l));
					leftover = chunk.slice(idx + 1);
					setImmediate(() => this.emit('data', obs));
				} catch (err) {
					finish(err);
				}
			}
		});
	}
}

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
		process.exit(1);
	});

	const watcher = new LogWatcher(DEFAULT_SAVE_DIR);
	watcher.on('error', err => {
		console.error(err.stack || err);
		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	});
	watcher.on('data', obs => {
		obs.forEach(ob => {
			const {timestamp, event} = ob;
			console.log('\n' + timestamp, event);
			delete ob.timestamp;
			delete ob.event;
			Object.keys(ob).sort().forEach(k => {
				console.log('\t' + k, ob[k]);
			});
		});
	});
}
