{
	"translatorID": "d541622d-09c3-4e20-b010-c506b2d01151",
	"label": "HUDOC",
	"creator": "Jonas Skorzak",
	"target": "https?:\\/\\/hudoc\\.echr\\.coe\\.int.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-03-15 20:08:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 JONAS SKORZAK
	
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

/* 

TODO:
- Handle more than judgments or decisions (summaries, translations, search results)
- Handle reports
- Handle resolutions and advisory opinions properly (esp. title)
- Handle different types of documents via the API.
- Use keywords for tags
- Use references to create "related" entries if they exist
- Put in short titles

=> All relate to one thing: This translator is currently unable to access the API
to query it for the taxonomies/thesauruses used for decision type ("typedescription"),
decision-making body ("originatingbody"), keywords ("kpthesaurus"), ...
Check compiled.js on the HUDOC website in order to learn how to query these aspects.
Search for "// ###..//sites/echr/echr.js ###"" in compiled.js to find most API fields. 

*/

function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}
function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}

//Scrapes some metadata from the document
//TODO: integrate function into scrape
function scrapeMetaData(doc, detail) { //Only scrapes the header of the main page
	switch (detail) {
		case "appno": return text(doc, "span.column01");
		case "typedescription": return text(doc, "span.column02");
		case "originatingbody": return text(doc, "span.column03");
		case "judgementdate": return text(doc, "span.column04");
		default: return null;
	}
}

//Gets the itemid of the document
function getItemID(url) {
	var url_regex = /%22itemid%22:\[%22([\d-]*)%22]|\?i=([\d-]*)/i;
	var id = url.match(url_regex);
	Zotero.debug(id);
	return id[1];
}

//Adds the type of judgment at the end of the name
function getTypeBit(doc, url) { //TODO: Switch to 'url' once we use the API instead
	var description = scrapeMetaData(doc, "typedescription");
	
	if (description.includes("judgment")) {
		if (description.includes("Just Satisfaction") && !description.includes("Merits")) {
			return " (just satisfaction)";
		} else
		if (description.includes("Objection") || description.includes("Jurisdiction")) {
			return " (preliminary objections)";
		} else
		if (description.includes("Struck out")) {
			var conclusion = ""/*queryMetaData(url, "conclusion")*/; //FIXME
			if (conclusion.includes("friendly settlement")) {
				return " (friendly settlement)";
			} else {
				return " (striking out)";
			}
		} else
		if (description.includes("Interpretation")) {
			return " (interpretation)";
		} else
		if (description.includes("Revision")) {
			return " (revision)";
		} else {
			return "";
		}
	} else
	if (description.includes("Decision")) {
		return " (dec.)";
	} else
	if (description.includes("Communicated")) {
		return " (communicated)"; //TODO: Check if correct
	} else
	//if (description.includes("Report")) {
	//	return ""; //Currently only in here because it is one of the document types. But reports are a different Zotero type
	//} else
	if (description.includes("Revision")) {
		return " (dec. on revision)"; //TODO: Check if correct
	} else
	if (description.includes("Res-")) {
		return " (resolution)"; //TODO: Check if correct, maybe different Zotero type?
	}
	
	return "";
}

//Downloads the legal summary in HUDOC
function getLegalSummary(item, appno) {
	//A bit hacky. Should probably query kpdate and then convert it
	var kpdate = item.dateDecided.replace(/(..).(..).(....)/, "$3-$2-$1");
	
	var appno_string = appno.join(" AND appno:");
	
	//Save the French version if user visited the French version of the judgment
	if (item["language"] == "fra") {
		var doctype_string = "doctype:CLINF";
	} else {
		var doctype_string = "doctype:CLIN";
	}
	
	var summary_url = "https://hudoc.echr.coe.int/app/query/results?query=contentsitename=ECHR "
						+ appno_string + " AND "
						+ doctype_string + " AND "
						+ "(kpdate=\"" + kpdate + "\")"
						+ "&select=itemid"
						+ "&sort=&start=0&length=500";
	
	Zotero.debug("Getting id of legal summary at: " + summary_url);
	
	//Request id of legal summary
	ZU.doGet(summary_url, function(json) {
		json = JSON.parse(json);
		
		if (json["resultcount"] == 1) {
			text_url = "https://hudoc.echr.coe.int/app/conversion/docx/html/body?library=ECHR&id="
						+ json["results"][0]["columns"]["itemid"];
			
			Zotero.debug("Getting text of legal summary at: " + text_url);
			
			//Request text of legal summary
			ZU.doGet(text_url, function(text) {
				text = text.replace(/<style>[\s\S]*<\/style>/, "");

				item.notes.push({
					title: "HUDOC Legal Summary",
					note: "<h1> HUDOC Legal Summary </h1> </br>" + text
				});
				
				item.complete();
			}); 
			
		} else {
			item.complete();	
		}
	});
}

