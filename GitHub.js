{
	"translatorID": "a7747ba7-42c6-4a22-9415-1dafae6262a9",
	"label": "GitHub",
	"creator": "Martin Fenner, Philipp Zumstein",
	"target": "^https?://(www\\.)?github\\.com/([^/]+/[^/]+|search\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-29 19:26:28"
}

/**
	Copyright (c) 2017-2021 Martin Fenner, Philipp Zumstein

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


const apiUrl = "https://api.github.com/";

function detectWeb(doc, url) {
	if (url.includes("/search?")) {
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
	}
	
	if (!doc.querySelector('meta[property="og:type"][content="object"]')) {
		// exclude the home page and marketing pages
		return false;
	}
	
	// `og:title` is messed up when browsing a file.
	if (url.startsWith(attr(doc, 'meta[property="og:url"]', 'content') + '/blob/')) {
		return "computerProgram";
	}

	if (!/^(GitHub - )?[^/\s]+\/[^/\s]+(: .*)?$/.test(attr(doc, 'meta[property="og:title"]', 'content'))) {
		// and anything without a repo name (abc/xyz) as its og:title.
		// deals with repo pages that we can't scrape, like GitHub Discussions.
		return false;
	}
	
	return "computerProgram";
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.repo-list-item .f4 a');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var item = new Z.Item("computerProgram");
	
	// basic metadata from the meta tags in the head
	item.url = attr(doc, 'meta[property="og:url"]', 'content');
	if (url.includes('/blob/') && !item.url.includes('/blob/')) {
		// github is doing something weird with the og:url meta tag right now -
		// it always points to the repo root (e.g. zotero/translators), even
		// when we're in a specific directory/file (e.g. zotero/translators/
		// blob/master/GitHub.js). this fix (hopefully) won't stick around
		// long-term, but for now, let's just grab the user-facing permalink
		let permalink = attr(doc, '.js-permalink-shortcut', 'href');
		if (permalink) {
			item.url = 'https://github.com' + permalink;
		}
		else {
			let clipboardCopyPermalink = attr(doc, '#blob-more-options-details clipboard-copy', 'value');
			if (clipboardCopyPermalink) {
				item.url = clipboardCopyPermalink;
			}
		}
	}
	// Do not rely on `og:title` since GitHub isn't consistent with its meta attribute.
	item.title = item.url.split('/').slice(3, 5).join('/');
	item.abstractNote = attr(doc, 'meta[property="og:description"]', 'content').split(' - ')[0]
		.replace(` Contribute to ${item.title} development by creating an account on GitHub.`, '');
	item.libraryCatalog = "GitHub";
	var topics = doc.getElementsByClassName('topic-tag');
	for (var i = 0; i < topics.length; i++) {
		item.tags.push(topics[i].textContent.trim());
	}

	ZU.doGet(apiUrl + "repos/" + item.title, function (result) {
		var json = JSON.parse(result);
		if (json.message && json.message.includes("API rate limit exceeded")) {
			// finish and stop in this case
			item.complete();
			return;
		}
		var owner = json.owner.login;
		
		item.programmingLanguage = json.language;
		item.extra = "original-date: " + json.created_at;
		item.date = json.updated_at;
		if (json.license && json.license.spdx_id != "NOASSERTION") {
			item.rights = json.license.spdx_id;
		}
		item.abstractNote = json.description;

		ZU.doGet(`/${item.title}/hovercards/citation`, function (respText, xhr) {
			if (xhr.status == 200) {
				let doc = new DOMParser().parseFromString(respText, 'text/html');
				let bibtex = attr(doc, '[aria-labelledby="bibtex-tab"] input', 'value');
				
				if (bibtex && bibtex.trim()) {
					completeWithBibTeX(item, bibtex);
					return;
				}
			}
			
			// if there was no CITATION.cff or the response didn't include a
			// BibTeX representation, we fall back to filling in the title and
			// authorship using the API.
			completeWithAPI(item, owner);
		}, null, null, { 'X-Requested-With': 'XMLHttpRequest' }, false);
	});
}

function completeWithBibTeX(item, bibtex) {
	var translator = Zotero.loadTranslator("import");
	// BibTeX
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtex);
	
	translator.setHandler("itemDone", function (obj, bibItem) {
		let path = item.title;
		
		delete bibItem.itemType;
		delete bibItem.attachments;
		delete bibItem.itemID;
		Object.assign(item, bibItem);
		
		if (item.version) {
			item.complete();
		}
		else {
			ZU.doGet(`https://raw.githubusercontent.com/${path}/HEAD/CITATION.cff`, function (cffText) {
				let version = cffText.match(/^\s*(?:"version"|version)\s*:\s*"?(.+)"?\s*$/m);
				if (version) {
					item.versionNumber = version[1];
				}
				item.complete();
			}, null, null, null, false);
		}
	});
	
	translator.translate();
}

function completeWithAPI(item, owner) {
	ZU.doGet(apiUrl + "users/" + owner, function (user) {
		var jsonUser = JSON.parse(user);
		var ownerName = jsonUser.name || jsonUser.login;
		if (jsonUser.type == "User") {
			item.creators.push(ZU.cleanAuthor(ownerName, "programmer"));
		}
		else {
			item.company = ownerName;
		}
		
		ZU.processDocuments(`/${item.title}`, function (rootDoc) {
			let readmeTitle = text(rootDoc, '#readme h1');
			if (readmeTitle) {
				item.title = readmeTitle;
			}
			item.complete();
		});
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://github.com/zotero/zotero/",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Zotero",
				"creators": [],
				"date": "2021-07-29T14:50:36Z",
				"abstractNote": "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share your research sources.",
				"company": "Zotero",
				"extra": "original-date: 2011-10-27T07:46:48Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"url": "https://github.com/zotero/zotero",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/search?utf8=%E2%9C%93&q=topic%3Ahocr&type=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://github.com/datacite/schema",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "DataCite Schema Repository",
				"creators": [],
				"date": "2021-07-23T10:14:44Z",
				"abstractNote": "DataCite Metadata Schema Repository",
				"company": "DataCite",
				"extra": "original-date: 2011-04-13T07:08:41Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Ruby",
				"url": "https://github.com/datacite/schema",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/mittagessen/kraken",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "mittagessen/kraken",
				"creators": [
					{
						"firstName": "",
						"lastName": "mittagessen",
						"creatorType": "programmer"
					}
				],
				"date": "2021-07-29T12:26:11Z",
				"abstractNote": "OCR engine for all the languages",
				"extra": "original-date: 2015-05-19T09:24:38Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Python",
				"rights": "Apache-2.0",
				"url": "https://github.com/mittagessen/kraken",
				"attachments": [],
				"tags": [
					{
						"tag": "alto-xml"
					},
					{
						"tag": "hocr"
					},
					{
						"tag": "lstm"
					},
					{
						"tag": "neural-networks"
					},
					{
						"tag": "ocr"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/aurimasv/z2csl",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "z2csl - Zotero to CSL extension and mappings",
				"creators": [
					{
						"firstName": "Aurimas",
						"lastName": "Vinckevicius",
						"creatorType": "programmer"
					}
				],
				"date": "2021-03-20T15:33:50Z",
				"abstractNote": "Zotero extension for creating Zotero to CSL item type and field mappings.",
				"extra": "original-date: 2012-05-20T07:53:58Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"url": "https://github.com/aurimasv/z2csl",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/zotero/translators/blob/master/GitHub.js",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "zotero/translators",
				"creators": [],
				"date": "2021-07-29T04:53:43Z",
				"abstractNote": "Zotero Translators",
				"company": "Zotero",
				"extra": "original-date: 2011-07-03T17:40:38Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"url": "https://github.com/zotero/translators/blob/eb4f39007e62d3d632448e184b1fd3671b3a1349/GitHub.js",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/citation-file-format/citation-file-format",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Citation File Format",
				"creators": [
					{
						"firstName": "Stephan",
						"lastName": "Druskat",
						"creatorType": "author"
					},
					{
						"firstName": "Jurriaan H.",
						"lastName": "Spaaks",
						"creatorType": "author"
					},
					{
						"firstName": "Neil",
						"lastName": "Chue Hong",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Haines",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Baker",
						"creatorType": "author"
					},
					{
						"firstName": "Spencer",
						"lastName": "Bliven",
						"creatorType": "author"
					},
					{
						"firstName": "Egon",
						"lastName": "Willighagen",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Pérez-Suárez",
						"creatorType": "author"
					},
					{
						"firstName": "Alexander",
						"lastName": "Konovalov",
						"creatorType": "author"
					}
				],
				"date": "2021-05",
				"abstractNote": "A machine-readable and human-readable and -writable format for CITATION files. CITATION files provide reference and citation information for (research/scientific) software.",
				"extra": "DOI: 10.5281/zenodo.4751536",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Python",
				"rights": "CC-BY-4.0",
				"url": "https://github.com/citation-file-format/citation-file-format",
				"versionNumber": "1.1.0",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/citation-file-format/citation-file-format/blob/main/test/pytest.ini",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Citation File Format",
				"creators": [
					{
						"firstName": "Stephan",
						"lastName": "Druskat",
						"creatorType": "author"
					},
					{
						"firstName": "Jurriaan H.",
						"lastName": "Spaaks",
						"creatorType": "author"
					},
					{
						"firstName": "Neil",
						"lastName": "Chue Hong",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Haines",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Baker",
						"creatorType": "author"
					},
					{
						"firstName": "Spencer",
						"lastName": "Bliven",
						"creatorType": "author"
					},
					{
						"firstName": "Egon",
						"lastName": "Willighagen",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Pérez-Suárez",
						"creatorType": "author"
					},
					{
						"firstName": "Alexander",
						"lastName": "Konovalov",
						"creatorType": "author"
					}
				],
				"date": "2021-05",
				"abstractNote": "A machine-readable and human-readable and -writable format for CITATION files. CITATION files provide reference and citation information for (research/scientific) software.",
				"extra": "DOI: 10.5281/zenodo.4751536",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Python",
				"rights": "CC-BY-4.0",
				"url": "https://github.com/citation-file-format/citation-file-format/blob/9879c64a37a9d4f3f18b67594aa3f3bf763fb69a/test/pytest.ini",
				"versionNumber": "1.1.0",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
