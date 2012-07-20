{
	"translatorID": "409c520b-0720-4011-8fce-70fcd9806493",
	"label": "InderScience",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.inderscience\\.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-07-20 11:18:46"
}

function detectWeb(doc, url) {
	if (doc.evaluate('/html/body/table/tbody/tr/td[2]/table[tbody/tr/td[3]][2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()
		|| doc.evaluate('//table/tbody/tr/td[2]/a/b', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (url.indexOf("rec_id") != -1) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "journalArticle") {
		scrape(url);
	} else if ((detectWeb(doc, url) == "multiple")) {
		if (doc.evaluate('//table/tbody/tr/td/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var items = new Object();
			var results = doc.evaluate('//table/tbody/tr/td/a[contains(@href, "artid")]', doc, null, XPathResult.ANY_TYPE, null);
			var result;
			while (result = results.iterateNext()) {
				var title = result.textContent;
				var id = result.href.match(/artid=(\d+)/)[1];
				items[id] = title;
			}
			items = Zotero.selectItems(items);
			for (var i in items) {
				scrape('http://www.inderscience.com/search/index.php?action=record&rec_id=' + i);
			}
		} else {
			var arts = new Array();
			var items = Zotero.Utilities.getItemArray(doc, doc, "&rec_id");
			items = Zotero.selectItems(items);
			for (var i in items) {
				scrape(i);
			}
		}
	}
}

function scrape(link) {
	Zotero.Utilities.loadDocument(link, function(newDoc) {
		var data = new Object();
		var rows = newDoc.evaluate('/html/body/table/tbody/tr/td[2]/table[tbody/tr/td[3]]//tr[td[3]]', newDoc, null, XPathResult.ANY_TYPE, null);
		var row;
		while (row = rows.iterateNext()) {
			var tag = Zotero.Utilities.trimInternal(newDoc.evaluate('./td[2]', row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
			var value = Zotero.Utilities.trimInternal(newDoc.evaluate('./td[3]', row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
			data[tag] = value;
		}
		//Zotero.debug(data);
		var item = new Zotero.Item("journalArticle");
		item.title = data['Title:'];
		item.abstractNote = data['Abstract:'];
		item.url = newDoc.location.href;
		item.tags = data['Keywords:'].substr(0, data['Keywords:'].length - 1).split(/\s*;\s*/);
		item.DOI = data['DOI:'];
		item.attachments.push({url:item.url, title:item.title + ": InderScience Snapshot", mimeType:"text/html"});
		var authors = data['Author:'].split(/\s*,\s*/);
		for each (var author in authors) {
			item.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));
		}
		var voliss = data['Journal:'].match(/^([^\d]+)(\d+)\s*\-\s*Vol\.\s*(\d+)\s*,\s*No\.(.+)pp\.\s*(.*)$/);
		//Zotero.debug(voliss);
		item.publicationTitle = voliss[1];
		item.date = voliss[2];
		item.volume = voliss[3];
		item.issue = voliss[4];
		item.pages = voliss[5];
		item.complete();
  	}, function() {Zotero.done();});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.inderscience.com/search/index.php?action=record&rec_id=29401&prevQuery=&ps=10&m=or",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Casey Man Kong",
						"lastName": "Lum",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"karaoke singing",
					"cross-cultural appropriation",
					"globalisation",
					"hybrid media",
					"cultural practice",
					"music videos",
					"music industry",
					"McLuhan",
					"orality",
					"sense-making",
					"culture",
					"ethnography",
					"Hong Kong",
					"China",
					"Taiwan",
					"Japan",
					"USA",
					"United States"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.inderscience.com/search/index.php?action=record&rec_id=29401&prevQuery=&ps=10&m=or",
						"title": "Karaoke and the cross-cultural appropriations of music: InderScience Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Karaoke and the cross-cultural appropriations of music",
				"abstractNote": "Marshall McLuhan observed in his 1964 paradigm-shifting classic, Understanding Media, that the ''crossings or hybridisations of the media release great new force and energy as by fission or fusion'' (p.48) and that the ''hybrid or the meeting of two media is a moment of truth and revelation from which new form is born'' (p.55). This study seeks to shed light on karaoke as a hybrid media form and on karaoke singing as a complex sense-making experience in an age of interactive electronic media. It reflects upon the implications of the cross-cultural appropriation of music by examining the production and uses of karaoke music videos. The discussion in this study is supported in part by data from ethnographic case studies conducted in Hong Kong, Taiwan, Japan and New York City. Further research on karaoke within the theoretical framework of media and globalisation is suggested.",
				"url": "http://www.inderscience.com/search/index.php?action=record&rec_id=29401&prevQuery=&ps=10&m=or",
				"DOI": "10.1504/IJCCM.2009.029401",
				"publicationTitle": "International Journal of Chinese Culture and Management",
				"date": "2009",
				"volume": "2",
				"issue": "3",
				"pages": "194 - 205",
				"libraryCatalog": "InderScience",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.inderscience.com/browse/index.php?journalID=220&year=2009&vol=2&issue=3",
		"items": "multiple"
	}
]
/** END TEST CASES **/