function detectWeb(doc, url) {
	// TODO: adjust the logic here
	/*if (!(url.includes('?=i') || url.includes('itemid'))) {
	return "multiple";
	}*/
	
	Zotero.monitorDOMChanges(doc.querySelector("#notification div"), {attributes: true, attributeFiler: ["style"]});

	var doc_type = scrapeMetaData(doc, "typedescription");

	if (doc_type.includes("Judgment") 
	|| doc_type.includes("Decision") 
	|| doc_type.includes("Advisory Opinion")
	|| doc_type.includes("Res-")) {
		return "case";
	}
	
	return false;
	
	/*
	if (url.includes('/article/')) {
	return "newspaperArticle";
	} else
	if (getSearchResults(doc, true)) {
	return "multiple";
	}
	return false; */
}

/*function getSearchResults(doc, checkOnly) {
  var items = {};
  var found = false;
  // TODO: adjust the CSS selector
  var rows = doc.querySelectorAll('h2>a.title[href*="/article/"]');
  for (let row of rows) {
	// TODO: check and maybe adjust
	let href = row.href;
	// TODO: check and maybe adjust
	let title = ZU.trimInternal(row.textContent);
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  return found ? items : false;
} */

function doWeb(doc, url) {
  /*if (detectWeb(doc, url) == "multiple") {
	Zotero.selectItems(getSearchResults(doc, false), function (items) {
	  if (items) ZU.processDocuments(Object.keys(items), scrape);
	});
  } else
  {
	scrape(doc, url);
  }*/
  if (detectWeb(doc, url) == "case") {
  	scrapeDecision(doc, url);
  }
}

function scrapeDecision(doc, url) { //Works for both Court judgments and decisions
	var item = new Zotero.Item("case");
	
	//Title
	var cap_title = ZU.capitalizeTitle(text(doc, "title").toLowerCase(), true);
	
	//Zotero capitalizes the "v.", so we need to correct that for English and French cases
	if (cap_title.includes(" V. ")) {
		cap_title = cap_title.replace(" V. ", " v. ");
	} else
	if (cap_title.includes(" C. ")) {
		cap_title = cap_title.replace(" C. ", " c. ");
	}
	item.caseName = cap_title + getTypeBit(doc, url);
	
	//Court and Author
	//FIXME: Unsure if author should be listed like this or rather get removed 
	var court = scrapeMetaData(doc, "originatingbody");
	
	if (court != null) { //Advisory opinions have no "originatingbody" listed
		item.creators.push({lastName:court.replace("Court", "ECtHR"), creatorType:"author"});
	
		if (court.includes("Grand Chamber")) {
			item.court = "ECtHR [GC]";
		} 
		if (court.includes("Commission")) {
			item.court = "Commission";
		}
		if (court == "Committee of Ministers") {
			item.court = "Committee of Ministers";
		} else {
			item.court = "ECtHR";
		}
	} else { //All Advisory Opinions (so far) are decided by the GC
		item.creators.push({lastName:"ECtHR (Grand Chamber)", creatorType:"author"});
		item.court = "ECtHR [GC]";
	}
	
	//Ensure dd.mm.yyyy. Unsure if Zotero interprets a date with slashes differently in US locals.
	item.dateDecided = scrapeMetaData(doc, "judgementdate").replace(/\//g, "."); 
	
	//Query remaining metadata from API
	var query_url =  "https://hudoc.echr.coe.int/app/query/results?query=(contentsitename=ECHR) AND " 
					+ getItemID(url) 
					+ "&select=appno,conclusion,docname,languageisocode" //Adapt based on what is needed
					+ "&sort=&start=0&length=1";
	
	ZU.doGet(query_url, function(json) {
		json = JSON.parse(json)["results"][0]["columns"];
		
		Zotero.debug("Queried HUDOC API at: " + query_url + "\n\n Result:\n");
		Zotero.debug(json);
		
		//Application numbers
		//FIXME: Decide whether to prepend "app. no.". Some styles automatically add "no." (Chicago)
		//while most others do not (OSCOLA, APA).
		var appno = json["appno"].split(";");
		if (appno.toString().length !== 0) { //Only if not empty
			if (appno.length > 1) {
				var length = appno.length;
				var comma_part = appno.slice(0, length-1);
				var appnos = comma_part.join(", ") + " and " + appno[length-1].toString();
				
				item.docketNumber = "app. nos. " + appnos;
			} else {
				item.docketNumber = "app. no. " + appno;
			}
		}
		
		//Abstract
		item.abstractNote = json["conclusion"].replace(/;/g, "; ");
		
		//Language 
		item["language"] = json["languageisocode"].toLowerCase();
		
		//Download PDF
		var docname = json["docname"];

		var pdfurl = "https://hudoc.echr.coe.int/app/conversion/docx/pdf?library=ECHR&id=" 
					+ getItemID(url) + "&filename=" + docname + ".pdf";
		
		pdfurl = encodeURI(pdfurl); //the "docname" may contain chars not part of the URI schema
		
		Zotero.debug("Getting PDF at: " + pdfurl);
				
		item.attachments.push({
			title: item.caseName + " PDF",
			mimeType: "application/pdf",
			url: pdfurl
		});
		
		//Download Legal Summary
		if (appno.length !== 0) { //without app. nos. we can't find a legal summary
			getLegalSummary(item, appno);
		} else {
			item.complete();
		}
	});
	
}
