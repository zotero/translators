{
	"translatorID": "d14cf339-1f8b-4cf0-b06f-b609b7be3676",
	"label": "Mikado",
	"creator": "Madeesh Kannan",
	"target": "^http://www.mikado-ac.info/starweb/MIS/DEU/OPAC",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-08-27 16:21:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


var property_handlers = [];

function addPropertyHandler(element_name, zotero_property, handler) {
	property_handlers.push({
		name: element_name,
		handler: handler,
		zot_prop: zotero_property
	});
}

// Common Handlers
var commonHandler_getRowCell = function(row_element) {
	return ZU.xpathText(row_element, "./td[2]/text()");
};


// Specific Handlers
// Titel
addPropertyHandler("Repeat_WVT05", "shortTitle", function(element) {
	var title = ZU.xpathText(element, "./td/h4/text()").trim();
	return title.slice(0, title.length - 1);
});
// Titelzusatz
// 	--Temporarily store it in an arbitrary field and do some post-processing
addPropertyHandler("Repeat_WVT15", "additionalTitle", commonHandler_getRowCell);
// Ort, Verlag
addPropertyHandler("Repeat_WVP05", "publisher", function(element) {
	return commonHandler_getRowCell(element).split("\:")[1];
});
addPropertyHandler("Repeat_WVP05", "place", function(element) {
	return commonHandler_getRowCell(element).split("\:")[0];
});
// Jahr
addPropertyHandler("Repeat_WVP10", "date", function(element) {
	var text = commonHandler_getRowCell(element);
	var year = text.match('([0-9]{4})');
	if (year && year.length > 1)
		item.date = year[1];
});
// ISBN
addPropertyHandler("Repeat_WVI05", "ISBN", commonHandler_getRowCell);
// Zeitschrift/Serie
addPropertyHandler("Repeat_WVT30", "series", function(element) {
	var series = ZU.xpathText(element, "./td[2]/ul/li/a/text()");
	if (series === null)
		series = ZU.xpathText(element, "./td[2]/ul/li/text()").split("\;")[0];
	return series;
});
addPropertyHandler("Repeat_WVT30", "seriesNumber", function(element) {
	return ZU.xpathText(element, "./td[2]/ul/li/text()").split("\;")[1];
});
// Kollationsvermerk
addPropertyHandler("Repeat_WVD05", "", function(element, item) {
	var text = commonHandler_getRowCell(element);
	var splits = text.split("\,");
	if (splits.length > 1)
		item.volume = splits[0];

	var numPagesMatch = text.match('(?:([0-9]+) [S|s]eiten)|(?:([0-9]+) S\.)');
	if (numPagesMatch && numPagesMatch.length > 1) {
		if (numPagesMatch[1] !== undefined)
			item.numPages = numPagesMatch[1];
		else if (numPagesMatch[2] !== undefined)
		item.numPages = numPagesMatch[2];
	}
});
// Literaturangaben
addPropertyHandler("Repeat_WVD40", "", function(element, item) {
	var text = commonHandler_getRowCell(element);
	var pages = text.match('S\.\s*([0-9]+\s*\-\s*[0-9]+)');
	if (pages && pages.length > 1)
		item.pages = pages[1];
});
// Sprache
addPropertyHandler("Repeat_WVD45", "language", commonHandler_getRowCell);
// Abstract
addPropertyHandler("Repeat_WVC30", "abstractNote", function(element) {
	return ZU.xpathText(element[1], "./text()");
});
// Quelle
addPropertyHandler("Repeat_WVT55L", "publisher", function(element) {
	return ZU.xpathText(element, "./a/text()");
});
// Jahrgang/Band, Heft
addPropertyHandler("Repeat_WVT50", "volume", function(element) {
	return commonHandler_getRowCell(element).split("\s")[1];
});
addPropertyHandler("Repeat_WVT50", "issue", function(element) {
	return commonHandler_getRowCell(element).split("\,")[1];
});
addPropertyHandler("Repeat_WVT50", "pages", function(element) {
	return commonHandler_getRowCell(element).split("S\.")[1];
});
// Schlagwörter
addPropertyHandler("Repeat_WVS30L", "tags", function(element) {
	return ZU.xpath(element, './/a').map(function(a) { return a.textContent; });
});


function extractProperties(doc, item) {
	for (var index in property_handlers) {
		var handler = property_handlers[index];
		var context = ZU.xpath(doc, '//*[@name="' + handler.name + '"]');
		if (context === null || context === undefined || context.length === 0)
			continue;

		var extracted = null;
		try {
			extracted = handler.handler(context, item);
		} catch (err) {
			Z.debug("Exception raised inside handler for property " + handler.name + " | " + handler.zot_prop + "! Error: " + err);
		}

		if (extracted === undefined)
			continue;
		else if (extracted === null) {
			Z.debug("Couldn't extract metadata for property " + handler.name + " | " + handler.zot_prop);
			continue;
		}

		if (typeof extracted === typeof "")
			extracted = extracted.trim();

		item[handler.zot_prop] = extracted;
	}
}

function postProcess(doc, type, item) {
	// add/update metadata that wasn't (correctly) parsed by the COinS translator
	extractProperties(doc, item);

	// post-processing
	if ("additionalTitle" in item) {
		var shortTitle = item.shortTitle;
		var subtitle = item.additionalTitle;
		if (subtitle === undefined || subtitle === null)
			subtitle = "";

		var fullTitle = shortTitle + (subtitle.length > 0 ? " : " + subtitle : "");
		item.title = fullTitle;
	} else
		item.title = item.shortTitle;

	item.complete();
}

function detectWeb(doc, url) {
	// only used to detect if we can run the translator - the actual type is extracted by the COinS translator
	// no explicit support for multiple items since only a subset of the metadata is present in the results list
	// therefore, we can't do any better than the COinS translator in such cases

	var sigil = ZU.xpathText(doc,'//*[@id="ContentContainerOS"]/h1');
	if (sigil == "Vollanzeige")
		return "journalArticle"
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === undefined)
		return;

	// use COinS for the basic data
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, t, i);
	});
	translator.translate();
}

