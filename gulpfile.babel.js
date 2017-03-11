'use strict';
import gulp from 'gulp';
import del from 'del';
import inject from 'gulp-inject';
import sourcemaps from "gulp-sourcemaps";
import babel from "gulp-babel";
import concat from "gulp-concat";
import rimraf from "rimraf";
import ava from "gulp-ava";

const builder = require('electron-builder');

gulp.task('default', () => {
	rimraf('src/indexbuild.js*', err => {
		if (err && err.code !== 'ENOENT') {
			console.log(err.codeFrame);
			return err;
		}
			return gulp.src(['src/*.js', 'src/lib/*.js', '!node_modules',
				'!node_modules/**',
				'!dist',
				'!dist/**'])
				.pipe(sourcemaps.init())
				.pipe(babel({
					presets: ['latest'],
					ignore: 'node_modules/**/*'
				}))
				.pipe(concat('indexbuild.js'))
				.pipe(sourcemaps.write('.'))
				.pipe(gulp.dest('src'));
	});
});

gulp.task('build:pack', ['default'], (cb) => {
	builder.build({
		platform: process.platform,
		arch: "x64",
		config: {
			"appId": "com.willyb321.elite-journal",
			"win": {
				"target": [
					"dir"
				],
			},
			"directories": {
				"app": "src"
			},
			"iconUrl": "https://github.com/willyb321/elite-journal/blob/master/build/icon.ico?raw=true"
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
gulp.task('build:dist', ['default'], (cb) => {
	builder.build({
		platform: process.platform,
		arch: "x64",
		config: {
			"appId": "com.willyb321.elite-journal",
			"nsis": {
				"oneClick": false,
				"allowToChangeInstallationDirectory": true
			},
			"win": {
				"target": [
					"nsis"
				],
				"publish": [
					"github",
					"bintray"
				]
			},
			"directories": {
				"app": "src"
			},
			"iconUrl": "https://github.com/willyb321/elite-journal/blob/master/build/icon.ico?raw=true"
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
	return del(['dist/**/*', 'node_modules/', 'src/node_modules/']);
});
gulp.task('index', () => {
	gulp.src(['./src/**/*.html', '!./src/node_modules/**'])
		.pipe(inject(gulp.src(['./src/*.css', './src/node_modules/izitoast/dist/css/iziToast.min.css'], {read: false}), {relative: true}))
		.pipe(gulp.dest('./src'));
});

gulp.task('build:packCI', (cb) => {
	builder.build({
		platform: process.platform,
		arch: "x64",
		config: {
			"appId": "com.willyb321.elite-journal",
			"linux": {
				"target": ["dir"],
			},
			"win": {
				"target": [
					"dir"
				],
			},
			"directories": {
				"app": "src"
			},
			"iconUrl": "https://github.com/willyb321/elite-journal/blob/master/build/icon.ico?raw=true"
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

gulp.task('test', ['default', 'build:packCI'], () => {
	return gulp.src('test.js')
		.pipe(ava({verbose: true}))
});
