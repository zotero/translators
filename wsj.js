{
	"translatorID": "53f8d182-4edc-4eab-b5a1-141698a1303b",
	"label": "Wall Street Journal",
	"creator": "Matt Burton",
	"target": "http://online\\.wsj\\.com/article/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-18 23:59:06"
}

function detectWeb(doc, url){
	return "newspaperArticle";
}

function getDatum(text, key){
	var reg = new RegExp(key+":'(.*?)'(?=,|})");
	return unescape(Zotero.Utilities.unescapeHTML(reg.exec(text)[1].replace("+"," ", "g")));
}

function doWeb(doc, url){
	var text = doc.documentElement.innerHTML;
	var item = new Zotero.Item("newspaperArticle");
	var metadata = text.match(/AT_VARS=({[^}]*})/)[1];
	var authors = getDatum(text, "authors").split(',');
	for each (var aut in authors) {	
		if (aut.length > 0) {	
			item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
		}
	}
	item.publicationTitle = "wsj.com";
	item.date = getDatum(text, "publicationDate");
	item.abstractNote = getDatum(text, "bodyText");
	item.title = getDatum(text, "articleHeadline").replace("\\","");
	item.url = url;
	item.section = getDatum(text, "articleType");
	item.attachments.push({url:url, title:"Wall Street Journal Snapshot", mimeType:"text/html"});
	
	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://online.wsj.com/article/SB10001424052970204517204577046222233016362.html?mod=WSJ_hp_LEFTWhatsNewsCollection",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "John W.",
						"lastName": "Miller",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://online.wsj.com/article/SB10001424052970204517204577046222233016362.html?mod=WSJ_hp_LEFTWhatsNewsCollection",
						"title": "Wall Street Journal Snapshot",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "wsj.com",
				"date": "2011-11-19",
				"abstractNote": "A profile of an Australian miner making $200,000 a year led hundreds of people to ask how they could apply for such a job.",
				"title": "America's Jobless, Yearning for Oz",
				"url": "http://online.wsj.com/article/SB10001424052970204517204577046222233016362.html?mod=WSJ_hp_LEFTWhatsNewsCollection",
				"section": "Careers",
				"libraryCatalog": "Wall Street Journal",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/