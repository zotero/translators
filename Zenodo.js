{
	"translatorID": "a714cb93-6595-482f-b371-a4ca0be14449",
	"label": "Zenodo",
	"creator": "Philipp Zumstein",
	"target": "^https?://zenodo\\.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-06-12 21:58:19"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Philipp Zumstein
	
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
    if (url.indexOf('/record/')>-1) {
    	var collections = ZU.xpath(doc, '//div[contains(@class, "metadata")]//a[@class="navtrail"]');
    	for (var i=0; i<collections.length; i++) {
    		//Z.debug(collections[i].textContent);
    		switch (collections[i].textContent) {
    			case "Presentations":
    				return "presentation";
    			case "Software":
    				return "computerProgram";
    			case "Videos/Audio":
    				return "videoRecording";//or audioRecording?
    			case "Images":
    				return "artwork";
    			case "Presentations":
    				return "presentation";
    			case "Posters":
    				return "";
    			case "Lessons":
    			case "Books":
    				return "book";
    			case "book-section":
    				return "chapter";
    			case "conference-papers":
    				return ""
    			case "patents":
    				return "patent";
    			case "reports":
    			case "working-papers":
    			case "technical-notes":
    			case "project-deliverables":
    			case "project-milestones":
    			case "proposals":
    				return "report";
    			case "Theses":
    				return "thesis";
    			case "Datasets":
    				//change when dataset as itemtype is available
    			case "journal-articles":
    			case "preprints":
    				return "journalArticle";
    		}
    	}
    	return "journalArticle";
    } else if (getSearchResults(doc, true)) {
        return "multiple";
    }
}

function getSearchResults(doc, checkOnly) {
    var items = {};
    var found = false;
    var rows = ZU.xpath(doc, '//div[contains(@class, "row")]//h4/a');
    for (var i=0; i<rows.length; i++) {
        var href = rows[i].href;
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
                return true;
            }
            var articles = new Array();
            for (var i in items) {
                articles.push(i);
            }
            ZU.processDocuments(articles, scrape);
        });
    } else {
        scrape(doc, url);
    }
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	var type = detectWeb(doc, url);
    // Embedded Metadata
    translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
    translator.setDocument(doc);

    /*translator.setHandler('itemDone', function (obj, item) {
        //
        item.complete();
    });*/

    translator.getTranslatorObject(function(trans) {
        trans.itemType = type;
        trans.doWeb(doc, url);
    });
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://zenodo.org/record/54766?ln=en",
		"items": [
			{
				"itemType": "thesis",
				"title": "Measurement and Analysis of Strains Developed on Tie-rods of a Steering System",
				"creators": [
					{
						"firstName": "Stefan",
						"lastName": "Asenov",
						"creatorType": "author"
					}
				],
				"date": "2016/06/03",
				"abstractNote": "Modern day manufacturers research and develop vehicles that are equipped\nwith steering assist to help drivers undertake manoeuvres. However the lack of\nresearch for a situation where one tie-rod experiences different strains than the\nopposite one leads to failure in the tie-rod assembly and misalignment in the wheels&nbsp;over time. The performance of the steering system would be improved if this&nbsp;information existed. This bachelor&rsquo;s dissertation looks into this specific situation and&nbsp;conducts an examination on the tie-rods.\nA simple kinematic model is used to determine how the steering system moves\nwhen there is a steering input. An investigation has been conducted to determine how&nbsp;the system&rsquo;s geometry affects the strains.\nThe experiment vehicle is a Formula Student car which is designed by the\nstudents of Coventry University. The tests performed show the difference in situations&nbsp;where the two front tyres are on a single surface, two different surfaces &ndash; one with high&nbsp;friction, the other with low friction and a situation where there&rsquo;s an obstacle in the way&nbsp;of one of the tyres.\nThe experiment results show a major difference in strain in the front tie-rods in\nthe different situations. Interesting conclusions can be made due to the results for the&nbsp;different surface situation where one of the tyres receives similar results in bothcompression and tension, but the other one receives results with great difference.\nThis results given in the report can be a starting ground and help with the\nimprovement in steering systems if more research is conducted.",
				"libraryCatalog": "zenodo.org",
				"url": "http://zenodo.org/record/54766",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"strain steering system"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/record/54747",
		"items": [
			{
				"itemType": "presentation",
				"title": "An introduction to data visualizations for open access advocacy",
				"creators": [
					{
						"firstName": "Marieke",
						"lastName": "Guy",
						"creatorType": "author"
					}
				],
				"date": "2015/09/17",
				"abstractNote": "Guides you through important steps in developing relevant visualizations by showcasing the work of PASTEUR4OA to develop visualizations from ROARMAP.",
				"url": "http://zenodo.org/record/54747",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Data visualisation",
					"Open Access",
					"Open Access policy",
					"PASTEUR4OA",
					"ROARMAP"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/record/14837?ln=en",
		"items": [
			{
				"itemType": "artwork",
				"title": "Figures 8-11 in A new Savignia from Cretan caves (Araneae: Linyphiidae)",
				"creators": [
					{
						"firstName": "Jan",
						"lastName": "Bosselaers",
						"creatorType": "author"
					},
					{
						"firstName": "Hans",
						"lastName": "Henderickx",
						"creatorType": "author"
					}
				],
				"date": "2002/11/26",
				"abstractNote": "FIGURES 8-11. Savignia naniplopi sp. nov., female paratype. 8, epigyne, ventral view; 9, epigyne, posterior view; 10, epigyne, lateral view; 11, cleared vulva, ventral view. Scale bar: 8-10, 0.30 mm; 11, 0.13 mm.",
				"libraryCatalog": "zenodo.org",
				"shortTitle": "Figures 8-11 in A new Savignia from Cretan caves (Araneae",
				"url": "http://zenodo.org/record/14837",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Arachnida",
					"Araneae",
					"Crete",
					"Greece",
					"Linyphiidae",
					"Savignia",
					"cave",
					"new species",
					"troglobiont"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/search?ln=en&p=zotero&action_search=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://zenodo.org/record/11879?ln=en",
		"items": [
			{
				"itemType": "book",
				"title": "Sequence Comparison in Historical Linguistics",
				"creators": [
					{
						"firstName": "Johann-Mattis",
						"lastName": "List",
						"creatorType": "author"
					},
					{
						"firstName": "Hans",
						"lastName": "Geisler",
						"creatorType": "author"
					},
					{
						"firstName": "Wiebke",
						"lastName": "Petersen",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISBN": "9783943460728",
				"abstractNote": "The comparison of sound sequences (words, morphemes) constitutes the core of many techniques and methods in historical linguistics. With the help of these techniques, corresponding sounds can be determined, historically related words can be identified, and the history of languages can be uncovered. So far, the application of traditional techniques for sequence comparison is very tedious and time-consuming, since scholars have to apply them manually, without computational support. In this study, algorithms from bioinformatics are used to develop computational methods for sequence comparison in historical linguistics. The new methods automatize several steps of the traditional comparative method and can thus help to ease the painstaking work of language comparison.",
				"libraryCatalog": "zenodo.org",
				"publisher": "Düsseldorf University Press",
				"url": "http://zenodo.org/record/11879",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"computational linguistics",
					"historical linguistics",
					"phonetic alignment",
					"sequence comparison"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/