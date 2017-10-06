{
	"translatorID": "bb36d125-ec5e-446c-8882-ad42367a0295",
	"label": "Nikkei business online",
	"creator": "Kouichi C. Nakamura",
	"target": "^https?://business.nikkeibp.co.jp/\\w+/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-10-06 04:53:52"
}

function detectWeb(doc, url) {

	if (url.search(/\/atcl\/\w+\/\d+\/\d+\/\d+\//) != -1) {
		return "magazineArticle";
	} else {
		return "multiple";
	}

}

function doWeb(doc, url) {

	if (detectWeb(doc, url) == "multiple") {

		var items = {};

		if (url.search(/\/article\/\w+\/\d{8}\/\d{6}\//) > -1) {
			//http://business.nikkeibp.co.jp/article/topics/20060929/110879/

			var href = ZU.xpath(doc,'//section[@class="articleBlock"]/ul[@class="articleList"]/li/a/@href');
			var H3 = ZU.xpath(doc,'//section[@class="articleBlock"]/ul[@class="articleList"]/li/a/h3');

			for (var i = 0; i < href.length ; i++) {
				items[i] = {
					title : H3[i].innerText,
					url : 'http://business.nikkeibp.co.jp/' + href[i].value
				};
			}

			// Zotero.debug(items);

		} else if (url.search(/\/atcl\/\w+\/\d{2}\/\d{9}\/$/) > -1) {
			//http://business.nikkeibp.co.jp/atcl/report/16/092700167/

			var href = ZU.xpath(doc,'//ul[@id="Contents"]/li[contains(@class, "FREE2NBO-v")]/p/a/@href');

			var title = ZU.xpath(doc,'//ul[@id="Contents"]/li[contains(@class, "FREE2NBO-v")]/p/a');

			for (var i = 0; i < href.length ; i++) {
				Z.debug(title[i].innerText);
				items[i] = {
					title : title[i].innerText,
					url : 'http://business.nikkeibp.co.jp' + href[i].value
				};
			}
			//Zotero.debug(items);

		} else if (url.search(/http:\/\/business.nikkeibp.co.jp\/\w+\/$/) > -1) {
			// http://business.nikkeibp.co.jp/skill/
			
			var href1 = ZU.xpath(doc,'//div[@class="pickupArticle"]/h2/a/@href');
			var h2a = ZU.xpath(doc,'//div[@class="pickupArticle"]/h2/a');
			
			if (href1) {
				var j = 0;
				for (var i = 0; i < href1.length; i++) {
				
					items[i] = {
						title : h2a[i].innerText,
						url : 'http://business.nikkeibp.co.jp' + href1[i].value
					};
					j = j + 1;
				}

			} 

			var href = ZU.xpath(doc,'//section[@class="articleBlock"]/ul[contains(@class,"articleList")]/li//h3/a/@href');
			var H3 = ZU.xpath(doc,'//section[@class="articleBlock"]/ul[contains(@class,"articleList")]/li//h3/a');

			for (var i = 0; i < 0 + href.length ; i++) {
				items[i+j] = {
					title : H3[i].innerText,
					url : 'http://business.nikkeibp.co.jp' + href[i].value
				};
			}


		} else if (url.search(/http:\/\/business.nikkeibp.co.jp\/special\/\w+\/\?i_cid=[\w_]+$/) > -1) {
			// http://business.nikkeibp.co.jp/special/kachoj/?i_cid=nbpnbo_kj
		
			Zotero.debug('hello');
			
			var href = ZU.xpath(doc,'//section[@class="articleBlock"]/ul[contains(@class,"articleList")]/li//h3/a/@href');
			var H3 = ZU.xpath(doc,'//section[@class="articleBlock"]/ul[contains(@class,"articleList")]/li//h3/a');

			for (var i = 0; i < href.length ; i++) {
				items[i] = {
					title : H3[i].innerText,
					url : 'http://business.nikkeibp.co.jp/' + href[i].value
				};
			}	
		}
		Zotero.debug(items);

		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;

			for (var i in selectedItems) {
				scrape(doc,items[i].url);
			}
		});

		return null;
		
	} else if (detectWeb(doc, url) == "magazineArticle") {

		scrape(doc,url);
	}

}


