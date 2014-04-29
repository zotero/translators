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
	"lastUpdated": "2014-04-28 19:52:25"
}

var canLiiRegexp = /https?:\/\/(www\.)?canlii\.org\/.*en\/[^\/]+\/[^\/]+\/doc\/.+/;

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


function scrape(doc, url) {

	var newItem = new Zotero.Item("case");
	var voliss = ZU.xpathText(doc, '//td[contains(@class, "canlii-label") and contains(text(), "Citation:")]/following-sibling::td');
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
	var dateDocket = ZU.xpathText(doc, '//td[@class="canlii-label" and contains(text(), "Date:")]/following-sibling::td');

	newItem.caseName = newItem.title = casename;
	if (court) newItem.court = court[0].replace(/,\s*\d{4}\s*/, "").trim();;
	if (reporter) newItem.reporter = reporter[0].replace(/\]\s*\d+\s*/, "");

	if (dateDocket){
		var date = dateDocket.match(/\d{4}-\d{2}-\d{2}/);
		if (date) newItem.dateDecided = date[0];
		var docket = ZU.trimInternal(dateDocket).match(/\(Docket:(.+?)\)/);
		if (docket) newItem.docketNumber = docket[1];
	}
	if (reporterpg) newItem.firstPage = reporterpg[0].replace(/\]\s*\d+\s*[A-Z]+\s*/, "");
	//
	if (!reporterpg && page) newItem.firstPage = page[0].replace(/,\s*\d{4}\s*[A-Z]+\s*/, "");
	if (reportvl) newItem.reporterVolume = reportvl[0].replace(/\]\s*/, "");

	// attach link to pdf version
	Z.debug(url)
	var pdfurl = url.replace(/\.html.+/, ".pdf");
	if (pdfurl) {
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
			Zotero.Utilities.processDocuments(articles, scrape);
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
		"url": "http://www.canlii.org/en/ca/fct/doc/2011/2011fc119/2011fc119.html?searchUrlHash=AAAAAQAjU3V0dGllIHYuIENhbmFkYSAoQXR0b3JuZXkgR2VuZXJhbCkAAAAAAQ",
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