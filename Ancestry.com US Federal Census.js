{
	"translatorID": "0dda3f89-15de-4479-987f-cc13f1ba7999",
	"label": "Ancestry.com US Federal Census",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?ancestry\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcibv",
	"lastUpdated": "2021-07-22 19:20:28"
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
	if (text(doc, '.pageTitle .pageIntro a').includes('United States Federal Census')) {
		return "bookSection";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	let item = new Zotero.Item('bookSection');
	
	item.title = text(doc, '.pageTitle span');
	let [date, place, roll, page] = doc.querySelectorAll('.sourceText em'); // not ideal
	item.bookTitle = text(doc, '.pageTitle .pageIntro a').trim()
		+ ` [${place.textContent}]`;
	item.publisher = 'National Archives and Records Administration';
	// technically the Census is published 72 years after it's taken, but citing
	// that way doesn't seem to be the convention.
	item.date = date.textContent;
	item.pages = `${page.textContent} (roll ${roll.textContent})`;
	item.archive = 'Ancestry.com';
	item.url = url.replace(/[?#].*/, '');
	
	let recordTable = doc.querySelector('#recordServiceData');
	if (recordTable) {
		recordTable = recordTable.cloneNode(true);
		
		let familyMembers = recordTable.querySelector('.tableContainerRow');
		if (familyMembers) familyMembers.remove();
		
		item.notes.push({
			note: ZU.trimInternal(recordTable.outerHTML)
		});
	}

	let imageSrc = attr(doc, '.photo.clickable img', 'src');
	let dbId = imageSrc.match(/\/namespaces\/([^/]+)/)[1];
	let imageId = imageSrc.match(/([^/]+)\.jpg/)[1];
	ZU.doGet(
		`/imageviewer/api/media/token?dbId=${dbId}&imageId=${imageId}`,
		function (respText) {
			try {
				let json = JSON.parse(respText);
				item.attachments.push({
					title: 'Census Record',
					mimeType: 'image/jpeg',
					url: json.imageDownloadUrl
				});
				item.complete();
			}
			catch (_) {
				item.complete(); // whatever, this is fragile
			}
		}
	);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ancestry.com/discoveryui-content/view/131479739:2442?tid=&pid=&queryId=2a5ea51171527460c8a3755eb4b3fc1e&_phsrc=BYN5&_phstart=successSource",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Albert Einstein",
				"creators": [],
				"date": "1940",
				"archive": "Ancestry.com",
				"bookTitle": "1940 United States Federal Census [Princeton, Mercer, New Jersey]",
				"libraryCatalog": "Ancestry.com US Federal Census",
				"pages": "10B (roll m-t0627-02357)",
				"publisher": "National Archives and Records Administration",
				"url": "https://www.ancestry.com/discoveryui-content/view/131479739:2442",
				"attachments": [
					{
						"title": "Census Record",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<table id=\"recordServiceData\" class=\"table tableHorizontal tableHorizontalRuled\"> <tbody> <tr> <th>Name:</th> <td> Albert Einstein </td> </tr> <tr> <th>Respondent:</th> <td> Yes </td> </tr> <tr> <th>Age:</th> <td> 61 </td> </tr> <tr> <th>Estimated Birth Year:</th> <td> <span class=\"srchHit\"> <span title=\"Alternate values for this record\" class=\"altValue\">[abt 1879]</span> </span> <span title=\"This value was member submitted. Click to see details.\" class=\"altValue\"> [<button class=\"link correction\" data-tracking-event=\"content : correction clicked\">14 Mar 1879</button>] </span> </td> </tr> <tr> <th>Gender:</th> <td> Male </td> </tr> <tr> <th>Race:</th> <td> White </td> </tr> <tr> <th>Birthplace:</th> <td> Germany </td> </tr> <tr> <th>Marital Status:</th> <td> Widowed </td> </tr> <tr> <th>Relation to Head of House:</th> <td> Head </td> </tr> <tr> <th>Home in 1940:</th> <td> Princeton, Mercer, New Jersey </td> </tr> <tr> <th>Map of Home in 1940:</th> <td> <button type=\"button\" title=\"View map\" class=\"link mapLink\" data-modal-title=\"Princeton, Mercer, New Jersey\" data-place-names=\"Princeton,Mercer,New Jersey\" data-tracking-event=\"content : map link clicked\">Princeton, Mercer, New Jersey</button> </td> </tr> <tr> <th>Street:</th> <td> Mercer - Street </td> </tr> <tr> <th>House Number:</th> <td> 112 </td> </tr> <tr> <th>Farm:</th> <td> No </td> </tr> <tr> <th>Inferred Residence in 1935:</th> <td> Princeton, Mercer, New Jersey </td> </tr> <tr> <th>Residence in 1935:</th> <td> Princeton </td> </tr> <tr> <th>Resident on farm in 1935:</th> <td> No </td> </tr> <tr> <th>Citizenship:</th> <td> Having first papers </td> </tr> <tr> <th>Sheet Number:</th> <td> 10B </td> </tr> <tr> <th>Number of Household in Order of Visitation:</th> <td> 267 </td> </tr> <tr> <th>Occupation:</th> <td> Pychies Professor </td> </tr> <tr> <th>Industry:</th> <td> Private School </td> </tr> <tr> <th>House Owned or Rented:</th> <td> Owned </td> </tr> <tr> <th>Value of Home or Monthly Rental if Rented:</th> <td> 22000 </td> </tr> <tr> <th>Attended School or College:</th> <td> No </td> </tr> <tr> <th>Highest Grade Completed:</th> <td> College, 5th or subsequent year </td> </tr> <tr> <th>Hours Worked Week Prior to Census:</th> <td> 44 </td> </tr> <tr> <th>Class of Worker:</th> <td> Wage or salary worker in private work </td> </tr> <tr> <th>Weeks Worked in 1939:</th> <td> 52 </td> </tr> <tr> <th>Income:</th> <td> 5000 </td> </tr> <tr> <th>Income Other Sources:</th> <td> Yes </td> </tr> <tr> <th>Neighbors:</th> <td> <button type=\"button\" title=\"View others on page\" class=\"link neighborsLink\" data-modal-title=\"View others on page\" data-image-gid=\"m-t0627-02357-00675:2442\" data-tracking-event=\"content : neighbors link clicked\">View others on page</button> </td> </tr> </tbody> </table>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ancestry.com/discoveryui-content/view/18443183:7884?tid=&pid=&queryId=283135001368664572d798e1a9012c06&_phsrc=oJW436&_phstart=successSource",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Pauline Rosenboom",
				"creators": [],
				"date": "1910",
				"archive": "Ancestry.com",
				"bookTitle": "1910 United States Federal Census [Bronx Assembly District 34, New York, New York]",
				"libraryCatalog": "Ancestry.com US Federal Census",
				"pages": "4A (roll T624_1001)",
				"publisher": "National Archives and Records Administration",
				"url": "https://www.ancestry.com/discoveryui-content/view/18443183:7884",
				"attachments": [
					{
						"title": "Census Record",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<table id=\"recordServiceData\" class=\"table tableHorizontal tableHorizontalRuled\"> <tbody> <tr> <th>Name:</th> <td> <span class=\"srchHit\">Pauline Rosenboom <span title=\"Alternate name for this record\" class=\"altValue\">[Pauline Rosenbaum]</span> </span> </td> </tr> <tr> <th>Age in 1910:</th> <td> 51 </td> </tr> <tr> <th>Birth Date:</th> <td> <span class=\"srchHit\">1859 <span title=\"Alternate date for this record\" class=\"altValue\">[1859]</span> </span> </td> </tr> <tr> <th>Birthplace:</th> <td> Austria </td> </tr> <tr> <th>Home in 1910:</th> <td> Bronx Assembly District 34, New York, New York, USA </td> </tr> <tr> <th>Street:</th> <td> est Clenton Ave </td> </tr> <tr> <th>Race:</th> <td> White </td> </tr> <tr> <th>Gender:</th> <td> Female </td> </tr> <tr> <th>Immigration Year:</th> <td> 1887 </td> </tr> <tr> <th>Relation to Head of House:</th> <td> Mother-in-law </td> </tr> <tr> <th>Marital Status:</th> <td> Widowed </td> </tr> <tr> <th>Father's Birthplace:</th> <td> Austria </td> </tr> <tr> <th>Mother's Birthplace:</th> <td> Austria </td> </tr> <tr> <th>Native Tongue:</th> <td> English </td> </tr> <tr> <th>Attended School:</th> <td> No </td> </tr> <tr> <th>Able to read:</th> <td> Yes </td> </tr> <tr> <th>Able to Write:</th> <td> Yes </td> </tr> <tr> <th>Number of Children Born:</th> <td> 7 </td> </tr> <tr> <th>Number of Children Living:</th> <td> 5 </td> </tr> <tr> <th>Neighbors:</th> <td> <button type=\"button\" title=\"View others on page\" class=\"link neighborsLink\" data-modal-title=\"View others on page\" data-image-gid=\"4450082_00484:7884\" data-tracking-event=\"content : neighbors link clicked\">View others on page</button> </td> </tr> </tbody> </table>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
