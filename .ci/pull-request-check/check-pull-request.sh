#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$DIR" )"

. "$ROOT_DIR/helper.sh"

# Build connector
mkdir -p connectors
cd connectors

if [ -d .git ]; then
	# Temp fix for connectors/src/zotero/resource/schema/global submodule fetch failing
	git config url."https://".insteadOf git://
	git pull
	git submodule update
	git -C src/zotero/ submodule update -- resource/schema/global
	git -C src/zotero submodule update -- resource/SingleFile
	npm ci
else
	git clone https://github.com/zotero/zotero-connectors.git --depth 1 .
	git config url."https://".insteadOf git://
	git submodule update --init --depth 1
	git -C src/zotero submodule update --init --depth 1 -- resource/schema/global
	git -C src/zotero submodule update --init --depth 1 -- resource/SingleFile
	npm ci
fi

cd ..
get_translators_to_check

if [ -z "${TRANSLATORS_TO_CHECK}" ]; then
    export TRANSLATORS_TO_CHECK=mockImport.js
    echo "Found no translator to check; using mock translator to test this test's own functioning."
    cat > ./connectors/src/zotero/translators/mockImport.js << 'EOF'
{
	"translatorID": "c4754d0e-7845-49bf-b6cc-291e427c0a08",
	"label": "mockImport",
	"creator": "",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2023-03-25 04:51:05"
}

function detectImport() {
	return true;
}

function doImport() {
	const item = new Z.Item("annotation");
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "Always succeed",
		"items": [
			{
				"itemType": "annotation",
				"creators": [],
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
EOF
fi

cd connectors
export ZOTERO_REPOSITORY_URL="http://localhost:8085/"
./build.sh -p b -d
cd ..

npm explore chromedriver -- npm run install --detect_chromedriver_version

./selenium-test.js "$TRANSLATORS_TO_CHECK"
