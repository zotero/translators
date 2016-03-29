{
	"translatorID": "54ac4ec1-9d07-45d3-9d96-48bed3411fb6",
	"label": "National Library of Australia (new catalog)",
	"creator": "Mark Triggs, Steve McPhillips and Matt Burton",
	"target": "^https?://catalogue\\.nla\\.gov\\.au",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-03-14 15:46:49"
}

function detectWeb(doc, url) {
	if (url.match("/Record/[0-9]+")) {
		var format = doc.getElementById("myformat").textContent;
		return computeFormat(format);
		
	} else if (url.match ("/Search/Home") && doc.getElementById ("resultItemLine1")) {
		return "multiple";
	}
}

// map the nla formats to zotero formats
function computeFormat(format){
	// clean up whitespace and remove commas from items with multiple formats
	format = Zotero.Utilities.trimInternal(format.replace(',', ''));

	if (format == "Audio") {
		return "audioRecording";
	}
	else if (format == "Book") {
		return "book";
	}
	else if (format == "Journal/Newspaper") {
		return "journalArticle";
	}
	else if (format == "Manuscript") {
		return "manuscript";
	}
	else if (format == "Map") {
		return "map";
	}
	else if (format == "Music") {
		return "audioRecording";
	}
	else if (format == "Online") {
		return "webpage";
	}
	else if (format == "Picture") {
		return "artwork";
	}
	else if (format == "Video") {
		return "videoRecording";
	}
	else {
		return "book";
	}

}

function load_item(responseText, url, format) {
	var metadata = JSON.parse(Zotero.Utilities.trimInternal(responseText));
	var bibid = url.match("^.*\/Record/([0-9]+)")[1];
	var newItem = new Zotero.Item(format[bibid]);

	/* load in our authors */
	if (metadata.authors) {
		for (var i=0; i< metadata.authors.length ; i++) {
			newItem.creators.push(Zotero.Utilities.cleanAuthor
								  (metadata.authors[i], "author", true));
		}
	}

	/* and our tags */
	if (metadata.tags) {
		for (var i=0; i< metadata.tags.length ; i++) {
			newItem.tags.push(metadata.tags[i]);
		}
	}
	
	/* and our summary */
	if (metadata.notes) {
		newItem.notes.push ({"note": metadata.notes});
	}

	/* and everything else */
	for (var attr in metadata) {
		if (!newItem[attr]) {
			newItem[attr] = metadata[attr];
		}
	}
	newItem.repository = "National Library of Australia";
	newItem.complete();
}

function doWeb(doc, url) {
	var format = detectWeb(doc, url);
	var items = {};
	// does javascript have an easy way to test if object has properties?
	var itemsHasProperties = false;
	if (format == "multiple") {
		for (var url in Zotero.selectItems((Zotero.Utilities.getItemArray
											(doc, doc, "/Record/[0-9]+")))) {
			var bibid = url.match("^.*\/Record/([0-9]+)")[1];
			// grab the item type for that bibid so we don't have to make a processDocuments call for each
			var xpath = "//div[contains(./div/a/@href, '"+bibid+"')]/div[@class = 'resultItemLine3']/span/text()";
			var nlaFormat = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			// populate an associative array with bibid -> format for the doGet
			items[bibid] = computeFormat(nlaFormat);
			itemsHasProperties = true; // items has stuff
		}
	} else {
		var bibid = url.match("^.*\/Record/([0-9]+)")[1];
		items[bibid] = format;
		itemsHasProperties = true; // items has stuff
	}
	// only continue if there are items to create
	if (itemsHasProperties) {
		var urls = [];
		for (var bibid in items) {
			urls.push("http://catalogue.nla.gov.au/Record/" + bibid + "/Export?style=zotero");
		}
		// the bibid->format associative array prevents the need for a doGet nested in processDocs
		Zotero.Utilities.HTTP.doGet(urls, 
			function(text, obj, url) { load_item(text, url, items);},
			function(){ Zotero.done();});
		Zotero.wait();
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://catalogue.nla.gov.au/Record/773336?lookfor=labor&offset=10&max=65985",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Richard Allen",
						"lastName": "Lester",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Working class",
					"United States.",
					"Labor unions"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Labor : readings on major issues / [edited by] Richard A. Lester",
				"publisher": "Random House",
				"callNumber": "331.082 L642",
				"place": "New York",
				"date": "New York : Random House, [1967]",
				"authors": "Lester, Richard Allen, 1908-",
				"extra": "Bibliographical footnotes.",
				"libraryCatalog": "National Library of Australia",
				"shortTitle": "Labor"
			}
		]
	},
	{
		"type": "web",
		"url": "http://catalogue.nla.gov.au/Search/Home?lookfor=labor&type=all&limit%5B%5D=&submit=Find&filter[]=language:%22eng%22",
		"items": "multiple"
	}
]
/** END TEST CASES **/