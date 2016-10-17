const Application = require('spectron').Application
const assert = require('assert')
const electron = require('electron')
const args = ['index.js']
const fs = require('fs')
const app = new Application({
	path: electron,
	args: ['index.js']
})

app.start().then(function() {
	// Check if the window is visible
	return app.browserWindow.isVisible()
}).then(function(isVisible) {
	// Verify the window is visible
	assert.equal(isVisible, true)
}).then(function() {
	// Get the window's title
	return app.client.getTitle()
}).then(function(title) {
	// Verify the window's title
	assert.equal(title, 'Elite Journal')
}).then(function() {
	app.browserWindow.capturePage().then(function(imageBuffer) {
		fs.writeFile('page.png', imageBuffer)
	})

	console.log("Woo the app started!")
	return app.stop()
}).catch(function(error) {
	// Log any failures
	console.error('Test failed', error.message)
})
