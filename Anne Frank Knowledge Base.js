{
	"translatorID": "cd29a8b7-1b52-4c8c-b2af-7cfc5cbbecb9",
	"label": "Anne Frank Knowledge Base",
	"creator": "Vera de Kok",
	"target": "^https?://research\\.annefrank\\.org/(?:(?:en|nl)/(?:api/(?:search|events|aw_events|locations|subjects|persons|relations)(?:/[0-9a-f-]+)?|(?:personen|gebeurtenissen|locaties|onderwerpen)/[0-9a-f-]+/?|\\?(?=[^#]*\\bq=))|api/search(?:\\?|$))",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-29 00:00:00"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Vera de Kok

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

var SLUG_TO_ENDPOINT = {
	personen: "persons",
	gebeurtenissen: "events",
	locaties: "locations",
	onderwerpen: "subjects"
};

var TYPE_TO_ENDPOINT = {
	person: "persons",
	event: "events",
	location: "locations",
	subject: "subjects",
	relation: "relations",
	search: "search"
};
var awEventType = "aw_event";
TYPE_TO_ENDPOINT[awEventType] = "aw_events";

var MONTH_NAMES = {
	en: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	],
	nl: [
		"januari",
		"februari",
		"maart",
		"april",
		"mei",
		"juni",
		"juli",
		"augustus",
		"september",
		"oktober",
		"november",
		"december"
	]
};

function detectWeb(doc, url) {
	var parsed = parseAnneFrankURL(url);
	if (!parsed) {
		return false;
	}

	if (parsed.kind == "search") {
		return "multiple";
	}

	return "encyclopediaArticle";
}

function doWeb(doc, url) {
	var parsed = parseAnneFrankURL(url);
	if (!parsed) {
		return;
	}

	if (parsed.kind == "search") {
		doSearchPage(parsed);
		return;
	}

	fetchJSON(buildAPIURL(parsed.lang, parsed.endpoint, parsed.uuid), function (data) {
		translateRecord(endpointToType(parsed.endpoint), data, parsed.lang, doc);
	});
}

