{
	"translatorID": "6f5cd8d6-0de9-4d61-9e62-50c078c6dfd3",
	"label": "wetten.overheid.nl",
	"creator": "Casper van Wetten",
	"target": "^https?://wetten\\.overheid\\.nl/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-20 15:33:44"
}

	/*
	***** BEGIN LICENSE BLOCK *****

	InView Essentials Translator, Copyright © 2023 Casper van Wetten
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
	if (url.includes("wetten.overheid.nl/BWBR")) {
		return "statute";
	}
	return false;
}

function doWeb(doc, url) {
	var metaUrl = url.match(/https?:\/\/wetten.overheid.nl\/BWBR[0-9]*\/[0-9]{4}-[0-9]{2}-[0-9]{2}/)[0] + "/0/informatie"; 
	ZU.doGet(metaUrl, scrape)
}

function scrape(respString, respObject, url) {
	var newItem = new Zotero.Item("statute");
	var parsed = stringToHtml(respString)
	
	// Get the easy stuff
	newItem.dateEnacted = url.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)[0];
	newItem.url = url.replace(/.{13}$/, '')

	// The title can vary
	var title = parsed.getElementsByTagName("h1")[0].textContent
	// Statues ending in "wet" or in "book" shoudl have different definitive articles
	if (title.match(/W?w?et$/)) {title = "de " + title}
	if (title.match(/B?b?oek ?\d?$/)) {title = "het " + title}
	// The "Burgerlijke wetboeken" have a specific phrasiing to them, this fixes that
	if (title.match(/Burgerlijk/)) { title = title.replace(/(.*)(\sBoek \d+)/, "$2 van $1");}
	newItem.title = title


	//If there is a short title, go and get it
	var shortTitles = parsed.querySelectorAll("td[data-before='Afkortingen'], td[data-before='Afkorting']")
	if (shortTitles[0].textContent != "Geen") { 
		if (shortTitles[0].textContent == "BW") {newItem.shortTitle = shortTitles[2].textContent}
		else 									{newItem.shortTitle = shortTitles[0].textContent} //The "Burgerlijk Wetboeken" have the same initial short title (BW), but the third short title (like BW5) is the one we want
	}	

	//Get the code
	newItem.code = parsed.querySelector("td[data-before='Identificatienummer']").textContent

	//Get the law field as tags
	let tagArray = []
	tags = parsed.querySelectorAll("td[data-before='Rechtsgebied']")
	if (tags.length == 0) {tags = parsed.querySelectorAll("td[data-before='Rechtsgebieden']")}
	for (let tag of tags){
		if (tag.textContent.includes('|')) {
			for (tag of tag.textContent.split('|').map(tag => tag.trim())){
				if (!tagArray.includes(tag)) {tagArray.push(tag)} 
			}		
		}
		else {if (!tagArray.includes(tag)) {tagArray.push(tag)} }
	}
	newItem.tags = tagArray

	//Get law-family
	var li = parsed.getElementById("Wetsfamilie").nextElementSibling.getElementsByTagName("li")
	var seeAlso = []
	for (var i = 0; i < li.length; i++) {
		if (li[i].textContent != parsed.getElementsByTagName("h1")[0].textContent) {
			seeAlso.push(li[i].textContent);
		}
	}
	newItem.seeAlso = seeAlso


	//Finish the item
	newItem.complete()
}


function stringToHtml(str) {
	var parser = new DOMParser();
	var doc = parser.parseFromString(str, 'text/html');
	return doc;
};
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0044773/2022-07-15",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Besluit kansspelen op afstand",
				"creators": [],
				"dateEnacted": "2022-07-15",
				"code": "BWBR0044773",
				"url": "https://wetten.overheid.nl/BWBR0044773/2022-07-15",
				"attachments": [],
				"tags": [
					{
						"tag": "Bank- en effectenrecht, financiering"
					},
					{
						"tag": "Toezicht bank- en kredietwezen"
					}
				],
				"notes": [],
				"seeAlso": [
					"Wet justitiële en strafvorderlijke gegevens",
					"Wet op de kansspelen",
					"Wet politiegegevens",
					"Wet ter voorkoming van witwassen en financieren van terrorisme"
				]
			}
		]
	},
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0002656/2023-07-01",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Boek 1 van het Burgerlijk Wetboek",
				"creators": [],
				"dateEnacted": "2023-07-01",
				"code": "BWBR0002656",
				"shortTitle": "BW1",
				"url": "https://wetten.overheid.nl/BWBR0002656/2023-07-01",
				"attachments": [],
				"tags": [
					{
						"tag": "Familierecht"
					},
					{
						"tag": "Personen- en familierecht"
					},
					{
						"tag": "Personenrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0001840/2023-02-22",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "de Grondwet",
				"creators": [],
				"dateEnacted": "2023-02-22",
				"code": "BWBR0001840",
				"shortTitle": "GW",
				"url": "https://wetten.overheid.nl/BWBR0001840/2023-02-22",
				"attachments": [],
				"tags": [
					{
						"tag": "Staats- en bestuursrecht"
					},
					{
						"tag": "Staatsrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0005288/2023-05-01/0#Boek5_Titeldeel6_Artikel83",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Boek 5 van het Burgerlijk Wetboek",
				"creators": [],
				"dateEnacted": "2023-05-01",
				"code": "BWBR0005288",
				"shortTitle": "BW5",
				"url": "https://wetten.overheid.nl/BWBR0005288/2023-05-01",
				"attachments": [],
				"tags": [
					{
						"tag": "Eigendomsrecht"
					},
					{
						"tag": "Goederenrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0032203/2022-03-02/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Aanbestedingswet 2012",
				"creators": [],
				"dateEnacted": "2022-03-02",
				"code": "BWBR0032203",
				"shortTitle": "AanbW 2012",
				"url": "https://wetten.overheid.nl/BWBR0032203/2022-03-02",
				"attachments": [],
				"tags": [
					{
						"tag": "Contracten, schade en aansprakelijkheid"
					},
					{
						"tag": "Verbintenissenrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wetten.overheid.nl/BWBR0032898/2019-04-18/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Aanbestedingswet op defensie- en veiligheidsgebied",
				"creators": [],
				"dateEnacted": "2019-04-18",
				"code": "BWBR0032898",
				"url": "https://wetten.overheid.nl/BWBR0032898/2019-04-18",
				"attachments": [],
				"tags": [
					{
						"tag": "Contracten, schade en aansprakelijkheid"
					},
					{
						"tag": "Verbintenissenrecht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
