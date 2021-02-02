{
	"translatorID": "b933a748-d9e8-4911-970b-20fd93a51f68",
	"label": "ubtue_International journal of criminal justice sciences",
	"creator": "Johannes Riedl",
	"target": "http://www.sascv.org/ijcjs/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-02-02 08:44:58"
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


const entriesXPath = '(//div[@id="text"]/blockquote/p | //div[@id="text"]/blockquote/ul/li/p)';

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


function extractIssue(entry) {
	let volumeLine = getVolumeLine(entry);
	let issueMatch = /IJCJS VOLUME:\s+\d+\s+ISSUE\s+(\d+)\s+[\s\D]+\d+/i.exec(volumeLine);
	if (issueMatch)
	   return issueMatch[1];
	return null;
}


function extractYear(entry) {
	let volumeLine = getVolumeLine(entry);
	let yearMatch = /IJCJS VOLUME:\s+\d+\s+ISSUE\s+\d+\s+[\s\D]+(\d+)/i.exec(volumeLine);
	if (yearMatch)
	   return yearMatch[1];
	return null;
}


function extractVolume(entry) {
	let volumeLine = getVolumeLine(entry);
	let volumeMatch = /IJCJS VOLUME:\s+(\d+)\s+ISSUE\s+\d+\s+[\s\D]+\d+/i.exec(volumeLine);
	if (volumeMatch)
	   return volumeMatch[1];
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


function extractDOI(entry) {
	let anchors = entry.querySelectorAll('a');
	for (let anchor of anchors) {
		 if (!anchor.href)
			 continue;
		 if (anchor.href.match(/doi.org\/\S+/))
			 return anchor.href;
	}
	return null;
}

function extractTitleAndAuthors(entry) {
	// innerText in ZTS does not behave as intended so flatten and use the <br>-replacement of cleanTags
	let entryCleanedText = ZU.cleanTags(entry.innerHTML.replace(/[\r?\n]/g, ""));
	//skip empty element and standalone whitespace
	let titleAndAuthors =  entryCleanedText.split(/\r?\n/).filter(i => i).filter(i => i.match(/\S+/))
	// Clean up result string
	return titleAndAuthors.map(i => ZU.unescapeHTML(i)).map(i => i.replace(/\s\s+/g, " "));

}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let rows = ZU.xpath(doc, entriesXPath);
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Object.keys(items).forEach(function (key) {
				let item = new Zotero.Item("journalArticle");
				let entryXPath = '//div[@id="text"]/blockquote/p[.//a/@href="' + key + '"] | \
								  //div[@id="text"]/blockquote/ul/li/*[.//a/@href="' + key + '"]';
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
				for (let author of extractAuthors(titleAndAuthors[1])) {
					// Address special cas  "author A & author B"
					if (!author.includes('&')) {
						item.creators.push(ZU.cleanAuthor(author));
					} else {
					   for (let splitAuthor of author.split('&'))
					       item.creators.push(ZU.cleanAuthor(splitAuthor));
					}
				}
				item.url = extractURL(entry);
				item.DOI = extractDOI(entry);
				item.date = extractYear(entry);
				item.issue = extractIssue(entry);
				item.volume = extractVolume(entry);
				item.complete();
			});
		});
	}
}
