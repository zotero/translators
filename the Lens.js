{
	"translatorID": "b5f3b896-df57-4c68-8841-ea2171ee7419",
	"label": "the Lens",
	"creator": "Laurent Lhuillier",
	"target": "^https?://www\\.lens\\.org",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-21 09:15:02"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	the Lens translator
	
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

function detectWeb(doc, url) {
	if(url.indexOf("search?") !== -1) {
		return "multiple";
	}
		
	if (url.indexOf("patent") !== -1 && getTitle(doc)) {
		return "patent";
	}
}

function getSearchResults(doc) {
	return ZU.xpath(doc,'//*[@id="resultsTable"]/div[3]/child::*//*/h3/a');
}

function getTitle(doc) {
	var title = ZU.xpathText(doc, '//h2[@class="doc-title"]/a');
	if(title) {
		if(title.toUpperCase() == title) {
			title = ZU.capitalizeTitle(title, true);
		}
		return title.trim();
	}
}

function scrape(doc) {
	var newItem = new Zotero.Item("patent");
	newItem.title = getTitle(doc);

	var abstractNote = ZU.xpathText(doc, '//*[@id="patentFrontPage"]/div[1]/p');
	newItem.abstractNote = abstractNote;

	var patentNumber = ZU.xpathText(doc, '//*[@id="patentMain"]/div/header/div[2]/div/div[2]/a');
	newItem.patentNumber = patentNumber;

	var lensURL = ZU.xpathText(doc, '//*[@id="patentMain"]/div/header/div[2]/div/div[3]/a/@href');
	newItem.url = 'https://www.lens.org' + lensURL;

	var filingDate = ZU.xpathText(doc, '//*[@id="patentMain"]/div/header/div[1]/ul/li[1]/text()');
	filingDate = new Date(filingDate);
	newItem.filingDate = filingDate.toISOString().substr(0,10);

	var ul = doc.getElementById("inventorFilter");
	var liNodes = [];
	for (var i = 0; i < ul.childNodes.length; i++) {
		if (ul.childNodes[i].nodeName == "LI") {
			liNodes.push(ul.childNodes[i]);
		}
	}
	iAu = liNodes.length;

	var authors = [];
	for (iAu; iAu > 0; iAu--) {
		authors[iAu] = ZU.xpathText(doc, '//*[@id="inventorFilter"]/li[' + iAu + ']/a');

	newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[iAu], "inventor", true));
	}

	var pdfurl = ZU.xpathText(doc, '//*[@id="patentFrontPage"]/div[2]/a/@href');
	newItem.attachments.push({
		title: 'Full Text PDF',
		url: pdfurl,
		mimeType: 'application/pdf'
	});

	newItem.complete();
}

function doWeb(doc, url) {

	if (detectWeb(doc, url) == "multiple"){
		var hits = {};
		var results = getSearchResults(doc);
		//Zotero.debug(results);
		Zotero.debug(results.length);
		for (var i=0, n=results.length; i<n; i++) {
			hits[results[i].href] = results[i].textContent.trim();
		}

		Z.selectItems(hits, function(items) {
			if (!items) return true;

			var urls = [];
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc);	
	}
}   
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.lens.org/lens/search?q=Gravitational+Janus+microparticle",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.lens.org/lens/patent/012-971-701-800-99X",
		"items": [
			{
				"itemType": "patent",
				"title": "Alignment And Rotation Of Janus Microparticles In Response To Acceleration",
				"creators": [
					{
						"lastName": "Garanzotis Theodoros",
						"creatorType": "inventor"
					},
					{
						"lastName": "Veres Teodor",
						"creatorType": "inventor"
					},
					{
						"lastName": "Morton Keith J",
						"creatorType": "inventor"
					},
					{
						"lastName": "Malic Lidija",
						"creatorType": "inventor"
					},
					{
						"lastName": "Brassard Daniel",
						"creatorType": "inventor"
					},
					{
						"lastName": "Macpherson Charles D",
						"creatorType": "inventor"
					}
				],
				"abstractNote": "Gravitational Janus microparticle having, a center-of-mass, a center-of-volume, and a non¬ uniform density, wherein: the center-of-mass and the center-of-volume are distinct. When suspended in a fluid, the microparticle substantially aligns with either: i) the gravitational field; or ii) the direction of an acceleration, such that the Janus microparticle is in substantial rotation equilibrium. After perturbation from substantial rotational equilibrium, the Janus microparticle reversibly rotates to return to substantial rotational equilibrium. The gravitational Janus microparticle may comprise at least two portions, each having distinct physical and/or chemical characteristics, wherein at least one portion provides a detectable effect following rotation and alignment of the microparticle.",
				"filingDate": "2016-06-29",
				"patentNumber": "WO 2016/103226 A2",
				"url": "https://www.lens.org/012-971-701-800-99X",
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
		"url": "https://www.lens.org/lens/patent/109-941-370-099-325",
		"items": [
			{
				"itemType": "patent",
				"title": "Anti-tussive Composition Comprising Essence Of Anise, Senega Dry Extract And Licorice Root Extract",
				"creators": [
					{
						"lastName": "Medenica Rajko D",
						"creatorType": "inventor"
					}
				],
				"abstractNote": "An anti-tussive composition comprising essence of anise, senega dry extract, and pure licorice root extract, in combination with a pharmaceutically-suitable liquid carrier, and a method of treating cough in humans, is disclosed.",
				"filingDate": "1997-12-10",
				"patentNumber": "WO 1997/046247 A1",
				"url": "https://www.lens.org/109-941-370-099-325",
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
	}
]
/** END TEST CASES **/