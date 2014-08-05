{
	"translatorID": "62c0e36a-ee2f-4aa0-b111-5e2cbd7bb5ba",
	"label": "MetaPress",
	"creator": "Michael Berkowitz, Sebastian Karcher",
	"target": "https?://(.*)metapress\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-08-05 03:26:18"
}

function detectWeb(doc, url) {
	if (ZU.xpath(doc, '//div[@class="primitive article"]/h2/a[1]').length > 0) {
		return "multiple";
	} else if (url.match(/content\/[^?/]/)) {
		var headingLabel = doc.getElementById('ctl00_PageHeadingLabel');
		if(!headingLabel) {
			Z.debug('Heading not found. Defaulting to journalArticle');
			return 'journalArticle';
		};
		
		var type = ZU.trimInternal(headingLabel.textContent).toLowerCase()
		switch(type) {
			case 'book chapter':
				return 'bookSection';
			case 'journal article':
				return 'journalArticle';
			default:
				Z.debug('Unrecognized heading: ' + type);
				return "journalArticle";
		}
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc, '//div[@class="primitive article"]/h2/a[1]');
		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function (items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, scrape);
		})
	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	var host = doc.location.host;
	var artid = url.match(/content\/([^\/]+)/)[1];
	
	ZU.doPost('/export.mpx', 'code=' + artid + '&mode=ris', function (text) {
		//some entries have empty author fields, or fields with just a comma. Delete those.
		text = text.replace(/AU  - [\s,]+\n/g, "");
		//book chapters are supposed to be CHAP not CHAPTER
		text = text.replace(/TY\s+-\s+CHAP.+/g, 'TY  - CHAP');
		
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// See http://trb.metapress.com/content/y86nu17g47k25610/?p=f7c9780b9aea4ad982d8ccb3d10010d8&pi=0
			if(item.issue == '-1') delete item.issue;
			
			var pdfurl = 'http://' + host +'/content/' + artid + '/fulltext.pdf';
			item.attachments = [{
				url: item.url,
				title: "MetaPress Snapshot",
				mimeType: "text/html"
			}, {
				url: pdfurl,
				title: "MetaPress Full Text PDF",
				mimeType: "application/pdf"
			}];
			
			if (item.abstractNote && item.abstractNote.substr(0, 8) == "Abstract") {
				item.abstractNote = ZU.trimInternal(item.abstractNote.substr(8));
			}
			
			item.complete();
		});
		translator.translate();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://metapress.com/content/y737165n6x0q1455/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Immigration and Unemployment of Skilled and Unskilled Labor",
				"creators": [
					{
						"lastName": "Yabuuchi",
						"firstName": "Shigemi",
						"creatorType": "author"
					}
				],
				"date": "June 1, 2008",
				"abstractNote": "This paper discusses the problem of unemployment in developed countries that faces international labor movement. There are two types of unemployment. The first traditional type of unemployment exists simply because the common wage rate is fixed and higher than the equilibrium level. The second one may exist when the wage rate in one sector is high and fixed, while that in the other is flexible. On the other hand, an extensive movement of labor among countries has been observed. Thus, this paper investigates the effects of immigration and other policies on the two types of unemployment. JEL classification : F16, F22, J64, R23",
				"accessDate": "CURRENT_TIMESTAMP",
				"issue": "2",
				"libraryCatalog": "MetaPress",
				"pages": "331-345",
				"publicationTitle": "Journal of Economic Integration",
				"url": "http://www.metapress.com/content/Y737165N6X0Q1455",
				"volume": "23",
				"attachments": [
					{
						"title": "MetaPress Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "MetaPress Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "http://metapress.com/content/?k=labor+market",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://metapress.com/content/j99677822343/?v=editorial",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://brepols.metapress.com/content/V4G02936X2860845",
		"items": [
			{
				"itemType": "bookSection",
				"title": "The Regular Canons in the Medieval British Isles",
				"creators": [
					{
						"lastName": "Abram",
						"firstName": "Andrew",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.1484/M.MCS-EB.5.100378",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "MetaPress",
				"pages": "79-95",
				"publicationTitle": "Medieval Church Studies",
				"url": "http://dx.doi.org/10.1484/M.MCS-EB.5.100378",
				"attachments": [
					{
						"title": "MetaPress Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "MetaPress Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "http://trb.metapress.com/content/y86nu17g47k25610/?p=f7c9780b9aea4ad982d8ccb3d10010d8&pi=0",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "1997-1998 Survey of Potential North American Applications for Emerging Diesel Multiple Unit Technologies",
				"creators": [
					{
						"lastName": "Pieri",
						"firstName": "Gerald",
						"creatorType": "author"
					},
					{
						"lastName": "Nelson",
						"firstName": "David",
						"creatorType": "author"
					}
				],
				"date": "January 1, 1999",
				"DOI": "10.3141/1677-06",
				"abstractNote": "The results of a survey done in the United States and Canada in 1997 and 1998 are presented. The survey was done to determine the level of interest among current and potential commuter rail operations in applying emerging technologies for self-propelled, diesel multiple unit (DMU) rail passenger cars. Interest in DMU rail passenger cars is waxing across the continent as commuter rail grows in popularity as a transit mode and operators search for possible alternatives to push-pull diesel equipment. The survey team contacted representatives of 58 operators, regional transit agencies, planning agencies, state departments of transportation, and other agencies. Twenty-eight of the respondents currently operate or oversee commuter or regional rail service and 30 do not. The principal survey was conducted in 1997 with follow-on surveys of selected jurisdictions in 1998. Of the 58 potential operators, 19 do not foresee DMU use, 8 currently operate DMUs, 2 are actively implementing DMU plans, and the remaining 29 are considering DMUs for future applications in their jurisdictions. At least 14 potential operators have hosted DMU demonstrations. Two sections are presented: ( a ) a summary of findings and observations with a summary table of survey results, and ( b ) details on each jurisdiction surveyed covering current operations, plans, and orientation toward DMU applications.",
				"libraryCatalog": "MetaPress",
				"pages": "48-57",
				"publicationTitle": "Transportation Research Record: Journal of the Transportation Research Board",
				"url": "http://dx.doi.org/10.3141/1677-06",
				"volume": "1677",
				"attachments": [
					{
						"title": "MetaPress Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "MetaPress Full Text PDF",
						"mimeType": "application/pdf"
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