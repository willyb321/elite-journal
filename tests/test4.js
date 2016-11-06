const Application = require('spectron').Application
const assert = require('assert');
const electron = require('electron');
const fs = require('fs');

describe('application launch', function () {
	this.timeout(10000)

	beforeEach(function () {
		this.app = new Application({
			path: electron,
			args: ['./index.js'],
			startTimeout: 10000
		});
		return this.app.start()
	})
	afterEach(function () {
		if (this.app && this.app.isRunning()) {
			return this.app.stop()
		}
	})

	it('has the right text in #holder', function () {
		return this.app.client.getText('#holder').then(function (mainText) {
			console.log('#holder says: ' + mainText)
			assert.equal(mainText, 'Or, Drag your file somewhere on this page.')
		})
	})
})
