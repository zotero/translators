{
	"translatorID": "fce388a6-a847-4777-87fb-6595e710b7e7",
	"label": "ProQuest",
	"creator": "Avram Lyon",
	"target": "^https?://search\\.proquest\\.com.*\\/(docview|results|publicationissue| browseterms|browsetitles|browseresults|myresearch\\/(figtables|documents)).*",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-25 11:53:22"
}

/*
   ProQuest Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

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

	//Check for multiple first
	if (/\/(results|publicationissue|browseterms|browsetitles|browseresults|myresearch)\//.test(url)) {
		Zotero.debug("url match")
		var resultitem = doc.evaluate('//a[contains(@href, "/docview/")]', doc, null, XPathResult.ANY_TYPE, null);
		if (resultitem.iterateNext()) {
			return "multiple";
		}
	}
	var record_rows = doc.evaluate('//div[@class="display_record_indexing_row"]', doc, null, XPathResult.ANY_TYPE, null);
	if (record_rows.iterateNext()) {
		var sourceType = doc.evaluate('//div[@class="display_record_indexing_fieldname" and contains(text(),"Source type")]/following-sibling::div[@class="display_record_indexing_data"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		var documentType = doc.evaluate('//div[@class="display_record_indexing_fieldname" and contains(text(),"Document type")]/following-sibling::div[@class="display_record_indexing_data"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		var recordType = doc.evaluate('//div[@class="display_record_indexing_fieldname" and contains(text(),"Record type")]/following-sibling::div[@class="display_record_indexing_data"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if (sourceType) {
			sourceType = sourceType.textContent.trim();
		}
		if (documentType) {
			documentType = documentType.textContent.trim();
		}
		if (recordType) {
			recordType = recordType.textContent.trim();
		}
		//hack for NYTs, which misses crucial data.
		var nytpath = '//div[@class="display_record_indexing_fieldname" and contains(text(),"Database")]/following-sibling::div[@class="display_record_indexing_data"]'
		if (ZU.xpathText(doc, nytpath) !=null){
			if (ZU.xpathText(doc, nytpath).indexOf("The New York Times") !== -1) sourceType ="Historical Newspapers";
		}
		var type = getItemType(sourceType, documentType, recordType)

		if (type) {
			return type;
		} else if (url.match(/\/dissertations\//)) {
			return "thesis";
		}
		// Fall back on journalArticle-- even if we couldn't guess the type
		return "journalArticle";
	}
	if (url.indexOf("/results/") === -1) {
		var abstract_link = doc.evaluate('//a[@class="formats_base_sprite format_abstract"]', doc, null, XPathResult.ANY_TYPE, null);
		if (abstract_link.iterateNext()) {
			return "journalArticle";
		}
	}
	return false;
}

function doWeb(doc, url) {
	var detected = detectWeb(doc, url);
	if (detected && detected != "multiple") {
		scrape(doc, url);
	} else if (detected) {
		// detect web returned multiple
		var articles = new Array();
		var results = doc.evaluate('//a[contains(@class,"previewTitle") or contains(@class,"resultTitle")]', doc, null, XPathResult.ANY_TYPE, null);
		var items = new Array();
		var result;
		while (result = results.iterateNext()) {
			var title = result.textContent;
			var url = result.href;
			items[url] = title;
		}
		// If the above didn't get us titles, try agin with a more liberal xPath
		if (!title) {
			results = doc.evaluate('//a[contains(@href, "/docview/")]', doc, null, XPathResult.ANY_TYPE, null);
			while (result = results.iterateNext()) {
				var title = result.textContent;
				var url = result.href;
				items[url] = title;
			}
		}
		Zotero.selectItems(items, function (items) {
			if (!items) return true;
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
		});
		Zotero.wait();
	}
}

function scrape(doc) {
	var record_rows = doc.evaluate('//div[@class="display_record_indexing_row"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	var abstract_link = doc.evaluate('//a[@class="formats_base_sprite format_abstract"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (!record_rows && abstract_link) {
		Zotero.Utilities.processDocuments(abstract_link.href, scrape, function () {
			Zotero.done();
		});
		return true;
	}
	var url = doc.location.href;

	// ProQuest provides us with two different data sources; we can pull the RIS
	// (which is nicely embedded in each page!), or we can scrape the Display Record section
	// We're going to prefer the latter, since it gives us richer data.
	// But since we have it without an additional request, we'll see about falling back on RIS for missing data
	var item = new Zotero.Item();
	var record_rows = doc.evaluate('//div[@class="display_record_indexing_row"]', doc, null, XPathResult.ANY_TYPE, null);
	var record_row;
	item.place = [];
	item.thesisType = [];
	var account_id;
	while (record_row = record_rows.iterateNext()) {
		var field = doc.evaluate('./div[@class="display_record_indexing_fieldname"]', record_row, null, XPathResult.ANY_TYPE, null).iterateNext()
		if (!field) continue;
		field = field.textContent.trim();
		var value = doc.evaluate('./div[@class="display_record_indexing_data"]', record_row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.trim();
		// Separate values in a single field are generally wrapped in <a> nodes; pull a list of them
		var valueAResult = doc.evaluate('./div[@class="display_record_indexing_data"]//a', record_row, null, XPathResult.ANY_TYPE, null);
		var valueA;
		var valueAArray = [];
		// We would like to get an array of the text for each <a> node
		if (valueAResult) {
			while (valueA = valueAResult.iterateNext()) {
				valueAArray.push(valueA.textContent);
			}
		}
		switch (field) {
		case "Title":
			item.title = ZU.capitalizeTitle(value);
			if (item.title == item.title.toUpperCase()) {
				item.title = Zotero.Utilities.capitalizeTitle(item.title.toLowerCase(), true);
			}
			break;
		case "Author":
			if (value.indexOf(' and ')!=-1 || value.indexOf(' AND ')!=-1){
				//sometimes we do have multiple authors in one node
				author = value.replace(/By\s*/, "").replace(/Special\s+to.+/, "");
				var authors = author.split(/ [Aa][Nn][Dd] /);
				for (var i in authors){
					if (authors[i] == authors[i].toUpperCase()) {
						item.creators[i] = ZU.cleanAuthor(ZU.capitalizeTitle(authors[i].toLowerCase(), true), "author");
					}	
				else item.creators[i] = ZU.cleanAuthor(authors[i], "author");
				}
			}
			else{
			item.creators = valueAArray.map(
			function (author) {
				return Zotero.Utilities.cleanAuthor(author, "author", author.indexOf(',') !== -1); // useComma
			});}
			break;

			//for me the tag is always "Author" but let's keep "Authors" to be safe.
		case "Authors":
			item.creators = valueAArray.map(

			function (author) {
				return Zotero.Utilities.cleanAuthor(author, "author", author.indexOf(',') !== -1); // useComma
			});
			break;
		case "Editor":
			getEditors(item, value);
		case "Publication title":
			item.publicationTitle = value;
			break;
		case "Volume":
			item.volume = value;
			break;
		case "Issue":
			item.issue = value;
			break;
		case "Pages":
		case "First Page":
			item.pages = value;
			break;
		case "First page":
			item.pages = value;
			break;
		case "Number of pages":
			item.numPages = value;
			break;
		case "Publication year":
		case "Year":
			item.date = (item.date) ? item.date : value;
			break;
		case "Publication date":
			item.date = value;
			break;
		case "Publisher":
			item.publisher = value;
			break;
		case "Place of publication":
			// TODO Change to publisher-place when schema changes
			item.place[0] = value;
			break;
		case "Dateline":
			// TODO Change to event-place when schema changes
			item.place[0] = value;
			break;
		case "School location":
			// TODO Change to publisher-place when schema changes
			item.place[0] = value;
			break;
			// blacklisting country-- ProQuest regularly gives us Moscow, United States
			//case "Country of publication":
			//		item.place[1] = value; break;
		case "ISSN":
			item.ISSN = value;
			break;
		case "ISBN":
			item.ISBN = value;
			break;
		case "DOI":
			item.DOI = value;
			break;
		case "Patent information":
			Zotero.debug("Patent information: " + value);
			item.patentNumber = between(value, "Publication number: ", "Publication country: ");
			item.country = between(value, "Publication country: ", "Application number: ")
			item.applicationNumber = between(value, "Application number: ", "Application Date: ")
			item.date = value.slice("Application number: ".length + value.indexOf("Application number: "))
			break;
		case "School":
			item.university = value;
			break;
		case "Degree":
			item.thesisType[0] = value;
			break;
		case "Department":
			item.thesisType[1] = value;
			break;
		case "Advisor":
			// TODO Map when exists in Zotero
			break;
		case "Source type":
			var sourceType = value;
			break;
		case "Document type":
			var documentType = value;
			break;
		case "Record type":
			var recordType = value;
			break;
		case "Copyright":
			item.rights = value;
			break;
		case "Database":
			//NYTs hack
			if (value.indexOf("The New York Times")!== -1){
				item.publication = "The New York Times"
				//hack for NYTs, which misses crucial data.
				sourceType ="Historical Newspapers";
			}
			value = value.replace(/^\d\s+databasesView list\s+Hide list/, '');
			value = value.replace(/(ProQuest.*)(ProQuest.*)/, '$1; $2');
			item.libraryCatalog = value;
			break;
		case "Document URL":
			item.attachments.push({
				url: value.replace(/\?accountid=[0-9]+$/, '') + "/abstract",
				title: "ProQuest Record",
				mimeType: "text/html"
			});
			break;
		case "ProQuest document ID":
			item.callNumber = value;
			break;
		case "Language of publication":
			item.language = value;
			break;
		case "Section":
			item.section = value;
			break;
		case "Identifiers / Keywords":
			item.tags = value.split(', ');
			break;
		case "Identifier / keyword":
			item.tags = value.split(', ');
			break;
		case "Subjects":
			item.tags = valueAArray;
			break;
		case "Subject":
			item.tags = valueAArray;
			break;
		default:
			Zotero.debug("Discarding unknown field '" + field + "' => '" + value + "'");
		}
	}
	Z.debug("sourceType: " + sourceType)
	item.itemType = getItemType(sourceType, documentType, recordType)

	var abs = ZU.xpathText(doc, '//div[contains(@id, "abstract_field") or contains(@id, "abstractSummary")]//p');
	if (abs) {
		//Z.debug(abs);
		item.abstractNote = abs.replace(/\[*\s*[Ss]how all\s*[\]\s{3,}].*/, "").replace(/[\[\s{3,}]\s*[Ss]how less\s*\]*.*/, "").replace(/\[\s*PUBLICATION ABSTRACT\s*\]/, "").replace(/^\s*,/, "") //remove commas at beginning and end
		.replace(/[\s*,\s*]*$/, "").trim();
	}

	item.place = item.place.join(', ');
	item.thesisType = item.thesisType.join(', ');
	item.URL = doc.location.href;
	item.proceedingsTitle = item.publicationTitle;

	// On historical newspapers, we see:
	// Rights: Copyright New York Times Company Dec 1, 1852
	// Date: 1852
	// We can improve on this, so we do, but if there's no full-text there's no item.rights, so first test for that.
	if (item.rights) {
		var fullerDate = item.rights.match(/([A-Z][a-z]{2} \d{1,2}, \d{4}$)/);
	}
	if ((!item.date || item.date.match(/^\d{4}$/)) && fullerDate) {
		item.date = fullerDate[1];
	}
	//Getting authors for NYT
	if (!item.creators.length){
		var author = ZU.xpathText(doc, '//span[@class="titleAuthorETC small"]/a');
		if (author!=null) {
			author = author.replace(/By\s*/, "").replace(/Special\s+to.+/, "");
			var authors = author.split(/ [Aa][Nn][Dd] /);
			for (var i in authors){
				if (authors[i] == authors[i].toUpperCase()) {
					item.creators[i] = ZU.cleanAuthor(ZU.capitalizeTitle(authors[i].toLowerCase(), true), "author");
				}	
				else item.creators[i] = ZU.cleanAuthor(authors[i], "author");
			}
		}	
	}
	if (!item.itemType && item.libraryCatalog && item.libraryCatalog.match(/Historical Newspapers/)) item.itemType = "newspaperArticle";

	if (!item.itemType) item.itemType = "journalArticle";

	// Ok, now we'll pull the RIS and run it through the translator. And merge with the temporary item.
	// RIS LOGIC GOES HERE
	// Sometimes the PDF is right on this page
	var realLink = doc.evaluate('//div[@id="pdffailure"]/div[@class="body"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (realLink) {
		item.attachments.push({
			url: realLink.href,
			title: "ProQuest PDF",
			mimeType: "application/pdf"
		});
		item.complete();
	} else {
		// The PDF link requires two requests-- we fetch the PDF full text page
		var pdfNodes = doc.evaluate('//a[@class="formats_base_sprite format_pdf"]', doc, null, XPathResult.ANY_TYPE, null);
		var pdfs = [];
		var pdf;
		var full = false;
		while (pdf = pdfNodes.iterateNext()) {
			pdfs.push(pdf.href);
		}

		if (pdfs.length == 0) {
			item.complete();
			return;
		}

		Zotero.Utilities.processDocuments(pdfs, function (pdfDoc) {
			// This page gives a beautiful link directly to the PDF, right in the HTML
			realLink = pdfDoc.evaluate('//div[@id="pdffailure"]/div[@class="body"]/a', pdfDoc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (realLink) {
				item.attachments.push({
					url: realLink.href,
					title: "ProQuest PDF",
					mimeType: "application/pdf"
				});
			}
		}, function () {
			item.complete()
		});
	}
}

