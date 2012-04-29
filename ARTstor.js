{
	"translatorID": "5278b20c-7c2c-4599-a785-12198ea648bf",
	"label": "ARTstor",
	"creator": "Sebastian Karcher",
	"target": "^https?://library\\.artstor.org[^/]*",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-28 23:49:07"
}


/*
	***** BEGIN LICENSE BLOCK *****
	
	ARTstor Translator, Copyright © 2012 Sebastian Karcher
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (ZU.xpathText(doc, '//table[@class="headerTable"]//th[@class="th1"]').indexOf("Field")!= -1) {
		return "artwork";
		//multiple items are all in one javascript application - no way to get to them.
	}
}

function associateData(newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {
	var dataTags = new Object();
	var newItem = new Zotero.Item("artwork");
	var fields = ZU.xpath(doc, '//tr[@class="alternateRow" or @class="normalRow"]/td[1]');
	var contents = ZU.xpath(doc, '//tr[@class="alternateRow" or @class="normalRow"]/td[2]');
    var count = fields.length;
	for (i=0; i<count; i++){
		var field = fields[i].textContent.trim();
		var content = contents[i].textContent.trim();
		dataTags[field] = content;
		if (field == "Creator"){
		  var artist= ZU.xpathText(contents[i], './br[1]/preceding-sibling::text()');
		  if (!artist) artist = content.replace(/[0-9\-]+/, "").replace(/[\s]$/, "");
		  if (artist) newItem.creators = ZU.cleanAuthor(artist, "artist", artist.match(/,/));
		}
		//Z.debug("field: " + field + " content: " + dataTags[field])
	}
   //these might not be complete - it's pretty straightforward to add more
	associateData(newItem, dataTags, "Title", "title");
	associateData(newItem, dataTags, "Measurements", "artworkSize");
	associateData(newItem, dataTags, "Rights", "rights");
	associateData(newItem, dataTags, "Material", "artworkMedium");
	associateData(newItem, dataTags, "Date", "date");
	associateData(newItem, dataTags, "Repository", "archive");
	associateData(newItem, dataTags, "ID Number", "archiveLocation");
	associateData(newItem, dataTags, "Description", "abstractNote");
	newItem.complete();
}

function doWeb(doc, url) {
scrape(doc, url);
} 