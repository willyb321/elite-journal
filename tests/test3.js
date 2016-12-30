const Application = require('spectron').Application
const assert = require('assert');
const electron = require('electron');
const fs = require('fs');

describe('application launch', function () {
	this.timeout(10000)

	beforeEach(function () {
		this.app = new Application({
			path: require('electron'),
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
	it('has the right text in #main', function () {
		return this.app.client.getText('#main').then(function (mainText) {
			console.log('#main says: ' + mainText)
			assert.equal(mainText, 'Please load a file using the "File" menu')
		})
	})
})
