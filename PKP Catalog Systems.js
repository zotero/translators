{
	"translatorID": "99b62ba4-065c-4e83-a5c0-d8cc0c75d388",
	"label": "PKP Catalog Systems",
	"creator": "Aurimas Vinckevicius and Abe Jellinek",
	"target": "/(article|preprint|issue)/view/|/catalog/book/|/search/search|/index\\.php/default",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-24 00:00:56"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012-2021 Aurimas Vinckevicius and Abe Jellinek

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
	let generator = attr(doc, 'meta[name="generator"]', 'content')
		|| text(doc, '#developedBy');
	if (!generator && doc.body.id.includes('openJournalSystems')) {
		generator = 'Open Journal Systems';
	}
	
	if (generator.startsWith('Open ')
		&& (url.includes('/search/search')
			|| doc.querySelector('.obj_issue_toc .cmp_article_list')
			|| doc.querySelector('#content > .tocArticle'))) {
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		else {
			return false;
		}
	}
	if (generator.startsWith('Open Journal Systems')) {
		return 'journalArticle';
	}
	if (generator.startsWith('Open Monograph Press')) {
		return 'book';
	}
	if (generator.startsWith('Open Preprint Systems')) {
		return 'report';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.title a[href*="/view/"], .title a[href*="/catalog/"], \
		.tocTitle a[href*="/view/"], .tocTitle a[href*="/catalog/"]');
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
		// In OJS 3, up to at least version 3.1.1-2, the PDF view does not
		// include metadata, so we must get it from the article landing page.
		var urlParts = url.match(/(.+\/[^/]+\/view\/)([^/]+)\/[^/]+/);
		if (urlParts) { // PDF view
			ZU.processDocuments(urlParts[1] + urlParts[2], scrape);
		}
		else { // Article view
			scrape(doc, url);
		}
	}
}

