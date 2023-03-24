{
	"translatorID": "79b111e7-ba34-450c-98b2-d1cd1d964ed8",
	"label": "Novaya Gazeta Europe",
	"creator": "Zoë C. Ma",
	"target": "^https://novayagazeta\\.eu/.+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-24 07:49:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Zoë C. Ma

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

// TODO: Implement multiple?

// The RegExp is for "origin/site-section/(yyyy/mm/dd/article-pretty-path)",
// where the "slug" is the captured group; see getRecord().
const newsArticleRE = new RegExp("^https://novayagazeta.eu/.+/(\\d{4}/\\d{2}/\\d{2}/.+)", "i");

async function detectWeb(doc, url) {
	if (!url.match(newsArticleRE)) return false;
	// In the browser, the page content (doc) is loaded asynchronously,
	// including the <meta> tags. This is done by the JS code in the HTML
	// document requesting full article data from the API server. We would
	// rather "await"/"then" on this promise that we can control, rather than
	// banking the page load whose status is not easily known. Note that only
	// "url" is used in this function.
	try {
		const record = await getRecord(url);
		const recordType = record.typeGenreId;
		if (recordType) {
			switch (recordType) {
				case "intervju":
					return "interview";
				case "podkast":
					return "podcast";
				default:
					// NOTE: This encompasses almost all other types published
					// there.
					return "newspaperArticle";
			}
		}
		// Fallback: webpage, because it is one. This can happen for some more
		// ad-hoc "types" such as videos and letters. NOTE: Try harder for more
		// accurate detection?
		return "webpage";
	}
	catch (err) {
		Z.debug(`Error: Exception in detectWeb() for article at ${url}`);
		Z.debug(`       The error was: ${err}`);
		return false;
	}
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	const itemType = await detectWeb(doc, url);
	if (!itemType) return;

	const item = new Z.Item(itemType);
	// The publicationTitle field is the "identity" of the publisher and we
	// want to keep it unique regardless of the language of the document.
	item.url = url;
	item.publicationTitle = "Novaya Gazeta Europe";
	item.section = getGenre(doc);
	item.attachments = [{
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	}];
	// NOTE: Download PDF file too?

	try {
		const record = await getRecord(url);
		populateItem(item, record);
	}
	catch (err) {
		Z.debug(`Error: Failed to get or use record for article at ${url}`);
		Z.debug(`       The error was: ${err}`);
	}
	finally {
		// Even if an error occured, we can still salvage some bare-minimum
		// info.
		item.complete();
	}
}

// Perform request for the JSON data using the Novaya Gazeta RESTful API.
// Returns a promise that resolves to the record object by parsing as JSON.
// Memoize the data value because detectWeb() already sent one.
const _apiCache = new Map();

async function getRecord(url) {
	// Get the "slug" part from the url for the individual article.
	if (_apiCache.has(url)) {
		return _apiCache.get(url);
	}
	const articleSlug = url.match(newsArticleRE)[1];
	const queryURL = `https://novayagazeta.eu/api/v1/get/record?slug=${encodeURIComponent(articleSlug)}`;
	const { record: articleData } = await requestJSON(queryURL);
	_apiCache.set(url, articleData);
	return articleData;
}

// Topics, in typeRubricId. Only the first two seems to be used extensively for
// now (especially on the English website), and they don't appear anywhere else
// except on the page heading. The English names are taken as they are from the
// page headings wherever possible.
const _topicLookup = {
	obshhestvo: "Society",
	jekonomika: "Economics",
	politika: "Politics", // see https://novayagazeta.eu/articles/2023/02/28/dead-end-en
	sport: "Sports", // see https://novayagazeta.eu/articles/2022/12/31/mr-edson-moonlight-en
	kultura: "Culture" // Found in RU edition, yet to see in EN.
};

function populateItem(item, record) {
	// NOTE: The ISSN "1606-4828" was for the original Novaya Gazeta that was
	// shut down. The new online publication doesn't have an ISSN yet.
	item.language = record.lang;
	item.title = deHTML(record.title);
	// NOTE: Use "subtitle" (which can be substantially long) or "lead"?
	item.abstractNote = record.subtitle;
	item.date = (new Date(record.date)).toISOString();

	const itemAuthors = [];
	const authType = item.itemType === "interview" ? "interviewer" : "author";
	for (const author of record.authors) {
		// If the author is likely "institutional" and the same as the
		// publisher (or is part of it, such as "video department", skip.
		// NOTE: This is provisional - we may change how we deal with
		// "publisher author" with more advice and feedback.
		if (isNovayaGazeta(author.name)) {
			continue;
		}
		if (record.lang === "ru") {
			// Extract the Russian names
			// Here the field "name" refers to the full name.
			itemAuthors.push(ZU.cleanAuthor(author.name, authType));
		}
		else {
			// Translated article, extract transliterated names
			// These names have separate fields for surname and "name" (i.e.
			// given name).
			for (const localeInfo of author.locale) {
				// NOTE: Only handling "en" here because there doesn't seem to
				// be any other translation-target language for now. But in the
				// JSON data this space is an array (with just one item for
				// now), so it *might* be expanded in the future.
				if (localeInfo.lang === "en") {
					itemAuthors.push(ZU.cleanAuthor(`${localeInfo.name} ${localeInfo.surname}`, authType));
					// Break out of the loop for translated names because we
					// can only handle "en" for now.
					break;
				}
			}
		}
	}
	if (item.itemType === "interview") {
		const auth = findInterviewee(record);
		if (auth) itemAuthors.push(auth);
	}
	item.creators = itemAuthors; // Could be empty for news.

	// Tags are a bit irregular, and their language doesn't necessarily match
	// the content's. They could be absent (empty array).
	item.tags = record.tags;

	// A custom field, see _topicLookup.
	if (record.lang === "ru") {
		// Just take the display name.
		item.topic = record.typeRubricDisplayName;
	}
	else {
		// Use the translated name.
		const t = _topicLookup[record.typeRubricId];
		if (t) {
			item.topic = t;
		}
	}
}

// Find the most likely person to be the interviewee for interview articles.
// This is done by scanning the "body" record (fortunately a flat array), and
// look for an object with "type": "person". The first one is most likely the
// interviewee.
function findInterviewee(record) {
	for (const frag of record.body) {
		if (frag.type === "person") {
			// For Interviews, the interviewee is the "hero(ine)" and the
			// interviewer is the contributor.
			// The property "name" is in full-name format.
			// NOTE: We're returning the first match for now. But in theory
			// there can be more than one interviewee, and this may change
			// accordingly.
			return ZU.cleanAuthor(frag.name, "author");
		}
	}
	return false;
}

// Utilities.

// Convert the string representing a fragment of HTML markup into plain text.
const _theParser = new DOMParser();

function deHTML(str) {
	const doc = _theParser.parseFromString(str, "text/html");
	const plainText = text(doc, "body");
	return ZU.trimInternal(plainText);
}

// Extract the "genre" from the <meta> tag.
// This is also available from the API result.
// The content language of the "genre" value already matches the content
// language.
function getGenre(doc) {
	return attr(doc, "meta[name='genre']", "content");
}

// Returns boolean indicating whether the "author" includes the full name of
// Novaya Gazeta Europe (if it does, it is likely an "institutional" author,
// e.g. "Video department Novaya Gazeta Europe").
function isNovayaGazeta(str) {
	// This should cover nominative, genitive, and instrumental cases.
	return (/нов(ая|ой|ою) газет(а|ы|ой|ою) европ(а|ы|ой|ою)/i).test(str);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"defer": true,
		"url": "https://novayagazeta.eu/articles/2023/03/22/chechen-roots-of-frances-wrestling-team-en",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Chechen roots of France’s wrestling team",
				"creators": [
					{
						"firstName": "Zara",
						"lastName": "Murtazalieva",
						"creatorType": "author"
					}
				],
				"date": "2023-03-22T11:11:00.000Z",
				"abstractNote": "France only fielded Chechens with French citizenship to the 2023 European U23 Wrestling Championships. How did it happen and why are some in Russia not happy about it?",
				"language": "en",
				"libraryCatalog": "Novaya Gazeta Europe",
				"publicationTitle": "Novaya Gazeta Europe",
				"section": "Comment",
				"url": "https://novayagazeta.eu/articles/2023/03/22/chechen-roots-of-frances-wrestling-team-en",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "борьба"
					},
					{
						"tag": "спорт"
					},
					{
						"tag": "спортсмены"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://novayagazeta.eu/articles/2023/03/19/will-putin-ever-stand-trial-in-the-hague-en",
		"items": [
			{
				"itemType": "interview",
				"title": "Will Putin ever stand trial in The Hague?",
				"creators": [
					{
						"firstName": "Irina",
						"lastName": "Tumakova",
						"creatorType": "interviewer"
					},
					{
						"firstName": "Gleb",
						"lastName": "Bogush",
						"creatorType": "author"
					}
				],
				"date": "2023-03-19T16:43:00.000Z",
				"abstractNote": "We asked legal expert Gleb Bogush what the ICC arrest warrant means for the Russian president",
				"language": "en",
				"libraryCatalog": "Novaya Gazeta Europe",
				"url": "https://novayagazeta.eu/articles/2023/03/19/will-putin-ever-stand-trial-in-the-hague-en",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Putin"
					},
					{
						"tag": "politicians"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://novayagazeta.eu/articles/2023/03/11/russias-fake-refugee-haven",
		"defer": true,
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Russia’s fake refugee haven",
				"creators": [
					{
						"firstName": "Anastasia",
						"lastName": "Karyakina",
						"creatorType": "author"
					},
					{
						"firstName": "Ksenia",
						"lastName": "Zinder",
						"creatorType": "author"
					}
				],
				"date": "2023-03-11T15:21:00.000Z",
				"abstractNote": "The Russian government is lying about the number of Ukrainian refugees in the country: Civic Assistance Committee’s research",
				"language": "en",
				"libraryCatalog": "Novaya Gazeta Europe",
				"publicationTitle": "Novaya Gazeta Europe",
				"section": "Data",
				"url": "https://novayagazeta.eu/articles/2023/03/11/russias-fake-refugee-haven",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Russian government"
					},
					{
						"tag": "data research"
					},
					{
						"tag": "refugees"
					},
					{
						"tag": "research"
					},
					{
						"tag": "statistics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://novayagazeta.eu/articles/2023/03/15/dolche-bita",
		"defer": true,
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Дольче бита",
				"creators": [
					{
						"firstName": "Светлана",
						"lastName": "Стивенсон",
						"creatorType": "author"
					}
				],
				"date": "2023-03-15T10:35:00.000Z",
				"abstractNote": "Как криминальная культура силовиков и «братков» в рядах элиты толкнула россиян в милитаристский угар. Объясняет социолог Светлана Стивенсон",
				"language": "ru",
				"libraryCatalog": "Novaya Gazeta Europe",
				"publicationTitle": "Novaya Gazeta Europe",
				"section": "Комментарий",
				"url": "https://novayagazeta.eu/articles/2023/03/15/dolche-bita",
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
		"url": "https://novayagazeta.eu/articles/2023/03/23/v-reestr-inoagentov-vnesli-iurista-pavla-chikova-i-blogera-iliu-varlamova-news",
		"defer": true,
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "В реестр «иноагентов» внесли юриста Павла Чикова и журналиста Илью Варламова",
				"creators": [],
				"date": "2023-03-23T17:05:00.000Z",
				"language": "ru",
				"libraryCatalog": "Novaya Gazeta Europe",
				"publicationTitle": "Novaya Gazeta Europe",
				"section": "Новости",
				"url": "https://novayagazeta.eu/articles/2023/03/23/v-reestr-inoagentov-vnesli-iurista-pavla-chikova-i-blogera-iliu-varlamova-news",
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
		"url": "https://novayagazeta.eu/articles/2023/03/20/donosy-ekho-voiny",
		"items": [
			{
				"itemType": "podcast",
				"title": "Доносы — эхо войны",
				"creators": [],
				"abstractNote": "Как в России доносят на несогласных и почему это может коснуться каждого",
				"language": "ru",
				"url": "https://novayagazeta.eu/articles/2023/03/20/donosy-ekho-voiny",
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
		"defer": true,
		"url": "https://novayagazeta.eu/articles/2022/12/31/mr-edson-moonlight-en",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Mr Edson Moonlight",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Pracht",
						"creatorType": "author"
					}
				],
				"date": "2022-12-31T07:43:00.000Z",
				"abstractNote": "The passing of football legend Pelé marks a moment to review his legacy yet another time and work out why he was so important to The Game",
				"language": "en",
				"libraryCatalog": "Novaya Gazeta Europe",
				"publicationTitle": "Novaya Gazeta Europe",
				"section": "Stories",
				"url": "https://novayagazeta.eu/articles/2022/12/31/mr-edson-moonlight-en",
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
