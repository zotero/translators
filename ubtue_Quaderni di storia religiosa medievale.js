{
	"translatorID": "5db07685-2d24-4b0a-9659-2e6af73e58ba",
	"label": "Quaderni di storia religiosa medievale",
	"creator": "Timotheus Kim",
	"target": "^https:?//www\\.rivisteweb\\.it/(doi|issn)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-18 19:17:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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

// attr()/text() v2

function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.includes('/doi/')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let links = doc.querySelectorAll('.servizi li:nth-child(1) a');
	let text = doc.querySelectorAll('#threeColumnsBarCenter h4');
	for (let i = 0; i < links.length; ++i) { 
		let href = links[i].href; 
		let title = ZU.trimInternal(text[i].textContent); 
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
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); 	// Embedded Metadata
	translator.setHandler('itemDone', function (obj, item) {
		item.abstractNote = text(doc, 'p:nth-child(2)');
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/issn/1126-9200/issue/7842",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/doi/10.32052/95676",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cristianizzazione e culture fra tarda antichità e alto medioevo",
				"creators": [
					{
						"firstName": "Luigi",
						"lastName": "Canetti",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.32052/95676",
				"ISSN": "1126-9200",
				"abstractNote": "The article emphasizes the need to find new epistemological categories in order to redefine the relationship between medieval history and religious history, which has been experiencing a crisis for almost forty years. After providing a broad historiographical overview and some concrete examples, the author suggests restarting from fields of research, such as the history of religions, ethno-linguistics, cognitive science and evolutionary biology, that have been able to underline the great heuristic potential in the study of religious experience on the basis of new explicative paradigms of cultural change.",
				"extra": "PMID: 95676",
				"issue": "2",
				"journalAbbreviation": "QM",
				"language": "it",
				"libraryCatalog": "www.rivisteweb.it",
				"pages": "237-265",
				"publicationTitle": "Quaderni di storia religiosa medievale",
				"url": "https://www.rivisteweb.it/doi/10.32052/95676",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Cognitive Science"
					},
					{
						"tag": "Ethno-Linguistics"
					},
					{
						"tag": "History of Religions"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/doi/10.32052/95677",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Culture popolari e dimensione religiosa",
				"creators": [
					{
						"firstName": "Marina",
						"lastName": "Montesano",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.32052/95677",
				"ISSN": "1126-9200",
				"abstractNote": "The concept of popular culture and that, closely linked to it, of popular religion have been discussed in many conferences and essays, especially since the Seventies. The historiographical discussion has taken place within a debate that had already involved philosophical, ethnographic and ethno-linguistic disciplines. This essay retraces its fortunes, dwelling on some of the most important contributions, and concludes discussing the fruitfulness and topicality of this issue.",
				"extra": "PMID: 95677",
				"issue": "2",
				"journalAbbreviation": "QM",
				"language": "it",
				"libraryCatalog": "www.rivisteweb.it",
				"pages": "267-281",
				"publicationTitle": "Quaderni di storia religiosa medievale",
				"url": "https://www.rivisteweb.it/doi/10.32052/95677",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Folklore"
					},
					{
						"tag": "Popular Culture"
					},
					{
						"tag": "Religious Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rivisteweb.it/doi/10.32052/95686",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Temi e problemi della storiografia sul monachesimo latino nel Mezzogiorno dei secoli XI-XIII",
				"creators": [
					{
						"firstName": "Amalia",
						"lastName": "Galdi",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.32052/95686",
				"ISSN": "1126-9200",
				"abstractNote": "Latin monasticism, in all its aspects, has been one of the most widely studied historiographical subjects concerning Southern Italy during recent decades. New sources and new hermeneutic levels have made it possible to know more about this topic and, in particular, its peculiarities and its “inclusionµ within the Italian and European monastic context. This essay proposes a status quaestionis on the research into this subject and the historiographical discussion, which involves especially some monastic institutions (such as SS. Trinità di Cava, S. Maria di Montevergine and S. Maria di Pulsano) in Southern Italy from the 11th to the 13th century. In point of fact, they are characterized by common paths, such as their origins, yet also by later, different developments.",
				"extra": "PMID: 95686",
				"issue": "2",
				"journalAbbreviation": "QM",
				"language": "it",
				"libraryCatalog": "www.rivisteweb.it",
				"pages": "517-539",
				"publicationTitle": "Quaderni di storia religiosa medievale",
				"url": "https://www.rivisteweb.it/doi/10.32052/95686",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					},
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Historiography"
					},
					{
						"tag": "Latin Monasticism"
					},
					{
						"tag": "Southern Italy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
