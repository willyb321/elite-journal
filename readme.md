<p align="center">
  <img src="https://willyb321-imgproxy.herokuapp.com/k0YEbumMcrJhrcYNPkhS89rWF4b5r8voUBcDiw6c1e4/fit/256/256/no/1/aHR0cHM6Ly9naXRodWIuY29tL3dpbGx5YjMyMS9lbGl0ZS1qb3VybmFsL2Jsb2IvZGV2ZWxvcC9idWlsZC9pY29uLnBuZz9yYXc9dHJ1ZQ.png"/>
</p>

# Elite Journal

[![Greenkeeper badge](https://badges.greenkeeper.io/willyb321/elite-journal.svg)](https://greenkeeper.io/)

[![AppVeyor](https://img.shields.io/appveyor/ci/willyb321/elite-journal.svg?maxAge=3600)](https://ci.appveyor.com/project/willyb321/elite-journal)[![Github All Releases](https://img.shields.io/github/downloads/willyb321/elite-journal/total.svg?maxAge=3600)](https://github.com/willyb321/elite-journal/releases/latest)[![GitHub release](https://img.shields.io/github/release/willyb321/elite-journal.svg?maxAge=3600)](https://github.com/willyb321/elite-journal/releases)[![GitHub stars](https://img.shields.io/github/stars/willyb321/elite-journal.svg?style=social&label=Star&maxAge=3600)](https://github.com/willyb321/elite-journal/stargazers)[![Gratipay User](https://img.shields.io/gratipay/user/willyb321.svg?maxAge=3600)](https://gratipay.com/~willyb321/)[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/willyb321/elite-journal/badges/quality-score.png?b=develop)](https://scrutinizer-ci.com/g/willyb321/elite-journal/?branch=develop)[![CircleCI](https://circleci.com/gh/willyb321/elite-journal.svg?style=svg)](https://circleci.com/gh/willyb321/elite-journal)

> Parsing the Elite: Dangerous journal and putting it into a cool format.

## Whats it actually do then?

Basically it allows the average joe to have a look at the journal log for [Elite: Dangerous](https://www.elitedangerous.com/) in a nice easy to read format.

## How to get it?
Download a [setup .exe](https://github.com/willyb321/elite-journal/releases/latest) from the releases page, and then run it. It will automagically update when you run the application from now on! 

<p style="width: 100%" align="center">
  <img style="width: 100%"src="https://raw.githubusercontent.com/willyb321/elite-journal/master/screenshot.png"/>
</p>

<!-- MarkdownTOC -->

- [Dev](#dev)
- [Run](#run)
- [Build](#build)
- [Quick Development setup](#quick-development-setup)
- [Contributing](#contributing)
- [Changes](#changes)
- [Features](#features)
- [License](#license)
- [Support on Beerpay](#support-on-beerpay)

<!-- /MarkdownTOC -->


## Dev

```
$ npm install
```

## Run

```
$ npm start
```

## Build

```
$ npm run pack
```

Builds the app for Windows x64, using [electron-builder](https://github.com/electron-userland/electron-builder).


### Build - Distribution

```
$ npm run dist
```

Builds the app and distributable setup exe for Windows x64, using [electron-builder](https://github.com/electron-userland/electron-builder).

## Quick Development setup

```
curl -o- -L https://raw.githubusercontent.com/willyb321/elite-journal/master/.scripts/get.sh | bash
```

## Contributing

See [CONTRIBUTING.md](https://github.com/willyb321/elite-journal/blob/master/CONTRIBUTING.md) for guidelines.

## Changes

See [CHANGELOG.md](https://github.com/willyb321/elite-journal/blob/master/CHANGELOG.md) for changes.

## Features

- Filtering.
- Saving as HTML.
- Saving as JSON.
- Looking at journal logs in a nice format.
- Drag and drop logs to load them.
- Built with [web technologies](http://electron.atom.io/) and [Node.JS](https://nodejs.org/).
- Keyboard shortcuts for various actions.
- Fairly fast.
- Pretty CSS.
- Easy on the CPU.
- Easy on the RAM.
- Easy on basically everything to do with resources.
- Auto updating.
- Plus more.

## License

MIT © [willyb321](https://tehsuperwilly.tech)

## Support on Beerpay
Hey dude! If you like this thing what ive made, why not chuck a buck my way eh? :+1:

[![Beerpay](https://beerpay.io/willyb321/elite-journal/badge.svg?style=beer-square)](https://beerpay.io/willyb321/elite-journal)  [![Beerpay](https://beerpay.io/willyb321/elite-journal/make-wish.svg?style=flat-square)](https://beerpay.io/willyb321/elite-journal?focus=wish)
