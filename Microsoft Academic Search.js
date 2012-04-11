{
	"translatorID": "91c7b393-af05-476c-ae72-ae244d2347f4",
	"label": "Microsoft Academic Search",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://[^/]*academic\\.research\\.microsoft\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-04-10 21:58:36"
}

function getSearchResults(doc) {
	if(!getSearchResults.results) {
		getSearchResults.results = ZU.xpath(doc,
			'//div[@id="ctl00_divCenter"]//li[@class="paper-item"]\
			//a[substring(@id, string-length(@id)-5)="_Title"]');
	}

	return getSearchResults.results;
}

function scrape(doc, url) {
	var pubID = url.match(/\/Publication\/(\d+)/)[1];
	var exportUrl = 'http://academic.research.microsoft.com/' + pubID +
			'.bib?type=2&format=0';

	//fetch attachments
	var attachments = ZU.xpath(doc, '//ul[@id="downloadList"]//a[./img]');
	var type, att = new Array();
	for(var i=0, n=attachments.length; i<n; i++) {
		type = ZU.xpathText(attachments[i], './img/@src') || '';
		type = type.match(/\/([a-z]+)_small\.png$/i);
		if(!type) continue;

		switch(type[1].toLowerCase()) {
			case 'pdf':
				att.push({
					title: 'Full Text PDF',
					url: attachments[i].href,
					mimeType: 'application/pdf'
				});
			break;
			case 'downloadpage':
				att.push({
					title: 'Snapshot',
					url: attachments[i].href,
					mimeType: 'text/html',
					snapshot: true
				});
			break;
			default:
				att.push({
					title: 'Web Link',
					url: attachments[i].href,
					mimeType: 'text/html',
					snapshot: false
				});
		}
	}

	//grab keywords
	var keywords = ZU.xpath(doc, '//div[@class="section-wrapper"]\
			[.//span[@id="ctl00_LeftPanel_RelatedKeywords_spHeader"]]/ul/li');
	var tags = new Array();
	for(var i=0, n=keywords.length; i<n; i++) {
		tags.push(keywords[i].textContent.trim());
	}

	ZU.doGet(exportUrl, function(text) {
		var translator = Zotero.loadTranslator('import');
		//BibTeX
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
		translator.setString(text);

		translator.setHandler('itemDone', function(obj, item) {
			item.attachments = att;
			item.tags = tags;
			item.complete();
		})

		translator.translate();
	});
}

function detectWeb(doc, url) {
	if(url.indexOf('/Search?') != -1 &&
		url.match(/[&?]query=[^&]+/) &&
		getSearchResults(doc).length) {
		return 'multiple';
	}
	if(url.match(/\/Publication\/(\d+)/)) {
		return 'journalArticle';
	}
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == 'multiple') {
		var results = getSearchResults(doc);
		var items = new Object();
		for(var i=0, n=results.length; i<n; i++) {
			items[results[i].href] = results[i].textContent;
		}
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for(var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(urls, function(doc) {
				scrape(doc, doc.location.href);
			});
		});
	} else {
		scrape(doc, url);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://academic.research.microsoft.com/Publication/13366371/out-of-cite-how-reference-managers-are-taking-research-to-the-next-level",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Muldrow",
						"creatorType": "author"
					},
					{
						"firstName": "Stephen",
						"lastName": "Yoder",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Indexation",
					"Research Method",
					"Time Change"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Out of Cite! How Reference Managers Are Taking Research to the Next Level",
				"publicationTitle": "Ps-political Science & Politics",
				"volume": "42",
				"date": "2009",
				"issue": "01",
				"DOI": "10.1017/S1049096509090337",
				"libraryCatalog": "Microsoft Academic Search"
			}
		]
	},
	{
		"type": "web",
		"url": "http://academic.research.microsoft.com/Search?query=zotero",
		"items": "multiple"
	}
]
/** END TEST CASES **/