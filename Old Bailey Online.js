{
	"translatorID": "b10bf941-12e9-4188-be04-f6357fa594a0",
	"label": "Old Bailey Online",
	"creator": "Adam Crymble",
	"target": "^http://www\\.oldbaileyonline\\.org/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-10 15:31:35"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("search")) {
		return "multiple";
	} else if (doc.location.href.match("browse")) {
		return "case";
	}
}

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var tagsContent = new Array();
	var fieldTitle;
	
	var newItem = new Zotero.Item("case");

	var headers = doc.evaluate('//div[@class="apparatus"]/b', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var contents = doc.evaluate('//div[@class="apparatus"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	var xPathCount = doc.evaluate('count (//div[@class="apparatus"]/b)', doc, nsResolver, XPathResult.ANY_TYPE, null);
	
	var headersArray = new Array();
	var oneHeader = '';

	if (xPathCount.numberValue > 1) {
		for (var i = 0; i < xPathCount.numberValue; i++) {
			fieldTitle = headers.iterateNext().textContent;
			headersArray.push(fieldTitle);
		}
	} else {
		oneHeader = (headers.iterateNext().textContent);
	}
	
	var contentsArray = new Array();
	var j = 0;
	
	if (oneHeader.length<1) {
	
		for (var i = headersArray.length-1; i> -1; i--) {	 	
		
			var fieldIndex = contents.indexOf(headersArray[i]);
			
			contentsArray.push(contents.substr(fieldIndex));
			contents = contents.substr(0, fieldIndex);
			fieldTitle = headersArray[i].replace(/\s+/g, '');
			
			if (fieldTitle != "ReferenceNumber:") {
				tagsContent.push(contentsArray[j]);
			} else {
				refNum = contentsArray[j];
				newItem.extra = refNum;
			}
			j++;
		}
	} else {

		if (oneHeader.match("Reference")) {
			newItem.extra = contents;
		} else {
			newItem.tags = contents;
			var noMoreTags = 1;
		}
	}
		
	if (noMoreTags != 1) {
		for (var i = 0; i < tagsContent.length; i++) {
		 		newItem.tags[i] = tagsContent[i];
	 		}
	}
	
	newItem.title = doc.evaluate('//div[@class="sessionsPaperTitle"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;	
	newItem.url = doc.location.href;

	newItem.complete();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var articles = new Array();
	var onlyResultSet = false;
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		
		var titles = doc.evaluate('//li/p[@class="srchtitle"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}
		// add option to save search URL as single item
		items["resultSet"] = "Save search URL as item";

		items = Zotero.selectItems(items);
		
		for (var i in items) {
			articles.push(i);
		}
		// if option to save result set is selected
		if (items["resultSet"]) {
			if (articles.length == 1) {
				onlyResultSet = true;
			}
			var newItem = new Zotero.Item("case");
			
			newItem.title = 'Old Bailey Search Result Set';
			
			var searchURL = doc.location.href;
			newItem.url = searchURL;
	
			// define dictionary for easier reading
			var defs = {
			"_divs_fulltext": "Keywords",
			"_persNames_surname": "Surname",
			"_persNames_given": "Given name",
			"_persNames_alias": "Alias",
			"_offences_offenceCategory_offenceSubcategory": "Offence",
			"_verdicts_verdictCategory_verdictSubcategory": "Verdicts",
			"_punishments_punishmentCategory_punishmentSubcategory": "Punishment",
			"_divs_div0Type_div1Type": "Corpus",
			"fromMonth": "From month",
			"fromYear": "From year",
			"toMonth": "To month",
			"toYear": "To year"
			};
	
			// parse URL into human-readable elements
			var noteText = '<b>Search Parameters</b><br/>';
			var re  = /(?:\?|&(?:amp;)?)([^=]+)=?([^&]*)?/g;
			var match;
			var key='';
			while (match = re.exec(searchURL)) {
				if (defs[match[1]] != null) {
					key = defs[match[1]];
					noteText += key + ": " + unescape(match[2]) + "<br/>";
				}
			}
			
			// save them in the notes field
			newItem.notes.push({note: noteText});
			newItem.complete();
			
			// remove dummy url for result set from articles list 
			articles.pop();
		}
	}
	else if (doc.evaluate('//div[@id="main2"]/p/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {

		var xmlOrText = doc.evaluate('//div[@id="main2"]/p/a', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	
		if (xmlOrText.textContent.match("Text")) {
			articles = [xmlOrText.href];	
		} 
		else {
			articles = [url];
		}
	}
		
	if (!onlyResultSet) {
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();	
	}	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.oldbaileyonline.org/browse.jsp?id=t16780828-12&div=t16780828-12&terms=hog#highlight",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [
					"Verdict: Guilty",
					"Offence: Theft > animal theft"
				],
				"seeAlso": [],
				"attachments": [],
				"extra": "Reference Number: t16780828-12",
				"title": "Theft > animal theft, 28th August 1678.",
				"url": "http://www.oldbaileyonline.org/browse.jsp?id=t16780828-12&div=t16780828-12&terms=hog#highlight",
				"libraryCatalog": "Old Bailey Online",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.oldbaileyonline.org/search.jsp?form=custom&_divs_fulltext=animal&kwparse=and&_persNames_surname=&_persNames_given=&_persNames_alias=&_persNames_gender=&fromAge=&toAge=&_occupations_value=&_persNames_home=&_offences_offenceCategory_offenceSubcategory=&_offences_offenceDescription=&_verdicts_verdictCategory_verdictSubcategory=&_punishments_punishmentCategory_punishmentSubcategory=&_punishments_punishmentDescription=&_crimeDates_value=&_offences_crimeLocation=&_divs_div0Type_div1Type=&fromMonth=&fromYear=&toMonth=&toYear=&ref=&submit.x=0&submit.y=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/