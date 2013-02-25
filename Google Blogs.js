{
	"translatorID": "58641ca2-d324-445b-a618-4e7c4631726f",
	"label": "Google Blogs",
	"creator": "Avram Lyon",
	"target": "^https?://www\\.google\\.[^/]+/.*[?#&]tbm=blg",
	"minVersion": "2.1.8",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2013-02-24 22:41:21"
}

/*
   Google Blogs Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	return "multiple";
}

function doWeb(doc, url) {

	var list = ZU.xpath(doc, '//div[@id="search"]//ol[@id="rso"]/li/div[@class="vsc" and span/h3/a]');
	var i, node;
	var items = [];
	var names = {};
	for (i in list) {
		items[i] = new Zotero.Item("blogPost");
		link = ZU.xpath(list[i], './span/h3/a')[0];
		names[i] = link.textContent;
		items[i].title = link.textContent;
		items[i].url = link.href;
		items[i].attachments.push({url:link.href,
					title:"Blog Snapshot",
					mimeType:"text/html"});
		items[i].blogTitle = ZU.xpath(list[i], './/cite/a')[0].textContent;
		node = ZU.xpath(list[i], './/div[@class="f slp"]')[0].textContent.match(/^(.*) by (.*)$/);
		if (node) {
			items[i].date = node[1];
			items[i].creators.push(Zotero.Utilities.cleanAuthor(node[2], "author"));
		}
	}

	Zotero.selectItems(names, function(names) {
		var j;
		for (j in names) {
			items[j].complete();
		}
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.google.com/search?tbm=blg&hl=en&source=hp&biw=1024&bih=656&q=argentina&btnG=Search&gbv=2",
		"items": "multiple"
	}
]
/** END TEST CASES **/