function scrape(doc, url) {
	// use Embeded Metadata
	var trans = Zotero.loadTranslator('web');
	trans.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	trans.setDocument(doc);

	trans.setHandler('itemDone', function (obj, item) {
		if (item.itemType == 'report') {
			// preprint
			item.extra = (item.extra || '') + `\ntype: article\n`;
		}
		
		if (!item.title) {
			item.title = text(doc, '#articleTitle');
		}
		
		if (item.creators.length == 0) {
			var authorString = doc.getElementById("authorString");
			if (authorString) {
				var authorsList = authorString.textContent.split(',');
				for (let i = 0; i < authorsList.length; i++) {
					item.creators.push(ZU.cleanAuthor(authorsList[i], "author"));
				}
			}
		}
		
		// OJS journal abbreviations are rarely correct. sometimes they're
		// generated from the journal's URL slug, other times they're just the
		// number "1", or the full name of the journal, or an abbreviation that
		// isn't correct according to ISO 4 or the journal's editors
		// (see MeteoHistory test).
		delete item.journalAbbreviation;

		var doiNode = doc.getElementById('pub-id::doi');
		if (!doiNode) doiNode = doc.querySelector('.pubid .value');
		if (!item.DOI && doiNode) {
			item.DOI = doiNode.textContent;
		}
		
		if (item.itemType == 'journalArticle') {
			// abstract is supplied in DC:description, so it ends up in extra
			// abstractNote is pulled from description, which is same as title
			item.abstractNote = item.extra;
			item.extra = undefined;
		}

		// if we still don't have abstract, we can try scraping from page
		if (!item.abstractNote) {
			item.abstractNote = ZU.xpathText(doc, '//div[@id="articleAbstract"]/div[1]')
				|| ZU.xpathText(doc, '//div[contains(@class, "main_entry")]/div[contains(@class, "abstract")]');
		}
		
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.trim().replace(/^Abstract:?\s*/, '');
		}

		if (!item.abstractNote) {
			item.abstractNote = attr(doc, 'meta[name="DC.Description"]', 'content');
		}

		if (!item.ISBN) {
			item.ISBN = ZU.cleanISBN(text(doc, '.identification_code .value'));
		}
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		else {
			item.date = ZU.strToISO(
				attr(doc, 'meta[name="DC.Date.modified"]', 'content')
					|| attr(doc, 'meta[name="DC.Date.created"]', 'content')
			);
		}
		
		if (item.volume == '0') {
			item.volume = '';
		}
		
		if (item.institution) {
			item.institution = '';
		}
		
		var pdfAttachment = false;
		
		// some journals link to a PDF view page in the header, not the PDF itself
		for (let i = 0; i < item.attachments.length; i++) {
			if (item.attachments[i].mimeType == 'application/pdf') {
				pdfAttachment = true;
				item.attachments[i].url = item.attachments[i].url.replace('/view/', '/download/');
			}
			else if (item.attachments[i].title == 'Snapshot') {
				item.attachments.splice(i--, 1); // delete it
			}
		}
		
		var pdfUrl = doc.querySelector("a.pdf");
		// add linked PDF if there isn't one listed in the header
		if (!pdfAttachment && pdfUrl) {
			pdfAttachment = true;
			item.attachments.push({
				title: "Full Text PDF",
				mimeType: "application/pdf",
				url: pdfUrl.href.replace('/view/', '/download/')
			});
		}
		
		// add linked PDF if there isn't one listed in the header
		if (!pdfAttachment) {
			for (let link of doc.querySelectorAll("a.obj_galley_link")) {
				if (link.textContent.includes('PDF')) {
					pdfAttachment = true;
					item.attachments.push({
						title: "Full Text PDF",
						mimeType: "application/pdf",
						url: link.href.replace('/view/', '/download/')
					});
					break;
				}
			}
		}
		
		item.complete();
	});

	trans.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals.linguisticsociety.org/elanguage/dad/article/view/362.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On Incrementality in Dialogue: Evidence from Compound Contributions",
				"creators": [
					{
						"firstName": "Christine",
						"lastName": "Howes",
						"creatorType": "author"
					},
					{
						"firstName": "Matthew",
						"lastName": "Purver",
						"creatorType": "author"
					},
					{
						"firstName": "Patrick G. T.",
						"lastName": "Healey",
						"creatorType": "author"
					},
					{
						"firstName": "Gregory",
						"lastName": "Mills",
						"creatorType": "author"
					},
					{
						"firstName": "Eleni",
						"lastName": "Gregoromichelaki",
						"creatorType": "author"
					}
				],
				"date": "2011-05-11",
				"DOI": "10.5087/d&d.v2i1.362",
				"ISSN": "2152-9620",
				"abstractNote": "Spoken contributions in dialogue often continue or complete earlier contributions by either the same or a different speaker. These compound contributions (CCs) thus provide a natural context for investigations of incremental processing in dialogue.\n\nWe present a corpus study which confirms that CCs are a key dialogue phenomenon: almost 20% of contributions fit our general definition of CCs, with nearly 3% being the cross-person case most often studied. The results suggest that processing is word-by-word incremental, as splits can occur within syntactic constituents; however, some systematic differences between same- and cross-person cases indicate important dialogue-specific pragmatic effects. An experimental study then investigates these effects by artificially introducing CCs into multi-party text dialogue. Results suggest that CCs affect peoples expectations about who will speak next and whether other participants have formed a coalition or party.\n\nTogether, these studies suggest that CCs require an incremental processing mechanism that can provide a resource for constructing linguistic constituents that span multiple contributions and multiple participants. They also suggest the need to model higher-level dialogue units that have consequences for the organisation of turn-taking and for the development of a shared context.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "journals.linguisticsociety.org",
				"pages": "279-311",
				"publicationTitle": "Dialogue & Discourse",
				"shortTitle": "On Incrementality in Dialogue",
				"url": "http://journals.linguisticsociety.org/elanguage/dad/article/view/362.html",
				"volume": "2",
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
		"url": "http://www.ijdc.net/index.php/ijdc/article/view/8.2.5/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Disciplinary differences in faculty research data management practices and perspectives",
				"creators": [
					{
						"firstName": "Katherine G.",
						"lastName": "Akers",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer",
						"lastName": "Doty",
						"creatorType": "author"
					}
				],
				"date": "2013-11-21",
				"DOI": "10.2218/ijdc.v8i2.263",
				"ISSN": "1746-8256",
				"abstractNote": "Academic librarians are increasingly engaging in data curation by providing infrastructure (e.g., institutional repositories) and offering services (e.g., data management plan consultations) to support the management of research data on their campuses. Efforts to develop these resources may benefit from a greater understanding of disciplinary differences in research data management needs. After conducting a survey of data management practices and perspectives at our research university, we categorized faculty members into four research domains—arts and humanities, social sciences, medical sciences, and basic sciences—and analyzed variations in their patterns of survey responses. We found statistically significant differences among the four research domains for nearly every survey item, revealing important disciplinary distinctions in data management actions, attitudes, and interest in support services. Serious consideration of both the similarities and dissimilarities among disciplines will help guide academic librarians and other data curation professionals in developing a range of data-management services that can be tailored to the unique needs of different scholarly researchers.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.ijdc.net",
				"pages": "5-26",
				"publicationTitle": "International Journal of Digital Curation",
				"rights": "Copyright (c)",
				"url": "http://www.ijdc.net/index.php/ijdc/article/view/8.2.5/",
				"volume": "8",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "DCC"
					},
					{
						"tag": "IJDC"
					},
					{
						"tag": "International Journal of Digital Curation"
					},
					{
						"tag": "curation"
					},
					{
						"tag": "digital curation"
					},
					{
						"tag": "digital preservation"
					},
					{
						"tag": "preservation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.ub.uni-heidelberg.de/index.php/ip/article/view/31976/26301",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anleitung zur Organisation von Webkonferenzen am Beispiel der “Bibcast”-Aktion zum Bibliothekskongress 2016",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Beucke",
						"creatorType": "author"
					},
					{
						"firstName": "Arvid",
						"lastName": "Deppe",
						"creatorType": "author"
					},
					{
						"firstName": "Tracy",
						"lastName": "Hoffmann",
						"creatorType": "author"
					},
					{
						"firstName": "Felix",
						"lastName": "Lohmeier",
						"creatorType": "author"
					},
					{
						"firstName": "Christof",
						"lastName": "Rodejohann",
						"creatorType": "author"
					},
					{
						"firstName": "Pascal Ngoc Phu",
						"lastName": "Tu",
						"creatorType": "author"
					}
				],
				"date": "2016-08-16",
				"DOI": "10.11588/ip.2016.2.31976",
				"ISSN": "2297-3249",
				"abstractNote": "Zwischen dem 7. und 11. März 2016 fand der erste Bibcast, eine Webcast-Serie zu bibliothekarisch relevanten Themen statt. Aus der Idee heraus entstanden, abgelehnten Einreichungen für den Bibliothekskongress ein alternatives Forum zu bieten, hat sich der Bibcast als interessantes, flexibles und innovatives Format herausgestellt, das die Landschaft der Präsenzkonferenzen zukünftig sinnvoll ergänzen kann. In diesem Praxisbeitrag soll über Entstehung und Ablauf berichtet, Mehrwerte und Stolpersteine veranschaulicht und damit zugleich eine Anleitung zur Organisation von Webkonferenzen gegeben werden.",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "journals.ub.uni-heidelberg.de",
				"publicationTitle": "Informationspraxis",
				"rights": "Copyright (c) 2016 Daniel Beucke, Arvid Deppe, Tracy Hoffmann, Felix Lohmeier, Christof Rodejohann, Pascal Ngoc Phu Tu",
				"url": "https://journals.ub.uni-heidelberg.de/index.php/ip/article/view/31976",
				"volume": "2",
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
		"url": "http://www.mediaesthetics.org/index.php/mae/article/view/50",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "World War II in American Movie Theatres from 1942-45: On Images of Civilian and Military Casualties and the Negotiation of a Shared Experience",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Gaertner",
						"creatorType": "author"
					}
				],
				"date": "2016-06-23",
				"DOI": "10.17169/mae.2016.50",
				"ISSN": "2567-9309",
				"abstractNote": "This study deals with the question of genre cinema in terms of an aesthetic experience that also accounts for a shared experience. The focus will be on the historical framework that constituted the emotional mobilization of the American public during World War II when newsreels and fictional war films were screened together as part of the staple program in movie theaters. Drawing on existing concepts of cinema and public sphere as well as on a phenomenological theory of spectator engagement this study sets out to propose a definition of the term moviegoing experience. On these grounds a historiographical account of the institutional practice of staple programming shall be explored together with a theoretical conceptualization of the spectator within in the realm of genre cinema.Diese Studie befragt das Genrekino als Modus ästhetischer Erfahrung in Hinblick auf die konkrete geteilten Erfahrung des Kinosaals. Der Fokus liegt auf den historischen Rahmenbedingen der emotionalen Mobilisierung der US-amerikanischen Öffentlichkeit während des Zweiten Weltkriegs und der gemeinsamen Vorführung von Kriegsnachrichten und fiktionalen Kriegsfilmen in Kinoprogrammen. Dabei wird auf Konzepte des Kinos als öffentlichem Raum und auf phänomenologische Theorien der Zuschaueradressierung Bezug genommen und ein integrative Definition der moviegoing experience entworfen. Dadurch ist es möglich, historiographische Schilderungen der institutionalisierten Praktiken der Kinoprogrammierung mit theoretischen Konzeptualisierungen der Zuschauererfahrung und des Genrekinos ins Verhältnis zu setzen.David Gaertner, M.A. is currently writing his dissertation on the cinematic experience of World War II and is a lecturer at the division of Film Studies at Freie Universität Berlin. From 2011 to 2014 he was research associate in the project “Staging images of war as a mediated experience of community“. He is co-editor of the book “Mobilisierung der Sinne. Der Hollywood-Kriegsfilm zwischen Genrekino und Historie” (Berlin 2013). // David Gaertner, M.A. arbeitet an einer Dissertation zur Kinoerfahrung im Zweiten Weltkrieg und lehrt am Seminar für Filmwissenschaft an der Freien Universität Berlin. 2011 bis 2014 war er wissenschaftlicher Mitarbeiter im DFG-Projekt „Inszenierungen des Bildes vom Krieg als Medialität des Gemeinschaftserlebens“. Er ist Mitherausgeber des Sammelbands “Mobilisierung der Sinne. Der Hollywood-Kriegsfilm zwischen Genrekino und Historie” (Berlin 2013).",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.mediaesthetics.org",
				"publicationTitle": "mediaesthetics – Journal of Poetics of Audiovisual Images",
				"rights": "Copyright (c) 2016 David Gaertner",
				"shortTitle": "World War II in American Movie Theatres from 1942-45",
				"url": "http://www.mediaesthetics.org/index.php/mae/article/view/50",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.qualitative-research.net/index.php/fqs/article/view/2477",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Computer Analysis of Qualitative Data in Literature and Research Performed by Polish Sociologists",
				"creators": [
					{
						"firstName": "Jakub",
						"lastName": "Niedbalski",
						"creatorType": "author"
					},
					{
						"firstName": "Izabela",
						"lastName": "Ślęzak",
						"creatorType": "author"
					}
				],
				"date": "2016-07-28",
				"DOI": "10.17169/fqs-17.3.2477",
				"ISSN": "1438-5627",
				"abstractNote": "The application of computer-assisted qualitative data analysis software (CAQDAS) in the field of qualitative sociology is becoming more popular. However, in Polish scientific research, the use of computer software to aid qualitative data analysis is uncommon. Nevertheless, the Polish qualitative research community is turning to CAQDAS software increasingly often. One noticeable result of working with CAQDAS is an increase in methodological awareness, which is reflected in higher accuracy and precision in qualitative data analysis. Our purpose in this article is to describe the qualitative researchers' environment in Poland and to consider the use of computer-assisted qualitative data analysis. In our deliberations, we focus mainly on the social sciences, especially sociology.URN: http://nbn-resolving.de/urn:nbn:de:0114-fqs160344",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.qualitative-research.net",
				"publicationTitle": "Forum Qualitative Sozialforschung / Forum: Qualitative Social Research",
				"rights": "Copyright (c) 2016 Jakub Niedbalski, Izabela Ślęzak",
				"url": "https://www.qualitative-research.net/index.php/fqs/article/view/2477",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "CAQDAS"
					},
					{
						"tag": "Polish sociology"
					},
					{
						"tag": "computer-assisted qualitative data analysis"
					},
					{
						"tag": "qualitative research"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23541",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On the Threshold of the \"Land of Marvels:\" Alexandra David-Neel in Sikkim and the Making of Global Buddhism",
				"creators": [
					{
						"firstName": "Samuel",
						"lastName": "Thévoz",
						"creatorType": "author"
					}
				],
				"date": "2016-07-21",
				"DOI": "10.17885/heiup.ts.23541",
				"ISSN": "2191-6411",
				"abstractNote": "Alexandra David-Neel had already been acquainted with the Himalayas for a long time before the visits to Tibet in 1924 that would make her a mainstream figure of modern Buddhism. In fact, her encounter with Tibet and Tibetan Buddhism can be linked with Sikkim, where she arrived in 1912 after visiting India. An exploration of her Sikkim stay invites us to reconsider the self-fashioning of David-Neel’s image as an explorer of what she called the “land of marvels.” This paper highlights her construction of Sikkim as the locality that helped her create her singular vision of Tibet. Her encounters with local Buddhists in Sikkim provided her with the lofty images of a spiritual Tibet that she contributed to publicizing in the wake of the globalization of Buddhism.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "heiup.uni-heidelberg.de",
				"pages": "149-186",
				"publicationTitle": "The Journal of Transcultural Studies",
				"rights": "Copyright (c) 2016 Samuel Thevoz",
				"shortTitle": "On the Threshold of the \"Land of Marvels",
				"url": "https://heiup.uni-heidelberg.de/journals/index.php/transcultural/article/view/23541",
				"volume": "7",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "World Literature"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zeitschrift-fuer-balkanologie.de/index.php/zfb/article/view/423",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nachträge zur Bio-Bibliographie von Ármin(ius) Vámbéry [V]",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Knüppel",
						"creatorType": "author"
					}
				],
				"date": "2016-03-18",
				"ISSN": "0044-2356",
				"abstractNote": "Der Verfasser setzt mit diesem Beitrag seine Serie, in der Ergänzungen und Korrekturen zur Bio-Bibliographie des großen ungarischen Reisenden und Entdeckers sowie Pioniers der Zentralasienforschung Á. Vámbéry (1832–1913) gegeben wurden, fort. Zudem findet sich im Anhang zum bio-bibliographischen Teil des Beitrags ein Brief Vámbérys an den Ethnologen und Geographen Richard Andree (1835–1912).",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.zeitschrift-fuer-balkanologie.de",
				"publicationTitle": "Zeitschrift für Balkanologie",
				"rights": "Copyright (c) 2016 Harrassowitz Verlag",
				"url": "http://www.zeitschrift-fuer-balkanologie.de/index.php/zfb/article/view/423",
				"volume": "51",
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
		"url": "https://journals.ub.uni-heidelberg.de/index.php/miradas/article/view/22445",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Un desafío a la construcción de la identidad en la fotografía de Carlos Ruiz-Valarino",
				"creators": [
					{
						"firstName": "Laura Bravo",
						"lastName": "López",
						"creatorType": "author"
					}
				],
				"date": "2015-07-21",
				"DOI": "10.11588/mira.2015.0.22445",
				"ISSN": "2363-8087",
				"abstractNote": "La obra fotográfica del artista puertorriqueño Carlos Ruiz-Valarino plantea un marcado contraste con una de las tradiciones más arraigadas en la historia del arte de esta isla del Caribe, que es la representación de una identidad cultural construida a través de símbolos. Recurriendo a la parodia a través de tres géneros pictóricos, como son el paisaje, el retrato y el objeto (en el marco de la naturaleza muerta), Ruiz-Valarino cuestiona los símbolos que reiteradamente se emplean en la construcción de un concepto tan controvertido como es el de identidad, conversando para ello con la tradición iconográfica de la fotografía antropológica y etnográfica, así como la de la ilustración científica o la caricatura.",
				"language": "es",
				"libraryCatalog": "journals.ub.uni-heidelberg.de",
				"pages": "36-49",
				"publicationTitle": "Miradas - Zeitschrift für Kunst- und Kulturgeschichte der Amérikas und der iberischen Halbinsel",
				"rights": "Copyright (c) 2015",
				"url": "https://journals.ub.uni-heidelberg.de/index.php/miradas/article/view/22445",
				"volume": "2",
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
		"url": "https://ojs.ub.uni-konstanz.de/ba/article/view/6175",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Was kann Plagiatserkennungs-Software?",
				"creators": [
					{
						"firstName": "Ansgar",
						"lastName": "Schäfer",
						"creatorType": "author"
					}
				],
				"date": "2015-05-17",
				"abstractNote": "-",
				"issue": "99",
				"language": "de",
				"libraryCatalog": "ojs.ub.uni-konstanz.de",
				"publicationTitle": "Bibliothek aktuell",
				"rights": "Copyright (c) 2015 Willkommen bei Bibliothek aktuell",
				"url": "https://ojs.ub.uni-konstanz.de/ba/article/view/6175",
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
		"url": "http://www.querelles.de/index.php/qjb/article/view/29",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anonymität nach dem Tod: Subjektive Deutungen anonymer Bestattung und genderbezogene Differenzen",
				"creators": [
					{
						"firstName": "Nicole",
						"lastName": "Sachmerda-Schulz",
						"creatorType": "author"
					},
					{
						"firstName": "Paul Sebastian",
						"lastName": "Ruppel",
						"creatorType": "author"
					}
				],
				"date": "2014-04-10",
				"DOI": "10.15461/29",
				"ISSN": "2191-9127",
				"abstractNote": "Anonyme Bestattungen haben in den letzten Jahrzehnten in Deutschland stark zugenommen. Damit hat sich neben traditionellen Formen der Bestattung und Grabgestaltung eine Beisetzungsform etablieren können, bei der das Grab nicht namentlich gekennzeichnet und daher für die Öffentlichkeit sowie häufig auch für Angehörige nicht auffindbar ist. Der Frage, was es bedeutet, bei der Grabwahl auf die Namensnennung und damit auf die Lokalisierung der persönlichen Grabstätte zu verzichten, wird im Beitrag anhand offener Leitfadeninterviews mit Personen, die sich für eine anonyme Bestattung entschieden haben, nachgegangen. In der Analyse der im Rahmen einer Grounded-Theory-Studie erhobenen und ausgewerteten Daten werden Aspekte deutlich, die sich zum Beispiel um Kontrollierbarkeit eigener Belange bis über den Tod hinaus, ein auf Inklusion und Exklusion abzielendes Handeln sowie scheinbar paradoxe Momente von Individualitätsstreben drehen. Zudem zeigen sich hier auffällige Differenzen zwischen Frauen und Männern: Die Präsentation bzw. Repräsentation von Weltanschauungen und Werthaltungen stellt für die Interviewpartner eine Triebfeder für die Entscheidung für eine Anonymbestattung dar. Aussagen der Interviewpartnerinnen indes verweisen darauf, dass diese Entscheidung primär einer pragmatischen und am sozialen Umfeld ausgerichteten Orientierung folgt.",
				"issue": "0",
				"language": "de",
				"libraryCatalog": "www.querelles.de",
				"publicationTitle": "QJB – Querelles. Jahrbuch für Frauen- und Geschlechterforschung",
				"rights": "Copyright (c) 2014 Nicole Sachmerda-Schulz, Paul Sebastian Ruppel",
				"shortTitle": "Anonymität nach dem Tod",
				"url": "http://www.querelles.de/index.php/qjb/article/view/29",
				"volume": "17",
				"attachments": [],
				"tags": [
					{
						"tag": "Anonymität"
					},
					{
						"tag": "Bestattung"
					},
					{
						"tag": "Genderdifferenzen"
					},
					{
						"tag": "Säkularisierung"
					},
					{
						"tag": "Tod"
					},
					{
						"tag": "anonymity"
					},
					{
						"tag": "burial"
					},
					{
						"tag": "death"
					},
					{
						"tag": "gender difference"
					},
					{
						"tag": "secularisation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"creators": [
					{
						"firstName": "Akinwumi A.",
						"lastName": "Akinyede",
						"creatorType": "author"
					},
					{
						"firstName": "Alade",
						"lastName": "Akintonwa",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Okany",
						"creatorType": "author"
					},
					{
						"firstName": "Olufunsho",
						"lastName": "Awodele",
						"creatorType": "author"
					},
					{
						"firstName": "Duro C.",
						"lastName": "Dolapo",
						"creatorType": "author"
					},
					{
						"firstName": "Adebimpe",
						"lastName": "Adeyinka",
						"creatorType": "author"
					},
					{
						"firstName": "Ademola",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2011-10-17",
				"DOI": "10.4314/thrb.v13i4.63347",
				"ISSN": "1821-9241",
				"abstractNote": "The synergistic interaction between Human Immunodeficiency virus (HIV) disease and Malaria makes it mandatory for patients with HIV to respond appropriately in preventing and treating malaria. Such response will help to control the two diseases. This study assessed the knowledge of 495 patients attending the HIV clinic, in Lagos University Teaching Hospital, Nigeria.  Their treatment seeking, preventive practices with regards to malaria, as well as the impact of socio – demographic / socio - economic status were assessed. Out of these patients, 245 (49.5 %) used insecticide treated bed nets; this practice was not influenced by socio – demographic or socio – economic factors.  However, knowledge of the cause, knowledge of prevention of malaria, appropriate use of antimalarial drugs and seeking treatment from the right source increased with increasing level of education (p < 0.05). A greater proportion of the patients, 321 (64.9 %) utilized hospitals, pharmacy outlets or health centres when they perceived an attack of malaria. Educational intervention may result in these patients seeking treatment from the right place when an attack of malaria fever is perceived.",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "www.ajol.info",
				"publicationTitle": "Tanzania Journal of Health Research",
				"rights": "Copyright (c)",
				"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
				"volume": "13",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "HIV patients"
					},
					{
						"tag": "Nigeria"
					},
					{
						"tag": "knowledge"
					},
					{
						"tag": "malaria"
					},
					{
						"tag": "prevention"
					},
					{
						"tag": "treatment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ejournals.library.vanderbilt.edu/index.php/ameriquests/article/view/220",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Canadian Literature in the Early Twenty-First Century: The Emergence of an Inter-American Perspective",
				"creators": [
					{
						"firstName": "Earl E.",
						"lastName": "Fitz",
						"creatorType": "author"
					}
				],
				"date": "2011-07-28",
				"DOI": "10.15695/amqst.v8i1.220",
				"ISSN": "1553-4316",
				"abstractNote": "Historically, Canadian literature has been chary of entering too far into the new discipline of inter-American literary study.  Rightly concerned about the danger of blurring its identity as a distinctive national literature (one made up, as is well known, of two great strands, the French and the English), Canadian writing has, however, come of age, both nationally and internationally.  One dramatic aspect of this transformation is that we now have mounting evidence that both English and French Canadian writers are actively engaging with the literatures and cultures of their hemispheric neighbors.  By extending the methodologies of Comparative Literature to the inter-American paradigm, Canadian writers, critics, and literary historians are finding ways to maintain their status as members of a unique and under-appreciated national literature while also entering into the kinds of comparative studies that demonstrate their New World ties as well.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "ejournals.library.vanderbilt.edu",
				"publicationTitle": "AmeriQuests",
				"rights": "Copyright (c) 2015 AmeriQuests",
				"shortTitle": "Canadian Literature in the Early Twenty-First Century",
				"url": "https://ejournals.library.vanderbilt.edu/index.php/ameriquests/article/view/220",
				"volume": "8",
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
		"url": "http://jms.uwinnipeg.ca/index.php/jms/article/view/1369",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mennonites in Unexpected Places: Sociologist and Settler in Latin America",
				"creators": [
					{
						"firstName": "Ben",
						"lastName": "Nobbs-Thiessen",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"ISSN": "1918-610X",
				"language": "en",
				"libraryCatalog": "jms.uwinnipeg.ca",
				"pages": "203-224",
				"publicationTitle": "Journal of Mennonite Studies",
				"rights": "Copyright (c)",
				"shortTitle": "Mennonites in Unexpected Places",
				"url": "http://jms.uwinnipeg.ca/index.php/jms/article/view/1369",
				"volume": "28",
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
		"url": "https://journals.sfu.ca/jmde/index.php/jmde_1/article/view/100/115",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Value of Evaluation Standards: A Comparative Assessment",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Picciotto",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"ISSN": "1556-8180",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "journals.sfu.ca",
				"pages": "30-59",
				"publicationTitle": "Journal of MultiDisciplinary Evaluation",
				"rights": "Copyright (c)",
				"shortTitle": "The Value of Evaluation Standards",
				"url": "https://journals.sfu.ca/jmde/index.php/jmde_1/article/view/100",
				"volume": "2",
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
		"url": "https://jecs.pl/index.php/jecs/article/view/551",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "PREPARING FUTURE LEADERS OF THEIR RACES -THE POLITICAL FUNCTION OF CHILDREN’S CHARACTERS IN CONTEMPORARY AFRICAN AMERICAN PICTURE-BOOKS",
				"creators": [
					{
						"firstName": "Ewa",
						"lastName": "Klęczaj-Siara",
						"creatorType": "author"
					}
				],
				"date": "2019-06-30",
				"DOI": "10.15503/jecs20191.173.184",
				"ISSN": "2081-1640",
				"abstractNote": "Aim. The aim of the article is to analyse the ways African American children’s characters are constructed in selected picture-books and to determine whether they have any impact on the conduct of contemporary black youth facing discrimination in their own lives. It also argues that picture-books are one of the most influential media in the representation of racial problems.Methods. The subjects of the study are picture-books. The analysis pertains to the visual and the verbal narrative of the books, with a special emphasis being placed on the interplay between text and image as well as on the ways the meaning of the books is created. The texts are analysed using a number of existing research methods used for examining the picture-book format. Results. The article shows that the actions of selected children’s characters, whether real or imaginary, may serve as an incentive for contemporary youth to struggle for equal rights and contribute to the process of racial integration on a daily basis.Conclusions. The results can be considered in the process of establishing educational curricula for students from minority groups who need special literature that would empower them to take action and join in the efforts of adult members of their communities.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "jecs.pl",
				"pages": "173-184",
				"publicationTitle": "Journal of Education Culture and Society",
				"rights": "Copyright (c) 2019 Ewa Klęczaj-Siara",
				"url": "https://jecs.pl/index.php/jecs/article/view/551",
				"volume": "10",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "political agents"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journal.meteohistory.org/index.php/hom/article/view/79",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Trajectories and reconversions of the Center for Weather Forecasting and Climate Studies (CPTEC): Forming the meteorological science elite in Brazil",
				"creators": [
					{
						"firstName": "Thales de",
						"lastName": "Andrade",
						"creatorType": "author"
					},
					{
						"firstName": "Paulo",
						"lastName": "Escada",
						"creatorType": "author"
					}
				],
				"date": "2021-05-18",
				"ISSN": "1555-5763",
				"abstractNote": "The process that created the Center for Weather Forecasting and Climate Studies (CPTEC) in Brazil in the 1980s and 90s, which introduced Numerical Weather Prediction (NWP) models, was also a moment for reconversion of a meteorological science elite in the country. This double-sided process occurred in view of a series of favorable historical conditions, such as the institutionalization of space research, as well as of the implementation of new scientific policies in Brazil. CPTEC was formed by young scientists from the National Institute for Space Research (INPE) who had recently obtained their doctoral degrees abroad. While defending the modernization of Brazilian meteorology, through the creation of this new meteorological center, these scientists, based on their trajectories and attributes of scientific excellence, constituted a group of science elite. The introduction of research on climate change would be a new opportunity for recognition of part of these researchers as members of this elite. This study describes how the trajectories of certain scientists shaped their careers, producing what we call reconversion of science elites, as well as the scientific field in the implementation of the first NWP center in Brazil.",
				"archiveLocation": "Brazil, 1970-2000",
				"language": "en",
				"libraryCatalog": "journal.meteohistory.org",
				"pages": "1-23",
				"publicationTitle": "History of Meteorology",
				"rights": "Copyright (c) 2021 Thales de Andrade, Paulo Escada",
				"shortTitle": "Trajectories and reconversions of the Center for Weather Forecasting and Climate Studies (CPTEC)",
				"url": "https://journal.meteohistory.org/index.php/hom/article/view/79",
				"volume": "10",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "scientific elites"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://langsci-press.org/search/search?query=structure",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://langsci-press.org/catalog/book/189",
		"items": [
			{
				"itemType": "book",
				"title": "Advances in formal Slavic linguistics 2016",
				"creators": [
					{
						"firstName": "Denisa",
						"lastName": "Lenertová",
						"creatorType": "author"
					},
					{
						"firstName": "Roland",
						"lastName": "Meyer",
						"creatorType": "author"
					},
					{
						"firstName": "Radek",
						"lastName": "Šimík",
						"creatorType": "author"
					},
					{
						"firstName": "Luka",
						"lastName": "Szucsich",
						"creatorType": "author"
					},
					{
						"firstName": "Julia",
						"lastName": "Bacskai-Atkari",
						"creatorType": "author"
					},
					{
						"firstName": "Tatiana",
						"lastName": "Bondarenko",
						"creatorType": "author"
					},
					{
						"firstName": "Olga",
						"lastName": "Borik",
						"creatorType": "author"
					},
					{
						"firstName": "Berit",
						"lastName": "Gehrke",
						"creatorType": "author"
					},
					{
						"firstName": "Mojmír",
						"lastName": "Dočekal",
						"creatorType": "author"
					},
					{
						"firstName": "Marcin",
						"lastName": "Wągiel",
						"creatorType": "author"
					},
					{
						"firstName": "Guillaume",
						"lastName": "Enguehard",
						"creatorType": "author"
					},
					{
						"firstName": "Anja",
						"lastName": "Gattnar",
						"creatorType": "author"
					},
					{
						"firstName": "Robin",
						"lastName": "Hörnig",
						"creatorType": "author"
					},
					{
						"firstName": "Johanna",
						"lastName": "Heininger",
						"creatorType": "author"
					},
					{
						"firstName": "Peđa",
						"lastName": "Kovačević",
						"creatorType": "author"
					},
					{
						"firstName": "Tanja",
						"lastName": "Milićev",
						"creatorType": "author"
					},
					{
						"firstName": "Ivona",
						"lastName": "Kučerová",
						"creatorType": "author"
					},
					{
						"firstName": "Franc",
						"lastName": "Marušič",
						"creatorType": "author"
					},
					{
						"firstName": "Petra",
						"lastName": "Mišmaš",
						"creatorType": "author"
					},
					{
						"firstName": "Vesna",
						"lastName": "Plesničar",
						"creatorType": "author"
					},
					{
						"firstName": "Tina",
						"lastName": "Šuligoj",
						"creatorType": "author"
					},
					{
						"firstName": "Emilia",
						"lastName": "Melara",
						"creatorType": "author"
					},
					{
						"firstName": "Krzysztof",
						"lastName": "Migdalski",
						"creatorType": "author"
					},
					{
						"firstName": "Kristina",
						"lastName": "Mihajlović",
						"creatorType": "author"
					},
					{
						"firstName": "Małgorzata",
						"lastName": "Ćavar",
						"creatorType": "author"
					},
					{
						"firstName": "Olav",
						"lastName": "Mueller-Reichau",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Murphy",
						"creatorType": "author"
					},
					{
						"firstName": "Zorica",
						"lastName": "Puškar",
						"creatorType": "author"
					},
					{
						"firstName": "Matías Guzmán",
						"lastName": "Naranjo",
						"creatorType": "author"
					},
					{
						"firstName": "Vanessa",
						"lastName": "Petroj",
						"creatorType": "author"
					},
					{
						"firstName": "Gereon",
						"lastName": "Müller",
						"creatorType": "author"
					},
					{
						"firstName": "Teodora",
						"lastName": "Radeva-Bork",
						"creatorType": "author"
					},
					{
						"firstName": "Jelena",
						"lastName": "Runić",
						"creatorType": "author"
					},
					{
						"firstName": "Elena",
						"lastName": "Titov",
						"creatorType": "author"
					},
					{
						"firstName": "Maria D.",
						"lastName": "Vasilyeva",
						"creatorType": "author"
					},
					{
						"firstName": "Ekaterina",
						"lastName": "Vostrikova",
						"creatorType": "author"
					},
					{
						"firstName": "Karolina",
						"lastName": "Zuchewicz",
						"creatorType": "author"
					}
				],
				"date": "2018-01-08",
				"ISBN": "9783961101276",
				"abstractNote": "Advances in Formal Slavic Linguistics 2016&nbsp;initiates a new series of collective volumes on formal Slavic linguistics. It presents a selection of high quality papers authored by young and senior linguists from around the world and contains both empirically oriented work, underpinned by up-to-date experimental methods, as well as more theoretically grounded contributions. The volume covers all major linguistic areas, including morphosyntax, semantics, pragmatics, phonology, and their mutual interfaces. The particular topics discussed include argument structure, word order, case, agreement, tense, aspect, clausal left periphery, or segmental phonology. The topical breadth and analytical depth of the contributions reflect the vitality of the field of formal Slavic linguistics and prove its relevance to the global linguistic endeavour. Early versions of the papers included in this volume were presented at the conference on Formal Description of Slavic Languages 12 or at the satellite Workshop on Formal and Experimental Semantics and Pragmatics, which were held on December 7-10, 2016 in Berlin.",
				"language": "en",
				"libraryCatalog": "langsci-press.org",
				"publisher": "Language Science Press",
				"rights": "Copyright (c) 2018 Language Science Press",
				"url": "https://langsci-press.org/catalog/view/189/1065/1365-1",
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
		"url": "https://ebooks.au.dk/aul/catalog/book/421",
		"items": [
			{
				"itemType": "book",
				"title": "Overgange – anbragte unges veje fra skole til uddannelse",
				"creators": [
					{
						"firstName": "Søren",
						"lastName": "Langager",
						"creatorType": "author"
					},
					{
						"firstName": "Anna Kathrine",
						"lastName": "Frørup",
						"creatorType": "author"
					},
					{
						"firstName": "André",
						"lastName": "Torre",
						"creatorType": "author"
					},
					{
						"firstName": "Charlotte Lange",
						"lastName": "Hald",
						"creatorType": "author"
					}
				],
				"date": "2021-06-22",
				"ISBN": "9788776845124",
				"abstractNote": "Dette er den afsluttende rapport om projektet ’Lær for Livet’, som er et projekt initieret af Egmont Fonden. Via blandt andet årlige intensive læringscamps og løbende mentorordninger som supplement til skolens læringsmiljø har projektet haft som overordnet mål at forbedre anbragte børns skolefaglige præstationer og herigennem øge antallet af anbragte unge, der starter på en ungdomsuddannelse efter skolen. I tilknytning til projektet blev etableret et følgeforskningsprojekt, som blev varetaget af DPU, Aarhus Universitet, der fulgte projektet i årene 2014-2020.",
				"extra": "DOI: 10.7146/aul.421",
				"language": "da",
				"libraryCatalog": "ebooks.au.dk",
				"rights": "Ophavsret (c) 2021 Søren Langager, Anna Kathrine  Frørup, André   Torre, Charlotte Lange  Hald (Forfatter)",
				"url": "https://ebooks.au.dk/aul/catalog/book/421",
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
		"url": "https://munispace.muni.cz/library/catalog/book/1986",
		"items": [
			{
				"itemType": "book",
				"title": "Tomáškovy dny 2021",
				"creators": [
					{
						"firstName": "Lukáš",
						"lastName": "Vacek",
						"creatorType": "author"
					},
					{
						"firstName": "Dominika",
						"lastName": "Kleknerová",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"abstractNote": "Tomáškovy dny mladých mikrobiologů jsou konferencí, kterou od roku 1992 každoročně organizuje Mikrobiologický ústav Lékařské fakulty Masarykovy univerzity a Fakultní nemocnice u sv. Anny v Brně ve spolupráci s Československou společností mikrobiologickou. Dalšími oficiálními pořadateli konference jsou Společnost pro mikrobiologii a epidemiologii České lékařské společnosti J. E. Purkyně a Společnost pro lékařskou mikrobiologii ČLS. Jedinou podmínkou konference je, že referující autor (příp. hlavní autor posteru) musí být mladší 35 let.",
				"language": "cze,eng,slo",
				"libraryCatalog": "munispace.muni.cz",
				"publisher": "Masarykova univerzita",
				"url": "https://munispace.muni.cz/library/catalog/book/1986",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "E-knihy"
					},
					{
						"tag": "Elektronické knihy"
					},
					{
						"tag": "Flipbook"
					},
					{
						"tag": "Knihy"
					},
					{
						"tag": "Masarykova univerzita"
					},
					{
						"tag": "Munipress"
					},
					{
						"tag": "Munispace"
					},
					{
						"tag": "Open Access"
					},
					{
						"tag": "Čítárna"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://llibres.urv.cat/index.php/purv/catalog/book/467",
		"items": [
			{
				"itemType": "book",
				"title": "Recerca en Humanitats 2020",
				"creators": [
					{
						"firstName": "Maria Bargalló",
						"lastName": "Escrivà",
						"creatorType": "author"
					}
				],
				"date": "2021-05-25",
				"ISBN": "9788484249115",
				"abstractNote": "Aquest volum inclou els onze treballs corresponents a les presentacions realitzades a la cinquena edició de les Jornades del Doctorand. Aquests textos constitueixen una nova mostra de la recerca en Humanitats en els diversos àmbits d’investigació que inclou el nostre programa; així els estudis comprenen qüestions d’història i història de l’art, de llengua i literatura.\n* * *\nSUMARIIntroduccióSalazar y la guerra civil española: la discreta ayuda portuguesa al bando nacional (1936-1939), David Almeida de Andrade Animal Metaphors through Subtitling in Family Guy, Mariazell-Eugènia Bosch Fábregas Hacia una formalización para la detección automática de la violencia lingüística en las redes sociales, Susana Campillo Muñoz Les cultures polítiques del socialisme espanyol en la Transició, Gerard Cintas Hernández La cultura pop a Espanya, exemple de dissidència política i crítica social durant la dictadura franquista, Sara Espinós Ferrer Mujeres y madres de Barcino en los epitafios funerarios. Siglos I-II d.C. , Montse Guallarte Salvat La Teoría de las Funciones Lexicográficas como base para la definición de una app para entrenadores de fútbol, Ángel Huete-García «Furtivament al marge»: corporalitat i abjecció a les poètiques catalanes de la segona dècada del segle XXI, Meritxell Matas Revilla Una època de canvis i continuïtats. Societat i cultura a Tarragona després de la Guerra del Francès (1814-1820) , Carlos Moruno Moyano&nbsp;La huella estilística del traductor: léxico borgiano en la traducción de Orlando de Woolf, Nerea Tera Faba Extravagàncies escèniques i nous formats artístics a Tarragona durant l’últim terç del segle XIX, &nbsp;M. Teresa Velasco Osca&nbsp;",
				"language": "en",
				"libraryCatalog": "llibres.urv.cat",
				"rights": "Copyright (c) 2021 Publicacions URV",
				"url": "http://llibres.urv.cat/index.php/purv/catalog/book/467",
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
		"url": "https://preprints.scielo.org/index.php/scielo/preprint/view/2577",
		"items": [
			{
				"itemType": "report",
				"title": "RETRATO DAS NARRATIVAS DE MAES UNIVERSITARIAS NO CONTEXTO ACADÊMICO",
				"creators": [
					{
						"firstName": "Elenir Lindaura da",
						"lastName": "Silva",
						"creatorType": "author"
					},
					{
						"firstName": "Priscila",
						"lastName": "Benitez",
						"creatorType": "author"
					},
					{
						"firstName": "Táhcita Medrado",
						"lastName": "Mizael",
						"creatorType": "author"
					},
					{
						"firstName": "Mara Silvia",
						"lastName": "Pasian",
						"creatorType": "author"
					}
				],
				"date": "2021-07-05",
				"abstractNote": "SciELO Preprints Collection is an integral part of SciELO, an international cooperation program aiming at the development of open access scientific communication covering all areas of knowledge. It operates as a collection of non-peer-reviewed manuscripts within the SciELO Network of national and thematic collection of journals.",
				"extra": "DOI: 10.1590/SciELOPreprints.2577\ntype: article",
				"institution": "SciELO Preprints",
				"language": "pt",
				"libraryCatalog": "preprints.scielo.org",
				"url": "https://preprints.scielo.org/index.php/scielo/preprint/view/2577",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "college education"
					},
					{
						"tag": "gender"
					},
					{
						"tag": "inclusion"
					},
					{
						"tag": "maternity"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://preprints.scielo.org/index.php/scielo/search/search?query=efl&dateFromYear=&dateFromMonth=&dateFromDay=&dateToYear=&dateToMonth=&dateToDay=&authors=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://kurdishstudies.net/journal/ks/issue/view/59",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jnp.journals.yorku.ca/index.php/default",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.journals.aiac.org.au/index.php/IJALEL/issue/view/273",
		"items": "multiple"
	}
]
/** END TEST CASES **/
