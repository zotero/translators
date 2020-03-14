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
	"lastUpdated": "2020-03-14 17:13:36"
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
- Handle resolutions and reports properly
- Handle different types of documents via the API.
- Use keywords for tags
- Use references to create "related" entries if they exist

=> All relate to one thing: This translator is currently unable to access the API
to query it for the taxonomies/thesauruses used for decision type ("typedescription"),
decision-making body ("originatingbody"), keywords ("kpthesaurus"), ...
Check compiled.js on the HUDOC website in order to learn how to query these aspects.
Search for "// ###..//sites/echr/echr.js ###"" in compiled.js to find most API fields. 

*/

function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}
function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}

/*
function getCaseDetailsObj(doc) {
	var details_link = doc.querySelector('.viewarea #notice .content');
	details_link.click();
	
	var list_details = doc.querySelectorAll('.viewarea #notice .content > [title=""]');
	Zotero.debug(list_details);
	var items = {};
	
	for(var i=0; i < list_details.length; i++) {
		field = text(list_details[i], '.noticefieldheading');
		value = text(list_details[i], '.noticefieldvalue div');
		Zotero.debug("in loop with" + i);
		Zotero.debug(field);
		Zotero.debug(value);

		items[field] = value; 
	} 
	
	return items;
} */

function scrapeMetaData(doc, detail) { //Only scrapes the header of the main page
	switch (detail) {
		case "appno": return text(doc, "span.column01");
		case "typedescription": return text(doc, "span.column02");
		case "originatingbody": return text(doc, "span.column03");
		case "judgementdate": return text(doc, "span.column04");
		default: return null;
	}
}

function getItemID(url) {
	var url_regex = /%22itemid%22:\[%22(\d*-\d*)%22]|\?i=(\d*-\d*)/i;
	var id = url.match(url_regex);
	Zotero.debug(id);
	return id[1];
}

/*function queryMetaData(url, detail, onDone) {
	var query_url =  "https://hudoc.echr.coe.int/app/query/results?query=(contentsitename=ECHR)%20AND%20" + getItemID(url) + "&select=" + detail + "&sort=&start=0&length=1";
	
	ZU.doGet(query_url, function(json) {
		json = JSON.parse(json);
		Zotero.debug(json);
		var get_values =  json["results"][0]["columns"][detail];
		onDone(get_values);
	});
}*/

function getTypeBit(doc, url) { //TODO: Switch to 'url' once we use the API instead
	var description = scrapeMetaData(doc, "typedescription");
	
	if (description.includes("judgment")) {
		if (description.includes("just satisfaction") && !description.includes("merits")) {
			return " (just satisfaction)";
		} else
		if (description.includes("objection") || description.includes("jurisdiction")) {
			return " (preliminary objections)";
		} else
		if (description.includes("struck out")) {
			var conclusion = ""/*queryMetaData(url, "conclusion")*/; //FIXME
			if (conclusion.includes("friendly settlement")) {
				return " (friendly settlement)";
			} else {
				return " (striking out)";
			}
		} else
		if (description.includes("interpretation")) {
			return " (interpretation)";
		} else
		if (description.includes("revision")) {
			return " (revision)";
		} else {
			return "";
		}
	} else
	if (description.includes("decision")) {
		return " (dec.)";
	} else
	if (description.includes("advisory opinion")) {
		return " (advisory opinion)"; //TODO: Check if correct
	} else
	if (description.includes("communicated")) {
		return " (communicated)"; //TODO: Check if correct
	} else
	if (description.includes("report")) {
		return ""; //Currently only in here because it is one of the document types. But reports are a different Zotero type
	} else
	if (description.includes("revision")) {
		return " (dec. on revision)"; //TODO: Check if correct
	} else
	if (description.includes("res-")) {
		return " (resolution)"; //TODO: Check if correct, maybe different Zotero type?
	}
	
	return "";
}

function detectWeb(doc, url) {
  // TODO: adjust the logic here
  /*if (!(url.includes('?=i') || url.includes('itemid'))) {
  	return "multiple";
  }*/
  
  var doc_type = scrapeMetaData(doc, "typedescription");

  if (doc_type.includes("Judgment") || doc_type.includes("Decision")) {
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
	
	item.caseName = ZU.capitalizeTitle(text(doc, "title").toLowerCase(), true).replace(" V. ", " v. ")
					+ getTypeBit(doc, url);
	
	var court = scrapeMetaData(doc, "originatingbody");
	
	item.author = court.replace("Court", "ECtHR");
	
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
	
	//Ensure dd.mm.yyyy. Unsure if Zotero interprets a date with slashes differently in US locals.
	item.dateDecided = scrapeMetaData(doc, "judgementdate").replace(/\//g, "."); 
	
	//Query remaining metadata from API
	var query_url =  "https://hudoc.echr.coe.int/app/query/results?query=(contentsitename=ECHR)%20AND%20" 
					+ getItemID(url) + "&select=appno,conclusion" //Adapt based on what is needed
					+ "&sort=&start=0&length=1";
	
	ZU.doGet(query_url, function(json) {
		json = JSON.parse(json)["results"][0]["columns"];
		Zotero.debug(json);
		
		//Application numbers
		//FIXME: Decide whether to prepend "app. no.". Some styles automatically add "no." (Chicago)
		//while most others do not (OSCOLA, APA).
		var appno = json["appno"].split(";");
		if (Array.isArray(appno)) {
			var length = appno.length;
			var comma_part = appno.slice(0, length-1);
			var appnos = comma_part.join(", ") + " and " + appno[length-1].toString();
			
			item.docketNumber = "app. nos. " + appnos;
		} else {
			item.docketNumber = "app. no. " + appno;
		}
		
		//Abstract
		item.abstractNote = json["conclusion"].replace(/;/g, "; ");
		
		item.complete();
	});
	
}
