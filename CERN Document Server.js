{
	"translatorID": "e4b51f32-bb3f-4d37-a46d-083efe534233",
	"label": "CERN Document Server",
	"creator": "Sebastian Karcher",
	"target": "https://cds.cern.ch/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-07 19:57:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	
	if (url.includes('/record/')) {
		return getItemType(doc);
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getItemType(doc) {
	var type = text(doc, '.formatRecordHeader').trim();
	switch (type) {
		case "Article":
			return "journalArticle";
		case "Thesis":
			return "thesis";
		case "Report":
			return "report";
		case "Book":
		case "Books":
			return "book"
		case "Preprint":
			return "preprint";
		case "Talks":
			return "presentation";
		default:
			return "document";
	}
}
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('strong>a.titlelink');
	for (let row of rows) {
		let href = row.href;
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
		var pdfUrl = attr(doc, '#detailedrecordminipanelfile a:first-of-type[href*=".pdf"]', 'href');
		Z.debug(pdfUrl);
		let bibUrl = url.replace(/[#?].+/, "") + '/export/hx?ln=en';
		let bibText = await requestText(bibUrl);
		bibText = bibText.match(/<pre>([\s\S]+?)<\/pre>/)[1];
		Z.debug(bibText)
		let translator = Zotero.loadTranslator("import");
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
		translator.setString(bibText);
		translator.setHandler('itemDone', (_obj, item) => {
			if (pdfUrl) {
				item.attachments.push({url: pdfUrl, title: "Full Text PDF", mimeType: "application/pdf"})
			}
			item.itemType = getItemType(doc);
			item.extra = "";
			item.complete();
		});
		await translator.translate();

}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cds.cern.ch/search?ln=en&sc=1&p=testing&action_search=Search&op1=a&m1=a&p1=&f1=&c=Articles+%26+Preprints&c=Books+%26+Proceedings&c=Presentations+%26+Talks&c=Periodicals+%26+Progress+Reports&c=Multimedia+%26+Outreach&c=International+Collaborations",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cds.cern.ch/record/2855572?ln=en",
		"detectedItemType": "preprint",
		"items": [
			{
				"itemType": "preprint",
				"title": "A short history of Internet protocols at CERN",
				"creators": [
					{
						"firstName": "Ben",
						"lastName": "Segal",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"itemID": "Segal:2855572",
				"libraryCatalog": "CERN Document Server",
				"place": "Geneva",
				"repository": "CERN",
				"url": "https://cds.cern.ch/record/2855572",
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
	}
]
/** END TEST CASES **/
