{
	"translatorID": "46291dc3-5cbd-47b7-8af4-d009078186f6",
	"label": "CiNii",
	"creator": "Michael Berkowitz and Mitsuo Yoshida",
	"target": "^https?://ci\\.nii\\.ac\\.jp/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-05-05 02:54:55"
}

function detectWeb(doc, url) {
	if (url.match(/naid/)) {
		return "journalArticle";
	} else if (doc.evaluate('//a[contains(@href, "/naid/")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var links = doc.evaluate('//a[contains(@href, "/naid/")]', doc, null, XPathResult.ANY_TYPE, null);
		var link;
		while (link = links.iterateNext()) {
			items[link.href] = Zotero.Utilities.trimInternal(link.textContent);
		}
	Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				arts.push(i);
			}
			Zotero.Utilities.processDocuments(arts, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();	
		});
	} else {
		scrape(doc, url)
	}
}
function scrape(doc, url){
		var newurl = doc.location.href;
		var biblink = ZU.xpathText(doc, '//li/div/a[contains(text(), "BibTeX")]/@href');
	//Z.debug(biblink)
	var tags = new Array();
		if (doc.evaluate('//a[@rel="tag"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var kws = doc.evaluate('//a[@rel="tag"]', doc, null, XPathResult.ANY_TYPE, null);
			var kw;
			while (kw = kws.iterateNext()) {
				tags.push(Zotero.Utilities.trimInternal(kw.textContent));
			}
		}
		var abstractNote;
		if (doc.evaluate('//div[@class="abstract"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			abstractNote = doc.evaluate('//div[@class="abstract"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		}
		Zotero.Utilities.HTTP.doGet(biblink, function(text) {
			var trans = Zotero.loadTranslator("import");
			trans.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
			trans.setString(text);
			trans.setHandler("itemDone", function(obj, item) {
				item.url = newurl;
				item.attachments = [{url:item.url, title:item.title + " Snapshot", mimeType:"text/html"}];
				item.tags = tags;
				item.abstractNote = abstractNote;
				item.complete();
			});
			trans.translate();
		});
	}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ci.nii.ac.jp/search?q=test&range=0&count=20&sortorder=1&type=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ci.nii.ac.jp/naid/110008803112/ja",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "啓佑",
						"lastName": "岡田",
						"creatorType": "author"
					},
					{
						"firstName": "文彦",
						"lastName": "伊野",
						"creatorType": "author"
					},
					{
						"firstName": "兼一",
						"lastName": "萩原",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "遺伝子配列に対するペアワイズアライメントのGPUによる高速化 Snapshot",
						"mimeType": "text/html"
					}
				],
				"itemID": "岡田啓佑:2012-03-21",
				"title": "遺伝子配列に対するペアワイズアライメントのGPUによる高速化",
				"publicationTitle": "情報処理学会研究報告. BIO, バイオ情報学",
				"ISSN": "09196072",
				"publisher": "一般社団法人情報処理学会",
				"date": "March 2012",
				"volume": "2012",
				"issue": "7",
				"pages": "1-2",
				"url": "http://ci.nii.ac.jp/naid/110008803112/ja",
				"abstractNote": "本稿では,GPU(Graphics Processing Unit)における高速なSmith-Waterman(SW)アルゴリズムの実装を示す.提案実装は1組の遺伝子配列に対するアライメントを高速に処理する.そのために,Striped SWアルゴリズムをタイリング技術とともにCUDA(Compute Unified Device Architecture)上に実装している.\n\t\t\t\t\tThis paper presents a fast implementation of the Smith-Waterman (SW) algorithm running on the graphics processing unit (GPU). Our implementation accelerates pairwise alignment of genome sequences. To achieve this, a striped version of the SW algorithm is implemented with a tiling technique on the compute unified device architecture (CUDA).",
				"libraryCatalog": "CiNii",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/
