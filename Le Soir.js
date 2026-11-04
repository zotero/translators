{
	"translatorID": "79155be5-1836-4fcb-a4a0-a2e216befa3a",
	"label": "Le Soir",
	"creator": "Alexandre Bossard",
	"target": "^https?://(www\\.)?(plus\\.)?lesoir\\.be/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-11-28 11:52:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Alexandre Bossard
	
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
	if (url.includes("/article/")) {
		return "newspaperArticle";
	}
	else if (url.includes("/recherche?")) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li[@class="article-inline small gr-article-payant"]/a');
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
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		item.date = ZU.strToISO(ZU.xpathText(doc, '//time[@class=" pubdate updated"]'));
		item.publicationTitle = "Le Soir";
		item.ISSN = "1375-5668";
		var authorString = ZU.xpathText(doc, '//div[@class="gr-article-infos"]/p[@class="gr-meta gr-meta-author"]|//div[@class="required-fields gr-infos-author"]/p[@class="gr-meta gr-meta-author"]');
		if (authorString) {
			authorString = authorString.replace('Par ', '');
			item.creators = [];
			var authors = authorString.split(/,|et/);
			for (var i = 0; i < authors.length; i++) {
				if (i == authors.length - 1) {
					authors[i] = authors[i].split(",")[0];
				}
				item.creators.push(ZU.cleanAuthor(authors[i], "author"));
			}
		}
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
		"url": "https://plus.lesoir.be/340500/article/2020-11-27/deconfinement-le-gouvernement-valide-un-barometre-quil-enfreint-directement",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Déconfinement: le gouvernement valide un baromètre... qu’il enfreint directement",
				"creators": [
					{
						"firstName": "Xavier",
						"lastName": "Counasse",
						"creatorType": "author"
					}
				],
				"date": "2020-11-27",
				"ISSN": "1375-5668",
				"abstractNote": "L’objectif est de repasser sous les 75 admissions à l’hôpital par jour et les 100 contaminations en 14 jours par 100.000 habitants. Tant qu’on est au-delà, plus d’assouplissement possible, assure le ministre Vandenbroucke.",
				"language": "fr",
				"libraryCatalog": "plus.lesoir.be",
				"publicationTitle": "Le Soir",
				"shortTitle": "Déconfinement",
				"url": "https://www.lesoir.be/340500/article/2020-11-27/deconfinement-le-gouvernement-valide-un-barometre-quil-enfreint-directement",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Le Soir Plus"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.lesoir.be/340501/article/2020-11-27/coronavirus-ca-va-mieux-mais-pas-assez-pour-un-vrai-noel",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coronavirus: ça va mieux, mais pas assez pour un vrai Noël",
				"creators": [
					{
						"firstName": "Martine",
						"lastName": "Dubuisson",
						"creatorType": "author"
					}
				],
				"date": "2020-11-27",
				"ISSN": "1375-5668",
				"abstractNote": "L’ouverture des commerces non essentiels, des piscines et des musées ne sont pas des « assouplissements » assurent les autorités. Même si tout va bien, le déconfinement ne sera pas d’actualité avant février 2021.",
				"language": "fr",
				"libraryCatalog": "plus.lesoir.be",
				"publicationTitle": "Le Soir",
				"shortTitle": "Coronavirus",
				"url": "https://www.lesoir.be/340501/article/2020-11-27/coronavirus-ca-va-mieux-mais-pas-assez-pour-un-vrai-noel",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Le Soir Plus"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.lesoir.be/340527/article/2020-11-28/coronavirus-plus-de-400000-morts-en-europe",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coronavirus: plus de 400.000 morts en Europe",
				"creators": [
					{
						"firstName": "",
						"lastName": "AFP",
						"creatorType": "author"
					}
				],
				"date": "2020-11-28",
				"ISSN": "1375-5668",
				"abstractNote": "L’Europe est la deuxième zone du monde la plus meurtrie par la pandémie.",
				"language": "fr",
				"libraryCatalog": "plus.lesoir.be",
				"publicationTitle": "Le Soir",
				"shortTitle": "Coronavirus",
				"url": "https://www.lesoir.be/340527/article/2020-11-28/coronavirus-plus-de-400000-morts-en-europe",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Le Soir Plus"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.lesoir.be/340459/article/2020-11-27/gauche-le-retour-de-la-troisieme-voie",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "A gauche, le retour de la «troisième voie»?",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Coppi",
						"creatorType": "author"
					}
				],
				"date": "2020-11-27",
				"ISSN": "1375-5668",
				"abstractNote": "Avec la victoire de Joe Biden aux Etats-Unis, le débat à propos d’une nouvelle « troisième voie », façon Clinton-Blair-Schröder il y a 20 ans, est relancé dans certains milieux progressistes. Pour le PS, Paul Magnette reste froid.",
				"language": "fr",
				"libraryCatalog": "plus.lesoir.be",
				"publicationTitle": "Le Soir",
				"url": "https://www.lesoir.be/340459/article/2020-11-27/gauche-le-retour-de-la-troisieme-voie",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Le Soir Plus"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.lesoir.be/archives/recherche?word=ixelles&sort=date%20desc&datefilter=lastyear&form_build_id=form-vJ_E0H-_uFTMEe5MbQUDglWZLDtgbkb49ihdUriCQkQ&form_id=dpidamwidgets_damsimplesearch_content_type_search_form",
		"items": "multiple"
	}
]
/** END TEST CASES **/
