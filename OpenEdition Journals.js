{
	"translatorID": "87766765-919e-4d3b-9071-3dd7efe984c8",
	"label": "OpenEdition Journals",
	"creator": "Aurimas Vinckevicius, Pierre-Alain Mignot, Michael Berkowitz, Hélène Prieto, Jean-François Rivière",
	"target": "^https?://journals\\.openedition\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-02 00:22:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020-2021 Aurimas Vinckevicius, Pierre-Alain Mignot, Michael Berkowitz, Hélène Prieto, Jean-François Rivière

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
	var types = ZU.xpath(doc, '//meta[@name="DC.type"]/@content');
	for (let i = 0, n = types.length; i < n; i++) {
		switch (types[i].textContent.toLowerCase()) {
			case 'journalarticle':
				return 'journalArticle';
			case 'collection':
				return 'multiple';
			case 'booksection':
				return 'bookSection';
		}
	}

	if (ZU.xpath(doc, '//div[@id="inside"]/div[@class="sommaire"]/dl[@class="documents"]/dd[@class="titre"]/a').length
		|| ZU.xpath(doc, '//ul[@class="summary"]//div[@class="title"]/a').length) {
		return "multiple";
	}
	else if (ZU.xpath(doc, '//h1[@id="docTitle"]/span[@class="text"]').length
		|| /document\d+/.test(url)) {
		return "journalArticle";
	}
	return false;
}

