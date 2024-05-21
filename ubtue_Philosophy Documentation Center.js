{
	"translatorID": "2d4da035-c81a-424b-a9ec-700e0d3aced5",
	"label": "ubtue_Philosophy Documentation Center",
	"creator": "Madeesh Kannan",
	"target": "^https://www.pdcnet.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-05-21 15:53:35"
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

function getOrcids(doc) {
	let notes = [];
	let authorsNode = ZU.xpath(doc, '//img[@alt="Orcid-ID"]/parent::a/parent::div');
	if (authorsNode.length != 1) {
        Z.debug("More than one authorsNode candidate");
		return [];
	}

	let orcidNodes = ZU.xpath(authorsNode[0], './child::a');
	let allAuthorNames = authorsNode[0].innerHTML;
	let ORCID_INDICATOR = "|||";
	for (orcidNode of orcidNodes) {
	     allAuthorNames = allAuthorNames.replace(orcidNode.outerHTML, ORCID_INDICATOR);

		if (!allAuthorNames)
			continue;

		let orcidCandidate = ZU.xpathText(orcidNode, '//@onclick');
		let ORCID_MATCHER = /https:\/\/orcid.org\/([\d-]+)/g;
		let orcid = ORCID_MATCHER.exec(orcidCandidate);

		if (!orcid)
		    continue;

        orcid = orcid[1]; /* only the match */

		let allAuthorNamesSplit = allAuthorNames.split(",").map(n => n.trim());
		let orcidAuthor = allAuthorNamesSplit.filter(n => n.endsWith(ORCID_INDICATOR))[0].
		                  replace(ORCID_INDICATOR, "");

		notes.push({note: "orcid:" + orcid + ' | '
		            + orcidAuthor});
	}
	return notes;
}

function invokeEmbeddedMetadataTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.itemType = "journalArticle";
		let orcids = getOrcids(doc);
		if (orcids.length)
			i.notes.push(...orcids);
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
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
