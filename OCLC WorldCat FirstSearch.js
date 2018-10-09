{
	"translatorID": "838d8849-4ffb-9f44-3d0d-aa8a0a079afe",
	"label": "OCLC WorldCat FirstSearch",
	"creator": "Simon Kornblith",
	"target": "^https?://[^/]*firstsearch\\.oclc\\.org[^/]*/WebZ/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2017-01-01 15:28:35"
}

function detectWeb(doc, url) {
	var detailRe = /FirstSearch: [\w ]+ Detailed Record/;
	var searchRe = /FirstSearch: [\w ]+ List of Records/;

	if (detailRe.test(doc.title)) {
		return "book";
	} else if (searchRe.test(doc.title)) {
		return "multiple";
	}
}


function processURLs(urls, url) {
	if (!urls.length) {	// last url
		Zotero.done();
		return;
	}
	var newUrl = urls.shift();

	Zotero.Utilities.HTTP.doPost(newUrl,
	'exportselect=record&exporttype=wc-endnote', function(text) {
		Z.debug(text)
		var lineRegexp = new RegExp();
		lineRegexp.compile("^([\\w() ]+): *(.*)$");

		var newItem = new Zotero.Item("book");
		var notes = "";

		var lines = text.split('\n');
		for (var i=0;i<lines.length;i++) {
			var testMatch = lineRegexp.exec(lines[i]);
			if (testMatch) {
				var match = newMatch;
				var newMatch = testMatch
			} else {
				var match = false;
			}

			if (match) {
				// is a useful match
				if (match[1] == 'Title') {
					var title = match[2];
					if (!lineRegexp.test(lines[i+1])) {
						i++;
						title += ' '+lines[i];
					}
					if (title.substring(title.length-2) == " /") {
						title = title.substring(0, title.length-2);
					}
					newItem.title = Zotero.Utilities.capitalizeTitle(title);
				} else if (match[1] == "Series") {
					newItem.series = ZU.trimInternal(match[2]);
				} else if (match[1] == "Description") {
				  var pageMatch = /([0-9]+) p\.?/;
					var m = pageMatch.exec(match[2]);
					if (m) {
						newItem.numPages = m[1];
					}
				} else if (match[1] == 'Author(s)' || match[1] == "Corp Author(s)") {
					var yearRegexp = /[0-9]{4}-([0-9]{4})?/;

					var authors = match[2].split(';');
					if (authors) {
						newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[0], "author", true));
						for (var j=1; j<authors.length; j+=2) {
							if (authors[j-1].substring(0, 1) != '(' && !yearRegexp.test(authors[j])) {
								// ignore places where there are parentheses
								newItem.creators.push({lastName:authors[j], creatorType:"author", fieldMode:true});
							}
						}
					} else {
						newItem.creators.push(Zotero.Utilities.trimInternal(match[2]));
					}
				} else if (match[1] == 'Publication') {
					match[2] = Zotero.Utilities.trimInternal(match[2]);
					if (match[2].substring(match[2].length-1) == ',') {
						match[2] = match[2].substring(0, match[2].length-1);
					}

					// most, but not all, WorldCat publisher/places are
					// colon delimited
					var parts = match[2].split(/ ?: ?/);
					if (parts.length == 2) {
						newItem.place = parts[0];
						newItem.publisher = parts[1];
					} else {
						newItem.publisher = match[2];
					}
				} else if (match[1] == 'Institution') {
					newItem.publisher = match[2];
				} else if (match[1] == 'Standard No') {
				  var ISBNRe = /ISBN:\s*([0-9X]+)/;
					var m = ISBNRe.exec(match[2]);
					if (m) newItem.ISBN = m[1];
				} else if (match[1] == 'Year') {
					newItem.date = match[2];
				} else if (match[1] == "Descriptor") {
					if (match[2][match[2].length-1] == ".") {
						match[2] = match[2].substr(0, match[2].length-1);
					}

					var tags = match[2].split("--");
					for (var j in tags) {
						newItem.tags.push(Zotero.Utilities.trimInternal(tags[j]));
					}
				}
				else if (match[1] == "Language") {
					newItem.language = match[2];
				}
				else if (match[1] == "Abstract") {
					newItem.abstractNote = match[2];
				} else if (match[1] == "Accession No" && match[2].indexOf("OCLC") != -1) {
					newItem.extra = ZU.trimInternal(match[2]);
				} else if (match[1] == "Degree") {
					newItem.itemType = "thesis";
					newItem.thesisType = match[2];
				} else if (match[1] == "DOI") {
					newItem.DOI = match[2];
				} else if (match[1] == "Database") {
					if (match[2].substr(0, 8) != "WorldCat") {
						newItem.itemType = "journalArticle";
					}
				} else if (match[1] != "Availability" &&
						  match[1] != "Find Items About" &&
						  match[1] != "Document Type") {
					notes += match[1]+": "+match[2]+"\n";
				}
			} else {
				if (lines[i] != "" && lines[i] != "SUBJECT(S)") {
					newMatch[2] += " "+lines[i];
				}
			}
		}

		if (notes) {
			newItem.notes.push(notes.substr(0, notes.length-1));
		}

		newItem.complete();
		processURLs(urls, url);
	});
}

function doWeb(doc, url) {
	var sessionRegexp = /(?:\?|\:)sessionid=([^?:]+)(?:\?|\:|$)/;
	var numberRegexp = /(?:\?|\:)recno=([^?:]+)(?:\?|\:|$)/;
	var resultsetRegexp = /(?:\?|\:)resultset=([^?:]+)(?:\?|\:|$)/;
	var hostRegexp = new RegExp("^(https?://[^/]+)/");

	var sMatch = sessionRegexp.exec(url);
	var sessionid = sMatch[1];

	var hMatch = hostRegexp.exec(url);
	var host = hMatch[1];

	var newUri, exportselect;

	var detailRe = /FirstSearch: [\w ]+ Detailed Record/;
	if (detailRe.test(doc.title)) {
		var publisherRegexp = /^(.*), (.*?),?$/;

		var nMatch = numberRegexp.exec(url);
		if (nMatch) {
			var number = nMatch[1];
		} else {
			number = 1;
		}

		var rMatch = resultsetRegexp.exec(url);
		if (rMatch) {
			var resultset = rMatch[1];
		} else {
			// It's in an XPCNativeWrapper, so we have to do this black magic
			resultset = doc.forms.namedItem('main').elements.namedItem('resultset').value;
		}

		urls = [host+'/WebZ/DirectExport?numrecs=10:smartpage=directexport:entityexportnumrecs=10:entityexportresultset=' + resultset + ':entityexportrecno=' + number + ':sessionid=' + sessionid + ':entitypagenum=35:0'];
		processURLs(urls, url);
	} else {
		var items = Zotero.Utilities.getItemArray(doc, doc, '/WebZ/FSFETCH\\?fetchtype=fullrecord', '^(See more details for locating this item|Detailed Record)$');
		var urls = []
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				var nMatch = numberRegexp.exec(i);
				var rMatch = resultsetRegexp.exec(i);
				if (rMatch && nMatch) {
					var number = nMatch[1];
					var resultset = rMatch[1];
					urls.push(host+'/WebZ/DirectExport?numrecs=10:smartpage=directexport:entityexportnumrecs=10:entityexportresultset=' + resultset + ':entityexportrecno=' + number + ':sessionid=' + sessionid + ':entitypagenum=35:0');
				}	
			}
			processURLs(urls, url);
		});
	}	
}
