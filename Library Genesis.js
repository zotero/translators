{
	"translatorID": "11614156-f421-4e89-8ce0-a5e69ce3ebed",
	"label": "Library Genesis",
	"creator": "Reverend Wicks Cherrycoke",
	"target": "libgen.io|lib.gen.rus.ec",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsi",
	"lastUpdated": "2016-04-22 22:11:28"
}

var MIME_TYPES = {
  'pdf': 'application/pdf',
  'epub': 'application/epub+zip',
  'mobi': 'application/x-mobipocket-ebook',
  'djvu': 'image/vnd.djvu'
};
var MD5_REGEX = /md5=([0-9a-fA-F]+)/;


function detectWeb(doc, url) {
  if (url.indexOf('book/index.php') != -1) {
	return 'book';
  }
}

function doWeb(doc, url) {
  var md5Hash = MD5_REGEX.exec(url)[1];

  // To save some work, we use the provided bibtex file to retrieve the
  // metadata and use Zotero's built-in bibtex importer
  var bibtexUrl = "http://libgen.io/book/bibtex.php?md5=" + md5Hash;
  ZU.processDocuments(bibtexUrl, function(bibtexDoc) {
	var bibtexStr = bibtexDoc.getElementsByTagName("textarea")[0].value
	var translator = Zotero.loadTranslator('import');
	translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
	translator.setString(bibtexStr);

	translator.setHandler('itemDone', function(obj, item) {
	  // The bibtex messes up multiple authors, so we set them ourselves
	  var authorStr = ZU.xpathText(doc, "//tbody/tr[3]/td[2]/b");
	  if (authorStr.indexOf(';') != -1) {
	  	item.creators = authorStr.split(";").map(function(author) {
	  		// Are we dealing with "last, first" formatting?
	  		var useCommas = (author.indexOf(",") != -1);
	  		return ZU.cleanAuthor(author, "author", useCommas);
	  	});
	  } else {
	  	item.creators = authorStr.split(",").map(function(author) {
			return ZU.cleanAuthor(author, "author", false);
	  	});
	  }

	  // It also messes up multiple ISBNs, so we just pick the first one
	  if (item.ISBN) {
	  	[' ', ','].forEach(function(splitChar) {
			if (item.ISBN.indexOf(splitChar) != -1) {
		  	item.ISBN = item.ISBN.split(splitChar)[0];
			}
	  	});
	  }

	  // Add the full text attachment
	  var extension = ZU.xpathText(doc, "//tbody/tr[11]/td[4]");
	  var downloadUrl = (
		"http://libgen.io/get/" + md5Hash + "/" + md5Hash + "." + extension);
	  item.attachments.push({
		title: "Full Text",
		url: downloadUrl,
		mimeType: MIME_TYPES[extension]});
	  item.complete();
	});
	translator.translate();
  });
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://libgen.io/book/index.php?md5=3F3AE2E1C6293A4550904E2587FF1441",
		"items": [
			{
				"itemType": "book",
				"title": "Gravity's Rainbow, domination, and freedom",
				"creators": [
					{
						"firstName": "Luc",
						"lastName": "Herman",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Weisenburger",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Pynchon",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"ISBN": "9780820335087",
				"itemID": "book:1425220",
				"libraryCatalog": "Library Genesis",
				"publisher": "The University of Georgia Press",
				"url": "http://gen.lib.rus.ec/book/index.php?md5=3f3ae2e1c6293a4550904e2587ff1441",
				"attachments": [
					{
						"title": "Full Text",
						"mimeType": "application/pdf"
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
		"url": "http://libgen.io/book/index.php?md5=8AE55C8664341707B748EADE479C02C1",
		"items": [
			{
				"itemType": "book",
				"title": "Mason & Dixon: A Novel",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Pynchon",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"ISBN": "9780805058376",
				"itemID": "book:536374",
				"libraryCatalog": "Library Genesis",
				"publisher": "Holt Paperbacks",
				"shortTitle": "Mason & Dixon",
				"url": "http://gen.lib.rus.ec/book/index.php?md5=8AE55C8664341707B748EADE479C02C1",
				"attachments": [
					{
						"title": "Full Text",
						"mimeType": "application/epub+zip"
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
		"url": "http://libgen.io/book/index.php?md5=16C402F4F9B737EA33C4EA5D938331A0",
		"items": [
			{
				"itemType": "book",
				"title": "Nineteen Eighty-Four",
				"creators": [
					{
						"firstName": "George",
						"lastName": "Orwell",
						"creatorType": "author"
					},
					{
						"firstName": "Erich",
						"lastName": "Fromm",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Pynchon",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Lagin",
						"creatorType": "author"
					}
				],
				"date": "2003",
				"ISBN": "9780452284234",
				"itemID": "book:266853",
				"libraryCatalog": "Library Genesis",
				"publisher": "Plume",
				"url": "http://gen.lib.rus.ec/book/index.php?md5=16C402F4F9B737EA33C4EA5D938331A0",
				"attachments": [
					{
						"title": "Full Text",
						"mimeType": "application/pdf"
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
		"url": "http://libgen.io/book/index.php?md5=A05BE4942325AEA362E2AFF8C305B0DE",
		"items": [
			{
				"itemType": "book",
				"title": "Deep Learning [pre-pub version]",
				"creators": [
					{
						"firstName": "Ian",
						"lastName": "Goodfellow",
						"creatorType": "author"
					},
					{
						"firstName": "Yoshua",
						"lastName": "Bengio",
						"creatorType": "author"
					},
					{
						"firstName": "Aaron",
						"lastName": "Courville",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"itemID": "book:1491328",
				"libraryCatalog": "Library Genesis",
				"publisher": "MIT Press",
				"url": "http://gen.lib.rus.ec/book/index.php?md5=a05be4942325aea362e2aff8c305b0de",
				"attachments": [
					{
						"title": "Full Text",
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
