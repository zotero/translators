{
	"translatorID": "de0eef58-cb39-4410-ada0-6b39f43383f9",
	"label": "K10plus ISBN",
	"creator": "Philipp Zumstein",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2024-10-09 14:20:54"
}

/*
***** BEGIN LICENSE BLOCK *****

Copyright © 2015 Philipp Zumstein

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

function detectSearch(item) {
	return !!item.ISBN;
}

function doSearch(item) {
	//K10plus is the merged catalog of GBV and SWB
	//search the ISBN or text over the SRU of K10plus, and take the result it as MARCXML
	//documentation: https://wiki.k10plus.de/display/K10PLUS/SRU
	
	let url;
	if (item.ISBN) {
		var queryISBN = ZU.cleanISBN(item.ISBN);
		url = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.isb=" + queryISBN + "&maximumRecords=1";
	}
	else if (item.query) {
		url = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=" + encodeURIComponent(item.query) + "&maximumRecords=50";
	}
	
	//Z.debug(url);
	ZU.doGet(url, function (text) {
		//Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// Table of Contents = Inhaltsverzeichnis
			/* e.g.
			<datafield tag="856" ind1="4" ind2="2">
			  <subfield code="u">http://d-nb.info/1054452857/04</subfield>
			  <subfield code="m">DE-101</subfield>
			  <subfield code="3">Inhaltsverzeichnis</subfield>
			</datafield>
			*/
			var parser = new DOMParser();
			var xml = parser.parseFromString(text, "application/xml");
			var ns = {
				"marc": "http://www.loc.gov/MARC21/slim"
			};
			var tocURL = ZU.xpath(xml, '//marc:datafield[@tag="856"][ marc:subfield[text()="Inhaltsverzeichnis"] ]/marc:subfield[@code="u"]', ns);
			if (tocURL.length) {
				//Z.debug(tocURL[0].textContent);
				let url = tocURL[0].textContent;
				// Force all PDF URLs to HTTPS -- any domains specified in MARC records likely
				// support HTTPS (e.g., www.gbv.de and d-nb.info)
				if (url.startsWith("http://")) {
					Z.debug(`Forcing HTTPS for ${url}`);
					url = url.replace(/^http:\/\//, "https://");
				}
				item.attachments = [{
					url,
					title: "Table of Contents PDF",
					mimeType: "application/pdf"
				}];
			}
			
			//delete [u.a.] from place
			if (item.place) {
				item.place = item.place.replace(/\[?u\.[\s\u00A0]?a\.\]?\s*$/, '');
			}
			//DDC is not the callNumber in Germany
			item.callNumber = "";
			//place the queried ISBN as the first ISBN in the list (dublicates will be removed later)
			item.ISBN = queryISBN + " " + item.ISBN;
			//delete German tags
			item.tags = [];
			item.complete();
		});
		translator.translate();

	});
}

