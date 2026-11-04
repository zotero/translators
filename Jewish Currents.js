{
	"translatorID": "ed0f98de-4f89-498b-b8a8-b65fd674a3ac",
	"label": "Jewish Currents",
	"creator": "Abe Jellinek",
	"target": "^https://jewishcurrents\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-11-06 20:27:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Abe Jellinek

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
	if (doc.querySelector('input#link')) {
		if (doc.querySelector('#content .mag-container')) {
			return 'magazineArticle';
		}
		else {
			return 'blogPost';
		}
	}
	else if (doc.querySelector('audio#podcast')) {
		return 'podcast';
	}
	else if (url.includes('/results') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.flex[href]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, ':scope .font-display span')); // Bad!
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
	let itemType;
	let issue;
	if (doc.querySelector('#content .mag-container')) {
		itemType = 'magazineArticle';
		issue = text(doc.querySelector('#content .mag-container').parentElement, 'a[href*="/issue/"]');
	}
	else if (doc.querySelector('audio#podcast')) {
		itemType = 'podcast';
	}
	else {
		itemType = 'blogPost';
		issue = '';
	}

	let item = new Zotero.Item(itemType);
	item.title = doc.title;
	item.date = ZU.strToISO(text(doc, '.feature .absolute')); // Bad!
	item.issue = issue;
	item.section = text(doc, '#content a[href*="/category/"]')
	item.publicationTitle = 'Jewish Currents';
	item.url = attr(doc, 'meta[property="og:url"]', 'content');

	if (itemType == 'podcast') {
		item.seriesTitle = 'On the Nose';
		item.runningTime = text(doc, '.podcasts .total');
	}

	let authors = doc.querySelectorAll('.lockup a[href*="/author/"]');
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
	}

	if (itemType == 'podcast') {
		item.abstractNote = text(doc, '.bodytext');
		item.attachments.push({
			title: 'Episode Link',
			mimeType: 'text/html',
			url,
			snapshot: false
		});
	}
	else {
		item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
		item.attachments.push({
			title: 'Snapshot',
			mimeType: 'text/html',
			document: doc
		});
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jewishcurrents.org/the-right-to-grieve",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Right to Grieve",
				"creators": [
					{
						"firstName": "Erik",
						"lastName": "Baker",
						"creatorType": "author"
					}
				],
				"date": "2023-03-13",
				"abstractNote": "To demand the freedom to mourn—not on the employer’s schedule, but in our own time—is to reject the cruel rhythms of the capitalist status quo.",
				"issue": "Winter 2022",
				"libraryCatalog": "Jewish Currents",
				"publicationTitle": "Jewish Currents",
				"url": "https://jewishcurrents.org/the-right-to-grieve",
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
		"url": "https://jewishcurrents.org/the-fight-for-the-future-of-israel-studies",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Fight for the Future of Israel Studies",
				"creators": [
					{
						"firstName": "Mari",
						"lastName": "Cohen",
						"creatorType": "author"
					}
				],
				"date": "2022-09-28",
				"abstractNote": "Donors view Israel studies as a vehicle for countering Palestine activism on campus. But many of the scholars they fund don’t toe the line.",
				"issue": "Summer 2022",
				"libraryCatalog": "Jewish Currents",
				"publicationTitle": "Jewish Currents",
				"url": "https://jewishcurrents.org/the-fight-for-the-future-of-israel-studies",
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
		"url": "https://jewishcurrents.org/remembering-khalil-abu-yahia",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Remembering Khalil Abu Yahia",
				"creators": [
					{
						"firstName": "Maya",
						"lastName": "Rosen",
						"creatorType": "author"
					},
					{
						"firstName": "Erez",
						"lastName": "Bleicher",
						"creatorType": "author"
					}
				],
				"abstractNote": "The Gazan scholar and activist, who was killed in an Israeli airstrike last month, believed in the radical potential of solidarity.",
				"blogTitle": "Jewish Currents",
				"url": "https://jewishcurrents.org/remembering-khalil-abu-yahia",
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
		"url": "https://jewishcurrents.org/results?query=oppenheimer",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jewishcurrents.org/the-jewishness-of-oppenheimer",
		"items": [
			{
				"itemType": "podcast",
				"title": "The Jewishness of Oppenheimer",
				"creators": [],
				"abstractNote": "Oppenheimer, Christopher Nolan’s acclaimed new biopic about the physicist who oversaw the invention of the atomic bomb, is the rare mass-market feature film that depicts the complexities of the US left during and after World War II. As the movie shows, J. Robert Oppenheimer was closely affiliated with Communists in his early life; his forays into left-wing politics included sending funds to the Spanish Republicans through the Communist Party. These relationships and activities eventually led to Oppenheimer losing his security clearance during the second Red Scare, and the hearing where this occurs is central to the film. Throughout the narrative, Oppenheimer explores its subject’s Jewishness, which shapes his position in relation to both Communism and Nazism. Nolan also exhibits the Jewishness of Oppenheimer’s political and intellectual milieu—which includes Lewis Strauss, the conservative Jewish politician who foments the physicist’s downfall.\nOn this week’s episode of On the Nose, presented in partnership with The Nation’s podcast The Time of Monsters, Jewish Currents associate editor Mari Cohen speaks with contributing editor David Klion, contributing writer Raphael Magarik, and The Nation national affairs correspondent Jeet Heer about the ways Oppenheimer illuminates and obfuscates the history it examines.\nThanks to Jesse Brenneman for producing and to Nathan Salsburg for the use of his song “VIII (All That Were Calculated Have Passed).”\nTexts and Films Mentioned:\n“Oppenheimer Is an Uncomfortably Timely Tale of Destruction,” David Klion, The New Republic\nReds, directed by Warren BeatyAmadeus, directed by Miloš Forman \nHamilton by Lin-Manuel Miranda\n“Nolan’s Oppenheimer treats New Mexico as a blank canvas,” Kelsey D. Atherton, Source NM\nAmerican Prometheus by Kai Bird and Martin J. Sherwin\nFrankenstein; or, The Modern Prometheus by Mary Shelley\nBarbie, directed by Greta Gerwig\n“Holy Sonnet XIV” by John Donne",
				"runningTime": "47:05",
				"seriesTitle": "On the Nose",
				"url": "https://jewishcurrents.org/the-jewishness-of-oppenheimer",
				"attachments": [
					{
						"title": "Episode Link",
						"mimeType": "text/html",
						"snapshot": false
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
