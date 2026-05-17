{
	"translatorID": "b0abb562-218c-4bf6-af66-c320fdb8ddd3",
	"label": "Philosophers' Imprint",
	"creator": "Philipp Zumstein",
	"target": "^https?://quod\\.lib\\.umich\\.edu/p/phimp",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-25 02:00:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein and contributors
	
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (/^\/p\/phimp\/\d+\.\d+\.\d+\//.test(new URL(url).pathname)) {
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rowsRoot = doc.querySelector("#searchresults, #browselist, #picklistitems");
	if (!rowsRoot) return false;
	var rows = rowsRoot.querySelectorAll('td:nth-child(2) > a');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url), url);
		}
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) { // eslint-disable-line no-unused-vars
	var abstract = text(doc, ".abstract p:first-of-type");
	var purl = attr(doc, "#purl a", "href");
	var license = attr(doc, "#licenseicon", "href");
	var pdfurl = attr(doc, "#download-pdf a", "href");

	var dateField = text(doc, ".periodical");
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		if (abstract) {
			item.abstractNote = abstract;
		}
		if (purl) {
			item.url = purl;
		}
		if (pdfurl) {
			// Delete the EM-generated snapshot, which is not very useful for
			// the journal article with VoR already there
			item.attachments = item.attachments.filter(obj => obj.title !== "Snapshot");
			item.attachments.push({
				url: pdfurl,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
		}
		if (dateField) {
			let pagesMatch = dateField.match(/.+pp\.\s+(\d+(?:-\d+))$/);
			if (pagesMatch) {
				item.pages = pagesMatch[1];
			}
		}
		item.rights = license;
		// Delete irrelevant fields from EM (which will go into extra but are
		// still irrelevant there)
		delete item.institution;
		delete item.company;
		delete item.label;
		delete item.distributor;
		item.place = "Ann Arbor, MI";
		item.publisher = "Michigan Publishing";
		// Their metadata about their name is wrong
		item.publicationTitle = "Philosophers' Imprint";
		
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://quod.lib.umich.edu/p/phimp?type=simple&rgn=full+text&q1=epistemology&cite1=&cite1restrict=author&cite2=&cite2restrict=author&Submit=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://quod.lib.umich.edu/p/phimp/3521354.0004.003/1?rgn=full+text;view=image;q1=epistemology",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Morality, Fiction, and Possibility",
				"creators": [
					{
						"firstName": "Brian",
						"lastName": "Weatherson",
						"creatorType": "author"
					}
				],
				"date": "2004-11-01",
				"ISSN": "1533-628X",
				"abstractNote": "Authors have a lot of leeway with regard to what they can make true in their story. In general, if the author says that p is true in the fiction we're reading, we believe that p is true in that fiction. And if we're playing along with the fictional game, we imagine that, along with everything else in the story, p is true. But there are exceptions to these general principles. Many authors, most notably Kendall Walton and Tamar Szabó Gendler, have discussed apparent counterexamples when p is \"morally deviant\". Many other statements that are conceptually impossible also seem to be counterexamples. In this paper I do four things. I survey the range of counterexamples, or at least putative counterexamples, to the principles. Then I look to explanations of the counterexamples. I argue, following Gendler, that the explanation cannot simply be that morally deviant claims are impossible. I argue that the distinctive attitudes we have towards moral propositions cannot explain the counterexamples, since some of the examples don't involve moral concepts. And I put forward a proposed explanation that turns on the role of 'higher-level concepts', concepts that if they are satisfied are satisfied in virtue of more fundamental facts about the world, in fiction, and in imagination.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "quod.lib.umich.edu",
				"pages": "1-27",
				"publicationTitle": "Philosophers' Imprint",
				"rights": "http://creativecommons.org/licenses/by-nc-nd/3.0/",
				"url": "http://hdl.handle.net/2027/spo.3521354.0004.003",
				"volume": "4",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://quod.lib.umich.edu/p/phimp/3521354.0021?rgn=full+text",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://quod.lib.umich.edu/p/phimp?key=title;page=browse",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://quod.lib.umich.edu/p/phimp?key=author;page=browse",
		"items": "multiple"
	}
]
/** END TEST CASES **/
