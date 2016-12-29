{
	"translatorID": "60e55b65-08cb-4a8f-8a61-c36338ec8754",
	"label": "Access Medicine",
	"creator": "Jaret M. Karnuta",
	"target": "^https?://(0-)?(access(anesthesiology|cardiology|emergencymedicine|medicine|pediatrics|surgery)|neurology)\\.mhmedical\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-29 16:41:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Jaret M. Karnuta

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url){
	//check if search page
	//case differs between browsers, force lower case
	var pattern = /\/searchresults/i;
	var search = url.search(pattern) != -1;
	if (search){
		return "multiple";
	}
	//check if book section
	pattern = /\/content.*/i;
	var section = url.search(pattern) != -1;
	if(section){
		return "bookSection";
	}
}

function doWeb(doc, url){
	var contentType = detectWeb(doc, url);
	if (contentType == "multiple"){
		//for formatting citation, recall case differences in url (see detectWeb)
		var pattern = /\/searchresults.*/i;
		var baseUrl = url.replace(pattern,'');
		var baseCitation = baseUrl + "/downloadCitation.aspx?format=ris&sectionid=";

		//search page
		//easier to use XPaths here
		var sections = ZU.xpath(doc, '//div[@class="search-entries"]/div[@class="row-fluid bordered-bottom"]/div[@class="span10"]');
		var sectionDict = {};
		var selectedSections = [];
		for (var i=0;i<sections.length;i++){
			var section = sections[i];
			var titleElement = ZU.xpath(section,'.//h3')[0];
			var title = ZU.trimInternal(titleElement.textContent);
			var bookElement = ZU.xpath(section, './/p')[0];
			var bookTitle = ZU.trimInternal(bookElement.textContent);
			var sectionId = ZU.xpath(titleElement,'.//a')[0].href;
			//sectionId is first query element in url
			var beginCut = sectionId.indexOf("=");
			var endCut = sectionId.indexOf("&");
			title = title+" ("+bookTitle+")";
			sectionId = sectionId.substring(beginCut+1, endCut);
			var link = baseCitation+sectionId;
			//prevent overriding, keep most relevant (i.e. first occurence) title
			if(!sectionDict[link]){
				sectionDict[link]=title;
			}
		}
		Z.selectItems(sectionDict, function(selected){
			if(!selected){
				return;
			}
			for (var link in selected){
				//got weird results with ZU.processDocuments
				//using a little hack instead
				risTranslate(doc, link, false);
			}
		});
	}
	else{
		//only book section from now on
		var pattern = /\/content.*/i;
		var baseUrl = url.replace(pattern,'');
		var baseCitation = baseUrl + "/downloadCitation.aspx?format=ris&sectionid=";
		var sectionId = url.split("sectionid=")[1];
		var link = baseCitation + sectionId;
		risTranslate(doc, link, true);
	}
}

