{
	"translatorID": "11645bd1-0420-45c1-badb-53fb41eeb753",
	"translatorType": 8,
	"label": "CrossRef",
	"creator": "Aurimas Vinckevicius",
	"target": "",
	"minVersion": "3.0.9",
	"maxVersion": null,
	"priority": 90,
	"inRepository": true,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-09-09 20:05:00"
}

var typeMap = {
	'journal-article': 'journalArticle',
	'book-chapter': 'bookSection'
}

function detectSearch(items) {
	return !!sanitizeInput(items, true);
}

function doSearch(items) {
	items = sanitizeInput(items);
	
	if (!items) return;
	
	fetchDOIs(items);
}

function sanitizeInput(items, checkOnly) {
	var cleanItems = [];
	
	if (typeof items != 'string' && typeof items.length == 'undefined') {
		items = [items];
	}
	
	var found = false,
		dois = {};
	for (var i=0; i<items.length; i++) {
		if (!items[i].DOI) continue;
		var doi = ZU.cleanDOI(items[i].DOI);
		if (!doi) continue;
		
		if (checkOnly) return true;
		found = true;
		
		var item = dois[doi] || {DOI: doi, _query: []};
		item._query.push(items[i]);
		dois[doi] = item;
		
		cleanItems.push(item);
	}
	
	return found ? cleanItems : false;
}

function fetchDOIs(items) {
	if (!items.length) return;
	
	var item = items.shift(),
		baseURL = 'https://api.crossref.org/works/';
	ZU.doGet(baseURL + encodeURIComponent(item.DOI), function(text) {
		try {
			var json = JSON.parse(text);
		} catch(e) {
			// Probably not found
		}
		
		if (json && json.status == 'ok' && json.message) {
			importJSON(json.message, item);
		}
		
		fetchDOIs(items);
	});
}

function importJSON(result, query) {
	var itemType = typeMap[result.type];
	if (!itemType) {
		Zotero.debug("Unknown item type: " + result.type);
		itemType = 'journalArticle';
	}
	
	var item = new Zotero.Item(itemType);
	if (result.title) item.title = fixEncoding(pickTitle(result.title));
	
	if (result.author) {
		processCreators(item, result.author, 'author');
	}
	
	if (result.editor) {
		processCreators(item, result.editor, 'editor');
	}
	
	if (result.issued) {
		item.date = parseDate(result.issued);
	}
	
	if (result['container-title']) {
		item.publicationTitle = fixEncoding(pickTitle(result['container-title'])); // Again an array for some reason
	}
	
	item.pages = result.page;
	item.issue = result.issue;
	item.volume = result.volume;
	item.DOI = result.DOI || query.DOI;
	
	if (result.ISSN) item.ISSN = result.ISSN.join('; ');
	if (result.ISBN) item.ISBN = ZU.cleanISBN(result.ISBN[0]);
	
	if (result.URL && result.URL.indexOf('http://dx.doi.org/') != 0) {
		item.url = result.URL;
	}
	
	item.publisher = fixEncoding(result.publisher);
	
	if (result.subject) item.tags = result.subject;
	
	var contentVersion;
	if (result.link) {
		for (var i=0; i<result.link.length; i++) {
			var link = result.link[i];
			if (link['intended-application'] == 'text-mining'
				&& link['content-type'] == 'application/pdf'
			) {
				item.attachments.push({
					title: "Full Text PDF (via CrossRef)",
					url: link.URL,
					mimeType: 'application/pdf'
				})
				contentVersion = link['content-version'];
				break;
			}
		}
	}
	
	if (contentVersion && result.license) {
		// Find the most current license
		var currentTimestamp = Date.now(),
			bestLicense;
		for (var i=0; i<result.license.length; i++) {
			var license = result.license[i];
			if (license['content-version'] && contentVersion != license['content-version']) continue;
			
			if ( !bestLicense
				|| (license.start && license.start.timestamp > currentTimestamp
					&& (!bestLicense.start || bestLicense.start.timestamp < license.start.timestamp)
				)
			) {
				bestLicense = license;
			}
		}
		
		if (bestLicense) {
			item.rights = bestLicense.URL;
		}
	}
	
	//item._query = query._query;
	//item._status = 0;
	
	item.complete();
}

