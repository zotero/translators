{
	"translatorID": "6c61897b-ca44-4ce6-87c1-2da68b44e6f7",
	"label": "Summon 2",
	"creator": "Caistarrin Mystical",
	"target": "summon\\.serialssolutions\\.com",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-11-03 15:42:24"
}

function detectWeb(doc, url) {
	// Make sure the search actually returned something by checking whether the "no results" message is visible
	var noResultsMsg = ZU.xpath(doc, '//div[contains(@class, "noResults") and not(contains(@class, "ng-hide"))]');

	// Summon always shows a search results page, so it's multiple or nothing
	if(noResultsMsg.length == 0 || ZU.xpath(noResultsMsg, 'h2[contains(@class, "endOfResults")]').length > 0)
		return "multiple";
	else
		return false;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(type == "multiple") {
		var results = ZU.xpath(doc, '//li/div[contains(@class, "documentSummary")]//div[contains(@class, "summary")]');

		ZU.HTTP.doGet(getApiUrl(url, results.length), function(text) {
			var obj = JSON.parse(text);
			var items = new Object();
			var documents = [];

			if(obj.rollups.newspaper.documents) {
				var rollups = obj.rollups.newspaper;
				var rollupsPosition = rollups.position - 1;
				documents = obj.documents.slice(0, rollupsPosition).concat(rollups.documents).concat(obj.documents.slice(rollupsPosition));
			}
			else {
				documents = obj.documents;
			}

			for(var i = 0; i < documents.length; i++) {
				items[i] = ZU.cleanTags(documents[i].full_title);
			}

			Zotero.selectItems(items, function(items) {
				for(item in items) {
					var ref = documents[item];

					item = new Zotero.Item(getRefType(ref));

					if (ref.abstracts && ref.abstracts.length > 0) {
						item.abstractNote = ref.abstracts[0].abstract;
					}

					if (ref.languages && ref.languages.length > 0) {
						item.language = ref.languages[0];
					}

					if (ref.copyrights && ref.copyrights.length > 0) {
						item.rights = ref.copyrights[0];
					}

					if (ref.uris && ref.uris.length > 0) {
						item.url = ref.uris[0];
					}

					item.creators = getAuthors(ref);

					item.title = Zotero.Utilities.cleanTags(ref.full_title);

					if (ref.issns && ref.issns.length > 0){
						item.ISSN = ref.issns[0];
					}
					else if (ref.eissns && ref.eissns.length > 0) {
						item.ISSN = ref.eissns[0];
					}

					if (ref.isbn) {
						item.ISBN = ref.isbn;
					}

					if (ref.dois && ref.dois.length > 0) {
						item.DOI = ref.dois[0];
					}

					if (ref.publisher) {
						item.publisher = ref.publisher;
					}

					if (ref.publication_places && ref.publication_places.length > 0) {
						item.place = ref.publication_places[0];
					}
					else if (ref.dissertation_schools && ref.dissertation_schools.length > 0) {
						item.place = ref.dissertation_schools[0];
					}

					if (ref.publication_title) {
						item.publicationTitle = ref.publication_title;
					}

					if (ref.volumes && ref.volumes.length > 0) {
						item.volume = ref.volumes[0];
					}

					if (ref.issues && ref.issues.length > 0) {
						item.issue = ref.issues[0];
					}

					if (ref.pages) {
						item.pages = ref.pages;
					}
					else if (ref.start_pages && ref.start_pages.length > 0) {
						item.pages = ref.start_pages[0] + (ref.end_pages && ref.end_pages.length > 0 ? "-" + ref.end_pages[0] : "");
					}

					if (ref.page_count) {
						item.numPages = ref.page_count;
					}

					if (ref.publication_date) {
						item.date = ref.publication_date;
					}
					else if (ref.publication_years && ref.publication_years.length > 0) {
						item.date = ref.publication_years[ref.publication_years.length - 1];
					}

					if (ref.editions && ref.editions.length > 0) {
						item.edition = ref.editions[0];
					}

					if (ref.lc_call_numbers && ref.lc_call_numbers.length > 0) {
						item.callNumber = ref.lc_call_numbers[0];
					}

					if (ref.publication_series_title) {
						item.seriesTitle = ref.publication_series_title;
					}

					if(ref.subject_terms && ref.subject_terms.length > 0) {
						for(var i = 0; i < ref.subject_terms.length; i++) {
							item.tags.push(ref.subject_terms[i]);
						}
					}

					item.complete();
				}
			});
		});
	}
}

