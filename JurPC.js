{
	"translatorID": "b662c6eb-e478-46bd- bad4-23cdfd0c9d67",
	"label": "JurPC",
	"creator": "Oliver Vivell and Michael Berkowitz",
	"target": "^https?://www\\.jurpc\\.de/jurpc/show\\?id=",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-12-21 21:21:13"
}

function detectWeb(doc, url) {
	//prevent Zotero from throwing an error here
		var firstLine =  ZU.xpathText(doc, '//h2[1]');
		if ((firstLine.indexOf("Urteil vom")!=-1) ||  (firstLine.indexOf("Beschluss vom")!=-1)) {
				return "case";
		}
		else{
				return "journalArticle";
		}
	}

function doWeb(doc, url) {

		var articles = new Array();

		if (detectWeb(doc, url) == "journalArticle") {

				// Aufsatz gefunden

				//Zotero.debug("Ok, we have an JurPC Article");
				var authors = '//h2[1]';
				var title = '//h2[2]';
				var webdoktext = '//h3';
				var authors = ZU.xpathText(doc, authors);
				var title = ZU.xpathText(doc, title);

				var cite = ZU.xpathText(doc, webdoktext);
				//Zotero.debug(doctype);
				 //Zotero.debug(webdoktext);
				var year = cite.match(/\/(\d{4}),/)[1];

				//Get Year & WebDok Number from Url
				var webdok = cite.match(/Dok. (\d+)\//)[1];
				var webabs = cite.match(/Abs.\s*[\d\-\s]+/)[0].trim();
				
				var newArticle = new Zotero.Item('journalArticle');

				newArticle.title = title;
				newArticle.journal = "JurPC";
				newArticle.journalAbbreviation = "JurPC";
				newArticle.year = year;
				newArticle.volume =  "WebDok " + webdok + "/" + year;
				newArticle.pages = webabs ;
				newArticle.url = url;
				newArticle.language = "de-DE";
				newArticle.attachments = [{document: doc, title: "JurPC SNapshot", mimeType: "text/html"}];
				var aus = authors.split("/");
				for (var i=0; i< aus.length ; i++) {
						aus[i] = aus[i].replace(/\*/, "").trim();
						newArticle.creators.push(Zotero.Utilities.cleanAuthor(aus[i], "author"));
				}
				newArticle.complete();
		} else {
				//Case
				var newArticle = new Zotero.Item('case');

				// all information about the case are stored in h2-elements.
				var information = ZU.xpath(doc, '//h2');
				var caseInformation = [];
				for (var i=0; i<information.length; i++) {
					caseInformation[i] = information[i].textContent;
				}
								
				// does the first row contain court, type of decision and date? Then clean up data! 
				if ((caseInformation[0].indexOf("Urteil vom")!=-1) || (caseInformation[0].indexOf("Beschluss vom")!=-1)) {
					var i = caseInformation[0].indexOf("Urteil vom");
					if (i == -1) {
						i = caseInformation[0].indexOf("Beschluss vom")
					}
					caseInformation.splice(1, 0, caseInformation[0].substr(i, information[0].textContent.length));
					caseInformation[0] = caseInformation[0].substr(0, i);
				}
				
				newArticle.title = caseInformation[3];
				newArticle.court = caseInformation[0];
				newArticle.caseName = newArticle.title;
				newArticle.docketNumber = caseInformation[2];

				var webdoktext = '//h3';			
				var cite = ZU.xpathText(doc, webdoktext);
				var year = cite.match(/\/(\d{4})/);
				if (year != null) {
					year = year[1];
				}
				var webdok = cite.match(/Dok. (\d+)\//);
				if (webdok != null) {
					webdok = webdok[1];
				}
				var webabs = cite.match(/Abs.\s*[\d\-\s]+/);
				if (webabs != null) {
					webabs = webabs[0].trim();
				}
				newArticle.reporter = "JurPC WebDok";
				if (webdok != null && year != null) {
					newArticle.reporterVolume =  " " + webdok + "/" + year;
				}
				
				newArticle.pages = webabs;
				newArticle.url = url;

				var date = caseInformation[1].match(/(\d\d?)\.\s*(\d\d?)\.\s*(\d\d\d\d)/);
				if (date != null) {
					newArticle.dateDecided = date[3] + "-" + date[2] + "-" + date[1];
				}
				
				// store type of decision
				if (/Beschluss./i.test(caseInformation[1])) {
					newArticle.extra = "{:genre: Beschl.}";
				}
				else if (/Urteil/i.test(caseInformation[1])) {
						newArticle.extra = "{:genre: Urt.}";
				}
				
				
				newArticle.language = "de-DE";
				newArticle.attachments = [{document: doc, title: "JurPC SNapshot", mimeType: "text/html"}];
				newArticle.complete();
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.jurpc.de/jurpc/show?id=20110132",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die datenschutzrechtliche Einwilligung des Beschäftigten",
				"creators": [
					{
						"firstName": "Johannes",
						"lastName": "Habermalz",
						"creatorType": "author"
					}
				],
				"journalAbbreviation": "JurPC",
				"language": "de-DE",
				"libraryCatalog": "JurPC",
				"pages": "Abs. 1 - 92",
				"url": "http://www.jurpc.de/jurpc/show?id=20110132",
				"volume": "WebDok 132/2011",
				"attachments": [
					{
						"title": "JurPC SNapshot",
						"mimeType": "text/html"
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
		"url": "http://www.jurpc.de/jurpc/show?id=20000220",
		"items": [
			{
				"itemType": "case",
				"caseName": "OEM-Version",
				"creators": [],
				"dateDecided": "2000-07-06",
				"court": "BGH",
				"docketNumber": "I ZR 244/97",
				"extra": "{:genre: Urt.}",
				"firstPage": "Abs. 1 - 36",
				"language": "de-DE",
				"reporter": "JurPC WebDok",
				"reporterVolume": "220/2000",
				"url": "http://www.jurpc.de/jurpc/show?id=20000220",
				"attachments": [
					{
						"title": "JurPC SNapshot",
						"mimeType": "text/html"
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
		"url": "http://www.jurpc.de/jurpc/show?id=20140193",
		"items": [
			{
				"itemType": "case",
				"caseName": "Zur Haftung des Domainregistrars für Domaininhalte",
				"creators": [],
				"dateDecided": "2014-10-22",
				"court": "Saarländisches Oberlandesgericht",
				"docketNumber": "1 U 25/14",
				"extra": "{:genre: Urt.}",
				"language": "de-DE",
				"reporter": "JurPC WebDok",
				"reporterVolume": "193/2014",
				"url": "http://www.jurpc.de/jurpc/show?id=20140193",
				"attachments": [
					{
						"title": "JurPC SNapshot",
						"mimeType": "text/html"
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
		"url": "http://www.jurpc.de/jurpc/show?id=20140165",
		"items": [
			{
				"itemType": "case",
				"caseName": "Deus Ex",
				"creators": [],
				"dateDecided": "2014-05-15",
				"court": "BGH",
				"docketNumber": "I ZB 71/13",
				"extra": "{:genre: Beschl.}",
				"firstPage": "Abs. 1 - 18",
				"language": "de-DE",
				"reporter": "JurPC WebDok",
				"reporterVolume": "165/2014",
				"url": "http://www.jurpc.de/jurpc/show?id=20140165",
				"attachments": [
					{
						"title": "JurPC SNapshot",
						"mimeType": "text/html"
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