{
	"translatorID": "e9989043-fcdf-4f33-93b6-0381828aeb41",
	"label": "OUP",
	"creator": "JingjingYin and Qiang Fang",
	"target": "^https?://ukcatalogue\\.oup\\.com/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-06-23 13:03:33"
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
function detectWeb(doc, url){
	if(url.match(/product\//)){
		return 'book';
	}else if(url.match(/endecaSearch.do/)){
	   	return 'multiple';
	}
}

function doWeb(doc, url) {
	scrape(doc, url)
}

function scrape(doc, url) {
	var item = new Zotero.Item("book");
	
	var newAddition = ZU.xpathText(doc,'//div[@class="newAddtion"]');
	if (newAddition) item.newAddition = Zotero.Utilities.trimInternal(newAddition);
	
	item.title = Zotero.Utilities.trimInternal(ZU.xpathText(doc,'//div[@class="prodName"]'));

	
	var bookShortDesc = ZU.xpathText(doc,'//div[@class="prodShortDesc"]');
	if (bookShortDesc) item.bookShortDesc = Zotero.Utilities.trimInternal(bookShortDesc);
	
	var edition = ZU.xpathText(doc, '//div[@class="volumeEdition"]')
	if (edition) item.edition = Zotero.Utilities.trimInternal(edition);
	
	var Editors = ZU.xpathText(doc,'//div[@class="composedBy"]/b');
	var Authors = ZU.xpathText(doc, '//div[@class="authors"]');
	if (Authors) {var authors = Zotero.Utilities.trimInternal(Authors);}
	else if(Editors){var authors =Zotero.Utilities.trimInternal(Editors);}
	//we parse the author string - first assign roles and then split multiple authors in those groups.
	var auts = authors.split(/,/);
	for each(var aut in auts) {
		if (aut.match(/Edited/)) {
			var autType = "editor";
			aut = aut.replace(/Edited (by)?/, "");
		} else if (aut.match(/Translated/)) {
			var autType = "translator";
			aut = aut.replace(/Translated (by)?/, "");
		} else {
			var autType = "author";
		}
		aut = aut.split(/\band\b|,/);
		for each(var aut2 in aut) {
			item.creators.push(Zotero.Utilities.cleanAuthor(aut2, autType));
		}
	}
	
	var alsoAvailable=ZU.xpathText(doc,'//div[@class="alsoAvailable"]');
	if (alsoAvailable) {
		item.date = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-2]').split('|')[2]);
		item.ISBN = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-2]').split('|')[0]);
		item.alsoAvailable = Zotero.Utilities.trimInternal(ZU.xpathText(doc,'//div[@class="alsoAvailable"]/a[@href]/@href'));
	} else {
		item.date = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-1]').split('|')[2]);
		item.ISBN = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[last()-1]').split('|')[0]);
	}
	
	//if there is no publisher field, assume it's published by OUP 
	var publisher = ZU.xpathText(doc, '//td[@class="bibliographicalInfo"]/div[a]');	
	if (publisher) item.publisher = Zotero.Utilities.trimInternal(publisher.split(',')[0]);
//	else item.publisher = "Oxford University Press";
	
	item.price = Zotero.Utilities.trimInternal(ZU.xpathText(doc,'//div[@class="productPrice"]').split(':')[1]);
	item.abstractNote = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//table[@class="product_tab_content"]/tbody/tr/td/p'));
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ukcatalogue.oup.com/product/9780193221031.do",
		"items": {
			"itemType": "book",
			"creators": [
				{
					"firstName": "Ian",
					"lastName": "Denley",
					"creatorType": "author"
				}
			],
			"notes": [],
			"tags": [],
			"seeAlso": [],
			"attachments": [],
			"title": "Flute Time 1 Piano Accompaniment book",
			"date": "24 July 2003",
			"ISBN": "978-0-19-322103-1",
			"publisher": "Flute Time",
			"price": "£8.25 £6.18 Please note, this offer price only applies to individual customers when ordering direct from Oxford University Press, while stock lasts. No further discounts will apply. If you are a bookseller, please contact your OUP sales representative.",
			"abstractNote": "Piano accompaniments to selected pieces in Flute Time 1, , , , , , , , , , Ian Denley, , , , , , Piano accompaniments to selected pieces in Flute Time 1, , , , , , , , ,",
			"libraryCatalog": "OUP"
		}
	},
	{
		"type": "web",
		"url": "http://ukcatalogue.oup.com/product/9780198066224.do",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Uttam Kumar",
						"lastName": "Roy",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Web Technologies",
				"date": "23 December 2010",
				"ISBN": "978-0-19-806622-4",
				"publisher": "OUP India",
				"price": "£23.99",
				"abstractNote": "Web Technologies is specially designed as a textbook for undergraduate students of Computer Science & Engineering and Information Technology and postgraduate students of Computer Applications. The book seeks to provide a thorough understanding of fundamentals of Web Technologies. Divided into four sections, the book first introduces basic concepts such as Introduction to Web, HTTP, Java Network Programming, HTML, and Cascading Style Sheets (CSS). The following three sections describe various applications of web technologies, namely, XML, client-side scripting, and server-side scripting. The second section on XML Technologies focuses on concepts such as XML Namespace, DTD, and Schema, parsing in XML, concept of XPath, XML Transformation and other XML technologies. The third section dealing with client-side programming includes JavaScript and Applets and the last section introduces server-side programming including CGI, Servelets, JSP, and Introduction to J2EE. Presenting the concepts in comprehensive and lucid manner, the book includes numerous real-world examples and codes for better understanding of the subject. Moreover, the text is supported with illustrations, screenshots, review questions, and exercises. _ _, , , Readership: Primary: B.Tech; B.Sc. Computer Science Engineering/Information Technology; Secondary: Postgraduate Students, , Uttam Kumar Roy, , , Uttam Kumar Roy is working as a Lecturer in Department of Information Technology, Jadavpur University, Kolkata and has completed his PhD from the same university. Apart from Web Technologies his area of expertise also includes varied fields like Computer Networks, Operating Systems, Object Oriented Programming, Enterprise Networking, Object Oriented Software Engineering, System Programming in Linux, and Computer Graphics. He has contributed numerous papers in various national and international journals. _, , , , Web Technologies is specially designed as a textbook for undergraduate students of Computer Science & Engineering and Information Technology and postgraduate students of Computer Applications. The book seeks to provide a thorough understanding of fundamentals of Web Technologies. Divided into four sections, the book first introduces basic concepts such as Introduction to Web, HTTP, Java Network Programming, HTML, and Cascading Style Sheets (CSS). The following three sections describe various applications of web technologies, namely, XML, client-side scripting, and server-side scripting. The second section on XML Technologies focuses on concepts such as XML Namespace, DTD, and Schema, parsing in XML, concept of XPath, XML Transformation and other XML technologies. The third section dealing with client-side programming includes JavaScript and Applets and the last section introduces server-side programming including CGI, Servelets, JSP, and Introduction to J2EE. Presenting the concepts in comprehensive and lucid manner, the book includes numerous real-world examples and codes for better understanding of the subject. Moreover, the text is supported with illustrations, screenshots, review questions, and exercises. _ _, , , Readership: Primary: B.Tech; B.Sc. Computer Science Engineering/Information Technology; Secondary: Postgraduate Students,",
				"libraryCatalog": "OUP"
			}
		]
	}
]
/** END TEST CASES **/
