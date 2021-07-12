{
	"translatorID": "eebd16cb-69ca-4b85-b3e2-7c603dc98562",
	"label": "Mastodon",
	"creator": "Félix Brezo (@febrezo)",
	"target": "^https?://(mastodon\\.(social|xyz|cloud)|pawoo\\.net|mastdn.(jp|io)|switter.at)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-02 12:44:10"
}

/*
	Mastodon Translator
	Copyright (C) 2020 Félix Brezo (@febrezo), felixbrezo@disroot.org
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the Affero GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	var urlParts = url.split('/');
	if (urlParts.length <= 4) {
		return "webpage";
	}
	return "blogPost";
}

function doWeb(doc, url) {
	var resourceType = detectWeb(doc, url);
	var newItem = new Zotero.Item(resourceType);

	var tmpAuthor;
	if (resourceType == "blogPost") {
		newItem.title = ZU.xpathText(doc, "//meta[@name='description']/@content").replace(/\n/g, " ").replace(/ +/g, " ");
		newItem.blogTitle = ZU.xpathText(doc, "//a[@class='detailed-status__display-name u-url']/span/span");
		tmpAuthor = ZU.xpathText(doc, "//a[@class='detailed-status__display-name u-url']/span/bdi/strong");
		let tmpDate = ZU.xpathText(doc, "//div[@class='detailed-status detailed-status--flex detailed-status-public']/div/data/@value");
		newItem.date = ZU.strToISO(tmpDate);
	}
	else {
		tmpAuthor = ZU.xpathText(doc, "//h1").split("\n")[1];
		newItem.title = ZU.xpathText(doc, "//h1/small");
	}

	if (tmpAuthor) {
		newItem.creators.push(ZU.cleanAuthor(tmpAuthor, "author", false));
	}
	newItem.websiteType = "Microblogging (Mastodon)";
	newItem.url = url;

	// Adding the attachment
	newItem.attachments.push({
		title: "Snapshot",
		mimeType: "text/html",
		url: url
	});

	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mastodon.social/@febrezo/103715916688810274",
		"items": [
			{
				"itemType": "blogPost",
				"title": "He decidit que heu de trobar qui és la persona o cosa que es menja els cables USB-C de casa meva. No sé com ni per què però ara mateix estic sense cables i aixó és desesperant. Tots els que trobo són de tipus USB normals. Havia de dir-ho. #TootSeriós",
				"creators": [
					{
						"firstName": "Félix",
						"lastName": "Brezo",
						"creatorType": "author"
					}
				],
				"date": "2020-02-24",
				"blogTitle": "@febrezo@mastodon.social",
				"url": "https://mastodon.social/@febrezo/103715916688810274",
				"websiteType": "Microblogging (Mastodon)",
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
		"url": "https://mastodon.social/@febrezo",
		"items": [
			{
				"itemType": "webpage",
				"title": "@febrezo@mastodon.social",
				"creators": [
					{
						"firstName": "Félix",
						"lastName": "Brezo",
						"creatorType": "author"
					}
				],
				"url": "https://mastodon.social/@febrezo",
				"websiteType": "Microblogging (Mastodon)",
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
		"url": "https://mastodon.social/@hhardy01/102739659005327509",
		"items": [
			{
				"itemType": "blogPost",
				"title": "@Gargron How is mastodon.social a \"viable publishing platform\" when we can only post about 88 words?",
				"creators": [
					{
						"firstName": "Henry Edward",
						"lastName": "Hardy",
						"creatorType": "author"
					}
				],
				"date": "2019-09-05",
				"blogTitle": "@hhardy01@mastodon.social",
				"url": "https://mastodon.social/@hhardy01/102739659005327509",
				"websiteType": "Microblogging (Mastodon)",
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
		"url": "https://mastodon.xyz/@TheKinrar/104242749499971289",
		"items": [
			{
				"itemType": "blogPost",
				"title": "J'ai setup une partie des rDNS pour AS213318, ça fait de jolis traceroute ! :D",
				"creators": [
					{
						"firstName": "",
						"lastName": "TheKinrar",
						"creatorType": "author"
					}
				],
				"blogTitle": "@TheKinrar@mastodon.xyz",
				"shortTitle": "J'ai setup une partie des rDNS pour AS213318, ça fait de jolis traceroute !",
				"url": "https://mastodon.xyz/@TheKinrar/104242749499971289",
				"websiteType": "Microblogging (Mastodon)",
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
		"url": "https://switter.at/@switter/99815934036860170",
		"items": [
			{
				"itemType": "blogPost",
				"title": "When making a listing PLEASE MAKE SURE: - you use the hashtag #swlisting - you list your location - you list your contact info **MAKE SURE THESE ARE ON SEPARATE LINES** Here is an example: Taking incalls today! And I’m with the delightful @ellethorn for doubles 😉 Book in now! Location: Canberra, Australia Contact: 0404864006 #swlisting",
				"creators": [
					{
						"firstName": "",
						"lastName": "Switter",
						"creatorType": "author"
					}
				],
				"date": "2018-04-07",
				"blogTitle": "@switter@switter.at",
				"shortTitle": "When making a listing PLEASE MAKE SURE",
				"url": "https://switter.at/@switter/99815934036860170",
				"websiteType": "Microblogging (Mastodon)",
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
