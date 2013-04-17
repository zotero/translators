{
	"translatorID": "4c9dbe33-e64f-4536-a02f-f347fa1f187d",
	"label": "BioInfoBank",
	"creator": "Michael Berkowitz",
	"target": "^https?://lib\\.bioinfo\\.pl/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2013-04-17 03:10:37"
}

function detectWeb(doc, url) {
	return "multiple";
}

function doWeb(doc, url) {
	var pmids = new Array();
	var items = new Object();
	var titles = doc.evaluate('//div[@class="css_pmid"]/div[@class="css_pmid_title"]/a', doc, null, XPathResult.ANY_TYPE, null);
	var title;
	while (title = titles.iterateNext()) {
		items[title.href] = Zotero.Utilities.trimInternal(title.textContent);
	}

	Zotero.selectItems(items, function (items) {
		if (!items) {
			return true;
		}
		for (var i in items) {
			pmids.push(i.match(/pmid:(\d+)/)[1]);
		}
		var newUri = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=PubMed&retmode=xml&rettype=citation&id=" + pmids.join(",");
		Zotero.Utilities.HTTP.doGet(newUri, function (text) {
			// Remove xml parse instruction and doctype
			text = text.replace(/<!DOCTYPE[^>]*>/, "").replace(/<\?xml[^>]*\?>/, "");

			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("fcf41bed-0cbc-3704-85c7-8062a0068a7a");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				item.complete();
			});
			translator.translate();
		})
	})
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://lib.bioinfo.pl/",
		"items": "multiple"
	}
]
/** END TEST CASES **/