// This map is not complete. See debug output to catch unassigned types
function mapToZotero(type) {
	var map = {
		"Scholarly Journals": "journalArticle",
		"Book Review-Mixed": false,
		// FIX AS NECESSARY
		"Reports": "report",
		"REPORT": "report",
		"Historical Newspapers": "newspaperArticle",
		"Newspapers": "newspaperArticle",
		//"News" : "newspaperArticle",	// Otherwise Foreign Policy is treated as a newspaper http://search.proquest.com/docview/840433348
		"Magazines": "magazineArticle",
		"Dissertations & Theses": "thesis",
		"Dissertation/Thesis": "thesis",
		"Conference Papers & Proceedings": "conferencePaper",
		"Wire Feeds": "newspaperArticle",
		// Good enough?
		"WIRE FEED": "newspaperArticle" // Good enough?
	}
	if (map[type]) return map[type];
	Zotero.debug("No mapping for type: " + type);
	return false;
}

function getEditors(item, value) {
	if (value.match(", ")) {
		var editors = value.split(", ");
		for (var i in editors) {
			item.creators.push(Zotero.Utilities.cleanAuthor(editors[i], "editor"));
		}
	} else {
		item.creators.push(Zotero.Utilities.cleanAuthor(value, "editor"));
	}
}

function getItemType(sourceType, documentType, recordType) {
	switch (sourceType) {
	case "Blogs, Podcats, & Websites":
		if (recordType == "Article In An Electronic Resource Or Web Site") {
			return "blogPost"
		} else {
			return "webpage";
		}
		break;
	case "Books":
		if (documentType == "Book Chapter") {
			return "bookSection"
		} else {
			return "book";
		}
		break;
	case "Conference Papers and Proceedings":
		return "conferencePaper";
		break;
	case "Dissertations & Theses":
		return "thesis";
		break;
	case "Encyclopedias & Reference Works":
		if (documentType.indexOf("book", 0) != -1) {
			return "book"
		} else {
			return "encyclopediaArticle"
		}
		break;
	case "Government & Official Publications":
		if (documentType == "Patent") {
			return "patent"
		} else if (documentType.indexOf("report", 0) != -1) {
			return "report"
		} else if (documentType.indexOf("statute", 0) != -1) {
			return "statute"
		}
		break;
	case "Historical Newspapers":
		return "newspaperArticle";
		break;
	case "Historical Periodicals":
		return "journalArticle";
		break;
	case "Magazines":
		return "magazineArticle";
		break;
	case "Newpapers":
		return "newspaperArticle";
		break;
	case "Pamphlets & Ephemeral Works":
		if (documentType == Feature) {
			return "journalArticle"
		} else {
			return "document"
		}
		break;
	case "Reports":
		return "report";
		break;
	case "Scholarly Journals":
		return "journalArticle";
		break;
	case "Trade Journals":
		return "journalArticle";
		break;
	case "Wire Feeds":
		return "newspaperArticle";
		break;
	}
	switch (documentType) {
	case "Blog":
		return "blogPost";
		break;
	case "Patent":
		return "patent";
		break;
	}
	switch (recordType) {
	case "Article In An Electronic Resource Or Web Site":
		return "blogPost";
		break;
	case "Patent":
		return "patent";
		break;
	}
	if (mapToZotero(sourceType)) {
		return mapToZotero(sourceType)
	}
	return "journalArticle"
}

