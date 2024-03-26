{
	"translatorID": "86c3832a-ccc6-40ab-b5e9-83892423df11",
	"label": "TimesMachine",
	"creator": "Abe Jellinek, Sebastian Karcher",
	"target": "^https?://timesmachine\\.nytimes\\.com/timesmachine/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-26 18:04:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021-2024 Abe Jellinek, Sebastian Karcher
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('#index_article_selected_view')) {
		return "newspaperArticle";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// the title that EM finds contains both the main title and the heading
		// used when the story is continued on another page. we really only want
		// the former.
		item.title = text(doc, '.index_article_title') || item.title;
		
		item.date = ZU.strToISO(text(doc, '#publish_date_content'));
		
		item.pages = ZU.trimInternal(text(doc, '#page_num_content'))
			.replace(/ ,/g, ',');
		
		// The URL and abstract don't update when you move from issue to article and it duplicates the hostname
		item.url = doc.location.href.replace(/\?.+./, "");
		item.abstractNote = text(doc, '.index_article_lede');
		
		let byline = text(doc, '#byline_content').replace(/^\s*by\b/gi, '');
		for (let author of byline.split(/ and |, /)) {
			author = ZU.capitalizeName(author);
			
			if (author.toLowerCase() == 'special to the new york times') {
				continue;
			}
			
			item.creators.push(ZU.cleanAuthor(author, 'author'));
		}
		
		for (let subject of doc.querySelectorAll('#subjects_container .subjects_item')) {
			item.tags.push({ tag: subject.textContent.trim() });
		}
		
		let pdfURL = attr(doc, '.index_article_pdf a', 'href');
		if (pdfURL) {
			item.attachments = [{
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			}];
		}
		
		item.ISSN = '0362-4331';
		item.libraryCatalog = 'TimesMachine';
		item.publicationTitle = 'The New York Times';
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://timesmachine.nytimes.com/timesmachine/1969/08/17/89365215.html?pageNumber=1",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "300,000 at Folk-Rock Fair Camp Out in a Sea of Mud",
				"creators": [
					{
						"firstName": "Barnard L.",
						"lastName": "Collier",
						"creatorType": "author"
					}
				],
				"date": "1969-08-17",
				"ISSN": "0362-4331",
				"abstractNote": "BETHEL, N. Y., Aug. 16 — Despite massive traffic jams, drenching rainstorms and shortages of food, water and medical facilities, about 300,000 young people swarmed over this rural area today for the Woodstock Music and Art Fair.",
				"language": "en",
				"libraryCatalog": "TimesMachine",
				"pages": "1, 80",
				"publicationTitle": "The New York Times",
				"url": "https://timesmachine.nytimes.com/timesmachine/1969/08/17/89365215.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "drug addiction, abuse and traffic"
					},
					{
						"tag": "new york state"
					},
					{
						"tag": "traffic (vehicular and pedestrian) and parking"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://timesmachine.nytimes.com/timesmachine/1969/08/17/89365277.html?pageNumber=2",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "PORTUGAL'S NEEDS DEBATED IN PRESS",
				"creators": [],
				"date": "1969-08-17",
				"ISSN": "0362-4331",
				"abstractNote": "LISBON, Aug. 16 — The principal problem facing Portugal today is freedom, according to the leader of the Democratic opposition, but it is education in the view of the head of the regime's political organization.",
				"language": "en",
				"libraryCatalog": "TimesMachine",
				"pages": "2",
				"publicationTitle": "The New York Times",
				"url": "https://timesmachine.nytimes.com/timesmachine/1969/08/17/89365277.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "news and newspapers"
					},
					{
						"tag": "portugal"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://timesmachine.nytimes.com/timesmachine/1969/08/17/89365432.html?pageNumber=16",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Saudis Replacing Bedouin Rifles With Missiles",
				"creators": [],
				"date": "1969-08-17",
				"ISSN": "0362-4331",
				"abstractNote": "RIYADH, Saudi Arabia, Aug. 16 (Reuters) — This Islamic kingdom, forged in this century by the rifles of Bedouin nomads in 30 years of desert warfare, is equipping itself for defense in the missile age.",
				"language": "en",
				"libraryCatalog": "TimesMachine",
				"pages": "16",
				"publicationTitle": "The New York Times",
				"url": "https://timesmachine.nytimes.com/timesmachine/1969/08/17/89365432.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "saudi arabia"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
