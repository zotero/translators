{
	"translatorID": "e04e4bab-64c2-4b9a-b6c2-7fb186281969",
	"label": "L'Année Philologique",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://cpps\\.brepolis\\.net/aph/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-13 02:22:54"
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (doc.querySelectorAll('a.icon-export')) {
		let pubType = text(doc, 'a[href*="&publication_type="]');
		switch (pubType.trim()) {
			case 'Article in journal':
				return 'journalArticle';
			default:
				return 'book';
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result a.title');
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
	let risURL = attr(doc, 'a.icon-export', 'href');
	let body = 'export_filename=export.ris&export_type=download&export_format=ris';
	
	ZU.doPost(risURL, body, function (risText) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			delete item.archive;
			item.libraryCatalog = "L'Année Philologique";
			
			addAttachment(item, doc);
			
			item.complete();
		});
		translator.translate();
	});
}

function addAttachment(item, doc) {
	// no meaningful classes or IDs here, so we'll crawl manually.
	// it's easier than XPath!
	for (let link of doc.querySelectorAll('table li a')) {
		// "(Full text)" is the label across languages
		if (link.nextSibling && link.nextSibling.textContent.includes('(Full text)')) {
			if (link.href.endsWith('.pdf')) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: link.href
				});
			}
			else {
				item.attachments.push({
					title: 'Full Text Source',
					mimeType: 'text/html',
					url: link.href
				});
			}
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cpps.brepolis.net/aph/search.cfm?action=search_simple_detail_single&startrow=1&endrow=1&search_order=year_desc&ALLFIELDS=test&PERIOD_CLOSE_MATCHES=0&search_selection=725043",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "« The only event mightier than everyone’s hope » : classical historiography and Eusebius’ plague narrative",
				"creators": [
					{
						"lastName": "DeVore",
						"firstName": "David J.",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"abstractNote": "Eusebius’s account of the plague of Cyprian in HE 7, 21-22 stands as a test case for Christian engagement with classical historiography. Deploying quotations from Dionysius, the bishop of Alexandria in the 250s, Eusebius referenced Thucydides’s plague and invited comparison to further plague narratives in Diodorus, Dionysius of Halicarnassus, and Josephus. Eusebius’s plague highlights divine vengeance on pagan Alexandrians and represents Christians as honorable sufferers.",
				"libraryCatalog": "L'Année Philologique",
				"pages": "1-34",
				"publicationTitle": "Histos: The On-Line Journal of Ancient Historiography",
				"shortTitle": "« The only event mightier than everyone’s hope »",
				"url": "https://research.ncl.ac.uk/histos/documents/2020AA01DeVoreEusebiusPlagueNarrative.pdf",
				"volume": "14",
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
		"url": "http://cpps.brepolis.net/aph/search.cfm?action=search_simple_detail_single&startrow=2&endrow=2&search_order=year_desc&ALLFIELDS=test&PERIOD_CLOSE_MATCHES=0&search_selection=726292",
		"items": [
			{
				"itemType": "book",
				"title": "Simply come copying : direct copies as test cases in the quest for scribal habits",
				"creators": [
					{
						"lastName": "Farnes",
						"firstName": "Alan Taylor",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISBN": "9783161569807",
				"abstractNote": "Betrifft Abschriften des NT.",
				"libraryCatalog": "L'Année Philologique",
				"numPages": "XIV-253 p. 3 index",
				"place": "Tübingen",
				"publisher": "Mohr Siebeck",
				"series": "Wissenschaftliche Untersuchungen zum Neuen Testament. 2. Reihe",
				"shortTitle": "Simply come copying",
				"url": "https://d-nb.info/1176726757/04",
				"volume": "481",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://cpps.brepolis.net/aph/search.cfm?action=search_simple_detail_single&startrow=3&endrow=3&search_order=year_desc&ALLFIELDS=test&PERIOD_CLOSE_MATCHES=0&search_selection=722155",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A problem child : Herodotus and the young Athenian democracy",
				"creators": [
					{
						"lastName": "Pelling",
						"firstName": "Christopher",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "0165-8204",
				"abstractNote": "Hippias prévient les Corinthiens, vers 504 av. J.-C., qu’ils souffriront peut-être un jour de la main d’Athènes (Hdt. 5, 93, 1). Hérodote accorde une plus grande importance à la liberté qu’à la démocratie. Son récit ne juge pas positivement ou négativement la jeune démocratie athénienne, qui n’a pas encore eu le temps de prouver sa valeur. Alors que la Perse et Xerxès ont offert un test sur la façon dont les hommes se comportent lorsque le pouvoir du dirigeant est au plus haut, Athènes offre un cadre d’analyse parfaitement opposé où la liberté personnelle est à son apogée.",
				"issue": "1",
				"libraryCatalog": "L'Année Philologique",
				"pages": "28-42",
				"publicationTitle": "Lampas: Tijdschrift voor Nederlandse Classici",
				"shortTitle": "A problem child",
				"url": "https://lampas.verloren.nl",
				"volume": "52",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://cpps.brepolis.net/aph/search.cfm?action=search_simple_result&allfields_boolean=and&startrow=1&search_order=year_desc&log_quicksearch=1&allfields=environment&frm_quick_search_submithidden=submit",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://cpps.brepolis.net/aph/search.cfm?ALLFIELDS=environment&action=search_simple_detail_single&endrow=1&PERIOD_CLOSE_MATCHES=0&startrow=1&search_selection=,&&search_order=year_desc",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Echoes of empire: Roman imperialism in Avienus’s « Descriptio orbis terrae »",
				"creators": [
					{
						"lastName": "Bélanger",
						"firstName": "Caroline",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1353/jla.2020.0017",
				"ISSN": "1939-6716",
				"abstractNote": "Examination of the imperial message behind Avienus’s « Descriptio orbis terrae », a poem that revolves around the Roman relationship with the environment and Rome’s suitability for imperial rule. Avienus constructs his poem against Vergilian ideas on the relationship between agricultural toil and civilization, as espoused in the « Georgics ». Avienus ascribes agency to lands and rivers and uses this technique to establish relationships between regions and their inhabitants in order to support his argument for the beneficial imperial rule of Rome.",
				"issue": "2",
				"libraryCatalog": "L'Année Philologique",
				"pages": "193-219",
				"publicationTitle": "Journal of Late Antiquity",
				"shortTitle": "Echoes of empire",
				"url": "https://doi.org/10.1353/jla.2020.0017",
				"volume": "13",
				"attachments": [
					{
						"title": "Full Text Source",
						"mimeType": "text/html"
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
