{
	"translatorID": "cd669d1f-96b8-4040-aa36-48f843248399",
	"label": "Primo 2018",
	"creator": "Philipp Zumstein",
	"target": "(/primo-explore/|/discovery/(search|fulldisplay|jsearch|dbsearch|npsearch|openurl|jfulldisplay|dbfulldisplay|npfulldisplay)\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-14 05:49:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Philipp Zumstein
	
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
	var rows = doc.querySelectorAll('.urlToXmlPnx[data-url]');
	if (rows.length == 1) return "book";
	if (rows.length > 1) return "multiple";
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.urlToXmlPnx[data-url]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].dataset.url;
		let title = rows[i].parentNode.textContent;
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
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		var urlpnx = attr(doc, '.urlToXmlPnx[data-url]', 'data-url');
		scrape(doc, urlpnx);
	}
}


function scrape(doc, pnxurl) {
	ZU.doGet(pnxurl, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("efd737c9-a227-4113-866e-d57fbc0684ca");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (pnxurl) {
				item.libraryCatalog = pnxurl.match(/^https?:\/\/(.+?)\//)[1].replace(/\.hosted\.exlibrisgroup/, "");
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
		"url": "https://primo-qa.hosted.exlibrisgroup.com/primo-explore/search?query=any,contains,zotero&tab=everything&search_scope=TCCDALMA_EVERYTHING&vid=TCCDALMA&lang=en_US&offset=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://primo-qa.hosted.exlibrisgroup.com/primo-explore/fulldisplay?vid=TCCDALMA&search_scope=TCCDALMA_EVERYTHING&tab=everything&docid=TCCD_ALMA2136169630001641&lang=en_US&context=L&adaptor=Local%20Search%20Engine&isFrbr=true&query=any,contains,adam%20smith&sortby=rank&offset=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://primo-qa.hosted.exlibrisgroup.com/primo-explore/search?query=any,contains,mannheim&tab=everything&search_scope=TCCDALMA_EVERYTHING&vid=TCCDALMA&sortby=rank&lang=en_US",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://virtuose.uqam.ca/primo-explore/fulldisplay?vid=UQAM&docid=UQAM_BIB000969205&context=L",
		"items": [
			{
				"itemType": "book",
				"title": "War",
				"creators": [
					{
						"firstName": "Ken",
						"lastName": "Baynes",
						"creatorType": "author"
					},
					{
						"lastName": "Ken. Baynes",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Welsh Arts Council",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Glynn Vivian Art Gallery",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1970",
				"callNumber": "NX650G8B38",
				"language": "eng",
				"libraryCatalog": "virtuose.uqam.ca",
				"place": "Boston",
				"publisher": "Boston Book and Art Chop",
				"series": "Art and society 1",
				"attachments": [],
				"tags": [
					"ART",
					"GUERRE",
					"WAR"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://primo-prod.u-paris10.fr/primo-explore/fulldisplay?vid=UPON&docid=SCD_ALEPH000546633&context=L&search_scope=default_scope",
		"items": [
			{
				"itemType": "thesis",
				"title": "Les espaces publics au prisme de l'art à Johannesburg (Afrique du Sud) : quand la ville fait œuvre d'art et l'art œuvre de ville",
				"creators": [
					{
						"firstName": "Pauline",
						"lastName": "Guinard",
						"creatorType": "author"
					},
					{
						"firstName": "Philippe",
						"lastName": "Gervais-Lambony",
						"creatorType": "contributor"
					},
					{
						"firstName": "Marie-Hélène",
						"lastName": "Bacqué",
						"creatorType": "contributor"
					},
					{
						"firstName": "Maria",
						"lastName": "Gravari-Barbas",
						"creatorType": "contributor"
					},
					{
						"firstName": "Myriam",
						"lastName": "Houssay-Holzschuch",
						"creatorType": "contributor"
					},
					{
						"firstName": "Guy",
						"lastName": "Di Méo",
						"creatorType": "contributor"
					},
					{
						"firstName": "Cynthia",
						"lastName": "Kros",
						"creatorType": "contributor"
					},
					{
						"lastName": "Université Paris Nanterre",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"firstName": "cultures et sociétés du passé et du présent Nanterre",
						"lastName": "Ecole doctorale Milieux",
						"creatorType": "contributor"
					}
				],
				"date": "2012",
				"abstractNote": "Thèse de doctorat, Cette thèse porte sur les espaces publics à Johannesburg, capitale économique de l’Afrique du Sud. Dans le contexte contemporain, l’utilisation de la notion occidentale d’espaces publics pose problème : d’une part, du fait des ségrégations passées qui ont eu tendance à faire de ces espaces des lieux de séparation et de mise à distance des différents publics ; et d’autre part, du fait des forts taux de violence et du fort sentiment d’insécurité, qui tendent à encourager la sécurisation et la privatisation de ces mêmes espaces. L’enjeu est alors de comprendre les éventuels processus de construction de la publicité (au sens de caractère public) de ces espaces, à la fois sur le plan juridique, social et politique. Pour ce faire, l’art qui se déploie dans les espaces juridiquement publics de la métropole depuis la fin de l’apartheid, est utilisé comme une clef de lecture privilégiée de ces phénomènes, en tant qu’il permettrait, ainsi que nous entendons le montrer, de créer des espaces de rencontre et de débats ou, à l’inverse, de mieux réguler et contrôler ces espaces. Selon une approche qualitative, notre étude se base à la fois sur des observations de terrain et sur des entretiens conduits auprès des producteurs mais aussi des récepteurs de cet art qui a lieu dans les espaces publics. A la croisée de la géographie urbaine et de la géographie culturelle, nous envisageons donc de réexaminer la notion d’espaces publics au prisme de l’art à Johannesburg en vue de saisir – entre tentative de normalisation et résistance à cette normalisation – quelle ville est aujourd’hui à l’œuvre non seulement à Johannesburg, mais aussi, à travers elle, dans d’autres villes du monde., This Ph.D. thesis deals with public spaces in Johannesburg, the economic capital of South Africa. In the current context, the issues raised by the use of the western notion of public spaces are explored. On one hand, the previous segregations tended to mark off spaces into different publics completely separated from each other. On the other hand, the high rates of violence and sense of insecurity enhance securitization and privatization of these same spaces. What is at stake is to understand how the publicness of these spaces can be legally, socially, and politically built. In that framework, art spread in legally public spaces of Johannesburg since the end of apartheid is used as a tool to understand and reveal these phenomena since it is presented, as we aim at demonstrating, as a mean to create spaces of encounter and debate or, conversely, to regulate and control better these spaces. In a qualitative approach, our study is based on field observations and interviews with both producers and receivers of this art which takes place in public spaces. At the crossroads of urban geography and cultural geography, we are therefore re-examining the concept of public spaces through the prism of art in Johannesburg to figure out – between normalization and resistance to this normalization – which city is today at work not only in Johannesburg, but also, through her, in other cities of the world.",
				"language": "fre",
				"libraryCatalog": "primo-prod.u-paris10.fr",
				"shortTitle": "Les espaces publics au prisme de l'art à Johannesburg (Afrique du Sud)",
				"accessDate": "CURRENT_TIMESTAMP",
				"attachments": [],
				"tags": [
					"Espaces publics",
					"Afrique du Sud",
					"Johannesburg (Afrique du Sud)",
					"Thèses et écrits académiques",
					"Art urbain",
					"Géographie culturelle",
					"Géographie urbaine",
					"Art",
					"Johannesburg",
					"Prisme",
					"Publicisation",
					"Normalisation"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://bcujas-catalogue.univ-paris1.fr/primo-explore/fulldisplay?vid=CUJAS_V1&docid=33CUJAS_ALEPH000070200&context=L&search_scope=LSCOP_ALL",
		"items": [
			{
				"itemType": "book",
				"title": "Test pattern for living",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Johnson",
						"creatorType": "author"
					}
				],
				"date": "1972",
				"callNumber": "203.206",
				"language": "eng",
				"libraryCatalog": "bcujas-catalogue.univ-paris1.fr",
				"numPages": "xx+154",
				"place": "Toronto New York",
				"publisher": "Bantam Books",
				"attachments": [],
				"tags": [
					{
						"tag": "Mass media"
					},
					{
						"tag": "Social aspects"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "Social conditions"
					},
					{
						"tag": "1960-"
					}

				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
