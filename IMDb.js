{
	"translatorID": "a30274ac-d3d1-4977-80f4-5320613226ec",
	"label": "IMDb",
	"creator": "Philipp Zumstien and Abe Jellinek",
	"target": "^https?://www\\.imdb\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-31 22:02:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Philipp Zumstein and Abe Jellinek

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
	if (url.includes('/title/tt') && doc.querySelector('script[type="application/ld+json"]')) {
		let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
		if (json['@type'] == 'TVEpisode') {
			return 'tvBroadcast';
		}
		else {
			return "film";
		}
	}
	else if (url.includes('/find?') && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//td[contains(@class, "result_text")]');
	for (let i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './a/@href');
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, _url) {
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	var item = new Zotero.Item(
		json['@type'] == 'TVEpisode'
			? 'tvBroadcast'
			: 'film');

	let title = json.name;
	if (title.includes("&apos;")) {
		title = title.replace("&apos;", "'");
	}

	item.title = title; // note that json only has the original title
	var transTitle = ZU.trimInternal(ZU.xpathText(doc, "//h1//text()"));
	if (transTitle && transTitle !== item.title) addExtra(item, "Translated title: " + transTitle);

	item.programTitle = doc.title.match(/(?:"([^"]+)")?/)[1];
	let episodeNumberParts = doc.querySelectorAll('[class*="EpisodeNavigationForTVEpisode__SeasonEpisodeNumbersItem"]');
	item.episodeNumber = [...episodeNumberParts].map(el => el.textContent.trim()).join(' ');

	item.date = json.datePublished;
	item.runningTime = "duration" in json ? json.duration.replace("PT", "").toLowerCase() : "";
	item.genre = Array.isArray(json.genre) ? json.genre.join(", ") : json.genre;
	item.abstractNote = json.description;
	var creatorsMapping = {
		director: "director",
		creator: "scriptwriter",
		actor: ZU.fieldIsValidForType("castMember", item.itemType)
			? "castMember"
			: "contributor"
	};
	for (var role in creatorsMapping) {
		if (!json[role]) continue;
		var creators = json[role];
		if (!Array.isArray(creators)) {
			item.creators.push(ZU.cleanAuthor(creators.name, creatorsMapping[role]));
		}
		else {
			for (var i = 0; i < creators.length; i++) {
				if (creators[i]["@type"] == "Person") item.creators.push(ZU.cleanAuthor(creators[i].name, creatorsMapping[role]));
			}
		}
	}
	let companyNodes = doc.querySelectorAll('a[href*="/company/"]');
	let companies = [];
	for (let company of companyNodes) {
		companies.push(company.textContent);
	}
	item.distributor = companies.join(', ');
	var pageId = attr(doc, 'meta[property="imdb:pageConst"]', 'content');
	if (pageId) {
		addExtra(item, "IMDb ID: " + pageId);
	}
	let locationLinks = doc.querySelectorAll('a[href*="title/?country_of_origin"]');
	addExtra(item, "event-location: "
		+ [...locationLinks].map(a => a.innerText).join(', '));
	item.tags = "keywords" in json ? json.keywords.split(",") : [];
	item.complete();
}

function addExtra(item, value) {
	if (!item.extra) {
		item.extra = '';
	}
	else {
		item.extra += "\n";
	}
	item.extra += value;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt0089276/",
		"items": [
			{
				"itemType": "film",
				"title": "La historia oficial",
				"creators": [
					{
						"firstName": "Luis",
						"lastName": "Puenzo",
						"creatorType": "director"
					},
					{
						"firstName": "Aída",
						"lastName": "Bortnik",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Luis",
						"lastName": "Puenzo",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Norma",
						"lastName": "Aleandro",
						"creatorType": "contributor"
					},
					{
						"firstName": "Héctor",
						"lastName": "Alterio",
						"creatorType": "contributor"
					},
					{
						"firstName": "Chunchuna",
						"lastName": "Villafañe",
						"creatorType": "contributor"
					}
				],
				"date": "1985-11-08",
				"abstractNote": "During the final months of Argentinian Military Dictatorship in 1983, a high school teacher sets out to find out who the mother of her adopted daughter is.",
				"distributor": "Historias Cinematograficas, Progress Communications",
				"extra": "Translated title: The Official Story\nIMDb ID: tt0089276\nevent-location: Argentina",
				"genre": "Drama, History",
				"libraryCatalog": "IMDb",
				"runningTime": "1h52m",
				"attachments": [],
				"tags": [
					{
						"tag": "bigotry"
					},
					{
						"tag": "military"
					},
					{
						"tag": "military junta"
					},
					{
						"tag": "teacher"
					},
					{
						"tag": "torture victim"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/find?q=shakespeare&s=tt",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt0060613/",
		"items": [
			{
				"itemType": "film",
				"title": "Käpy selän alla",
				"creators": [
					{
						"firstName": "Mikko",
						"lastName": "Niskanen",
						"creatorType": "director"
					},
					{
						"firstName": "Robert",
						"lastName": "Alfthan",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Marja-Leena",
						"lastName": "Mikkola",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Eero",
						"lastName": "Melasniemi",
						"creatorType": "contributor"
					},
					{
						"firstName": "Kristiina",
						"lastName": "Halkola",
						"creatorType": "contributor"
					},
					{
						"firstName": "Pekka",
						"lastName": "Autiovuori",
						"creatorType": "contributor"
					}
				],
				"date": "1966-10-21",
				"abstractNote": "Two student couples go camping in the Finnish countryside; partner swapping and interpersonal dynamics - with a touch of their philosophy - between them all arise.",
				"distributor": "FJ-Filmi",
				"extra": "IMDb ID: tt0060613\nevent-location: Finland",
				"genre": "Drama",
				"libraryCatalog": "IMDb",
				"runningTime": "1h29m",
				"attachments": [],
				"tags": [
					{
						"tag": "countryside"
					},
					{
						"tag": "dance"
					},
					{
						"tag": "female topless nudity"
					},
					{
						"tag": "film star"
					},
					{
						"tag": "snakebite"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt6142646/",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "Islands",
				"creators": [
					{
						"firstName": "Elizabeth",
						"lastName": "White",
						"creatorType": "director"
					},
					{
						"firstName": "David",
						"lastName": "Attenborough",
						"creatorType": "contributor"
					},
					{
						"firstName": "Pete",
						"lastName": "McCowen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Jerome",
						"lastName": "Poncet",
						"creatorType": "contributor"
					}
				],
				"date": "2017-02-18",
				"abstractNote": "Wildlife documentary series with David Attenborough, beginning with a look at the remote islands which offer sanctuary to some of the planet&apos;s rarest creatures.",
				"extra": "IMDb ID: tt6142646\nevent-location: United Kingdom",
				"libraryCatalog": "IMDb",
				"programTitle": "Planet Earth II",
				"runningTime": "51m",
				"attachments": [],
				"tags": [
					{
						"tag": "documentary episode"
					},
					{
						"tag": "earth"
					},
					{
						"tag": "impossible"
					},
					{
						"tag": "impressed"
					},
					{
						"tag": "planet"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt9060452/?ref_=ttep_ep7",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "That's a Wrap",
				"creators": [
					{
						"firstName": "Alex",
						"lastName": "Hall",
						"creatorType": "director"
					},
					{
						"firstName": "George",
						"lastName": "Pelecanos",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "David",
						"lastName": "Simon",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Will",
						"lastName": "Ralston",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "James",
						"lastName": "Franco",
						"creatorType": "contributor"
					},
					{
						"firstName": "Maggie",
						"lastName": "Gyllenhaal",
						"creatorType": "contributor"
					},
					{
						"firstName": "Chris",
						"lastName": "Bauer",
						"creatorType": "contributor"
					}
				],
				"date": "2019-10-21",
				"abstractNote": "A struggling Lori turns to Candy for help before revisiting The Deuce; Candy makes a deal to secure funding for her film; Abby takes a stand against the latest phase of Midtown redevelopment; Tommy explains the new world order to ...",
				"extra": "IMDb ID: tt9060452\nevent-location: United States",
				"libraryCatalog": "IMDb",
				"programTitle": "The Deuce",
				"runningTime": "1h5m",
				"attachments": [],
				"tags": [
					{
						"tag": "greyhound bus"
					},
					{
						"tag": "minneapolis saint paul minnesota"
					},
					{
						"tag": "redevelopment"
					},
					{
						"tag": "twin cities minnesota"
					},
					{
						"tag": "yellow cab"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt0759475/?ref_=fn_al_tt_5",
		"items": [
			{
				"itemType": "film",
				"title": "'Til Death",
				"creators": [
					{
						"firstName": "Josh",
						"lastName": "Goldsmith",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Cathy",
						"lastName": "Yuspa",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Brad",
						"lastName": "Garrett",
						"creatorType": "contributor"
					},
					{
						"firstName": "Joely",
						"lastName": "Fisher",
						"creatorType": "contributor"
					},
					{
						"firstName": "Kat",
						"lastName": "Foster",
						"creatorType": "contributor"
					}
				],
				"date": "2006-09-07",
				"abstractNote": "A pair of newlyweds move in next door to a veteran married couple of 25 years.",
				"distributor": "Impact Zone Productions, Sony Pictures Television",
				"extra": "IMDb ID: tt0759475\nevent-location: United States",
				"genre": "Comedy, Romance",
				"libraryCatalog": "IMDb",
				"attachments": [],
				"tags": [
					{
						"tag": "big breasts"
					},
					{
						"tag": "breast"
					},
					{
						"tag": "brother brother relationship"
					},
					{
						"tag": "columbia tristar"
					},
					{
						"tag": "death in title"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt0759475/?ref_=fn_al_tt_5",
		"items": [
			{
				"itemType": "film",
				"title": "'Til Death",
				"creators": [
					{
						"firstName": "Josh",
						"lastName": "Goldsmith",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Cathy",
						"lastName": "Yuspa",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Brad",
						"lastName": "Garrett",
						"creatorType": "contributor"
					},
					{
						"firstName": "Joely",
						"lastName": "Fisher",
						"creatorType": "contributor"
					},
					{
						"firstName": "Kat",
						"lastName": "Foster",
						"creatorType": "contributor"
					}
				],
				"date": "2006-09-07",
				"abstractNote": "A pair of newlyweds move in next door to a veteran married couple of 25 years.",
				"distributor": "Impact Zone Productions, Sony Pictures Television",
				"extra": "IMDb ID: tt0759475\nevent-location: United States",
				"genre": "Comedy, Romance",
				"libraryCatalog": "IMDb",
				"attachments": [],
				"tags": [
					{
						"tag": "big breasts"
					},
					{
						"tag": "breast"
					},
					{
						"tag": "brother brother relationship"
					},
					{
						"tag": "columbia tristar"
					},
					{
						"tag": "death in title"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.imdb.com/title/tt19402762/?ref_=tt_eps_top",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "Seventeen Seconds",
				"creators": [
					{
						"firstName": "Jonathan",
						"lastName": "Frakes",
						"creatorType": "director"
					},
					{
						"firstName": "Jane",
						"lastName": "Maggs",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Cindy",
						"lastName": "Appel",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Akiva",
						"lastName": "Goldsman",
						"creatorType": "scriptwriter"
					},
					{
						"firstName": "Patrick",
						"lastName": "Stewart",
						"creatorType": "contributor"
					},
					{
						"firstName": "Jeri",
						"lastName": "Ryan",
						"creatorType": "contributor"
					},
					{
						"firstName": "Michelle",
						"lastName": "Hurd",
						"creatorType": "contributor"
					}
				],
				"date": "2023-03-02",
				"abstractNote": "Picard grapples with a life-altering revelation as the crew of the Titan attempt to outmaneuver Vadic, while Raffi and Worf uncover a plot by a vengeful enemy.",
				"extra": "IMDb ID: tt19402762\nevent-location:",
				"libraryCatalog": "IMDb",
				"programTitle": "Star Trek: Picard",
				"runningTime": "56m",
				"attachments": [],
				"tags": [
					{
						"tag": "bar"
					},
					{
						"tag": "female medical doctor"
					},
					{
						"tag": "human in outer space"
					},
					{
						"tag": "nebula"
					},
					{
						"tag": "starship"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
