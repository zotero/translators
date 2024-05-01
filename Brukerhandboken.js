{
	"translatorID": "6c94ba9a-8639-4f58-bea3-076f774cf3a1",
	"label": "Brukerhåndboken",
	"creator": "Sondre Bogen-Straume",
	"target": "https://brukerhandboken\\.miraheze\\.org/",
	"minVersion": "5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-05-01 11:15:16"
}

/**
	Copyright (c) 2024 Sondre Bogen-Straume
	
	Based on Wikipedia translator by Aurimas Vinckevicius and Abe Jellinek
	
	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, _url) {
	// first check if we're on a search page. I don't know if anyone will commonly
	// want to scrape multiples on Wikipedia, but there's no harm in supporting it
	// (and thus preventing search result pages from being scraped as ordinary
	// encyclopedia articles).
	if (doc.body.classList.contains('ns-special') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	
	// exclude the non-viewing interface, since it doesn't give us much
	// to work with and users are unlikely to want to add it as an
	// encyclopediaArticle.
	// e.g., this excludes https://en.wikipedia.org/w/index.php?title=Main_Page&action=edit,
	// https://en.wikipedia.org/w/index.php?title=Main_Page&action=history, etc.
	if (!doc.body.classList.contains('action-view')) {
		return false;
	}
	
	// Diff interface is not supported
	if (new URLSearchParams(doc.location.search).get('diff')) {
		return false;
	}

	// excludes special pages, such as https://en.wikipedia.org/wiki/Special:RecentChanges
	if (doc.body.classList.contains('ns--1')) {
		return false;
	}

	// on desktop, the article title is in #firstHeading.
	// on mobile, it's #section_0.
	if (doc.getElementById('firstHeading') || doc.getElementById('section_0')) {
		return 'encyclopediaArticle';
	}
	
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.mw-search-result .mw-search-result-heading > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item('encyclopediaArticle');
	item.title = ZU.trimInternal((doc.getElementById('firstHeading') || doc.getElementById('section_0')).textContent);
	
	/* Removing the creator and publisher. Wikipedia is pushing the creator in their own
  	directions on how to cite http://en.wikipedia.org/w/index.php?title=Special%3ACite&page=Psychology
  	but style guides - including Chicago and APA disagree and prefer just using titles.
  	cf. e.g. http://blog.apastyle.org/apastyle/2009/10/how-to-cite-wikipedia-in-apa-style.html
  	For Publisher, not even Wikipedia suggests citing the Foundation as a Publisher.

	item.creators.push({
		lastName: 'Brukerhåndboken',
		fieldMode: 1,
		creatorType: 'author'
	});

	item.publisher = 'Brukerhåndboken';
	*/
	item.rights = 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International';

	// turns out it's not that trivial to get the localized title for Wikipedia
	// we can try to strip it from the page title though
	// test for all sorts of dashes to account for different locales
	/** TODO: there's probably a better way to do this, since sometimes page
	 * title only says "- Wikipedia" (in some other language)
	 */
	var m = doc.title.match(/[\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B]\s*([^\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B]+)$/);
	if (m) {
		item.encyclopediaTitle = m[1];
	}
	else {
		item.encyclopediaTitle = 'Brukerhåndboken';
	}

	// we don't get a permalink directly on mobile, but it goes into the
	// "retrieved from" footer
	let permalink = ZU.xpathText(doc, '//li[@id="t-permalink"]/a/@href')
		|| attr(doc, '.printfooter a', 'href');
	var revID;
	if (permalink) {
		revID = permalink.match(/[&?]oldid=(\d+)/)[1];
		item.extra = 'Page Version ID: ' + revID;
		if (permalink.startsWith('/')) {
			item.url = 'https://' + doc.location.hostname + permalink;
		}
		else {
			item.url = permalink;
		}
	}
	else {
		// if we can't find a link, just use the page URL
		item.url = url;
	}

	item.attachments.push({
		url: url,
		title: 'Snapshot',
		mimeType: 'text/html',
		snapshot: true
	});

	item.language = doc.documentElement.lang;
	
	// last modified date is hard to get from the page because it is localized
	var pageInfoURL = '/w/api.php?action=query&format=json'
		+ '&inprop=url%7Cdisplaytitle'
		+ '&exintro=true&explaintext=true' // Intro section in plain text
		+ '&prop=info%7Cextracts'
		+ (revID // Different if we want a specific revision (this should be the general case)
			? '%7Crevisions&rvprop=timestamp&revids=' + encodeURIComponent(revID)
			: '&titles=' + encodeURIComponent(item.title)
		);
	ZU.doGet(pageInfoURL, function (text) {
		var retObj = JSON.parse(text);
		if (retObj && !retObj.query.pages['-1']) {
			var pages = retObj.query.pages;
			for (var i in pages) {
				if (pages[i].revisions) {
					item.date = pages[i].revisions[0].timestamp;
				}
				else {
					item.date = pages[i].touched;
				}

				let displayTitle = pages[i].displaytitle
					.replace(/<em>/g, '<i>')
					.replace(/<\/em>/g, '</i>')
					.replace(/<strong>/, '<b>')
					.replace(/<\/strong>/, '</b>');

				// https://www.zotero.org/support/kb/rich_text_bibliography
				item.title = filterTagsInHTML(displayTitle,
					'i, b, sub, sup, '
					+ 'span[style="font-variant:small-caps;"], '
					+ 'span[class="nocase"]');
				
				// Note that this is the abstract for the latest revision,
				// not necessarily the revision that is being queried
				item.abstractNote = pages[i].extract;
				
				// we should never have more than one page returned,
				// but break just in case
				break;
			}
		}
		item.complete();
	});
}

