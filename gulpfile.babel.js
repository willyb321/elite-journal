'use strict';
import gulp from 'gulp';
import del from 'del';
import inject from 'gulp-inject';
import sourcemaps from "gulp-sourcemaps";
import babel from "gulp-babel";
import concat from "gulp-concat";
import Mocha from "mocha";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import ava from "gulp-ava";

const builder = require('electron-builder');
const mocha = new Mocha();
const testDir  = 'tests/';

gulp.task('default', () => {
	rimraf('src/indexbuild.js*', err => {
		if (err && err.code !== 'ENOENT') {
			console.log(err.codeFrame);
			return err;
		} else {
			return gulp.src([ '!node_modules',
				'!node_modules/**',
				'!dist',
				'!dist/**', 'src/*.js'])
				.pipe(sourcemaps.init())
				.pipe(babel({
					presets: ['latest'],
					ignore: 'node_modules/**/*'
				}))
				.pipe(concat('indexbuild.js'))
				.pipe(sourcemaps.write('.'))
				.pipe(gulp.dest('src'));
		}
	});
});

gulp.task('build:pack', (cb) => {
	builder.build({
		platform: process.platform,
		arch: "x64",
		config: {
			directories: {
				app: 'src'
			},
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
			cb()
		})
		.catch(err => {
			console.error(err);
		});
});
gulp.task('build:dist', (cb) => {
	builder.build({
		platform: process.platform,
		arch: "x64",
		config: {
			win: {
				target: [
					'nsis'
				]
			},
			nsis: {
				oneClick: true
			},
			directories: {
				app: 'src'
			},
			iconUrl: 'https://github.com/willyb321/elite-journal/blob/master/build/icon.ico?raw=true',
			remoteReleases: true
		}
	})
		.then(() => {
			console.log('Built an NSIS installer in dist/');
			cb();
		})
		.catch(err => {
			console.error(err);
		});
});
gulp.task('clean', () => {
	return del(['dist/**/*']);
});
gulp.task('index', () => {
	gulp.src('./src/**/*.html')
		.pipe(inject(gulp.src(['./src/*.css', './src/node_modules/izitoast/dist/css/iziToast.min.css'], {read: false}), {relative: true}))
		.pipe(gulp.dest('./src'));
});

gulp.task('build:packCI', (cb) => {
	builder.build({
		platform: process.platform,
		arch: "x64",
		config: {
			directories: {
				app: 'src'
			},
			linux: {
				target: [
					'dir'
				]
			},
				win: {
					target: [
						'dir'
					],
					directories: {
						app: 'src'
			}}
		}
	})
		.then(() => {
			console.log('Built the app in dist/');
			cb()
		})
		.catch(err => {
			console.error(err);
		});
});

gulp.task('test', ['default', 'build:packCI'], (cb) => {
	gulp.src('test.js')
		.pipe(ava({verbose: true}));
	cb()
});