function scrape(doc, url) {
	// Example: https://journals.openedition.org/remi/persee-144614
	if (/persee-\d+/.test(url)) {
		// the article is on Persée portal, getting it to be translated by COinS
		let translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
		translator.setDocument(doc);
		translator.translate();
	}
	else {
		// use Embeded Metadata
		let translator = Zotero.loadTranslator('web');
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);
		translator.setHandler('itemDone', function (obj, item) {
			// editor and translator declarations not part of DC spec
			// editors (and compilers)
			var editors = ZU.xpath(doc, '//meta[@name="DC.contributor.edt" or @name="DC.contributor.com"]/@content');
			for (let i = 0, n = editors.length; i < n; i++) {
				item.creators.push(
					ZU.cleanAuthor(editors[i].textContent, 'editor', true));
			}
			// translators
			var trans = ZU.xpath(doc,
				'//meta[@name="DC.contributor.trl"]/@content');
			for (let i = 0, n = trans.length; i < n; i++) {
				item.creators.push(
					ZU.cleanAuthor(trans[i].textContent, 'translator', true));
			}
			// fix all caps for author last names
			for (let i = 0; i < item.creators.length; i++) {
				if (item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
					item.creators[i].lastName = ZU.capitalizeTitle(item.creators[i].lastName.toLowerCase(), true);
				}
			}
			// set abstract and keywords based on documents language
			var locale = ZU.xpathText(doc, '//meta[@name="citation_language"]/@content');
			// default to french if not set
			locale = locale ? locale.toLowerCase() : 'fr';

			// get abstract and tags in document language
			// or the first locale available
			item.abstractNote = ZU.xpathText(doc,
				'//meta[@name="description" or @name="DC.description"][lang("' + locale + '") or @lang="' + locale + '"][1]/@content')
				|| ZU.xpathText(doc,
					'//meta[@name="description" or @name="DC.description"][1]/@content');

			var tags = ZU.xpathText(doc,
				'//meta[@name="keywords" or @name="DC.subject"][lang("' + locale + '") or @lang="' + locale + '"][1]/@content')
				|| ZU.xpathText(doc,
					'//meta[@name="keywords" or @name="DC.subject"][1]/@content');
			if (tags) {
				item.tags = tags.trim().split(/\s*,\s*/);
			}

			delete item.extra;
		
			// The site lists all editor of journals as editor in the header. Remove them.
			// I don't think there is a use case for editors for journal articles
			if (item.itemType === "journalArticle") {
				for (let i = 0; i < item.creators.length; i++) {
					if (item.creators[i].creatorType === "editor") {
						item.creators.splice(i--, 1);
					}
				}
			}
			
			for (let i = 0; i < item.attachments.length; i++) {
				if (item.attachments[i].title == 'Snapshot') {
					item.attachments.splice(i, 1);
					break;
				}
			}
			
			// store the language-specific url
			item.url = url;

			item.complete();
		});

		translator.getTranslatorObject(function (trans) {
			// override some of the mappings
			trans.addCustomFields({
				'prism.number': 'issue',
				'prism.volume': 'volume',
				'DC.title': 'title'
			});

			trans.doWeb(doc, url);
		});
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var results = ZU.xpath(doc, '//div[@id="inside"]/div[@class="sommaire"]/dl[@class="documents"]/dd[@class="titre"]');
		if (!results.length) {
			results = ZU.xpath(doc, '//ul[@class="summary"]//div[@class="title"]');
		}

		Zotero.selectItems(ZU.getItemArray(doc, results), function (selectedItems) {
			if (!selectedItems) return true;

			var urls = [];
			for (let i in selectedItems) {
				urls.push(i);
			}

			ZU.processDocuments(urls, scrape);

			return true;
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.openedition.org/amerika/1283",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.openedition.org/e-spania/12303?lang=fr",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"creators": [
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "author"
					}
				],
				"date": "2008/02/01",
				"DOI": "10.4000/e-spania.12303",
				"ISSN": "1951-6169",
				"abstractNote": "Le testament d’Elvire livre de précieuses informations sur la réalité historique de l’infantat : son implantation, la composition de ses biens, ses évolutions, les formes de son acquisition et de sa transmission, sa fonction politique. Mais il nous renseigne aussi sur une infante de niveau moyen, sur son cadre de vie, son entourage, ses activités, les réseaux de son pouvoir et même sur sa foi.",
				"issue": "5",
				"language": "fr",
				"libraryCatalog": "journals.openedition.org",
				"publicationTitle": "e-Spania. Revue interdisciplinaire d’études hispaniques médiévales et modernes",
				"rights": "Les contenus de la revue e-Spania sont mis à disposition selon les termes de la Licence Creative Commons Attribution - Pas d'Utilisation Commerciale - Pas de Modification 4.0 International.",
				"url": "https://journals.openedition.org/e-spania/12303?lang=fr",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Alphonse VI de Castille et de León"
					},
					{
						"tag": "Elvire Fernandez"
					},
					{
						"tag": "Ferdinand Ier de Castille et de León"
					},
					{
						"tag": "Saint-Isidore de León"
					},
					{
						"tag": "Sancie Raimundez"
					},
					{
						"tag": "Urraque Fernandez"
					},
					{
						"tag": "XIe siècle"
					},
					{
						"tag": "infantat"
					},
					{
						"tag": "infantaticum"
					},
					{
						"tag": "infante Elvire"
					},
					{
						"tag": "infante Sancie"
					},
					{
						"tag": "infante Urraque"
					},
					{
						"tag": "testament"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.openedition.org/e-spania/12303?lang=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le testament d’Elvire (Tábara, 1099)",
				"creators": [
					{
						"firstName": "Georges",
						"lastName": "Martin",
						"creatorType": "author"
					}
				],
				"date": "2008/02/01",
				"DOI": "10.4000/e-spania.12303",
				"ISSN": "1951-6169",
				"abstractNote": "Le testament d’Elvire livre de précieuses informations sur la réalité historique de l’infantat : son implantation, la composition de ses biens, ses évolutions, les formes de son acquisition et de sa transmission, sa fonction politique. Mais il nous renseigne aussi sur une infante de niveau moyen, sur son cadre de vie, son entourage, ses activités, les réseaux de son pouvoir et même sur sa foi.",
				"issue": "5",
				"language": "fr",
				"libraryCatalog": "journals.openedition.org",
				"publicationTitle": "e-Spania. Revue interdisciplinaire d’études hispaniques médiévales et modernes",
				"rights": "Les contenus de la revue e-Spania sont mis à disposition selon les termes de la Licence Creative Commons Attribution - Pas d'Utilisation Commerciale - Pas de Modification 4.0 International.",
				"url": "https://journals.openedition.org/e-spania/12303?lang=es",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Alphonse VI de Castille et de León"
					},
					{
						"tag": "Elvire Fernandez"
					},
					{
						"tag": "Ferdinand Ier de Castille et de León"
					},
					{
						"tag": "Saint-Isidore de León"
					},
					{
						"tag": "Sancie Raimundez"
					},
					{
						"tag": "Urraque Fernandez"
					},
					{
						"tag": "XIe siècle"
					},
					{
						"tag": "infantat"
					},
					{
						"tag": "infantaticum"
					},
					{
						"tag": "infante Elvire"
					},
					{
						"tag": "infante Sancie"
					},
					{
						"tag": "infante Urraque"
					},
					{
						"tag": "testament"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.openedition.org/chs/142",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "L’encadrement des Algériens de Paris (1944-1954), entre contraintes juridiques et arbitraire policier",
				"creators": [
					{
						"firstName": "Emmanuel",
						"lastName": "Blanchard",
						"creatorType": "author"
					}
				],
				"date": "2007/06/01",
				"DOI": "10.4000/chs.142",
				"ISSN": "1422-0857",
				"abstractNote": "Au sortir de la Seconde Guerre mondiale, pour sauvegarder son empire colonial, la France est contrainte de reconnaître la citoyenneté des Français musulmans d’Algérie (FMA). Dès lors, ceux-ci se retrouvent en métropole dans une situation proche de celle d’autres citoyens diminués (vagabonds, prostituées…) qui, bien que juridiquement peu accessibles à la répression policière sont considérés comme « indésirables » et constituent la clientèle privilégiée de forces de l’ordre agissant aux marges de la loi. Si l’ethnicité, la xénophobie, et la situation coloniale contribuent à définir les Algériens comme « indésirables », le répertoire d’actions policier envers les FMA tient avant tout à la façon dont l’arène policière est médiatisée par le contrôle et la représentation politiques.",
				"issue": "1",
				"language": "fr",
				"libraryCatalog": "journals.openedition.org",
				"pages": "5-25",
				"publicationTitle": "Crime, Histoire & Sociétés / Crime, History & Societies",
				"rights": "© Droz",
				"url": "https://journals.openedition.org/chs/142",
				"volume": "11",
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
		"url": "https://journals.openedition.org/remi/2495",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Multiracial Classification on the United States Census",
				"creators": [
					{
						"firstName": "Ann",
						"lastName": "Morning",
						"creatorType": "author"
					}
				],
				"date": "2005/06/01",
				"DOI": "10.4000/remi.2495",
				"ISSN": "0765-0752",
				"abstractNote": "In 1997, the United States’ federal guidelines on racial classification were amended to permit individual respondents to identify themselves as members of more than one race. This measure, taken at the urging of a vocal community of mixed-race individuals and organizations, was seen by many as having important consequences. In this article I examine the predictions about the impact of multiple-race classification, and assess how accurate they have proved to be. I conclude however that neither the hopes nor fears associated with multiracial recognition have been realized. Instead, the most important legacy of the recognition of mixed-race America is likely to be its contribution to the debate about classifying a much larger segment of the population: the Hispanic community.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "journals.openedition.org",
				"pages": "111-134",
				"publicationTitle": "Revue européenne des migrations internationales",
				"rights": "© Université de Poitiers",
				"url": "https://journals.openedition.org/remi/2495",
				"volume": "21",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "ethnicisation"
					},
					{
						"tag": "méthodologie"
					},
					{
						"tag": "recensement"
					},
					{
						"tag": "statistiques"
					},
					{
						"tag": "États-Unis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
