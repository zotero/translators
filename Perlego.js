{
	"translatorID": "4fbb8dfd-459d-445e-bd2a-5ea89814b0c0",
	"label": "Perlego",
	"creator": "Brendan O'Connell",
	"target": "^https?://(www\\.)?perlego\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-26 14:52:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Brendan O'Connell

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
	if (url.includes('/book/')) {
		return 'book';
	}
	else if (url.includes("/browse/") || url.includes("/search?") || url.includes("/publisher/") || url.includes("/reading-list/")) {
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
	}
	Z.monitorDOMChanges(doc.querySelector('div#root'), { childList: true, subtree: true });
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// limitation: this selector works well for /search?, /browse/, and /publisher/ pages, but doesn't work
	// for /reading-list/, e.g. https://www.perlego.com/reading-list/86/introduction-to-social-movements?queryID=21da233727a255f6d709ad565bddc362
	var rows = doc.querySelectorAll('a[href*="/book/"]');
	for (let row of rows) {
		var href = row.href;
		// for non-logged in users, row.href sometimes contains /null/ so user sees a 404 error instead of the book
		// remove this so we get to the correct URL
		if (href.includes("null/")) {
			href = href.replace("null/", "");
		}
		let title = text(row, 'span');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('book');
	const id = url.match(/\/book\/(\d+)/)[1];
	let apiUrl = "https://api.perlego.com/metadata/v2/metadata/books/" + id;
	var apiJson = await requestJSON(apiUrl);
	var metadata = apiJson.data.results[0];
	if (metadata.subtitle) {
		item.title = metadata.title + ": " + metadata.subtitle;
	}
	else {
		item.title = metadata.title;
	}
	item.shortTitle = metadata.title;
	item.ISBN = ZU.cleanISBN(metadata.isbn13);
	// multiple authors are entered in a single field in JSON, separated by comma or ampersand
	let authors = metadata.author.split(/[,&]/);
	for (let author of authors) {
		item.creators.push(ZU.cleanAuthor(author, 'author'));
	}
	item.abstractNote = ZU.cleanTags(metadata.description);
	let dateString = metadata.date;
	let formattedDate = dateString.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
	item.date = formattedDate;
	item.place = metadata.publication_city;
	item.edition = metadata.edition_number;
	item.publisher = metadata.publisher_name;
	item.language = metadata.language;
	item.url = url;
	if (metadata.subject[0].subject_name) {
		item.tags.push(metadata.subject[0].subject_name);
	}
	if (metadata.topics[0].topic_name) {
		item.tags.push(metadata.topics[0].topic_name);
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.perlego.com/book/781635/unshakeable-your-guide-to-financial-freedom-pdf",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Unshakeable: Your Guide to Financial Freedom",
				"creators": [
					{
						"firstName": "Tony",
						"lastName": "Robbins",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Mallouk",
						"creatorType": "author"
					}
				],
				"date": "2017-02-28",
				"ISBN": "9781471164941",
				"abstractNote": "*THE NEW YORK TIMES BESTSELLER* Tony Robbins, arguably the most recognizable life and business strategist and guru, is back with a timely, unique follow-up to his smash New York Times bestseller Money: Master the Game.\n Market corrections are as constant as seasons are in nature. There have been 30 such corrections in the past 30 years, yet there's never been an action plan for how not only to survive, but thrive through each change in the stock market.\n Building upon the principles in Money: Master the Game, Robbins offers the reader specific steps they can implement to protect their investments while maximizing their wealth. It's a detailed guidedesigned for investors, articulated in the common-sense, practical manner that the millions of loyal Robbins fans and students have come to expect and rely upon.\n Few have navigated the turbulence of the stock market as adeptly and successfully as Tony Robbins. His proven, consistent success over decades makes him singularly qualified to help investors (both seasoned and first-timers alike) preserve and add to their investments. 'Tony's power is super-human' Oprah Winfrey\n 'He has a great gift. He has the gift to inspire' Bill Clinton\n 'Tony Robbins needs no introduction. He is committed to helping make life better for every investor' Carl Icahn\n 'The high priest of human potential. The world can't get enough of Anthony Robbins' The New York Times",
				"language": "English",
				"libraryCatalog": "Perlego",
				"publisher": "Simon & Schuster UK",
				"shortTitle": "Unshakeable",
				"url": "https://www.perlego.com/book/781635/unshakeable-your-guide-to-financial-freedom-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Business"
					},
					{
						"tag": "Business General"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/2997236/operations-management-an-international-perspective-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "Operations Management: An International Perspective",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Barnes",
						"creatorType": "author"
					}
				],
				"date": "2018-01-30",
				"ISBN": "9781350305212",
				"abstractNote": "This fascinating new core textbook, authored by a highly respected academic with over a decade of industry experience, takes a global and strategic approach to the important topic of operations management (OM). Integrating contemporary and traditional theories the text covers everything a student needs to understand the reality of operations in the modern world and combines the latest cutting-edge thinking with innovative learning features. Written in a concise and engaging style and based on up-to-date research in the field, the book provides a range of international case studies and examples that help students to apply theoretical knowledge to real-world practice. This is a must-have textbook for students studying operations management modules on undergraduate, postgraduate and MBA programmes. In addition, this is an ideal textbook to accompany modules on operations strategy, production management and services management.",
				"edition": "1",
				"language": "English",
				"libraryCatalog": "Perlego",
				"publisher": "Bloomsbury Academic",
				"shortTitle": "Operations Management",
				"url": "https://www.perlego.com/book/2997236/operations-management-an-international-perspective-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Business"
					},
					{
						"tag": "Operations"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/2306297/mathematics-n1-students-book-tvet-first-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "Mathematics N1 Student's Book: TVET FIRST",
				"creators": [
					{
						"firstName": "MJJ van",
						"lastName": "Rensburg",
						"creatorType": "author"
					}
				],
				"date": "2014-01-01",
				"ISBN": "9781430804017",
				"abstractNote": "A top-rated series of textbooks designed to help students reach their highest potential. Easy to follow with logical sequencing and a step-by-step approach to problem-solving. Comprehensive module summaries, detailed worked examples and plenty of activities to prepare students for exams. Lots of typical exam-type questions so students understand what is expected of them. Simple defi niti ons for new terms to remove language barriers.",
				"language": "English",
				"libraryCatalog": "Perlego",
				"publisher": "Troupant",
				"shortTitle": "Mathematics N1 Student's Book",
				"url": "https://www.perlego.com/book/2306297/mathematics-n1-students-book-tvet-first-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Engineering General"
					},
					{
						"tag": "Technology & Engineering"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/862303/designing-experiences-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "Designing Experiences",
				"creators": [
					{
						"firstName": "J. Robert",
						"lastName": "Rossman",
						"creatorType": "author"
					},
					{
						"firstName": "Mathew D.",
						"lastName": "Duerden",
						"creatorType": "author"
					}
				],
				"date": "2019-07-23",
				"ISBN": "9780231549516",
				"abstractNote": "In an increasingly experience-driven economy, companies that deliver great experiences thrive, and those that do not die. Yet many organizations face difficulties implementing a vision of delivering experiences beyond the provision of goods and services while students and aspiring professionals struggle to piece together the principles of experience design from disparate, often disconnected disciplines and approaches.In this book, J. Robert Rossman and Mathew D. Duerden present a comprehensive and accessible introduction to experience design. They synthesize the fundamental theories and methods from multiple disciplines and lay out a process for designing experiences from start to finish. Rossman and Duerden challenge us to reflect on what makes a great experience from the user's perspective, drawing attention to both the macro and micro levels. They present interdisciplinary research underlying key concepts such as memory, intentionality, and dramatic structure in a down-to-earth style. Designing Experiences features detailed instructions and numerous real-world examples that clarify theoretical principles, making it useful for students and professionals. An invaluable overview of a growing field, the book provides readers with the tools they need to design innovative and indelible experiences.",
				"language": "English",
				"libraryCatalog": "Perlego",
				"publisher": "Columbia University Press",
				"url": "https://www.perlego.com/book/862303/designing-experiences-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Business"
					},
					{
						"tag": "Management"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/1809187/war-and-peace-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "War and Peace",
				"creators": [
					{
						"firstName": "Leo",
						"lastName": "Tolstoy",
						"creatorType": "author"
					}
				],
				"date": "2020-09-08",
				"ISBN": "9781528791342",
				"abstractNote": "One of the most famous examples of classic world literature, Tolstoy's \"War and Peace\" is an epic chronicle of France's invasion of Russia and the aftermath of the Napoleonic era on Russian society as experienced by five families belonging to the aristocracy. Originally released in serial form in \"The Russian Messenger\" between 1865 and 1867, \"War and Peace\" is considered to be among Tolstoy's greatest literary works and constitutes an absolute must-read for all literature lovers. Count Lev Nikolayevich Tolstoy (1828–1910), also known in English as Leo Tolstoy, was a Russian writer. Generally considered to be one among the greatest novel writers of all time, he was nominated for the Nobel Prize in literature each year between 1902 and 1906; as well as the Nobel Peace Prize in 1901, 1902, and 1910. Other notable works by this author include: \"Anna Karenina\" (1877), \"The Cossacks\" (1863), and \"Resurrection\" (1899). Read & Co. Classics is proudly republishing this classic novel now in a new edition complete with a specially-commissioned new biography of the author.",
				"language": "English",
				"libraryCatalog": "Perlego",
				"publisher": "Read & Co. Classics",
				"url": "https://www.perlego.com/book/1809187/war-and-peace-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Classics"
					},
					{
						"tag": "Literature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/browse/literature?language=All&publicationDate=&publisher=&author=&format=&tab=books&page=1",
		"defer": true,
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/2179957/chor-und-theorie-zeitgenssische-theatertexte-von-heiner-mller-bis-ren-pollesch-pdf",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Chor und Theorie: Zeitgenössische Theatertexte von Heiner Müller bis René Pollesch",
				"creators": [
					{
						"firstName": "Maria",
						"lastName": "Kuberg",
						"creatorType": "author"
					}
				],
				"date": "2021-02-22",
				"ISBN": "9783835397361",
				"abstractNote": "Nicht nur zwischen Heimat und Fremde steht der Chor im Theater, sondern auch zwischen selbstständigem Handeln und Abhängigkeit, zwischen Menschen und Göttern und schließlich zwischen der dargestellten Welt und der Realität der Rezipienten. Am Chor entzündet sich die Frage, wie die Gemeinschaft auftritt.Maria Kuberg untersucht in detaillierten Lektüren chorischer Theaterstücke von Heiner Müller, Botho Strauß, Elfriede Jelinek, Tankred Dorst, Ewald Palmetshofer, Rainald Goetz, Gert Jonke und René Pollesch, wie der Chor in zeitgenössischen deutschsprachigen Theatertexten zur Sprache kommt. Welche Formen nimmt die Chor-Gemeinschaft dabei im Text an? Und wie korrespondieren diese mit der dramatischen Gattung, die doch grundsätzlich die Handlungen Einzelner vorführt? Das sind die leitenden Fragen dieser erhellenden Erkundung des Theaters der Gegenwart, die es als Reflexion über Gemeinschaft profiliert.Dabei operiert die Untersuchung auf drei historischen Ebenen: Chorische Theatertexte aus dem späten 20. und frühen 21. Jahrhundert werden mit einer theatralen Tradition konfrontiert, die bis in die griechische Antike zurückreicht. Zwischen den antiken und den aktuellen Texten vermittelt die philosophisch-ästhetische Auseinandersetzung mit dem Chor, wie sie im 19. Jahrhundert Schiller, A. W. und F. Schlegel, Hegel und Nietzsche führen. Im Zusammenspiel dieser drei Ebenen wird so eine Theorie des Chorischen entwickelt, die Gattungsaspekte und Gemeinschaftstheorien gleichermaßen berücksichtigt und die das ästhetische wie auch das politische Potenzial der untersuchten Texte erschließt.",
				"language": "German",
				"libraryCatalog": "Perlego",
				"publisher": "Konstanz University Press",
				"shortTitle": "Chor und Theorie",
				"url": "https://www.perlego.com/book/2179957/chor-und-theorie-zeitgenssische-theatertexte-von-heiner-mller-bis-ren-pollesch-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Literary Criticism for Comparative Literature"
					},
					{
						"tag": "Literature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/browse/social-sciences/social-science-research-methodology?language=All&publicationDate=&publisher=&author=&format=&page=1",
		"defer": true,
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/1/sheri-khan-tarakai-and-early-village-life-in-the-borderlands-of-northwest-pakistan-bannu-archaeological-project-surveys-and-excavations-19852001-pdf",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Sheri Khan Tarakai and Early Village Life in the Borderlands of North-West Pakistan: Bannu Archaeological Project Surveys and Excavations 1985-2001",
				"creators": [
					{
						"firstName": "Cameron A.",
						"lastName": "Petrie",
						"creatorType": "author"
					},
					{
						"firstName": "Farid",
						"lastName": "Khan",
						"creatorType": "author"
					},
					{
						"firstName": "J. R.",
						"lastName": "Knox",
						"creatorType": "author"
					}
				],
				"date": "2010-05-10",
				"ISBN": "9781842177358",
				"abstractNote": "Between 1985 and 2001, the collaborative research initiative known as the Bannu Archaeological Project conducted archaeological explorations and excavations in the Bannu region, in what was then the North West Frontier Province (NWFP) of Pakistan, now Khyber-Pakhtunkhwa. The Project involves scholars from the Pakistan Heritage Society, the British Museum, the Institute of Archaeology (UCL), Bryn Mawr College and the University of Cambridge. This is the first in a series of volumes that present the final reports of the exploration and excavations carried out by the Bannu Archaeological Project. It marks the first attempt to contextualise the earliest village settlements in northwest Pakistan, along with those situated in other parts of the borderlands zone at the western margins of South Asia. An extensive range of archaeological data from the Bannu Archaeological Project excavations at Sheri Khan Tarakai, including stratigraphic, architectural, ceramic, lithic, small find and bioarchaeological elements, are presented, along with the results of surveys and excavations at several other sites in the Bannu Basin and the adjacent Gomal Plain. The work establishes the nature of the relationships between these sites and other early villages elsewhere in South, central and greater West Asia.",
				"language": "English",
				"libraryCatalog": "Perlego",
				"place": "Havertown",
				"publisher": "Oxbow Books",
				"shortTitle": "Sheri Khan Tarakai and Early Village Life in the Borderlands of North-West Pakistan",
				"url": "https://www.perlego.com/book/1/sheri-khan-tarakai-and-early-village-life-in-the-borderlands-of-northwest-pakistan-bannu-archaeological-project-surveys-and-excavations-19852001-pdf",
				"attachments": [],
				"tags": [
					{
						"tag": "Asian History"
					},
					{
						"tag": "History"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
