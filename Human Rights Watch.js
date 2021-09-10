{
	"translatorID": "2bd6876f-26ce-43ec-a9af-88616a464ed0",
	"label": "Human Rights Watch",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.hrw\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-14 03:16:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, url) {
	// can't go off URLs alone because some reports are under /news/
	if (url.includes('/report/') || doc.querySelector('.report-header')) {
		return "report";
	}
	else if (url.includes('world-report') || doc.querySelector('.wr-hero')) {
		if (url.includes('/country-chapters/')) {
			return "bookSection";
		}
		else {
			return "book";
		}
	}
	else if (doc.querySelector('.news-header')) {
		return "blogPost";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.media-block__title > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (item.itemType == 'report') {
			if (url.includes('/world-report/') || doc.querySelector('.wr-hero')) {
				// world reports get the wrong title
				item.title = text(doc, 'h1');
			}
			else {
				// we only bother with subtitles for regular reports because they're
				// just descriptions on news/briefings/blog posts/world reports.
				let subtitle = text(doc, '.report-header__subtitle');
				if (subtitle && !item.title.includes(': ')) {
					item.title += `: ${subtitle}`;
				}
			}
			
			item.institution = 'Human Rights Watch';
			
			// HRW reports have ISBNs, but there's no way to get them from the page,
			// only from some text in the PDF. Such a pain.
			
			if (item.abstractNote) {
				item.abstractNote = item.abstractNote.replace(/^Summary\b/, '');
			}
		}
		else if (item.itemType == 'bookSection') {
			item.title = text(doc, 'h1');
			let subtitle = text(doc, '.chapter-header__subtitle');
			if (subtitle && !item.title.includes(': ')) {
				item.title += `: ${subtitle}`;
			}
			
			item.bookTitle = text(doc, 'header a[href*="/world-report/"]');
		}
		
		if (['book', 'bookSection'].includes(item.itemType)) {
			// can't get the publisher...
			item.creators = [{
				lastName: 'Human Rights Watch',
				creatorType: 'author',
				fieldMode: 1
			}];
		}
		
		let downloadLink = attr(doc, 'a.download-item-link, a.wr-hero__report-dl', 'href');
		if (downloadLink) {
			// replace snapshot
			item.attachments = [
				{
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: downloadLink
				}
			];
		}
		
		item.libraryCatalog = 'Human Rights Watch';
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.hrw.org/report/2021/08/10/underwater/human-rights-impacts-china-belt-and-road-project-cambodia",
		"items": [
			{
				"itemType": "report",
				"title": "Underwater: Human Rights Impacts of a China Belt and Road Project in Cambodia",
				"creators": [],
				"date": "2021-08-10T10:31:33-0400",
				"abstractNote": "“Dao,” an ethnic Lao man in his 40s, previously lived a largely self-sufficient life in the village of Srekor in northeastern Cambodia’s Stung Treng province. He fished on the Sesan River and farmed rice and fruit on the fertile soil along the river. His family gathered herbs, mushrooms, resins, and medicinal plants from his village’s communal forests and sold them at the local market.",
				"institution": "Human Rights Watch",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "Underwater",
				"url": "https://www.hrw.org/report/2021/08/10/underwater/human-rights-impacts-china-belt-and-road-project-cambodia",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.hrw.org/km/report/2021/08/10/379432",
		"items": [
			{
				"itemType": "report",
				"title": "នៅក្រោមផ្ទែទឹក: ផលប៉ះពាល់សិទ្ធិមនុស្សពីគម្រោងផ្លូវមួយ ខ្សែក្រវាត់មួយនៅកម្ពុជា របាការណ៍សង្ខេប",
				"creators": [],
				"date": "2021-08-10T17:28:43-0400",
				"abstractNote": "“លោក ដាវ” ជាជនជាតិភាគតិចឡាវ មានអាយុ ជាង ៤០ ឆ្នាំ ធ្លាប់រស់នៅក្នុងជីវភាពដែលស្វ័យភាពបរិបូរក្នុងភូមិ ស្រែគ ខេត្តស្ទឹងត្រែង ភាគឦសាននៃប្រទេសកម្ពុជា។​ គាត់ប្រកបរបរនេសាទក្នុងទន្លេសេសាន និងធ្វើស្រែចំការ នៅលើដីដ៏មានជីជាតិតាមដងទន្លេ។ គ្រួសាររបស់លោក ចេញទៅរករុក្ខជាតិ ផ្សិត ជ័រទឹក រុក្ខជាតិឱសថផ្សេងៗពីព",
				"institution": "Human Rights Watch",
				"language": "km",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "នៅក្រោមផ្ទែទឹក",
				"url": "https://www.hrw.org/km/report/2021/08/10/379432",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.hrw.org/report/2018/07/01/scared-public-and-now-no-privacy/human-rights-and-public-health-impacts",
		"items": [
			{
				"itemType": "report",
				"title": "“Scared in Public and Now No Privacy”: Human Rights and Public Health Impacts of Indonesia’s Anti-LGBT Moral Panic",
				"creators": [],
				"date": "2018-07-01T21:01:01-0400",
				"abstractNote": "On May 21, 2017, police in Indonesia’s capital, Jakarta, raided the Atlantis gym and sauna, arresting 141 people, most of whom were gay or bisexual men. Ten were ultimately prosecuted under Indonesia’s pornography law. The Atlantis was not just a “gay club,” but a public health outreach center—a well-known hub for HIV education, testing, and counseling among men who have sex with men (MSM).",
				"institution": "Human Rights Watch",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "“Scared in Public and Now No Privacy”",
				"url": "https://www.hrw.org/report/2018/07/01/scared-public-and-now-no-privacy/human-rights-and-public-health-impacts",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.hrw.org/report/2019/05/28/if-you-are-afraid-your-lives-leave-sinai/egyptian-security-forces-and-isis",
		"items": [
			{
				"itemType": "report",
				"title": "If You Are Afraid for Your Lives, Leave Sinai!: Egyptian Security Forces and ISIS-Affiliate Abuses in North Sinai",
				"creators": [],
				"date": "2019-05-28T00:59:01-0400",
				"institution": "Human Rights Watch",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "If You Are Afraid for Your Lives, Leave Sinai!",
				"url": "https://www.hrw.org/report/2019/05/28/if-you-are-afraid-your-lives-leave-sinai/egyptian-security-forces-and-isis",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.hrw.org/news/2021/08/05/afghanistan-justice-system-failing-women",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Afghanistan: Justice System Failing Women",
				"creators": [],
				"date": "2021-08-05T08:00:00-0400",
				"abstractNote": "The Afghan government’s failure to provide accountability for violence against women and girls has undermined progress to protect women’s rights, Human Rights Watch said in a report released today.",
				"blogTitle": "Human Rights Watch",
				"language": "en",
				"shortTitle": "Afghanistan",
				"url": "https://www.hrw.org/news/2021/08/05/afghanistan-justice-system-failing-women",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.hrw.org/the-day-in-human-rights/2021/07/26",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Fears of Further Taliban Atrocities in Afghanistan: Daily Brief",
				"creators": [],
				"date": "2021-07-26T03:29:54-0400",
				"abstractNote": "Afghanistan's civilian casualties have hit a record high, according to a new UN study.",
				"blogTitle": "Human Rights Watch",
				"language": "en",
				"shortTitle": "Fears of Further Taliban Atrocities in Afghanistan",
				"url": "https://www.hrw.org/the-day-in-human-rights/2021/07/26",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.hrw.org/sitesearch?search=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.hrw.org/news/2021/08/11/left-fish-too-small-sell-cambodias-mekong-river-basin",
		"items": [
			{
				"itemType": "report",
				"title": "Left With Fish Too Small to Sell in Cambodia’s Mekong River Basin: How a China-Built Dam Destroyed an Ecosystem and Livelihoods",
				"creators": [],
				"date": "2021-08-10T17:16:06-0400",
				"abstractNote": "Thousands have lost their homes and livelihoods since the completion of one of Asia’s widest dams, the Lower Sesan 2, in Cambodia’s Mekong River Basi",
				"institution": "Human Rights Watch",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "Left With Fish Too Small to Sell in Cambodia’s Mekong River Basin",
				"url": "https://www.hrw.org/news/2021/08/11/left-fish-too-small-sell-cambodias-mekong-river-basin",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.hrw.org/world-report/2019",
		"items": [
			{
				"itemType": "book",
				"title": "World Report 2019 | Human Rights Watch",
				"creators": [
					{
						"lastName": "Human Rights Watch",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2018-12-04T13:10:21-0500",
				"abstractNote": "World Report 2019 is Human Rights Watch’s 29th annual review of human rights practices around the globe. It summarizes key human rights issues in more than 100 countries and territories worldwide, drawing on events from late 2017 through November 2018.\n\nIn his keynote essay, “World’s Autocrats Face Rising Resistance,” Human Rights Watch Executive Director Kenneth Roth argues that while autocrats and rights abusers often captured headlines in 2018, rights defenders pushed back and gained strength in unexpected ways.",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"url": "https://www.hrw.org/world-report/2019",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.hrw.org/world-report/2019/country-chapters/australia",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Australia: Events of 2018",
				"creators": [
					{
						"lastName": "Human Rights Watch",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2018-12-20T19:12:50-0500",
				"abstractNote": "Australia has a strong record of protecting civil and political rights, but serious human rights issues remain. In 2018, the government continued to hold refugees and asylum seekers who arrived by boat in Australian waters on Manus Island in Papua New Guinea and on Nauru, marking more than five years since the reintroduction of its draconian offshore processing and settlement policy.\n\nIn October, the Queensland government introduced a human rights act, becoming the third jurisdiction in Australia to do so behind the Australian Capital Territory and Victoria.",
				"bookTitle": "World Report 2019",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "Australia",
				"url": "https://www.hrw.org/world-report/2019/country-chapters/australia",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.hrw.org/world-report/2019/country-chapters/global-5",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Caught in the Middle: Convincing “Middle Powers” to Fight Autocrats Despite High Costs",
				"creators": [
					{
						"lastName": "Human Rights Watch",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2019-01-08T10:54:37-0500",
				"abstractNote": "In a stifling political climate dominated by thin-skinned autocrats, governments that criticize another country’s human rights record risk paying an increasingly heavy price.\n\nIn August, a routine tweet by Canada’s Foreign Ministry calling for the release of Saudi women’s rights defenders triggered a full-blown diplomatic crisis, with Saudi Arabia retaliating by expelling Canada’s ambassador in Riyadh and freezing all new bilateral trade and investments.",
				"bookTitle": "World Report 2019",
				"language": "en",
				"libraryCatalog": "Human Rights Watch",
				"shortTitle": "Caught in the Middle",
				"url": "https://www.hrw.org/world-report/2019/country-chapters/global-5",
				"attachments": [
					{
						"title": "Snapshot",
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
