{
	"translatorID": "769f4d84-7ddf-4135-9760-79986be39923",
	"label": "ubtue_Boletín criminológico",
	"creator": "Johannes Riedl",
	"target": "http://www.boletincriminologico.uma.es/lista_boletines.php\\?edicion=\\d{4}",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-02 09:59:31"
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


const entriesXPath = '//a[@class="txt-ln-boletines"]';
//const entriesXPath = '//[@class="cp-normas"]';

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
		let href = row.href;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function extractYear(entry) {
	let yearAndIssueElement = entry.querySelector('.margen12-izdo');
	return yearAndIssueElement ?
		 ZU.cleanTags(yearAndIssueElement.innerHTML).replace(/^Artículo\s*\d+\/(\d{4}).*$/g, "$1") : '';
}


function extractIssue(entry) {
	let yearAndIssueElement = entry.querySelector('.margen12-izdo');
	return yearAndIssueElement ?
		ZU.cleanTags(yearAndIssueElement.innerHTML).replace(/^Artículo\s*(\d+)\/\d{4}.*$/g, "$1") : '';
}


function extractVolume(entry) {
	let volumeElement = entry.querySelector('.margen12-izdo');
	return volumeElement ?
		ZU.cleanTags(volumeElement.innerHTML).replace(/^Artículo\s*\d+\/\d{4}.*nº\s*(\d+)\)/g, "$1") : '';
}


function removeOuterQuotes(string) {
	return string.replace(/^\"(.*)\"/g, "$1");
}


function extractTitle(entry) {
	let titleElement = entry.querySelector('.txt-normas')
	// After <br> there are authors
	return titleElement ? removeOuterQuotes(ZU.cleanTags(titleElement.innerHTML.replace(/[.]\s*<br>.*$/, ""))) : '';
}	
	

function extractAuthors(entry) {
	let authorsElement = entry.querySelector('.txt-autores');
	return authorsElement ? authorsElement.innerText.replace(/^Autor[^\s]*/gi, "").split(',') : '';
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let rows = ZU.xpath(doc, entriesXPath);
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Object.keys(items).forEach(function (key) {
				let item = new Zotero.Item("journalArticle");
				let entryXPath = '//a[@href="' + key + '"]';
				let entryCandidates = ZU.xpath(doc, entryXPath);
				if (!entryCandidates) {
					Z.debug("No entry candidates found for \"" + key + "\"");
					return;
				}
				if (entryCandidates.length > 1)
					Z.debug("More than one entry candidates found for key \"" + key + "\". Choosing first");
				let entry = entryCandidates[0];
				item.title = extractTitle(entry);
				for (let author of extractAuthors(entry))
					item.creators.push(ZU.cleanAuthor(author));
				item.url = key;
				item.date = extractYear(entry);
				item.issue = extractIssue(entry);
				item.volume = extractVolume(entry);
				item.complete();
			});
		});
	}
}
