#!/bin/bash
function check
{
hash git 2>/dev/null || { echo >&2 "I require git but it's not installed. Aborting. How did you even find this without git?"; exit 1; }
hash yarn 2>/dev/null || { echo >&2 "I require yarn but it's not installed. Aborting. See https://yarnpkg.com/en/docs/install to get it"; exit 1; }
hash jake 2>/dev/null || { echo >&2 "I require jake but it's not installed. Aborting. Run 'yarn global add jake' to get it"; exit 1; }
}
function setup
{
	check
	wget https://raw.githubusercontent.com/willyb321/elite-journal/master/Jakefile -o $HOME/EliteJakefile
	jake -f $HOME/EliteJakefile setup
}
setup
