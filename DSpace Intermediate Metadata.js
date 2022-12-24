{
	"translatorID": "2c05e2d1-a533-448f-aa20-e919584864cb",
	"label": "DSpace Intermediate Metadata",
	"creator": "Sebastian Karcher",
	"target": "xml",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2022-12-24 04:09:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher

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

function detectImport() {
	var text = Zotero.read(1000);
	return text.includes("//www.dspace.org/xmlns/dspace/dim");
}

function getType(string) {
	string = string.toLowerCase();
	if (string.includes("book_section") || string.includes("chapter")) {
		return "bookSection";
	}
	else if (string.includes("book") || string.includes("monograph")) {
		return "book";
	}
	else if (string.includes("report")) {
		return "report";
	}
	else if (string.includes("proceedings") || string.includes("conference")) {
		return "conferencePaper";
	}
	else {
		return "journalArticle"; // default -- most of the catalog
	}
}
function doImport() {
	var xml = Zotero.getXML();
	var ns = {
		dim: 'http://www.dspace.org/xmlns/dspace/dim',
		mets: 'http://www.loc.gov/METS/',
		xlink: 'http://www.w3.org/TR/xlink/'
	};

	let type = ZU.xpathText(xml, '//dim:field[@element="type"]', ns);
	var item = new Zotero.Item("journalArticle");
	if (type) {
		item.itemType = getType(type);
	}

	item.title = ZU.trimInternal(ZU.xpathText(xml, '//dim:field[@element="title"]', ns));
	let abstract = ZU.xpath(xml, '//dim:field[@qualifier="abstract"]', ns);
	if (abstract.length) {
		item.abstractNote = abstract[0].textContent;
	}
	item.date = ZU.xpathText(xml, '//dim:field[@element="date" and @qualifier="issued"]', ns);
	item.language = ZU.xpathText(xml, '//dim:field[@element="language"]', ns);
	item.issue = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="issue"]', ns);
	item.volume = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="volume"]', ns);
	item.publicationTitle = ZU.xpathText(xml, '//dim:field[@element="title" and @qualifier="parent"]', ns);
	if (!item.publicationTitle) {
		item.publicationTitle = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="title"]', ns);
	}
	item.conferenceName = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="conferencename"]', ns);
	item.publisher = ZU.xpathText(xml, '//dim:field[@element="publisher" and not(@qualifier="place")]', ns);
	item.place = ZU.xpathText(xml, '//dim:field[@element="publisher" and @qualifier="place"]', ns);
	item.series = ZU.xpathText(xml, '//dim:field[@element="relation" and @qualifier="ispartofseries"]', ns);
	item.ISSN = ZU.xpathText(xml, '//dim:field[@element="identifier" and @qualifier="issn"]', ns);
	let pages = ZU.xpathText(xml, '//dim:field[@element="format" and @qualifier="pagerange"]', ns);
	if (pages) {
		item.pages = pages.replace(/pp?\./i, "");
	}
	else if (ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="stpage"]', ns)) {
		item.pages = ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="stpage"]', ns)
			+ "-" + ZU.xpathText(xml, '//dim:field[@element="bibliographicCitation" and @qualifier="endpage"]', ns);
	}
	let numPages = ZU.xpathText(xml, '//dim:field[@element="format" and @qualifier="pages"]', ns);
	if (numPages) {
		item.numPages = numPages.replace(/pp?\.?/i, "");
	}
	item.url = ZU.xpathText(xml, '//dim:field[@element="identifier" and @qualifier="uri"]', ns); // using the handle

	let authors = ZU.xpath(xml, '//dim:field[@element="contributor" and @qualifier="author"]', ns);
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(author.textContent, "author", true));
	}

	let tags = ZU.xpath(xml, '//dim:field[@element="subject"]', ns);
	for (let tag of tags) {
		item.tags.push(tag.textContent);
	}
	// getting only the first PDF
	let pdfURL = ZU.xpathText(xml, '//mets:file[@MIMETYPE="application/pdf"][1]/mets:FLocat/@xlink:href', ns);
	if (pdfURL) {
		item.attachments.push({ url: pdfURL, title: "Full Text PDF", mimeType: "application/pdf" });
	}
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
