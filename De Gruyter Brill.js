{
	"translatorID": "2a5dc3ed-ee5e-4bfb-baad-36ae007e40ce",
	"label": "De Gruyter Brill",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.degruyterbrill\\.com/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-01-23 01:28:45"
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
	let pageCategory = doc.body.getAttribute('data-pagecategory');
	switch (pageCategory) {
		case 'book':
			return 'book';
		case 'chapter':
			return 'bookSection';
		case 'article':
			return 'journalArticle';
		case 'search':
		case 'journal':
		default:
			if (getSearchResults(doc, true)) {
				return "multiple";
			}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.resultTitle > a[href*="/document/"]');
	if (!rows.length) {
		rows = doc.querySelectorAll('li a[href*="/document/"][data-doi]');
	}
	for (let row of rows) {
		let href = row.href;
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

/**
 * @param {Document} doc
 * @param {string} url
 */
function scrape(doc, url) {
	// EM is, as a general rule, better than RIS on this site. It's missing a
	// couple things, though - subtitles, DOIs for books (to the extent that
	// those are useful) - so we'll fill those in manually.

	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		if (item.date) {
			item.date = item.date.replace(/\//g, '-');
		}

		if (item.section && (item.section == item.publicationTitle || item.section == item.bookTitle)) {
			delete item.section;
		}

		let DOI = ZU.cleanDOI(attr(doc, '.doi > a', 'href'));
		if (DOI) {
			item.DOI = DOI;
		}

		item.attachments = [];

		// For literature split into multiple sections (like one PDF per chapter): download each section
		// For example: https://www.degruyterbrill.com/document/doi/10.1515/9781400874064/html#contents
		const allChapters = doc.querySelectorAll(".tableOfContents .toc_entry");
		let matchedAny = false;
		for (let chapter of allChapters) {
			const htmlURL = attr(chapter, 'a.entry-anchor', 'href');
			const pdfURL = htmlURL.replace("/html", "/pdf");
			const title = text(chapter, ".entry-title")
			// const authors = text(chapter, ".entry-authors")
			const entryNumber = text(chapter, ".entry-number"); // typically the start page number of that chapter
			item.attachments.push({
				title: `${title} (${entryNumber})`,
				mimeType: 'application/pdf',
				url: pdfURL,
			});
			matchedAny = true;
		}

		if (!matchedAny) { // not chapter-based, fall back on old system (just looking for a download button)
			let pdfURL = attr(doc, 'a.downloadPdf', 'href');
			if (pdfURL) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: pdfURL
				});
			}
		}

		let subtitle = text(doc, 'h2.subtitle');
		if (subtitle && !item.title.includes(': ')) {
			item.title = `${item.title.trim()}: ${subtitle}`;
		}

		if (item.itemType == 'book' && item.bookTitle) {
			delete item.bookTitle;
		}

		if (item.itemType == 'bookSection') {
			delete item.publicationTitle;
			delete item.abstractNote;
			delete item.rights; // AI training disclaimer!

			let risURL = attr(doc, 'a[title="Download in RIS format"]', 'href');
			if (!risURL) {
				risURL = url.replace(/\/html([?#].*)$/, '/machineReadableCitation/RIS');
			}

			ZU.doGet(risURL, function (risText) {
				// De Gruyter uses TI for the container title and T2 for the subtitle
				// Seems nonstandard! So we'll just handle it here
				let titleMatch = risText.match(/^\s*TI\s*-\s*(.+)/m);
				let subtitleMatch = risText.match(/^\s*T2\s*-\s*(.+)/m);
				if (titleMatch) {
					item.bookTitle = titleMatch[1];
					if (subtitleMatch) {
						item.bookTitle = item.bookTitle.trim() + ': ' + subtitleMatch[1];
					}
				}

				let translator = Zotero.loadTranslator('import');
				translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
				translator.setString(risText);
				translator.setHandler('itemDone', (_obj, risItem) => {
					if (!item.creators.some(c => c.creatorType == 'editor')) {
						item.creators.push(...risItem.creators.filter(c => c.creatorType == 'editor'));
					}
					item.complete();
				});
				translator.translate();
			});
		}
		else {
			item.complete();
		}
	});

	translator.getTranslatorObject(function (trans) {
		let detectedType = detectWeb(doc, url);
		if (detectedType == 'book') {
			// Delete citation_inbook_title if this is actually a book, not a book section
			// Prevents EM from mis-detecting as a bookSection in a way that even setting
			// trans.itemType can't override
			let bookTitleMeta = doc.querySelector('meta[name="citation_inbook_title"]');
			if (bookTitleMeta) {
				bookTitleMeta.remove();
			}
		}
		else if (detectedType == 'bookSection') {
			trans.itemType = 'bookSection';
		}
		trans.addCustomFields({
			// This should be the case by default! But I think the page including
			// both article:section and citation_inbook_title is triggering an
			// EM bug (looking into that is a separate todo).
			citation_inbook_title: 'bookTitle'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.1515/vfzg-2021-0028/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Homosexuelle im modernen Deutschland: Eine Langzeitperspektive auf historische Transformationen",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Schwartz",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01",
				"DOI": "10.1515/vfzg-2021-0028",
				"ISSN": "2196-7121",
				"abstractNote": "Die Geschichte homosexueller Menschen im modernen Deutschland besteht nicht nur aus Verfolgung und Diskriminierung, obschon sie oft als solche erinnert wird. Wohl haben homosexuelle Männer unter massiver Verfolgung gelitten, und auch lesbische Frauen waren vielen Diskriminierungen ausgesetzt. Doch die Geschichte der letzten 200 Jahre weist nicht nur jene Transformation im Umgang mit Homosexualität auf, die ab den 1990er Jahren zur Gleichberechtigung führte, sondern mehrere, inhaltlich sehr verschiedene Umbrüche. Wir haben es weder mit einem Kontinuum der Repression noch mit einer linearen Emanzipationsgeschichte zu tun, sondern mit einer höchst widersprüchlichen langfristigen Entwicklung.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"pages": "377-414",
				"publicationTitle": "Vierteljahrshefte für Zeitgeschichte",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"shortTitle": "Homosexuelle im modernen Deutschland",
				"url": "https://www.degruyterbrill.com/document/doi/10.1515/vfzg-2021-0028/html",
				"volume": "69",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Emancipation"
					},
					{
						"tag": "Homosexuality"
					},
					{
						"tag": "National Socialism"
					},
					{
						"tag": "Penal reform"
					},
					{
						"tag": "Pursuit"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.3138/9781487518806/html",
		"items": [
			{
				"itemType": "book",
				"title": "Picturing Punishment: The Spectacle and Material Afterlife of the Criminal Body in the Dutch Republic",
				"creators": [
					{
						"firstName": "Anuradha",
						"lastName": "Gobin",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"ISBN": "9781487518806",
				"abstractNote": "Bringing together themes in the history of art, punishment, religion, and the history of medicine, Picturing Punishment provides new insights into the wider importance of the criminal to civic life.",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"publisher": "University of Toronto Press",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"shortTitle": "Picturing Punishment",
				"url": "https://www.degruyterbrill.com/document/doi/10.3138/9781487518806/html",
				"attachments": [
					{
						"title": "Frontmatter (i)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Contents (v)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Illustrations (vii)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Acknowledgments (xi)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Introduction (1)",
						"mimeType": "application/pdf"
					},
					{
						"title": "1 Structures of Power: Constructing and Publicizing the New Amsterdam Town Hall (21)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2 Procession and Execution Rituals: Moving through the New Amsterdam Town Hall (48)",
						"mimeType": "application/pdf"
					},
					{
						"title": "3 Disposal and Display: The Criminal Corpse on the Gallows (78)",
						"mimeType": "application/pdf"
					},
					{
						"title": "4 Subversion and Symbolic Transformation: Recreation, Ambush, and Humour at the Gallows (103)",
						"mimeType": "application/pdf"
					},
					{
						"title": "5 Serving the Public Good: Reform, Prestige, and the Productive Criminal Body in Amsterdam (135)",
						"mimeType": "application/pdf"
					},
					{
						"title": "6 The Transformation of Touch: Flayed Skin and the Visual and Material Afterlife of the Criminal Body in the Leiden Anatomical Theatre (158)",
						"mimeType": "application/pdf"
					},
					{
						"title": "7 The Symbolism of Skin: Illustrating the Flayed Body (181)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Conclusion (211)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Notes (217)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Bibliography (245)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Index (275)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Dutch Republic"
					},
					{
						"tag": "Renaissance"
					},
					{
						"tag": "afterlife"
					},
					{
						"tag": "art and crime"
					},
					{
						"tag": "art history"
					},
					{
						"tag": "criminals"
					},
					{
						"tag": "deviance"
					},
					{
						"tag": "early modern"
					},
					{
						"tag": "execution rituals"
					},
					{
						"tag": "gallows"
					},
					{
						"tag": "history of crime"
					},
					{
						"tag": "material culture"
					},
					{
						"tag": "public spectacles"
					},
					{
						"tag": "punishment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.3138/9781487518806-008/html",
		"items": [
			{
				"itemType": "bookSection",
				"title": "5 Serving the Public Good: Reform, Prestige, and the Productive Criminal Body in Amsterdam",
				"creators": [
					{
						"firstName": "Anuradha",
						"lastName": "Gobin",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"ISBN": "9781487518806",
				"bookTitle": "Picturing Punishment: The Spectacle and Material Afterlife of the Criminal Body in the Dutch Republic",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"pages": "135-157",
				"publisher": "University of Toronto Press",
				"shortTitle": "5 Serving the Public Good",
				"url": "https://www.degruyterbrill.com/document/doi/10.3138/9781487518806-008/html",
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
		"url": "https://www.degruyterbrill.com/document/doi/10.1515/ncrs-2021-0236/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Crystal structure of (E)-7-fluoro-2-((6-methoxypyridin-3-yl)methylene)-3,4-dihydronaphthalen-1(2H)-one, C17H14FNO2",
				"creators": [
					{
						"firstName": "Xiang-Yi",
						"lastName": "Su",
						"creatorType": "author"
					},
					{
						"firstName": "Xiao-Fan",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Qing-Guo",
						"lastName": "Meng",
						"creatorType": "author"
					},
					{
						"firstName": "Hong-Juan",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01",
				"DOI": "10.1515/ncrs-2021-0236",
				"ISSN": "2197-4578",
				"abstractNote": "C 17 H 14 FNO 2 , monoclinic, P 2 1 / c (no. 15), a  = 7.3840(6) Å, b  = 10.9208(8) Å, c  = 16.7006(15) Å, β  = 101.032(9)°, V  = 1321.84(19) Å 3 , Z  = 4, R gt ( F ) = 0.0589, wR ref ( F 2 ) = 0.1561, T = 100.00(18) K.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"pages": "1101-1103",
				"publicationTitle": "Zeitschrift für Kristallographie - New Crystal Structures",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"url": "https://www.degruyterbrill.com/document/doi/10.1515/ncrs-2021-0236/html",
				"volume": "236",
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
		"url": "https://www.degruyterbrill.com/document/doi/10.1515/ncrs-2021-0236/html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Crystal structure of (E)-7-fluoro-2-((6-methoxypyridin-3-yl)methylene)-3,4-dihydronaphthalen-1(2H)-one, C17H14FNO2",
				"creators": [
					{
						"firstName": "Xiang-Yi",
						"lastName": "Su",
						"creatorType": "author"
					},
					{
						"firstName": "Xiao-Fan",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Qing-Guo",
						"lastName": "Meng",
						"creatorType": "author"
					},
					{
						"firstName": "Hong-Juan",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01",
				"DOI": "10.1515/ncrs-2021-0236",
				"ISSN": "2197-4578",
				"abstractNote": "C 17 H 14 FNO 2 , monoclinic, P 2 1 / c (no. 15), a  = 7.3840(6) Å, b  = 10.9208(8) Å, c  = 16.7006(15) Å, β  = 101.032(9)°, V  = 1321.84(19) Å 3 , Z  = 4, R gt ( F ) = 0.0589, wR ref ( F 2 ) = 0.1561, T = 100.00(18) K.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"pages": "1101-1103",
				"publicationTitle": "Zeitschrift für Kristallographie - New Crystal Structures",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"url": "https://www.degruyterbrill.com/document/doi/10.1515/ncrs-2021-0236/html",
				"volume": "236",
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
		"url": "https://www.degruyterbrill.com/search?query=test",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/journal/key/mt/67/5/html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.1515/9783110773712-010/html",
		"items": [
			{
				"itemType": "bookSection",
				"title": "10 Skaldic Poetry – Encrypted Communication",
				"creators": [
					{
						"firstName": "Jon Gunnar",
						"lastName": "Jørgensen",
						"creatorType": "author"
					},
					{
						"lastName": "Engh",
						"firstName": "Line Cecilie",
						"creatorType": "editor"
					},
					{
						"lastName": "Gullbekk",
						"firstName": "Svein Harald",
						"creatorType": "editor"
					},
					{
						"lastName": "Orning",
						"firstName": "Hans Jacob",
						"creatorType": "editor"
					}
				],
				"date": "2024-08-19",
				"ISBN": "9783110773712",
				"bookTitle": "Standardization in the Middle Ages: Volume 1: The North",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"pages": "229-250",
				"publisher": "De Gruyter",
				"url": "https://www.degruyterbrill.com/document/doi/10.1515/9783110773712-010/html",
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
		"url": "https://www.degruyterbrill.com/document/doi/10.3138/9781487552978/html",
		"items": [
			{
				"itemType": "book",
				"title": "Freedoms of Speech: Anthropological Perspectives on Language, Ethics, and Power",
				"creators": [],
				"date": "2024-12-16",
				"ISBN": "9781487552978",
				"abstractNote": "This collection brings together leading anthropologists and fresh new voices in the discipline to consider freedoms of speech with a wide comparative lens.",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"publisher": "University of Toronto Press",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"shortTitle": "Freedoms of Speech",
				"url": "https://www.degruyterbrill.com/document/doi/10.3138/9781487552978/html",
				"attachments": [
					{
						"title": "Frontmatter (i)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Contents (v)",
						"mimeType": "application/pdf"
					},
					{
						"title": "List of Figures (ix)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Introduction: Anthropologies of Free Speech (1)",
						"mimeType": "application/pdf"
					},
					{
						"title": "1 Comparing Freedoms: “Liberal Freedom of Speech” in Frontal and Lateral Perspective (33)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2 When Speech Isn’t Free: Varieties of Metapragmatic Struggle (55)",
						"mimeType": "application/pdf"
					},
					{
						"title": "3 Speaking for Oneself: Language Reform and the Confucian Legacy in Late Colonial Vietnam (73)",
						"mimeType": "application/pdf"
					},
					{
						"title": "4 Risking Speech in Islam (94)",
						"mimeType": "application/pdf"
					},
					{
						"title": "5 Ten-and-a-Half Seconds of God’s Silence: Mormon Parrhesia in the Time of Donald Trump (111)",
						"mimeType": "application/pdf"
					},
					{
						"title": "6 Fascism, Real or Stuffed: Ordinary Scepticism at Mussolini’s Grave (131)",
						"mimeType": "application/pdf"
					},
					{
						"title": "7 The Imaginative Power of Language in the Vacated Space of “Free Speech” in Putin-Era Russia (148)",
						"mimeType": "application/pdf"
					},
					{
						"title": "8 Designing Limits on Public Speaking: The Case of Hungary (167)",
						"mimeType": "application/pdf"
					},
					{
						"title": "9 Expression Is Transaction: Talk, Freedom, and Authority when Egalitarians Embrace the State (188)",
						"mimeType": "application/pdf"
					},
					{
						"title": "10 Dissent, Hierarchy, and Value Creation: Liberalism and the Problem of Critique (210)",
						"mimeType": "application/pdf"
					},
					{
						"title": "11 The People’s Radio between Populism and Bullshit (225)",
						"mimeType": "application/pdf"
					},
					{
						"title": "12 Environments for Expression on Palestine: Fields, Fear, and the Politics of Movement (239)",
						"mimeType": "application/pdf"
					},
					{
						"title": "13 Freedom of Speech in Jeju Shamanism (257)",
						"mimeType": "application/pdf"
					},
					{
						"title": "14 Truth of War: Immersive Fiction Reading and Public Modes of Remembrance in an English Literary Society (267)",
						"mimeType": "application/pdf"
					},
					{
						"title": "15 As It Were: Narrative Struggles, Historiopraxy, and the Stakes of the Future in the Documentation of the Syrian Uprising (287)",
						"mimeType": "application/pdf"
					},
					{
						"title": "16 Historical Vertigo: Art, Censorship, and the Contested History of Bangladesh (302)",
						"mimeType": "application/pdf"
					},
					{
						"title": "17 Free Speech, without Listening? Liberalism and the Problem of Reception (319)",
						"mimeType": "application/pdf"
					},
					{
						"title": "18 An American Canard: The Freedom of (Therapeutic) Speech (344)",
						"mimeType": "application/pdf"
					},
					{
						"title": "19 Therapeutic Politics and the Performance of Reparation: A Dialogical Approach to Mental Health Care in the UK (360)",
						"mimeType": "application/pdf"
					},
					{
						"title": "20 Secrecy, Curse, Psychiatrist, Saint: Scandals of Sexuality and Censorship in Global/Indian Publics (371)",
						"mimeType": "application/pdf"
					},
					{
						"title": "References (391)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Contributors (443)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Index (449)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "censors"
					},
					{
						"tag": "censorship"
					},
					{
						"tag": "defamation"
					},
					{
						"tag": "dissent"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "fascism"
					},
					{
						"tag": "free speech Islam"
					},
					{
						"tag": "free speech Russia"
					},
					{
						"tag": "freedom of speech"
					},
					{
						"tag": "human rights"
					},
					{
						"tag": "linguistics"
					},
					{
						"tag": "politics of free speech"
					},
					{
						"tag": "press freedom"
					},
					{
						"tag": "speech debates"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.1515/9783111233758/html",
		"items": [
			{
				"itemType": "book",
				"title": "Internet Lexicography: An Introduction",
				"creators": [],
				"date": "2024-11-04",
				"ISBN": "9783111233758",
				"abstractNote": "The Internet has become the central publication platform for dictionaries. This profound change in the dictionary landscape gives rise to a whole range of new questions for lexicographic practice and dictionary research. This volume provides for the first time an introduction to the central fields of work in Internet lexicography and presents the current state of scientific research and lexicographic practice. The chapters cover key aspects of dictionary creation, such as the technical framework, data modeling, and lexicographic process, linking dictionary content, access and navigation structures, automatic extraction of lexicographic information, user participation, and research on dictionary use. The aim of this volume is to provide students and teachers (at universities) with an introductory and easy-to-read overview on Internet lexicography, thus anchoring this important and innovative field of research and practice in university teaching. All chapters convey the basic concepts and methods in a comprehensible way and are enriched by references to further and more in-depth reading.",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"publisher": "De Gruyter",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"shortTitle": "Internet Lexicography",
				"url": "https://www.degruyterbrill.com/document/doi/10.1515/9783111233758/html",
				"attachments": [
					{
						"title": "Frontmatter (I)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Preface (V)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Contents (VII)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Introduction (1)",
						"mimeType": "application/pdf"
					},
					{
						"title": "1 The Technological Context for Internet Lexicography (5)",
						"mimeType": "application/pdf"
					},
					{
						"title": "2 A Typology of Internet Dictionaries and Portals (31)",
						"mimeType": "application/pdf"
					},
					{
						"title": "3 The Lexicographic Process (61)",
						"mimeType": "application/pdf"
					},
					{
						"title": "4 Data Modelling (97)",
						"mimeType": "application/pdf"
					},
					{
						"title": "5 Linking and Access Structures (133)",
						"mimeType": "application/pdf"
					},
					{
						"title": "6 The Design of Internet Dictionaries (171)",
						"mimeType": "application/pdf"
					},
					{
						"title": "7 The Automatic Extraction of Lexicographic Information (191)",
						"mimeType": "application/pdf"
					},
					{
						"title": "8 User Participation (227)",
						"mimeType": "application/pdf"
					},
					{
						"title": "9 Research into Dictionary Use (261)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Index (305)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Lexicography"
					},
					{
						"tag": "digital language tools"
					},
					{
						"tag": "language documentation"
					},
					{
						"tag": "linguistics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.31826/9781463235949-008/html",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Did Isaiah Really See God? The Ancient Discussion About Isaiah 6:1",
				"creators": [
					{
						"firstName": "Magnar",
						"lastName": "Kartveit",
						"creatorType": "author"
					},
					{
						"lastName": "Zehnder",
						"firstName": "Markus",
						"creatorType": "editor"
					}
				],
				"date": "2014-05-14",
				"ISBN": "9781463235949",
				"bookTitle": "New Studies in the Book of Isaiah: Essays in Honor of Hallvard Hagelia",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"pages": "115-136",
				"publisher": "Gorgias Press",
				"shortTitle": "Did Isaiah Really See God?",
				"url": "https://www.degruyterbrill.com/document/doi/10.31826/9781463235949-008/html",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.degruyterbrill.com/document/doi/10.1515/9781400874064/html#contents",
		"items": [
			{
				"itemType": "book",
				"title": "The Princeton History of Modern Ireland",
				"creators": [],
				"date": "2016-01-12",
				"ISBN": "9781400874064",
				"abstractNote": "An accessible and innovative look at Irish history by some of today's most exciting historians of Ireland This book brings together some of today's most exciting scholars of Irish history to chart the pivotal events in the history of modern Ireland while providing fresh perspectives on topics ranging from colonialism and nationalism to political violence, famine, emigration, and feminism. The Princeton History of Modern Ireland takes readers from the Tudor conquest in the sixteenth century to the contemporary boom and bust of the Celtic Tiger, exploring key political developments as well as major social and cultural movements. Contributors describe how the experiences of empire and diaspora have determined Ireland’s position in the wider world and analyze them alongside domestic changes ranging from the Irish language to the economy. They trace the literary and intellectual history of Ireland from Jonathan Swift to Seamus Heaney and look at important shifts in ideology and belief, delving into subjects such as religion, gender, and Fenianism. Presenting the latest cutting-edge scholarship by a new generation of historians of Ireland, The Princeton History of Modern Ireland features narrative chapters on Irish history followed by thematic chapters on key topics. The book highlights the global reach of the Irish experience as well as commonalities shared across Europe, and brings vividly to life an Irish past shaped by conquest, plantation, assimilation, revolution, and partition.",
				"language": "en",
				"libraryCatalog": "www.degruyterbrill.com",
				"publisher": "Princeton University Press",
				"rights": "De Gruyter expressly reserves the right to use all content for commercial text and data mining within the meaning of Section 44b of the German Copyright Act.",
				"url": "https://www.degruyterbrill.com/document/doi/10.1515/9781400874064/html",
				"attachments": [
					{
						"title": "Frontmatter (i)",
						"mimeType": "application/pdf"
					},
					{
						"title": "CONTENTS (v)",
						"mimeType": "application/pdf"
					},
					{
						"title": "ACKNOWLEDGMENTS (vii)",
						"mimeType": "application/pdf"
					},
					{
						"title": "CONTRIBUTORS (ix)",
						"mimeType": "application/pdf"
					},
					{
						"title": "INTRODUCTION (1)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 1. CONQUEST, CIVILIZATION, COLONIZATION: IRELAND, 1540– 1660 (21)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 2. ASCENDANCY IRELAND, 1660– 1800 (48)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 3. IRELAND UNDER THE UNION, 1801– 1922 (74)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 4. INDEPENDENT IRELAND (109)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 5. NORTHERN IRELAND since 1920 (141)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 6. TWENTY- FIRST- CENTURY IRELAND (168)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 7. INTELLECTUAL HISTORY: WILLIAM KING to EDMUND BURKE (193)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 8. CULTURAL DEVELOPMENTS: YOUNG IRELAND to YEATS (217)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 9. IRISH MODERNISM and ITS LEGACIES (236)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 10. MEDIA and CULTURE in IRELAND, 1960– 2008 (253)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 11. HISTORIOGRAPHY (271)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 12. RELIGION (292)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 13 THE IRISH LANGUAGE (320)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 14. IRELAND and EMPIRE (343)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 15. WOMEN and GENDER in MODERN IRELAND (361)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 16. POLITICAL VIOLENCE (382)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter. 17 FAMINE (403)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 18. ECONOMY in INDEPENDENT IRELAND (425)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 19. NATIONALISMS (447)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 20. FEMINISM (470)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Chapter 21. DIASPORA (490)",
						"mimeType": "application/pdf"
					},
					{
						"title": "INDEX (509)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Activism"
					},
					{
						"tag": "Anglo-Irish people"
					},
					{
						"tag": "British Empire"
					},
					{
						"tag": "Cambridge University Press"
					},
					{
						"tag": "Catholic emancipation"
					},
					{
						"tag": "Celtic Tiger"
					},
					{
						"tag": "Charles Stewart Parnell"
					},
					{
						"tag": "Church of Ireland"
					},
					{
						"tag": "Clergy"
					},
					{
						"tag": "Confiscation"
					},
					{
						"tag": "Criticism"
					},
					{
						"tag": "Daniel O'Connell"
					},
					{
						"tag": "Dublin Castle"
					},
					{
						"tag": "Economy of the Republic of Ireland"
					},
					{
						"tag": "Emigration"
					},
					{
						"tag": "Employment"
					},
					{
						"tag": "Historiography"
					},
					{
						"tag": "Ideology"
					},
					{
						"tag": "Irish Catholic"
					},
					{
						"tag": "Irish Parliamentary Party"
					},
					{
						"tag": "Irish Rebellion of 1798"
					},
					{
						"tag": "Irish Republican Army (1922–69)"
					},
					{
						"tag": "Irish Republican Brotherhood"
					},
					{
						"tag": "Irish literature"
					},
					{
						"tag": "Irish nationalism"
					},
					{
						"tag": "Irish people"
					},
					{
						"tag": "Irish republicanism"
					},
					{
						"tag": "Land War"
					},
					{
						"tag": "Legislation"
					},
					{
						"tag": "Literature"
					},
					{
						"tag": "Lord Lieutenant"
					},
					{
						"tag": "Modernity"
					},
					{
						"tag": "Narrative"
					},
					{
						"tag": "Nationality"
					},
					{
						"tag": "New Departure (Democrats)"
					},
					{
						"tag": "Newspaper"
					},
					{
						"tag": "Oliver Cromwell"
					},
					{
						"tag": "Orange Order"
					},
					{
						"tag": "Oxford University Press"
					},
					{
						"tag": "Parliament of the United Kingdom"
					},
					{
						"tag": "Patriotism"
					},
					{
						"tag": "Persecution"
					},
					{
						"tag": "Poetry"
					},
					{
						"tag": "Political violence"
					},
					{
						"tag": "Politician"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Popular sovereignty"
					},
					{
						"tag": "Post-war"
					},
					{
						"tag": "Protectionism"
					},
					{
						"tag": "Protestantism"
					},
					{
						"tag": "Provisional Irish Republican Army"
					},
					{
						"tag": "Publication"
					},
					{
						"tag": "Republicanism"
					},
					{
						"tag": "Revolutionary generation"
					},
					{
						"tag": "Separatism"
					},
					{
						"tag": "Slavery"
					},
					{
						"tag": "Sovereignty"
					},
					{
						"tag": "Suffrage"
					},
					{
						"tag": "Toleration"
					},
					{
						"tag": "Ulster Unionist Party"
					},
					{
						"tag": "Ulster Volunteer Force"
					},
					{
						"tag": "Unionism in Ireland"
					},
					{
						"tag": "United Kingdom"
					},
					{
						"tag": "University College Dublin"
					},
					{
						"tag": "W. B. Yeats"
					},
					{
						"tag": "War"
					},
					{
						"tag": "Wealth"
					},
					{
						"tag": "Writing"
					},
					{
						"tag": "Young Ireland"
					},
					{
						"tag": "Éamon de Valera"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