function risTranslate(doc, link, bookSection){
	Zotero.Utilities.doGet(link, function(risText){
		//set RIS import translator
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function(obj, item) {
			if(bookSection){
				var chapterSpan = doc.getElementById('pageContent_lblChapterTitle1');
				if (chapterSpan) {
					//remove 'chapter' text if present
					var chapterText = chapterSpan.innerHTML.trim();
					//item.notes.push('Chapter: '+chapterText);
					item.notes.push({note:chapterText});
				}
				item.attachments.push({
					title: "Snapshot",
					document: doc
				});
			}
			//parse out edition from title
			//typical book title looks like this: Book Title, 19e (where 19e is edition no)
			var bookTitle = item.bookTitle;
			if(bookTitle.includes(",")){
				//get last substring (book title might have commas in it)
				var splitOnComma = bookTitle.split(",");
				var len = splitOnComma.length;
				var edition = splitOnComma[len-1];
				//remove e
				if(edition.includes("e")){
					edition = edition.replace("e","");
				}
				edition = edition.trim();
				item.edition=edition;
				//rebuild book title
				splitOnComma.splice(-1);
				var newBookTitle=splitOnComma.join(",");
				item.bookTitle=newBookTitle;
			}

			//remove extra spaces from abstract notes field
			if (item.abstractNote) {
  				item.abstractNote = item.abstractNote.replace(/\s+/g, ' ');
			}

			//remove numberOfVolumes, incorrectly set in RIS
			item.numberOfVolumes="";

			//remove authors if they dont have a first and last name
			for (var i=0;i<item.creators.length;i++){
				var author = item.creators[i];
				if(!author.lastName || !author.firstName){
					item.creators.splice(i,1);
				}
			}
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://accesssurgery.mhmedical.com/SearchResults.aspx?q=roux+en+y",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://accessemergencymedicine.mhmedical.com/content.aspx?sectionid=72121336&bookid=1345&Resultclick=2",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Foreign Bodies",
				"creators": [
					{
						"lastName": "Tenenbein",
						"firstName": "Milton",
						"creatorType": "author"
					},
					{
						"lastName": "Schafermeyer",
						"firstName": "Robert",
						"creatorType": "editor"
					},
					{
						"lastName": "Tenenbein",
						"firstName": "Milton",
						"creatorType": "editor"
					},
					{
						"lastName": "Macias",
						"firstName": "Charles G.",
						"creatorType": "editor"
					},
					{
						"lastName": "Sharieff",
						"firstName": "Ghazala Q.",
						"creatorType": "editor"
					},
					{
						"lastName": "Yamamoto",
						"firstName": "Loren G.",
						"creatorType": "editor"
					}
				],
				"date": "2015",
				"abstractNote": "Endobronchial and esophageal foreign bodies are marked by three clinical stages—an initial symptomatic stage of coughing, choking, and discomfort; a stage of relative amelioration of symptoms; followed by a stage of complications due to obstruction and infection.The gold standard for the diagnosis of an endobronchial foreign body is bronchoscopy.An asymptomatic or mildly symptomatic child with a coin in the esophagus can be observed for 8 to 16 hours because the coin will spontaneously pass into the stomach in 25% to 30% of these children.A useful method for removal of most intranasal foreign bodies is a positive-pressure technique such as the parent's kiss or a bag-valve-mask resuscitator.A useful initial method for removal of most foreign bodies from the external auditory canal is irrigation. This technique requires very little patient cooperation.An immobile battery, for example, in the esophagus, nose or ear, requires emergent removal to prevent perforation at the site of impaction and subsequent infection.Two or more rare-earth magnets in the gastrointestinal tract or on both sides of the nasal septum require emergent removal because of the potential of erosion and perforation of the tissue between the two adherent magnets.",
				"bookTitle": "Strange and Schafermeyer's Pediatric Emergency Medicine",
				"edition": "4",
				"libraryCatalog": "Access Medicine",
				"place": "New York, NY",
				"publisher": "McGraw-Hill Education",
				"url": "http://mhmedical.com/content.aspx?aid=1105680244",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Chapter 11"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://accessmedicine.mhmedical.com/content.aspx?bookid=1130&sectionid=63651344",
		"items": [
			{
				"itemType": "bookSection",
				"title": "The Practice of Medicine",
				"creators": [
					{
						"lastName": "Kasper",
						"firstName": "Dennis",
						"creatorType": "editor"
					},
					{
						"lastName": "Fauci",
						"firstName": "Anthony",
						"creatorType": "editor"
					},
					{
						"lastName": "Hauser",
						"firstName": "Stephen",
						"creatorType": "editor"
					},
					{
						"lastName": "Longo",
						"firstName": "Dan",
						"creatorType": "editor"
					},
					{
						"lastName": "Jameson",
						"firstName": "J. Larry",
						"creatorType": "editor"
					},
					{
						"lastName": "Loscalzo",
						"firstName": "Joseph",
						"creatorType": "editor"
					}
				],
				"date": "2015",
				"bookTitle": "Harrison's Principles of Internal Medicine",
				"edition": "19",
				"libraryCatalog": "Access Medicine",
				"place": "New York, NY",
				"publisher": "McGraw-Hill Education",
				"url": "http://mhmedical.com/content.aspx?aid=1120785046",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Chapter 1"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
