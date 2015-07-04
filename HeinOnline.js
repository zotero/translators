{
	"translatorID": "3dcbb947-f7e3-4bbd-a4e5-717f3701d624",
	"label": "HeinOnline",
	"creator": "Frank Bennett",
	"target": "https?://heinonline.org/HOL/(?:LuceneSearch|Page)\\?",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2015-07-04 10:32:10"
}

function detectWeb (doc, url) {
	if (url.match(/\/LuceneSearch\?/)) {
		return "multiple";
	} else {
		return "journalArticle";
	}
}

function Data(doc) {
	this.node = ZU.xpath(doc, '//form[@id="Print1"]');
	this.urlbase = "http://heinonline.org/HOL/PDFsearchable?";
	this.queryElems = [];
	this.tail = "&sectioncount=1&ext=.pdf&nocover=";
}

Data.prototype.getval = function(name) {
	var val = '';
	var input = ZU.xpath(this.node, './/input[@name="' + name + '"]');
	if (input && input.length) {
		val = input[0].value ? input[0].value : '';
	}
	this.queryElems.push(name + "=" + val);
}

Data.prototype.dump = function() {
	return this.urlbase + this.queryElems.join("&") + this.tail;
}

function getSearchResults(doc) {
	var results = ZU.xpath(doc, '//div[contains(@class, "lucene_search_result_b")]'),
		items = {},
		found = false
	for (var i=0; i<results.length; i++) {
		
		var url = ZU.xpath(results[i], './/a[contains(@href, "Print")]');
		url = (url && url.length) ? url[0].href : false;

		var title = ZU.trimInternal(ZU.xpath(results[i], './/a[1]')[0].textContent);		
		title = title.replace(/\s*\[[^\]]*\]$/, '');

		if (!title || !url) continue;
		url = url.replace(/Print/, "Page");
		url = url.replace(/&terms=[^&]*/, '');
		
		items[url] = title;
		found = true;
	}
	return found ? items : false;
}

function scrapePage(doc, isSingle) {
	var pdfPageURL = doc.location.href.replace(/\/Page\?/, "/Print?");
	var item = new Zotero.Item();
	var spans = ZU.xpath(doc, '//span[contains(@class, " Z3988") or contains(@class, "Z3988 ") or @class="Z3988"][@title]');
	if (spans && spans.length) {
		ZU.parseContextObject(spans[0].title, item);
	}

	ZU.processDocuments([pdfPageURL], 
		function(pdoc){
			var input = new Data(pdoc);
			input.getval("handle");
			input.getval("collection");
			input.getval("section");
			input.getval("id");
			input.getval("print");
			input.getval("nocover");
			var pdfURL = input.dump();
			
			item.attachments.push({
				url:pdfURL,
				title:"HeinOnline PDF",
				mimeType:"application/pdf"
			});
			item.complete();
		});
}

function doWeb (doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var urls = [];
			for (var i in items) {
				Zotero.debug(i);
				urls.push(i);
			}
			ZU.processDocuments(urls, scrapePage);
		});
	} else {
		scrapePage(doc);
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://heinonline.org/HOL/Page?handle=hein.journals/howlj3&div=8&collection=journals&set_as_cursor=1&men_tab=srchresults",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Law, Logic and Experience",
				"creators": [
					{
						"firstName": "Grant",
						"lastName": "Gilmore",
						"creatorType": "author"
					}
				],
				"date": "1957",
				"journalAbbreviation": "Howard L.J.",
				"libraryCatalog": "HeinOnline",
				"pages": "26",
				"publicationTitle": "Howard Law Journal",
				"url": "http://heinonline.org/HOL/Page?handle=hein.journals/howlj3&id=46&div=&collection=journals",
				"volume": "3",
				"attachments": [
					{
						"title": "HeinOnline PDF",
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
