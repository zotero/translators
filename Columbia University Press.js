{
	"translatorID": "a75e0594-a9e8-466e-9ce8-c10560ea59fd",
	"label": "Columbia University Press",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www\\.)?cup\\.columbia\\.edu/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-05 23:03:04"
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
	},
	{
		"type": "web",
		"url": "http://www.cup.columbia.edu/book/978-0-7486-3978-6/islam-and-the-foundations-of-political-power",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Ali",
						"lastName": "Abdelraziq",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Islam and the Foundations of Political Power",
				"abstractNote": "The publication of this essay in Egypt in 1925 took the contemporaries of 'Ali 'Abd al-Raziq by storm. It was the focus of much attention and the seed of a heated debate. At a time when the Muslim world was in great turmoil over the question of the abolition of the caliphate by Mustapha Kamal Ataturk in Turkey, Abdelraziq, a religious cleric trained at Al-Azhar University, argued in favour of secularism. The abolition of the caliphate had re-ignited the issue of Islam and politics, as traditional political systems were dissolving under pressure from European powers while most Muslim countries had lost their sovereignty. This essay gave rise to a series of 'refutations' of which three were published the same year. It also unleashed the Arab world's first great public debate with polemics supporting or refuting Abdelraziq's ideas published all over the press. Eventually he was tried by the Al-Azhar court, denounced, stripped of his title of 'alim and barred from future employment in education and the judiciary.",
				"date": "August, 2012",
				"ISBN": "978-0-7486-3978-6",
				"publisher": "Edinburgh University Press",
				"libraryCatalog": "Columbia University Press"
			}
		]
	}
]
/** END TEST CASES **/