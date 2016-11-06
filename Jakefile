desc('This installs dependencies.');
task('deps', function (params) {
  console.log('Installing dependencies');
  const cmds = [
  'yarn install --pure-lockfile'
  ]
  jake.exec(cmds, {printStdout: false}, function () {
  	console.log('Dependencies installed');
  	complete();
  })
})

desc('Runs tests');
task('test', {async: true}, function () {
  var cmds = [
    'mocha ./tests/test1.js'
  , 'mocha ./tests/test2.js'
  , 'mocha ./tests/test3.js'
  , 'mocha ./tests/test4.js'
  , 'xo'
  ];
  jake.exec(cmds, {printStdout: true}, function () {
    console.log('All tests passed.');
    complete();
  })
});

desc('Builds a setup executable');
task('build', function () {
	var cmds = [
	'build -w --x64'
	]
	jake.exec(cmds, function () {
		console.log('Built a setup executable in dist/');
		complete();
	})
})

desc('Packs into a directory');
task('pack', function () {
	var cmds = [
	'build --dir --x64'
	]
	jake.exec(cmds, function () {
		console.log('Packed into dist/');
		complete();
	})
})

desc('Builds a setup executable for release.');
task('release', function () {
	var cmds = [
	'build -w --x64'
	]
	jake.exec(cmds, function () {
		console.log('Built a setup executable in dist/');
		complete();
	})
})

desc('This sets you up to develop with this.');
task('setup', function (params) {
	console.log('Cloning and installing dependencies');
	const cmds = [
	'git clone https://github.com/willyb321/elite-journal.git'
	, 'cd ./elite-journal && yarn install'
	]
	jake.exec(cmds, function () {
		console.log('Project cloned and dependencies installed.');
    complete();
  })
})
