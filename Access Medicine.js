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
	if (url.toLowerCase().includes("searchresults.aspx?")){
		return "multiple";
	}
	//check if book section
	var citation = doc.getElementById("hfGetCitation");
	if(citation){
		return "bookSection";
	}
}

function doWeb(doc, url){
	var contentType = detectWeb(doc, url);
	//get
	var baseUrl = url.split("/")[0];
	var baseCitation = baseUrl + "/downloadCitation.aspx?format=ris&sectionid=";
	//search page
	if (contentType == "multiple"){
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
			//prevent overriding, keep most relevant title
			if(!sectionDict[link]){
				sectionDict[link]=title;
			}
		}
		Z.selectItems(sectionDict, function(selected){
			if(!selected){
				return;
			}
			for(var i=0;i<selected.length;i++){
				selectedSections.push(selected[i]);
			}
			ZU.processDocuments(selectedSections, function(doc, link){
				risTranslate(doc, link, false);
			});
		});
	}
	else{
		//only book section from now on
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
					var chapterText = chapterSpan.innerHTML.toLowerCase().replace("chapter",'').trim();
					item.notes.push('Chapter: '+chapterText);
				}
				item.attachments.push({
					title: "Snapshot",
					document: doc
				});
			}
			item.complete();
		});
		translator.translate();
	});
}
