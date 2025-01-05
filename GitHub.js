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
	Copyright (c) 2017-2025 Martin Fenner, Philipp Zumstein, Yung-Ting Chen

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
		var rows = doc.querySelectorAll('[data-testid="results-list"] .search-title a');
		if (rows.length > 0) {
			return "multiple";
		}
	}

	if (!doc.querySelector('meta[property="og:type"][content="object"]')) {
		// exclude the home page and marketing pages
		return false;
	}

	// `og:title` is messed up when browsing a file.
	let ogURL = attr(doc, 'meta[property="og:url"]', 'content');
	if (ogURL.includes('/blob/') || url.startsWith(ogURL + '/blob/')) {
		return "computerProgram";
	}

	let ogTitle = attr(doc, 'meta[property="og:title"]', 'content');
	let path = url.split('/').slice(3, 5).join('/');
	let repo = url.split('/').slice(4, 5)[0];
	if (!ogTitle.startsWith(path) && !ogTitle.startsWith(repo + '/')) {
		// and anything without a repo name (abc/xyz) as its og:title.
		// deals with repo pages that we can't scrape, like GitHub Discussions.
		return false;
	}

	return "computerProgram";

// 	return new Promise(function (resolve) {
// 		ZU.doGet(`https://raw.githubusercontent.com/${path}/HEAD/CITATION.cff`, function (cffText, xhr) {
// 			if (xhr.status !== 200) {
// 				return resolve("computerProgram");
// 			}
// 			try {
// 				let type = searchFieldValue(cffText, "type");
// 				if (type && type === 'dataset') {
// 					return resolve(type);
// 				}
// 			}
// 			catch (e) {
// 				console.error(`CITATION.cff format is invalid:

// ${cffText}`);
// 			}
// 			return resolve("computerProgram");
// 		}, null, null, { 'X-Requested-With': 'XMLHttpRequest' }, false);
// 	});
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


async function doWeb(doc, url) {
	if (await detectWeb(doc, url) == "multiple") {
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
	if (!latestCommitLink && url.includes('/blob/') === false) {
		latestCommitLink = attr(doc, '[data-testid="latest-commit-html"] a', 'href');
	}
	if (!latestCommitLink) {
		latestCommitLink = attr(doc, '[data-testid="breadcrumbs-repo-link"]', 'href');
	}
	let commitHash = false;
	if (latestCommitLink.includes('/') && latestCommitLink.endsWith(githubRepository) === false) {
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
		let versionNumber = item.versionNumber;
		let version = item.version;
		let url = item.url;

		Object.assign(item, bibItem);

		if (item.tags.length === 0 && tags.length > 0) {
			item.tags = tags;
		}
		if (url.includes('/blob/')) {
			item.title = title;
			item.versionNumber = versionNumber;
			item.version = version;
			item.url = url;
		}

		ZU.doGet(`https://raw.githubusercontent.com/${path}/HEAD/CITATION.cff`, function (cffText) {
			let cffVersion = searchFieldValue(cffText, "version");
			if (!item.versionNumber && cffVersion) {
				item.versionNumber = cffVersion;
			}

			let cffType = searchFieldValue(cffText, "type");
			if (cffType && cffType === 'dataset') {
				item.itemType = cffType;
			}

			let cffAbstract = searchFieldValue(cffText, "abstract");
			if (cffAbstract) {
				item.abstractNote = cffAbstract;
			}

			let cffURL = searchFieldValue(cffText, "url");
			if (cffURL && item.url.includes('/blob/') === false) {
				item.url = cffURL;
			}

			let cffRepository = searchFieldValue(cffText, "repository");
			if (cffRepository) {
				item.place = cffRepository;
			}

			let cffKeywords = extractKeywords(cffText);
			if (cffKeywords && cffKeywords.length > 0) {
				item.tags = [];
				item.tags = item.tags.concat(cffKeywords);
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
	});

	translator.translate();
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

/**
 * Searches for the value of a specified field in YAML content.
 *
 * @param {string} yamlContent - The YAML content as a string.
 * @param {string} field - The field name to search for.
 * @returns {string|null} - The value of the field if found, or null if not found.
 */
function searchFieldValue(yamlContent, field) {
	const regex = new RegExp(`^${field}:\\s*(.+)`, 'm');
	const match = yamlContent.match(regex);

	let value = null;
	if (match) {
		value = match[1].trim();
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
		}
	}
	return value;
}

/**
 * Extracts the keywords from YAML content.
 *
 * @param {string} yamlContent - The YAML content as a string.
 * @returns {string[]|null} - An array of keywords if found, or null if not found.
 */
function extractKeywords(yamlContent) {
	const regex = /keywords:\s*\n([\s\S]*?)(\n\w+:|$)/; // Matches the "keywords" field and its list
	const match = yamlContent.match(regex);

	if (match && match[1]) {
		return match[1]
			.split('\n')							// Split the content by lines
			.map(keyword => keyword.trim()) // Remove extra spaces
			.filter(keyword => keyword.startsWith('- ')) // Only include list items
			.map(keyword => keyword.slice(2)); // Remove the "- " prefix
	}

	return null; // Return null if "keywords" not found
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"defer": true,
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
	}
]
/** END TEST CASES **/
