#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$DIR" )"

# Build connector
mkdir -p connectors
cd connectors

if [ -d .git ]; then
	git pull
	git submodule update
	git -C src/zotero/ submodule update -- resource/schema/global
	npm ci
else
	git clone https://github.com/zotero/zotero-connectors.git --depth 1 .
	git submodule update --init --depth 1
	git -C src/zotero submodule update --init --depth 1 -- resource/schema/global
  npm ci
fi

export ZOTERO_REPOSITORY_URL="http://localhost:8085/"
./build.sh -p b -d
cd ..

./selenium-test.js

