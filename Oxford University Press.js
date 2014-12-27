{
	"translatorID": "e9989043-fcdf-4f33-93b6-0381828aeb41",
	"label": "Oxford University Press",
	"creator": "Jingjing Yin and Qiang Fang",
	"target": "^https?://ukcatalogue\\.oup\\.com/product/\\d+\\.do",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-07-26 02:11:51"
}

/*
Oxford University Press Translator
Copyright (C) 2014 Jingjing Yin and Qiang Fang

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/
function detectWeb(doc, url) {
	return 'book';
}

function doWeb(doc, url) {
	var item = new Zotero.Item("book");

	var subTitle = doc.getElementsByClassName('prodShortDesc')[0];
	item.title = ZU.trimInternal(doc.getElementsByClassName('prodName')[0].textContent);
	if(subTitle) {
		item.title += ': ' + ZU.trimInternal(subTitle.textContent);
	}

	var edition = doc.getElementsByClassName("volumeEdition")[0];
	if(edition) {
		item.edition = ZU.trimInternal(edition.textContent);
	}

	var aut1 = doc.getElementsByClassName('composedBy')[0];
	var aut2 = doc.getElementsByClassName('authors')[0];
	if(aut1) {
		var auts = aut1;
	} else {
		var auts = aut2;
	}
	var role = 'author';
	if(auts.textContent.trim()
		.indexOf('Edited ') == 0) {
		role = 'editor';
	}
	auts = auts.getElementsByTagName('b');
	for(var i = 0; i < auts.length; i++) {
		var name = ZU.trimInternal(auts[i].textContent);
		item.creators.push(ZU.cleanAuthor(name, role, false));
	}

	var date_isbn, pages;
	if(!ZU.xpathText(doc, '//div[@class="alsoAvailable"]')) {
		date_isbn = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-1]');
		pages = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-2]');
		item.numPages = ZU.trimInternal(pages.split(' ')[0]);
		item.date = ZU.trimInternal(date_isbn.split('|').pop());
		item.ISBN = ZU.trimInternal(date_isbn.split('|')[0]);
	} else {
		date_isbn = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-2]');
		pages = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-3]');
		item.numPages = ZU.trimInternal(pages.split(' ')[0]);
		item.date = ZU.trimInternal(date_isbn.split('|').pop());
		item.ISBN = ZU.trimInternal(date_isbn.split('|')[0]);
	}

	var publisher = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[a]');
	if(publisher) {
		item.publisher = ZU.trimInternal(publisher.split(',')[0]);
	} else {
		item.publisher = "Oxford University Press";
	}
	var abs = ZU.xpathText(doc, '//div[@id="tab_01_content"]/table/tbody/tr/td/table/tbody/tr/td/text()', null, ' ')
		+ ZU.xpathText(doc, '//div[@id="tab_01_content"]/table/tbody/tr/td/table/tbody/tr/td/p[1]', null, ' ');
	item.abstractNote = ZU.trimInternal(abs);

	item.tags = ZU.xpath(doc, '//div[@class="breadcrumb"]/a[position()>1]')
		.map(function(v) {
			return v.textContent;
		});
		
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ukcatalogue.oup.com/product/9780193221031.do",
		"items": [
			{
				"itemType": "book",
				"title": "Flute Time 1 Piano Accompaniment book",
				"creators": [
					{
						"firstName": "Ian",
						"lastName": "Denley",
						"creatorType": "author"
					}
				],
				"date": "24 July 2003",
				"ISBN": "978-0-19-322103-1",
				"abstractNote": "Tutor Easy Piano accompaniments to selected pieces in Flute Time 1",
				"libraryCatalog": "Oxford University Press",
				"numPages": "32",
				"publisher": "Flute Time",
				"attachments": [],
				"tags": [
					"Flute",
					"Music",
					"Woodwind & Brass"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://ukcatalogue.oup.com/product/9780194422505.do",
		"items": [
			{
				"itemType": "book",
				"title": "Form-focused Instruction and Teacher Education: Studies in Honour of Rod Ellis",
				"creators": [
					{
						"firstName": "Sandra",
						"lastName": "Fotos",
						"creatorType": "author"
					},
					{
						"firstName": "Hossein",
						"lastName": "Nassaji",
						"creatorType": "author"
					}
				],
				"date": "24 May 2007",
				"ISBN": "978-0-19-442250-5",
				"abstractNote": "An overview of form-focused instruction as an option for second language grammar teaching. It combines theoretical concerns, classroom practices, and teacher education.",
				"libraryCatalog": "Oxford University Press",
				"numPages": "296",
				"publisher": "Oxford University Press",
				"shortTitle": "Form-focused Instruction and Teacher Education",
				"attachments": [],
				"tags": [
					"Academic, Professional, & General",
					"Background & Reference Material",
					"Language & Linguistics",
					"Language Teaching & Learning",
					"Teaching & Learning English as a Foreign or Second Language",
					"Teaching Theory & Methods"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://ukcatalogue.oup.com/product/9780198781875.do",
		"items": [
			{
				"itemType": "book",
				"title": "Education: Culture, Economy, and Society",
				"creators": [
					{
						"firstName": "A. H.",
						"lastName": "Halsey",
						"creatorType": "editor"
					},
					{
						"firstName": "Hugh",
						"lastName": "Lauder",
						"creatorType": "editor"
					},
					{
						"firstName": "Phillip",
						"lastName": "Brown",
						"creatorType": "editor"
					},
					{
						"firstName": "Amy Stuart",
						"lastName": "Wells",
						"creatorType": "editor"
					}
				],
				"date": "17 April 1997",
				"ISBN": "978-0-19-878187-5",
				"abstractNote": "is a book for everyone concerned with the social study of education: students studying the sociology of education, foundations of education, educational policy, and other related courses. It aims to establish the social study of education at the centre stage of political and sociological debate about post-industrial societies. In examining major changes which have taken place in the late twentieth century, it gives students a comprehensive introduction to both the nature of these changes and to their interpretation in relation to long-standing debates within education, sociology, and cultural studies. The extensive editorial introduction outlines the major theoretical approaches within the sociology of education, assesses their contribution to an adequate understanding of the changing educational context, and sets out the key issues and areas for future research. The 52 papers in this wide-ranging thematic reader bring together the most powerful work in education into an international dialogue which is sure to become a classic text.",
				"libraryCatalog": "Oxford University Press",
				"numPages": "848",
				"publisher": "Oxford University Press",
				"shortTitle": "Education",
				"attachments": [],
				"tags": [
					"Academic, Professional, & General",
					"Education",
					"Society, Culture, & Environment"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/