function parseAnneFrankURL(url) {
	var unlocalizedAPISearchMatch = url.match(/^https?:\/\/research\.annefrank\.org\/api\/search(?:\?|$)/i);
	if (unlocalizedAPISearchMatch) {
		return {
			kind: "search",
			lang: "en",
			query: getQueryParameter(url, "q") || ""
		};
	}

	var detailMatch = url.match(/^https?:\/\/research\.annefrank\.org\/(en|nl)\/([^/?#]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?/i);
	if (detailMatch && SLUG_TO_ENDPOINT[detailMatch[2]]) {
		return {
			kind: "record",
			lang: detailMatch[1],
			endpoint: SLUG_TO_ENDPOINT[detailMatch[2]],
			uuid: detailMatch[3].toLowerCase()
		};
	}

	var apiRecordMatch = url.match(/^https?:\/\/research\.annefrank\.org\/(en|nl)\/api\/(events|aw_events|locations|subjects|persons|relations)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
	if (apiRecordMatch) {
		return {
			kind: "record",
			lang: apiRecordMatch[1],
			endpoint: apiRecordMatch[2],
			uuid: apiRecordMatch[3].toLowerCase()
		};
	}

	var searchMatch = url.match(/^https?:\/\/research\.annefrank\.org\/(en|nl)\/(?:api\/search)?(?:\?|$)/i);
	if (searchMatch) {
		return {
			kind: "search",
			lang: searchMatch[1],
			query: getQueryParameter(url, "q") || ""
		};
	}

	return false;
}

function getQueryParameter(url, name) {
	var match = url.match(new RegExp("[?&]" + name + "=([^&#]*)", "i"));
	if (!match) {
		return "";
	}
	return decodeURIComponent(match[1].replace(/\+/g, " "));
}

function buildAPIURL(lang, endpoint, uuid) {
	var apiURL = "https://research.annefrank.org/" + lang + "/api/" + endpoint;
	if (uuid) {
		apiURL += "/" + uuid;
	}
	return apiURL + "?format=json";
}

function buildSearchAPIURL(lang, query) {
	var apiURL = "https://research.annefrank.org/" + lang + "/api/search";
	if (query) {
		apiURL += "?q=" + encodeURIComponent(query) + "&format=json";
	}
	else {
		apiURL += "?format=json";
	}
	return apiURL;
}

function doSearchPage(parsed) {
	fetchJSON(buildSearchAPIURL(parsed.lang, parsed.query), function (data) {
		var results = data.results || [];
		var exactUUID = getUUIDSearch(parsed.query);
		var exactResult = exactUUID && findExactUUIDResult(results, exactUUID);

		if (exactResult) {
			translateSearchResult(exactResult, parsed.lang);
			return;
		}

		if (results.length == 1) {
			translateSearchResult(results[0], parsed.lang);
			return;
		}

		var choices = {};
		var lookup = {};
		for (var i = 0; i < results.length; i++) {
			var result = results[i];
			if (!result.instance || !result.instance.uuid) {
				continue;
			}
			var key = result.type + "|" + result.instance.uuid;
			choices[key] = getDisplayTitle(result.type, result.instance, parsed.lang);
			lookup[key] = result;
		}

		Zotero.selectItems(choices, function (selected) {
			if (!selected) {
				return;
			}
			for (var key in selected) {
				translateSearchResult(lookup[key], parsed.lang);
			}
		});
	});
}

function getUUIDSearch(query) {
	var match = (query || "").match(/^uuid:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
	return match ? match[1].toLowerCase() : false;
}

function findExactUUIDResult(results, uuid) {
	for (var i = 0; i < results.length; i++) {
		if (results[i].instance && results[i].instance.uuid
			&& results[i].instance.uuid.toLowerCase() == uuid) {
			return results[i];
		}
	}
	return false;
}

function translateSearchResult(result, lang) {
	if (!result.instance) {
		return;
	}

	translateRecord(result.type, result.instance, lang);
}

function fetchJSON(url, callback) {
	ZU.doGet(url, function (text) {
		callback(JSON.parse(text));
	});
}

function endpointToType(endpoint) {
	for (var type in TYPE_TO_ENDPOINT) {
		if (TYPE_TO_ENDPOINT[type] == endpoint) {
			return type;
		}
	}
	return endpoint;
}

function translateRecord(type, data, lang, doc) {
	var item = new Zotero.Item("encyclopediaArticle");
	item.title = getItemTitle(type, data, lang);
	item.abstractNote = getLocalized(data, "summary", lang);
	item.url = data.url || "";
	item.encyclopediaTitle = getPublicationTitle(lang);
	item.publisher = getPublisher(lang);
	item.place = "Amsterdam";
	item.language = lang == "nl" ? "nl-NL" : "en";
	item.rights = "CC0";
	item.accessDate = "CURRENT_TIMESTAMP";

	var publicationDate = getPublicationDate(type, data);
	if (publicationDate) {
		item.date = publicationDate;
	}

	if (doc && item.url && doc.location && doc.location.href == item.url) {
		item.attachments.push({
			title: "Snapshot",
			document: doc
		});
	}

	var extra = [];
	addEventDateExtra(extra, type, data);
	item.extra = extra.join("\n");

	item.complete();
}

function getItemTitle(type, data, lang) {
	var title = getDisplayTitle(type, data, lang);
	var eventDate = getEventDateLabel(type, data, lang);
	if (eventDate) {
		return title + " (" + eventDate + ")";
	}
	return title;
}

function getDisplayTitle(type, data, lang) {
	if (type == "person") {
		return getLocalized(data, "title", lang)
			|| ZU.trimInternal([data.first_name, data.infix, data.last_name].join(" "));
	}
	if (type == "event" || type == "aw_event") {
		return getLocalized(data, "name", lang);
	}
	if (type == "location" || type == "subject") {
		return getLocalized(data, "name", lang);
	}
	return getLocalized(data, "title", lang)
		|| getLocalized(data, "name", lang)
		|| "Anne Frank Research record";
}

function getLocalized(data, base, lang) {
	return data[base + "_" + lang] || data[base] || data[base + "_en"] || data[base + "_nl"] || "";
}

function getPublicationTitle(lang) {
	return lang == "nl" ? "Anne Frank Kennisbank" : "Anne Frank Knowledge Base";
}

function getPublisher(lang) {
	return lang == "nl" ? "Anne Frank Stichting" : "Anne Frank House";
}

function getEventDateLabel(type, data, lang) {
	if (type != "event" && type != "aw_event") {
		return "";
	}
	if (data.date) {
		return formatISODate(data.date, lang);
	}
	if (data.date_start && data.date_end) {
		return formatISODate(data.date_start, lang) + " - " + formatISODate(data.date_end, lang);
	}
	if (data.date_start) {
		return formatISODate(data.date_start, lang);
	}
	if (data.date_end) {
		return formatISODate(data.date_end, lang);
	}
	return "";
}

function addEventDateExtra(extra, type, data) {
	if (type != "event" && type != "aw_event") {
		return;
	}
	if (data.date) {
		extra.push("Event date: " + data.date);
		return;
	}
	if (data.date_start) {
		extra.push("Event date start: " + data.date_start);
	}
	if (data.date_end) {
		extra.push("Event date end: " + data.date_end);
	}
}

function formatISODate(date, lang) {
	var match = (date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) {
		return date || "";
	}
	var year = match[1];
	var monthIndex = parseInt(match[2]) - 1;
	var day = parseInt(match[3]);
	var month = (MONTH_NAMES[lang] || MONTH_NAMES.en)[monthIndex];
	if (!month) {
		return date;
	}
	if (lang == "nl") {
		return day + " " + month + " " + year;
	}
	return month + " " + day + ", " + year;
}

function getPublicationDate(type, data) {
	if (data.modified_on) {
		return data.modified_on.substr(0, 10);
	}
	return "";
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://research.annefrank.org/en/?page=1&q=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
