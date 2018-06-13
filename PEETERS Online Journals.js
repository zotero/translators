{
	"translatorID": "b1e10e64-d7a0-4f4e-bf17-3c5defd9afb7",
	"label": "PEETERS Online Journals",
	"creator": "Madeesh Kannan",
	"target": "^https?://(\\\\\\\\w+\\\\\\\\.)*poj.peeters-leuven.be/content.php\\?url=article",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-13 10:05:42"
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
	item.creators.push(ZU.cleanAuthor(ZU.capitalizeTitle(name),
														 'author', true));
}


function doWeb(doc, url) {
	var item = new Zotero.Item();
	item.itemType = detectWeb(doc, url);
	item.title = getElementAndTrim(doc,'//b[contains(text(), "Title:")]/following-sibling::text()[1]');
	var authors = getElementAndTrim(doc,'//b[contains(text(), "Author(s):")]/following-sibling::text()[1]').split(" , ");
	for (auth in authors)
		addAuthor(item, authors[auth]);

	item.publicationTitle = getElementAndTrim(doc, '//b[contains(text(), "Journal:")]/following-sibling::text()[1]');
	item.volume = getElementAndTrim(doc,'//b[contains(text(), "Volume:")]/following-sibling::a/text()[1]');
	item.issue = getElementAndTrim(doc, '//b[contains(text(), "Issue:")]/following-sibling::text()[1]');
	item.date = getElementAndTrim(doc, '//b[contains(text(), "Date:")]/following-sibling::text()[1]');
	item.pages = getElementAndTrim(doc, '//b[contains(text(), "Pages:")]/following-sibling::text()[1]');
	item.DOI = getElementAndTrim(doc, '//b[contains(text(), "DOI:")]/following-sibling::text()[1]');
	item.abstractNote = getElementAndTrim(doc,'//b[contains(text(), "Abstract :")]/following-sibling::text()[1]');

	item.complete();
}




/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://poj.peeters-leuven.be/content.php?url=article&id=3141800",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perspectives spirituelle et éthique du processus d'individuation chez Jung et ses implications thérapeutiques",
				"creators": [
					{
						"firstName": "Stéphanie",
						"lastName": "LARRUE",
						"creatorType": "author"
					},
					{
						"firstName": "Marie-Rose",
						"lastName": "TANNOUS",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"DOI": "10.2143/CS.34.2.3141800",
				"abstractNote": "Cet article vise à approfondir le processus d’individuation personnel comme un cadre de référence thérapeutique, et à en dégager les volets spirituel et éthique. Pour ce faire, les auteures s’appuient sur le modèle de Jung, ainsi que sur la vision de divers jungiens et néo-jungiens. Elles présentent ce chemin de construction individuelle de la personnalité comme un processus continu de la naissance à la mort. Par ailleurs, elles soulignent ses effets éthiques sur le thérapeute et sur le client, ainsi que sur la relation et sur le processus thérapeutiques.",
				"issue": "2",
				"libraryCatalog": "PEETERS Online Journals",
				"pages": "101-129",
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
