{
	"translatorID": "fcabdbd7-e3e8-4f4a-9d78-25296417bdc5",
	"label": "CROSBI",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.bib\\.irb\\.hr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-09 22:29:09"
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


function detectWeb(doc, _url) {
	if (doc.querySelector('meta[name="citation_title"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-results .citation-title');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.attachments = [];
		if (doc.querySelector('a.link-pdf')) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: attr(doc, 'a.link-pdf', 'href')
			});
		}
		
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
		"url": "https://www.bib.irb.hr/1130838",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Resorpcija korijena nakon luksacijske ozljede zuba - prikaz slučaja",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Turjanski",
						"creatorType": "author"
					},
					{
						"firstName": "Larisa",
						"lastName": "Musić",
						"creatorType": "author"
					},
					{
						"firstName": "Ivan",
						"lastName": "Zajc",
						"creatorType": "author"
					},
					{
						"firstName": "Mihovil",
						"lastName": "Turčinović",
						"creatorType": "author"
					},
					{
						"firstName": "Hrvoje",
						"lastName": "Jurić",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"abstractNote": "Ciljevi:Resorpcija korijena jest proces kojeg karakterizira gubitak tvrdog zubnog tkiva zbog klastične aktivnosti unutar ili izvan korijena zuba. Resorpcija trajnih zubi uvijek na staje kao posljedica određenih stanja ili događaja (npr. novotvorina, trauma, impaktirani zub). Cilj ovog prikaza slučaja jest predstaviti kasnu komplikaciju traume zuba nakon 8 godina od ozljede. Materijali i metode:Pacijentica, djevojčica u dobi od 8 godina u velja-či 2013. godine, dolazi na naš Zavod zbog traume zubi 11 i 12, 3 mjeseca nakon ozljede. Kroz anamnezu, klinički pregled i radiografsku analizu dijagnosticirana je intruzijska luk-sacija zuba 11 te ekstruzijska luksacija zuba 12 s nezavršenim rastom i razvojem. Učinio se test vitaliteta ozlijeđenih zubi te se kroz sljedećih nekoliko kontrola pratio njihov vitalitet. Nakon 7 mjeseci započet je postupak apeksifikacije na zubu 11. U rujnu 2014. napravilo se konačno punjenje zuba 11 gutaperka štapićima i pastom te se zub konačno restaurirao kompozitnom krunicom. Rezultati: Zbog izostanka simptoma pacijentica dolazi na kon-trolu tek u rujnu 2020., u dobi od 15 godina, kada joj je napravljena dekoronizacija zuba zbog napredovanja nadomjesne resorpcije apikalno, prisutne cervikalne upalne resorpcije te ankiloze zuba koja je dovela do infraokluzije i pomicanja marginalnog ruba gingive zu-ba 11 za 1.5mm u apikalnom smjeru. Kruna zuba je imobilizirana kompozitnim splintom ojačanim staklenim vlaknima. Zaključak:Kod traume zuba od izrazite je važnosti vrijeme koje prođe od nezgode do kliničkog pregleda i hitnog liječenja. Neke od nepoželjnih po-sljedica traume zuba za pacijenta su neizbježne, no njihova klinička slika i opseg se sigurno mogu ublažiti, pa čak i potpuno eliminirati uz pravovremeno liječenje. Cilj i glavna zada-ća specijalista dječje i preventivne dentalne medicine vrlo često jest ‘’kupovanje vreme-na’’ do završetka koštanog rasta i razvoja cjelokupnog stomatognatog sustava, što će u ko-načnici osigurati najbolje preduvjete za liječenje pacijenta, uzimajući u obzir sve biološke uvjete za dugoročna terapijska rješenja nakon komplikacija uzrokovanih traumom zuba.",
				"language": "hr",
				"libraryCatalog": "www.bib.irb.hr",
				"pages": "112",
				"publicationTitle": "Međunarodni kongres „Hrvatski dani dječje stomatologije 2020“ Online kongres Zagreb, 04. - 05. prosinca 2020.",
				"url": "https://www.bib.irb.hr/1130838",
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
		"url": "https://www.bib.irb.hr/1113993",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Assessment of Health-Promoting Lifestyle among Dental Students in Zagreb, Croatia",
				"creators": [
					{
						"firstName": "Larisa",
						"lastName": "Musić",
						"creatorType": "author"
					},
					{
						"firstName": "Tonći",
						"lastName": "Mašina",
						"creatorType": "author"
					},
					{
						"firstName": "Ivan",
						"lastName": "Puhar",
						"creatorType": "author"
					},
					{
						"firstName": "Laura",
						"lastName": "Plančak",
						"creatorType": "author"
					},
					{
						"firstName": "Valentina",
						"lastName": "Kostrić",
						"creatorType": "author"
					},
					{
						"firstName": "Mihaela",
						"lastName": "Kobale",
						"creatorType": "author"
					},
					{
						"firstName": "Ana",
						"lastName": "Badovinac",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.3390/dj9030028",
				"abstractNote": "As future healthcare professionals, dental medicine students are expected to exhibit healthy lifestyle behaviors. This study aims to assess the health-promoting behaviors among undergraduate dental medicine students of all six academic study years at the University of Zagreb, and determine their predictors. Students were invited to complete a two-part survey, consisting of a self-reported sociodemographic questionnaire and the Health-Promoting Lifestyle Profile II (HPLP II). Three hundred and forty-nine students completed the survey ; the response rate was 60.3%. The total mean HPLP II score was 2.64 ± 0.34. Students in the second academic study year scored the lowest (2.50 ± 0.33), and students in the sixth academic study year scored the highest (2.77 ± 0.32). Health responsibility was the overall lowest scored subcategory, while interpersonal relations was scored the highest. Female students reported lower spiritual growth and stress management than male students. Higher body mass index (BMI) was related to lower health responsibility. Smoking, place of residence and the age of participants did not seem to have an impact on health-promoting behaviors. Dental students at our faculty exhibit moderate health-promoting behaviors, even in the absence of a formal health-promoting course in the existing curriculum.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.bib.irb.hr",
				"pages": "1-10",
				"publicationTitle": "Dentistry journal",
				"url": "https://www.bib.irb.hr/1113993",
				"volume": "9",
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
		"url": "https://www.bib.irb.hr/pretraga?operators=and|molekula|text|meta",
		"items": "multiple"
	}
]
/** END TEST CASES **/
