{
	"translatorID": "5e385e77-2f51-41b4-a29b-908e23d5d3e8",
	"label": "Github",
	"creator": "Martin Fenner",
	"target": "^https?://(www\\.)?github\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2015-04-27 23:41:42"
}

/**
	Copyright (c) 2015 Martin Fenner

	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	// use item type journalArticle until item type computerProgram is used by citation styles
	if (getItem(doc, true)) return "journalArticle";

	// search results
	if (url.indexOf("/search?utf8=✓&q=") != -1 && getSearchResults(doc, true)) return "multiple";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		getItems(doc);
	} else {
		getItem(doc);
	}
}

function getSearchResults(doc, checkOnly) {
	return false;
}

function getSelectedJSON(doc) {
	var items = getSearchResults(doc);
	var ids = [];

	Zotero.selectItems(items, function(selectedItems) {
		if (!selectedItems) return true;

		for (var i in selectedItems) {
			ids.push(i.substr(1));
		}
		getJSON(ids);
	});
}

function getItem(doc, checkOnly) {
	var url = ZU.xpathText(doc, '/html/head/meta[@property="og:url"]/@content');

	if (!url) return false;
	if (checkOnly) return true;

	var item = new Z.Item("journalArticle");
	item.url = url;
	item.title = ZU.xpathText(doc, '/html/head/meta[@property="og:description"]/@content');

	// use archive and archive location
	item.archive = "Github";
	item.archiveLocation = url;

	var author = ZU.xpathText(doc, '/html/head/meta[@name="octolytics-dimension-user_login"]/@content');
	item.creators = [{ "firstName": '',
					   "lastName": author,
					   "creatorType": "author" }];

	// indicate that this is in fact a software repository
	item.extra = "{:itemType: computer_program}";

	item.language = "en-US";

	var attachment = ZU.xpathText(doc, '//a[@class="js-directory-link"]');
	if (attachment) {
		item.attachments.push({
			url: url + "/blob/master/" + encodeURIComponent(attachment),
			title: attachment,
			mimeType: "text/plain",
			snapshot: false
		});
	}

	item.complete();

	return item;
}

function getItems(ids) {
	return false;
}
