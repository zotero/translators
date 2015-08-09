{
	"translatorID": "1300cd65-d23a-4bbf-93e5-a3c9e00d1066",
	"label": "Primo",
	"creator": "Matt Burton, Avram Lyon, Etienne Cavalié, Rintze Zelle, Philipp Zumstein, Sebastian Karcher, Aurimas Vinckevicius, Fondazione BEIC",
	"target": "/primo_library/|/nebis/|^https?://www\\.recherche-portal\\.ch/zbz/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2015-05-04 14:37:00"
}

/*
Supports Primo 2:
Université de Nice, France (http://catalogue.unice.fr/)  (looks like this is Primo3 now, too)
Supports Primo 3
Boston College (http://www.bc.edu/libraries/),
Oxford Libraries (http://solo.ouls.ox.ac.uk/)

Primos with showPNX.jsp installed:
(1) http://purdue-primo-prod.hosted.exlibrisgroup.com/primo_library/libweb/action/search.do?vid=PURDUE
(2) http://primo.bib.uni-mannheim.de/primo_library/libweb/action/search.do?vid=MAN_UB
(3) http://limo.libis.be/primo_library/libweb/action/search.do?vid=LIBISnet&fromLogin=true
(4.a) http://virtuose.uqam.ca/primo_library/libweb/action/search.do?vid=UQAM
(5) http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?docId=PRN_VOYAGER2778598&vid=PRINCETON&institution=PRN

Other Primos where showPnx=true is available:
(6) http://digitale.beic.it/primo_library/libweb/action/search.do?vid=beic
*/

function getSearchResults(doc) {
	var linkXPaths = [ //order dictates preference
		'.//li[starts-with(@id,"exlidResult") and substring(@id,string-length(@id)-10)="-DetailsTab"]/a[@href]', //details link
		'.//h2[@class="EXLResultTitle"]/a[@href]' //title link
	];
	var resultsXPath = '//*[self::tr or self::div][starts-with(@id, "exlidResult") and '
		+ 'number(substring(@id,12))=substring(@id,12)][' + linkXPaths.join(' or ') + ']';
	//Z.debug(resultsXPath);
	var results = ZU.xpath(doc, resultsXPath);
	results.titleXPath = './/h2[@class="EXLResultTitle"]';
	results.linkXPaths = linkXPaths;
	return results;
}

function detectWeb(doc, url) {
	if(getSearchResults(doc).length) {
		return 'multiple';
	}
	
	var contentDiv = doc.getElementsByClassName('EXLFullResultsHeader');
	if(!contentDiv.length) contentDiv = doc.getElementsByClassName('EXLFullDisplay');
	if(!contentDiv.length) contentDiv = doc.getElementsByClassName('EXLFullView');
	if(contentDiv.length) return 'book';
}

function doWeb(doc, url) {
	var searchResults = getSearchResults(doc);
	if(searchResults.length) {
		var items = {}, itemIDs = {}, title, link,
			linkXPaths = searchResults.linkXPaths;
		for(var i=0, n=searchResults.length; i<n; i++) {
			title = ZU.xpathText(searchResults[i], searchResults.titleXPath);
			for(var j=0, m=linkXPaths.length; j<m; j++) {
				link = ZU.xpath(searchResults[i], linkXPaths[j])[0];
				if(link) {
					break;
				}
			}
			
			if(!link || !title || !(title = ZU.trimInternal(title))) continue;
			
			items[link.href] = title;
			itemIDs[link.href] = {id: i, docID: getDocID(link.href)};
		}
		
		Z.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			
			var urls = [];
			for(var i in selectedItems) {
				urls.push({url: i, id: itemIDs[i].id, docID: itemIDs[i].docID});
			}
			fetchPNX(urls);
		})
	} else {
		fetchPNX([{url: url, id: 0, docID: getDocID(url)}]);
	}
}

function getDocID(url) {
	var id = url.match(/\bdoc(?:Id)?=([^&]+)/i);
	if(id) return id[1];
}

