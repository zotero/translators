{
	"translatorID": "022777b5-85a0-4e1f-a3b8-7e4184c3239d",
	"label": "Yale Alumni Magazine",
	"creator": "czar",
	"target": "^https?://(www\\.)?yalealumnimagazine\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-31 10:55:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
	http://en.wikipedia.org/wiki/User_talk:Czar

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


// attr()/text() v2 per https://github.com/zotero/translators/issues/1277
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (/\/articles\//.test(url)) {
		return "magazineArticle";
	} else if (/\/blog_posts\//.test(url)) {
		return "blogPost"
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function scrape(doc, url) {
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	item.publicationTitle = "Yale Alumni Magazine";
	item.language = "en-US";
	item.url = url;
	item.abstractNote = attr(doc, 'meta[property="og:description"]', 'content');
	
	if (type == "magazineArticle") {
		item.ISSN = "0044-0051";
		item.title = text(doc,'#article_view h1');	// og:title has inaccurate info
		var authorMetadata = doc.querySelectorAll('.author_names a');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.innerText.replace(/\s(\'|’)\d{2}.*$/,""), "author")); // strip class year
		}
		item.date = text(doc,'a.text_link');
		var volno = text(doc,'.current_issue_container div');
		if (volno) {
			item.volume = volno.replace(/Vol\s([A-z]+),\sNo\s[0-9]+/,'$1')
			item.issue = volno.replace(/Vol\s[A-z]+,\sNo\s([0-9]+)/,'$1');
		}
	}
	if (type == "blogPost") {
		item.title = text(doc,'h1#blog_post_title');
		var blogAuthor = doc.querySelectorAll('.blog_post_author_unlinked');
		//Z.debug(blogAuthor[0].innerText);
		for (let author of blogAuthor) {
			item.creators.push(ZU.cleanAuthor(author.innerText.replace(/\s(\'|’)\d{2}.*$/,""), "author"));	// regex only for blog posts
		}
		item.date = text(doc,'.blog_post_authors').replace(/([\w\s\\n\s\|’]*)(\d{1,2}:\d{2}\w{2})\s(\w+\s\d+)\s(\d+)/,"$3, $4, $2 "); // regex for blog posts only
	}
	
	// tags
	for (let tag of doc.querySelectorAll('#filed_under li a, #blog_post_tag_list a')) {
		item.tags.push(tag.text.trim());
	}

	item.attachments.push({
		title: "Yale Alumni Magazine snapshot",
		mimeType: "text/html",
		document: doc
	});

	item.complete();
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.article_linked_headline, h2 > a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
			Zotero.selectItems(getSearchResults(doc, false), function (items) {
				if (!items) {
					return true;
				}
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				ZU.processDocuments(articles, scrape);
			});
			break;
		default:
			scrape(doc, url);
			break;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/articles/3209",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Another shot at the classics",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Branch",
						"creatorType": "author"
					}
				],
				"date": "Jul/Aug 2011",
				"ISSN": "0044-0051",
				"issue": "6",
				"language": "en-US",
				"libraryCatalog": "Yale Alumni Magazine",
				"publicationTitle": "Yale Alumni Magazine",
				"url": "https://yalealumnimagazine.com/articles/3209",
				"volume": "LXXIV",
				"attachments": [
					{
						"title": "Yale Alumni Magazine snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Arts & Culture"
					},
					{
						"tag": "Campus"
					},
					{
						"tag": "People & Profiles"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/articles/4448-calhoun-college-19332017",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Calhoun College, 1933–2017",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Branch",
						"creatorType": "author"
					}
				],
				"date": "Mar/Apr 2017",
				"ISSN": "0044-0051",
				"abstractNote": "After years of debate, Yale renames a residential college.",
				"issue": "4",
				"language": "en-US",
				"libraryCatalog": "Yale Alumni Magazine",
				"publicationTitle": "Yale Alumni Magazine",
				"url": "https://yalealumnimagazine.com/articles/4448-calhoun-college-19332017",
				"volume": "LXXX",
				"attachments": [
					{
						"title": "Yale Alumni Magazine snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Campus"
					},
					{
						"tag": "Student Life"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/issues/168",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/magazine/departments/light_and_verity",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/blog_posts/2102-we-smoked-our-pipes-and-took-our-ease",
		"items": [
			{
				"itemType": "blogPost",
				"title": "‘We smoked our pipes and took our ease’",
				"creators": [
					{
						"firstName": "Andrew",
						"lastName": "Letendre",
						"creatorType": "author"
					}
				],
				"date": "May 21, 2015, 2:54pm",
				"abstractNote": "Back in the 1950s, smoking a pipe was as much the fashion at Yale as button-down Gant shirts and s",
				"blogTitle": "Yale Alumni Magazine",
				"language": "en-US",
				"url": "https://yalealumnimagazine.com/blog_posts/2102-we-smoked-our-pipes-and-took-our-ease",
				"attachments": [
					{
						"title": "Yale Alumni Magazine snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "pipe smoking"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/blogs/8-daily-snap/law",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/search?utf8=%E2%9C%93&site_search=zax&commit=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://yalealumnimagazine.com/articles/5256-dizzying",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Dizzying",
				"creators": [
					{
						"firstName": "Jenny",
						"lastName": "Blair",
						"creatorType": "author"
					}
				],
				"date": "Jan/Feb 2021",
				"ISSN": "0044-0051",
				"abstractNote": "How an optical illusion fools fruit fliesand us.",
				"issue": "3",
				"language": "en-US",
				"libraryCatalog": "Yale Alumni Magazine",
				"publicationTitle": "Yale Alumni Magazine",
				"url": "https://yalealumnimagazine.com/articles/5256-dizzying",
				"volume": "LXXXIV",
				"attachments": [
					{
						"title": "Yale Alumni Magazine snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Science & Health"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
