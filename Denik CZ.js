function detectWeb(doc, url) {
		return "newspaperArticle";
}

function doWeb(doc, url) {
	var arts = new Array();
	scrape(doc);
}

function scrape(doc) {
	var newArticle = new Zotero.Item('newspaperArticle');
	newArticle.url = doc.location.href;
	newArticle.title = ZU.trimInternal(ZU.xpathText(doc, '//div[@class = "dv3-clanek-left-fix"]/h1')).replace(/^,/, "");
	var date = ZU.xpathText(doc, '(//div[@class="dv3-clanek-datum"])');
	var matched = ZU.trimInternal(date).match(/dnes/)
	if (matched) {
		var actualDate = new Date();
		var actualDateStr = '';
		actualDateStr = actualDate.getUTCFullYear() + '-' +
    	('00' + (actualDate.getUTCMonth()+1)).slice(-2) + '-' +
    	('00' + actualDate.getUTCDate()).slice(-2);
    	date = actualDateStr;
	} else {
		var parts = ZU.trimInternal(date).split('.');
		
		var actualDate = new Date(parts[2],parts[1]-1, parts[0]);
		var actualDateStr = '';
		actualDateStr = actualDate.getUTCFullYear() + '-' +
    	('00' + (actualDate.getUTCMonth()+1)).slice(-2) + '-' +
    	('00' + actualDate.getDate()).slice(-2);
	}
	//Zotero.debug(ZU.trimInternal(date).match('16'));
	if (actualDateStr) newArticle.date = actualDateStr;
	var teaser = ZU.xpathText(doc, '//p[@class="dv3-clanek-perex"]');
	if (teaser != null) {
		newArticle.abstractNote = Zotero.Utilities.trimInternal(teaser).replace(/^,\s*/, "");
	}

	//some authors are in /a, some aren't we need to distinguish to get this right
	if (ZU.xpathText(doc, '//p[@class = "clanek-autor"]/a') != null) {
		var xpath = '//p[@class = "clanek-autor"]/a';
	} else {
		var xpath = '//p[@class = "clanek-autor"]';
	};
	
	var authors = ZU.xpath(doc, xpath);
	
		for (i in authors) {
			newArticle.creators.push(Zotero.Utilities.cleanAuthor(authors[i].textContent, "author"));
		}
		
	var titleOfDenik = ZU.xpathText(doc, '//a[@class = "dv3-hlavicka-logo"]/span');
	titleOfDenik = titleOfDenik.charAt(0).toUpperCase() + titleOfDenik.slice(1).toLowerCase()
	completedTitleOfDenik = titleOfDenik + " deník"
	Zotero.debug(completedTitleOfDenik);
	
	
	newArticle.publicationTitle = completedTitleOfDenik;
	newArticle.accessDate = "CURRENT_TIMESTAMP";
	
	newArticle.attachments.push({
		title: completedTitleOfDenik + " snapshot",
		mimeType: "text/html",
		url: doc.location.href,
		snapshot: true
	});

	newArticle.complete();
}

/* There is no built-in function to count object properties which often are used as associative arrays.*/


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "newspaperArticle",
		"url": "http://trebicsky.denik.cz/kultura_region/jarni-trebicsky-hudebni-salon-se-ponese-v-narozeninovem-duchu-20151216.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Luděk",
						"lastName": "Mahel",
						"creatorType": "author"
					},
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Třebíčský Deník snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"url": "http://trebicsky.denik.cz/kultura_region/jarni-trebicsky-hudebni-salon-se-ponese-v-narozeninovem-duchu-20151216.html",
				"title": "Jarní třebíčský Hudební salon se ponese v narozeninovém duchu",
				"date": "2015-12-16",
				"abstractNote": "Třebíč - Trio Pakostra, písničkářka Radůza, Pavel Žalman Lohonka a Zdeněk Vřešťál. Taková je nabídka nového Hudebního salonu v Třebíči.",
				"publicationTitle": "Třebíčský Deník",
				"libraryCatalog": "Deník",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/