//keeps track of which URL format works for retrieving PNX record
//and applies the correct transformation function
var PNXUrlGenerator = new function() {
	var functions = [
		//showPNX.js
		//using docIDs instead of IDs tied to a session
		//e.g. http://searchit.princeton.edu/primo_library/libweb/showPNX.jsp?id=PRN_VOYAGER7343340
		function(urlObj) {
			return getUrlWithId(urlObj.url, urlObj.docID);
		},
		//fall back to IDs
		//from: http://primo.bib.uni-mannheim.de/primo_library/libweb/action/search.do?...
		//to:   http://primo.bib.uni-mannheim.de/primo_library/libweb/showPNX.jsp?id=
		function(urlObj) {
			return getUrlWithId(urlObj.url, urlObj.id);
		},
		//simply add &showPnx=true
		function(urlObj) {
			var url = urlObj.url.split('#');
			if(url[0].indexOf('?') == -1) {
				url[0] += '?';
			} else {
				url[0] += '&';
			}
			return url[0] + 'showPnx=true';
		}
	];
	
	function getUrlWithId(url, id) {
		var url = url.match(/(https?:\/\/[^?#]+\/)[^?#]+\/[^\/]*(?:[?#]|$)/);
		if(!url) return;
		return url[1] + 'showPNX.jsp?id=' + id;
	}
	
	this.currentFunction = 0;
	this.confirmed = false;
	
	this.getUrl = function(data) {
		var fun = functions[this.currentFunction];
		if(!fun) return;
		
		return fun(data);
	};
	
	this.nextFunction = function() {
		if(!this.confirmed && this.currentFunction < functions.length) {
			Z.debug("Function " + this.currentFunction + " did not work.");
			this.currentFunction++;
			return true;
		}
	};
};

//retrieve PNX records for given items sequentially
function fetchPNX(itemData) {
	if(!itemData.length) return; //do this until we run out of URLs
	
	var data = itemData.shift();
	var url = PNXUrlGenerator.getUrl(data); //format URL if still possible
	if(!url) {
		if(PNXUrlGenerator.nextFunction()) {
			itemData.unshift(data);
		} else if(!PNXUrlGenerator.confirmed){
			//in case we can't find PNX for a particular item,
			//go to the next and start looking from begining
			Z.debug("Could not determine PNX url from " + data.url);
			PNXUrlGenerator.currentFunction = 0;
		}
		
		fetchPNX(itemData);
		return;
	}
	
	var gotPNX = false;
	Z.debug("Trying " + url);
	ZU.doGet(url,
		function(text) {
			text = text.trim();
			if(text.substr(0,5) != '<?xml' || text.search(/<error\b/i) !== -1) {
				//try a different PNX url
				gotPNX = false;
				return;
			} else {
				gotPNX = true;
				PNXUrlGenerator.confirmed = true;
			}
			
			importPNX(text);
		},
		function() {
			if(!gotPNX && PNXUrlGenerator.nextFunction()) {
				//if url function not confirmed, try another one on the same URL
				//otherwise, we move on
				itemData.unshift(data);
			}
			
			fetchPNX(itemData);
		}
	);
}

//import PNX record
function importPNX(text) {
	//Note that if the session times out, PNX record will just contain a "null" entry
	Z.debug(text);
	//a lot of these apply only to prim records, mainly (but no exclusively) served by the jsp file
	text = text.replace(/\<\/?xml-fragment[^\>]*\>/g, "")
			.replace(/(<\/?)\w+:([^\>]*)/g, "$1$2") //remove namespaces
			//remove ns declarations - we don't need them and they break this
			.replace(/<[^>]+/g, function(m) {
				return m.replace(/\s+xmlns(?::\w+)?\s*=\s*(['"]).*?\1/ig, '');
			});
	//Z.debug(text);
	
	var parser = new DOMParser();
	var doc = parser.parseFromString(text, "text/xml");
	
	var item = new Zotero.Item();
	
	var itemType = ZU.xpathText(doc, '//display/type');
	if(!itemType) {
		if ( ZU.xpathText(doc, '//facets/rsrctype') ) {
			var itemType = ZU.xpathText(doc, '//facets/rsrctype');
		} else if ( ZU.xpathText(doc, '//search/rsrctype') ) {
			var itemType = ZU.xpathText(doc, '//search/rsrctype');
		} else {
			throw new Error('Could not locate item type');
		}
	}
	
	switch(itemType.toLowerCase()) {
		case 'book':
		case 'ebook':
		case 'pbook' :
		case 'books':
			item.itemType = "book";
		break;
		case 'audio':
			item.itemType = "audioRecording";
		break;
		case 'video':
			item.itemType = "videoRecording";
		break;
		case 'report':
			item.itemType = "report";
		break;
		case 'webpage':
			item.itemType = "webpage";
		break;
		case 'article':
			item.itemType = "journalArticle";
		break;
		case 'thesis':
			item.itemType = "thesis";
		break;
		case 'map':
			item.itemType = "map";
		break;
		case 'newspaper_article':
			item.itemType="newspaperArticle";
		break;
		default:
			item.itemType = "document";
	}
	
	item.title = ZU.xpathText(doc, '//display/title');
	if(item.title) item.title = ZU.unescapeHTML(item.title);
	
	var creators = ZU.xpath(doc, '//display/creator');
	var contributors = ZU.xpath(doc, '//display/contributor');
	if(!creators.length && contributors.length) {
		// <creator> not available using <contributor> as author instead
		creators = contributors;
		contributors = [];
	}

	// //addata/au is great because it lists authors in last, first format,
	// but it can also have a bunch of junk. We'll use it to help split authors
	var splitGuidance = {};
	var addau = ZU.xpath(doc, '//addata/addau|//addata/au');
	for (var i=0; i<addau.length; i++) {
		var author = stripAuthor(addau[i].textContent);
		if (author.indexOf(',') != -1) {
			var splitAu = author.split(',');
			if (splitAu.length > 2) continue;
			var name = splitAu[1].trim().toLowerCase() + ' '
				+ splitAu[0].trim().toLowerCase()
			splitGuidance[name] = author;
		}
	}
	
	fetchCreators(item, creators, 'author', splitGuidance);
	fetchCreators(item, contributors, 'contributor', splitGuidance);

	// For this section, contrastive examples:
	// http://primo.bib.uni-mannheim.de/primo_library/libweb/action/display.do?doc=MAN_ALEPH000967205&showPnx=true
	// http://digitale.beic.it/primo_library/libweb/action/display.do?doc=39bei_digitool2018516&showPnx=true
	// http://digitale.beic.it/primo_library/libweb/action/display.do?doc=39bei_digitool2394625&showPnx=true
	// Example: "Milano". Rarely: "Mediolani", "In Milano" etc.
	// BEIC.it also uses //display/lds09, //search/lsr12, //search/lsr03, //facets/lfc03
	item.place = ZU.xpathText(doc, '//addata/cop');
	
	// E.g. "Parma : Viotto", "Ambrogio : da Caponago", "Mantegazza, Filippo"
	var publisher = ZU.xpathText(doc, '//display/publisher');
	// E.g. "Viotto", "[Ambrogio da Caponago]", "per magistro Philippo dicto Cassano di Mantegatii"
	if(!publisher) var publisher = ZU.xpathText(doc, '//addata/pub');
	if(publisher) {
		var pubplace = ZU.unescapeHTML(publisher).split(" : ");
		var possibleplace = pubplace[0].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "");
	}
	if(pubplace && pubplace[1] && item.place && item.place !== possibleplace) {
		// The splitting produced something, but the first segment is not the place.
		// Probably, the whole string was the publisher's name.
		// Should also catch cases like "Meurs, Jacob : van "
		item.publisher = publisher;
	} else if(pubplace && pubplace[1]) {
		// Hopefully we split in place, publisher name.
		item.publisher = pubplace[1].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "")
			.replace(/^\s*"|,?"\s*$/g, '');
	} else if(pubplace) {
		// No splitting, use the whole (cleaned) string
		item.publisher = possibleplace.replace(/^\s*"|,?"\s*$/g, '');
	}
	if(!item.place && possibleplace && pubplace[1]) {
		// Splitting happened and we need a place, we hope this is it
		item.place = possibleplace;
	}

	// //addata/date is sometimes available: ever needed?
	// //addata/risdate can contain the date as written on the manifestation and
	// be the only date, e.g. "Anno domini MCCCCLXXXXV die XXVII februarii" in
	// http://digitale.beic.it/primo_library/libweb/action/display.do?doc=39bei_digitool2394625&showPnx=true
	var date = ZU.xpathText(doc, '//display/creationdate|//search/creationdate');
	var m;
	if(date && (m = date.match(/\d+/))) {
		item.date = m[0];
	}

	// Old publishers may be written as "Last, First" etc. according to
	// standards, but should be like authors when in citations.
	// Source: Italian librarian https://it.wikipedia.org/?diff=69781295
	// "Dozza, Evangelista (1.), eredi"
	// "Marnef, Jérôme de & Cavellat, Guillaume, veuve"
	// But:
	// "The Minerals, Metals & Materials Society"
	// "Hodges, Foster & Co."
	// Also problematic and still to handle: annotations which are not proper names, like:
	// "printed by Henry Hills, printer to the King's most Excellent Majesty, for His Household and Chappel"
	// "Hessisches Ministerium für Landwirtschaft, Forsten und Naturschutz, Landentwicklung"
	if( item.publisher
		&& item.date
		&& item.date < '1831'
	) {
		// Remove excess space and secondary disambiguations
		// Do not replace "&" unless there is a second name-looking string
		var declutter = ZU.trimInternal(item.publisher).replace(/ \& ([^&,;]+,)/g, "; $1").replace(/ *\([^)]+\)/g, "");
		// Shuffle names with disambiguation and remove numbering
		var shuffle3 = declutter.replace(/ *([^,;]+), +([^,;0-9]+) *[0-9]*, +([^,;]+) */g, "$2 $1 ($3)");
		// Same, other names
		var shuffle2 = shuffle3.replace(/ *([^,;]+), +([^,;0-9]+) *[0-9]* */g, "$2 $1");
		// Use comma list, get rid of space buildup for numbered names, clean like authors
		item.publisher = stripAuthor( shuffle2.replace(/ *[;] */g, ", ").replace(/  /g, " ") );
	}

	// The three letter codes, that should be in the language field, usually work well
	// (although they may be in MARC21, or ISO 639-2, rather than ISO 639-3 or others)
	item.language = ZU.xpathText(doc, '(//display/language|//facets/language)[1]');

	// BEIC.it uses //dedup/f9, unclear what that is
	var pages = ZU.xpathText(doc, '//display/format');
	if(item.itemType == 'book' && pages && pages.search(/\d/) != -1) {
		item.numPages = extractNumPages(pages);
	}

	item.series = ZU.xpathText(doc, '(//addata/seriestitle)[1]');

	// The identifier field is supposed to have standardized format, but
	// the super-tolerant idCheck should be better than a regex.
	// (although note that it will reject invalid ISBNs)
	var locators = ZU.xpathText(doc, '//display/identifier');
	if(locators) {
		item.ISBN = ZU.cleanISBN(locators);
		item.ISSN = ZU.cleanISSN(locators);
	}
	
	item.edition = ZU.xpathText(doc, '//display/edition');
	
	var subjects = ZU.xpath(doc, '//search/subject');
	if(!subjects.length) {
		subjects = ZU.xpath(doc, '//display/subject');
	}
	for(var i=0, n=subjects.length; i<n; i++) {
		item.tags.push(ZU.trimInternal(subjects[i].textContent));
	}
	
	item.abstractNote = ZU.xpathText(doc, '//display/description')
		|| ZU.xpathText(doc, '//addata/abstract');
	if (item.abstractNote) item.abstractNote = ZU.unescapeHTML(item.abstractNote);
	
	item.DOI = ZU.xpathText(doc, '//addata/doi');
	item.issue = ZU.xpathText(doc, '//addata/issue');
	item.volume = ZU.xpathText(doc, '//addata/volume');
	item.publicationTitle = ZU.xpathText(doc, '//addata/jtitle');
	
	var startPage = ZU.xpathText(doc, '//addata/spage');
	var endPage = ZU.xpathText(doc, '//addata/epage');
	var overallPages = ZU.xpathText(doc, '//addata/pages');
	if (startPage && endPage){
		item.pages = startPage + '–' + endPage;
	} else if (overallPages) {
		item.pages = overallPages;
	} else if (startPage) {
		item.pages = startPage;
	} else if (endPage) {
		item.pages = endPage;
	}
	
	// does callNumber get stored anywhere else in the xml?
	item.callNumber = ZU.xpathText(doc, '//enrichment/classificationlcc');
	
	item.complete();
}

function stripAuthor(str) {
	// Example "Andrea : da Barberino (1370-circa 1431)"
	// http://gutenberg.beic.it/webclient/MetadataManager?pid=3836862&descriptive_only=true
	return str
		// Remove things like (illustrator). TODO: use this to assign creator type?
		// Also matches an empty parenthesis
		.replace(/\s*,?\s*\([^()]*\)$/, '')
		// Remove almost any remaining parenthesis, starting with numbers (dates) and
		// letters used for common international abbreviations about dates
		.replace(/\([\d\sabcefilr.? ]*[-–][\d\abcefilr.? ]*\)/gi, '')
		// The full "continuous" name uses no separators, which need be removed
		// cf. "Luc, Jean André : de (1727-1817)"
		.replace(/ :/, "");
}

function fetchCreators(item, creators, type, splitGuidance) {
	for(var i=0; i<creators.length; i++) {
		var creator = ZU.unescapeHTML(creators[i].textContent).split(/\s*;\s*/);
		for(var j=0; j<creator.length; j++) {
			var c = stripAuthor(creator[j]);
			c = ZU.cleanAuthor(
				splitGuidance[c.toLowerCase()] || c,
				type,
				true
			);
			
			if (!c.firstName) {
				delete c.firstName;
				c.fieldMode = 1;
			}
			
			item.creators.push(c);
		}
	}
}

function extractNumPages(str) {
	// Borrowed from Library Catalog (PICA). See #756.
	// Make sure things like "2 partition" don't match,
	// but "2 p" at the end of the field does.
	// f., p., pp. and S. are "pages" in various languages
	// For multi-volume works, we expect formats like:
	//   x-109 p., 510 p. and X, 106 S.; 123 S.
	// For volumes with multiple paginations and other info, formats like:
	// - [16], 228, [4] p. : ill. ; 4°

	// Brackets are an (optional) "property" of each pagination
	var numPagesRE = /\b((?:\[?[ivxlcdm\d]+\]?[ ,\-]*)+)\s+[fps]+\b/ig,
		numPages = [], m;
	while(m = numPagesRE.exec(str)) {
		numPages.push(m[1].trim()
			// Separate different paginations with a "+"
			.replace(/[ ,\-\[\]]+(?!$)/g, '+')
			// We may have some trailing punctuation
			.replace(/[,\-\[\]]+$/g, '')
			.toLowerCase() // for Roman numerals
		);
	}
	// Separate volumes with a ";"
	return numPages.join('; ');
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://searchit.princeton.edu/primo_library/libweb/action/dlDisplay.do?docId=PRN_VOYAGER2778598&vid=PRINCETON&institution=PRN&showPNX=true",
		"items": [
			{
				"itemType": "book",
				"title": "China and foreign missionaries.",
				"creators": [
					{
						"lastName": "Great Britain. Foreign Office",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1860",
				"language": "eng",
				"libraryCatalog": "Primo",
				"publisher": "London",
				"attachments": [],
				"tags": [
					"China Foreign relations Great Britain.",
					"China Religion.",
					"Great Britain Foreign relations China.",
					"Missions China."
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://purdue-primo-prod.hosted.exlibrisgroup.com/primo_library/libweb/action/dlDisplay.do?vid=PURDUE&docId=PURDUE_ALMA21505315560001081&fn=permalink",
		"items": [
			{
				"itemType": "book",
				"title": "War",
				"creators": [
					{
						"firstName": "Lawrence",
						"lastName": "Freedman",
						"creatorType": "author"
					}
				],
				"date": "1994",
				"ISBN": "0192892541",
				"abstractNote": "Experience of war -- Causes of war -- War and the military establishment -- Ethics of war -- Strategy -- Total war and the great powers -- Limited war and developing countries., \"War makes headlines and history books. It has shaped the international system, prompted social change, and inspired literature, art, and music. It engenders some of the most intense as well as the most brutal human experiences, and it raises fundamental questions of human ethics.\" \"The ubiquitous, contradictory, and many-sided character of war is fully reflected in this reader. It addresses a wide range of questions: What are the causes of war? Which strategic as well as moral principles guide its conduct, and how have these changed? Has total war become unthinkable? What is the nature of contemporary conflict? How is war experienced by those on the front line?\" \"These and other key issues are examined through a variety of writings. Drawing on sources from numerous countries and disciplines, this reader includes accounts by generals, soldiers, historians, strategists, and poets, who consider conflicts from the Napoleonic Wars to Vietnam and Bosnia. The writing not only of great strategic thinkers but also of ordinary soldiers illustrates both the theory and the experience of war in its many guises.\"--BOOK JACKET.",
				"callNumber": "U21.2",
				"language": "eng",
				"libraryCatalog": "Primo",
				"numPages": "xi+385",
				"place": "Oxford ; New York",
				"publisher": "Oxford University Press",
				"series": "Oxford readers",
				"attachments": [],
				"tags": [
					"War."
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://limo.libis.be/primo_library/libweb/action/dlDisplay.do?vid=LIBISnet&docId=32LIBIS_ALMA_DS71166851730001471&fn=permalink",
		"items": [
			{
				"itemType": "book",
				"title": "War",
				"creators": [
					{
						"firstName": "Albert R.",
						"lastName": "Leventhal",
						"creatorType": "author"
					},
					{
						"firstName": "Del",
						"lastName": "Byrne",
						"creatorType": "contributor"
					}
				],
				"date": "1973",
				"ISBN": "0600393046",
				"language": "eng",
				"libraryCatalog": "Primo",
				"numPages": "252",
				"publisher": "Hamlyn",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://virtuose.uqam.ca/primo_library/libweb/action/dlDisplay.do?vid=UQAM&docId=UQAM_BIB000969205&fn=permalink",
		"items": [
			{
				"itemType": "book",
				"title": "War",
				"creators": [
					{
						"firstName": "Ken",
						"lastName": "Baynes",
						"creatorType": "author"
					},
					{
						"lastName": "Welsh Arts Council",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Glynn Vivian Art Gallery",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1970",
				"language": "eng",
				"libraryCatalog": "Primo",
				"publisher": "Boston Boston Book and Art Chop",
				"place": "Boston",
				"series": "Art and society 1",
				"attachments": [],
				"tags": [
					"ART",
					"GUERRE",
					"WAR"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://digitale.beic.it/primo_library/libweb/action/display.do?dscnt=1&fromLogin=true&doc=39bei_digitool4783627&dstmp=1420050573310&vid=beic&fromLogin=true&fromLogin=true",
		"items": [
			{
				"itemType": "book",
				"title": "De scientia stellarum",
				"creators": [
					{
						"firstName": "Muhammad",
						"lastName": "al-Battani",
						"creatorType": "author"
					}
				],
				"date": "1645",
				"language": "lat",
				"libraryCatalog": "Primo",
				"numPages": "16+228+4",
				"publisher": "Vittorio Benacci",
				"attachments": [],
				"tags": [
					"Stelle fisse - Novae"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://digitale.beic.it/primo_library/libweb/action/display.do?doc=39bei_digitool2018516",
		"items": [
			{
				"itemType": "book",
				"title": "Grida per i Milanesi che avevano seguito Ludovico il Moro",
				"creators": [
					{
						"lastName": "Milano",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1500",
				"language": "ita",
				"libraryCatalog": "Primo",
				"place": "Milano",
				"publisher": "Ambrogio da Caponago",
				"attachments": [],
				"tags": [
					"Italia - Storia medioevale",
					"Leggi"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