function filterTagsInHTML(html, allowSelector) {
	let elem = new DOMParser().parseFromString(html, 'text/html');
	filterTags(elem.body, allowSelector);
	return elem.body.innerHTML;
}

function filterTags(root, allowSelector) {
	for (let node of root.childNodes) {
		if (!node.tagName) {
			continue;
		}

		if (node.matches(allowSelector)) {
			filterTags(node, allowSelector);
		}
		else {
			while (node.firstChild) {
				let firstChild = node.firstChild;
				node.parentNode.insertBefore(firstChild, node);
				filterTags(firstChild, allowSelector);
			}
			node.remove();
		}
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brukerhandboken.miraheze.org/wiki/Brukermedvirkning",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Brukermedvirkning",
				"creators": [],
				"date": "2024-05-01T08:31:53Z",
				"abstractNote": "Informasjon om brukermedvirkning her.",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 912",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"url": "https://brukerhandboken.miraheze.org/wiki/Brukermedvirkning?oldid=912",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://brukerhandboken.miraheze.org/wiki/Bruker:Sstraume97",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Bruker:Sstraume97",
				"creators": [],
				"date": "2024-04-01T14:58:27Z",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 103",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"shortTitle": "Bruker",
				"url": "https://brukerhandboken.miraheze.org/wiki/Bruker:Sstraume97?oldid=103",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://brukerhandboken.miraheze.org/wiki/Forside",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Forside",
				"creators": [],
				"date": "2024-04-11T07:32:19Z",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 888",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"url": "https://brukerhandboken.miraheze.org/wiki/Forside?oldid=888",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://brukerhandboken.miraheze.org/wiki/Ord_og_forkortelser",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Ord og forkortelser",
				"creators": [],
				"date": "2024-04-11T07:41:44Z",
				"abstractNote": "Ord og forkortelser er en ordbok for brukerrepresentanter i helsetjenesten. Den inneholder ord og forkortelser som brukes hyppig i helsevesenet, og som er som er nyttig å kunne for brukerrepresentanter i helse- og omsorgstjenesten. Innholdet er kurert fra ulike nettsider, dokumenter og liknende. Det er altså ikke jeg som har skrevet alle forklaringene. Henvisning til kildene for tekstene (hvor de er hentet fra) ble når jeg startet på listen ikke tatt med da jeg ikke planla å gjøre den offentlig. Jeg tar nå med kilde i nye oppføringer der det er relevant.\n\nListen er sortert alfabetisk og ment brukt elektronisk da det finnes lenker i tekstene.\nVed forslag til nye ord og forkortelser bruk dette skjemaet: Send inn nytt ord (Airtable) eller e-post. \nVed forslag til endringer eller du har spørsmål ta gjerne kontakt med meg på e-post.\n\nLista er sortert alfabetisk og ment brukt elektronisk da det finnes lenker i tekstene. Noen forkortelser er det brukt punktum.\nLast ned som PDF her.",
				"encyclopediaTitle": "Brukerhåndboken",
				"extra": "Page Version ID: 889",
				"language": "nb",
				"libraryCatalog": "Brukerhåndboken",
				"rights": "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International",
				"url": "https://brukerhandboken.miraheze.org/wiki/Ord_og_forkortelser?oldid=889",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
