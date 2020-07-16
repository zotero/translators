{
	"translatorID": "552cdac3-f130-4763-a88e-8e74b92dcb1b",
	"label": "Tumblr",
	"creator": "febrezo",
	"target": "^https?://.+\\.tumblr\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-16 23:30:13"
}

/*
	Tumblr Translator
	Copyright (C) 2020 Félix Brezo, felixbrezo@gmail.com
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the Affero GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	var urlParts = url.split('/');
	if (urlParts.length <= 4) {
		return "webpage";
	}
	return "blogPost";
}

function doWeb(doc, url) {
	var resourceType = detectWeb(doc, url);
	// Creating the item
	var newItem = new Zotero.Item(resourceType);

	var urlParts = url.split('/');
	
	var tmpDate;
	if (resourceType == "blogPost") {
		newItem.blogTitle = ZU.xpathText(doc, "//meta[@property='og:site_name']/@content");
		newItem.title = ZU.xpathText(doc, "//meta[@property='og:title']/@content");
		tmpDate = ZU.xpathText(doc, '(//div[@class="date-note-wrapper"]/a)[1]');
		if (!tmpDate) {
			tmpDate = ZU.xpathText(doc, '//div[@class="date"]/text()');
		}
		newItem.date = ZU.strToISO(tmpDate);
	}
	else {
		newItem.title = ZU.xpathText(doc, "//title/text()");
		newItem.websiteTitle = ZU.xpathText(doc, "//meta[@name='description']/@content");
	}
	var tmpAuthor = urlParts[2].split(".")[0];
	if (tmpAuthor) {
		newItem.creators.push({ lastName: tmpAuthor, creatorType: "author", fieldMode: 1 });
	}
	newItem.websiteType = "Blogging (Tumblr)";
	newItem.url = url;
	
	// Adding the attachment
	newItem.attachments.push({
		title: "Tumblr Snapshot",
		mimeType: "text/html",
		url: url
	});
	
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://blogdeprogramacion.tumblr.com/post/167688373297/c%C3%B3mo-integrar-opencv-y-python-en-windows",
		"items": [
			{
				"itemType": "blogPost",
				"title": "¿Cómo integrar OpenCV y Python en Windows?",
				"creators": [
					{
						"lastName": "blogdeprogramacion",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2017-11",
				"blogTitle": "Blog de Programacion y Tecnologia",
				"url": "https://blogdeprogramacion.tumblr.com/post/167688373297/c%C3%B3mo-integrar-opencv-y-python-en-windows",
				"websiteType": "Blogging (Tumblr)",
				"attachments": [
					{
						"title": "Tumblr Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://blogdeprogramacion.tumblr.com/",
		"items": [
			{
				"itemType": "webpage",
				"title": "Blog de Programacion y Tecnologia",
				"creators": [
					{
						"lastName": "blogdeprogramacion",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"url": "https://blogdeprogramacion.tumblr.com/",
				"websiteTitle": "Blog de programacion, tecnologia, electronica, tutoriales, informatica y sistemas computacionales.",
				"websiteType": "Blogging (Tumblr)",
				"attachments": [
					{
						"title": "Tumblr Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
