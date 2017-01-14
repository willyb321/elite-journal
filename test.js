import test from 'ava';
import {Application} from 'spectron';
import fs from "fs";

test.beforeEach(async t => {
	if (process.platform === 'linux') {
		t.context.app = new Application({
			path: './dist/linux-unpacked/elite-journal',
			env: {NODE_ENV: 'test'},
			startTimeout: 10000
		});
	} else if (process.platform === 'win32') {
		t.context.app = new Application({
			path: './dist/win-unpacked/Elite Journal.exe',
			env: {NODE_ENV: 'test'},
			startTimeout: 10000
		});
	}
	await t.context.app.start();
});

test.afterEach.always(async t => {
	await t.context.app.stop();
});

test.serial('Initial Window', async t => {
	const app = t.context.app;
	await app.client.waitUntilWindowLoaded();

	const win = app.browserWindow;
	await win.focus();
	t.is(await app.client.getWindowCount(), 1);
	t.false(await win.isMinimized());
	t.false(await win.isDevToolsOpened());
	t.true(await win.isVisible());
	t.true(await win.isFocused());

	const {width, height} = await win.getBounds();
	t.true(width > 0);
	t.true(height > 0);
});

test.serial('Screenshot', async t => {
	const app = t.context.app;
	await app.client.waitUntilWindowLoaded();

	const win = app.browserWindow;
	await win.focus();
	t.is(await app.client.getWindowCount(), 1);
	await app.client.waitUntilWindowLoaded(10000);
	await app.browserWindow.capturePage().then(imageBuffer => {
		fs.writeFileSync('page.png', imageBuffer)
	});
});

test.serial('#main div test', async t => {
	const app = t.context.app;
	await app.client.waitUntilWindowLoaded();

	const win = app.browserWindow;
	await win.focus();
	app.client.getText('#main').then(mainText =>{
		console.log('#main says: ' + mainText);
		t.is(mainText, 'Please load a file using the "File" menu')
	})
});

test.serial('#holder div test', async t => {
	const app = t.context.app;
	await app.client.waitUntilWindowLoaded();

	const win = app.browserWindow;
	await win.focus();
	await app.client.getText('#holder').then(mainText =>{
		console.log('#holder says: ' + mainText);
		t.is(mainText, 'Or, Drag your file somewhere on this page.')
	})
});

test.serial('Accessibility test', async t => {
	const app = t.context.app;
	await app.client.waitUntilWindowLoaded(10000);

	const win = app.browserWindow;
	await win.focus();

	await app.client.auditAccessibility().then(function (audit) {
		if (audit.failed) {
			console.error(audit.message);
		}
	})
});
