{
	"translatorID": "b4c83513-921f-474b-adc3-7017ea690ba7",
	"label": "Republik.ch",
	"creator": "Johannes Wüthrich",
	"target": "^https?://www\\.republik\\.ch/[0-9]*/[0-9]*/[0-9]*/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-05 10:06:57"
}

/*
Republik.ch Translator
Copyright (C) 2021 Johannes Wüthrich

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	// TODO match different types of articles / debates / updates / blog-posts / newsletters etc.
	
	return "newspaperArticle";
}


function doWeb(doc, url) {
	// TODO adapt for multiple type of sources (see above)
	
	scrape(doc, url);
}


function scrape(doc, url) {

	var newItem = new Zotero.Item("newspaperArticle");

	newItem.title = text(doc, "article section.title-block h1");
	
	var abstract = text(doc, "article section.title-block > p:nth-last-of-type(2)")
	var meta = text(doc, "article section.title-block > p:nth-last-of-type(1)")
	
	// Zotero.debug(abstract);
	// Zotero.debug(meta);
	
	if(meta == "" || abstract.localeCompare(meta) == 0) {
		// Catch case without any description / abstract
		meta = abstract
		abstract = "";
	}
	newItem.abstractNote = abstract;
	
	
	const reg_date = /(.*),?\s+([0-3][0-9]\.[0-1][0-9]\.[1-3][0-9][0-9][0-9])$/;
	const reg_function = /(.*)\s+\((.*)\)/
	
	var date = meta.match(reg_date)
	
	if(!date) {
		newItem.date = ZU.strToISO(meta);
	} else {
		
		newItem.date = ZU.strToISO(date[2]);
		
		var rest = date[1];
		
		var authors = rest.match(/von\s+(.*)$/i);
		if(authors){
		
			authors = authors[1].split(/,\s|\sund\s/);
			
			// Zotero.debug(authors);
		
			for(var aa in authors){

				var author = authors[aa].trim();
				
				var type = "author";
				
				var clean = author.match(reg_function);
				if(clean) {
					author = clean[1];
					if(clean[2] == "Bilder" || clean[2] == "Illustration" || clean[2] == "Übersetzung") {
						type = "contributor";
					}
				}
				
				newItem.creators.push(ZU.cleanAuthor(author, type));
			}
		}
	}

	newItem.url = attr(doc, 'meta[property="og:url"]', 'content') || url;


	var pdfURL = attr(doc, 'article a[title="PDF-Optionen"]', 'href');
	if(pdfURL) {
		newItem.attachments.push({
			url: pdfURL,
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});
	} else {
		newItem.attachments.push({
			document: doc,
			title: "Snapshot",
		});
	}

	// Tags
	newItem.publicationTitle = "Republik";
	newItem.language = "de-CH";
	newItem.complete();

}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.republik.ch/2021/08/04/bruder-berg-und-schwester-schwein",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Bruder Berg und Schwester Schwein",
				"creators": [
					{
						"firstName": "Markus",
						"lastName": "Schärli",
						"creatorType": "author"
					}
				],
				"date": "2021-08-04",
				"abstractNote": "Nicht nur Menschen haben Rechte. Auch Stiftungen und Aktiengesellschaften dürfen ein Gericht anrufen, ihre Interessen vertreten. Warum aber bleiben Natur und Tiere davon ausgeschlossen?",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"url": "https://www.republik.ch/2021/08/04/bruder-berg-und-schwester-schwein",
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
		"url": "https://www.republik.ch/2021/08/04/der-maler-und-die-moerder",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Der Maler und die Mörder",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Stern",
						"creatorType": "author"
					}
				],
				"date": "2021-08-04",
				"abstractNote": "Fotografieren und Filmen ist an Gerichten verboten, deshalb gibt es Gerichts­zeichner. Einer der bekanntesten – und letzten – ist Robert Honegger. «Gerechtigkeit ist etwas so Schönes wie die Liebe – und ebenso kompliziert und aufwendig», findet er.",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"url": "https://www.republik.ch/2021/08/04/der-maler-und-die-moerder",
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
		"url": "https://www.republik.ch/2021/07/23/spionage-skandal-erschuettert-die-welt-long-covid-verursacht-iv-faelle-und-zwoelf-impf-gegner-mit-grosser-wirkung",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Spionageskandal erschüttert die Welt, Long Covid verursacht IV-Fälle – und zwölf Impf­gegner mit grosser Wirkung",
				"creators": [
					{
						"firstName": "Reto",
						"lastName": "Aschwanden",
						"creatorType": "author"
					},
					{
						"firstName": "Ronja",
						"lastName": "Beck",
						"creatorType": "author"
					},
					{
						"firstName": "Theresa",
						"lastName": "Hein",
						"creatorType": "author"
					}
				],
				"date": "2021-07-23",
				"abstractNote": "Woche 29/2021 – das Nachrichten­briefing aus der Republik-Redaktion.",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"url": "https://www.republik.ch/2021/07/23/spionage-skandal-erschuettert-die-welt-long-covid-verursacht-iv-faelle-und-zwoelf-impf-gegner-mit-grosser-wirkung",
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
		"url": "https://www.republik.ch/2021/07/30/hayeks-bastarde",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hayeks Bastarde",
				"creators": [
					{
						"firstName": "Quinn",
						"lastName": "Slobodian",
						"creatorType": "author"
					},
					{
						"firstName": "Sarah",
						"lastName": "Fuhrmann",
						"creatorType": "contributor"
					},
					{
						"firstName": "Ben",
						"lastName": "Jones",
						"creatorType": "contributor"
					}
				],
				"date": "2021-07-30",
				"abstractNote": "Die neoliberalen Wurzeln der Rechtspopulisten.",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"url": "https://www.republik.ch/2021/07/30/hayeks-bastarde",
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
		"url": "https://www.republik.ch/2021/07/16/profitmaschine-pflegeheim",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Profitmaschine Pflegeheim",
				"creators": [
					{
						"firstName": "Philipp",
						"lastName": "Albrecht",
						"creatorType": "author"
					},
					{
						"firstName": "Nico",
						"lastName": "Schmidt",
						"creatorType": "author"
					},
					{
						"firstName": "Harald",
						"lastName": "Schumann",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Flacoux",
						"creatorType": "contributor"
					}
				],
				"date": "2021-07-16",
				"abstractNote": "In Europa kaufen Konzerne und Finanzinvestoren Heime, setzen den Rotstift an und verstecken Gewinne vor dem Steueramt. Diese Entwicklung macht auch vor der Schweiz nicht halt. Mit drastischen Folgen für Angestellte und Bewohnerinnen.",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"url": "https://www.republik.ch/2021/07/16/profitmaschine-pflegeheim",
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
		"url": "https://www.republik.ch/2021/07/28/der-turmbau-zu-arles",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Der Turmbau zu Arles",
				"creators": [
					{
						"firstName": "Laura Helena",
						"lastName": "Wurth",
						"creatorType": "author"
					},
					{
						"firstName": "Karla Hiraldo",
						"lastName": "Voleau",
						"creatorType": "contributor"
					}
				],
				"date": "2021-07-28",
				"abstractNote": "Kunstmäzenin Maja Hoffmann hat eine Ausstellungs­anlage eröffnet, die mehr sein will als ein Museum: ein Kreativ-Campus, ein Thinktank, ein Ort der Zukunfts­visionen. Und darin versteckt sich sogar Globalisierungskritik.",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"url": "https://www.republik.ch/2021/07/28/der-turmbau-zu-arles",
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
		"url": "https://www.republik.ch/2021/08/05/7-uhr-newsletter",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Interview mit der Regisseurin des ersten Spielfilms über Srebrenica. Dazu: eine Recherche zum E-Voting",
				"creators": [],
				"date": "2021-08-05",
				"language": "de-CH",
				"libraryCatalog": "Republik.ch",
				"publicationTitle": "Republik",
				"shortTitle": "Interview mit der Regisseurin des ersten Spielfilms über Srebrenica. Dazu",
				"url": "https://www.republik.ch/2021/08/05/7-uhr-newsletter",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
