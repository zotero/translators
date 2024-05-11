{
	"translatorID": "bbad0221-134b-495a-aa56-d77cfaa67ab5",
	"label": "Digital Humanities Quarterly",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www\\.)?digitalhumanities\\.org/(dhq)?",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-05-11 20:24:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012-2024 Michael Berkowitz

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

function detectWeb(doc, _url) {
	if (doc.querySelector('.DHQarticle')) {
		return "journalArticle";
	}
	if (doc.querySelector('#toc')) {
		return "multiple";
	}
	return false;
}

async function doWeb(doc, url) {
	const type = detectWeb(doc, url);
	Zotero.debug(type);
	if (type === "journalArticle") {
		return scrape(doc, url);
	}
	if (type === "multiple") {
	// Otherwise, we found multiple
		const allItems = doc.querySelectorAll('#toc .articleInfo > a:first-of-type');
		if (!allItems) {
			return false;
		}
		// Reduce the links into an object
		const choices = [...allItems].reduce((obj, { href, innerText }) => {
			return { ...obj, ...{
				[href]: innerText
			} };
		}, {});
		Zotero.selectItems(choices, function (items) {
			if (!items) {
				return false;
			}
			const urls = Object.keys(items);
			return ZU.processDocuments(urls, scrape);
		});
	}
	return false;
}


function scrape(doc, url) {
	// Get the metadata
	const main = doc.querySelector('#mainContent');
	// Of the form "YYYY Volume.Issue"
	const [year, volume, issue] = text(main, '.toolbar > a').split(/[\s\\.]+/);
	const title = ZU.trimInternal(text(main, 'h1.articleTitle'));
	const authors = main.querySelectorAll('.DHQheader .author');
	const abstract = ZU.trimInternal(text(main, '#abstract > p'));
	const license = ZU.trimInternal(text(main, ".license > a[rel='license']:last-of-type"));
	// Build item
	const item = new Z.Item("journalArticle");
	item.url = doc.location.href;
	item.title = title;
	item.creators = [...authors].map((author) => {
		return ZU.cleanAuthor(text(author, 'a:first-child'), "author");
	});
	item.publicationTitle = "Digital Humanities Quarterly";
	item.ISSN = "1938-4122";
	item.date = year;
	item.volume = volume;
	item.issue = issue;
	item.abstractNote = abstract;
	item.rights = license;
	const pdfLink = main.querySelector('.toolbar > a[href $= "pdf"]');
	if (pdfLink) {
		item.attachments.push({
			url: pdfLink.href,
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});
	}
	else {
		item.attachments.push({
			url,
			title: "DHQ Snapshot",
			mimeType: "text/html"
		});
	}
	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.digitalhumanities.org/dhq/vol/5/2/index.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.digitalhumanities.org/dhq/vol/17/1/000671/000671.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Introduction to Special Issue: Project Resiliency in the Digital Humanities",
				"creators": [
					{
						"firstName": "Martin",
						"lastName": "Holmes",
						"creatorType": "author"
					},
					{
						"firstName": "Janelle",
						"lastName": "Jenstad",
						"creatorType": "author"
					},
					{
						"firstName": "J. Matthew",
						"lastName": "Huculak",
						"creatorType": "author"
					}
				],
				"abstractNote": "This introduction to the Project Resiliency issue argues that we have work to do in getting projects to the point of being done and archivable. The Endings Project, a collaboration between three developers, three humanities scholars, and three librarians, arose from the maintenance burden accrued by the Humanities Computing and Media Centre at the University of Victoria and our desire to design projects that, from their inception, are ready for long-term archiving. After describing the events leading up to the Endings Symposium and briefly summarizing the articles in this issue, we discuss the necessity of a culture of constraint if we wish to preserve digital humanities projects in the same way that libraries preserve books.",
				"issue": "1",
				"libraryCatalog": "Digital Humanities Quarterly",
				"rights": "Creative Commons Attribution-NoDerivatives 4.0 International License",
				"shortTitle": "Introduction to Special Issue",
				"url": "https://www.digitalhumanities.org/dhq/vol/17/1/000671/000671.html",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.digitalhumanities.org/dhq/vol/17/2/000699/000699.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "ᐊᒐᐦᑭᐯᐦᐃᑲᓇ ᒫᒥᑐᓀᔨᐦᐃᒋᑲᓂᐦᑳᓂᕽ | acahkipehikana mâmitoneyihicikanihkânihk | Programming with Cree# and Ancestral Code: Nehiyawewin Spirit Markings in an Artificial Brain",
				"creators": [
					{
						"firstName": "Jon",
						"lastName": "Corbett",
						"creatorType": "author"
					}
				],
				"abstractNote": "In this article, I discuss my project “Ancestral Code”, which consists of an integrated development environment (IDE) and the Nehiyaw (Plains Cree) based programming languages called Cree# (pronounced: Cree-Sharp) and ᐊᒋᒧ (âcimow). These languages developed in response to western perspectives on human-computer relationships, which I challenge and reframe in Nehiyaw/Indigenous contexts.",
				"issue": "2",
				"libraryCatalog": "Digital Humanities Quarterly",
				"rights": "Creative Commons Attribution-NoDerivatives 4.0 International License",
				"shortTitle": "ᐊᒐᐦᑭᐯᐦᐃᑲᓇ ᒫᒥᑐᓀᔨᐦᐃᒋᑲᓂᐦᑳᓂᕽ | acahkipehikana mâmitoneyihicikanihkânihk | Programming with Cree# and Ancestral Code",
				"url": "https://www.digitalhumanities.org/dhq/vol/17/2/000699/000699.html",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
