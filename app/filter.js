const {ipcRenderer} = require('electron');

function updateFilter(e) {
	console.log(e);
	ipcRenderer.send('filter', e.target.value);
}
