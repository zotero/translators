{
	"translatorID": "6d087de8-f858-4ac5-9fbd-2bf2b35ee41a",
	"label": "Brill",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.|referenceworks\\.|bibliographies\\.)?brill(online)?\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-21 04:55:10"
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
	if (doc.querySelector('meta[name="citation_title"]')) {
		if (url.includes('/journals/')) {
			return 'journalArticle';
		}
		else if (url.includes('referenceworks.brillonline.com/entries/')) {
			return 'encyclopediaArticle';
		}
		else {
			return 'book';
		}
	}
	else if (url.includes('bibliographies.brillonline.com/entries/')
		&& doc.querySelector('#export-form')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#searchContent .text-headline a, .type-article .text-headline a, .result-item .book-title a');
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
	if (url.includes('bibliographies.brillonline.com/entries/')) {
		scrapeBibliography(doc, url);
		return;
	}
	
	if (doc.querySelector('body > meta')) {
		// Brill's HTML is structured incorrectly, and it causes some parsers
		// to interpret the <meta> tags as being in the body, which breaks EM.
		// We'll fix it here.
		for (let meta of doc.querySelectorAll('body > meta')) {
			doc.head.appendChild(meta);
		}
	}
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		
		if (item.itemType == 'journalArticle' && item.section) {
			delete item.section;
		}
		
		if (item.itemType == 'book' && item.publicationTitle) {
			delete item.publicationTitle;
		}
		
		if (item.abstractNote && item.abstractNote.endsWith('by Brill.')) {
			delete item.abstractNote;
		}
		
		if (!item.creators.length) {
			// editors often don't make it into the EM
			for (let editor of doc.querySelectorAll('.content-contributor-editor a')) {
				item.creators.push(ZU.cleanAuthor(editor.textContent, 'editor'));
			}
		}
		
		if (item.attachments.length > 1) {
			// only remove snapshot if we get a PDF
			item.attachments = item.attachments.filter(at => at.title != 'Snapshot');
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		if (url.includes('referenceworks.brillonline.com/entries/')) {
			trans.itemType = 'encyclopediaArticle';
		}
		
		trans.doWeb(doc, url);
	});
}

