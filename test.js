const Application = require('spectron').Application
const assert = require('assert');
const electron = require('electron');
const fs = require('fs');

describe('application launch', function() {
	this.timeout(10000)

	beforeEach(function() {
		this.app = new Application({
			path: electron,
			args: ['./index.js'],
			startTimeout: 10000
		});
		return this.app.start()
	})
	afterEach(function() {
		if (this.app && this.app.isRunning()) {
			return this.app.stop()
		}
	})

	it('shows an initial window', function() {
		return this.app.client.getWindowCount().then(function(count) {
			assert.equal(count, 1)
		})
	})
	it('takes a screenshot', function() {
		this.app.browserWindow.capturePage().then(function(imageBuffer) {
			fs.writeFile('page.png', imageBuffer);
		})
	})
	it('has the right text in #main', function() {
		this.app.client.getText('#main').then(function(mainText) {
			console.log('#main says: ' + mainText)
		})
	})
	it('has the right text in #holder', function() {
		this.app.client.getText('#holder').then(function(mainText) {
			console.log('#holder says: ' + mainText)
		})
	})
})
