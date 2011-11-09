{
	"translatorID": "b662c6eb-e478-46bd- bad4-23cdfd0c9d67",
	"label": "JurPC",
	"creator": "Oliver Vivell and Michael Berkowitz",
	"target": "^https?://www\\.jurpc\\.de/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-07 18:57:04"
}

function detectWeb(doc, url) {
	//prevent Zotero from throwing an error here
		if (doc.evaluate('//meta/@doctype', doc, null,XPathResult.ANY_TYPE, null).iterateNext()){
		var doctype = doc.evaluate('//meta/@doctype', doc, null,XPathResult.ANY_TYPE, null).iterateNext().textContent;
		if (doctype == "Aufsatz"){
				return "journalArticle";
		}else{
				return "case";
		}}
		else return false;
	}

function doWeb(doc, url) {

		var articles = new Array();

		if (detectWeb(doc, url) == "journalArticle") {

				// Aufsatz gefunden

				//Zotero.debug("Ok, we have an JurPC Article");
				var authors = '//meta/@Author';
				var title = '//meta/@Title';
				var webdoktext = '//meta/@WebDok';
				var authors = ZU.xpathText(doc, authors);
				var title = ZU.xpathText(doc, title);

				var webabs = ZU.xpathText(doc, '//meta/@WebDok').match(/Abs\..+/)[0]
				//Zotero.debug(doctype);
				 //Zotero.debug(webdoktext);
				var year = url.substr(28, 4);

				//Get Year & WebDok Number from Url
				var webdok = url.substr(32, 4);

				var suche = webdok.indexOf("0");
				if (suche == 0){
						 webdok = url.substr(33, 3);
						 suche = webdok.indexOf("0");

						if(suche == 0){
								webdok = url.substr(34, 2);
								suche = webdok.indexOf("0");
								}
								//Zotero.debug(suche);
								if(suche == 0){
										webdok = url.substr(35, 1);
										suche = webdok.indexOf("0");
								}
				}

				var re = /<[^>]*>/
				//Zotero.debug(re);
						title = title.replace(re,"");
						title = title.replace(re,"");
						title = title.replace(re,"");
				Zotero.debug(title);

				var newArticle = new Zotero.Item('journalArticle');

				newArticle.title = title;
				newArticle.journal = "JurPC";
				newArticle.journalAbbreviation = "JurPC";
				newArticle.year = year;
				newArticle.volume =  "WebDok " + webdok + "/" + year;
				newArticle.pages = webabs ;
				newArticle.url = url;
				var aus = authors.split("/");
				for (var i=0; i< aus.length ; i++) {
						Zotero.debug(aus[0]);
						newArticle.creators.push(Zotero.Utilities.cleanAuthor(aus[i], "author"));
				}
				newArticle.complete();
		} else {

				// Dokument ist ein Urteil

				var gericht = '//meta/@Gericht';
				var ereignis =  '//meta/@Ereignis';
				var datum = '//meta/@Datum';
				var aktz = '//meta/@aktz';
				var titel =  '//meta/@Title';
				var webdok = '//meta/@WebDok';

				try{
						var gericht = ZU.xpathText(doc, gericht);
						var ereignis = ZU.xpathText(doc, ereignis);
						var datum = ZU.xpathText(doc, datum);
						var aktz = ZU.xpathText(doc, aktz);
						var webdok = ZU.xpathText(doc, webdok);
						var titel = ZU.xpathText(doc, titel);
				} catch (e) { var titel = doc.evaluate('//meta/@Titel', doc, null,XPathResult.ANY_TYPE, null).iterateNext().textContent;}
				//Zotero.debug(titel); 


				 // Informationen an Zotero übergeben

				var newCase = new Zotero.Item('case');
				 newCase.court = gericht;
				 newCase.caseName = titel;
				 newCase.title = titel;
				 newCase.shortTitle = "WebDok " + webdok;
				 newCase.dateDecided = ereignis + "  , " + aktz;
				 newCase.url = url;
				 newCase.journalAbbreviation = "JurPC";
				//Zotero.debug(newCase.codeNumber);
				newCase.complete();
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.jurpc.de/aufsatz/20110132.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Johannes",
						"lastName": "Habermalz",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Die datenschutzrechtliche Einwilligung des Beschäftigten",
				"journal": "JurPC",
				"journalAbbreviation": "JurPC",
				"year": "2011",
				"volume": "WebDok 132/2011",
				"pages": "Abs. 1 - 92",
				"url": "http://www.jurpc.de/aufsatz/20110132.htm",
				"libraryCatalog": "JurPC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jurpc.de/rechtspr/20110137.htm",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"court": "KG Berlin",
				"caseName": "KG Berlin, Urteil vom 17.06.2011, 7 U 179/10",
				"title": "KG Berlin, Urteil vom 17.06.2011, 7 U 179/10",
				"shortTitle": "WebDok 137/2011, Abs. 1 - 27",
				"dateDecided": "Urteil vom 17.06.2011  , 7 U 179/10",
				"url": "http://www.jurpc.de/rechtspr/20110137.htm",
				"journalAbbreviation": "JurPC",
				"libraryCatalog": "JurPC",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/