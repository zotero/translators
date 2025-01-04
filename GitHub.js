{
	"translatorID": "a7747ba7-42c6-4a22-9415-1dafae6262a9",
	"label": "GitHub",
	"creator": "Martin Fenner, Philipp Zumstein, Yung-Ting Chen",
	"target": "^https?://(www\\.)?github\\.com/([^/]+/[^/]+|search\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-01-05 01:34:28"
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
	let ogTitle = attr(doc, 'meta[property="og:url"]', 'content');
	if (ogTitle.includes('/blob/') || url.startsWith(ogTitle + '/blob/')) {
		return "computerProgram";
	}

	if (!/^(GitHub - )?[^/\s]+\/[^/\s]+(: .*)?$/.test(attr(doc, 'meta[property="og:title"]', 'content')) && !/^(GitHub - )?[^/\s]+\/[^/\s]+( .*)?$/.test(attr(doc, 'meta[property="og:title"]', 'content'))) {
		// and anything without a repo name (abc/xyz) as its og:title.
		// deals with repo pages that we can't scrape, like GitHub Discussions.
		return false;
	}

	return "computerProgram";
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('[data-testid="results-list"] .search-title a');
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
	let githubRepository = item.url.split('/').slice(3, 5).join('/');
	item.title = githubRepository;
	if (url.includes('/blob/')) {
		let fileNameID = text(doc, '#file-name-id');
		if (!fileNameID && fileNameID.trim() === '') {
			fileNameID = text(doc, '#file-name-id-wide');
		}
		if (fileNameID && fileNameID.trim() !== '') {
			item.title = fileNameID.trim();
		}
	}
	item.abstractNote = attr(doc, 'meta[property="og:description"]', 'content').split(' - ')[0]
		.replace(` Contribute to ${githubRepository} development by creating an account on GitHub.`, '');
	item.libraryCatalog = "GitHub";
	var topics = doc.getElementsByClassName('topic-tag');
	for (var i = 0; i < topics.length; i++) {
		item.tags.push(topics[i].textContent.trim());
	}

	let latestCommitLink = attr(doc, 'link[rel="canonical"]', 'href');
	if (!latestCommitLink) {
		latestCommitLink = attr(doc, '[data-testid="latest-commit-html"] a', 'href');
	}
	let commitHash = false;
	if (latestCommitLink.includes('/')) {
		commitHash = latestCommitLink.split('/').pop();
	}

	if (url.includes('/blob/') === false) {
		let readmeTitle = text(doc, '.markdown-heading h1.heading-element');
		if (readmeTitle) {
			item.title = readmeTitle;
		}
	}

	if (commitHash === false) {
		scrapeRepos(item, url, githubRepository);
	}
	else {
		if (!item.versionNumber) {
			let codeTab = attr(doc, "#code-tab", "href");
			if (codeTab.includes('/tree/') && codeTab.endsWith(commitHash) === false) {
				item.versionNumber = codeTab.split('/').pop();
			}
			else {
				item.versionNumber = commitHash;
			}
		}

		let canonical = attr(doc, 'link[rel="canonical"]', 'href');
		if (canonical) {
			item.url = canonical;
		}

		ZU.doGet(apiUrl + "repos/" + githubRepository + "/commits/" + commitHash, function (result) {
			var commitData = JSON.parse(result);
			const commitTime = commitData.commit.author.date; // ISO 8601 format
			item.date = commitTime;
			scrapeRepos(item, url, githubRepository);
		});
	}
}

function scrapeRepos(item, url, githubRepository) {
	ZU.doGet(apiUrl + "repos/" + githubRepository, function (result) {
		var json = JSON.parse(result);
		if (json.message && json.message.includes("API rate limit exceeded")) {
			// finish and stop in this case
			item.complete();
			return;
		}
		var owner = json.owner.login;

		item.programmingLanguage = json.language;
		item.extra = "original-date: " + json.created_at;
		if (!item.date && json.updated_at) {
			item.date = json.updated_at;
		}

		if (json.license && json.license.spdx_id != "NOASSERTION") {
			item.rights = json.license.spdx_id;
		}
		item.abstractNote = json.description;
		item.place = "GitHub";

		ZU.doGet(`/${githubRepository}/hovercards/citation`, function (respText, xhr) {
			if (xhr.status == 200) {
				let doc = new DOMParser().parseFromString(respText, 'text/html');
				let bibtex = attr(doc, '[aria-labelledby="bibtex-tab"] input', 'value');

				if (bibtex && bibtex.trim()) {
					completeWithBibTeX(item, bibtex, githubRepository, owner);
					return;
				}
			}

			// if there was no CITATION.cff or the response didn't include a
			// BibTeX representation, we fall back to filling in the title and
			// authorship using the API.
			completeWithAPI(item, owner, githubRepository);
		}, null, null, { 'X-Requested-With': 'XMLHttpRequest' }, false);
	});
}

