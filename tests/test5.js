const Application = require('spectron').Application;
const assert = require('assert');
const fs = require('fs');

describe('Accessibility Audit', function () {
	this.timeout(10000);

	beforeEach(function () {
		if (process.platform === 'linux') {
			this.app = new Application({
				path: './dist/linux-unpacked/elite-journal',
				env: {NODE_ENV: 'test'},
				startTimeout: 10000
			});
		} else if (process.platform === 'win32') {
			this.app = new Application({
				path: './dist/win-unpacked/Elite Journal.exe',
				env: {NODE_ENV: 'test'},
				startTimeout: 10000
			});
		}
		return this.app.start();
	});
	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop()
		}
	});

	it('Does alright in the accessibility audit', function () {
		this.app.client.auditAccessibility().then(function (audit) {
			if (audit.failed) {
				console.error(audit.message)
			}
		})
	})
});