function processCreators(item, obj, type) {
	for (var i=0; i<obj.length; i++) {
		var creator = parseCreatorObject(obj[i]);
		if (!creator) continue;
		creator.creatorType = type;
		item.creators.push(creator);
	}
}

function parseCreatorObject(obj) {
	if (!obj.family) {
		if (!obj.literal) return false;
		return {
			lastName: fixEncoding(obj.literal),
			fieldMode: 1
		};
	}
	
	var creator = { lastName: obj.family };
	if (obj['non-dropping-particle']) {
		creator.lastName = obj['non-dropping-particle'] + ' ' + creator.lastName;
	}
	
	creator.lastName = fixEncoding(creator.lastName);
	
	if (!obj.given) return creator;
	
	// A bit of a hack to add periods to initials
	var temp = ZU.cleanAuthor(obj.given + ' Lastname', 'author', false);
	creator.firstName = temp.firstName;
	
	if (obj['suffix']) {
		creator.firstname += ', ' + obj['suffix'];
	}
	
	if (obj['dropping-particle']) {
		creator.firstname += ', ' + obj['dropping-particle'];
	}
	
	creator.firstName = fixEncoding(creator.firstName);
	return creator;
}

function parseDate(obj) {
	var date = ''
	if (obj["date-parts"]) {
		date = obj["date-parts"]
			.map(function(d) { return d.join('-'); })
			.join('—'); // Join date ranges by em dash
	}
	
	if (!date) {
		return fixEncoding(obj.literal || obj.raw || '');
	}
	
	if (obj.season && typeof obj.season == 'string') {
		date += ' ' + obj.season;
	}
	
	if (obj.circa) date = 'c. ' + date;
	
	return fixEncoding(date);
}

function fixEncoding(str) {
	// Check for characters that should not appear in strings. This could indicate
	// a mis-encoded string
	if (!/[\x00-\x09\x0B\x0C\x0E-\x1F\x80-\x9F]/.test(str)) return str;
	
	return decodeURIComponent(escape(str)); // e.g. e28093 could turn into \xe2\x80\x93
}

function pickTitle(titles) {
	// Pick the longest in the list, since they don't seem to be consistently in order
	var title = titles[0];
	for (var i=1; i<titles.length; i++) {
		if (title.length < titles[i].length) {
			title = titles[i];
		}
	}
	
	return title;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"DOI":"10.1017/CCOL0521858429.016"
		},
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Christopher",
						"lastName": "Hitchens"
					},
					{
						"creatorType": "editor",
						"firstName": "John",
						"lastName": "Rodden"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"bookTitle": "The Cambridge Companion to George Orwell",
				"ISBN": "9781139001472",
				"publisher": "Cambridge University Press",
				"pages": "201-207",
				"date": "2007",
				"DOI": "10.1017/CCOL0521858429.016",
				"title": "Why Orwell still matters",
				"libraryCatalog": "CrossRef"
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI":"10.1057/9780230391116.0016"
		},
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Oliver",
						"lastName": "Werner"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"bookTitle": "Heimat, Region, and Empire",
				"ISBN": "9780230391116",
				"publisher": "Palgrave Macmillan",
				"date": "2012-10-17",
				"DOI": "10.1017/CCOL0521858429.016",
				"title": "Conceptions, Competences and Limits of German Regional Planning during the Four Year Plan, 1936–1940",
				"libraryCatalog": "CrossRef"
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI":"10.7554/eLife.05244"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Ryan J.",
						"lastName": "Catchpole"
					},
					{
						"lastName": "Poole",
						"firstName": "Anthony M.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [ 
					{ 
						"title": "Full Text PDF (via CrossRef)",
						"mimeType": "application/pdf" 
					}
				],
				"date": "2014-11-25",
				"title": "Antibiotic genes spread far and wide",
				"DOI": "10.7554/elife.05244",
				"ISSN": "2050-084X",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"publicationTitle": "eLife",
				"volume": "3",
				"libraryCatalog": "CrossRef"
			}
		]
	}
]
/** END TEST CASES **/