function getApiUrl(url, numResults) {
	var urlArray = decodeURI(url).split('?');
	var params = urlArray[1].split('&');
	var apiURL = urlArray[0].replace("#!", "api") + "?pn=1&ps=" + numResults;
	var fvf = "";

	for(var i = 0; i < params.length; i++) {
		if(params[i].indexOf("fvf=") > -1) {
			fvf = params[i].substring(4);
		}
		else {
			apiURL += "&" + params[i];
		}
	}

	if(fvf.length > 0) {
		var fvfArray = fvf.split('|');

		for(var i = 0; i < fvfArray.length; i++) {
			apiURL += "&fvf[]=" + fvfArray[i];
		}
	}

	Z.debug(apiURL);

	return apiURL;
}

function getAuthors(ref) {
	var itemAuthors = [];
	var refAuthors = [];
	var isCorporate = false;

	if (ref.authors && ref.authors.length > 0) {
		refAuthors = ref.authors;
	}
	else if (ref.corporate_authors && ref.corporate_authors.length > 0) {
		refAuthors = ref.corporate_authors;
		isCorporate = true;
	}

	if (refAuthors.length > 0) {
		for(var i = 0; i < refAuthors.length; i++) {
			var a = refAuthors[i];
			if (a.givenname && a.surname) {
				itemAuthors.push({
					"firstName": a.givenname,
					"lastName": a.surname,
					"creatorType": "author"
				});
			}
			else {
				var name = a.fullname ? a.fullname : (a.name ? a.name : "");

				if (name.length > 0) {
					itemAuthors.push(Zotero.Utilities.cleanAuthor(name, "author", isCorporate ? true : name.indexOf(',') > -1));
				}
			}
		}
	}

	return itemAuthors;
}

function getRefType(ref) {
	var type = ref.content_type;

	switch(type) {
		case "Audio Recording":
		case "Music Recording":
			return "audioRecording";
			break;
		case "Book":
		case "eBook":
			return "book";
			break;
		case "Book Chapter":
			return "bookSection";
			break;
		case "Case":
			return "case";
			break;
		case "Conference Proceeding":
			return "conferencePaper";
			break;
		case "Dissertation":
			return "thesis";
			break;
		case "Image":
		case "Photograph":
			return "artwork";
			break;
		case "Journal Article":
		case "Journal":
		case "eJournal":
		case "Book Review":
		case "Newsletter":
			return "journalArticle";
			break;
		case "Magazine":
		case "Magazine Article":
			return "magazineArticle";
			break;
		case "Manuscript":
			return "manuscript";
			break;
		case "Map":
			return "map";
			break;
		case "Newspaper Article":
		case "Newspaper":
			return "newspaperArticle";
			break;
		case "Presentation":
			return "presentation";
			break;
		case "Reference":
		case "Publication Article":
			return "encyclopediaArticle";
			break;
		case "Report":
		case "Technical Report":
		case "Data Set":
		case "Market Research":
		case "Trade Publication Article":
		case "Paper":
			return "report";
			break;
		case "Video Recording":
			return "videoRecording";
			break;
		case "Web Resource":
			return "webpage";
			break;
		case "Poem":
		case "Electronic Resource":
			if (ref.isbn)
				return "book";
			else if (ref.dois || ref.issns)
				return "journalArticle";
			else
				return "document";
			break;
		case "Archival Material":
		case "Computer File":
		case "Course Reading":
		case "Government Document":
		case "Kit":
		case "Microform":
		case "Music Score":
		case "Publication":
		case "Realia":
		case "Research Guide":
		case "Special Collection":
		case "Standard":
		case "Transcript":
		default:
			return "document";
	}
}