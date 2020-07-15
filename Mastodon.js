{
	"translatorID": "eebd16cb-69ca-4b85-b3e2-7c603dc98562",
	"label": "Mastodon",
	"creator": "febrezo",
	"target": "^https?://(mastodon\\.(social|xyz|cloud)|pawoo\\.net|mastdn.(jp|io)|switter.at)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-15 15:08:26"
}

/*
	Mastodon Translator
	Copyright (C) 2020 Félix Brezo, felixbrezo@gmail.com
	
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
	if ( urlParts.length <= 4 ) {
		return "webpage";
	}	
	return "blogPost";
}

function doWeb(doc, url) {
	var resourceType = detectWeb(doc, url);
	// Creating the item
	var newItem = new Zotero.Item(resourceType);

	var urlParts = url.split('/');
	
	var tmp_date;
	if (resourceType == "blogPost") {
		//Setting common data:
		newItem.blogTitle = ZU.xpathText(doc, "//span[@class='display-name__account']/text()");
		newItem.title = ZU.xpathText(doc, "//meta[@name='description']/@content");	
		tmp_date = ZU.xpathText(doc, '//div[@class="detailed-status__meta"]/data/@value');
	} else {
		var aux = ZU.xpathText(doc, '//div[@class="public-account-bio__extra"]/text()');
		tmp_date = aux.substring(aux.length, aux.length-8);
		newItem.title = ZU.xpathText(doc, "//meta[@property='profile:username']/@content");		
	}

	newItem.websiteTitle = urlParts[2];
	newItem.date = ZU.strToISO(tmp_date);
	var tmp_author = ZU.xpathText(doc, "//strong[@class='display-name__html p-name emojify']");		
	if (tmp_author) {
		newItem.creators.push(ZU.cleanAuthor(tmp_author, "author", false));
	}
	newItem.websiteType = "Microblogging (Mastodon)";
	newItem.url = url;
	
	// Adding the attachment
	newItem.attachments.push({
		title: "Mastodon Snapshot",
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mastodon.social/@febrezo/103715916688810274",
		"items": [
			{
				"itemType": "blogPost",
				"blogTitle": "@febrezo@mastodon.social",
				"title": "He decidit que heu de trobar qui és la persona o cosa que es menja els cables USB-C de casa meva. No sé com ni per què però ara mateix estic sense cables i aixó és desesperant. Tots els que trobo són de tipus USB normals. Havia de dir-ho. #TootSeriós",
				"creators": [
					{
						"firstName": "Félix",
						"lastName": "Brezo",
						"creatorType": "author"
					}
				],
				"date": "2020-02-24",
				"url": "https://mastodon.social/@febrezo/103715916688810274",
				"websiteType": "Microblogging (Mastodon)",
				"attachments": [
					{
						"title": "Mastodon Snapshot",
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
				"title": "febrezo@mastodon.social",
				"creators": [
					{
						"firstName": "Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Félix Brezo, Aussie Rockman, Félix Brezo, Félix Brezo, Panz', Tarik ‍, Félix Brezo, Félix Brezo, Félix",
						"lastName": "Brezo",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"url": "https://mastodon.social/@febrezo",
				"websiteTitle": "mastodon.social",
				"websiteType": "Microblogging (Mastodon)",
				"attachments": [
					{
						"title": "Mastodon Snapshot",
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
