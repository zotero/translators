{
	"translatorID": "9ef1752e-bd32-49bb-9d9b-f06c039712ab",
	"label": "ubtue_DeGruyter",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.degruyter\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-24 10:24:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.includes('/article/')) return "journalArticle";
	else if (url.match(/issue/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.c-Button--link, c-Button--primary');
	for (let row of rows) {
		var href = row.href.match(/article/);
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href.input] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else {
		invokeEMTranslator(doc, url);
	}
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.title.match(/ISBN/)) i.tags.push('Book Review') && delete i.abstractNote;
		if (i.abstractNote) i.abstractNote += ZU.xpathText(doc, '//*[(@id = "transAbstract")]//p');
		// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open|free access
		let openAccessTag = text(doc, '.accessOpenAccess');
		if (openAccessTag && openAccessTag.match(/(free|freier)\s+(access|zugang)/gi)) i.notes.push('LF:');
		i.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/zac-2020-0021/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fighting in Verses: Behind the Scenes of Gregory of Nazianzus’Carmen 2,1,39",
				"creators": [
					{
						"firstName": "Alessandro De",
						"lastName": "Blasi",
						"creatorType": "author"
					}
				],
				"date": "2020/09/01",
				"DOI": "10.1515/zac-2020-0021",
				"ISSN": "1612-961X",
				"abstractNote": "Gregory of Nazianzus’ Carmen 2,1,39 (εἰς τὰ ἔμμετρα) has generally been regarded as a sort of manifesto of Gregory’s poetry. Scholars have mostly concentrated on the programmatic core of the poem, but the iambic tirade of the closing part deserves attention as well. A thorough analysis of this text should start from a preliminary survey of its manuscript tradition, which points out the need of a critical edition, since the aged PG edition still relies on a few witnesses. Furthermore, this leads to the assumption that two different addressees are involved in the poem: the former is a fictitious one, whereas the second is Gregory’s sworn enemy, Maximus the Cynic. Thus, the iambic tirade which closes poem 2,1,39 should be set within the context of the Maximus affair. Such an identification affects the dating of the poem, too. Since the Maximus affair took place in summer 380, but on the other hand Gregory seems also to allude to the Council of Constantinople, which opened in 381, it may be concluded that the poem was composed in two phases and that the poetical program exposed is due to the re-working of an older satirical draft against Maximus.null",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "246-269",
				"publicationTitle": "Zeitschrift für Antikes Christentum / Journal of Ancient Christianity",
				"shortTitle": "Fighting in Verses",
				"url": "https://www.degruyter.com/document/doi/10.1515/zac-2020-0021/html",
				"volume": "24",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Christian Poetry"
					},
					{
						"tag": "First Council of Constantinople"
					},
					{
						"tag": "Gregory of Nazianzus"
					},
					{
						"tag": "Late Antique Iambics"
					},
					{
						"tag": "Maximus the Cynic"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
