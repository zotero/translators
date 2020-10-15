{
	"translatorID": "7e638a55-f469-4324-89c9-e31aa71c4b46",
	"label": "Revista electrónica de ciencia penal y criminología",
	"creator": "Johannes Riedl",
	"target": "^https?://criminet.ugr.es/recpc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-15 09:15:35"
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


const entriesXPath = '//p[@class="MsoFooter"]';
const journalInfoXPath = '//p[@class="MsoNormal"]//span/text()';

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


function getIssue(doc) {
	let issueExpressions = ZU.xpath(doc, journalInfoXPath);
	for (let exp of issueExpressions) {
	   let issue = /Núm\.\s+(\d+).*/.exec(exp.nodeValue);
	   if (issue)
		   return issue[1];

	}
}


function getYear(doc) {
	let yearExpression = ZU.xpath(doc, journalInfoXPath);
	for (let exp of yearExpression) {
		let year =  /Núm\.\s+\d+\s*\((\d+)\)/.exec(exp.nodeValue);
		if (year)
			return year[1];
	}
}


function extractAuthors(entry) {
	//Skip the leading numbering (e.g. 10-03) that is in <b> tags
	let candidateFragments = entry.querySelectorAll('p > span, p > a');
	let allAuthors = '';
	// some neede
	Object.keys(candidateFragments).some(function (key) {
		// If we reached the link spans we are done - these are titles...
		if (candidateFragments[key].nodeName.toLowerCase() == 'a' ||
		    candidateFragments[key].querySelector('a'))
		        return true; // Array.some semanatics => break whole iteration
		allAuthors += candidateFragments[key].textContent;
		});
		// Use 'y' as another author separator
		return allAuthors.replace(/[\s\r\n]+y[\s\r\n]+/g,',').split(',');
}


function extractTitle(entry) {
   let titleAnchor = entry.querySelector('a');
   if (!titleAnchor) {
	   Z.debug("Could not find appropriate anchor for title -- Skipping");
	   return;
   }
   return titleAnchor.textContent.replace(/[\n\r]+/, '');

}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let rows = ZU.xpath(doc, entriesXPath);
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Object.keys(items).forEach(function (key) {
				let item = new Zotero.Item("journalArticle");
				let entryXPath = entriesXPath + '[.//a[@href=\'' + key + '\']]';
				let entry = ZU.xpath(doc, entryXPath);
				if (Object.keys(entry).length != 1) {
					Z.debug("Warning: more than one matching entry element for PDF " + key + " -- Skipping");
					return;
				}
				Z.debug(extractAuthors(entry[0]));
				for (let author of extractAuthors(entry[0]))
					 item.creators.push(ZU.cleanAuthor(author));
				item.title = extractTitle(entry[0]);
				item.issue = getIssue(doc);
				item.year = getYear(doc);
				item.complete();
			});

		});

	}

}
