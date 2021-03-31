{
	"translatorID": "c690f8b2-8ce4-4970-a103-940948a62a32",
	"label": "ubtue_International Journal of Cyber Criminology",
	"creator": "Johannes Riedl, Hjordis Lindeboom",
	"target": "http://www.cybercrimejournal.com/index.html",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-03-31 08:52:19"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.


	***** END LICENSE BLOCK *****
*/


const entriesXPath = '//td[@class="Text" and @width="543"]//tr//a//ancestor::p';
const journalInformationXPath = '//*[@class="Apple-style-span"]//b';
const domainPrefixExpression = /^.*\/\/[^\/]+\//;

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, entriesXPath);
	for (let row of rows) {
		let title = ZU.trimInternal(row.textContent);
		let anchor = row.querySelector('a');
		let href = anchor ? anchor.getAttribute("href") : null;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function getVolumeLine(entryArg) {
	let entry = entryArg;
	while (!entry.querySelector('h1')) {
		if (!entry.parentElement)
			return null;
		entry = entry.parentElement;
	}
	return entry.querySelector('h1').innerText.replace(/[\r?\n]+/g, " ");
}


function extractIssue(candidateString) {
	if (candidateString.match(/Issue/i))
		return candidateString.replace(/.*Issue:\s*(\d+)/,"$1");
	return null;
}


function extractYear(candidateString) {
	if (candidateString.match(/\d{4}/))
		return candidateString.replace(/.*(\d{4}).*/g,"$1");
	return null;
}


function extractVolume(candidateString) {
	if (candidateString.match(/Volume/i))
		return candidateString.replace(/.*Volume:\s*(\d+).*/,"$1");
	return null;
}


function extractAuthors(authorLine) {
	return authorLine.split(/,|\s+and\s+/);
}


function extractURL(entry) {
	// The are several hrefs but only the one with real text seems to be valid
	let anchors = entry.querySelectorAll('a');
	for (let anchor of anchors) {
		let href = anchor ? anchor.href : null;
		if (href && anchor.innerText.match(/\S+/)) {
			return href;
		}
	}
	return null;
}


function extractDOI(doc, key) {
	// Page is garbled so we need two different approaches
	// Case 1: DOI is in the next paragraph
	let entryXPath1 = '//a[@href="' + key + '"]/ancestor::p/following::a[1]';
	let doiCandidates1 = ZU.xpath(doc, entryXPath1);
	if (doiCandidates1 && doiCandidates1.length !== 0 && doiCandidates1[0].href.match(/doi.org/))
		return doiCandidates1[0].href.replace(domainPrefixExpression, '');
	// Case 2: DOI is contained in the same paragraph as the original key URL
	let entryXPath2 = '//a[@href="' + key + '"]/ancestor::p//img/parent::a';
	let doiCandidates2 = ZU.xpath(doc, entryXPath2);
	if (doiCandidates2 && doiCandidates2.length !== 0 && doiCandidates2[0].href.match(/doi.org/))
		return doiCandidates2[0].href.replace(domainPrefixExpression, '');
	return null;
}

function extractTitleAndAuthors(entry) {
	// innerText in ZTS does not behave as intended so flatten and use the <br>-replacement of cleanTags
	let entryCleanedText = ZU.unescapeHTML(ZU.cleanTags(entry.innerHTML.replace(/[\r?\n]/g, "")));
	let titleAndAuthors =  entryCleanedText.split(/\r?\n/).filter(i => i).filter(i => i.match(/\S+/));
	if (titleAndAuthors.length == 2)
		return titleAndAuthors.map(i => i.replace(/\s\s+/g, " "));

	// In rare cases the author are not inluded in the selected paragraph of entry
	// Thus the next paragraph is our candidate, so we walk up the tree an make sure we get a plausible result
	if (titleAndAuthors.length == 1) {
		let newAuthorAndTitleCandidates = entry.parentNode.querySelectorAll('p');
		if (newAuthorAndTitleCandidates[0].isEqualNode(entry) && newAuthorAndTitleCandidates.length >= 2) {
		titleAndAuthors = [titleAndAuthors[0], newAuthorAndTitleCandidates[1].innerText];
			return titleAndAuthors.map(i => i.replace(/\s\s+/g, " "));
		}
	}
	return null;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let rows = ZU.xpath(doc, entriesXPath);
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Object.keys(items).forEach(function (key) {
				let item = new Zotero.Item("journalArticle");
				let entryXPath = '//a[@href="' + key + '"]/ancestor::p';
				let entryCandidates = ZU.xpath(doc, entryXPath);
				if (!entryCandidates) {
					Z.debug("No entry candidates found for \"" + key + "\"");
					return;
				}
				if (entryCandidates.length > 1)
					Z.debug("More than one entry candidates found for key \"" + key + "\". Choosing first");
				let entry = entryCandidates[0];
				let titleAndAuthors = extractTitleAndAuthors(entry);
				if (titleAndAuthors.length != 2) {
					Z.debug("Could not uniquely associate title and author for \"" + entry.innerText + "\"");
					return;
				}
				item.title = titleAndAuthors[0];
				for (let author of extractAuthors(titleAndAuthors[1]))
					item.creators.push(ZU.cleanAuthor(author));
				item.url = extractURL(entry);
				item.DOI = extractDOI(doc,key);
				let journalInformationCandidates = ZU.xpath(doc, journalInformationXPath);
				let journalInformationTextContent = journalInformationCandidates.map(candidate => candidate.textContent);
				//Join result & remove whitespace
				let journalInformationComplete = journalInformationTextContent.join(' ').replace(/[\s]+/g, " ");
				item.date = extractYear(journalInformationComplete);
				item.issue = extractIssue(journalInformationComplete);
				item.volume = extractVolume(journalInformationComplete);
				item.complete();
			});
		});
	}
}
