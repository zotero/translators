{
	"translatorID": "a97f8c1f-e6f5-46b5-8377-3abc9af1bb3c",
	"label": "ubtue_Journal of European Baptist Studies",
	"creator": "Timotheus Kim",
	"target": "^https?://ojs2\\.uni-tuebingen\\.de/ojs/index\\.php/jebs/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-24 20:21:22"
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

function detectWeb(doc, url) {
	if (url.includes('/article/') 
		return "journalArticle";
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else invokeEMTranslator(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "",
		"items": []
	},
	{
		"type": "web",
		"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/issue/view/26",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/article/view/265",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Relationship between State and Church",
				"creators": [
					{
						"firstName": "Uwe",
						"lastName": "Swarat",
						"creatorType": "author"
					}
				],
				"date": "2020/06/09",
				"ISSN": "1804-6444",
				"abstractNote": "Baptists have long stood for freedom of religion and of conscience, and these two are inextricably bound together with the relationship between church and state. This paper examines the following church-state models: the Eastern Church model of the established church; the Roman Catholic model of political theocracy; the theology and praxis of Martin Luther’s doctrine of the two regiments; the Reformed Christocratic mode; the Anabaptist model of strict separation of Christians from public affairs; and finally the Baptist model, which emphasises separation of church and state, but permits Christians to take on civil roles in society. The author concludes by pointing out the shortcomings of the state-church and theocratic models, preferring instead the Baptist model of state-church separation, which also attempts to implement Luther’s doctrine of the two regiments.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs2.uni-tuebingen.de",
				"pages": "9-29",
				"publicationTitle": "Journal of European Baptist Studies",
				"rights": "Copyright (c) 2020 Uwe Swarat",
				"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/article/view/265",
				"volume": "20",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Separation of church and state"
					},
					{
						"tag": "State church"
					},
					{
						"tag": "The doctrine of the two kingdoms"
					},
					{
						"tag": "Theocracy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/article/view/273",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Leaving the Gathered Community",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Ord",
						"creatorType": "author"
					}
				],
				"date": "2020/06/09",
				"ISSN": "1804-6444",
				"abstractNote": "A Baptist ecclesiology of the gathered community coupled with a characteristic concern for mission has led to a dynamic of gathering and sending within British Baptist worship. This engenders a demarcation between the church and the world, and a sense of a substantial boundary between the two. In this article I explore the metaphor of the boundary between the church and the world. In doing so, I examine recent theological proposals that present formation as taking place within the worship of the gathered community for the purpose of mission. I propose a picture of the boundary as porous and its formation necessarily occurring, both within the church and the world, through worship and witness. I argue that church–world relations are complex and cannot be described as ‘one way’ — from worship to witness. The article concludes by pointing to the need for sacramental practices for the church in dispersed mode, for example hospitality, as well as for the church gathered, for example baptism and communion. This implies recognising that there are graced practices of the church and indwelt sacramentality which find their rightful place in the context of witness in the world, by leaving the gathered community.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs2.uni-tuebingen.de",
				"pages": "131-145",
				"publicationTitle": "Journal of European Baptist Studies",
				"rights": "Copyright (c) 2020 Mark Ord",
				"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/article/view/273",
				"volume": "20",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Baptist ecclesiology"
					},
					{
						"tag": "Mission"
					},
					{
						"tag": "Practices"
					},
					{
						"tag": "Sacraments"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/article/view/274",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Book Reviews",
				"creators": [
					{
						"firstName": "Craig",
						"lastName": "Gardiner",
						"creatorType": "author"
					},
					{
						"firstName": "Toivo",
						"lastName": "Pilli",
						"creatorType": "author"
					},
					{
						"firstName": "Jan Martijn",
						"lastName": "Abrahamse",
						"creatorType": "author"
					},
					{
						"firstName": "Michael Sebastian",
						"lastName": "Aidoo",
						"creatorType": "author"
					},
					{
						"firstName": "Roald",
						"lastName": "Zeiffert",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Trusiewicz",
						"creatorType": "author"
					},
					{
						"firstName": "Jim",
						"lastName": "Purves",
						"creatorType": "author"
					},
					{
						"firstName": "Mark",
						"lastName": "Ord",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Bergen",
						"creatorType": "author"
					}
				],
				"date": "2020/06/09",
				"ISSN": "1804-6444",
				"abstractNote": "Al Staggs, What Would Bonhoeffer Say? (Eugene, Oregon: Wipf and Stock, 2018), reviewed by Craig Gardiner\nIan M. Randall, A Christian Peace Experiment: The Bruderhof Community in Britain, 1933-1942 (Eugene, Oregon: Cascade Books, 2018), reviewed by Toivo Pilli\nDominic Erdozain (ed.), The Dangerous God: Christianity and the Soviet Experiment (DeKalb, Illinois: Northern Illinois University Press, 2017), reviewed by Toivo Pilli\nVictor Lee Austin and Joel C. Daniel (eds.), The Emerging Christian Minority, Pro Ecclesia Series, vol. 8 (Eugene, Oregon: Cascade Books, 2019), reviewed by Jan Martijn Abrahamse\nCurtis W. Freeman, Undomesticated Dissent: Democracy and the Public Virtue of Religious Nonconformity (Waco, Texas: Baylor University Press, 2017), reviewed by Michael Sebastian Aidoo\nAndrew C. Thompson (ed.), The Oxford History of Protestant Dissenting Traditions Volume II – The Long Eighteenth Century, c.1689-c.1828 (Oxford: Oxford University Press, 2018), reviewed by Roald Zeiffert\nStefan Paas, Church Planting in the Secular West: Learning from the European Experience (Grand Rapids, Michigan: William Eerdmans Publishing Company, 2016), reviewed by Daniel Trusiewicz\nJohn S. Hammett, Biblical Foundations for Baptist Churches: A Contemporary Ecclesiology, 2nd edn (Grand Rapids, Michigan: Kregel Academic, 2019), reviewed by Jim Purves.\nMichael W. Stroope, Transcending Mission: The Eclipse of a Modern Tradition (London: Apollos, IVP, 2017), reviewed by Mark Ord\nDavid W. Bebbington, Baptists Through the Centuries: A History of a Global People, 2nd edn (Waco, Texas: Baylor University Press, 2018), reviewed by Thomas Bergen",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "ojs2.uni-tuebingen.de",
				"pages": "146-158",
				"publicationTitle": "Journal of European Baptist Studies",
				"rights": "Copyright (c) 2020 Craig Gardiner",
				"url": "https://ojs2.uni-tuebingen.de/ojs/index.php/jebs/article/view/274",
				"volume": "20",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
