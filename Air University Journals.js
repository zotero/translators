{
	"translatorID": "e317b4d4-03cf-4356-aa3c-defadc6fd10e",
	"label": "Air University Journals",
	"creator": "Sebastian Karcher",
	"target": "https?://www\\.airuniversity\\.af\\.edu/(ASPJ|SSQ)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-14 19:04:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Sebastian Karcher
	
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

// eslint-disable-next-line no-unused-vars
function detectWeb(doc, url) {
	if (text(doc, 'a[title="View Article"], h2>a[href*="documents"]', 1)) {
		return "multiple";
	}
	return false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var rows = ZU.xpath(doc, '//div[@class="da_black"]/table[tbody//a[@title="View Article"]]');
		if (rows.length < 3) {
			rows = ZU.xpath(doc, '//div[@class="da_black"]//p[span//a[@title="View Article"]]');
		}
		if (!rows.length) {
			// New layout, e.g. https://www.airuniversity.af.edu/SSQ/Display/Article/2748342/volume-15-issue-3-fall-2021/
			rows = ZU.xpath(doc, '//div[@class="da_black"]//li//div[h2/a or h2/em/a]');
		}

		var items = {};
		var journal, abbr, ISSN;
		if (url.includes("/ASPJ/")) {
			journal = "Air & Space Power Journal";
			abbr = "ASPJ";
			ISSN = "1554-2505";
		}
		else if (url.includes("/SSQ/")) {
			journal = "Strategic Studies Quarterly";
			abbr = "SSQ";
			ISSN = "1936-1815";
		}
		var voliss = text(doc, 'h1.title');
		var date = text(doc, 'p.da_story_info');
		for (let i = 0; i < rows.length; i++) {
			var title = text(rows[i], 'span > a[title="View Article"]');
			var id = attr(rows[i], 'span > a[title="View Article"]', "href");
			if (!title) {
				title = text(rows[i], 'strong > a[title="View Article"]');
				id = attr(rows[i], 'strong > a[title="View Article"]', "href");
			}
			
			if (!title) {
				title = text(rows[i], 'h2 > a, h2>em>a');
				id = attr(rows[i], 'h2 > a, h2>em>a', "href");
			}
			if (title !== null) {
				items[id] = title;
			}
		}

		Zotero.selectItems(items, function (items) {
			// Z.debug(items);
			if (!items) {
				return;
			}
			for (let id in items) {
				scrapeMultiples(doc, id, date, voliss, journal, abbr, ISSN);
			}
		});
	}
}


function scrapeMultiples(doc, id, date, voliss, journal, abbr, ISSN) {
	var item = new Z.Item('journalArticle');
	
	var titleXpath = '//span/a[contains(@href,  "' + id + '")]';
	var title = ZU.xpathText(doc, titleXpath);
	var link = id;
	
	if (!title) {
		titleXpath = '//strong/a[contains(@href, "' + id + '")]';
		title = ZU.xpathText(doc, titleXpath);
		link = id;
	}
	
	// Newer issues
	if (!title) {
		titleXpath = '//h2//a[contains(@href, "' + id + '")]';
		title = ZU.xpathText(doc, titleXpath);
		link = id;
	}
	item.title = ZU.trimInternal(title.trim());
	
	var sectionXpath = '//div[@class="da_black"]/table[tbody//a[@href="' + id + '"]]';
	var section = ZU.xpath(doc, sectionXpath);
	if (!section.length) {
		sectionXpath = '//div[@class="da_black"]/p[span//a[@href="' + id + '"]]';
		section = ZU.xpath(doc, sectionXpath);
	}
	
	// Newer issues
	if (!section.length) {
		sectionXpath = '//div[@class="da_black"]//div[h2//a[@href="' + id + '"]]';
		section = ZU.xpath(doc, sectionXpath);
	}
	
	if (section.length) {
		var authors = text(section[0], 'p>span>strong');
		if (!authors) authors = text(section[0], 'p>strong>span');
		
		// Newer issues
		if (!authors) authors = text(section[0], 'strong');

		if (authors) {
			if (authors.includes("Reviewed by")) {
				var reviewedAuthor = authors.match(/^by\s(.+)/);
				var reviewer = authors.match(/Reviewed by\s(.+)/);
				
				if (reviewedAuthor) {
					reviewedAuthor = parseAuthors(reviewedAuthor[1], "reviewedAuthor");
				}
				if (reviewer) {
					reviewer = parseAuthors(reviewer[1], "author");
				}
			
				if (reviewedAuthor && reviewer) {
					item.creators = reviewer.concat(reviewedAuthor);
				}
				
				else {
					item.creators = reviewer || reviewedAuthor;
				}
			}
			else {
				authors = ZU.trimInternal(authors.trim());
				// delete name suffixes
				item.creators = parseAuthors(authors, "author");
			}
		}
		// ASPJ
		var abstract = text(section[0], 'p > span', 1);
		
		// SSQ
		if (!abstract) abstract = ZU.xpathText(section[0], './/p/span[1]/text()');
		
		// Newer issues
		if (!abstract) abstract = ZU.xpathText(section[0], './/p/text()');
		if (abstract) {
			item.abstractNote = ZU.trimInternal(abstract.trim().replace(/^,\s/, ""));
		}
	}

	if (date && date.includes("Published ")) {
		item.date = date.match(/Published (.+)/)[1];
	}


	if (voliss && voliss.includes("Volume")) {
		item.volume = voliss.match(/Volume (\d+)/)[1];
	}
	if (voliss && voliss.includes("Issue")) {
		item.issue = voliss.match(/Issue (\d+)/)[1];
	}

	item.publicationTitle = journal;
	item.journalAbbreviation = abbr;
	item.ISSN = ISSN;

	item.attachments.push({
		url: link,
		title: "Full Text PDF",
		mimeType: "application/pdf"
	});
	item.complete();
}

function parseAuthors(creators, type) {
	creators = ZU.trimInternal(creators.trim());
	// delete name suffixes
	creators = creators.replace(/, (USAF|USN|Retired|PE|LMFT|USA|[^,]+Air Force)\b/g, "");
	let creatorsList = creators.split(/\/|,?\sand\s|,\s/);
	var rank = /^(By:|Adm|Rear Adm|Col|Lt Col|LTC|Brig Gen|Gen|Maj Gen \(sel\)|Maj|Capt|CAPT|Maj Gen|2nd Lt|W(in)?g Cdr|Mr?s\.|Mr\.|Dr\.)\s/;
	var creatorsArray = [];
	for (let creator of creatorsList) {
		creator = creator.trim().replace(rank, "");
		creatorsArray.push(ZU.cleanAuthor(creator, type));
	}
	return creatorsArray;
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.airuniversity.af.edu/SSQ/Display/Article/1261066/volume-11-issue-3-fall-2017/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.airuniversity.af.edu/ASPJ/Display/Article/1151902/volume-30-issue-2-summer-2016/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.airuniversity.af.edu/SSQ/Display/Article/2748342/volume-15-issue-3-fall-2021/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
