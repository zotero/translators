{
	"translatorID": "60e55b65-08cb-4a8f-8a61-c36338ec8754",
	"label": "Access Medicine",
	"creator": "Jaret Karnuta",
	"target": ".*accessmedicine\\.mhmedical\\.com.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-25 22:55:02"
}

function detectWeb(doc, url){
	var citation = doc.getElementById("hfGetCitation");
	if(citation){
		return "bookSection";
	}
}

function doWeb(doc, url){
	var contentType = detectWeb(doc, url);
	if (contentType != "bookSection"){return;}

	//only book section from now on
	var linkTemplate = "$$DOMAIN$$/downloadCitation.aspx?format=ris&sectionid=$$SECTION_ID$$";
	var href = doc.location.href.split("/content")[0];
	var sectionId = doc.location.href.split("sectionid=")[1];
	var link = linkTemplate.replace("$$DOMAIN$$", href).replace('$$SECTION_ID$$',sectionId);

	Zotero.Utilities.doGet(link, getCallback);
}

function getCallback(resString, resObj, url){
	item = new Zotero.Item("bookSection");
	item = parseRis(resString, item);
	item.complete();
}

/**
 * Populates item with fields from risString (RIS object)
 */
function parseRis(risString, item){
	//split on carriage return (13) and line feed (10), RIS standard format
	var lines = risString.split('\r\n');

	//authors
	var authors = getRisFields(lines, "AU");
	for (var i = 0; i < authors.length;i++){
		var author = parseAuthor(authors[i],'author');
		item.creators.push(author);
	}
	authors = getRisFields(lines, "A1");
	for (var i = 0; i < authors.length;i++){
		var author = parseAuthor(authors[i],'author');
		item.creators.push(author);
	}
	authors = getRisFields(lines, "A2");
	for (var i = 0; i < authors.length;i++){
		var author = parseAuthor(authors[i],'editor');
		item.creators.push(author);
	}
	//... ignore the rest of the authors, not present in these books


	//year
	var year = getRisFields(lines,"PY")[0];
	item.date = year;

	//section title
	var sectionTitle = getRisFields(lines, "TI")[0];
	item.title = sectionTitle;

	//book title
	var bookTitle = getRisFields(lines, "T2")[0];
	bookTitle = formatString(bookTitle);
	item.bookTitle = bookTitle;

	//publisher
	var publisher = getRisFields(lines, "PB")[0];
	item.publisher = publisher;

	//place
	var place = getRisFields(lines, "CY")[0];
	item.place = place;

	//abstract
	var abstract = getRisFields(lines,"AB")[0];
	item.abstract = abstract;

	//url
	var itemUrl = getRisFields(lines,'UR')[0];
	item.url = itemUrl;

	return item;
}

/**
 * Returns list of values mapped to fieldKey in risString (RIS file stringified)
 */
function getRisFields(risArray, fieldKey){
	var value = [];

	for (var i = 0;i<risArray.length;i++){
		//work around due to some authors having hyphenated names
		var hyphenLoc = risArray[i].indexOf("-");
		var key = risArray[i].substring(0,hyphenLoc).trim();
		var val = risArray[i].substring(hyphenLoc+1).trim();
		if (key == fieldKey){
			value.push(val);
		}
	}
	return value;
}


/**
 * Removes HTML encoded text and replace with ASCII
 *
 */
function formatString(stringIn){
	var ampRegex = new RegExp('&amp;', 'g');
	stringIn = stringIn.replace(ampRegex,'&');
	return stringIn;
}

/**
 * Used instead of Zotero.utilities.cleanAuthor
 * Better for parsing RIS authors apparently
 */
function parseAuthor(author, type){
	names = author.split(",");
	obj = {};
	obj['lastName'] = names[0];
	if(names[1]){
		obj['firstName']=names[1];
	}
	if(names[2]){
		obj['suffix']=names[2];
	}
	obj['creatorType']=type;
	return obj;
}
