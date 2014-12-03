{
	"translatorID": "d21dcd90-c997-4e14-8fe0-353b8e19a47a",
	"label": "SAGE Knowledge",
	"creator": "ProQuest",
	"target": "^https?://knowledge\\.sagepub\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2014-12-02 17:54:23"
}

/*
   SAGE Knowledge Translator
   Copyright (C) 2014 ProQuest LLC
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
	if (getSearchResults(doc)) {
		return "multiple";
	}
	else {
		var itemType = ZU.xpathText(doc, '//div[@id="contentFrame"]//li[contains(@class, "contentType")]/@class');
		if (!itemType) {
			itemType = ZU.xpathText(doc, '//div[@id="mainContent"]//p[contains(@class, "docTypeIcon")]/@class');
		}
		itemType = ZU.trimInternal(itemType.replace(/(?:contentType)|(?:docTypeIcon)/,''));
		
		switch(itemType) {
			case "iconEncyclopedia":
			case "iconEncyclopedia-chapter":
				return "encyclopediaArticle";
			case "iconBook-chapter":
				return "bookSection";
			case "iconDictionary-chapter":
				return "dictionaryEntry";
			case "iconDebate":
			case "iconHandbook":
			case "iconBook":
			case "iconDictionary":
			case "iconMajorWork":
				return "book";
		}
	}
	return false;
}

function getItem(doc) {
	var url = doc.location.href;
	var type = detectWeb(doc, url);
	ZU.doGet(doc.getElementById("_citeLink").href, function(text) {
		var re = /<textarea name="records".*?>([\s\S]*?)<\/textarea>/;
		var match = re.exec(text)[1]
			.replace(/NV\s+-\s+1\n/, "")
			.replace(/^(AU\s+-\s+.+?)(?:,? Jr\.?|,? Ph\.?D\.?)+\n/mg, '$1\n');	
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");//RIS translator
		translator.setString(match);
		translator.setHandler("itemDone", function (obj, item) {
			var keywords = ZU.xpath(doc, "//div[@class='keywords']/a").map(function (a) {
				return ZU.trimInternal(a.textContent);
			});
			if (keywords.length > 0) {
				item.tags = keywords;
			}
			else if (item.tags && item.tags.length > 10) {
				 item.tags = item.tags.splice(0, 10);
			}
			
			item.itemType = type;
			item.url = url;
			item.attachments.push({
				title: "SAGE Knowledge snapshot",
				mimeType: "text/html",
				url: url
			});
			
			for (var i = 0; i < item.creators.length; i++) {
				var creator = item.creators[i];
				if (creator.lastName.indexOf(" of ") == -1) {
					item.creators[i] = ZU.cleanAuthor(creator.lastName, creator.creatorType, creator.lastName.indexOf(",") > -1);
				}
			}
			
			if (item.series == item.title) {
				delete item.series;
			}
			
			if (item.title.charAt(item.title.length - 1) == ".") {
				item.title = item.title.slice(0, item.title.length - 1);
			}
			
			if (item.bookTitle && item.bookTitle.charAt(item.bookTitle.length - 1) == ".") {
				item.bookTitle = item.bookTitle.slice(0, item.bookTitle.length - 1);
			}
			
			if (item.abstractNote == "There is no abstract available for this title") {
				delete item.abstractNote;
			}
			
			item.complete();
		})
		translator.translate();
	});
}

function getSearchResults(doc) {
	var items = {}, found = false;
	var results = ZU.xpath(doc, '//div[@id="pageContent"]//div[@class="result"]/div[@class="metaInf"]//a[contains(@id,"title")]');
	for (var i=0; i<results.length; i++) {
		var title = results[i].text;
		var url = results[i].href;

		if (!title || !url) {
			continue;
		}
		found = true;
		items[url] = ZU.trimInternal(title);
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var hits = getSearchResults(doc);
		var urls = [];
		Z.selectItems(hits, function(items) {
			if(items == null) {
				return true;
			}
			for (var j in items) {
				urls.push(j);
			}
			
			ZU.processDocuments(urls, getItem);
		});
	}
	else {
		getItem(doc);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/searchresults?f_0=QSEARCH_MT&q_0=leader",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/students-guide-to-congress/n97.xml?rskey=TXWrZX&row=1",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"creators": [
					{
						"lastName": "Schulman",
						"firstName": "Bruce J.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"minority leader",
					"house minority leader",
					"Senate minority leader",
					"majority party",
					"snell",
					"speaker of the house",
					"leader of the minority party",
					"minority leader 's main role",
					"party 's interest",
					"party 's lead candidate"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/students-guide-to-congress/n97.xml?rskey=TXWrZX&row=1"
					}
				],
				"abstractNote": "Student’s Guide to Congress is the second title in the brand new Student's Guide to the U.S. Government Series, which presents essential information about the U.S. government in a manner accessible to high school students. In a unique three-part format, these titles place at the reader’s fingertips everything they need to know about the evolution of elections, Congress, the presidency, and the Supreme Court, from the struggles to create the U.S. government in the late eighteenth century through the on-going issues of the early twenty-first century.",
				"place": "Washington, DC",
				"date": "2009",
				"DOI": "10.4135/9781452240190",
				"language": "English",
				"publisher": "CQ Press",
				"ISBN": "9780872895546",
				"title": "Student's Guide to Congress",
				"bookTitle": "Minority Leader",
				"url": "http://knowledge.sagepub.com/view/students-guide-to-congress/n97.xml?rskey=TXWrZX&row=1",
				"pages": "214-217",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/debate_schoolchoice/SAGE.xml?rskey=S0HLIJ&row=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Allan G.",
						"lastName": "Osborne",
						"creatorType": "author"
					},
					{
						"firstName": "Charles J.",
						"lastName": "Russo",
						"creatorType": "author"
					},
					{
						"firstName": "Gerald M.",
						"lastName": "Cattaro",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"charter school",
					"day school",
					"year-round school",
					"native American student",
					"Jewish day school",
					"head start",
					"single-sex school",
					"specific charter school",
					"Muslim identity",
					"for-profit school"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/debate_schoolchoice/SAGE.xml?rskey=S0HLIJ&row=1"
					}
				],
				"abstractNote": "This issues-based reference set on education in the United States tackles broad, contentious topics that have prompted debate and discussion within the education community. The volumes focus on pre-school through secondary education and explore prominent and perennially important debates. This set is an essential reference resource for undergraduate students within schools of education and related fields including educational administration, educational psychology, school psychology, human development, and more. Education of America's school children always has been and always will be a hot-button issue. From what should be taught to how to pay for education to how to keep kids safe in schools, impassioned debates emerge and mushroom, both within the scholarly community and among the general public. This volume in the point/counterpoint Debating Issues in American Education reference series tackles the topic of alternative schooling and school choice. Fifteen to twenty chapters explore such varied issues as charter schools, for-profit schools, faith-based schools, magnet schools, vouchers, and more. Each chapter opens with an introductory essay by the volume editor, followed by point/counterpoint articles written and signed by invited experts, and concludes with Further Readings and Resources, thus providing readers with views on multiple sides of alternative schooling and school choice issues and pointing them toward more in-depth resources for further exploration.",
				"place": "Thousand Oaks, CA",
				"date": "2012",
				"DOI": "10.4135/9781452218328",
				"language": "English",
				"publisher": "SAGE Publications, Inc.",
				"ISBN": "9781412987950",
				"title": "Alternative Schooling and School Choice",
				"url": "http://knowledge.sagepub.com/view/debate_schoolchoice/SAGE.xml?rskey=S0HLIJ&row=1",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/coaching-educational-leadership/n11.xml?rskey=WAuhwi&row=2",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Jan",
						"lastName": "Robertson",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"facilitator",
					"facilitation",
					"reflective interview",
					"professional isolation",
					"hod",
					"active listen",
					"role of the facilitator",
					"leadership role",
					"reflective practice",
					"educational leadership"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/coaching-educational-leadership/n11.xml?rskey=WAuhwi&row=2"
					}
				],
				"abstractNote": "Coaching Educational Leadership is about building leadership capacity in individuals, and in institutions, through enhancing professional relationships. It is based on the importance of maximizing potential and harnessing the ongoing commitment and energy needed to meet personal and professional goals. Based on over a decade of research and development, nationally and internationally, Coaching Educational Leadership brings you the empirical evidence, the principles, and the skills to be able to develop your own leadership and that of others you work with.",
				"place": "London",
				"date": "2008",
				"DOI": "10.4135/9781446221402",
				"language": "English",
				"publisher": "SAGE Publications Ltd",
				"ISBN": "9781847874047",
				"title": "Coaching Educational Leadership: Building Leadership Capacity Through Partnership",
				"bookTitle": "Leaders Coaching Leaders",
				"url": "http://knowledge.sagepub.com/view/coaching-educational-leadership/n11.xml?rskey=WAuhwi&row=2",
				"pages": "151-161",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Coaching Educational Leadership"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/the-quick-reference-handbook-for-school-leaders/SAGE.xml?rskey=WAuhwi&row=14",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "National Association of Head Teachers",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [
					"Sen",
					"self-evaluation",
					"headteachers",
					"headteacher",
					"new headteachers",
					"senior school staff",
					"exclusion",
					"hierarchical legislative framework",
					"disability",
					"individual school"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/the-quick-reference-handbook-for-school-leaders/SAGE.xml?rskey=WAuhwi&row=14"
					}
				],
				"abstractNote": "Distilled from years of NAHT (National Association of Head Teachers) experience of providing advice and guidance for its members in the UK, The Quick-Reference Handbook for School Leaders is a practical guide that provides an answer to the questions \"Where do I start?\" and \"Where do I look for direction?\" Written in an easy-to-read, bulleted format, the handbook is organised around key sections, each part includes brief overviews, checklists and suggestions for further reading. o Organisation and Management - the role of the Headteacher, negligence and liability, media relations, managing conflict and difficult people, effective meetings, inspection, resource management, records and information. o Teaching and Learning - curriculum, learning communities, special education, evaluation, staff development, unions, celebrating success. o Behaviour and Discipline - safe schools, code of conduct, exclusion, search and seizure, police protocols. o Health and Safety - child protection issues, occupational health & safety, risk assessments, emergency preparation, medical needs, health & safety resources. o Looking After Yourself - continuing professional development, and work-life balance. This handbook is an excellent resource for all current and aspiring senior school leaders.",
				"place": "London",
				"date": "2007",
				"DOI": "10.4135/9781446214596",
				"language": "English",
				"publisher": "SAGE Publications Ltd",
				"ISBN": "9781412934503",
				"title": "The Quick-Reference Handbook for School Leaders",
				"url": "http://knowledge.sagepub.com/view/the-quick-reference-handbook-for-school-leaders/SAGE.xml?rskey=WAuhwi&row=14",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/dictionary-of-marketing-communications/n1820.xml?rskey=WAuhwi&row=5",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"creators": [
					{
						"firstName": "Norman A.",
						"lastName": "Govoni",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/dictionary-of-marketing-communications/n1820.xml?rskey=WAuhwi&row=5"
					}
				],
				"abstractNote": "The Dictionary of Marketing Communications contains more than 4,000 entries, including key terms and concepts in the promotion aspect of marketing with coverage of advertising, sales promotion, public relations, direct marketing, personal selling and e-marketing. Growing out of a database of terms compiled over many years by the author for use in his marketing classes at Babson College, this dictionary is a living, growing document reflecting the changing dynamics of the marketing profession. It will be an essential reference to practitioners, managers, academics, students and individuals with an interest in marketing and promotion.",
				"place": "Thousand Oaks, CA",
				"date": "2004",
				"DOI": "10.4135/9781452229669",
				"language": "English",
				"publisher": "SAGE Publications, Inc.",
				"ISBN": "9780761927716",
				"title": "Dictionary of Marketing Communications",
				"bookTitle": "Leader",
				"url": "http://knowledge.sagepub.com/view/dictionary-of-marketing-communications/n1820.xml?rskey=WAuhwi&row=5",
				"pages": "113-113",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/american-political-leaders-1789-2009/SAGE.xml?rskey=mDCULV&row=21",
		"items": [
			{
				"itemType": "book",
				"creators": [],
				"notes": [],
				"tags": [
					"secretary of the treasury",
					"secretary of war",
					"postmaster",
					"secretary of the navy",
					"secretary of commerce",
					"secretary of agriculture",
					"secretary of labor",
					"secretary of health",
					"secretary of defense",
					"chair Rep."
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/american-political-leaders-1789-2009/SAGE.xml?rskey=mDCULV&row=21"
					}
				],
				"place": "Washington, DC",
				"date": "2010",
				"DOI": "10.4135/9781452240060",
				"language": "English",
				"publisher": "CQ Press",
				"ISBN": "9781604265378",
				"title": "American Political Leaders 1789–2009",
				"url": "http://knowledge.sagepub.com/view/american-political-leaders-1789-2009/SAGE.xml?rskey=mDCULV&row=21",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/behavioralsciences/SAGE.xml?rskey=DA3xPe&row=3",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Larry E.",
						"lastName": "Sullivan",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/behavioralsciences/SAGE.xml?rskey=DA3xPe&row=3"
					}
				],
				"abstractNote": "The SAGE Glossary of the Social and Behavioral Sciences provides college and university students with a highly accessible, curriculum-driven reference work, both in print and on-line, defining the major terms needed to achieve fluency in the social and behavioral sciences. Comprehensive and inclusive, its interdisciplinary scope covers such varied fields as anthropology, communication and media studies, criminal justice, economics, education, geography, human services, management, political science, psychology, and sociology. In addition, while not a discipline, methodology is at the core of these fields and thus receives due and equal consideration. At the same time we strive to be comprehensive and broad in scope, we recognize a need to be compact, accessible, and affordable. Thus the work is organized in A-to-Z fashion and kept to a single volume of approximately 600 to 700 pages.",
				"place": "Thousand Oaks, CA",
				"date": "2009",
				"DOI": "10.4135/9781412972024",
				"language": "English",
				"publisher": "SAGE Publications, Inc.",
				"ISBN": "9781412951432",
				"title": "The SAGE Glossary of the Social and Behavioral Sciences",
				"url": "http://knowledge.sagepub.com/view/behavioralsciences/SAGE.xml?rskey=DA3xPe&row=3",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/view/navigator-accounting-history/SAGE.xml?rskey=JOo7SV&row=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Fleischman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"account history",
					"traditionalist",
					"paradigm",
					"tinker",
					"critical scholar",
					"historiography",
					"critical historian",
					"account historian",
					"traditional historian",
					"critical historiography"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SAGE Knowledge snapshot",
						"mimeType": "text/html",
						"url": "http://knowledge.sagepub.com/view/navigator-accounting-history/SAGE.xml?rskey=JOo7SV&row=1"
					}
				],
				"abstractNote": "In the last twenty years accounting history literature has been enriched by the widened examination of historical events from different paradigmatic perspectives. These debates have typically pitted “traditional” historians against “critical” historians. The 47 articles in this three-volume set delineate the basic tenets of these rival paradigms. They include the work of prominent scholars from both camps. Volumes I and II reach across key managerial and financial accounting topics. Volume III draws together literature in which paradigmatic issues have been debated heatedly and those that have reflected a tendency towards consensus and joint venturing.",
				"place": "London",
				"date": "2006",
				"DOI": "10.4135/9781446260777",
				"language": "English",
				"publisher": "SAGE Publications Ltd",
				"ISBN": "9781412918701",
				"title": "Accounting History",
				"url": "http://knowledge.sagepub.com/view/navigator-accounting-history/SAGE.xml?rskey=JOo7SV&row=1",
				"libraryCatalog": "SAGE Knowledge",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://knowledge.sagepub.com/browse?doctype=sk_book&page=1&pageSize=20&sortorder=TITLE&t:state:client=H4sIAAAAAAAAAD2NsUoDQRCG56ISJZ0IvoD1prKyFAPhDhEu2E%2F2xnNkb3ecHRKvsU2ZF%2FGFrFPbWVm5Nnb%2FBx%2Ff%2F%2FEFJ9tjAKiyQp20dyjon8kZCmXT8dpxNNKIwWXSDXvK7jYwRXsgzZytrAVT6FpLij0tBwlXNY2f35f76eFnN4GjBmY+DZJiUZedwXnzghucB4z9vDXl2N80cPb0F7nHgV7hHaoGTqXU%2FvlNxGBquF6NQgYXj0zbVod0F%2F3oQxLqGItQHpQp%2FwKsYaUx1gAAAA%3D%3D",
		"items": "multiple"
	}
]
/** END TEST CASES **/