function scrapeBibliography(doc, url) {
	let params = new URLSearchParams({
		entryId: attr(doc, 'input[name="entryId"]', 'value'),
		dest: attr(doc, 'input[name="dest"]', 'value')
	}).toString();
	
	ZU.doPost('/export/exportRis', params, function (ris) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
		translator.setString(ris);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.journalAbbreviation == item.publicationTitle) {
				delete item.journalAbbreviation;
			}
			
			if (item.url) {
				item.url = item.url.replace(':443', '');
			}
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brill.com/view/journals/afdi/5/1/article-p27_3.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "African Trading Post in Guangzhou: Emergent or Recurrent Commercial Form?",
				"creators": [
					{
						"firstName": "Sylvie",
						"lastName": "Bredeloup",
						"creatorType": "author"
					}
				],
				"date": "2012-01-01",
				"DOI": "10.1163/187254612X646206",
				"ISSN": "1872-5457, 1872-5465",
				"abstractNote": "Abstract In the early 2000s, nationals of Sub-Saharan Africa who had settled in the market places of Hong Kong, Bangkok, Jakarta, and Kuala Lumpur, moved to Guangzhou and opened offices in the upper floors of buildings in Baiyun and Yuexiu Districts. These were located in the northwest of the city, near the central railway station and one of the two fairs of Canton. Gradually these traders were able to create the necessary conditions of hospitality by opening community restaurants on upper floors, increasing the number of showrooms and offices as well as the services of freight and customs clearance in order to live up to an African itinerant customer’s expectations. From interviews carried out between 2006 and 2009 in the People’s Republic of China and in Hong Kong, Bangkok, Dubai, and West Africa, the article will first highlight the economic logics which have contributed to the constitution of African trading posts in China and describe their extension from the Middle East and from Asia. The second part will determine the respective roles of migrants and traveling Sub-Saharan entrepreneurs, before exploring their interactions with Chinese society in the setting up of these commercial networks. It will also look at the impact of toughening immigration policies. It is the principle of the African trading posts of anchoring of some traders in strategic places negotiated with the host society that allows the movement but also the temporary settlement of many visitors. The first established traders purchase products manufactured in the hinterland to fulfill the demand of the itinerant merchants who in turn supply customers located in other continents.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "brill.com",
				"pages": "27-50",
				"publicationTitle": "African Diaspora",
				"shortTitle": "African Trading Post in Guangzhou",
				"url": "https://brill.com/view/journals/afdi/5/1/article-p27_3.xml",
				"volume": "5",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "African entrepreneurs"
					},
					{
						"tag": "African migration"
					},
					{
						"tag": "Guangzhou"
					},
					{
						"tag": "comptoir commercial"
					},
					{
						"tag": "entrepreneurs africains"
					},
					{
						"tag": "migration africaine"
					},
					{
						"tag": "trading post"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/search?q2=ottoman+missionary",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/jal/49/3/article-p171_1.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Arabic Adventures of Télémaque: Trajectory of a Global Enlightenment Text in the Nahḍah",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Hill",
						"creatorType": "author"
					}
				],
				"date": "2018-08-17",
				"DOI": "10.1163/1570064x-12341367",
				"ISSN": "0085-2376, 1570-064x",
				"abstractNote": "Abstract The Marquis de Fénelon’s internationally popular didactic narrative, Les aventures de Télémaque, went through a remarkable number of metamorphoses in the Nahḍah, the Arab world’s cultural revival movement of the long nineteenth century. This article examines two early manuscript translations by Syrian Christian writers in the 1810s, the rhymed prose version by Rifāʿah Rāfiʿ al-Ṭahṭāwī in the 1860s; its rewriting by Shāhīn ʿAṭiyyah in 1885; and Saʿdallāh al-Bustānī’s musical drama of 1869, the basis for performances later in the century by the famous actor Salāmah Ḥijāzī. Placing Télémaque’s Arabic trajectory within its global vogue in the Enlightenment suggests ways of reading the Nahḍah between theories of world literature and ‘transnational mass-texts’, and more specific local histories of translation and literary adaptation. The ambiguity of Télémaque, its hybrid and transitional form, was important to its success in milieux facing analogous kinds of hybridity and transition—among them those of the Arab Nahḍah.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "brill.com",
				"pages": "171-203",
				"publicationTitle": "Journal of Arabic Literature",
				"shortTitle": "The Arabic Adventures of Télémaque",
				"url": "https://brill.com/view/journals/jal/49/3/article-p171_1.xml",
				"volume": "49",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Arab theater"
					},
					{
						"tag": "Beirut"
					},
					{
						"tag": "Cairo"
					},
					{
						"tag": "Enlightenment"
					},
					{
						"tag": "Fénelon"
					},
					{
						"tag": "Nahḍah"
					},
					{
						"tag": "adaptation"
					},
					{
						"tag": "translation"
					},
					{
						"tag": "world literature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/title/58302",
		"items": [
			{
				"itemType": "book",
				"title": "Encyclopaedia of Islam - Three 2021-3",
				"creators": [
					{
						"firstName": "Kate",
						"lastName": "Fleet",
						"creatorType": "editor"
					},
					{
						"firstName": "Gudrun",
						"lastName": "Krämer",
						"creatorType": "editor"
					},
					{
						"firstName": "Denis",
						"lastName": "Matringe",
						"creatorType": "editor"
					},
					{
						"firstName": "John",
						"lastName": "Nawas",
						"creatorType": "editor"
					},
					{
						"firstName": "Everett",
						"lastName": "Rowson",
						"creatorType": "editor"
					}
				],
				"date": "2021-04-30",
				"ISBN": "9789004435957",
				"language": "en",
				"libraryCatalog": "brill.com",
				"publisher": "Brill",
				"url": "https://brill.com/view/title/58302",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "General"
					},
					{
						"tag": "Middle East and Islamic Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://brill.com/view/journals/ejjs/15/2/ejjs.15.issue-2.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://referenceworks.brillonline.com/entries/encyclopaedia-iranica-online/abaev-vasilii-ivanovich-COM_362360",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "ABAEV, VASILIĬ IVANOVICH",
				"creators": [
					{
						"firstName": "Ilya",
						"lastName": "Yakubovich",
						"creatorType": "author"
					}
				],
				"date": "2021-05-10",
				"encyclopediaTitle": "Encyclopaedia Iranica Online",
				"language": "en",
				"libraryCatalog": "referenceworks.brillonline.com",
				"publisher": "Brill",
				"url": "https://referenceworks.brillonline.com/entries/encyclopaedia-iranica-online/abaev-vasilii-ivanovich-COM_362360",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://referenceworks.brillonline.com/browse/encyclopaedia-iranica-online/alpha/e",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://bibliographies.brillonline.com/entries/bibliography-of-slavic-linguistics/perspektive-proucavanja-alhamijado-pismenosti-projekt-transkripcije-i-transliteracije-alhamijado-tekstova-lb900000427509?s.num=0&s.f.s2_parent=s.f.book.bibliography-of-slavic-linguistics&s.keywords=%22Abjad%22",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perspektive proučavanja alhamijado pismenosti : projekt transkripcije i transliteracije alhamijado tekstova",
				"creators": [
					{
						"lastName": "Kalajdžija",
						"firstName": "Alen",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"language": "English",
				"libraryCatalog": "Brill",
				"pages": "421-430",
				"publicationTitle": "Prilozi za orijentalnu filologiju = Contributions to Oriental Philology = Revue de Philologie Orientale",
				"shortTitle": "Perspektive proučavanja alhamijado pismenosti",
				"url": "https://bibliographies.brillonline.com/entries/bibliography-of-slavic-linguistics/perspektive-proucavanja-alhamijado-pismenosti-projekt-transkripcije-i-transliteracije-alhamijado-tekstova-lb900000427509",
				"volume": "64",
				"attachments": [],
				"tags": [
					{
						"tag": "Abjad"
					},
					{
						"tag": "Script, orthography"
					},
					{
						"tag": "Serbo-Croatian (Serbian, Croatian, Bosnian)"
					},
					{
						"tag": "Transliteration"
					}
				],
				"notes": [
					{
						"note": "<p>E. ab.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bibliographies.brillonline.com/search?s.num=0&s.f.s2_parent=s.f.book.bibliography-of-slavic-linguistics&s.keywords=%22Abjad%22",
		"items": "multiple"
	}
]
/** END TEST CASES **/