// Testing locally in
// chrome://zotero/content/tools/testTranslators/testTranslators.html

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "9783830931492"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Evaluation in Deutschland und Österreich: Stand und Entwicklungsperspektiven in den Arbeitsfeldern der DeGEval - Gesellschaft für Evaluation",
				"creators": [
					{
						"lastName": "Böttcher",
						"firstName": "Wolfgang",
						"creatorType": "editor"
					},
					{
						"lastName": "DeGEval - Gesellschaft für Evaluation",
						"creatorType": "editor",
						"fieldMode": true
					}
				],
				"date": "2014",
				"ISBN": "9783830931492",
				"extra": "OCLC: 885612607",
				"language": "ger",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "219",
				"place": "Münster",
				"publisher": "Waxmann",
				"shortTitle": "Evaluation in Deutschland und Österreich",
				"attachments": [
					{
						"title": "Table of Contents PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Literaturangaben"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "3-86688-240-8"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Bilinguale Lexik: nicht materieller lexikalischer Transfer als Folge der aktuellen russisch-deutschen Zweisprachigkeit",
				"creators": [
					{
						"firstName": "Katrin Bente",
						"lastName": "Karl",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISBN": "9783866882409 9783866882416",
				"extra": "OCLC: 795769702",
				"language": "ger",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "387",
				"place": "München",
				"publisher": "Sagner",
				"series": "Slavolinguistica",
				"seriesNumber": "15",
				"shortTitle": "Bilinguale Lexik",
				"attachments": [
					{
						"title": "Table of Contents PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Literaturverz. S. [373] - 387 Die CD-ROM enth. einen Anh. mit Dokumenten zur Sprachproduktion und Sprachbewertung"
					},
					{
						"note": "Teilw. zugl.: Hamburg, Univ., FB SLM, Diss., 2011 u.d.T.: Karl, Katrin Bente: Nicht materieller lexikalischer Transfer als Folge der aktuellen russisch-deutschen Zweisprachigkeit"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "978-1-4073-0412-0"
		},
		"items": [
			{
				"itemType": "book",
				"title": "The harbour of Sebastos (Caesarea Maritima) in its Roman Mediterranean context",
				"creators": [
					{
						"firstName": "Avnēr",
						"lastName": "Rabbān",
						"creatorType": "author"
					},
					{
						"firstName": "Michal",
						"lastName": "Artzy",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"ISBN": "9781407304120",
				"extra": "OCLC: 320755805",
				"language": "eng",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "222",
				"place": "Oxford",
				"publisher": "Archaeopress",
				"series": "BAR International series",
				"seriesNumber": "1930",
				"attachments": [
					{
						"title": "Table of Contents PDF",
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
		"type": "search",
		"input": {
			"ISBN": "978-1-4912-5316-8"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Classroom activities for the busy teacher: EV3: A 10 week plan for teaching robotics using the LEGO Education EV3 Core Set (45544)",
				"creators": [
					{
						"firstName": "Damien",
						"lastName": "Kee",
						"creatorType": "editor"
					}
				],
				"date": "2013",
				"ISBN": "9781491253168",
				"abstractNote": "Introduction -- RileyRover basics -- Keeping track -- What is a robot? -- Flowcharting -- How far? -- How fast? -- That bot has personality! -- How many sides? -- Help, I'm stuck! -- Let's go prospecting! -- Stay away from the edge -- Prospecting and staying safe -- Going up and going down -- Cargo delivery -- Prepare the landing zone -- Meet your adoring public! -- As seen on TV! -- Mini-golf -- Dancing robots -- Robot wave -- Robot butler -- Student worksheets -- Building instructions. - \"A guide for teachers implementing a robotics unit in the classroom ... aimed at middle years schooling (ages 9-15) ... [and] based around a single robot, the RileyRover\"--page 1",
				"extra": "OCLC: 860902984",
				"language": "eng",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "93",
				"place": "Lexington, KY",
				"publisher": "CreateSpace",
				"shortTitle": "Classroom activities for the busy teacher",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Place of publication information from back of book. Publisher information provided by Amazon"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9780754671275"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Remaining sensitive to the possibility of failure: second Resilience Engineering Symposium that was held November 8 - 10, 2007 in Juan-les-Pins",
				"creators": [
					{
						"firstName": "Erik",
						"lastName": "Hollnagel",
						"creatorType": "editor"
					},
					{
						"firstName": "Christopher P.",
						"lastName": "Nemeth",
						"creatorType": "editor"
					},
					{
						"firstName": "Sidney",
						"lastName": "Dekker",
						"creatorType": "editor"
					}
				],
				"date": "2008",
				"ISBN": "9780754671275",
				"language": "eng",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "332",
				"place": "Aldershot, Hampshire",
				"publisher": "Ashgate",
				"series": "Resilience engineering perspectives",
				"seriesNumber": "1",
				"shortTitle": "Remaining sensitive to the possibility of failure",
				"attachments": [
					{
						"title": "Table of Contents PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Many of the papers are based on presentations made at the Second Resilience Engineering Symposium that was held November 8 - 10 2007 in Juan-les-Pins, France. - Complete proceedings from this symposium are availabe for download at http://www.resilience-engineering.org Includes bibliographical references and index"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9780231545853"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Design Thinking for the Greater Good: Innovation in the Social Sector",
				"creators": [
					{
						"firstName": "Jeanne",
						"lastName": "Liedtka",
						"creatorType": "author"
					},
					{
						"firstName": "Daisy",
						"lastName": "Azer",
						"creatorType": "author"
					},
					{
						"firstName": "Randy",
						"lastName": "Salzman",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISBN": "9780231545853",
				"abstractNote": "Facing especially wicked problems, social sector organizations are searching for powerful new methods to understand and address them. Design Thinking for the Greater Good goes in depth on both the how of using new tools and the why. As a way to reframe problems, ideate solutions, and iterate toward better answers, design thinking is already well established in the commercial world. Through ten stories of struggles and successes in fields such as health care, education, agriculture, transportation, social services, and security, the authors show how collaborative creativity can shake up even the most entrenched bureaucracies—and provide a practical roadmap for readers to implement these tools.The design thinkers Jeanne Liedtka, Randy Salzman, and Daisy Azer explore how major agencies like the Department of Health and Human Services and the Transportation and Security Administration in the United States, as well as organizations in Canada, Australia, and the United Kingdom, have instituted principles of design thinking. In each case, these groups have used the tools of design thinking to reduce risk, manage change, use resources more effectively, bridge the communication gap between parties, and manage the competing demands of diverse stakeholders. Along the way, they have improved the quality of their products and enhanced the experiences of those they serve. These strategies are accessible to analytical and creative types alike, and their benefits extend throughout an organization. This book will help today's leaders and thinkers implement these practices in their own pursuit of creative solutions that are both innovative and achievable",
				"language": "eng",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "1",
				"place": "New York Chichester",
				"publisher": "Columbia University Press",
				"series": "Columbia Business School Publishing",
				"shortTitle": "Design Thinking for the Greater Good",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Frontmatter -- -- CONTENTS -- -- Acknowledgments -- -- Part I. Why Design Thinking? -- -- 1. Catalyzing a Conversation for Change -- -- 2. How Do We Get There from Here? A Tale of Two Managers -- -- Part II. The Stories -- -- 3. Igniting Creative Confidence at US Health and Human Services -- -- 4. Including New Voices at the Kingwood Trust -- -- 5. Scaling Design Thinking at Monash Medical Centre -- -- 6. Turning Debate into Dialogue at the US Food and Drug Administration -- -- 7. Fostering Community Conversations in Iveragh, Ireland -- -- 8. Connecting—and Disconnecting—the Pieces at United Cerebral Palsy -- -- 9. The Power of Local at the Community Transportation Association of America -- -- 10. Bridging Technology and the Human Experience at the Transportation Security Administration -- -- 11. Making Innovation Safe at MasAgro -- -- 12. Integrating Design and Strategy at Children’s Health System of Texas -- -- Part III. Moving into Action: Bringing Design Thinking to Your Organization -- -- 13. The Four-Question Methodology in Action: Laying the Foundation -- -- 14. The Four-Question Methodology in Action: Ideas to Experiments -- -- 15. Building Organizational Capabilities -- -- Notes -- -- Index"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
