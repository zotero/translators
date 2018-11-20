{
	"translatorID": "5e3f67c9-f4e5-4dc6-ad9a-93bf263a585a",
	"label": "Philosophy Documentation Center",
	"creator": "Madeesh Kannan",
	"target": "^https://www.pdcnet.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-11-20 15:40:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	var metaUrl = doc.querySelector("meta[property='og:url']");
	if (metaUrl && metaUrl.getAttribute("content"))
		return "journalArticle";
}

function invokeEmbeddedMetadataTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	// We need to get to the correct page by redirecting to the embedded metadata URL
	var redirectUrl = doc.querySelector("meta[property='og:url']").getAttribute("content");
	if (!redirectUrl)
		throw "invalid redirect url!";

	ZU.processDocuments([redirectUrl], function(doc) {
		invokeEmbeddedMetadataTranslator(doc);
	});

	Zotero.wait();
}
