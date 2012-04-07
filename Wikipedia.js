{
	"translatorID": "e5dc9733-f8fc-4c00-8c40-e53e0bb14664",
	"label": "Wikipedia",
	"creator": "Aurimas Vinckevicius",
	"target": "https?://[^/]*wikipedia\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-04-06 23:13:36"
}

/**
	Copyright (c) 2012 Aurimas Vinckevicius
	
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
	return 'encyclopediaArticle';
}

function doWeb(doc, url) {
	var item = new Zotero.Item('encyclopediaArticle');
	item.title = ZU.xpathText(doc, '//h1[@id="firstHeading"]/span');
	item.creators.push({
		lastName: 'Wikipedia contributors',
		fieldMode: 1,
		creatorType: 'author'
	});

	item.publisher = 'Wikimedia Foundation, Inc.';
	item.encyclopediaTitle = 'Wikipedia, The Free Encyclopedia';
	item.rights = 'Creative Commons Attribution-ShareAlike License';

	item.URL = ZU.xpathText(doc, '//li[@id="t-permalink"]/a/@href');
	if(item.URL) {
		item.extra = 'Page Version ID: ' + 
						item.URL.match(/[&?]oldid=(\d+)/)[1];
		item.URL = doc.location.protocol + '//' + doc.location.hostname
					+ item.URL;
	}

	item.language = doc.documentElement.lang;

	var abs = ZU.xpathText(doc, '//div[@id="mw-content-text"]/p[1]', null, '');
	item.abstractNote = ZU.trimInternal(abs);

	//last modified date is hard to get from the page because it is localized
	var pageInfoURL = '/w/api.php?action=query&prop=info&format=json&' + 
						'inprop=url%7Cdisplaytitle&titles=' +
						item.title;
	ZU.doGet(pageInfoURL, function(text) {
		var retObj = JSON.parse(text);
		if(retObj && !retObj.query.pages['-1']) {
			var pages = retObj.query.pages;
			for(var i in pages) {
				item.date = pages[i].touched;
				item.title = pages[i].displaytitle;
				//we should never have more than one page returned,
				//but break just in case
				break;
			}
		}
		item.complete();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ru.wikipedia.org/w/index.php?title=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F&oldid=43336101",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"creators": [
					{
						"lastName": "Wikipedia contributors",
						"fieldMode": 1,
						"cteatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Россия",
				"publisher": "Wikipedia, The Free Encyclopedia",
				"URL": "http://ru.wikipedia.org/w/index.php?title=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F&oldid=43336101",
				"extra": "Page Version ID: 43336101",
				"date": "2012-04-06T20:11:33Z",
				"libraryCatalog": "Wikipedia"
			}
		]
	},
	{
		"type": "web",
		"url": "http://en.wikipedia.org/w/index.php?title=Zotero&oldid=485342619",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"creators": [
					{
						"lastName": "Wikipedia contributors",
						"fieldMode": 1,
						"cteatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Zotero",
				"publisher": "Wikipedia, The Free Encyclopedia",
				"URL": "http://en.wikipedia.org/w/index.php?title=Zotero&oldid=485342619",
				"extra": "Page Version ID: 485342619",
				"date": "2012-04-06T20:27:51Z",
				"libraryCatalog": "Wikipedia"
			}
		]
	}
]
/** END TEST CASES **/