{
	"translatorID": "5665af6e-d9a3-4658-b92e-8c0dcd326f72",
	"label": "ubtue_Springer_JSON",
	"creator": "Philipp Zumstein, Johannes Riedl",
	"target": "json",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2021-04-13 15:45:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Philipp Zumstein
	Copyright © 2021 University Library of Tuebingen

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


// copied from CSL JSON
function parseInput() {
	var str, json = "";

	// Read in the whole file at once, since we can't easily parse a JSON stream. The
	// chunk size here is pretty arbitrary, although larger chunk sizes may be marginally
	// faster. We set it to 1MB.
	while ((str = Z.read(1048576)) !== false) json += str;

	try {
		return JSON.parse(json);
	} catch(e) {
		Zotero.debug(e);
	}
}

function detectImport() {
	var parsedData = parseInput();
	Z.debug(parsedData);
	if (parsedData && parsedData.apiMessage && parsedData.apiMessage.startsWith("This JSON was provided by Springer")
	    && parsedData.records.length)
	    return true;
	return false;
}


var mappingTypes = {
	"Article" : "journalArticle"
};



function doImport() {
	let data_complete = parseInput();
	if (!(data_complete && data_complete.records && data_complete.records.length))
	    return false;

    let data = data_complete.records[0];

	let type = "journalArticle";
	if (data.contentType && mappingTypes[data.contentType]) {
		type = mappingTypes[data.contentType];
	}

	let item = new Zotero.Item(type);

	item.title = data.title ? data.title : "";
	if (data.creators) {
		for (let creator of data.creators) {
			let [lastName, firstName] = creator.creator.split(',', 2).map(item => item.trim());
			item.creators.push({
						"lastName": lastName,
						"firstName": firstName,
						"creatorType": "author"
						});

		}
	}

	item.publisher = data.publisher;
	item.ISSN = data.issn ? data.issn : "";
	item.abstractNote = data.abstract ? data.abstract : "";

    if (data.keyword && data.keyword.length) {
    	for (let keyword of data.keyword) {
    	      item.tags.push({ "tag" : keyword });
    	}
    }

    item.volume = data.volume ? data.volume : "";
    item.issue = data.number ? data.number : "";
    if (item.issue.match(/\d+-\d+/))
        item.issue = item.issue.replace("-", "/");

    item.pages = data.startingPage ? data.startingPage : "";
    item.pages = item.pages + (data.endingPage ? '-' + data.endingPage : '-');
    item.date = data.publicationDate;

	item.DOI = data.doi;
	for (let url of data.url) {
        // Prevent double insertion of DOI-Url
        if (!item.url && !url.value.includes("doi.org"))
            item.url = url.value;
        else if (url.format == "pdf" || url.format=="html")
            item.notes.push({note: "url:" + url.value});
	}

	item.complete();
}

