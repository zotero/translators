{
	"translatorID": "2a5dc3ed-ee5e-4bfb-baad-36ae007e40ce",
	"label": "De Gruyter",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.degruyter\\.com/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-12 21:42:53"
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
	let pageCategory = doc.body.getAttribute('data-pagecategory');
	switch (pageCategory) {
		case 'book':
			return 'book';
		case 'chapter':
			return 'bookSection';
		case 'article':
			return 'journalArticle';
		case 'search':
		case 'journal':
		default:
			if (getSearchResults(doc, true)) {
				return "multiple";
			}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.resultTitle > a[href*="/document/"]');
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
	// EM is, as a general rule, better than RIS on this site. It's missing a
	// couple things, though - subtitles, DOIs for books (to the extent that
	// those are useful) - so we'll fill those in manually.
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (item.date) {
			item.date = item.date.replace(/\//g, '-');
		}
		
		if (item.section && (item.section == item.publicationTitle || item.section == item.bookTitle)) {
			delete item.section;
		}
		
		let DOI = ZU.cleanDOI(attr(doc, '.doi > a', 'href'));
		if (DOI) {
			item.DOI = DOI;
		}
		
		item.attachments = [];
		let pdfURL = attr(doc, 'a.downloadPdf', 'href');
		if (pdfURL) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
		}
		
		let subtitle = text(doc, 'h2.subtitle');
		if (subtitle && !item.title.includes(': ')) {
			item.title = `${item.title.trim()}: ${subtitle}`;
		}
		
		if (item.itemType == 'book' && item.bookTitle) {
			delete item.bookTitle;
		}
		
		if (item.itemType == 'bookSection') {
			delete item.publicationTitle;
			delete item.abstractNote;
			delete item.rights; // AI training disclaimer!

			let risURL = attr(doc, 'a[title="Download in RIS format"]', 'href');
			if (!risURL) {
				risURL = url.replace(/\/html([?#].*)$/, '/machineReadableCitation/RIS');
			}
			
			ZU.doGet(risURL, function (risText) {
				// De Gruyter uses TI for the container title and T2 for the subtitle
				// Seems nonstandard! So we'll just handle it here
				let titleMatch = risText.match(/^\s*TI\s*-\s*(.+)/m);
				let subtitleMatch = risText.match(/^\s*T2\s*-\s*(.+)/m);
				if (titleMatch) {
					item.bookTitle = titleMatch[1];
					if (subtitleMatch) {
						item.bookTitle = item.bookTitle.trim() + ': ' + subtitleMatch[1];
					}
				}

				let translator = Zotero.loadTranslator('import');
				translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
				translator.setString(risText);
				translator.setHandler('itemDone', (_obj, risItem) => {
					if (!item.creators.some(c => c.creatorType == 'editor')) {
						item.creators.push(...risItem.creators.filter(c => c.creatorType == 'editor'));
					}
					item.complete();
				});
				translator.translate();
			});
		}
		else {
			item.complete();
		}
	});

	translator.getTranslatorObject(function (trans) {
		let detectedType = detectWeb(doc, url);
		if (detectedType == 'book') {
			// Delete citation_inbook_title if this is actually a book, not a book section
			// Prevents EM from mis-detecting as a bookSection in a way that even setting
			// trans.itemType can't override
			let bookTitleMeta = doc.querySelector('meta[name="citation_inbook_title"]');
			if (bookTitleMeta) {
				bookTitleMeta.remove();
			}
		}
		else if (detectedType == 'bookSection') {
			trans.itemType = 'bookSection';
		}
		trans.addCustomFields({
			// This should be the case by default! But I think the page including
			// both article:section and citation_inbook_title is triggering an
			// EM bug (looking into that is a separate todo).
			citation_inbook_title: 'bookTitle'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/vfzg-2021-0028/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Homosexuelle im modernen Deutschland: Eine Langzeitperspektive auf historische Transformationen",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Schwartz",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01",
				"DOI": "10.1515/vfzg-2021-0028",
				"ISSN": "2196-7121",
				"abstractNote": "Die Geschichte homosexueller Menschen im modernen Deutschland besteht nicht nur aus Verfolgung und Diskriminierung, obschon sie oft als solche erinnert wird. Wohl haben homosexuelle Männer unter massiver Verfolgung gelitten, und auch lesbische Frauen waren vielen Diskriminierungen ausgesetzt. Doch die Geschichte der letzten 200 Jahre weist nicht nur jene Transformation im Umgang mit Homosexualität auf, die ab den 1990er Jahren zur Gleichberechtigung führte, sondern mehrere, inhaltlich sehr verschiedene Umbrüche. Wir haben es weder mit einem Kontinuum der Repression noch mit einer linearen Emanzipationsgeschichte zu tun, sondern mit einer höchst widersprüchlichen langfristigen Entwicklung.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "377-414",
				"publicationTitle": "Vierteljahrshefte für Zeitgeschichte",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"shortTitle": "Homosexuelle im modernen Deutschland",
				"url": "https://www.degruyter.com/document/doi/10.1515/vfzg-2021-0028/html",
				"volume": "69",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Emancipation"
					},
					{
						"tag": "Homosexuality"
					},
					{
						"tag": "National Socialism"
					},
					{
						"tag": "Penal reform"
					},
					{
						"tag": "Pursuit"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.3138/9781487518806/html",
		"items": [
			{
				"itemType": "book",
				"title": "Picturing Punishment: The Spectacle and Material Afterlife of the Criminal Body in the Dutch Republic",
				"creators": [
					{
						"firstName": "Anuradha",
						"lastName": "Gobin",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"ISBN": "9781487518806",
				"abstractNote": "Bringing together themes in the history of art, punishment, religion, and the history of medicine, Picturing Punishment provides new insights into the wider importance of the criminal to civic life.",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"publisher": "University of Toronto Press",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"shortTitle": "Picturing Punishment",
				"url": "https://www.degruyter.com/document/doi/10.3138/9781487518806/html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Dutch Republic"
					},
					{
						"tag": "Renaissance"
					},
					{
						"tag": "afterlife"
					},
					{
						"tag": "art and crime"
					},
					{
						"tag": "art history"
					},
					{
						"tag": "criminals"
					},
					{
						"tag": "deviance"
					},
					{
						"tag": "early modern"
					},
					{
						"tag": "execution rituals"
					},
					{
						"tag": "gallows"
					},
					{
						"tag": "history of crime"
					},
					{
						"tag": "material culture"
					},
					{
						"tag": "public spectacles"
					},
					{
						"tag": "punishment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.3138/9781487518806-008/html",
		"items": [
			{
				"itemType": "bookSection",
				"title": "5 Serving the Public Good: Reform, Prestige, and the Productive Criminal Body in Amsterdam",
				"creators": [
					{
						"firstName": "Anuradha",
						"lastName": "Gobin",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"ISBN": "9781487518806",
				"bookTitle": "Picturing Punishment: The Spectacle and Material Afterlife of the Criminal Body in the Dutch Republic",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "135-157",
				"publisher": "University of Toronto Press",
				"shortTitle": "5 Serving the Public Good",
				"url": "https://www.degruyter.com/document/doi/10.3138/9781487518806-008/html",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/ncrs-2021-0236/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Crystal structure of (E)-7-fluoro-2-((6-methoxypyridin-3-yl)methylene)-3,4-dihydronaphthalen-1(2H)-one, C17H14FNO2",
				"creators": [
					{
						"firstName": "Xiang-Yi",
						"lastName": "Su",
						"creatorType": "author"
					},
					{
						"firstName": "Xiao-Fan",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Qing-Guo",
						"lastName": "Meng",
						"creatorType": "author"
					},
					{
						"firstName": "Hong-Juan",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01",
				"DOI": "10.1515/ncrs-2021-0236",
				"ISSN": "2197-4578",
				"abstractNote": "C 17 H 14 FNO 2 , monoclinic, P 2 1 / c (no. 15), a  = 7.3840(6) Å, b  = 10.9208(8) Å, c  = 16.7006(15) Å, β  = 101.032(9)°, V  = 1321.84(19) Å 3 , Z  = 4, R gt ( F ) = 0.0589, wR ref ( F 2 ) = 0.1561, T = 100.00(18) K.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "1101-1103",
				"publicationTitle": "Zeitschrift für Kristallographie - New Crystal Structures",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"url": "https://www.degruyter.com/document/doi/10.1515/ncrs-2021-0236/html",
				"volume": "236",
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
		"url": "https://www.degruyter.com/document/doi/10.1515/ncrs-2021-0236/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Crystal structure of (E)-7-fluoro-2-((6-methoxypyridin-3-yl)methylene)-3,4-dihydronaphthalen-1(2H)-one, C17H14FNO2",
				"creators": [
					{
						"firstName": "Xiang-Yi",
						"lastName": "Su",
						"creatorType": "author"
					},
					{
						"firstName": "Xiao-Fan",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Qing-Guo",
						"lastName": "Meng",
						"creatorType": "author"
					},
					{
						"firstName": "Hong-Juan",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01",
				"DOI": "10.1515/ncrs-2021-0236",
				"ISSN": "2197-4578",
				"abstractNote": "C 17 H 14 FNO 2 , monoclinic, P 2 1 / c (no. 15), a  = 7.3840(6) Å, b  = 10.9208(8) Å, c  = 16.7006(15) Å, β  = 101.032(9)°, V  = 1321.84(19) Å 3 , Z  = 4, R gt ( F ) = 0.0589, wR ref ( F 2 ) = 0.1561, T = 100.00(18) K.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "1101-1103",
				"publicationTitle": "Zeitschrift für Kristallographie - New Crystal Structures",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"url": "https://www.degruyter.com/document/doi/10.1515/ncrs-2021-0236/html",
				"volume": "236",
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
		"url": "https://www.degruyter.com/search?query=test",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/journal/key/mt/html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.degruyter.com/document/doi/10.1515/9783110773712-010/html",
		"items": [
			{
				"itemType": "bookSection",
				"title": "10 Skaldic Poetry – Encrypted Communication",
				"creators": [
					{
						"firstName": "Jon Gunnar",
						"lastName": "Jørgensen",
						"creatorType": "author"
					},
					{
						"lastName": "Engh",
						"firstName": "Line Cecilie",
						"creatorType": "editor"
					},
					{
						"lastName": "Gullbekk",
						"firstName": "Svein Harald",
						"creatorType": "editor"
					},
					{
						"lastName": "Orning",
						"firstName": "Hans Jacob",
						"creatorType": "editor"
					}
				],
				"date": "2024-08-19",
				"ISBN": "9783110773712",
				"bookTitle": "Standardization in the Middle Ages: Volume 1: The North",
				"language": "en",
				"libraryCatalog": "www.degruyter.com",
				"pages": "229-250",
				"publisher": "De Gruyter",
				"url": "https://www.degruyter.com/document/doi/10.1515/9783110773712-010/html",
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
