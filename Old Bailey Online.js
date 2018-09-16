{
	"translatorID": "d7db89af-33cf-4ab9-8534-82afe10f81aa",
	"label": "Old Bailey Online 201809",
	"creator": "Adam Crymble",
	"target": "^https?://www\\.oldbaileyonline\\.org/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-09-16 14:06:13"
}


// URLs
// trial: div=t18000115-12
// session: name=16900430
// OA: can use either name= or div=  !
// div/name excludes dir= pages in browse.jsp
// is includes() the best way to do these?

function detectWeb(doc, url) {
	if (url.includes('browse.jsp')  && ( url.includes('div=OA') || url.includes('name=') ) ) {
		return "book";
	} else if (url.includes('browse.jsp')  && ( url.includes('div=') ) ) {
		return "case";
	} else if ( url.includes("search.jsp") &&  getSearchResults(doc, true)) {
		return "multiple";
	} 
}

// to do:  not trials...
// div=f16740429-1 - front matter
// div=a16860520-1 - advertisements
// div=s16740717-1 - punishment summary
// div=o16751208-1 - supplementary material



function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li/p[@class="srchtitle"]/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

 


// function to convert a string to Title Case to make names in all caps look better
// https://gist.github.com/edmundojr/e16fef6cb0ebe6ed987aa2b0c636f57a
function titleCase(str) {
	return str.toLowerCase().split(' ').map(function(word) {
		return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}



function scrape(doc, url) {

if (url.includes('browse.jsp')  && ( url.includes('div=OA') || url.includes('name=') ) ) {
		var newItem = new Zotero.Item("book");
	} else if (url.includes('browse.jsp')  && ( url.includes('div=') ) ) {
		var newItem = new Zotero.Item("case");
	}

	
	var trialTitle = ZU.xpathText(doc, '//div[@class="sessionsPaper"]/div[@class="sessions-paper-main-title"]');   // updated @class name
	
	
	newItem.url = url;
	
	var sessDate = ZU.xpathText(doc, '//div[@class="sessionsPaper"]/div[@class="sessions-paper-date"]'); // add session date, as the date is now in a gettable node
	
	newItem.date = ZU.strToISO(sessDate); 
	
	if ( newItem.itemType == "case") {
		newItem.title = titleCase(trialTitle);  // todo tidying this up - sometimes no name, messy punctuation
	} else if ( newItem.itemType == "book") {
		newItem.title = trialTitle + " " + sessDate;
	}
	
	var referenceNo = ZU.xpathText(doc, '//div[@class="ob-panel"][1]/table[@class="ob-info-table"][1]/tbody/tr[th[contains(text(),"Reference")]]/td').trim(); // changed fetching Reference number
	
	newItem.extra = "Reference Number: " + referenceNo; // putting the ref number in the Extra field had a particular function, was it for Voyant? or the defunct DMCI plugin? retain it at least for now (non trials will want it anyway)
	
	if (newItem.itemType == "case") {
		newItem.docketNumber = referenceNo; 
	}
	
	if (newItem.itemType == "book") {
		newItem.place = "London";
	}


// tags for trials

if (newItem.itemType == "case") {

// offence info is under sessions-paper-sub-title; verdicts/sentences under ob-info-table

	var off = ZU.xpath(doc, '//div[@class="sessionsPaper"]/div[@class="sessions-paper-sub-title"]/a');
	for (o in off){
		newItem.tags.push(off[o].textContent)
	}

	var verdict = ZU.xpathText(doc, '//div[@class="ob-panel"]/table[@class="ob-info-table"][1]/tbody/tr[th[contains(text(),"Verdict")]]/td');

	if(verdict) {
		verdict = verdict.split(';');
		for( v in verdict ) {
			newItem.tags.push(verdict[v])
		}
	}

	var sentence = ZU.xpathText(doc, '//div[@class="ob-panel"]/table[@class="ob-info-table"][1]/tbody/tr[th[contains(text(),"Sentence")]]/td');

	if(sentence) {
		sentence = sentence.split(';');
		for( s in sentence ) {
			newItem.tags.push(sentence[s])
		}
	}
}

// use print-friendly URLs for snapshots

	var attachmentUrl = "https://www.oldbaileyonline.org/print.jsp?div=" + referenceNo;  
	newItem.attachments.push({ url  : attachmentUrl,    title : "OBO Snapshot",    mimeType : "text/html" });

	newItem.complete();
}



// todo: replace save result set url

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else if (url.includes('browse.jsp') && ( url.includes('div=') || url.includes('name=') ) )  {  
		scrape(doc, url);
	}
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/search.jsp?form=custom&_divs_fulltext=animal&kwparse=and&_persNames_surname=&_persNames_given=&_persNames_alias=&_persNames_gender=&fromAge=&toAge=&_occupations_value=&_persNames_home=&_offences_offenceCategory_offenceSubcategory=&_offences_offenceDescription=&_verdicts_verdictCategory_verdictSubcategory=&_punishments_punishmentCategory_punishmentSubcategory=&_punishments_punishmentDescription=&_crimeDates_value=&_offences_crimeLocation=&_divs_div0Type_div1Type=&fromMonth=&fromYear=&toMonth=&toYear=&ref=&submit.x=0&submit.y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/browse.jsp?div=t18000115-12",
		"items": [
			{
				"itemType": "case",
				"caseName": "Peter Asterbawd, Andrew Forsman.",
				"creators": [],
				"dateDecided": "1800-01-15",
				"docketNumber": "t18000115-12",
				"extra": "Reference Number: t18000115-12",
				"url": "https://www.oldbaileyonline.org/browse.jsp?div=t18000115-12",
				"attachments": [
					{
						"title": "OBO Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": " Miscellaneous > fine"
					},
					{
						"tag": " Not Guilty"
					},
					{
						"tag": "Guilty > lesser offence"
					},
					{
						"tag": "Imprisonment > house of correction"
					},
					{
						"tag": "Theft"
					},
					{
						"tag": "burglary"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/browse.jsp?div=OA17110421",
		"items": [
			{
				"itemType": "book",
				"title": "Ordinary's Account.  21st April 1711",
				"creators": [],
				"date": "1711-04-21",
				"extra": "Reference Number: OA17110421",
				"libraryCatalog": "Old Bailey Online 201809",
				"place": "London",
				"url": "https://www.oldbaileyonline.org/browse.jsp?div=OA17110421",
				"attachments": [
					{
						"title": "OBO Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.oldbaileyonline.org/browse.jsp?name=OA17110421",
		"items": [
			{
				"itemType": "book",
				"title": "Ordinary's Account.  21st April 1711",
				"creators": [],
				"date": "1711-04-21",
				"extra": "Reference Number: OA17110421",
				"libraryCatalog": "Old Bailey Online 201809",
				"place": "London",
				"url": "https://www.oldbaileyonline.org/browse.jsp?name=OA17110421",
				"attachments": [
					{
						"title": "OBO Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.oldbaileyonline.org/browse.jsp?name=17100418",
		"items": [
			{
				"itemType": "book",
				"title": "Old Bailey Proceedings.  18th April 1710",
				"creators": [],
				"date": "1710-04-18",
				"extra": "Reference Number: 17100418",
				"libraryCatalog": "Old Bailey Online 201809",
				"place": "London",
				"url": "https://www.oldbaileyonline.org/browse.jsp?name=17100418",
				"attachments": [
					{
						"title": "OBO Snapshot",
						"mimeType": "text/html"
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
