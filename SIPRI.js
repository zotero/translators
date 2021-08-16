{
	"translatorID": "3a92a47b-a532-40b8-8e69-c40b4edf56ec",
	"label": "SIPRI",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?sipri\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-16 23:05:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/publications/') && doc.body.classList.contains('node--type-publication')) {
		if (doc.querySelector('.views-field-field-isbn')) {
			return "book";
		}
		else {
			return "report";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('td.views-field-title a');
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

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('report');
	
	item.title = text(doc, '#sipri-2016-page-title');
	item.abstractNote = text(doc, '.body p');
	item.date = ZU.strToISO(text(doc, '.views-field-field-year-of-publication'));
	item.language = 'en';
	item.url = attr(doc, 'link[rel="canonical"]', 'href') || url;
	
	for (let author of doc.querySelectorAll('.views-field-combinedauthors a')) {
		let name = author.innerText.replace(/^\s*Dr\.?\b/, '');
		item.creators.push(ZU.cleanAuthor(name, 'author'));
	}
	
	if (doc.querySelector('.views-field-field-isbn')) {
		item.itemType = 'book';
		item.ISBN = ZU.cleanISBN(text(doc, '.views-field-field-isbn .field-content'));
		item.numPages = text(doc, '.views-field-field-pages .field-content')
			.replace('pp.', '');
		item.publisher = text(doc, '.views-field-field-publisher-name .field-content');
		
		// this is VERY fragile, but oh well. it isn't crucial and there's no
		// better way besides fetching info from the ISBN (which is worse in terms
		// of speed and isn't guaranteed to be more accurate).
		for (let h3 of doc.querySelectorAll('h3')) {
			if (h3.textContent.includes('About the series editor')) {
				let p = h3.nextElementSibling;
				let seriesEditor = text(p, 'i').replace(/^\s*Dr\.?\b/, '');
				item.creators.push(ZU.cleanAuthor(seriesEditor, 'seriesEditor'));
				break;
			}
		}
	}
	else {
		item.institution = text(doc, '.views-field-field-publisher-name .field-content');
	}
	
	let pdfURL = attr(doc, '.field-pdf-full-publication a', 'href');
	if (pdfURL) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: pdfURL
		});
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.sipri.org/publications/2021/other-publications/new-technologies-and-nuclear-disarmament-outlining-way-forward",
		"items": [
			{
				"itemType": "report",
				"title": "New Technologies and Nuclear Disarmament: Outlining a Way Forward",
				"creators": [
					{
						"firstName": "Tytti",
						"lastName": "Erästö",
						"creatorType": "author"
					}
				],
				"date": "2021-05",
				"abstractNote": "This report sheds light on the impact of recent military-technological advancements on nuclear deterrence and disarmament. Noting that progress towards multilateral disarmament is hardly possible without prior and significant reductions in the largest nuclear weapon arsenals, the report views the resumption of bilateral arms control between Russia and the United States as the most important step towards disarmament at the present moment. It argues that these two countries should move away from their cold war era nuclear doctrines, which seek an ability to win nuclear wars, towards a policy of ‘minimal nuclear deterrence’, that is focused on deterring a nuclear attack.",
				"institution": "SIPRI",
				"language": "en",
				"libraryCatalog": "SIPRI",
				"shortTitle": "New Technologies and Nuclear Disarmament",
				"url": "https://www.sipri.org/publications/2021/other-publications/new-technologies-and-nuclear-disarmament-outlining-way-forward",
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
		"url": "https://www.sipri.org/publications/2021/sipri-policy-papers/china-eu-connectivity-era-geopolitical-competition",
		"items": [
			{
				"itemType": "report",
				"title": "China–EU Connectivity in an Era of Geopolitical Competition",
				"creators": [
					{
						"firstName": "Ian",
						"lastName": "Anthony",
						"creatorType": "author"
					},
					{
						"firstName": "Jiayi",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "Jingdong",
						"lastName": "Yuan",
						"creatorType": "author"
					},
					{
						"firstName": "Fei",
						"lastName": "Su",
						"creatorType": "author"
					},
					{
						"firstName": "Jinyung",
						"lastName": "Kim",
						"creatorType": "author"
					}
				],
				"date": "2021-03",
				"abstractNote": "The long-standing relationship between China and the European Union (EU) is being subsumed into a broader geopolitical competition between major power centres. Alongside cooperation, elements of competition and rivalry have been sharpened by a re-evaluation of the bilateral relationship by EU actors. Areas of cooperation have included Chinese involvement in the EU’s internal connectivity projects—specifically in transport and digital networks. This report examines this cooperation and assesses its prospects.",
				"institution": "SIPRI",
				"language": "en",
				"libraryCatalog": "SIPRI",
				"url": "https://www.sipri.org/publications/2021/sipri-policy-papers/china-eu-connectivity-era-geopolitical-competition",
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
		"url": "https://www.sipri.org/publications/2001/evolution-biological-disarmament",
		"items": [
			{
				"itemType": "book",
				"title": "The Evolution of Biological Disarmament",
				"creators": [
					{
						"firstName": "Nicolas A.",
						"lastName": "Sims",
						"creatorType": "author"
					},
					{
						"firstName": "Jean Pascal",
						"lastName": "Zanders",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2001",
				"ISBN": "9780198295785",
				"abstractNote": "In this volume the evolution of the disarmament regime of the 1972 Biological and Toxin Weapons Convention (BTWC) is described from 1980, when the first BTWC Review Conference was held, until 1998. Nicholas A. Sims analyses the results of the first four review conferences; the meetings of the Ad Hoc Group of Governmental Experts to Identify and Examine Potential Verification Measures from a Scientific and Technical Standpoint; the 1994 Special Conference; the current negotiations of the Ad Hoc Group to produce an additional protocol to the BTWC, which may include verification measures; handling of the 1997 Cuban allegation of US biological warfare; and the implementation of Article X of the BTWC on international exchanges and cooperation for peaceful purposes. The strength of the BTWC regime is assessed in the light of its evolution through the review process and its changing contexts, including Russia's admission that it had inherited an offensive biological weapon programme. The Evolution of Biological Disarmament applies an original sector-by-sector approach to its analysis of the BTWC, studied in a long-term perspective.",
				"language": "en",
				"libraryCatalog": "SIPRI",
				"numPages": "203",
				"publisher": "Oxford University Press",
				"url": "https://www.sipri.org/publications/2001/evolution-biological-disarmament",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sipri.org/publications/search?keys=&author_editor=&field_associated_research_area_target_id=All&field_publication_type_target_id=284",
		"items": "multiple"
	}
]
/** END TEST CASES **/
