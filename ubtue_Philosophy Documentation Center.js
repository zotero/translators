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
	"lastUpdated": "2018-11-09 15:40:06"
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
	var iframes = doc.getElementsByName("pdf");
	if (iframes.length == 1)
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
	// The page contents are lazy-loaded as a seperate HTML document inside an inline frame
	// The frame source contains the required metadata that can be parsed by the Embedded Metadata translator
	var iframe = doc.getElementsByName("pdf");
	var content = iframe[0].contentDocument;
	if (content)
		invokeEmbeddedMetadataTranslator(content);
	else {
		// attempt to load the frame contents
		var iframeSource = iframe[0].getAttribute("src");
		if (!iframeSource)
			throw "missing frame source!";

		ZU.processDocuments([iframeSource], invokeEmbeddedMetadataTranslator);
		Zotero.wait();
	}
}
