{
	"translatorID": "6c61897b-ca44-4ce6-87c1-2da68b44e6f7",
	"label": "Summon 2",
	"creator": "Caistarrin Mystical",
	"target": "https?://([^/]+\\.)?summon\\.serialssolutions\\.com",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2014-11-18 11:23:28"
}

/*
   Summon 2.0 Translator
   Copyright (C) 2014 ProQuest LLC
   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	if (ZU.xpath(doc, '//li//div[contains(@class, "summary")]').length > 0) {
		// Summon always shows a search results page, so it's multiple or nothing
		return "multiple";
	}

	return false;
}

function doWeb(doc, url) { 
	if (detectWeb(doc, url) == "multiple") {
		getTitles(doc, url);
	}
}

function getTitles(doc, url) {
	var titles = ZU.xpath(doc, '//li//div[contains(@class, "summary")]//div/@text');
	var items = new Object();
	var numRollups = 0;
	var rollupStart = 0;
	var refIndexes = [];

	for (var i = 0; i < titles.length; i++) {
		var isRollup = (ZU.xpath(titles[i], '.[ancestor::div[contains(@class, "rollup")]]').length > 0 ? true : false);
		var index = i + "-" + (isRollup ? "r" + numRollups++ : "");
			// the hyphen forces integers to string, keeping refs in order
			
		// "rollups" are the references in that separated "News results for [search terms]" section
		if (isRollup && rollupStart == 0) {
			rollupStart = i;
		}

		items[index] = ZU.cleanTags(titles[i].value);
	}

	Zotero.selectItems(items, function(items) {
		if (!items) {
			return true;
		}
		
		for (item in items) {
			// keeping the indexes of the refs we want
			refIndexes.push(item);
		}
		
		for (var i = 0; i < refIndexes.length; i++) {
			// converting the indexes into more meaningful numbers
			var rIndex = refIndexes[i].indexOf("r");
		
			if (rIndex > -1) {
				refIndexes[i] = refIndexes[i].slice(rIndex);
			}
			else {
				refIndexes[i] = refIndexes[i].slice(0, refIndexes[i].indexOf("-"));
			
				if (rollupStart > 0 && refIndexes[i] > rollupStart) {
					refIndexes[i] -= numRollups;
				}
			}
		}
		
		var apiData = getApiData(url, refIndexes);
		var documents = [];
		
		ZU.HTTP.doGet(
			apiData.urlSet, 
			function (text, response, url) {
				var obj = JSON.parse(text);
				var pageNumIndex = url.indexOf("pn=") + 3;
				var pageNum = url.slice(pageNumIndex, url.indexOf("&", pageNumIndex));
				var refIndexes = apiData.indexBlocks[pageNum];
				
				for (var i = 0; i < refIndexes.length; i++) {
					if (isNaN(refIndexes[i])) {
						// get the number past the r
						documents.push(obj.rollups.newspaper.documents[refIndexes[i].slice(1)]);
					}
					else {
						documents.push(obj.documents[refIndexes[i]]);
					}
				}
			},
			function () {
				getRefData(documents);
			}
		);
	});
}

function getRefData(documents) {	
	for (var i = 0; i < documents.length; i++) {
		var ref = documents[i];
		var item = new Zotero.Item(getRefType(ref));
		item.libraryCatalog = "Summon 2.0";
		item.creators = getAuthors(ref);
		item.title = Zotero.Utilities.cleanTags(ref.full_title);

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

		if (ref.issns && ref.issns.length > 0) {
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

		if (ref.editions && ref.editions.length > 0 && ref.editions != "1" && ref.editions.indexOf("1st") != 0) {
			// get any edition numbers after the 1st
			item.edition = ref.editions[0];
		}

		if (ref.lc_call_numbers && ref.lc_call_numbers.length > 0) {
			item.callNumber = ref.lc_call_numbers[0];
		}

		if (ref.publication_series_title) {
			item.seriesTitle = ref.publication_series_title;
		}

		if (ref.subject_terms && ref.subject_terms.length > 0) {
			for (var c = 0; c < ref.subject_terms.length; c++) {
				item.tags.push(ref.subject_terms[c]);
			}
		}

		item.complete();
	}
}

function getApiData(url, refIndexes) {
	var urlArray = decodeURI(url).split('?');
	var params = urlArray[1].split('&');
	var apiURL = urlArray[0].replace("#!", "api") + "?";
	var fvf = "";
	var urlSet = [];
	var pageNum = 0;
	var indexBlocks = {};

	for (var i = 0; i < params.length; i++) {
		if (params[i].indexOf("fvf=") > -1) {
			fvf = params[i].substring(4);
		}
		else {
			apiURL += params[i] + "&";
		}
	}

	if (fvf.length > 0) {
		var fvfArray = fvf.split('|');

		for (var i = 0; i < fvfArray.length; i++) {
			apiURL += "fvf[]=" + fvfArray[i] + "&";
		}
	}
	
	for (var i = 0; i < refIndexes.length; i++) {
		var isRollup = isNaN(refIndexes[i]);
		var currentPage = (isRollup || refIndexes[i] < 10 ? 1 : Math.ceil(refIndexes[i] / 10));
		// rollup indexes are "r*" (string) rather than integer, and are always on first page
		
		if (!indexBlocks[currentPage]) {
			indexBlocks[currentPage] = [];
		}
		
		if (isRollup) {
			indexBlocks[currentPage].push(refIndexes[i]);
		}
		else {
			indexBlocks[currentPage].push(refIndexes[i] - ((currentPage - 1) * 10));
		}

		if (currentPage > pageNum) {
			pageNum = currentPage;
			urlSet.push(apiURL + "pn=" + pageNum + "&ps=10");
		}
	}

	return {"urlSet": urlSet, "indexBlocks": indexBlocks};
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
		for (var i = 0; i < refAuthors.length; i++) {
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
			if (ref.isbn) {
				return "book";
			}
			else if (ref.dois || ref.issns) {
				return "journalArticle";
			}
			else {
				return "document";
			}
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
