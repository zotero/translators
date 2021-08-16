{
	"translatorID": "47cbb10a-d6d6-4957-96de-e8b6424c7708",
	"label": "National Transportation Library ROSA P",
	"creator": "Abe Jellinek",
	"target": "^https?://rosap\\.ntl\\.bts\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-11 21:32:59"
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


function detectWeb(doc, _url) {
	if (doc.querySelector('#doc-viewr-container')) {
		return typeFromM3(text(doc, 'a[href*="sm_resource_type="]'));
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-result-row .object-title');
	for (let row of rows) {
		let href = attr(row, 'form[action]', 'action');
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var risURL = url.replace(/[#?].*$/, '').replace(/\/$/, '') + '/export';
	let pdfURL = attr(doc, 'form#download-document', 'action');
	
	ZU.doGet(risURL, function (risText) {
		let m3 = (risText.match(/^M3\s*-\s*(.+)$/m) || [])[1] || '';
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			item.itemType = typeFromM3(m3);
			if (m3.trim() == 'Dataset') {
				item.extra = (item.extra || '') + `\nType: dataset`;
			}
			
			item.libraryCatalog = 'ROSA P';
			
			if (item.itemType == 'report' && !item.reportNumber) {
				item.reportNumber = item.issue;
				delete item.issue;
			}
			
			if (!item.callNumber) {
				item.callNumber = item.archiveLocation;
				delete item.archiveLocation;
			}
			
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: 'Full Text PDF',
					mimeType: 'application/pdf'
				});
			}
			
			item.complete();
		});
		translator.translate();
	});
}

