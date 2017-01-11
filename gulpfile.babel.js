'use strict';
import gulp from 'gulp';
import del from 'del';

const builder = require('electron-builder');
const electron = require('electron-connect').server.create();
// const Platform = builder.Platform;
gulp.task('default', () => {

});
gulp.task('build:pack', () => {
	builder.build({
		targets: builder.Platform.win32,
		config: {
			win: {
				target: [
					'dir'
				]
			},
			iconUrl: 'https://github.com/willyb321/elite-journal/blob/master/build/icon.ico?raw=true',
			remoteReleases: true
		}
	})
		.then(() => {
			console.log('Built the app in dist/');
		})
		.catch(err => {
			console.error(err);
		});
});
gulp.task('build:dist', () => {
	builder.build({
		targets: builder.Platform.win32,
		config: {
			win: {
				target: [
					'nsis'
				]
			},
			nsis: {
				oneClick: true
			},
			iconUrl: 'https://github.com/willyb321/elite-journal/blob/master/build/icon.ico?raw=true',
			remoteReleases: true
		}
	})
		.then(() => {
			console.log('Built an NSIS installer in dist/');
		})
		.catch(err => {
			console.error(err);
		});
});
gulp.task('clean', () => {
	return del(['dist']);
});
