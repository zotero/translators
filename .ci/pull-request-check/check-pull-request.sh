#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$DIR" )"

. "$ROOT_DIR/helper.sh"

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

