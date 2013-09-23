{
	"translatorID": "84799379-7bc5-4e55-9817-baf297d129fe",
	"label": "CanLII (English)",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?canlii\\.org.*/en/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-09-22 20:55:35"
}

var canLiiRegexp = /http:\/\/(www\.)?canlii\.org\/.*en\/[^\/]+\/[^\/]+\/doc\/.+/;

function detectWeb(doc, url) {

	if (canLiiRegexp.test(url)) {
		return "case";
	} else {
		var aTags = doc.getElementsByTagName("a");
		for (var i = 0; i < aTags.length; i++) {
			if (canLiiRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
}


function scrape(doc) {

	var newItem = new Zotero.Item("case");
	var voliss = ZU.xpathText(doc, '//td[@class="canlii-label" and contains(text(), "Citation:")]/following-sibling::td');
	//Z.debug("voliss: ("+voliss+")")
	var casename = voliss.match(/.+?,/)[0].replace(/,/, "").trim();
	//Z.debug("casename: ("+casename+")");
	var court = voliss.match(/,\s*\d{4}\s*[A-Z]+/);
	//Z.debug("court: ("+court+")");
	var reportvl = voliss.match(/\]\s*\d+/);
	//Z.debug("reportvl: ("+reportvl+")");
	var reporter = voliss.match(/\]\s*\d+\s*[A-Z]+/);
	//Z.debug("reporter: ("+reporter+")");
	var reporterpg = voliss.match(/\]\s*\d+\s*[A-Z]+\s*\d+/);
	//Z.debug("reporterpg: ("+reporterpg+")");
	var page = voliss.match(/,\s*\d{4}\s*[A-Z]+\s*\d+/);
	var date = ZU.xpathText(doc, '//td[@class="canlii-label" and contains(text(), "Date:")]/following-sibling::td');
	//Z.debug("date: ("+date+")")
	var docket = ZU.xpathText(doc, '//td[@class="canlii-label" and contains(text(), "Docket:")]/following-sibling::td');
	//Z.debug("docket: ("+docket+")")

	newItem.caseName = newItem.title = casename;
	if (court) newItem.court = court[0].replace(/,\s*\d{4}\s*/, "").trim();;
	if (reporter) newItem.reporter = reporter[0].replace(/\]\s*\d+\s*/, "");
	newItem.dateDecided = date;
	if (docket) newItem.docketNumber = docket.trim();
	if (reporterpg) newItem.firstPage = reporterpg[0].replace(/\]\s*\d+\s*[A-Z]+\s*/, "");
	//
	if (!reporterpg && page) newItem.firstPage = page[0].replace(/,\s*\d{4}\s*[A-Z]+\s*/, "");
	if (reportvl) newItem.reporterVolume = reportvl[0].replace(/\]\s*/, "");

	// attach link to pdf version
	var pdfurl = ZU.xpathText(doc, '//td/a[contains(text(), "PDF Format")]/@href');
	if (pdfurl) {
		pdfurl = "http://canlii.ca" + pdfurl;
		newItem.attachments = [{
			url: pdfurl,
			title: "CanLII Full Text PDF",
			mimeType: "application/pdf"
		}];
	}
	newItem.attachments.push({
		document: doc,
		title: "CanLII Snapshot",
		mimeType: "text/html"
	});
	newItem.complete();
}

function doWeb(doc, url) {

	if (canLiiRegexp.test(url)) {
		scrape(doc, url);
	} else {

		var items = Zotero.Utilities.getItemArray(doc, doc, canLiiRegexp);
		var articles = [];
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://canlii.org/en/ca/scc/nav/date/2010.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://canlii.org/en/ca/scc/doc/2010/2010scc2/2010scc2.html",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "MiningWatch Canada v. Canada (Fisheries and Oceans)",
				"caseName": "MiningWatch Canada v. Canada (Fisheries and Oceans)",
				"court": "SCC",
				"reporter": "SCR",
				"dateDecided": "2010-01-21",
				"docketNumber": "32797",
				"firstPage": "6",
				"reporterVolume": "1",
				"libraryCatalog": "CanLII"
			}
		]
	},
	{
		"type": "web",
		"url": "http://canlii.org/eliisa/highlight.do?language=en&searchTitle=SOR%2F97-457&origin=%2Fen%2Fca%2Flaws%2Fregu%2Fsor-97-457%2Flatest%2Fsor-97-457.html&translatedOrigin=%2Ffr%2Fca%2Flegis%2Fregl%2Fdors-97-457%2Fderniere%2Fdors-97-457.html&path=/en/ca/fct/doc/2011/2011fc119/2011fc119.html",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Suttie v. Canada (Attorney General)",
				"caseName": "Suttie v. Canada (Attorney General)",
				"court": "FC",
				"dateDecided": "2011-02-02",
				"docketNumber": "T-1089-10",
				"firstPage": "119",
				"libraryCatalog": "CanLII"
			}
		]
	}
]
/** END TEST CASES **/