function completeWithBibTeX(item, bibtex, githubRepository, owner) {
	var translator = Zotero.loadTranslator("import");
	// BibTeX
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtex);

	translator.setHandler("itemDone", function (obj, bibItem) {
		let path = githubRepository;

		delete bibItem.itemType;
		delete bibItem.attachments;
		delete bibItem.itemID;

		let tags = [...item.tags];
		let title = item.title;

		Object.assign(item, bibItem);

		if (item.tags.length === 0 && tags.length > 0) {
			item.tags = tags;
		}
		if (item.url.includes('/blob/')) {
			item.title = title;
		}

		if (item.version) {
			item.complete();
		}
		else {
			ZU.doGet(`https://raw.githubusercontent.com/${path}/HEAD/CITATION.cff`, function (cffText) {
				let version = cffText.match(/^\s*(?:"version"|version)\s*:\s*"?(.+)"?\s*$/m);
				if (version) {
					item.versionNumber = version[1];
				}

				let type = cffText.match(/^\s*(?:"type"|type)\s*:\s*"?(.+)"?\s*$/m);
				if (type && type[1] === 'dataset') {
					item.itemType = type[1];
				}

				let abstract = cffText.match(/^\s*(?:"abstract"|abstract)\s*:\s*"?(.+)"?\s*$/m);
				if (abstract) {
					item.abstractNote = abstract[1];
				}

				let cffUrl = cffText.match(/^\s*(?:"url"|url)\s*:\s*"?(.+)"?\s*$/m);
				if (cffUrl) {
					item.url = cffUrl[1];
				}

				let repository = cffText.match(/^\s*(?:"repository"|repository)\s*:\s*"?(.+)"?\s*$/m);
				if (repository) {
					let place = repository[1];
					if (place.endsWith('"')) {
						place = place.slice(0, -1);
					}
					item.place = place;
				}

				let keywords = extractKeywords(cffText);
				if (keywords.length > 0) {
					item.tags = [];
					item.tags = item.tags.concat(keywords);
					item.tags = [...new Set(item.tags)];
				}

				if (item.creators.length === 0) {
					// Delay execution to avoid API rate limiting.
					setTimeout(function () {
						completeWithAPI(item, owner, githubRepository);
					}, 3000);
				}
				else {
					item.complete();
				}
			}, null, null, null, false);
		}
	});

	translator.translate();
}

// Parse the YAML and extract keywords
function extractKeywords(cffText) {
	// Use a regular expression to extract the `keywords` block
	const match = cffText.match(/keywords:\s+((?:- .+\s*)+)/);
	if (!match) return []; // Return an empty array if no keywords found

	// Extract the lines under `keywords` and clean them up
	const keywordsBlock = match[1];
	return keywordsBlock
		.split("\n") // Split into lines
		.map(line => line.trim().replace(/^- /, "")) // Trim and remove `- `
		.filter(line => line !== ""); // Remove empty lines
}

