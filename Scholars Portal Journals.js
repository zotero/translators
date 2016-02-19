{
	"translatorID": "5ac0fd37-5578-4f82-8340-0e135b6336ee",
	"label": "Scholars Portal Journals",
	"creator": "Bartek Kawula",
	"target": "https?://journals[1-2]\\.scholarsportal\\.info/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-02-19 04:18:37"
}

function detectWeb(doc, url) { 
	// see if saved list is toggled open
	if (doc.getElementsByClassName('inner-wrap-open') [0]) {
		return 'multiple'
	} else {
		if(url.indexOf("/search?q") != -1 || url.indexOf("/browse/") != -1){
			return 'multiple'
		}
		else {
			return 'journalArticle';
		}
	}
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(type == "multiple") {
		var list = getItems(doc, url);
		Zotero.selectItems(list, function(selectedItems) {
			if(!selectedItems) return true;
			var uri = [];
			for(var i in selectedItems) {
				uri.push(list[i].uri)
			}
			for(var i=0; i<uri.length; i++) {
				var url = uri[i].replace(/(\/details)/g,"");
				scrape(doc, url)
			}
		})
	} else {
		var a = url.indexOf("details");
		var b = url.indexOf("xml");
		url = url.substring(a+7,b+3);
		scrape(doc, url)
	}
}

function getItems(doc, url) {
	if (doc.getElementsByClassName('inner-wrap-open') [0]) {
		var titles = ZU.xpath(doc.getElementById('my-articles-list'), '//div[@class = "title"]/h3/a');
		var items = {};
		for (var i=0; i<titles.length; i++) { 
			var title = ZU.trimInternal(titles[i].textContent);
			var uri = ZU.trimInternal(titles[i].pathname);
			items[i] = {'title':title,'uri':uri};
		}
		return items
	} else {
		if(url.indexOf("/browse") != -1){
			var titles = ZU.xpath(doc, '//div/h4/a');
		}
		else {
			var titles = ZU.xpath(doc.getElementById('result-list'), '//div[@class = "details"]/h3/a');
		}
		var items = {};
		for (var i=0; i<titles.length; i++) { 
			var title = titles[i].textContent;
			var uri = titles[i].pathname;
			items[i] = {'title':title,'uri':uri};
		}
		return items
	}
}

function extras(doc, item) { 
	var currentdate = new Date(); 
	item.accessed = currentdate.toLocaleString();
	return item
}

function scrape(doc, uri) { 
		var risURL = 'http://'+doc.domain+'/ris?uri='+uri;
		var pdfURL = "/pdf" + uri;
		ZU.doGet(risURL, function(text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				item = extras(doc, item);
				item.url = "http://resolver.scholarsportal.info/resolve" + uri;
				item.attachments = [];
				item.attachments.push({
					url: pdfURL,
					title: "Scholars Portal Full Text PDF",
					mimeType: "application/pdf"
				})
				item.complete();
			})
			translator.translate();
		})
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals1.scholarsportal.info/search?q=water",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals1.scholarsportal.info/details/00959782/v37i0006/841_tnowhbdbmoxs.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Number of Water-Water Hydrogen Bonds in Water-Tetrahydrofuran and Water-Acetone Binary Mixtures Determined by Means of X-Ray Scattering",
				"creators": [
					{
						"lastName": "Katayama",
						"firstName": "Misaki",
						"creatorType": "author"
					},
					{
						"lastName": "Ozutsumi",
						"firstName": "Kazuhiko",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"DOI": "10.1007/s10953-008-9276-0",
				"ISSN": "0095-9782",
				"issue": "6",
				"journalAbbreviation": "J Solution Chem",
				"language": "en",
				"libraryCatalog": "Scholars Portal Journals",
				"pages": "841-856",
				"publicationTitle": "Journal of Solution Chemistry",
				"url": "http://resolver.scholarsportal.info/resolve/00959782/v37i0006/841_tnowhbdbmoxs.xml",
				"volume": "37",
				"attachments": [
					{
						"title": "Scholars Portal Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"Acetone",
					"Binary liquid mixtures",
					"Tetrahydrofuran",
					"Water",
					"Water-water hydrogen bonds",
					"X-ray scattering"
				],
				"notes": [
					{
						"note": "<p>From Ontario Scholars Portal (klsp04222008)</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals1.scholarsportal.info/browse/toc?uri=/08939454&p=1",
		"items": "multiple"
	}
]
/** END TEST CASES **/