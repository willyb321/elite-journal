'use strict';
import gulp from 'gulp';
import del from 'del';
import inject from 'gulp-inject';

const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const builder = require('electron-builder');
const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');

const mocha = new Mocha();
const testDir  = 'tests/';

gulp.task('default', () => {
	return gulp.src('src/**/*.js')
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['es2015']
		}))
		.pipe(concat('all.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('src'));
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
	return del(['dist']);
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

gulp.task('test', ['build:packCI'], (cb) => {
	mocha.reporter('mocha-circleci-reporter');
	fs.readdirSync(testDir).filter(file => {
		// Only keep the .js files
		return file.substr(-3) === '.js';

	}).forEach(file => {
		mocha.addFile(
			path.join(testDir, file)
		);
	});

// Run the tests.
	return mocha.run( failures => {
		if (!failures) {
			cb();
			process.exit(0);
		}
		process.on('exit', () => {
			cb(failures);
			process.exit(failures);  // exit with non-zero status if there were failures
		});
	});
});
