{
	"translatorID": "f3b81c4e-28b4-41ae-9824-55739fe9c91a",
	"label": "Computer History Museum Archive",
	"creator": "Bo An",
	"target": "^https?://www.computerhistory.org/collections/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-11-22 19:29:29"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Bo An
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
	var collection = "/collections/search/";
	var artifact = "/collections/catalog/"
	var isCollection = url.includes(collection)
	var isArtifact = url.includes(artifact)


	if (isCollection) {
		return 'multiple';
	}
	else if (isArtifact) {
		return 'book';
	}
	return false;
}



function insertToTheStartOfAbstract(insert, abstract, title) {
	const abstractContent = title + ': ' + insert + '\n' + (abstract ? abstract : '')
	return abstractContent  ? abstractContent : ''
}
function getContent(node, fieldTitle) {
	const content = node.textContent.replace(fieldTitle, '').trim()
	return content ? content : ''
}
function addToExtra(oldExtra, newContent, fieldTitle) {
	return (oldExtra ? oldExtra + '\n' : '') + fieldTitle + ': ' + newContent.replace(/  /g, '').replace(/\n\n/g, '').replace('\n', ': ')
}

function getContributors(node) {
	let contributors = []
	const people = node.querySelectorAll('td')
	people.forEach(personDiv => {
		const spans = personDiv.querySelectorAll('span')
		name = spans[0].textContent
		const [lastName, firstName] = name.split(', ')
		Zotero.debug(lastName)
		Zotero.debug(firstName)
		contributors.push({
			firstName,
			lastName,
			creatorType: "contributor",
			fieldMode: true
		})
	})
	return contributors;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	const entries = doc.querySelectorAll('p.objtext');
	
	for (let i = 0; i < entries.length; i++) {
		const titleDiv = entries[i].querySelector('span.objtitle a');
		if (!titleDiv) continue;
		const href = titleDiv.href;
		const title = titleDiv.textContent;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
			return true;
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
		var fields = [...doc.querySelectorAll("div.field")];
	
	var newItem = new Zotero.Item("book");
	newItem.archive = 'Computer History Museum';
	
	fields.forEach((nodeOriginal) => {
		// clone the node to avoid altering the document.
		
		const node = nodeOriginal.cloneNode(true)
		const fieldTitleNode = node.querySelector("h4")
		const fieldTitle = fieldTitleNode.textContent.trim()
		// the categories vary therefore many are collapsed under 'extra' and 'abstract'.
		switch(fieldTitle) {
			case 'Title':
				newItem.title = getContent(node, fieldTitle)
				break;
			case 'Catalog Number':
				newItem.libraryCatalog = getContent(node, fieldTitle)
				break;
			case 'Date':
				newItem.date = getContent(node, fieldTitle)
				break;
			case 'Participants':
			case 'Contributor':
				// Zotero.debug(getContent(node, fieldTitle))
				newItem.creators = getContributors(node)
				break;
			case 'Publisher':
				newItem.publisher = getContent(node, fieldTitle)
				break;
			case 'Place of Publication':
				newItem.publisher += '; ' + getContent(node, fieldTitle)
				break;
			case 'Extent':
				newItem.numPages = getContent(node, fieldTitle).replace(' p.', '')
				break;
			case 'Lot Number':
				newItem.archiveLocation = getContent(node, fieldTitle)
				break;
			case 'Description':
			case 'Type':
			case 'Subject':
			case 'Category':
			case 'Collection Title':
				newItem.abstractNote = insertToTheStartOfAbstract(getContent(node, fieldTitle), newItem.abstractNote, fieldTitle)
				break;
			case 'Identifying Numbers':
			case 'Copyright Holder':
			case 'Dimensions':
			case 'Credit':
			case 'Place Manufactured':
			case 'Manufacturer':
				newItem.extra = addToExtra(newItem.extra, getContent(node, fieldTitle), fieldTitle);
				break
		}
	
	});
	
	
	let pdfPath = undefined;
	const pdfDiv = doc.querySelectorAll('div.mediaDocument li a');
	if (pdfDiv) {
		pdfDiv.forEach((div, pdfIndex) => {
			pdfPath = div.href
				if (pdfPath) {
					newItem.attachments.push({
						url: pdfPath.replace('https', 'http'),
						mimeType: "application/pdf",
						title: `${newItem.title}${pdfIndex === 0 ? '' : ' ' + pdfIndex + 1}`,
			});
		}
		
		})
		
	}

	
	
	let imagePath = undefined;
	const imageDiv = doc.querySelectorAll('div.mediarow a.media-large img');
	if (imageDiv) {
		
		imageDiv.forEach((div, imageIndex) => {
			imagePath = div.src
			if (imagePath) {
			newItem.attachments.push({
				url: imagePath,
				title: `${newItem.title} Image ${imageIndex + 1}`,
				mimeType: 'image/png'
			});
	}

		})
		
	}
	
	let videoPath = undefined;
	const videoDivs = doc.querySelectorAll('div.mediaVideo iframe')
	if (videoDivs) {
		videoDivs.forEach((div, videoIndex) => {
			videoPath = div.src
			videoTitle = div.textContent
			if (videoPath) {
			newItem.attachments.push({
				url: videoPath,
				title: `${newItem.title} video${ videoIndex === 0 ? '' : ' ' + videoIndex + 1}`,
				snapshot: false
			});
			}
		})
		
	}
	
	newItem.complete()
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.computerhistory.org/collections/catalog/102658053",
		"items": [
			{
				"itemType": "book",
				"title": "Knuth, Donald oral history",
				"creators": [
					{
						"firstName": "Edward",
						"lastName": "Feigenbaum",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Donald E.",
						"lastName": "Knuth",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Yan",
						"lastName": "Rosenshteyn",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2007-03-14; 2007-03-21",
				"abstractNote": "Collection Title: Oral history collection\nSubject: Fellow Award Honoree; Knuth, Donald; IBM 650 (Computer); Combinatorial analysis--Data processing; Combinatorics; Analysis of algorithms; The Art of Computer Programming; Stanford University; TeX; METAFONT; Religion; Literate programming\nCategory: Transcription\nDescription: In this wide-ranging interview conducted by Edward Feigenbaum, Donald Knuth talks about the progression of his life and career.  Topics include his family background and early interest in music, physics and mathematics, his first exposure to programming,  finding a mentor, and writing a doctoral thesis.   He describes how \"The Art of Computer Programming\" became \"the story of my life\", and why it was put on hold for the TeX and METAFONT projects.  He also talks about personal work habits, programming style, analysis of algorithms, the influence of religion in his life, and his advice to the next generation of scientists.\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X3926.2007",
				"libraryCatalog": "102658053",
				"numPages": "73",
				"publisher": "Computer History Museum; Mountain View, California",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Knuth, Donald oral history"
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
		"url": "https://www.computerhistory.org/collections/catalog/102646282",
		"items": [
			{
				"itemType": "book",
				"title": "IBM 1401 Programming Systems",
				"creators": [],
				"date": "1959",
				"abstractNote": "Subject: 1401 data processing system (Computer); promotional materials; Digital computer: mainframe; 1401 programming systems (Software); COBOL (Software); Business applications; Scientific applications; Software; Digital communications--Social aspects; International Business Machines Corporation (IBM). Data Processing Division\nCategory: Promotional Material\nDescription: The brochure explains the IBM 1401 programming languages and their application to the 1401 data processing system. The brochure is printed in black, white, and blue. The front cover shows the words Programming and Systems in a repetitive design with the name Donald G. McBrien stamped in the upper right corner. The back cover shows the company logo on a blue background. Throughout the inside pages are black and white photographs of the computer and images of reports generated by the system. Text contents include: What is a 1401 program?; What is a stored program machine?; What are 1401 programming systems?; What 1401 programming systems mean to management?; IBM programming systems; Here's how one of the 1401 programming systems -- Report Program Generator -- works to increase programming efficiency; New IBM services include:; Other services available to every IBM customer.\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X3067.2005",
				"extra": "Identifying Numbers: Other number: 520-1368\nDimensions: 9 5/8 x 7 6/8 in.\nCopyright Holder: International Business Machines Corporation (IBM). Data Processing Division",
				"libraryCatalog": "102646282",
				"numPages": "6",
				"publisher": "International Business Machines Corporation. Data Processing Division. (IBM); U.S.",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "IBM 1401 Programming Systems"
					},
					{
						"title": "IBM 1401 Programming Systems Image 1",
						"mimeType": "image/png"
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
		"url": "https://www.computerhistory.org/collections/catalog/102623002",
		"items": [
			{
				"itemType": "book",
				"title": "A guide to Fortran IV programming",
				"creators": [],
				"date": "1972",
				"abstractNote": "Category: Book\nDescription: Second edition.  Signed by McCracken on title page.\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X3682.2007",
				"extra": "Identifying Numbers: ISBN10: 0471582816\nLCCN\n72-4745\nLOC call num\nQA76.73.F25 M3 1972\nDimensions: 28 cm.",
				"libraryCatalog": "102623002",
				"numPages": "288",
				"publisher": "John Wiley & Sons; New York",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.computerhistory.org/collections/catalog/102790985",
		"items": [
			{
				"itemType": "book",
				"title": "Logic Programming Workshop '83 poster",
				"creators": [],
				"date": "1983",
				"abstractNote": "Category: Promotional Material\nDescription: PDF scan of the poster for the Logic Programming Workshop '83 in Algarve Portugal, June 26 - July 1, 1983.\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X9292.2020",
				"libraryCatalog": "102790985",
				"numPages": "1; 0.0004 GB",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Logic Programming Workshop '83 poster"
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
		"url": "https://www.computerhistory.org/collections/catalog/102620354",
		"items": [
			{
				"itemType": "book",
				"title": "LP20 Linear Programming System",
				"creators": [],
				"abstractNote": "Collection Title: 1620 Restoration Project Collection\nCategory: Manual\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X4248.2008",
				"extra": "Identifying Numbers: Program ID number: 10.1.009\nCredit: Gift of John Maniotes",
				"libraryCatalog": "102620354",
				"publisher": "International Business Machines Corporation (IBM)",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.computerhistory.org/collections/catalog/102765924",
		"items": [
			{
				"itemType": "book",
				"title": "Jacquard programming cards",
				"creators": [],
				"abstractNote": "Category: I/O/punched card device\nDescription: The object is a series of cardboard punch cards connected by string. The cards are hand numbered sequentially from 6 to 44.\nType: Physical Object",
				"archive": "Computer History Museum",
				"archiveLocation": "X8070.2017",
				"extra": "Dimensions: folded for storage: 2 1/2 in x 9 1/4 in x 5 in; unfolded: 1/8 in x 9 1/4 in x 97 1/2 in\nCredit: Gift of the Museum of American Heritage",
				"libraryCatalog": "102765924",
				"attachments": [
					{
						"title": "Jacquard programming cards Image 1",
						"mimeType": "image/png"
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
		"url": "https://www.computerhistory.org/collections/catalog/102701957",
		"items": [
			{
				"itemType": "book",
				"title": "Bizmac programming manual binder",
				"creators": [],
				"date": "1956",
				"abstractNote": "Category: Ephemera/other\nType: Physical object",
				"archive": "Computer History Museum",
				"archiveLocation": "X5121.2009",
				"extra": "Manufacturer: RCA Corporation\nDimensions: overall: 2 in x 10 in x 11 1/2 in",
				"libraryCatalog": "102701957",
				"attachments": [
					{
						"title": "Bizmac programming manual binder Image 1",
						"mimeType": "image/png"
					},
					{
						"title": "Bizmac programming manual binder Image 2",
						"mimeType": "image/png"
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
		"url": "https://www.computerhistory.org/collections/catalog/102738167",
		"items": [
			{
				"itemType": "book",
				"title": "Abe, Takao oral history",
				"creators": [
					{
						"firstName": "Takao",
						"lastName": "Abe",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Doug",
						"lastName": "Fairbairn",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2016-06-20",
				"abstractNote": "Collection Title: CHM oral history collection\nSubject: silicon wafers; Silicon on Insulator; SOI; Dash-necking; Voronkov; SIMOX; Hokkaido University\nCategory: Transcription\nDescription: Mr. Abe was born in 1936 in Otaru, on Hokkaido, the northern island of Japan. He attended Hokkaido University, majoring in physics. He was recruited by a previous graduate of the same university to come to Tokyo and work for Shin-Etsu Handotai. The year was 1964. Abe requested a job in basic research, but the company needed help in growing crystalline silicon for use in semiconductors. \n\nAbe was given the job to improve the quality of the silicon ingots. He traveled to Bell Labs and to Siemens, as Siemens was the source of their crystal growing equipment. During the interview, Abe describes the ups and downs of the industry and his substantial contributions to the quality of silicon wafers.\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X7645.2016",
				"extra": "Credit: Computer History Museum",
				"libraryCatalog": "102738167",
				"numPages": "24",
				"publisher": "Computer History Museum; Tokyo, Japan",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Abe, Takao oral history"
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
		"url": "https://www.computerhistory.org/collections/catalog/102746874",
		"items": [
			{
				"itemType": "book",
				"title": "Xbox oral history panel",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Baker",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Eric",
						"lastName": "Dennis",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Todd",
						"lastName": "Holmdahl",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Albert J.",
						"lastName": "Penello",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Dag",
						"lastName": "Spicer",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2014-03-25",
				"abstractNote": "Collection Title: Oral history collection\nSubject: Xbox; Xbox 360; Xbox One; Sony Corporation; Microsoft Corporation; Playstation; Windows; International Business Machines Corporation (IBM); ATI Technologies Inc.; Central Processing Unit (CPU); Graphics Processing Unit (GPU); Nvidia Corporation; Media Center PC (personal computer); Halo; Kinect; Performance Optimization With Enhanced RISC--Performance Computing (PowerPC); Flextronics; Wistron; Allard, J; Bach, Robbie\nCategory: Transcription\nDescription: Three key members of the original Microsoft Xbox team come together in this oral history to discuss the early development of Xbox and Xbox 360, two of the most significant game consoles in computer history. Architect Nick Baker, head of hardware Todd Holmdahl, and marketing lead Albert Penello cover the early development years of the original Xbox and their attempt to gain a foothold in the highly competitive game console market. They then continue with the history of the Xbox 360 console, the successor to the original, and the changing nature of the video game business during that period that allowed for innovations such as live, interconnected play over a network and the Kinect input capture device. Strategic, technical, and marketing aspects of this history are discussed, as are visions for the future of gaming.\nType: Document",
				"archive": "Computer History Museum",
				"archiveLocation": "X7120.2014",
				"extra": "Copyright Holder: Computer History Museum\nCredit: Computer History Museum",
				"libraryCatalog": "102746874",
				"numPages": "27",
				"publisher": "Computer History Museum; Mountain View, California",
				"attachments": [
					{
						"mimeType": "application/pdf",
						"title": "Xbox oral history panel"
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
		"url": "https://www.computerhistory.org/collections/search/?s=oral+history&page=4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.computerhistory.org/collections/catalog/102738261",
		"items": [
			{
				"itemType": "book",
				"title": "Su, Stephen oral history",
				"creators": [
					{
						"firstName": "Douglas",
						"lastName": "Fairbairn",
						"creatorType": "contributor",
						"fieldMode": true
					},
					{
						"firstName": "Stephen",
						"lastName": "Su",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2017-04-19",
				"abstractNote": "Subject: ITRI; Apple; iPhone; Camera\nCategory: Oral history\nDescription: Stephen Su grew up on Taiwan, but in 1980 he came to the US to attend high school and college, including studying semiconductors at Caltech. He worked for Motorola for a period of time before returning to school in 1992 to get an MBA from Kellog. Upon graduation, he joined Boston Consulting Group and went to Hong Kong on a consulting assignment. \nIn 1998, Stephen returned to Taiwan, working for Primax.  While there he spent several years managing the Mobile Accessories group, responsible for developing accessories for mobile phone makers like Nokia and Apple.  In particular, he was responsible for developing the camera module for several generations of Apple’s iPhone. He tells many interesting stories about working with Apple on this very important program. \nIn 2009, he was recruited to join ITRI, where he is involved with helping steer Taiwan into lucrative new markets through careful investments in promising new technologies.\nType: Moving image",
				"archive": "Computer History Museum",
				"archiveLocation": "X8201.2017",
				"extra": "Credit: Computer History Museum",
				"libraryCatalog": "102738261",
				"publisher": "Computer History Museum; Mountain View, CA",
				"attachments": [
					{
						"title": "Su, Stephen oral history video",
						"snapshot": false
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
		"url": "https://www.computerhistory.org/collections/search/?s=oral+history&page=5",
		"items": "multiple"
	}
]
/** END TEST CASES **/
