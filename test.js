var Application = require('spectron').Application
var assert = require('assert')
var electron = require('electron')
var args = ['index.js']
var fs = require('fs')
var app = new Application({
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