// Map ROSA P types to Zotero types. Some of these mappings are rather arbitrary.
function typeFromM3(statedType) {
	switch (statedType.trim()) {
		case 'Application':
		case 'Brief':
		case 'Example':
		case 'In Collection':
		case 'Organization Info':
		case 'Other':
		case 'Policy Statement':
		case 'Press Release':
		case 'Research Paper': // no journal articles that I can find
		case 'Tech Report':
			return 'report';
		case 'Biography':
		case 'Book':
		case 'Booklet/Pamphlet':
		case 'Journal':
		case 'Magazine':
		case 'Manual':
		case 'Newspaper':
		case 'Proceedings':
			return 'book';
		case 'Data Management Plan':
		case 'Dataset':
		case 'Memorandum':
		case 'Multipart': // not common, doesn't really mean anything
		case 'PDF':
		case 'Text':
			return 'document';
		case 'Dissertation':
		case 'Thesis':
			return 'thesis';
		case 'Image':
			return 'artwork';
		case 'In Book':
			return 'bookSection';
		case 'In Proceedings':
			return 'conferencePaper';
		case 'Journal Article':
			return 'journalArticle';
		case 'Letter':
			return 'letter';
		case 'Manuscript':
			return 'manuscript';
		case 'Map':
			return 'map';
		case 'Presentations':
			return 'presentation';
		case 'Video':
			return 'videoRecording';
		case 'Web Document':
			return 'webpage';
		default:
			return 'report'; // this is a pretty safe guess in this catalog
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/view/dot/31128",
		"items": [
			{
				"itemType": "report",
				"title": "Development of delineator material/impact testing specific to managed lane use for optimization of service life : final report.",
				"creators": [
					{
						"lastName": "Arrington",
						"firstName": "Dusty R.",
						"creatorType": "author"
					},
					{
						"lastName": "Garza",
						"firstName": "William H.",
						"creatorType": "author"
					},
					{
						"lastName": "Texas A&M Transportation Institute",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2016-07-01",
				"abstractNote": "The durability of delineators should be considered when selecting a product. Looking at the data",
				"callNumber": "dot:31128",
				"language": "English",
				"libraryCatalog": "ROSA P",
				"reportNumber": "Test Report No. 605601",
				"shortTitle": "Development of delineator material/impact testing specific to managed lane use for optimization of service life",
				"url": "https://rosap.ntl.bts.gov/view/dot/31128",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Delineators"
					},
					{
						"tag": "Delineators"
					},
					{
						"tag": "Durability"
					},
					{
						"tag": "Highway delineators"
					},
					{
						"tag": "Impact tests"
					},
					{
						"tag": "Managed lanes"
					},
					{
						"tag": "Optimization"
					},
					{
						"tag": "Recommendations"
					},
					{
						"tag": "Service life"
					},
					{
						"tag": "Specifications"
					},
					{
						"tag": "Test procedures"
					},
					{
						"tag": "impact durability"
					},
					{
						"tag": "impact durability"
					},
					{
						"tag": "impact endurance"
					},
					{
						"tag": "impact endurance"
					},
					{
						"tag": "roadside safety"
					},
					{
						"tag": "roadside safety"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/view/dot/39145",
		"items": [
			{
				"itemType": "map",
				"title": "Air traffic hubs: 2009",
				"creators": [
					{
						"lastName": "United States. Department of Transportation. Bureau of Transportation Statistics",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2009-01-01",
				"abstractNote": "An Air Traffic Hub is a community of geographic area whose airport(s) serve at least .05% of all enplaned (boarded) passengers in the United States. All locations displayed here had a total enplanement of 30,000 or more for 2008. They are categorized based on their share of total enplaned passengers: Large, 1% or more; Medium. 0.25%-0.99%; and Small, 0.05%-0.24%.",
				"callNumber": "dot:39145",
				"language": "English",
				"libraryCatalog": "ROSA P",
				"shortTitle": "Air traffic hubs",
				"url": "https://rosap.ntl.bts.gov/view/dot/39145",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Air traffic"
					},
					{
						"tag": "Airport Hubs"
					},
					{
						"tag": "Airport facilities"
					},
					{
						"tag": "Boarding"
					},
					{
						"tag": "Hubs"
					},
					{
						"tag": "Map"
					},
					{
						"tag": "Maps"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/view/dot/36310",
		"items": [
			{
				"itemType": "letter",
				"title": "Letter From William Coleman, Jr. to Mayor Bradley and Mr. Cook",
				"creators": [
					{
						"lastName": "William T. Coleman",
						"firstName": "Jr.",
						"creatorType": "author"
					},
					{
						"lastName": "United States. Department of Transportation. Office of the Secretary",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1976-01-01",
				"abstractNote": "Letter written by William Coleman, Jr. to the Mayor Bradley and Mr. Cook -",
				"callNumber": "dot:36310",
				"language": "English",
				"libraryCatalog": "ROSA P",
				"url": "https://rosap.ntl.bts.gov/view/dot/36310",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Light rail transit"
					},
					{
						"tag": "Public Transportation"
					},
					{
						"tag": "Public transit"
					},
					{
						"tag": "Transportation systems"
					},
					{
						"tag": "Urbanized Areas"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/view/dot/18229",
		"items": [
			{
				"itemType": "thesis",
				"title": "An examination of the career paths and professional challenges of women in management positions in major university and college transportation departments.",
				"creators": [
					{
						"lastName": "Davis",
						"firstName": "Teresa A.",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"abstractNote": "Women have been involved in the field of transportation since the 1800s and comprise almost half of today‟s workforce, yet the transportation industry continues to be male-dominated. The Transportation Research Board in its 2000 Task Force on Women‟s Issues in Transportation identified a need to learn more about women leaders in transportation. Such knowledge would help the transportation industry in the pursuit and hiring of women and also assist those wishing to pursue a career in transportation. This study provides information on the demographics, career paths, and professional challenges of women managers in major university transportation departments.",
				"callNumber": "dot:18229",
				"language": "English",
				"libraryCatalog": "ROSA P",
				"url": "https://rosap.ntl.bts.gov/view/dot/18229",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "College graduates"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Job opportunities"
					},
					{
						"tag": "Management"
					},
					{
						"tag": "Occupations"
					},
					{
						"tag": "Transportation careers"
					},
					{
						"tag": "Universities and colleges"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/view/dot/56584",
		"items": [
			{
				"itemType": "document",
				"title": "A Connected Vehicle-Based Adaptive Navigation Algorithm [supporting dataset]",
				"creators": [
					{
						"lastName": "Wang",
						"firstName": "Yinhai",
						"creatorType": "author"
					},
					{
						"lastName": "Pacific Northwest Transportation Consortium",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2020-01-16",
				"abstractNote": "The dataset contains the vehicle count by movement information for 35 intersections in Bellevue, WA. It can be used for network-wide traffic simulation. The data were collected in 2017, during an off-peak (1 pm) period in a normal weekday. The Turn_ratio.xlsx file contains intersection identification numbers and vehicle count for each movement. The Intersection_address.xlsx file contains the north-south and east-west road names for each intersection. The two files are linked with intersection identification number.",
				"callNumber": "dot:56584",
				"extra": "Type: dataset",
				"language": "English",
				"libraryCatalog": "ROSA P",
				"url": "https://rosap.ntl.bts.gov/view/dot/56584",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Algorithms"
					},
					{
						"tag": "Bellevue"
					},
					{
						"tag": "Connected vehicles"
					},
					{
						"tag": "Information processing"
					},
					{
						"tag": "Navigation"
					},
					{
						"tag": "Optimization"
					},
					{
						"tag": "Shortest path algorithms"
					},
					{
						"tag": "Traffic Intersection"
					},
					{
						"tag": "Traffic delays"
					},
					{
						"tag": "Traffic simulation"
					},
					{
						"tag": "Travel costs"
					},
					{
						"tag": "Travel time"
					},
					{
						"tag": "Turning Movement Count Data"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/view/dot/49511",
		"items": [
			{
				"itemType": "report",
				"title": "Choosing a Roundabout as a Multimodal Solution",
				"creators": [
					{
						"lastName": "United States. Federal Highway Administration. Office of Safety",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "2014-07-01",
				"abstractNote": "The City of Santa Cruz, California, is committed to creating and maintaining a walkable and bikeable community. Master plans adopted for pedestrians in 2003 and bicycles in 2008 back up that commitment with city policies to improve the quality of life for non-motorized road users. Located on Monterey Bay, Santa Cruz is a vibrant community that has received national recognition and awards for being a “bicycle friendly community.” Residents of the city, students at the nearby University of California Santa Cruz, and visitors to the coastline all contribute to a diverse and active-lifestyle community. The city’s General Plan 2030 states: “We will provide an accessible, comprehensive, and effective transportation system that integrates automobile use with sustainable and innovative transportation options—including enhanced public transit, bicycle, and pedestrian networks throughout the community.” In addition, transportation safety and mobility around and through the community are important to the city, and the city’s staff is encouraged to consider innovative ideas and solutions to improve traffic flow and safety. As part of a revitalization of the connection between downtown and beach areas of Santa Cruz, and in keeping with active transportation goals, the city studied upgrading the intersection of Pacific Avenue, Center Street, and Depot Park from an all-way stop to a single-lane roundabout.",
				"callNumber": "dot:49511",
				"language": "English",
				"libraryCatalog": "ROSA P",
				"reportNumber": "FHWA-SA-14-011",
				"url": "https://rosap.ntl.bts.gov/view/dot/49511",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Interchanges and intersections"
					},
					{
						"tag": "Multimodal transportation"
					},
					{
						"tag": "Roundabouts"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rosap.ntl.bts.gov/gsearch?terms=santa+clarita&collection=",
		"items": "multiple"
	}
]
/** END TEST CASES **/
