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
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-02-16 03:56:10"
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
	if(ZU.xpathText(doc, '//h1[@id="firstHeading"]'))
		return 'encyclopediaArticle';
}

function doWeb(doc, url) {
	var item = new Zotero.Item('encyclopediaArticle');
	item.title = ZU.xpathText(doc, '//h1[@id="firstHeading"]');
	
	/* Removing the creator and publisher. Wikipedia is pushing the creator in their own
  	directions on how to cite http://en.wikipedia.org/w/index.php?title=Special%3ACite&page=Psychology
  	but style guides - including Chicago and APA disagree and prefer just using titles.
  	cf. e.g. http://blog.apastyle.org/apastyle/2009/10/how-to-cite-wikipedia-in-apa-style.html
  	For Publisher, not even Wikipedia suggests citing the Foundation as a Publisher.

	item.creators.push({
		lastName: 'Wikipedia contributors',
		fieldMode: 1,
		creatorType: 'author'
	});

	item.publisher = 'Wikimedia Foundation, Inc.';
	*/
	item.rights = 'Creative Commons Attribution-ShareAlike License';

	//turns out it's not that trivial to get the localized title for Wikipedia
	//we can try to strip it from the page title though
	//test for all sorts of dashes to account for different locales
	/**TODO: there's probably a better way to do this, since sometimes page
	 * title only says "- Wikipedia" (in some other language)
	 */
	var m = doc.title.match(/[\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B]\s*([^\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B]+)$/);
	if(m) {
		item.encyclopediaTitle = m[1];
	} else {
		item.encyclopediaTitle = 'Wikipedia, the free encyclopedia';
	}

	item.url = ZU.xpathText(doc, '//li[@id="t-permalink"]/a/@href');
	if(item.url) {
		item.extra = 'Page Version ID: ' + 
						item.url.match(/[&?]oldid=(\d+)/)[1];
		item.url = doc.location.protocol + '//' + doc.location.hostname
					+ item.url;
	} else {
		item.url = url
	}

	item.attachments.push({
		url: item.url,
		title: 'Snapshot',
		mimeType: 'text/html',
		snapshot: true
	});

	item.language = doc.documentElement.lang;

	var abs = ZU.xpathText(doc, '//div[@id="mw-content-text"]/p[1]', null, '');
	if(abs) item.abstractNote = ZU.trimInternal(abs);

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
				"title": "Россия",
				"creators": [],
				"date": "2015-02-16T02:48:25Z",
				"abstractNote": "Координаты: 66°25′ с. ш. 94°15′ в. д. / 66.417° с. ш. 94.250° в. д. / 66.417; 94.250 (G) (O)",
				"encyclopediaTitle": "Википедия",
				"extra": "Page Version ID: 43336101",
				"language": "ru",
				"libraryCatalog": "Wikipedia",
				"rights": "Creative Commons Attribution-ShareAlike License",
				"url": "http://ru.wikipedia.org/w/index.php?title=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F&oldid=43336101",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "http://en.wikipedia.org/w/index.php?title=Zotero&oldid=485342619",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Zotero",
				"creators": [],
				"date": "2015-02-14T13:05:20Z",
				"abstractNote": "Zotero (/[unsupported input]zoʊˈtɛroʊ/) is free, open source reference management software to manage bibliographic data and related research materials (such as PDFs). Notable features include web browser integration, online syncing, generation of in-text citations, footnotes and bibliographies, as well as integration with the word processors Microsoft Word, LibreOffice, OpenOffice.org Writer and NeoOffice. It is produced by the Center for History and New Media of George Mason University (GMU).",
				"encyclopediaTitle": "Wikipedia, the free encyclopedia",
				"extra": "Page Version ID: 485342619",
				"language": "en",
				"libraryCatalog": "Wikipedia",
				"rights": "Creative Commons Attribution-ShareAlike License",
				"url": "http://en.wikipedia.org/w/index.php?title=Zotero&oldid=485342619",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "http://en.wikipedia.org/wiki/Wikipedia:Article_wizard",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Wikipedia:Article wizard",
				"creators": [],
				"date": "2015-02-10T14:18:16Z",
				"encyclopediaTitle": "Wikipedia, the free encyclopedia",
				"extra": "Page Version ID: 646481896",
				"language": "en",
				"libraryCatalog": "Wikipedia",
				"rights": "Creative Commons Attribution-ShareAlike License",
				"shortTitle": "Wikipedia",
				"url": "http://en.wikipedia.org/w/index.php?title=Wikipedia:Article_wizard&oldid=646481896",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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