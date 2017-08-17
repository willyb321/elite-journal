const remote = require('electron').remote;
const event = document.getElementsByClassName('events');
const {ipcRenderer} = require('electron');

function updateFilter(e) {
	console.log(e);
	ipcRenderer.sendSync('filter')
}
