{
	"translatorID": "df3af862-0860-4988-8fa1-6a597753e679",
	"label": "Studi e Materiali di Storia delle Religioni",
	"creator": "Mario Trojan",
	"target": "^https?://cisadu2.let.uniroma1.it/smsr/issues/[0-9]+/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-09-13 15:10:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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


const baseUrl = 'http://cisadu2.let.uniroma1.it';


function detectWeb(doc, url) {
	let toc = ZU.xpath(doc,'//ul[@class="toc"]');
	if (toc && toc.length == 1) {
		return 'multiple';
	}
}


function getCreatorFromString(creatorString) {
	const nameDelimiter = ' ';
	let nameParts = creatorString.split(nameDelimiter);
	const lastName = nameParts[0];
	nameParts.shift();
	const firstName = nameParts.join(nameDelimiter);
	return {creatorType: 'author', lastName: lastName, firstName: firstName};
}


function getPagesFromString(pagesString) {
	const pageRegexp = RegExp('pp\. ([0-9]+(-[0-9]+)?)', 'g');
	let match;
	let pages = '';
	while ((match = pageRegexp.exec(pagesString)) !== null) {
		if (pages !== '')
			pages += ',';
		pages += match[1];
	}
	return pages;
}


function getVolumeAndYearFromString(volumeString) {
	let match = volumeString.match(/Volume ([A-Z]+)\s*-\s*([0-9]+)/);
	if (match !== null)
		return {volume: match[1], year: match[2]};
	return null;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		var volumeAndYear = null;
		let headings = ZU.xpath(doc, '//div[@id="heading"]/h2/text()');
		headings.forEach(function(heading) {
			volumeAndYear = getVolumeAndYearFromString(heading.nodeValue);
		});

		let tocEntries = ZU.xpath(doc,'//ul[@class="toc"]/li');
		tocEntries.forEach(function(tocEntry) {
			let item = new Zotero.Item();
			item.itemType = 'journalArticle';
			item.issn = '0081-6175';
			for (let child = tocEntry.firstChild; child !== null; child = child.nextSibling) {
				if (child.nodeType == 1) {
					if (child.tagName == 'A') {
						item.title = child.textContent;
						item.url = baseUrl + child.getAttribute('href');
					} else if (child.tagName == 'SPAN')
						item.creators.push(getCreatorFromString(child.textContent));
				} else if (child.nodeType == 3) {
					let pages = getPagesFromString(child.nodeValue);
					if (pages !== '')
						item.pages = pages;
				}
			}
			if (volumeAndYear !== null) {
				item.volume = volumeAndYear.volume;
				item.date = volumeAndYear.year;
			}
			item.complete();
		});
	}
}
