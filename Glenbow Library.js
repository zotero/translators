{
	"translatorID": "330f283f-12e9-4421-aa59-e17ec5f4aa37",
	"label": "Glenbow Library",
	"creator": "Adam Crymble",
	"target": "^https?://ww2\\.glenbow\\.org/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-03 02:28:26"
}

function detectWeb(doc, url) {

	if (doc.title.match("Library Main Catalogue Search Results") && doc.location.href.match("GET_RECORD")) {
			return "book";
	} else if
		(doc.title.match("Library Map Collection Search Results") && doc.location.href.match("GET_RECORD")) {
			return "map";

	} else if
		(doc.title.match("Library Main Catalogue Search Results") && !(doc.location.href.match("GET_RECORD"))) {
			return "multiple";
	} else if
		(doc.title.match("Map Collection Search Results") && !(doc.location.href.match("GET_RECORD"))) {
			return "multiple";
	}
}

//Translator for the Glenbow Museum Collection. Code by Adam Crymble
//Only works for Library Main Catalogue and Map Collection. The other categories do not have stable URLs for individual entries.


function associateContent (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape (doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	} : null;

	var fieldTitle = new Array();
	var tagsContent = new Array();

	if (detectWeb(doc, url) == "book") {

		newItem = new Zotero.Item("book");
		authorType= "author";

	} else if (detectWeb(doc, url) == "map") {

		newItem = new Zotero.Item("map");
		authorType= "cartographer";
	}

		var dataTags= new Object();
		var authorType;
		var organizeName;

	if (doc.evaluate('//tr/td/p', doc, nsResolver, XPathResult.ANY_TYPE, null)) {
		var xPathContent = doc.evaluate('//tr/td/p', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var xPathCount = doc.evaluate('count (//tr/td/p)', doc, nsResolver, XPathResult.ANY_TYPE, null);

			for (var i = 0; i < xPathCount.numberValue; i++) {

				fieldTitle= xPathContent.iterateNext().textContent;

				var separate = fieldTitle.indexOf(":");
				var fieldTitle1 = fieldTitle.substr(0, separate);
				fieldTitle1 = fieldTitle1.replace(/\s+/g, '');

				var fieldContent = fieldTitle.substr(separate + 2);

				dataTags[fieldTitle1] = (fieldContent);

			}


		//names start
			if (dataTags["Names"]) {

			//if there are multiple authors:
				if (dataTags["Names"].match("\n")) {
					var multipleNames = dataTags["Names"].split("\n");

					for (j = 0; j < multipleNames.length; j++) {
						if (detectWeb(doc, url) == "book") {
							multipleNames[j] = multipleNames[j].substr(3);

						} else if (detectWeb(doc, url) == "map") {
							multipleNames[j] = multipleNames[j];
						}

						if (multipleNames[j].match(/\,/)) {

							organizeName = multipleNames[j].split(",");
							organizeName = (organizeName[1] + (" ") + organizeName[0]);
							newItem.creators.push(Zotero.Utilities.cleanAuthor(organizeName, authorType));

						} else {
							newItem.creators.push({lastName: multipleNames[j], creatorType: authorType});
						}

					}

			//if there is 1 human author
				} else if (dataTags["Names"].match(/\,/)) {
					if (detectWeb(doc, url) == "book") {
						var organizeName = dataTags["Names"].substr(3).split(",");

					} else if (detectWeb(doc, url) == "map") {
						var organizeName = dataTags["Names"].split(",");
					}

					organizeName = (organizeName[1] + (" ") + organizeName[0]);
					newItem.creators.push(Zotero.Utilities.cleanAuthor(organizeName,authorType));

			//if there is 1 corporate author
				} else {
					if (detectWeb(doc, url) == "book") {
						newItem.creators.push({lastName: dataTags["Names"].substr(3), creatorType: authorType});

					} else if (detectWeb(doc, url) == "map") {
						newItem.creators.push({lastName: dataTags["Names"], creatorType: authorType});

					}
				}
			}

		//tags start
			if (dataTags["Subjects"]) {
				if (dataTags["Subjects"].match("\n")) {
					var multipleSubjects= dataTags["Subjects"].split("\n");

					for (j = 0; j < multipleSubjects.length; j++) {
						multipleSubjects[j] = multipleSubjects[j].substr(3);
						tagsContent.push(Zotero.Utilities.cleanTags(multipleSubjects[j]));
					}
				} else {
					dataTags["Subjects"] = dataTags["Subjects"].substr(3);
					tagsContent.push(Zotero.Utilities.cleanTags(dataTags["Subjects"]));
				}

				for (var y = 0; y < tagsContent.length; y++) {
					newItem.tags[y] = tagsContent[y];
				}
			}

		//book publisher info start
			if (dataTags["PublishingInformation"]) {
					dataTags["PublishingInformation"] = dataTags["PublishingInformation"].replace(/\[|\]*/g, '');

					var pubLoc= dataTags["PublishingInformation"].split(":");
					if (pubLoc[1]) {
						dataTags["Place"] = pubLoc[0];

						var pubAndDate = pubLoc[1].split(",");
						dataTags["Publisher"] = pubAndDate[0];
						dataTags["Date"] = pubAndDate[1];
					} else {
						associateContent (newItem, dataTags, "PublishingInformation", "date");
					}
			}

		//accession number start
			if (dataTags["Accessionnumber"]) {

				dataTags["Accessionnumber"] = ("Accession number: " + dataTags["Accessionnumber"]);
			}

			if (dataTags["CallNumber"]) {
				if (dataTags["CallNumber"] == ' ') {
					dataTags["CallNumber"] = "None";
					Zotero.debug(dataTags["CallNumber"]);
				}
			}
		}
			associateContent (newItem, dataTags, "CallNumber", "callNumber");
			associateContent (newItem, dataTags, "Title", "title");
			associateContent (newItem, dataTags, "Place", "place");
			associateContent (newItem, dataTags, "Publisher", "publisher");
			associateContent (newItem, dataTags, "Date", "date");
			associateContent (newItem, dataTags, "Description", "pages");
			associateContent (newItem, dataTags, "Edition", "edition");
			associateContent (newItem, dataTags, "Notes", "abstractNote");
			associateContent (newItem, dataTags, "Accessionnumber", "extra");
			associateContent (newItem, dataTags, "Scale", "scale");

			newItem.url = doc.location.href;
			if (!newItem.title) newItem.title = "New Search Terms Suggested"
			newItem.complete();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var articles = new Array();
	var dataTags = new Object();
	var titleList = new Array();
	var uris = new Array();
	var next_title= new Array();

	if (detectWeb(doc, url) == "multiple") {

	//checks multiple entries for a link to a single entry page.
		if (doc.evaluate('//td/div[@class="floatRight"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null)) {

			var items = new Object();
			var titles = doc.evaluate('//td/p', doc, nsResolver, XPathResult.ANY_TYPE, null);

			var xPathMultiCount = doc.evaluate('count (//td/p)', doc, nsResolver, XPathResult.ANY_TYPE, null);


				for (var i = 0; i < xPathMultiCount.numberValue; i++) {

					articles= titles.iterateNext().textContent;

					var separateMulti = articles.indexOf(":");
					var articles1 = articles.substr(0, separateMulti);
					articles1 = articles1.replace(/\s+/g, '');

					var multiContent = articles.substr(separateMulti + 2);

					dataTags[articles1] = (multiContent);

					if (articles1 == "Title") {
						titleList.push(dataTags["Title"]);
					}
					if (articles1 == "See") {
						titleList.push("skip");
					}
				}
			var links = doc.evaluate('//td/div[@class="floatRight"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var xPathLinksCount = doc.evaluate('count (//td/div[@class="floatRight"]/a)', doc, nsResolver, XPathResult.ANY_TYPE, null);

			for (i=0; i<xPathLinksCount.numberValue; i++) {
				next_title.push(links.iterateNext().href);
				if (titleList[i] != "skip") {
					items[next_title] = titleList[i];
				}
			}

			items = Zotero.selectItems(items);

			for (var i in items) {
				uris.push(i);
			}

		}

//code if single entry only.
	} else {
		uris = [url];
	}

	Zotero.Utilities.processDocuments(uris, scrape, function() {Zotero.done();});
	Zotero.wait();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ww2.glenbow.org/search/libraryMainResults.aspx?AC=GET_RECORD&XC=/search/libraryMainResults.aspx&BU=&TN=GLENCAT&SN=AUTO24715&SE=1581&RN=8&MR=20&TR=0&TX=1000&ES=0&CS=0&XP=&RF=WebResults&EF=&DF=WebResultsDetails&RL=0&EL=0&DL=0&NP=255&ID=&MF=WPEngMsg.ini&MQ=&TI=0&DT=&ST=0&IR=56813&NR=0&NB=0&SV=0&BG=&FG=&QS=LibraryMainSearch&OEX=ISO-8859-1&OEH=ISO-8859-1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Marlene A.D. Lynne Van",
						"lastName": "Luven",
						"creatorType": "author"
					},
					{
						"firstName": "Priscilla L.",
						"lastName": "Walton",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Popular culture - Canada",
					"Canada - Social life and customs - 20th century"
				],
				"seeAlso": [],
				"attachments": [],
				"callNumber": "306.40971 P831",
				"title": "Pop Can : popular culture in Canada / edited by Lynne Van Luven, Priscilla L. Walton",
				"place": "Scarborough, Ont.",
				"publisher": "Prentice Hall Allyn and Bacon Canada",
				"date": "c1999.",
				"pages": "xii, 237 p. ; 24 cm.",
				"abstractNote": "Includes bibliographical references and index.",
				"extra": "Accession number: [99092222]",
				"url": "http://ww2.glenbow.org/search/libraryMainResults.aspx?AC=GET_RECORD&XC=/search/libraryMainResults.aspx&BU=&TN=GLENCAT&SN=AUTO24715&SE=1581&RN=8&MR=20&TR=0&TX=1000&ES=0&CS=0&XP=&RF=WebResults&EF=&DF=WebResultsDetails&RL=0&EL=0&DL=0&NP=255&ID=&MF=WPEngMsg.ini&MQ=&TI=0&DT=&ST=0&IR=56813&NR=0&NB=0&SV=0&BG=&FG=&QS=LibraryMainSearch&OEX=ISO-8859-1&OEH=ISO-8859-1",
				"libraryCatalog": "Glenbow Library",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Pop Can"
			}
		]
	}
]
/** END TEST CASES **/