function between(str, x, y) {
	return str.slice(x.length + str.indexOf(x), str.indexOf(y));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://search.proquest.com/dissertations/docview/251755786/abstract/132B8A749B71E82DBA1/1?accountid=14512",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Valleri Jane",
						"lastName": "Robinson",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Communication and the arts",
					"Stanislavsky",
					"Konstantin",
					"Konstantin Stanislavsky",
					"Russian",
					"Modernism",
					"Theater"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ProQuest Record",
						"mimeType": "text/html"
					},
					{
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					}
				],
				"place": "United States -- Ohio",
				"thesisType": "Ph.D.",
				"title": "Beyond Stanislavsky: The influence of Russian modernism on the American theatre",
				"pages": "233 p.",
				"date": "2001",
				"section": "0168",
				"ISBN": "9780493440408, 0493440402",
				"university": "The Ohio State University",
				"callNumber": "251755786",
				"rights": "Copyright UMI - Dissertations Publishing 2001",
				"libraryCatalog": "Dissertations & Theses @ CIC InstitutionsProQuest Dissertations & Theses (PQDT)",
				"abstractNote": "Russian modernist theatre greatly influenced the development of American theatre during the first three decades of the twentieth century. Several developments encouraged the relationships between Russian artists and their American counterparts, including key tours by Russian artists in America, the advent of modernism in the American theatre, the immigration of Eastern Europeans to the United States, American advertising and consumer culture, and the Bolshevik Revolution and all of its domestic and international ramifications. Within each of these major and overlapping developments, Russian culture became increasingly acknowledged and revered by American artists and thinkers, who were seeking new art forms to express new ideas. This study examines some of the most significant contributions of Russian theatre and its artists in the early decades of the twentieth century. Looking beyond the important visit of the Moscow Art Theatre in 1923, this study charts the contributions of various Russian artists and their American supporters. ,  Certainly, the influence of Stanislavsky and the Moscow Art Theatre on the modern American theatre has been significant, but theatre historians' attention to his influence has overshadowed the contributions of other Russian artists, especially those who provided non-realistic approaches to theatre. In order to understand the extent to which Russian theatre influenced the American stage, this study focuses on the critics, intellectuals, producers, and touring artists who encouraged interaction between Russians and Americans, and in the process provided the catalyst for American theatrical experimentation. The key figures in this study include some leaders in the Yiddish intellectual and theatrical communities in New York City, Morris Gest and Otto H. Kahn, who imported many important Russian performers for American audiences, and a number of Russian émigré artists, including Jacob Gordin, Jacob Ben-Ami, Benno Schneider, Boris Aronson, and Michel Fokine, who worked in the American theatre during the first three decades of the twentieth century.",
				"URL": "http://search.proquest.com/dissertations/docview/251755786/abstract/132B8A749B71E82DBA1/1?accountid=14512",
				"shortTitle": "Beyond Stanislavsky"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/docview/213445241",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Gerald F.",
						"lastName": "Powers",
						"creatorType": "author"
					},
					{
						"firstName": "Drew",
						"lastName": "Christiansen",
						"creatorType": "author"
					},
					{
						"firstName": "Robert T.",
						"lastName": "Hennemeyer",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Peace",
					"Book reviews"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ProQuest Record",
						"mimeType": "text/html"
					}
				],
				"place": "Winnipeg",
				"title": "Peacemaking: moral & policy challenges for a new world // Review",
				"publicationTitle": "Peace Research",
				"volume": "27",
				"issue": "2",
				"pages": "90-100",
				"numPages": "0",
				"date": "May 1995",
				"publisher": "Menno Simons College",
				"ISSN": "00084697",
				"language": "English",
				"callNumber": "213445241",
				"rights": "Copyright Peace Research May 1995",
				"libraryCatalog": "CBCA Reference & Current Events",
				"abstractNote": "In his \"Introduction\" to the book entitled Peacemaking: Moral and Policy Challenges for a New World, Rev. Drew Christiansen points out that the Roman Catholic bishops of the United States have made a clear distinction between the social teachings of the Church--comprising universally binding moral and ethical principles--and the particular positions they have taken on public policy issues--such as those relating to war, peace, justice, human rights and other socio-political matters. While the former are not to be mitigated under any circumstances, the latter, being particular applications, observations and recommendations, can allow for plurality of opinion and diversity of focus in the case of specific social, political and opinion and diversity of focus in the case of specific social, political and moral issues.(f.1)  Peacemaking aligns itself with this second category.  The objectives of this review  essay are the following: to summarize the main topics and themes, of some of the recently-published documents on Catholic political thought, relating to peacemaking and peacekeeping; and to provide a brief critique of their main contents, recommendations and suggestions. ,  The Directions of Peacemaking: As in the earlier documents, so too are the virtues of faith, hope, courage, compassion, humility, kindness, patience, perseverance, civility and charity emphasized, in The Harvest of Justice, as definite aids in peacemaking and peacekeeping.  The visions of global common good, social and economic development consistent with securing and nurturing conditions for justice and peace, solidarity among people, as well as cooperation among the industrial rich and the poor developing nations are also emphasized as positive enforcements in the peacemaking and peacekeeping processes.  All of these are laudable commitments, so long as they are pursued through completely pacifist perspectives.  The Harvest of Justice also emphasizes that, \"as far as possible, justice should be sought through nonviolent means;\" however, \"when sustained attempt at nonviolent action fails, then legitimate political authorities are permitted as a last resort to employ limited force to rescue the innocent and establish justice.\"(f.13)  The document also frankly admits that \"the vision of Christian nonviolence is not passive.\"(f.14)  Such a position may disturb many pacifists.  Even though some restrictive conditions--such as a \"just cause,\" \"comparative justice,\" legitimate authority\" to pursue justice issues, \"right intentions,\" probability of success, proportionality of gains and losses in pursuing justice, and the use of force as last resort--are indicated and specified in the document, the use of violence and devastation are sanctioned, nevertheless, by its reaffirmation of the use of force in setting issues and by its support of the validity of the \"just war\" tradition. ,  The first section, entitled \"Theology, Morality, and Foreign Policy in A New World,\" contains four essays.  These deal with the new challenges of peace, the illusion of control, creating peace conditions through a theological framework, as well as moral reasoning and foreign policy after the containment.  The second, comprising six essays, is entitled \"Human Rights, Self-Determination, and Sustainable Development.\"  These essays deal with effective human rights agenda, religious nationalism and human rights, identity, sovereignty, and self-determination, peace and the moral imperatives of democracy, and political economy of peace.  The two essays which comprise the third section, entitled \"Global Institutions,\" relate the strengthening of the global institutions and action for the future. The fourth, entitled \"The Use of Force After the Cold War,\" is both interesting and controversial.  Its six essays discuss ethical dilemmas in the use of force, development of the just-war tradition, in a multicultural world, casuistry, pacifism, and the just-war tradition, possibilities and limits of humanitarian intervention, and the challenge of peace and stability in a new international order.  The last section, devoted to \"Education and Action for Peace,\" contains three essays, which examine the education for peacemaking, the challenge of conscience and the pastoral response to ongoing challenge of peace. , , ,                ,  In his \"Introduction\" to the book entitled Peacemaking: Moral and Policy Challenges for a New World, Rev. Drew Christiansen points out that the Roman Catholic bishops of the United States have made a clear distinction between the social teachings of the Church--comprising universally binding moral and ethical principles--and the particular positions they have taken on public policy issues--such as those relating to war, peace, justice, human rights and other socio-political matters. While the former are not to be mitigated under any circumstances, the latter, being particular applications, observations and recommendations, can allow for plurality of opinion and diversity of focus in the case of specific social, political and opinion and diversity of focus in the case of specific social, political and moral issues.(f.1)  Peacemaking aligns itself with this second category.  The objectives of this review  essay are the following: to summarize the main topics and themes, of some of the recently-published documents on Catholic political thought, relating to peacemaking and peacekeeping; and to provide a brief critique of their main contents, recommendations and suggestions. ,  The Directions of Peacemaking: As in the earlier documents, so too are the virtues of faith, hope, courage, compassion, humility, kindness, patience, perseverance, civility and charity emphasized, in The Harvest of Justice, as definite aids in peacemaking and peacekeeping.  The visions of global common good, social and economic development consistent with securing and nurturing conditions for justice and peace, solidarity among people, as well as cooperation among the industrial rich and the poor developing nations are also emphasized as positive enforcements in the peacemaking and peacekeeping processes.  All of these are laudable commitments, so long as they are pursued through completely pacifist perspectives.  The Harvest of Justice also emphasizes that, \"as far as possible, justice should be sought through nonviolent means;\" however, \"when sustained attempt at nonviolent action fails, then legitimate political authorities are permitted as a last resort to employ limited force to rescue the innocent and establish justice.\"(f.13)  The document also frankly admits that \"the vision of Christian nonviolence is not passive.\"(f.14)  Such a position may disturb many pacifists.  Even though some restrictive conditions--such as a \"just cause,\" \"comparative justice,\" legitimate authority\" to pursue justice issues, \"right intentions,\" probability of success, proportionality of gains and losses in pursuing justice, and the use of force as last resort--are indicated and specified in the document, the use of violence and devastation are sanctioned, nevertheless, by its reaffirmation of the use of force in setting issues and by its support of the validity of the \"just war\" tradition. ,  The first section, entitled \"Theology, Morality, and Foreign Policy in A New World,\" contains four essays.  These deal with the new challenges of peace, the illusion of control, creating peace conditions through a theological framework, as well as moral reasoning and foreign policy after the containment.  The second, comprising six essays, is entitled \"Human Rights, Self-Determination, and Sustainable Development.\"  These essays deal with effective human rights agenda, religious nationalism and human rights, identity, sovereignty, and self-determination, peace and the moral imperatives of democracy, and political economy of peace.  The two essays which comprise the third section, entitled \"Global Institutions,\" relate the strengthening of the global institutions and action for the future. The fourth, entitled \"The Use of Force After the Cold War,\" is both interesting and controversial.  Its six essays discuss ethical dilemmas in the use of force, development of the just-war tradition, in a multicultural world, casuistry, pacifism, and the just-war tradition, possibilities and limits of humanitarian intervention, and the challenge of peace and stability in a new international order.  The last section, devoted to \"Education and Action for Peace,\" contains three essays, which examine the education for peacemaking, the challenge of conscience and the pastoral response to ongoing challenge of peace.",
				"URL": "http://search.proquest.com/docview/213445241",
				"proceedingsTitle": "Peace Research",
				"shortTitle": "Peacemaking"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/hnpnewyorktimes/docview/122485317/abstract/1357D8A4FC136DF28E3/11?accountid=12861",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "F. Stephen",
						"lastName": "Larrabee",
						"creatorType": "author"
					},
					{
						"firstName": "R. G.",
						"lastName": "Livingston",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ProQuest Record",
						"mimeType": "text/html"
					},
					{
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					}
				],
				"place": "New York, N.Y.",
				"title": "Rethinking Policy on East Germany",
				"pages": "A23",
				"date": "Aug 22, 1984",
				"publisher": "New York, N.Y.",
				"ISSN": "03624331",
				"callNumber": "122485317",
				"rights": "Copyright New York Times Company Aug 22, 1984",
				"publication": "The New York Times",
				"libraryCatalog": "ProQuest Historical Newspapers: The New York Times (1851-2008)",
				"abstractNote": "For some months now, a gradual thaw has been in the making between East Germany and West Germany. So far, the United States has paid scant attention -- an attitude very much in keeping with our neglect of East Germany throughout the postwar period. We should reconsider this policy before things much further -- and should in particular begin to look more closely at what is going on in East Germany.",
				"URL": "http://search.proquest.com/hnpnewyorktimes/docview/122485317/abstract/1357D8A4FC136DF28E3/11?accountid=12861"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.proquest.com/docview/129023293/abstract?accountid=12861",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "ProQuest Record",
						"mimeType": "text/html"
					},
					{
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "ProQuest PDF",
						"mimeType": "application/pdf"
					}
				],
				"place": "New York, N.Y.",
				"title": "THE PRESIDENT AND ALDRICH.: Railway Age Relates Happenings Behind the Scenes Regarding Rate Regulation.",
				"publicationTitle": "Wall Street Journal (1889-1922)",
				"pages": "7",
				"numPages": "1",
				"date": "Dec 5, 1905",
				"publisher": "Dow Jones & Company Inc",
				"language": "English",
				"callNumber": "129023293",
				"rights": "Copyright Dow Jones & Company Inc Dec 5, 1905",
				"libraryCatalog": "ProQuest Historical Newspapers: The Wall Street Journal (1889-1994)",
				"abstractNote": "The Railway Age says: \"The history of the affair (railroad rate question) as it has gone on behind the scenes, is about as follows.",
				"URL": "http://search.proquest.com/docview/129023293/abstract?accountid=12861",
				"proceedingsTitle": "Wall Street Journal (1889-1922)",
				"shortTitle": "THE PRESIDENT AND ALDRICH."
			}
		]
	}
]
/** END TEST CASES **/