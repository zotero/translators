{
	"translatorID": "a75e0594-a9e8-466e-9ce8-c10560ea59fd",
	"label": "Columbia University Press",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.cup\\.columbia\\.edu/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-03 11:25:29"
}

function detectWeb(doc, url) {
	if (url.match(/book\//)) {
		return "book";
	} else if (doc.evaluate('//p[@class="header"]/a/span[@class="_booktitle"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

function addTag(item, tag, xpath) {
	item[tag] = Zotero.Utilities.trimInternal(doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
}

function doWeb(doc, url) {


	var books = new Array();

	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//p[@class="header"]/a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
			Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				books.push(i);
			}
			Zotero.Utilities.processDocuments(books, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();	
		});
	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("book");
	item.title = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//h1[@id="_booktitle"]'));
	var authors = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//p[@id="_authors"]'));
	//we parse the author string - first assign roles and then split multiple authors in those groups.
	var auts = authors.split(/;/);
	for each(var aut in auts) {
		if (aut.match(/Edited/)) {
			var autType = "editor";
			aut = aut.replace(/Edited (by)?/, "");
		} else if (aut.match(/Translated/)) {
			var autType = "translator";
			aut = aut.replace(/Translated (by)?/, "");
		} else {
			var autType = "author";
		}
		aut = aut.split(/\band\b|,/);
		for each(var aut2 in aut) {
			item.creators.push(Zotero.Utilities.cleanAuthor(aut2, autType));
		}
	}
	item.abstractNote = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//p[@id="_desc"]'));
	item.date = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//span[@id="_publishDate"]'));
	item.ISBN = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//span[@id="_isbn"]'));
	//if there is no publisher field, assume it's published by CUP
	var publisher = ZU.xpathText(doc, '//span[@id="_publisher"]');	
	if (publisher) item.publisher = Zotero.Utilities.trimInternal(publisher);
	else item.publisher = "Columbia University Press"
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.cup.columbia.edu/search?q=islam&go.x=0&go.y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.cup.columbia.edu/book/978-0-231-70178-5/political-islam-observed",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Frédéric",
						"lastName": "Volpi",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Political Islam Observed",
				"abstractNote": "Frédéric Volpi compares the academic disciplines that \"observe\" contemporary political Islam to the actual individuals and communities that are being observed by them. Zeroing in on the social sciences and their distinct approach to \"Islamic\" subject matter, Volpi shows how disciplines analyze political Islam according to their own dominant paradigms. Even with the incorporation of specialist viewpoints, the interdisciplinary drive often results in nothing more than educated guesses geared toward political and public consumption. Volpi argues that the competition between these paradigms obscures the actual dynamics and cohesiveness of political Islam. He identifies the strengths and weaknesses of disciplinary approaches toward the Islamist phenomenon and takes the first step in developing an account based on post-orientalism, international relations, the sociology of religion, and studies in democratization, multiculturalism, security analysis, and globalization.Political Islam Observed",
				"date": "September, 2010",
				"ISBN": "978-0-231-70178-5",
				"publisher": "Columbia University Press",
				"libraryCatalog": "Columbia University Press"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.cup.columbia.edu/book/978-0-7486-3967-0/islam",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Abdelmadjid",
						"lastName": "Charfi",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Bond",
						"creatorType": "translator"
					},
					{
						"firstName": "Abdou",
						"lastName": "Filali-Ansary",
						"creatorType": "editor"
					},
					{
						"firstName": "Sikeena Karmali",
						"lastName": "Ahmad",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Islam: Between Message and History",
				"abstractNote": "Abdelmadjid Charfi recovers what he believes to be the essential message of Islam and pairs it with a history of the Prophet Muhammad, a visionary seeking to change the ideals, attitudes, and behaviors of the society in which he lived. The message and its history are delineated as two separate things, conflated by tradition. Charfi's reflections cross those horizons where few Muslim scholars have dared until now to tread. He confronts with great lucidity those difficult questions with which Muslims are struggling, attempting to reconsider them from a moral and political perspective that remains independent of traditional frameworks.",
				"date": "June, 2010",
				"ISBN": "978-0-7486-3967-0",
				"publisher": "Edinburgh University Press",
				"libraryCatalog": "Columbia University Press",
				"shortTitle": "Islam"
			}
		]
	}
]
/** END TEST CASES **/