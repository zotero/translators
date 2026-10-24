{
	"translatorID": "3a63f21e-7e20-4225-9d74-858b0512f16d",
	"label": "Bibliotheek.be",
	"creator": "Nyo Dekens",
	"target": "^https?:\\/\\/([^\\/]+\\.)?bibliotheek\\.be\\/(?:[a-z]{2}\\/)?(?:krantenarchief|newspaper-archive)\\/(?:artikel|article)\\/[a-f0-9-]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-24 11:15:00"
}

function detectWeb(doc, url) {
	if (doc.querySelector('.newspaper-article--title, .block-newspaper-article-detail')) {
		return "newspaperArticle";
	}
	return false;
}

function doWeb(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	item.url = url;

	var titleElem = doc.querySelector('.newspaper-article--title');
	if (titleElem) {
		item.title = ZU.trimInternal(titleElem.textContent);
	} else if (doc.title) {
		item.title = ZU.trimInternal(doc.title);
	}

	var publisherElem = doc.querySelector('.newspaper-article--publisher');
	if (publisherElem) {
		item.publicationTitle = ZU.trimInternal(publisherElem.textContent);
	}

	var dateElem = doc.querySelector('.newspaper-article--publication-date');
	if (dateElem) {
		var datetime = dateElem.getAttribute('datetime');
		if (datetime) {
			item.date = datetime.split('T')[0];
		} else {
			item.date = ZU.trimInternal(dateElem.textContent);
		}
	}

	var authorLinks = doc.querySelectorAll('.newspaper-article--author a');
	if (authorLinks && authorLinks.length > 0) {
		for (var i = 0; i < authorLinks.length; i++) {
			var name = ZU.trimInternal(authorLinks[i].textContent);
			if (name) {
				item.creators.push(ZU.cleanAuthor(name, "author"));
			}
		}
	} else {
		var authorElem = doc.querySelector('.newspaper-article--author');
		if (authorElem) {
			var rawAuthor = authorElem.textContent.replace(/^[\s\-–—]+/, '').trim();
			if (rawAuthor) {
				item.creators.push(ZU.cleanAuthor(rawAuthor, "author"));
			}
		}
	}

	var pageElem = doc.querySelector('.newspaper-article--page-number');
	if (pageElem) {
		var pageText = ZU.trimInternal(pageElem.textContent)
			.replace(/^[\s\-–—]+/, '')
			.replace(/^pagina\s*/i, '')
			.trim();
		if (pageText) {
			item.pages = pageText;
		}
	}

	if (doc.documentElement && doc.documentElement.lang) {
		item.language = doc.documentElement.lang;
	}

	item.libraryCatalog = "Bibliotheek.be";

	item.attachments.push({
		document: doc,
		title: "Snapshot"
	});

	item.complete();
}

var testCases = [
	{
		"type": "web",
		"url": "https://bibliotheek.be/krantenarchief/artikel/bb668841-b499-4775-8da4-8ea8deb44b11",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Speelteater broedt op eieren in de klas 'Vaders en eieren' is een onderhoudend toneelstukje over pinguïns",
				"creators": [
					{
						"firstName": "Steven",
						"lastName": "Heene",
						"creatorType": "author"
					}
				],
				"date": "1999-06-09",
				"language": "nl",
				"libraryCatalog": "Bibliotheek.be",
				"pages": "18",
				"publicationTitle": "De Morgen",
				"url": "https://bibliotheek.be/krantenarchief/artikel/bb668841-b499-4775-8da4-8ea8deb44b11"
			}
		]
	}
]
/** END TEST CASES **/
