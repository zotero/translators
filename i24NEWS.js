{
	"translatorID": "5155c613-9a3f-44f3-9c49-8457bdfafb57",
	"label": "i24NEWS",
	"creator": "Anonymous",
	"target": "^https?:\\/\\/(www\\.)?i24news\\.tv\\/(ar\\/.*|(en|fr|he)\\/(actu|news)\\/.*)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-06 14:55:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Free license for any purpose

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

function detectWeb(doc) {
	if (doc.querySelector('meta[property="og:type"][content="article"]') || doc.querySelector('article')) {
		return "newspaperArticle";
	}
	return false;
}

function doWeb(doc, url) {
	let item = new Zotero.Item("newspaperArticle");

	item.title = textOrNull(doc, 'h1');
	item.url = url;
	item.publicationTitle = "i24NEWS";

	// Language based on visible <span>
	let lang = textOrNull(doc, 'span.LanguageSelector_locale__lrrnE');
	if (lang) {
		item.language = lang.toLowerCase();
	}

	// Author
	let author = textOrNull(doc, '.author__name') || "i24NEWS";
	item.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));

	// Date
	let dateMeta = doc.querySelector('meta[property="article:published_time"]');
	if (dateMeta) {
		item.date = dateMeta.content.split("T")[0];
	}

	// Abstract
	let desc = doc.querySelector('meta[name="description"]');
	if (desc) {
		item.abstractNote = desc.content;
	}

	let tagLinks = doc.querySelectorAll('div.tags a');
	for (let tag of tagLinks) {
		let tagText = tag.textContent.trim();
		if (tagText) {
			item.tags.push(tagText);
		}
	}

	item.attachments.push({
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	});

	item.complete();
}

// Helper
function textOrNull(doc, selector) {
	let el = doc.querySelector(selector);
	return el ? el.textContent.trim() : null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.i24news.tv/en/news/israel/society/artc-gov-t-plans-on-overhaul-of-neighborhoods-hit-by-iran-missiles",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Gov't plans on overhaul of neighborhoods hit by Iran missiles",
				"creators": [
					{
						"firstName": "",
						"lastName": "i24NEWS",
						"creatorType": "author"
					}
				],
				"abstractNote": "To expedite rebuilding areas affected by the confrontation with Iran, the state plans to demolish even buildings that were not damaged • This involves more than 30 structures",
				"language": "en",
				"libraryCatalog": "i24NEWS",
				"publicationTitle": "i24NEWS",
				"url": "https://www.i24news.tv/en/news/israel/society/artc-gov-t-plans-on-overhaul-of-neighborhoods-hit-by-iran-missiles",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "IDF"
					},
					{
						"tag": "Iran"
					},
					{
						"tag": "Israel"
					},
					{
						"tag": "Operation 'Rising Lion'"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.i24news.tv/fr/actu/france/artc-elie-barnavi-et-vincent-lemire-pressent-emmanuel-macron-de-sanctionner-israel",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Elie Barnavi et Vincent Lemire pressent Emmanuel Macron de sanctionner Israël",
				"creators": [
					{
						"firstName": "",
						"lastName": "i24NEWS",
						"creatorType": "author"
					}
				],
				"abstractNote": "« Monsieur le Président, sans sanctions immédiates, vous reconnaîtrez un cimetière. Il faut agir maintenant pour que nourriture et soins affluent massivement à Gaza »",
				"language": "fr",
				"libraryCatalog": "i24NEWS",
				"publicationTitle": "i24NEWS",
				"url": "https://www.i24news.tv/fr/actu/france/artc-elie-barnavi-et-vincent-lemire-pressent-emmanuel-macron-de-sanctionner-israel",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Elie Barnavi"
					},
					{
						"tag": "Israël"
					},
					{
						"tag": "Sanctions"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.i24news.tv/he/news/science-and-technology/artc-480a381d",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "ללא צורך באפליקציה: הפיצ'ר החדש שיגיע לוואטסאפ",
				"creators": [
					{
						"firstName": "",
						"lastName": "i24NEWS",
						"creatorType": "author"
					}
				],
				"abstractNote": "יישומון המסרים המיידיים הפופולרי עשוי לקבל עדכון מיוחד שיאפשר להתכתב עם אנשים שאינם משתמשים בו • לא ברור מתי הוא יגיע לכלל המשתמשים",
				"language": "he",
				"libraryCatalog": "i24NEWS",
				"publicationTitle": "i24NEWS",
				"shortTitle": "ללא צורך באפליקציה",
				"url": "https://www.i24news.tv/he/news/science-and-technology/artc-480a381d",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "וואטסאפ"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.i24news.tv/ar/%D8%A3%D8%AE%D8%A8%D8%A7%D8%B1/%D8%AF%D9%88%D9%84%D9%8A/%D8%A7%D9%85%D8%B1%D9%8A%D9%83%D8%A7/artc-40d078de",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "\"الموت للجيش الإسرائيلي\" وإحراق سيارات: اعتداء غير عادي ضد عائلة جندي إسرائيلي في الولايات المتحدة",
				"creators": [
					{
						"firstName": "",
						"lastName": "i24NEWS",
						"creatorType": "author"
					}
				],
				"abstractNote": "وقعت حادثة غير عادية في سانت لويس بعد وقت قصير من وصول مواطن أمريكي-إسرائيلي لزيارة عائلته. • تضمنت الإهانات التي تم رشها تهديدات شخصية ومعادية",
				"language": "ar",
				"libraryCatalog": "i24NEWS",
				"publicationTitle": "i24NEWS",
				"shortTitle": "\"الموت للجيش الإسرائيلي\" وإحراق سيارات",
				"url": "https://www.i24news.tv/ar/%D8%A3%D8%AE%D8%A8%D8%A7%D8%B1/%D8%AF%D9%88%D9%84%D9%8A/%D8%A7%D9%85%D8%B1%D9%8A%D9%83%D8%A7/artc-40d078de",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "israel"
					},
					{
						"tag": "israelatwar"
					},
					{
						"tag": "إسرائيل"
					},
					{
						"tag": "إسرائيل / غزة"
					},
					{
						"tag": "الجيش الإسرائيلي"
					},
					{
						"tag": "الولايات المتحدة"
					},
					{
						"tag": "دونالد ترامب"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
