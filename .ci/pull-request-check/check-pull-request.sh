#!/usr/bin/env bash

if [[ "$TRAVIS_PULL_REQUEST" == "false" ]]; then
	exit 0;
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$DIR" )"

TRANSLATORS_TO_CHECK=""
get_translators_to_check() {
		# If a PR branch has no conflicts with the master then git
		# creates a custom merge commit where it merges PR into master.
		# Travis-CI tests on that commit instead of the HEAD of the PR branch.
		#
		# Thus below we first determine if HEAD is a merge commit by checking how
		# many parents the current HEAD has. If number of parents > 1, then its a merge commit
		# in which case we need to diff translator names between HEAD^2 and PR split commit from master.
		# The above will generally only be the case on Travis-CI or if using a custom PR pulling script which
		# pulls the merge PR commit instead of just the PR branch.
		#
		# If the HEAD commit is not a merge then we diff HEAD with PR split commit from master. This is the case
		# when running from a local development PR branch
		#
		# The branching point hash retrieval logic is based on https://stackoverflow.com/a/12185115/3199106

		# Gets parent commits. Either one or two hashes
		PARENT_COMMITS=($(git show --no-patch --format="%P" HEAD))
		# Size of $PARENT_COMMITS array
		NUM_PARENT_COMMITS=${#PARENT_COMMITS[@]}
		if [ $NUM_PARENT_COMMITS -gt 1 ]; then
			TRANSLATORS_TO_CHECK=$(git diff HEAD^2 $(git rev-list "$(git rev-list --first-parent ^master HEAD^2 | tail -n1)^^!") --name-only | grep -e "^[^/]*.js$")
		else
			TRANSLATORS_TO_CHECK=$(git diff $(git rev-list "$(git rev-list --first-parent ^master HEAD | tail -n1)^^!") --name-only | grep -e "^[^/]*.js$")
		fi
}

# Build connector
mkdir -p connectors
cd connectors

if [ -d .git ]; then
	git pull
	git submodule update
	git -C src/zotero/ submodule update -- resource/schema/global
	git -C src/zotero submodule update -- resource/SingleFile
	npm ci
else
	git clone https://github.com/zotero/zotero-connectors.git --depth 1 .
	git submodule update --init --depth 1
	git -C src/zotero submodule update --init --depth 1 -- resource/schema/global
	git -C src/zotero submodule update --init --depth 1 -- resource/SingleFile
	npm ci
fi

export ZOTERO_REPOSITORY_URL="http://localhost:8085/"
./build.sh -p b -d
cd ..

npm explore chromedriver -- npm run install --detect_chromedriver_version

get_translators_to_check
./selenium-test.js "$TRANSLATORS_TO_CHECK"

