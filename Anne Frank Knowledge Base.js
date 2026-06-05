{
	"translatorID": "cd29a8b7-1b52-4c8c-b2af-7cfc5cbbecb9",
	"label": "Anne Frank Knowledge Base",
	"creator": "Vera de Kok",
	"target": "^https?://research\\.annefrank\\.org/(?:en|nl|api)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-05 12:00:00"
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

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detectWeb(doc, url) {
	return parseAnneFrankURL(url).uuid ? "encyclopediaArticle" : "multiple";
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let { lang, query } = parseAnneFrankURL(url);
		let data = await fetchJSON(buildSearchAPIURL(lang, query));
		let results = (data.results || []).filter(result => result.instance && result.instance.uuid);

		let titles = {};
		for (let i = 0; i < results.length; i++) {
			titles[i] = getDisplayTitle(results[i].type, results[i].instance, lang);
		}

		let selected = await Zotero.selectItems(titles);
		if (!selected) return;
		for (let i of Object.keys(selected)) {
			translateRecord(results[i].type, results[i].instance, lang);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let { lang, endpoint, uuid } = parseAnneFrankURL(url);
	let data = await fetchJSON(buildAPIURL(lang, endpoint, uuid));
	translateRecord(endpointToType(endpoint), data, lang, doc);
}

function parseAnneFrankURL(url) {
	let { pathname, searchParams } = new URL(url);
	let segments = pathname.split("/").filter(Boolean);
	let lang = segments[0] == "nl" ? "nl" : "en";

	// A detail/API page has a UUID segment preceded by its type slug,
	// e.g. /en/onderwerpen/<uuid>/ or /en/api/subjects/<uuid>
	let uuidIndex = segments.findIndex(segment => UUID_RE.test(segment));
	if (uuidIndex > 0) {
		let slug = segments[uuidIndex - 1];
		return {
			lang,
			endpoint: SLUG_TO_ENDPOINT[slug] || slug,
			uuid: segments[uuidIndex].toLowerCase()
		};
	}

	return { lang, query: searchParams.get("q") || "" };
}

function buildAPIURL(lang, endpoint, uuid) {
	return "https://research.annefrank.org/" + lang + "/api/" + endpoint + "/" + uuid;
}

function buildSearchAPIURL(lang, query) {
	var apiURL = "https://research.annefrank.org/" + lang + "/api/search";
	if (query) {
		apiURL += "?q=" + encodeURIComponent(query);
	}
	return apiURL;
}

function fetchJSON(url) {
	return requestJSON(url, {
		headers: {
			Accept: "application/json"
		}
	});
}

function endpointToType(endpoint) {
	return endpoint.replace(/s$/, "");
}

function translateRecord(type, data, lang, doc) {
	var item = new Zotero.Item("encyclopediaArticle");
	item.title = getItemTitle(type, data, lang);
	item.abstractNote = getLocalized(data, "summary", lang);
	item.url = getCanonicalURL(type, data, lang);
	item.encyclopediaTitle = getPublicationTitle(lang);
	item.publisher = getPublisher(lang);
	item.place = "Amsterdam";
	item.language = lang == "nl" ? "nl-NL" : "en";
	item.rights = "CC0";
	item.accessDate = "CURRENT_TIMESTAMP";

	if (data.modified_on) {
		item.date = data.modified_on.substr(0, 10);
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

function getCanonicalURL(type, data, lang) {
	var slug = typeToSlug(type);
	if (data.uuid && slug) {
		return "https://research.annefrank.org/" + lang + "/" + slug + "/" + data.uuid + "/";
	}
	return data.url || "";
}

function typeToSlug(type) {
	switch (type) {
		case "person":
			return "personen";
		case "event":
		case "aw_event":
			return "gebeurtenissen";
		case "location":
			return "locaties";
		case "subject":
			return "onderwerpen";
	}
	return "";
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

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://research.annefrank.org/en/?page=1&q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://research.annefrank.org/en/onderwerpen/e83fe696-a5d6-4f6a-a7c5-7141996ce5b8/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Philosophy of Life, Van Pels couple",
				"creators": [],
				"date": "2025-05-19",
				"abstractNote": "Hermann and Auguste van Pels were registered as belonging to the Jewish religion.",
				"encyclopediaTitle": "Anne Frank Knowledge Base",
				"language": "en",
				"libraryCatalog": "Anne Frank Knowledge Base",
				"place": "Amsterdam",
				"publisher": "Anne Frank House",
				"rights": "CC0",
				"url": "https://research.annefrank.org/en/onderwerpen/e83fe696-a5d6-4f6a-a7c5-7141996ce5b8/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://research.annefrank.org/en/gebeurtenissen/7580b697-5097-4ee5-8537-44e9928396de/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Anne Frank in kindergarten (April 9, 1934 - July 13, 1935)",
				"creators": [],
				"date": "2025-10-15",
				"abstractNote": "Anne attended Preparatory School No. 51, the kindergarten of the 6th Montessori School in Amsterdam, for over a year.",
				"encyclopediaTitle": "Anne Frank Knowledge Base",
				"extra": "Event date start: 1934-04-09\nEvent date end: 1935-07-13",
				"language": "en",
				"libraryCatalog": "Anne Frank Knowledge Base",
				"place": "Amsterdam",
				"publisher": "Anne Frank House",
				"rights": "CC0",
				"url": "https://research.annefrank.org/en/gebeurtenissen/7580b697-5097-4ee5-8537-44e9928396de/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://research.annefrank.org/en/personen/f3aa825e-fa88-4494-8d21-c1e0e6466b1b/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Vlieger uit Eindhoven",
				"creators": [],
				"date": "2025-05-19",
				"abstractNote": "An unnamed crew member stationed at the German air base in Eindhoven",
				"encyclopediaTitle": "Anne Frank Knowledge Base",
				"language": "en",
				"libraryCatalog": "Anne Frank Knowledge Base",
				"place": "Amsterdam",
				"publisher": "Anne Frank House",
				"rights": "CC0",
				"url": "https://research.annefrank.org/en/personen/f3aa825e-fa88-4494-8d21-c1e0e6466b1b/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://research.annefrank.org/en/locaties/aa7d60c3-6d94-4f52-a729-96440eeb4d5f/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Sixth Montessori school",
				"creators": [],
				"date": "2025-11-24",
				"abstractNote": "The Sixth Montessori School was the primary school attended by Anne Frank.",
				"encyclopediaTitle": "Anne Frank Knowledge Base",
				"language": "en",
				"libraryCatalog": "Anne Frank Knowledge Base",
				"place": "Amsterdam",
				"publisher": "Anne Frank House",
				"rights": "CC0",
				"url": "https://research.annefrank.org/en/locaties/aa7d60c3-6d94-4f52-a729-96440eeb4d5f/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
