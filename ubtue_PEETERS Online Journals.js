{
	"translatorID": "b1e10e64-d7a0-4f4e-bf17-3c5defd9afb7",
	"label": "PEETERS Online Journals",
	"creator": "Madeesh Kannan",
	"target": "^https?://(\\\\\\\\w+\\\\\\\\.)*poj.peeters-leuven.be/content.php\\?url=article",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-13 12:44:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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
	return "journalArticle";
}

function getElementAndTrim(doc, xpath) {
	return ZU.trim(ZU.xpathText(doc, xpath));
}

function addAuthor(item, name) {
	// anneal case
	name = name.toLowerCase().replace(/(?:^|\s|\/|\-)\w/g, (match) => match.toUpperCase());
	item.creators.push(ZU.cleanAuthor(ZU.capitalizeTitle(name),
														 'author', true));
}


function doWeb(doc, url) {
	var item = new Zotero.Item();
	item.itemType = detectWeb(doc, url);
	item.title = getElementAndTrim(doc,'//b[contains(text(), "Title:")]/following-sibling::text()[1]');
	var authors = getElementAndTrim(doc,'//b[contains(text(), "Author(s):")]/following-sibling::text()[1]').split(" , ");
	for (var auth in authors)
		addAuthor(item, authors[auth]);

	item.publicationTitle = getElementAndTrim(doc, '//b[contains(text(), "Journal:")]/following-sibling::a[1]/text()[1]');
	item.volume = getElementAndTrim(doc,'//b[contains(text(), "Volume:")]/following-sibling::a[1]/text()[1]');
	item.issue = getElementAndTrim(doc, '//b[contains(text(), "Issue:")]/following-sibling::text()[1]');
	item.date = getElementAndTrim(doc, '//b[contains(text(), "Date:")]/following-sibling::text()[1]');
	item.pages = getElementAndTrim(doc, '//b[contains(text(), "Pages:")]/following-sibling::text()[1]');
	item.DOI = getElementAndTrim(doc, '//b[contains(text(), "DOI:")]/following-sibling::text()[1]');
	item.abstractNote = getElementAndTrim(doc,'//b[contains(text(), "Abstract :")]/following-sibling::text()[1]');
	item.url = url;

	item.complete();
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://poj.peeters-leuven.be/content.php?url=article&id=3141798",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La honte",
				"creators": [
					{
						"firstName": "Ramón",
						"lastName": "Martínez De Pison",
						"creatorType": "author"
					},
					{
						"firstName": "Cynthia",
						"lastName": "Bilodeau",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"DOI": "10.2143/CS.34.2.3141798",
				"abstractNote": "La honte est une expérience universelle qui remplit une fonction sociale importante dans le maintien de liens relationnels ainsi que dans les comportements moraux et sociaux. Mais les sentiments démesurés de honte peuvent avoir des conséquences dévastatrices dans la vie des gens et peuvent ainsi devenir sources d’affliction spirituelle. Dans la première partie de cet article, nous soulignons la double influence de la religion et de la spiritualité face aux effets néfastes de la honte. La deuxième partie souligne les implications de la honte dans la pratique du counseling et de la psychothérapie. Enfin, la troisième partie présente différentes façons de composer avec la honte.",
				"issue": "2",
				"libraryCatalog": "PEETERS Online Journals",
				"pages": "61-76",
				"publicationTitle": "Counseling et spiritualité / Counselling and Spirituality",
				"url": "http://poj.peeters-leuven.be/content.php?url=article&id=3141798",
				"volume": "34",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
