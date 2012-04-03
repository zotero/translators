{
	"translatorID": "4363275e-5cc5-4627-9a7f-951fb58a02c3",
	"label": "Cornell University Press",
	"creator": "Michael Berkowitz",
	"target": "http://www.cornellpress.cornell.edu/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-04-02 23:17:05"
}

function detectWeb(doc, url) {
	if (url.match("/book/")) {
		return "book";
	} else if (url.match("list.taf") || url.match("listsearch.taf")) {
		return "multiple";
	}
}

function doWeb(doc, url) {
	var books = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//tr/td[2]/a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			if (title.textContent.match(/\w+/)) items[title.href] = Zotero.Utilities.trimInternal(title.textContent);
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			books.push(i);
		}
	} else {
		scrape(doc, url);
	}
}

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("book");	
	var dataTags = new Object();
	var fields = ZU.xpath(doc, '//table[@id="detailsTable"]/tbody/tr/td[1]');
	var titles = ZU.xpath(doc, '//table[@id="detailsTable"]/tbody/tr/td[2]');
	
	for (var i in fields) {
		var field = fields[i].textContent.trim();
		dataTags[field] = titles[i].textContent;
		if (field == "Author"){
			newItem.creators.push(ZU.cleanAuthor(dataTags["Author"], "author"));
		}
		if (field == "Subtitle"){
			var fulltitle = dataTags["Title"] + ": " + dataTags["Subtitle"];
			newItem.title = fulltitle;
		}
		else newItem.title = newItem.title;
		if (field == "BISAC"){
			var tags = ZU.xpath(titles[i], './div');
			for (var j in tags){
				newItem.tags[j] = tags[j].textContent.replace(/.+\//, "").trim();
			}
		}
		
		
	}
	associateData (newItem, dataTags, "ISBN-13", "ISBN");
	associateData (newItem, dataTags, "Publication Date", "date");
	associateData (newItem, dataTags, "Language:", "language");
	associateData (newItem, dataTags, "Nb of pages", "numPages");
	newItem.publisher = "Cornell University Press";
	newItem.place= "Ithaca, NY";
	newItem.abstractNote = ZU.xpathText(doc, '//div[@id="bookpagedescription"]');
	newItem.complete();
	}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.cornellpress.cornell.edu/book/?GCOI=80140100486370",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jenny",
						"lastName": "Edkins",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"History & Theory",
					"Human Rights",
					"Demography"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Missing: Persons and Politics",
				"ISBN": "978-0-8014-5029-7",
				"date": "September 2011",
				"numPages": "280",
				"publisher": "Cornell University Press",
				"place": "Ithaca, NY",
				"abstractNote": "Stories of the missing offer profound insights into the tension between how political systems see us and how we see each other. The search for people who go missing as a result of war, political violence, genocide, or natural disaster reveals how forms of governance that objectify the person are challenged. Contemporary political systems treat persons instrumentally, as objects to be administered rather than as singular beings: the apparatus of government recognizes categories, not people. In contrast, relatives of the missing demand that authorities focus on a particular person: families and friends are looking for someone who to them is unique and irreplaceable.  In Missing, Jenny Edkins highlights stories from a range of circumstances that shed light on this critical tension: the aftermath of World War II, when millions in Europe were displaced; the period following the fall of the World Trade Center towers in Manhattan in 2001 and the bombings in London in 2005; searches for military personnel missing in action; the thousands of political \"disappearances\" in Latin America; and in more quotidian circumstances where people walk out on their families and disappear of their own volition. When someone goes missing we often find that we didn't know them as well as we thought: there is a sense in which we are \"missing\" even to our nearest and dearest and even when we are present, not absent. In this thought-provoking book, Edkins investigates what this more profound \"missingness\" might mean in political terms.",
				"libraryCatalog": "Cornell University Press",
				"shortTitle": "Missing"
			}
		]
	}
]
/** END TEST CASES **/