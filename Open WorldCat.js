{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith, Sebastian Karcher, and Aurimas Vinckevicius",
	"target": "^https?://(.+).worldcat\\.org/",
	"minVersion": "3.0.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-11-21 04:49:43"
}

/**
 * Gets Zotero item from a WorldCat icon src
 */
function getZoteroType(iconSrc) {
	// only specify types not specified in COinS
	if (iconSrc.indexOf("icon-rec") != -1) {
		return "audioRecording";
	}
	if (iconSrc.indexOf("icon-com") != -1) {
		return "computerProgram";
	}
	if (iconSrc.indexOf("icon-map") != -1) {
		return "map";
	}
	return false;
}

/**
 * Generates a Zotero item from a single item WorldCat page,
 * or the first item on a multiple item page
 */
function generateItem(doc, co) {
	var item = new Zotero.Item();
	ZU.parseContextObject(co, item);
	// if only one, first check for special types (audio & video recording)
	var type = ZU.xpathText(doc,
		'//img[@class="icn"][contains(@src, "icon-")][1]/@src');
	if (type) {
		type = getZoteroType(type);
		if (type) item.itemType = type;
	}

	return item;
}

function getSearchResults(doc) {
	return ZU.xpath(doc, '//div[@class="name"]/a');
}

function getFirstContextObj(doc) {
	return ZU.xpathText(doc, '//span[@class="Z3988"][1]/@title');
}

function detectWeb(doc, url) {
	var results = getSearchResults(doc);

	//single result
	if(results.length > 1) {
		return "multiple";
	}

	var co = getFirstContextObj(doc);
	if(!co) return false;

	// generate item and return type
	return generateItem(doc, co).itemType;
}

/**
 * Given an item URL, extract Open WorldCat ID
 */
function extractWCID(url) {
	var id = url.match(/\d+(?=[&?]|$)/);
	if(!id) return false;
	return id[0];
}

/**
 * RIS Scraper Function
 */
function scrape(wcID) {
	var risURL = "http://www.worldcat.org/oclc/" + wcID
		+ "?page=endnote&client=worldcat.org-detailed_record";

	ZU.HTTP.doGet(risURL, function(text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");

		//ebooks are supplied as TY - ELEC, change it to BOOK
		text = text.replace(/^TY\s\s?-\sELEC\s*$/m, 'TY  - BOOK');

		//some items don't have a TY field at all. We'll treat them as books
		if(text.search(/^TY  -/m) == -1) text = 'TY  - BOOK\n' + text;

		translator.setString(text);

		translator.setHandler("itemDone", function (obj, item) {
			if(item.libraryCatalog == "http://worldcat.org") {
				item.libraryCatalog = "Open WorldCat";
			}

			item.archive = undefined;

			//creators have period after firstName
			for (i in item.creators) {
				if (item.creators[i].firstName){
					item.creators[i].firstName =
						item.creators[i].firstName.trim().replace(/\.$/, "");
				} else {
					item.creators[i].lastName =
						item.creators[i].lastName.trim().replace(/\.$/, "");
					item.creators[i].fieldMode=1;			
				}
			}

			item.complete();
		});

		translator.translate();
	});
}

function doWeb(doc, url) {
	var results = getSearchResults(doc);
	if(results.length > 1) {
		var items = {};
		for(var i=0, n=results.length; i<n; i++) {
			items[extractWCID(results[i].href)] = results[i].textContent;
		}

		Zotero.selectItems(items, function(items) {
			if (!items) return true;

			var articles = [];
			for (var i in items) {
				scrape(i);
			}
		});
	} else {
		var wcID;
		//could be a single result on a search results page
		if(results.length == 1) {
			wcID = extractWCID(results[0].href);
		} else {	//single item page
			wcID = extractWCID(url);
		}

		scrape(wcID);
	}
}

function detectSearch(item) {
	if(item.ISBN && typeof(item.ISBN) == 'string') {
		return !!ZU.cleanISBN(item.ISBN);
	} else {
		return false;
	}
}

function doSearch(item) {
	var ISBN = ZU.cleanISBN(item.ISBN);
	if(!ISBN) return;

	var url = "http://www.worldcat.org/search?qt=results_page&q=bn%3A"
		+ ISBN;
	ZU.processDocuments(url, function (doc, url) {
		//we take the first search result and run scrape on it
		var results = getSearchResults(doc);
		if (results.length > 0) {
			scrape(extractWCID(results[0].href));
		}
	});
} /** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/argentina/oclc/489605&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Whitaker",
						"firstName": "Arthur Preston",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "Argentina",
				"publisher": "Prentice-Hall",
				"place": "Englewood Cliffs, N.J.",
				"date": "1964"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/dynamic-systems-approach-to-the-development-of-cognition-and-action/oclc/42854423&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Thelen",
						"firstName": "Esther",
						"creatorType": "author"
					},
					{
						"lastName": "Smith",
						"firstName": "Linda B",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
				"title": "A dynamic systems approach to the development of cognition and action",
				"publisher": "MIT Press",
				"place": "Cambridge, Mass.",
				"date": "1996",
				"ISBN": "0585030154  9780585030159",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://melvyl.worldcat.org/title/cambridge-companion-to-adam-smith/oclc/60321422&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Haakonssen",
						"firstName": "Knud",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "The Cambridge companion to Adam Smith",
				"publisher": "Cambridge University Press",
				"place": "Cambridge; New York",
				"date": "2006",
				"ISBN": "0521770599 0521779243  9780521770590 9780521779241",
				"abstractNote": "\"Adam Smith is best known as the founder of scientific economics and as an early proponent of the modern market economy. Political economy, however, was only one part of Smith's comprehensive intellectual system. Consisting of a theory of mind and its functions in language, arts, science, and social intercourse, Smith's system was a towering contribution to the Scottish Enlightenment. His ideas on social intercourse, in fact, also served as the basis for a moral theory that provided both historical and theoretical accounts of law, politics, and economics. This companion volume provides an up-to-date examination of all aspects of Smith's thought. Collectively, the essays take into account Smith's multiple contexts - Scottish, British, European, Atlantic, biographical, institutional, political, philosophical - and they draw on all his works, including student notes from his lectures. Pluralistic in approach, the volume provides a contextualist history of Smith, as well as direct philosophical engagement with his ideas.\"--Jacket."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/cahokia-mounds-replicas/oclc/48394842&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Grimont",
						"firstName": "Martha LeeAnn",
						"creatorType": "author"
					},
					{
						"lastName": "Mink",
						"firstName": "Claudia Gellman",
						"creatorType": "author"
					},
					{
						"lastName": "Cahokia Mounds Museum Society",
						"firstName": "",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "[Cahokia Mounds replicas]",
				"publisher": "Cahokia Mounds Museum Society]",
				"place": "Collinsville, Ill.",
				"date": "2000",
				"ISBN": "1881563022  9781881563020"
			}
		]
	}
]
/** END TEST CASES **/