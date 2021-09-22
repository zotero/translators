{
	"translatorID": "19cef926-c5b6-42e2-a91c-6f2722f8b36d",
	"label": "Central and Eastern European Online Library Journals",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.ceeol\\.com/search",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-22 20:12:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Timotheus Kim
	
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
	if (url.includes('/article-detail?')) return "journalArticle";
	else if (getSearchResults(doc, true)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.description a, .article-details > h3 > a');
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
			if (items) ZU.processDocuments(Object.keys(items), invokeEMTranslator);
		});
	}
	else {
		invokeEMTranslator(doc, url);
	}
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	// Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
	});
	translator.translate();
}

// scraping abstractNote from HTML, that is not included in Embedded Metadata
function postProcess(doc, item) {
	let abstractEntry = ZU.xpathText(doc, '//p[@class="summary"]');
	if (!item.abstractNote && abstractEntry) item.abstractNote = abstractEntry;
	for (let i = 0; i < item.attachments.length; i++) {
		if (item.attachments[i].title == 'Snapshot') {
			item.attachments.splice(i, 1);
			break;
		}
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=934009",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "God’s Holy Ordinance",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Benne",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "2450-4955, 2451-2141",
				"abstractNote": "Summary/Abstract:  In this article, I argue that the church must build up its theology of marriage in a more disciplined manner because the culture no longer sustains the Christian notion. In making a substantive argument I rely on the Lutheran “two ways that God reigns” approach in which we share “places of responsibility” with all humans, but in which the Christian virtues of faith, love, and hope transform those places into genuine Christian callings. I then contend strongly for the continued rejection of same-sex marriage among orthodox Christians. I conclude with what I hope is a compassionate pastoral approach—gracious tolerance—toward homosexual Christians.",
				"issue": "6",
				"language": "English",
				"libraryCatalog": "www.ceeol.com",
				"pages": "7-21",
				"publicationTitle": "Philosophy and Canon Law",
				"url": "https://www.ceeol.com/search/article-detail?id=934009",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "faith"
					},
					{
						"tag": "gracious tolerance"
					},
					{
						"tag": "hope"
					},
					{
						"tag": "individualism"
					},
					{
						"tag": "love"
					},
					{
						"tag": "places of responsibility"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=945560",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zastosowanie modelu struktury kapitału Mertona Howarda Millera w warunkach zmienności polityki fiskalnej w Polsce w latach 2018–2019",
				"creators": [
					{
						"firstName": "Slawomir",
						"lastName": "Antkiewicz",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "2300-6102, 2353-9496",
				"abstractNote": "Summary/Abstract:  An essential condition for the proper functioning of Polish enterprises is the stability of tax solutions. However, over the years 2018–2019, several variants of tax changes appeared, which may have a significant impact on the capital structure of enterprises. The implementation of one of the variants will create specific preferences for the use of equity or foreign capital. The purpose of the papers is to analyse the impact of possible changes in the tax rates on the decisions of management boards of enterprises regarding the methods of financing Polish enterprises and shaping their capital structure. To achieve the research goal, the paper presents the capital structure and the evolution of theoretical concepts regarding the preferences for financing enterprises with shares or bonds. Particular attention was paid to Merton Howard Miller’s model, which argued that enterprises can use interest tax shields that reduce the basis for calculating income tax. The analytical-descriptive and comparative methods were used. Scenarios of changes in taxation were presented and preferences for the use of equity or foreign capital were demonstrated using the Miller model. The research results indicate that in the current legal situation there are preferences for financing an entity with corporate bonds and if the most realistic scenario of liquidating the tax levied on interest paid to bond holders plays out, these preferences will further increase.",
				"issue": "1",
				"language": "Polish",
				"libraryCatalog": "www.ceeol.com",
				"pages": "7-23",
				"publicationTitle": "International Business and Global Economy",
				"url": "https://www.ceeol.com/search/article-detail?id=945560",
				"volume": "38",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "bonds"
					},
					{
						"tag": "capital structure"
					},
					{
						"tag": "debt"
					},
					{
						"tag": "equity capital"
					},
					{
						"tag": "shares"
					},
					{
						"tag": "tax shield"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=925530",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Az automatizálás munkaerőpiaci és munkajogi kérdései",
				"creators": [],
				"date": "2020",
				"ISSN": "2734-6226, 2734-7095, 2734-6226",
				"abstractNote": "Summary/Abstract:  The fundamental value of labour law at all times is that it provides security in the economic sense and thus creates predictability: on the one hand, with rules protecting the worker and, on the other hand, by building a social network on the part of the state in case the worker is unable to work. In addition, it is crucial that labour law regulations can properly adapt to the economic and social changes of the 21st century, to the emergence of new trends. The development of robotics and artificial intelligence will undoubtedly have an impact on the dynamic and static elements of the work environment, the labour market, and the labour relationship, thus generating new challenges.",
				"issue": "4",
				"language": "Hungarian",
				"libraryCatalog": "www.ceeol.com",
				"pages": "63-76",
				"publicationTitle": "Erdélyi Jogélet",
				"url": "https://www.ceeol.com/search/article-detail?id=925530",
				"volume": "III",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "artificial intelligence"
					},
					{
						"tag": "automation"
					},
					{
						"tag": "occupational safety"
					},
					{
						"tag": "responsibility"
					},
					{
						"tag": "robotics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/article-detail?id=934330",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Pavao Maček, Pogledići i Malenići. Dva plemenita roda od Kurilovca: S priloženim rodoslovnim stablima",
				"creators": [
					{
						"firstName": "Ivan",
						"lastName": "Jurković",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0351-9767, 1848-9087",
				"abstractNote": "Summary/Abstract:  Book-Review: Pavao Maček, Pogledići i Malenići. Dva plemenita roda od Kurilovca: S priloženim rodoslovnim stablima, Zagreb: Družtvo za povjestnicu Zagrebačke nadbiskupije “Tkalčić”, 2019, 574 stranice i dva rodoslovna stabla. Review by Ivan Jurković.",
				"issue": "58",
				"language": "Croatian",
				"libraryCatalog": "www.ceeol.com",
				"pages": "154-156",
				"publicationTitle": "Povijesni prilozi",
				"shortTitle": "Pavao Maček, Pogledići i Malenići. Dva plemenita roda od Kurilovca",
				"url": "https://www.ceeol.com/search/article-detail?id=934330",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Pavao Maček"
					},
					{
						"tag": "Pogledići and Malenići"
					},
					{
						"tag": "genealogical trees"
					},
					{
						"tag": "two noble families from Kurilovac"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/journal-detail?id=1266",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.ceeol.com/search/journal-detail?id=761",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
