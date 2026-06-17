{
	"translatorID": "1b052690-16dd-431d-9828-9dc675eb55f6",
	"label": "Papers Past",
	"creator": "Philipp Zumstein, Abe Jellinek, and Jason Murphy",
	"target": "^https?://(www\\.)?paperspast\\.natlib\\.govt\\.nz/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-21 16:34:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Philipp Zumstein, Abe Jellinek, and Jason Murphy

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

function detectWeb(doc, url) {
	if (/\/newspapers\/.+\.\d+\.\d+/.test(url)) {
		return "newspaperArticle";
	}
	if (/[?&]query=/.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//h3[@itemprop="headline"]')) {
		if (url.includes('/periodicals/')) {
			return "journalArticle";
		}
		if (url.includes('/manuscripts/')) {
			return "letter";
		}
		if (url.includes('/parliamentary/')) {
			return "report";
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-results .article-preview__title a');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url));
		}
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) {
	var type = detectWeb(doc, url);
	if (type == "newspaperArticle") {
		scrapeNewspaper(doc, url);
	}
	else if (type) {
		scrapeLegacy(doc, url);
	}
}

function scrapeNewspaper(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	var ld = getJSONLD(doc);
	var news = null;
	for (var i = 0; i < ld.length; i++) {
		if (/NewsArticle|Article/i.test(ld[i]['@type'])) {
			news = ld[i];
			break;
		}
	}
	var meta = collectMeta(doc);

	var titles = [];
	if (news && news.headline) {
		titles.push(ZU.trimInternal(news.headline));
	}
	if (meta.hw.citation_title) {
		titles.push(ZU.trimInternal(meta.hw.citation_title));
	}
	if (meta.dc["DC.title"]) {
		titles.push(ZU.trimInternal(meta.dc["DC.title"]));
	}
	var rawTitle = dedupeFirst(titles);
	item.title = fixTitleCase(rawTitle);

	item.publicationTitle = (news && news.isPartOf && news.isPartOf.name)
		|| meta.hw.citation_journal_title
		|| meta.dc["DC.publisher"]
		|| meta.dc["DC.source"]
		|| "";

	item.date = ZU.strToISO((news && news.datePublished) || meta.hw.citation_date || meta.dc["DC.date"] || "");

	var pageStart = (news && news.pageStart) || meta.hw.citation_firstpage || "";
	var pageEnd = (news && news.pageEnd) || meta.hw.citation_lastpage || "";
	var pagesMeta = meta.hw.citation_pages || "";
	item.pages = pagesFrom(pageStart, pageEnd, pagesMeta);

	item.language = (news && news.inLanguage) || meta.hw.citation_language || meta.dc["DC.language"] || "";
	item.rights = (news && news.copyrightNotice) || meta.dc["DC.rights"] || "";

	var cleanUrl = canonicalURL(doc) || (news && news.url) || meta.hw.citation_fulltext_html_url || meta.dc["DC.source"] || url;
	item.url = cleanUrl.split('?')[0].split('#')[0];

	var bib = parseBibliographicDetails(doc);
	if (!item.publicationTitle && bib.publicationTitle) {
		item.publicationTitle = bib.publicationTitle;
	}
	if (!item.date && bib.date) {
		item.date = ZU.strToISO(bib.date);
	}
	if (!item.pages && bib.pages) {
		item.pages = bib.pages;
	}

	var vol = (news && news.isPartOf && news.isPartOf.volumeNumber ? String(news.isPartOf.volumeNumber) : "") || meta.hw.citation_volume || bib.volume || "";
	var iss = (news && news.isPartOf && news.isPartOf.issueNumber ? String(news.isPartOf.issueNumber) : "") || meta.hw.citation_issue || bib.issue || "";

	var extraParts = [];
	if (vol) extraParts.push("Volume: " + vol);
	if (iss) extraParts.push("Issue: " + iss);
	if (extraParts.length > 0) {
		item.extra = extraParts.join("\n");
	}

	item.creators = [];
	item.attachments = [{
		title: "Snapshot",
		document: doc
	}];
	item.libraryCatalog = "Papers Past";
	item.complete();
}

function scrapeLegacy(doc, url) {
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	var title = doc.querySelector('[itemprop="headline"]').firstChild.textContent;
	item.title = fixTitleCase(title);
	
	if (type == "journalArticle" || type == "newspaperArticle") {
		var nav = doc.querySelectorAll('#breadcrumbs .breadcrumbs__crumb');
		if (nav.length > 1) {
			item.publicationTitle = nav[1].textContent;
		}
		if (nav.length > 2) {
			item.date = ZU.strToISO(nav[2].textContent);
		}
		if (nav.length > 3) {
			item.pages = nav[3].textContent.match(/\d+/)[0];
		}
	}
	
	var container = ZU.xpathText(doc, '//h3[@itemprop="headline"]/small');
	if (container) {
		var volume = container.match(/Volume (\w+)\b/);
		if (volume) {
			item.volume = volume[1];
		}
		var issue = container.match(/Issue (\w+)\b/);
		if (issue) {
			item.issue = issue[1];
		}
	}
	
	if (type == "letter") {
		var author = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Author"]]/td[2]');
		if (author && !author.includes("Unknown")) {
			author = author.replace(/^[0-9/]*/, '').replace(/[0-9-]*$/, '').replace('(Sir)', '');
			item.creators.push(ZU.cleanAuthor(author, "author"));
		}
		var recipient = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Recipient"]]/td[2]');
		if (recipient && !recipient.includes("Unknown")) {
			recipient = recipient.replace(/^[0-9/]*/, '').replace(/[0-9-]*$/, '').replace('(Sir)', '');
			item.creators.push(ZU.cleanAuthor(recipient, "recipient"));
		}
		item.date = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Date"]]/td[2]');
		item.language = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Language"]]/td[2]');
	}
	
	item.abstractNote = text(doc, '#tab-english');
	item.url = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]/input/@value');
	if (!item.url) {
		item.url = text(doc, '#researcher-tools-tab p');
	}
	if (!item.url || !item.url.startsWith('http')) {
		item.url = url;
	}
	
	item.libraryCatalog = "Papers Past";
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	
	var imagePageURL = attr(doc, '.imagecontainer a', 'href');
	if (imagePageURL) {
		ZU.processDocuments(imagePageURL, function (imageDoc) {
			item.attachments.push({
				title: "Image",
				mimeType: "image/jpeg",
				url: attr(imageDoc, '.imagecontainer img', 'src')
			});
			item.complete();
		});
	}
	else {
		item.complete();
	}
}

function getJSONLD(doc) {
	var out = [];
	var nodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (var i = 0; i < nodes.length; i++) {
		try {
			var data = JSON.parse(nodes[i].textContent);
			if (Array.isArray(data)) {
				for (var j = 0; j < data.length; j++) {
					out.push(data[j]);
				}
			}
			else if (data) {
				out.push(data);
			}
		}
		catch (e) {}
	}
	return out;
}

function collectMeta(doc) {
	var hw = {};
	var dc = {};
	var metas = doc.querySelectorAll("meta[name]");
	for (var i = 0; i < metas.length; i++) {
		var name = metas[i].getAttribute("name");
		var content = metas[i].getAttribute("content") || "";
		if (!name) continue;
		
		if (/^citation_/i.test(name)) {
			if (name === "citation_author") {
				if (!hw[name]) hw[name] = [];
				hw[name].push(content);
			}
			else {
				hw[name] = content;
			}
			continue;
		}
		
		if (/^DC\./.test(name) || /^dc\./.test(name)) {
			dc[name.replace(/^dc\./, "DC.")] = content;
		}
	}
	return { hw: hw, dc: dc };
}

function parseBibliographicDetails(doc) {
	var textContent = text(doc, '#researcher-tools-tab .citation, .tabs-panel .citation, p.citation') || "";
	var out = { publicationTitle: "", volume: "", issue: "", date: "", pages: "" };
	if (!textContent) return out;

	var pubMatch = textContent.match(/^\s*([^,]+),/);
	if (pubMatch) out.publicationTitle = ZU.trimInternal(pubMatch[1]);

	var volMatch = textContent.match(/Volume\s+([^,]+),/i);
	if (volMatch) out.volume = ZU.trimInternal(volMatch[1]);

	var issMatch = textContent.match(/Issue\s+([^,]+),/i);
	if (issMatch) out.issue = ZU.trimInternal(issMatch[1]);

	var dateMatch = textContent.match(/Issue\s+[^,]+,\s*([^,]+),\s*Page/i) || textContent.match(/,\s*([^,]+),\s*Page/i);
	if (dateMatch) out.date = ZU.trimInternal(dateMatch[1]);

	var pageMatch = textContent.match(/Page\s+([0-9A-Za-z-]+)/i);
	if (pageMatch) out.pages = ZU.trimInternal(pageMatch[1]);

	return out;
}

function dedupeFirst(arr) {
	return arr.find(Boolean) || "";
}

function fixTitleCase(str) {
	if (!str) return str;
	var letters = str.replace(/[^A-Za-z]/g, "");
	if (!letters) return str;
	var uppers = (letters.match(/[A-Z]/g) || []).length;
	var upperRatio = uppers / letters.length;
	
	if (upperRatio > 0.6) {
		return ZU.capitalizeTitle(str.toLowerCase(), true);
	}
	return str;
}

function pagesFrom(start, end, meta) {
	var s = ZU.trimInternal(start);
	var e = ZU.trimInternal(end);
	var m = ZU.trimInternal(meta);
	if (m) return m;
	if (s && e && s !== e) return s + "-" + e;
	if (s) return s;
	return "";
}

function canonicalURL(doc) {
	var link = doc.querySelector('link[rel="canonical"]');
	if (link && link.href) return link.href;
	var og = doc.querySelector('meta[property="og:url"]');
	if (og && og.content) return og.content;
	return "";
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://paperspast.natlib.govt.nz/newspapers?items_per_page=10&snippet=true&query=argentina",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://paperspast.natlib.govt.nz/newspapers/EP19440218.2.61",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coup in Argentina",
				"creators": [],
				"date": "1944-02-18",
				"extra": "Volume: CXXXVII\nIssue: 41",
				"libraryCatalog": "Papers Past",
				"pages": "5",
				"publicationTitle": "Evening Post",
				"rights": "Stuff Ltd is the copyright owner for the Evening Post. You can reproduce in-copyright material from this newspaper for non-commercial use under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International licence (CC BY-NC-SA 4.0). This newspaper is not available for commercial use without the consent of Stuff Ltd. For advice on reproduction of out-of-copyright material from this newspaper, please refer to the Copyright guide.",
				"url": "https://paperspast.natlib.govt.nz/newspapers/EP19440218.2.61",
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
		"url": "https://paperspast.natlib.govt.nz/newspapers/MT19390701.2.6.3",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Inter-School Basketball And Rugby Football",
				"creators": [],
				"date": "1939-07-01",
				"extra": "Volume: 64\nIssue: 153",
				"libraryCatalog": "Papers Past",
				"pages": "2",
				"publicationTitle": "Manawatu Times",
				"rights": "Stuff Ltd is the copyright owner for the Manawatu Times. You can reproduce in-copyright material from this newspaper for non-commercial use under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International licence (CC BY-NC-SA 4.0). This newspaper is not available for commercial use without the consent of Stuff Ltd. For advice on reproduction of out-of-copyright material from this newspaper, please refer to the Copyright guide.",
				"url": "https://paperspast.natlib.govt.nz/newspapers/MT19390701.2.6.3",
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
		"url": "https://paperspast.natlib.govt.nz/periodicals/FRERE18831101.2.2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"The Law Within the Law.\"",
				"creators": [],
				"date": "1883-11-01",
				"issue": "2",
				"libraryCatalog": "Papers Past",
				"pages": "3",
				"publicationTitle": "Freethought Review",
				"url": "https://paperspast.natlib.govt.nz/periodicals/FRERE18831101.2.2",
				"volume": "I",
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
		"url": "https://paperspast.natlib.govt.nz/manuscripts/MCLEAN-1024774.2.1",
		"items": [
			{
				"itemType": "letter",
				"title": "1 page written 19 Jun 1873 by James Mackay in Hamilton City to Sir Donald McLean in Wellington",
				"creators": [
					{
						"firstName": "Mackay",
						"lastName": "James",
						"creatorType": "author"
					},
					{
						"firstName": "McLean",
						"lastName": "Donald",
						"creatorType": "recipient"
					}
				],
				"date": "1873-06-19",
				"abstractNote": "(For His Excellency's information)\n(Signed) Donald McLean\n19th. June 1873\n\n\nNEW ZEALAND TELEGRAPH.\nHamilton\nTo:- Hon. D. McLean \nWellington\n18th. June 1873\nNo news to-day from anywhere I am waiting arrival of Dr. Pollen here this evening. General feeling in Waikato is calming down. The establishments of the Outposts has given confidence against attack and the settlers are quietly attending to their usual business. I do not think many anticipate an agressive movement by the King Party. It, however, the almost unanimous opinion that the murderers of Sullivan should be taken at any cost, no one believes the murderers will be given up for reward.\n(Signed) \nJames Mackay Jnr.",
				"language": "English",
				"libraryCatalog": "Papers Past",
				"url": "https://paperspast.natlib.govt.nz/manuscripts/MCLEAN-1024774.2.1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://paperspast.natlib.govt.nz/parliamentary/AJHR1899-I.2.4.2.3",
		"items": [
			{
				"itemType": "report",
				"title": "Rabbits and Rabbitskins, Exported from Colony During Years 1894 to 1898, and Number and Value Thereof.",
				"creators": [],
				"libraryCatalog": "Papers Past",
				"url": "https://paperspast.natlib.govt.nz/parliamentary/AJHR1899-I.2.4.2.3",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
