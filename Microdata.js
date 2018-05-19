{
	"translatorID": "fcb1b13c-afc8-453c-bd9c-399b06911e3a",
	"label": "Microdata",
	"creator": "Philipp Zumstein",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-05-19 15:04:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

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

function extractMicrodata(doc, url) {
	// The native DOM function will be removed soon:
	// https://bugzilla.mozilla.org/show_bug.cgi?id=909633
	// Thus we use here out own scraping methods for
	// microdata.
	
	// Helpful info: https://blog.scrapinghub.com/2014/06/18/extracting-schema-org-microdata-using-scrapy-selectors-and-xpath/
	
	var schemaItems = ZU.xpath(doc, '//*[@itemscope]');
	
	// Assign the itemid to each item first
	for (let i=0; i<schemaItems.length; i++) {
		schemaItems[i].itemid = schemaItems[i].getAttribute("itemid") ||
			(schemaItems[i].getAttribute("id") ? url+"#"+schemaItems[i].getAttribute("id") : url+"#itemid="+i);
	}
	
	function microdataValue(propertyNode) {
		//see also https://www.w3.org/TR/microdata/#values
		if (propertyNode.hasAttribute("itemscope")) {
			return propertyNode.itemid;
		}
		switch(propertyNode.tagName.toLowerCase()) {
			case "meta":
				return propertyNode.getAttribute("content");
				break;
			case "audio":
			case "embed":
			case "iframe":
			case "img":
			case "source":
			case "track":
			case "video":
				return propertyNode.getAttribute("src");
				break;
			case "a":
			case "area":
			case "link":
				return propertyNode.getAttribute("href");
				break;
			case "object":
				return propertyNode.getAttribute("data");
				break;
			case "data":
			case "meter":
				return propertyNode.getAttribute("value");
				break;
			case "time":
				return propertyNode.getAttribute("datetime");
				break;
			case "span"://non-standard, but can occur
				if (propertyNode.childNodes.length > 1 && propertyNode.getAttribute("content")) {
					return propertyNode.getAttribute("content");
					break;
				}
			default:
				return propertyNode.textContent;
		}
	}
	
	var statements = [];
	
	for (var i=0; i<schemaItems.length; i++) {
		var refs = schemaItems[i].getAttribute("itemref");//Currently itemref are not handled
		
		var typesList = schemaItems[i].getAttribute("itemtype");
		if (typesList) {
			var types = typesList.split(" ");
			for (var k=0; k<types.length; k++) {
				statements.push([schemaItems[i].itemid, "rdfs:type", types[k]]);
			}
		}
		
		//get all properties
		var properties = ZU.xpath(schemaItems[i], './/*[@itemprop]');
		var exclude = ZU.xpath(schemaItems[i], './/*[@itemscope]//*[@itemprop]');
		for (let j=0; j<properties.length; j++) {
			if (exclude.indexOf(properties[j]) == -1) {
				var propertyList = properties[j].getAttribute("itemprop");
				var propertyValue = microdataValue(properties[j]);
				//it is possible to assign the same value to multiple
				//properties (separated by space) at the same time
				var propertyNames = propertyList.split(" ");
				for (let k=0; k<propertyNames.length; k++) {
					statements.push([schemaItems[i].itemid, propertyNames[k], propertyValue]);
				}
			}
		}
	}
	
	Z.debug(statements);
}

function scrape(doc, url) {
	var item = new Zotero.Item('newspaperArticle');
	extractMicrodata(doc, url);
	//continue here
	
	//item.complete();
}


function doWeb(doc, url) {
	scrape(doc, url);
}

function detectWeb(doc, url) {
	if (ZU.xpath(doc, '//*[@itemscope]').length>0) {
		return "newspaperArticle";
	}
}

/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
