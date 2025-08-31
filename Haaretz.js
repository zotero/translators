{
	"translatorID": "d6f64d96-aa6f-4fd3-816f-bdef842c7088",
	"label": "Haaretz",
	"creator": "Eran Rosenthal",
	"target": "^https?://www\\.haaretz\\.(co\\.il|com)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-11-05 08:15:35"
}

/**
	Copyright (c) 2015 Eran Rosenthal and contributors
	
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
	let path = new URL(url).pathname;
	if (/article-podcast\//.test(path)) {
		return "podcast";
	}
	if (/\/opinions?\/letters\//.test(path)) {
		return "letter";
	}
	if (/-cartoon\/|\/opinions\/caricatures\//.test(path)) {
		return "artwork";
	}
	// Selectors for multiple results will also match on the home page but not
	// all of them point to single items. Special-case the home page to prevent
	// this. This could have been dealt with better if the class names weren't
	// obfuscated.
	if (path === "/") return false;
	let ld = getLD(doc);
	if (ld && ["NewsArticle", "LiveBlogPosting"].includes(ld["@type"])) {
		return "newspaperArticle";
	}
	return getSearchResults(doc, true) && "multiple";
}

function getSearchResults(doc, checkOnly) {
	let url = doc.location.href;
	if (/^https:\/\/[^/]+\/search-results($|\?)/.test(url)) {
		if (checkOnly) { // only observe in detection stage; otherwise an error
			let root = doc.getElementById("__next");
			if (root) Z.monitorDOMChanges(root);
		}
		return getSiteSearchContent(doc, checkOnly);
	}
	else {
		return getSectionContent(doc, checkOnly);
	}
}

function getSiteSearchContent(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('article header a');
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

function getSectionContent(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('main section a[href^="/"]');
	for (let row of rows) {
		if (!row.querySelector("h1, h2, h3") && !(row.parentElement && row.parentElement.tagName === "LI")) continue;
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.libraryCatalog = "Haaretz";

		let ld = getLD(doc);

		// replace creators; EM fails for multiple authors
		if (ld.author) {
			item.creators = ld.author
				.filter(obj => obj["@type"] === "Person")
				.map(obj => ZU.cleanAuthor(obj.name, "author"));
		}

		// find section by breadcrumb but only if breadcrumb does not stop at
		// top level
		if (ld.breadcrumb && ld.breadcrumb.itemListElement.length > 1) {
			let breadCrumb = ld.breadcrumb.itemListElement.slice(-1)[0].name;
			if (breadCrumb) {
				item.section = breadCrumb;
			}
		}
		else {
			item.section = "";
		}

		// title (headline); EM sometimes gives headline that contains more
		// noise
		if (ld.headline) {
			item.title = ld.headline.replace(/ [-|] .+$/, "");
		}

		// abstract (abstract content in the <meta> elements are inconveniently
		// capitalized)
		if (ld.description) {
			item.abstractNote = ld.description;
		}
		else {
			let lede = text(doc, "main header h1 + p");
			if (lede) {
				item.abstractNote = lede;
			}
		}

		// Fix language field for Arabic content
		let sample = item.title || item.abstractNote || "";
		if (/[\u0600-\u06ff]/.test(sample)) {
			item.language = "ar";
		}
		// Note that the Arabic-language content also falls under the Hebrew
		// publicationTitle for some reason
		let langIsEn = /^en/i.test(item.language || "en");
		item.publicationTitle = langIsEn ? "Haaretz" : "הארץ";

		// Fix authorship for editorial articles
		if (/\/opinions?\/editorial/.test(item.url || doc.location.href)) {
			item.creators = [];
		}

		// Fix authorship, container title, and length for podcasts
		if (item.itemType === "podcast") {
			let firstCreator = item.creators[0];
			if (firstCreator) {
				let podcastTitle = (firstCreator.firstName || "") + (firstCreator.lastName ? ` ${firstCreator.lastName}` : "");
				if (podcastTitle) {
					item.seriesTitle = podcastTitle;
				}
			}
			item.creators = [];
			let runningTime = attr(doc, 'main header div[role="slider"]', "aria-valuemax");
			if (runningTime) {
				item.runningTime = runningTime;
			}
		}

		if (item.itemType === "letter") {
			item.letterType = langIsEn ? "Letter to the editor" : "מכתב לעורך";
			delete item.section;
			// there's no easy way of detecting the author reliably for
			// English-language letters
			if (langIsEn) item.creators = [];
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = detectWeb(doc, url) || "newspaperArticle";
	await em.doWeb(doc, url);
}

function getLD(doc) {
	let ldScript = text(doc, "script[type='application/ld+json']");
	if (ldScript) return JSON.parse(ldScript);
	return null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.haaretz.com/2015-08-14/ty-article/islamic-jihad-if-hunger-striker-dies-well-respond-with-force/0000017f-f0b6-d223-a97f-fdff11760000",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Islamic Jihad: If hunger striker dies, we'll respond with force against Israel",
				"creators": [
					{
						"firstName": "Jack",
						"lastName": "Khoury",
						"creatorType": "author"
					},
					{
						"firstName": "Shirly",
						"lastName": "Seidler",
						"creatorType": "author"
					},
					{
						"firstName": "Ido",
						"lastName": "Efrati",
						"creatorType": "author"
					}
				],
				"date": "2015-08-14",
				"abstractNote": "Islamic Jihad says it will no longer be committed to maintaining calm if Mohammed Allaan, who lost consciousness after 60-day hunger strike, dies.",
				"language": "en",
				"libraryCatalog": "Haaretz",
				"publicationTitle": "Haaretz",
				"shortTitle": "Islamic Jihad",
				"url": "https://www.haaretz.com/2015-08-14/ty-article/islamic-jihad-if-hunger-striker-dies-well-respond-with-force/0000017f-f0b6-d223-a97f-fdff11760000",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Palestinian hunger strike"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.haaretz.co.il/news/politics/2015-08-15/ty-article/0000017f-e675-da9b-a1ff-ee7f93440000",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "פלסטיני דקר חייל ופצע אותו באורח קל בכביש 443 סמוך לבית חורון",
				"creators": [
					{
						"firstName": "גילי",
						"lastName": "כהן",
						"creatorType": "author"
					},
					{
						"firstName": "עמירה",
						"lastName": "הס",
						"creatorType": "author"
					}
				],
				"date": "2015-08-15",
				"abstractNote": "כוח צה\"ל שהיה במקום פתח באש לעבר הפלסטיני ופצע אותו באורח קל, והוא נעצר. החייל והדוקר פונו לבית החולים שערי צדק. בתחילת השבוע נדקר באזור צעיר ישראלי נוסף שנפצע בינוני",
				"language": "he",
				"libraryCatalog": "Haaretz",
				"publicationTitle": "הארץ",
				"section": "מדיני ביטחוני",
				"url": "https://www.haaretz.co.il/news/politics/2015-08-15/ty-article/0000017f-e675-da9b-a1ff-ee7f93440000",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "טרור"
					},
					{
						"tag": "פיגוע"
					},
					{
						"tag": "פלסטינים"
					},
					{
						"tag": "צה\"ל"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.haaretz.com/search-results?q=cuisine",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.haaretz.com/science-and-health/climate-change",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.haaretz.com/ty-tag/lgbt-0000017f-da2a-d42c-afff-dffad1ae0000",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.haaretz.co.il/debate/2023-10-26/ty-article/0000018b-6b3b-de3d-abdb-7f7b1ba00000",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "أمام مشاهد الدمار، في غزة بدأوا يشككون بالقرار الذي اتخذته حماس",
				"creators": [
					{
						"firstName": "جاكي",
						"lastName": "خوري",
						"creatorType": "author"
					}
				],
				"date": "2023-10-26",
				"abstractNote": "سكان القطاع بدأوا يقولون بصوت مرتفع إن حماس أخطأت في تقدير المخاطر المترتبة عن الهجوم على إسرائيل ـ وربما تكون ارتكبت خطأ مصيرياً أول مَن يعاني مِن جرّائه هم السكان الذين يتلقّون، بأجسادهم انتقام الجيش الإسرائيلي",
				"language": "ar",
				"libraryCatalog": "Haaretz",
				"publicationTitle": "הארץ",
				"section": "הארץ בערבית",
				"url": "https://www.haaretz.co.il/debate/2023-10-26/ty-article/0000018b-6b3b-de3d-abdb-7f7b1ba00000",
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
		"url": "https://www.haaretz.co.il/opinions/editorial-articles/2023-11-01/ty-article-opinion/0000018b-8658-d055-afbf-b6fb84690000",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "ארדן, פרובוקציה עלובה",
				"creators": [],
				"date": "2023-11-01",
				"language": "he",
				"libraryCatalog": "Haaretz",
				"publicationTitle": "הארץ",
				"section": "מאמר מערכת",
				"url": "https://www.haaretz.co.il/opinions/editorial-articles/2023-11-01/ty-article-opinion/0000018b-8658-d055-afbf-b6fb84690000",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "גלעד ארדן"
					},
					{
						"tag": "האומות המאוחדות - האו\"ם"
					},
					{
						"tag": "מלחמת חרבות ברזל"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.haaretz.co.il/digital/podcast/2023-10-22/ty-article-podcast/0000018b-5742-db77-afdb-dfc2efea0000",
		"items": [
			{
				"itemType": "podcast",
				"title": "28 דקות של אסקפיזם שמתחילות בשירה האס ונגמרות בסמבוסק חשאי",
				"creators": [],
				"abstractNote": "תרבות יום א', פודקאסט התרבות של \"הארץ\" עם גילי איזיקוביץ וניב הדס: 28 דקות של אסקפיזם שהתחילו בסדרה החדשה של שירה האס ובמחמאות לא צפויות לנטפליקס.",
				"language": "he",
				"runningTime": "28:00",
				"seriesTitle": "תרבות יום א'",
				"url": "https://www.haaretz.co.il/digital/podcast/2023-10-22/ty-article-podcast/0000018b-5742-db77-afdb-dfc2efea0000",
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
		"url": "https://www.haaretz.com/israel-news/podcasts/2022-10-06/ty-article-podcast/.premium/will-religious-voters-decide-who-is-israels-next-leader-listen-to-election-overdose/00000183-ae7e-d0e7-a7a3-fefee5440000",
		"items": [
			{
				"itemType": "podcast",
				"title": "Will religious voters decide who Israel's next leader is? LISTEN to Election Overdose",
				"creators": [],
				"abstractNote": "Israel's national religious sector could play a key role in Israel's November 1 election, and parties all across the political spectrum are seeking the religious vote. Haaretz's Election Overdose podcast tries to make sense of the religious voter's dilemma",
				"language": "en",
				"seriesTitle": "Election Overdose",
				"shortTitle": "Will religious voters decide who Israel's next leader is?",
				"url": "https://www.haaretz.com/israel-news/podcasts/2022-10-06/ty-article-podcast/.premium/will-religious-voters-decide-who-is-israels-next-leader-listen-to-election-overdose/00000183-ae7e-d0e7-a7a3-fefee5440000",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Israeli elections"
					},
					{
						"tag": "Israeli politics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.haaretz.com/opinion/letters/2019-09-03/ty-article-opinion/letters-to-the-editor-were-hiding-a-girl-to-protect-her-from-deportation/0000017f-ecf5-d0f7-a9ff-eef59efa0000",
		"items": [
			{
				"itemType": "letter",
				"title": "We are hiding a Filipino girl to protect her from deportation",
				"creators": [],
				"date": "2019-09-03",
				"abstractNote": "The child we are hiding My partner and I live in the Tel Aviv area. We are sheltering a foreign worker from the Philippines and her 12-year-old daughter. All our friends",
				"language": "en",
				"letterType": "Letter to the editor",
				"libraryCatalog": "Haaretz",
				"url": "https://www.haaretz.com/opinion/letters/2019-09-03/ty-article-opinion/letters-to-the-editor-were-hiding-a-girl-to-protect-her-from-deportation/0000017f-ecf5-d0f7-a9ff-eef59efa0000",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "LGBTQ"
					},
					{
						"tag": "Migrant workers"
					},
					{
						"tag": "Russia"
					},
					{
						"tag": "Vladimir Putin"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.haaretz.co.il/opinions/letters/2023-10-31/ty-article-opinion/.premium/0000018b-85eb-d805-a98f-b5fb8d4e0000",
		"items": [
			{
				"itemType": "letter",
				"title": "הופקרנו",
				"creators": [
					{
						"firstName": "נועה",
						"lastName": "אצילי",
						"creatorType": "author"
					}
				],
				"date": "2023-10-31",
				"language": "he",
				"letterType": "מכתב לעורך",
				"libraryCatalog": "Haaretz",
				"url": "https://www.haaretz.co.il/opinions/letters/2023-10-31/ty-article-opinion/.premium/0000018b-85eb-d805-a98f-b5fb8d4e0000",
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
		"url": "https://www.haaretz.co.il/opinions/caricatures/2023-10-18/ty-article-opinion/.premium/0000018b-3d97-dd29-a3df-fdf735970000",
		"items": [
			{
				"itemType": "artwork",
				"title": "קריקטורה יומית",
				"creators": [
					{
						"firstName": "ערן",
						"lastName": "וולקובסקי",
						"creatorType": "author"
					}
				],
				"date": "2023-10-18",
				"abstractNote": "הארץ",
				"language": "he",
				"libraryCatalog": "Haaretz",
				"url": "https://www.haaretz.co.il/opinions/caricatures/2023-10-18/ty-article-opinion/.premium/0000018b-3d97-dd29-a3df-fdf735970000",
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
