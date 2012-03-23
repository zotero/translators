{
	"translatorID": "0cdc6a07-38cf-4ec1-b9d5-7a3c0cc89b15",
	"label": "OSTI Energy Citations",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.osti\\.gov/energycitations",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-03-12 01:19:11"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//table[@class="searchresults"]//a[@class="citation"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (url.indexOf("product.biblio.jsp") != -1) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var urls = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var xpath = '//table[@class="searchresults"]//a[@class="citation"]';
		var links = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
		var next_link;
		while (next_link = links.iterateNext()) {
			items[next_link.href] = next_link.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			urls.push(i.match(/osti_id=\d+/)[0]);
		}
	} else {
		urls = [url.match(/osti_id=\d+/)[0]];
	}
	for (var i = 0 ; i < urls.length ; i++) {
		var getstr = 'http://www.osti.gov/energycitations/endnote?' + urls[i];
		Zotero.Utilities.HTTP.doGet(getstr, function(text) {
			//Zotero.debug(text);
			text = text.replace(/(%.)/g, "$1 ");
			var trans = Zotero.loadTranslator("import");
			trans.setTranslator("881f60f2-0802-411a-9228-ce5f47b64c7d");
			trans.setString(text);
			trans.translate();
		});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.osti.gov/energycitations/product.biblio.jsp?query_id=0&page=0&osti_id=893699",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "P.",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "A. W.",
						"lastName": "Thomas",
						"creatorType": "author"
					},
					{
						"firstName": "A. G.",
						"lastName": "Williams",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"72 PHYSICS OF ELEMENTARY PARTICLES AND FIELDS; NUCLEAR MATTER; QUARK MATTER; QUARKS; SUPERCONDUCTIVITY"
				],
				"seeAlso": [],
				"attachments": [],
				"publicationTitle": "Journal Name: Phys.Rev.C; Journal Volume: 75",
				"date": "2007%J Journal Name: Phys.Rev.C; Journal Volume: 75",
				"accessionNumber": "OSTI ID: 893699",
				"pages": "Medium: ED; Size: 045202",
				"title": "Phase transition from hadronic matter to quark matter",
				"url": "http://www.osti.gov/energycitations/servlets/purl/893699-1FG1xr/",
				"abstractNote": "We study the phase transition from nuclear matter to quark matter within the SU(3) quark mean field model and NJL model. The SU(3) quark mean field model is used to give the equation of state for nuclear matter, while the equation of state for color superconducting quark matter is calculated within the NJL model. It is found that at low temperature, the phase transition from nuclear to color superconducting quark matter will take place when the density is of order 2.5?0 - 5?0. At zero density, the quark phase will appear when the temperature is larger than about 148 MeV. The phase transition from nuclear matter to quark matter is always first order, whereas the transition between color superconducting quark matter and normal quark matter is second order.",
				"ISBN": "JLAB-THY-06-545; DOE/ER/40150-4072; TRN: US200625%% 471\nUnited States10.1103/PhysRevC.75.045202TRN: US200625%% 471Wed Dec 16 13:51:22 EST 2009TJNAF; RN06149680; INS-US0606064English",
				"libraryCatalog": "OSTI Energy Citations",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/