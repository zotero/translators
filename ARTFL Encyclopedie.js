{
	"translatorID": "72cb2536-3211-41e0-ae8b-974c0385e085",
	"label": "ARTFL Encyclopedie",
	"creator": "Sean Takats, Sebastian Karcher, and Abe Jellinek",
	"target": "^https?://artflsrv\\d+\\.uchicago\\.edu/philologic4/encyclopedie\\d+/(navigate/|query)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-30 19:55:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/navigate/')) {
		return "encyclopediaArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.philologic_cite .citation:first-child a');
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
	let path = url.match(/(\/philologic4\/[^/]+\/)navigate((?:\/\d+)+)/);
	if (!path) {
		throw new Error('Unknown entry path format');
	}
	
	let [, base, id] = path;
	id = id.replace(/\//g, ' ').trim();
	
	ZU.doGet(
		`${base}reports/navigation.py?report=navigation&philo_id=${id}&byte=`,
		function (respText) {
			let json = JSON.parse(respText);
			scrapeFromJSON(doc, url, json);
		}
	);
}

function scrapeFromJSON(doc, url, json) {
	let item = new Zotero.Item('encyclopediaArticle');
	let meta = json.metadata_fields;

	item.title = meta.head;
	item.encyclopediaTitle = meta.title.replace(/\.?\s*Tome \d+\.?/, '');
	item.volume = meta.vol;
	item.numberOfVolumes = '17';
	item.place = meta.pub_place;
	item.publisher = meta.publisher;
	item.date = meta.pub_date;
	
	let firstPage;
	let lastPage;
	
	let pageRe = /\[page \d+:([\da-zA-Z]+)\]/g;
	let matchArray;
	while ((matchArray = pageRe.exec(json.text)) !== null) {
		// iterate through page heading matches. if we haven't set the first
		// page yet, set it to the page in the heading we just found. always
		// set the last page to the heading we just found. when we're done,
		// the first page will correspond to the first heading and the last page
		// to the last.
		
		if (!firstPage) {
			firstPage = matchArray[1];
		}
		lastPage = matchArray[1];
	}
	
	if (firstPage && lastPage) {
		if (firstPage == lastPage) {
			item.pages = firstPage;
		}
		else {
			item.pages = `${firstPage}-${lastPage}`;
		}
	}
	
	item.url = url;
	item.language = 'fr';
	item.archive = 'ARTFL Encyclopédie Project (Spring 2021 Edition)';
	item.libraryCatalog = '';

	item.creators.push({
		firstName: "Denis",
		lastName: "Diderot",
		creatorType: "editor"
	});
	
	item.creators.push({
		firstName: "Jean le Rond",
		lastName: "d'Alembert",
		creatorType: "editor"
	});

	item.creators.push(
		ZU.cleanAuthor(
			meta.kafauth.replace(/\s*\(.*\)/, ''), 'author', true
		)
	);
	
	if (doc) {
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
	}
	
	if (json.imgs.current_obj_img && json.imgs.current_obj_img.length) {
		let url = json.imgs.current_obj_img[0];
		item.attachments.push({
			title: 'Page Scan',
			mimeType: `image/${url.split('.').pop()}`,
			url
		});
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://artflsrv03.uchicago.edu/philologic4/encyclopedie0521/navigate/1/929/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "ADULTERE",
				"creators": [
					{
						"firstName": "Denis",
						"lastName": "Diderot",
						"creatorType": "editor"
					},
					{
						"firstName": "Jean le Rond",
						"lastName": "d'Alembert",
						"creatorType": "editor"
					},
					{
						"firstName": "François-Vincent",
						"lastName": "Toussaint",
						"creatorType": "author"
					}
				],
				"date": "1751",
				"archive": "ARTFL Encyclopédie Project (Spring 2021 Edition)",
				"encyclopediaTitle": "Encyclopédie, Dictionnaire raisonné des sciences, des arts et des métiers, par une Société de Gens de lettres",
				"language": "fr",
				"numberOfVolumes": "17",
				"pages": "150",
				"place": "Paris",
				"publisher": "Le Breton",
				"url": "https://artflsrv03.uchicago.edu/philologic4/encyclopedie0521/navigate/1/929/",
				"volume": "1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Page Scan",
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
		"url": "https://artflsrv03.uchicago.edu/philologic4/encyclopedie0521/navigate/1/925/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "ADULTE",
				"creators": [
					{
						"firstName": "Denis",
						"lastName": "Diderot",
						"creatorType": "editor"
					},
					{
						"firstName": "Jean le Rond",
						"lastName": "d'Alembert",
						"creatorType": "editor"
					},
					{
						"firstName": "Pierre",
						"lastName": "Tarin",
						"creatorType": "author"
					}
				],
				"date": "1751",
				"archive": "ARTFL Encyclopédie Project (Spring 2021 Edition)",
				"encyclopediaTitle": "Encyclopédie, Dictionnaire raisonné des sciences, des arts et des métiers, par une Société de Gens de lettres",
				"language": "fr",
				"numberOfVolumes": "17",
				"pages": "150",
				"place": "Paris",
				"publisher": "Le Breton",
				"url": "https://artflsrv03.uchicago.edu/philologic4/encyclopedie0521/navigate/1/925/",
				"volume": "1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Page Scan",
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
		"url": "https://artflsrv03.uchicago.edu/philologic4/encyclopedie0521/query?report=concordance&method=proxy&attribution=&objecttype=&q=amour&start=0&end=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/
