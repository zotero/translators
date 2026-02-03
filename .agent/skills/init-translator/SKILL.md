---
name: init-translator
description: Steps that MUST be performed to initialize a Zotero translator script. LLMs cannot generate a valid Zotero translator on their own.
---

## Getting started

First, fetch and ingest https://www.zotero.org/support/_export/raw/dev/translators and https://www.zotero.org/support/_export/raw/dev/translators/coding.

## Initialize a translator

Do not attempt to generate the translator on your own. Once a translator script exists, you can iterate on it.

Ask the user to open Zotero and run Tools → Translator Editor ("Scaffold"). Have them:

1. Initialize a new translator (File → New Translator).
2. Set the label, creator, and target regex (suggest these).
3. Check the correct boxes for Translator Type (only Web is checked by default).
4. Run File → Save.

The UUID is randomized automatically - don't even mention it.

Wait for them to complete this process and confirm that they've done so.

After the translator is saved, read it from disk to verify that it exists. You can then edit the file and, if developing a web translator, add the Web Translator template code:

```js
/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 YOUR_NAME <- TODO

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero. If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/article/')) {
		return 'newspaperArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	// TODO: implement or add a scrape function template
}
```

After you edit translator code, Scaffold will automatically prompt the user to reload the translator. They should click **Yes**. There is no manual command to reload from disk.

## Further steps

Ask the user to use the `Run detect*` and `Run do*` toolbar buttons to test the corresponding translator methods. (Asterisks are correct and present in the tooltips.)

They can create web tests from the Browser tab by clicking Create Web Test with a page loaded.

For import and search tests, have them put the input data (e.g., a JSON search object or import XML/JSON/RIS/etc.) in the Test Input tab, and click Create Import Test or Create Search Test.

## References

Give more weight to **recently created** translators when looking in the codebase for examples. There are a large number of legacy translators in the repository which should not be emulated. Good translators will look somewhat like the template code above and make use of modern JS features like async.

TypeScript type definitions are in `index.d.ts`.

If you need to fetch target webpages, use curl in the shell and don't override the user agent string. But avoid parsing them into your context directly - they tend to be quite large and there isn't much point.

Please regularly ask the user to return to Scaffold and verify that the translator is working on test cases. Warn them that your training data contains relatively few examples of Zotero translator code and that you may make mistakes.

## Finalizing your translator

For more, use the verify-translator skill.