function scrape(doc,url) {

	if (url.search(/\?ST=print/) != -1) { // print page

		var item = new Zotero.Item("magazineArticle");


		var seriesTitle = ZU.xpath(doc,'//header[@id="articleHeader"]/h2');

		if (seriesTitle != null) {
			item.extra = seriesTitle[0].innerHTML;
		}


		var title_h1 = ZU.xpath(doc, '//header[@id="articleHeader"]/h1');
		var title_h2 = ZU.xpath(doc, '//header[@id="articleHeader"]/p');

   		if (title_h2.length > 0 && title_h2[0].innerHTML.length > 0) {
			var title2 = " - " + title_h2[0].innerHTML;

   		} else {
   			var title2 = "";
   		}

		item.title = title_h1[0].innerHTML + title2;
   		//Zotero.debug(item.title);


   		// authors
   		var authors_ = ZU.xpath(doc,'//p[@class="writer"]');
		Zotero.debug(authors_[0].innerHTML);
		var authors = authors_[0].innerHTML.split(/、/)

		Zotero.debug(authors);
		if (authors[0].length > 0) {
			for (i = 0; i < authors.length; i++) {
				var m = authors[i].match(/([^\s]+)\s([^\s].*$)/);

				item.creators.push({

					firstName : m[2],
					lastName : m[1],
					type : "author"

				}); //ZU.cleanAuthor(authors[0],"author");
			}
		}

		//Zotero.debug(item.creators);

		var abst = ZU.xpath(doc,'//div[@id="articleBody"]/'
				+ 'child::div[@class="bpbox"]/div[@class="bpbox_text"]//p');
		Zotero.debug(abst.length);
		if (abst.length > 0) {

			var abstNote = "";

			for (var i = 0; i < abst.length; i++) {
				abstNote = abstNote + abst[i].innerText + "\n";
			}
			item.abstractNote = abstNote;
		}

		Z.debug(item.abstractNote);


		// date
   		var pubdate = ZU.xpath(doc,'//p[@class="date"]');

   		var m = pubdate[0].innerHTML.match(/(^\d{4}).(\d{1,2}).(\d{1,2})./);

   		var year = m[1];
   		var month = m[2];
   		var day = m[3];
		item.date = year + "." + month + "." + day;
   		//Zotero.debug(item.date);


		item.publicationTitle = "日経ビジネスオンライン";
		item.libraryCatalog = "日経ビジネスオンライン";
		item.url = url.replace(/\?ST=print$/,"?P=1");

		// attachments

		item.attachments = [{
			doc: doc,
			title: "Snapshot",
			mimeType: "text/html",
			snapshot: true
		}];
		//TODO url is wrong http://business.nikkeibp.co.jp/?ST=print

		item.language = "jpn";

		item.complete();


	} else { // article page

		var newurl = url.replace(/\/[^\/]*$/, "/?P=1"); // make sure to read page 1
		Zotero.debug(newurl);

		ZU.processDocuments(newurl, function (doc) {

			var item = new Zotero.Item("magazineArticle");

			var seriesTitle = ZU.xpath(doc,'//p[@id="breadcrumb"]/a[last()]')
			//var seriesTitle = ZU.xpath(doc,'//p[@class="parentTitle"]/a');
			Zotero.debug(seriesTitle.length);
			if (seriesTitle != null) {
				item.extra = seriesTitle[0].innerText;
				Zotero.debug(item.extra);
			}

			var title_h1 = ZU.xpath(doc, '//header[@id="articleHeader"]/h1');
			var title_h2 = ZU.xpath(doc, '//header[@id="articleHeader"]/h2');

	   		if (title_h2.length > 0 && title_h2[0].innerHTML.length > 0) {
				var title2 = " - " + title_h2[0].innerHTML;

	   		} else {
	   			var title2 = "";
	   		}

			item.title = title_h1[0].innerHTML + title2;
	   		Zotero.debug(item.title);


	   		// authors   ul[id="searchAuthors"]//li/div
	   		var authors = ZU.xpath(doc,'//p[@class="thumb"]/a/span');
			for (i = 0; i < authors.length; i++) {
				var m = authors[i].innerText.match(/([^\s]+)\s([^\s].*$)/);

				item.creators.push({

					firstName : m[2],
					lastName : m[1],
					type : "author"

				}); //ZU.cleanAuthor(authors[0],"author");
			}
			//Zotero.debug(item.creators);

			var abst = ZU.xpath(doc,'//div[@id="articleBody"]/'
				+ 'child::div[@class="bpbox"]/div[@class="bpbox_text"]//p');
			//Zotero.debug(abst.length);
			if (abst.length > 0) {
				var abstNote = "";

				for (var i = 0; i < abst.length; i++) {
					abstNote = abstNote + abst[i].innerText + "\n";
				}
				item.abstractNote = abstNote;
			}
			Zotero.debug(item.abstractNote);

			// date
	   		var pubdate = ZU.xpath(doc,'//div[@id="topIcons"]/p[@class="date"]');

	   		var m = pubdate[0].innerHTML.match(/(^\d{4}).(\d{1,2}).(\d{1,2})./);

	   		var year = m[1];
	   		var month = m[2];
	   		var day = m[3];
			item.date = year + "." + month + "." + day;
	   		Zotero.debug(item.date);

			item.publicationTitle = "日経ビジネスオンライン";
			item.libraryCatalog = "日経ビジネスオンライン";
			item.url = url;

			// attachments
			var linkurl = url.replace(/\/\?.*$/,"") + "/?ST=print";
			Zotero.debug(linkurl);

			item.attachments = [{
				url: linkurl,
				title: "Snapshot",
				mimeType: "text/html",
				snapshot: true
			}];

			item.language = "jpn";

			item.complete();
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/092900004/?P=1",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "音声AIで音楽産業は生まれ変わる - アマゾンが投入したアレクサとエコー、その破壊力",
				"creators": [
					{
						"firstName": "匡",
						"lastName": "篠原",
						"type": "author"
					},
					{
						"firstName": "光",
						"lastName": "長野",
						"type": "author"
					}
				],
				"date": "2017.10.4",
				"abstractNote": "米アマゾン・ドット・コムは昨年10月、数千万曲の音楽ストリーミングが可能な「Amazon Music Unlimited」の提供を始めた。それまでもアマゾンプライムの会員向けに200万曲を超える音楽を無料で提供していたが、月額7.99ドルで曲数の上限を取り払った。\n　音楽配信ビジネスはスウェーデンのスポティファイやアップル、グーグルがしのぎを削る激戦区。だが、アマゾンには音楽配信ビジネスのゲームを変える秘策があった。アマゾン・ミュージックのバイスプレジデント、スティーブ・ブーム氏が語る秘策とは。（ニューヨーク支局 篠原匡、長野光）",
				"extra": "アマゾン ベゾスに見える未来",
				"language": "jpn",
				"libraryCatalog": "日経ビジネスオンライン",
				"publicationTitle": "日経ビジネスオンライン",
				"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/092900004/?P=1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/092900004/?P=2",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "音声AIで音楽産業は生まれ変わる - アマゾンが投入したアレクサとエコー、その破壊力",
				"creators": [
					{
						"firstName": "匡",
						"lastName": "篠原",
						"type": "author"
					},
					{
						"firstName": "光",
						"lastName": "長野",
						"type": "author"
					}
				],
				"date": "2017.10.4",
				"abstractNote": "米アマゾン・ドット・コムは昨年10月、数千万曲の音楽ストリーミングが可能な「Amazon Music Unlimited」の提供を始めた。それまでもアマゾンプライムの会員向けに200万曲を超える音楽を無料で提供していたが、月額7.99ドルで曲数の上限を取り払った。\n　音楽配信ビジネスはスウェーデンのスポティファイやアップル、グーグルがしのぎを削る激戦区。だが、アマゾンには音楽配信ビジネスのゲームを変える秘策があった。アマゾン・ミュージックのバイスプレジデント、スティーブ・ブーム氏が語る秘策とは。（ニューヨーク支局 篠原匡、長野光）",
				"extra": "アマゾン ベゾスに見える未来",
				"language": "jpn",
				"libraryCatalog": "日経ビジネスオンライン",
				"publicationTitle": "日経ビジネスオンライン",
				"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/092900004/?P=2",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/092900004/?ST=print",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "音声AIで音楽産業は生まれ変わる - アマゾンが投入したアレクサとエコー、その破壊力",
				"creators": [
					{
						"firstName": "匡",
						"lastName": "篠原",
						"type": "author"
					},
					{
						"firstName": "光",
						"lastName": "長野",
						"type": "author"
					}
				],
				"date": "2017.10.4",
				"extra": "アマゾン ベゾスに見える未来",
				"language": "jpn",
				"libraryCatalog": "日経ビジネスオンライン",
				"publicationTitle": "日経ビジネスオンライン",
				"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/092900004/?P=1",
				"attachments": [
					{
						"doc": {},
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "http://business.nikkeibp.co.jp/article/topics/20060929/110879/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://business.nikkeibp.co.jp/article/topics/20060929/110879/?TOC=2",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://business.nikkeibp.co.jp/atcl/report/16/092700167/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://business.nikkeibp.co.jp/special/kachoj/?i_cid=nbpnbo_kj",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://business.nikkeibp.co.jp/ict/",
		"items": "multiple"
	}
]
/** END TEST CASES **/