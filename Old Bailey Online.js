{
	"translatorID": "b10bf941-12e9-4188-be04-f6357fa594a0",
	"label": "Old Bailey Online",
	"creator": "Sharon Howard and Adam Crymble",
	"target": "^https?://www\\.oldbaileyonline\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-15 13:03:34"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2024 Sharon Howard
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

/* new URLs
// trial report: /record/t18000115-12 [case]
// OA: /record/OA16760705 [book]
// session: /record/16740429 [book]
// other div types /record/[afso - anything else?] [book section might work for these]
// api: https://www.dhi.ac.uk/api/data/oldbailey_record_single?idkey=t17210419-18
*/

function detectWeb(doc, url) {
	if (url.includes('/record/t')) {
		return "case";
	}
	else if (url.includes('/record/1')) {
		return "book";
	}
	else if (url.includes('/record/OA')) {
		return "book";

	// multiples are not doable at present
	//	} else if (url.includes('/search/') && getSearchResults(doc, true)) {
	//		return 'multiple';
	//	}
	}
	return false;
}

/* may be possible to reinstate this in the longer term but not at present.
function getSearchResults(doc, checkOnly) {
	// have to use api endpoint. https://www.dhi.ac.uk/api/data/oldbailey_record?(query string)
	// several types of search seem not to be accessible via the api (statistics, OAs, associated records)
	// keyword and name searches need to be able to handle any Proceedings div type, not just trials
	//	(may be doable, but much more complicated code)
}*/

async function doWeb(doc, url) {
	var item = new Zotero.Item();

	let rgx = /(\bt1[^-]+-[0-9]+[a-z]?|OA1[0-9]+[a-z]?|\b1[0-9]{7}[AE]?$)/;
	let id = url.match(rgx)[0];

	let jsonURL = `https://www.dhi.ac.uk/api/data/oldbailey_record_single?idkey=${id}`;
	let json = (await requestJSON(jsonURL)).hits.hits[0]._source;

	let metadata = json.metadata;
	let mParsed = new DOMParser().parseFromString(metadata, 'text/html');
	let mTable = mParsed.querySelector("table");

	// "Date" works for session, t and OA
	let niceDate = ZU.xpathText(mTable, '//tr[contains(th, "Date")]/td[1]');

	// text type
	let textType = ZU.xpathText(mTable, '//tr[contains(th, "Text type")]/td[1]');

	if (url.includes('/record/t1')) {
		item.itemType = "case";
		
		var sessDate = id.substring(1, 5) + "/" + id.substring(5, 7) + "/" + id.substring(7, 9);
	
		// names for trial defendants.
		var names = ZU.xpathText(mTable, '//tr[contains(th, "Defendant")]/td[1]');
		var namesCleaned = ZU.capitalizeTitle(names.toLowerCase(), true);

		var offencesList = ZU.xpathText(mTable, '//tr[contains(th, "Offences")]/td[1]');
		var offences = ZU.xpath(mTable, '//tr[contains(th, "Offences")]/td[1]/a');
		for (let o of offences) {
			item.tags.push(o.textContent);
		}

		var verdicts = ZU.xpath(mTable, '//tr[contains(th, "Verdicts")]/td[1]/a');
		for (let v of verdicts) {
			item.tags.push(v.textContent);
		}

		var sentences = ZU.xpath(mTable, '//tr[contains(th, "Punishments")]/td[1]/a');
		for (let s of sentences) {
			item.tags.push(s.textContent);
		}

		var itemTitle = "Trial of " + namesCleaned + ": " + offencesList + ", " + niceDate;
		item.title = itemTitle;
		item.date = ZU.strToISO(sessDate);
		item.docketNumber = json.idkey;
		item.court = "Central Criminal Court, London";
	}
	
	else if (url.includes('record/OA1')) {
		item.itemType = "book";
		
		var oaDate = id.substring(2, 6) + "/" + id.substring(6, 8) + "/" + id.substring(8, 10);
		var oaTitle = textType + ", " + niceDate;

		item.date = ZU.strToISO(oaDate);
		item.title = oaTitle;
	}

	else if (url.includes('record/1')) {
		item.itemType = "book";

		var sessionDate = id.substring(0, 4) + "/" + id.substring(4, 6) + "/" + id.substring(6, 8);
		var sessionTitle = textType + ", " + niceDate;

		item.date = ZU.strToISO(sessionDate);
		item.title = sessionTitle;
	}

	item.extra = "Reference Number: " + json.idkey;

	item.url = url;
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/record/OA17110421",
		"items": [
			{
				"itemType": "book",
				"title": "Ordinary's Account, 21st April 1711",
				"creators": [],
				"date": "1711-04-21",
				"extra": "Reference Number: OA17110421",
				"libraryCatalog": "Old Bailey Online",
				"url": "https://www.oldbaileyonline.org/record/OA17110421",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/record/16740429",
		"items": [
			{
				"itemType": "book",
				"title": "Sessions paper, 29th April 1674",
				"creators": [],
				"date": "1674-04-29",
				"extra": "Reference Number: 16740429",
				"libraryCatalog": "Old Bailey Online",
				"url": "https://www.oldbaileyonline.org/record/16740429",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/record/t18000115-12",
		"items": [
			{
				"itemType": "case",
				"caseName": "Trial of Peter Asterbawd, Andrew Forsman: Theft > Burglary, 15th January 1800",
				"creators": [],
				"dateDecided": "1800-01-15",
				"court": "Central Criminal Court, London",
				"docketNumber": "t18000115-12",
				"extra": "Reference Number: t18000115-12",
				"shortTitle": "Trial of Peter Asterbawd, Andrew Forsman",
				"url": "https://www.oldbaileyonline.org/record/t18000115-12",
				"attachments": [],
				"tags": [
					{
						"tag": "Burglary"
					},
					{
						"tag": "Fine"
					},
					{
						"tag": "Guilty"
					},
					{
						"tag": "House of correction"
					},
					{
						"tag": "Imprisonment"
					},
					{
						"tag": "Lesser offence"
					},
					{
						"tag": "Miscellaneous Punishment"
					},
					{
						"tag": "Not guilty"
					},
					{
						"tag": "Theft"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/record/t17340911-7",
		"items": [
			{
				"itemType": "case",
				"caseName": "Trial of Judith Cupid: Theft > Theft from place, 11th September 1734",
				"creators": [],
				"dateDecided": "1734-09-11",
				"court": "Central Criminal Court, London",
				"docketNumber": "t17340911-7",
				"extra": "Reference Number: t17340911-7",
				"shortTitle": "Trial of Judith Cupid",
				"url": "https://www.oldbaileyonline.org/record/t17340911-7",
				"attachments": [],
				"tags": [
					{
						"tag": "Guilty"
					},
					{
						"tag": "Theft"
					},
					{
						"tag": "Theft from place"
					},
					{
						"tag": "Theft under 40s"
					},
					{
						"tag": "Transportation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/record/16810117A",
		"items": [
			{
				"itemType": "book",
				"title": "Sessions paper, 17th January 1681",
				"creators": [],
				"date": "1681-01-17",
				"extra": "Reference Number: 16810117A",
				"libraryCatalog": "Old Bailey Online",
				"url": "https://www.oldbaileyonline.org/record/16810117A",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oldbaileyonline.org/record/OA16850506A",
		"items": [
			{
				"itemType": "book",
				"title": "Ordinary's Account, 6th May 1685",
				"creators": [],
				"date": "1685-05-06",
				"extra": "Reference Number: OA16850506",
				"libraryCatalog": "Old Bailey Online",
				"url": "https://www.oldbaileyonline.org/record/OA16850506A",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