function completeWithAPI(item, owner, githubRepository) {
	ZU.doGet(apiUrl + "users/" + owner, function (user) {
		var jsonUser = JSON.parse(user);
		var ownerName = jsonUser.name || jsonUser.login;
		if (jsonUser.type == "User") {
			item.creators = [];
			item.creators.push(ZU.cleanAuthor(ownerName, "programmer"));
		}
		else {
			item.company = ownerName;
		}

		if (item.creators.length === 0) {
			item.creators.push({
				lastName: owner,
				fieldMode: 1,
				creatorType: "programmer"
			});
		}

		if (item.url.includes('/blob/') === false) {
			ZU.processDocuments(`/${githubRepository}`, function (rootDoc) {
				let readmeTitle = text(rootDoc, '.markdown-heading h1.heading-element');
				if (readmeTitle) {
					item.title = readmeTitle;
				}
				item.complete();
			});
		}
		else {
			item.complete();
		}
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://github.com/zotero/zotero/tree/0a6095322668908f243a536a4e43911d80f76b75",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "Zotero",
				"creators": [
					{
						"lastName": "zotero",
						"creatorType": "programmer",
						"fieldMode": 1
					}
				],
				"version": "0a6095322668908f243a536a4e43911d80f76b75",
				"date": "2024-12-06T09:38:01Z",
				"abstractNote": "Zotero is a free, easy-to-use tool to help you collect, organize, annotate, cite, and share your research sources.",
				"company": "Zotero",
				"extra": "original-date: 2011-10-27T07:46:48Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"url": "https://github.com/zotero/zotero/tree/0a6095322668908f243a536a4e43911d80f76b75",
				"versionNumber": "0a6095322668908f243a536a4e43911d80f76b75",
				"place": "GitHub",
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
		"url": "https://github.com/datacite/schema/tree/4.6.0",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "DataCite Schema Repository",
				"creators": [
					{
						"lastName": "datacite",
						"creatorType": "programmer",
						"fieldMode": 1
					}
				],
				"date": "2024-12-05T18:31:38Z",
				"abstractNote": "DataCite Metadata Schema Repository",
				"company": "DataCite",
				"extra": "original-date: 2011-04-13T07:08:41Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Ruby",
				"url": "https://github.com/datacite/schema/tree/4.6.0",
				"versionNumber": "4.6.0",
				"place": "GitHub",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/datacite/schema/blob/4.6.0/.dockerignore",
		"items": [
			{
				"itemType": "computerProgram",
				"title": ".dockerignore",
				"creators": [
					{
						"lastName": "datacite",
						"creatorType": "programmer",
						"fieldMode": 1
					}
				],
				"date": "2024-12-05T18:31:38Z",
				"abstractNote": "DataCite Metadata Schema Repository",
				"company": "DataCite",
				"extra": "original-date: 2011-04-13T07:08:41Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Ruby",
				"url": "https://github.com/datacite/schema/tree/4.6.0/.dockerignore",
				"versionNumber": "4.6.0",
				"place": "GitHub",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/mittagessen/kraken/tree/4.1.2",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "The Kraken OCR system",
				"creators": [
					{
						"firstName": "Benjamin",
						"lastName": "Kiessling",
						"creatorType": "author"
					}
				],
				"date": "2022-04",
				"abstractNote": "OCR engine for all the languages",
				"extra": "original-date: 2015-05-19T09:24:38Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Python",
				"versionNumber": "4.1.2",
				"place": "GitHub",
				"rights": "Apache-2.0",
				"url": "https://kraken.re",
				"attachments": [],
				"tags": [
					{
						"tag": "alto-xml"
					},
					{
						"tag": "handwritten-text-recognition"
					},
					{
						"tag": "hocr"
					},
					{
						"tag": "htr"
					},
					{
						"tag": "layout-analysis"
					},
					{
						"tag": "optical-character-recognition"
					},
					{
						"tag": "neural-networks"
					},
					{
						"tag": "ocr"
					},
					{
						"tag": "page-xml"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/aurimasv/z2csl/tree/5750900e907b6730ccd724e23444ccc79d15f3f3",
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
				"date": "2024-12-23T20:52:59Z",
				"abstractNote": "Zotero extension for creating Zotero to CSL item type and field mappings.",
				"extra": "original-date: 2012-05-20T07:53:58Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"versionNumber": "5750900e907b6730ccd724e23444ccc79d15f3f3",
				"url": "https://github.com/aurimasv/z2csl/tree/5750900e907b6730ccd724e23444ccc79d15f3f3",
				"place": "GitHub",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/zotero/translators/blob/eb4f39007e62d3d632448e184b1fd3671b3a1349/GitHub.js",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "GitHub.js",
				"creators": [
					{
						"lastName": "zotero",
						"creatorType": "programmer",
						"fieldMode": 1
					}
				],
				"date": "2021-07-29T04:53:43Z",
				"versionNumber": "eb4f39007e62d3d632448e184b1fd3671b3a1349",
				"abstractNote": "Zotero Translators",
				"company": "Zotero",
				"extra": "original-date: 2011-07-03T17:40:38Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"place": "GitHub",
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
		"url": "https://github.com/citation-file-format/citation-file-format/tree/1.2.0",
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
				"date": "2021-08",
				"abstractNote": "The Citation File Format lets you provide citation metadata for software or datasets in plaintext files that are easy to read by both humans and machines.",
				"extra": "DOI: 10.5281/zenodo.5171937",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Python",
				"rights": "CC-BY-4.0",
				"url": "https://github.com/citation-file-format/citation-file-format/tree/1.2.0",
				"versionNumber": "1.2.0",
				"place": "GitHub",
				"attachments": [],
				"tags": [
					{
						"tag": "attribution"
					},
					{
						"tag": "citation"
					},
					{
						"tag": "citation-files"
					},
					{
						"tag": "credit"
					},
					{
						"tag": "format"
					},
					{
						"tag": "research-software-engineering"
					},
					{
						"tag": "software-sustainability"
					},
					{
						"tag": "wssspe"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/citation-file-format/citation-file-format/blob/1.1.0/test/pytest.ini",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "pytest.ini",
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
						"firstName": "Olexandr",
						"lastName": "Konovalov",
						"creatorType": "author"
					}
				],
				"date": "2021-08",
				"abstractNote": "The Citation File Format lets you provide citation metadata for software or datasets in plaintext files that are easy to read by both humans and machines.",
				"extra": "DOI: 10.5281/zenodo.4751536",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Python",
				"rights": "CC-BY-4.0",
				"url": "https://github.com/citation-file-format/citation-file-format/blob/1.1.0/test/pytest.ini",
				"versionNumber": "1.1.0",
				"place": "GitHub",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/pulipulichen/PTS-Local-News-Dataset/tree/20250105-0131",
		"items": [
			{
				"itemType": "dataset",
				"title": "PTS-Local-News-Dataset",
				"creators": [
					{
						"firstName": "Yung-Ting",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"date": "2025-01-04T17:28:41Z",
				"abstractNote": "A dataset containing local news from Taiwan Public Television Service.",
				"extra": "DOI: 10.5281/zenodo.14598063",
				"libraryCatalog": "GitHub",
				"url": "https://github.com/pulipulichen/PTS-Local-News-Dataset",
				"versionNumber": "20250105-0131",
				"attachments": [],
				"tags": [
					{
						"tag": "dataset"
					},
					{
						"tag": "news"
					},
					{
						"tag": "PTS"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
