{
	"translatorID": "276cb34c-6861-4de7-a11d-c2e46fb8af28",
	"label": "Semantic Scholar",
	"creator": "Guy Aglionby",
	"target": "^https?://(www[.])?semanticscholar\\.org/paper/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-12-17 02:18:25"
}

/*
	Semantic Scholar Translator
	Copyright (C) 2011 Guy Aglionby

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// See also https://github.com/zotero/translators/blob/master/BibTeX.js
var bibtex2zoteroTypeMap = {
	"inproceedings": "conferencePaper",
	"conference"   : "conferencePaper",
	"article"      : "journalArticle"
};

function detectWeb(doc, url) {
	var citationElement = ZU.xpath(doc, '//cite[@class="formatted-citation formatted-citation--style-bibtex"]')[0];
	var type = citationElement.textContent.split("{")[0].replace("@", "");
	return bibtex2zoteroTypeMap[type];
}

function createUmlautReplacement(char) {
	// There's this issue where e,i,o,u characters with umlauts have unbalanced
	// braces in the Semantic Scholar BibTeX, which kills the Zotero translator.
	return [new RegExp('{\\\\"{' + char + '}[^}]'), '{\\"' + char + '}'];
}

var umlautReplacements = ['e', 'E', 'i', 'I', 'o', 'O', 'u', 'U'].map(createUmlautReplacement);

function fixBibtex(bibtex) {
	umlautReplacements.forEach(function(replacement) {
		bibtex = bibtex.replace(replacement[0], replacement[1]);
	});
	return bibtex;
}

function doWeb(doc, url) {
	var citation = ZU.xpath(doc, '//cite[@class="formatted-citation formatted-citation--style-bibtex"]')[0].textContent;
	citation = fixBibtex(citation);

	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(citation);
	translator.setHandler("itemDone", function (obj, item) {
		// Add the link to Semantic Scholar
		item.attachments.push({
			url: url,
			title: "Semantic Scholar Link",
			mimeType: "text/html",
			snapshot: false
		});

		// Attach the PDF
		var paperLinkElement = ZU.xpath(doc, '//div[@class="flex-container flex-paper-actions"]//a[@data-selenium-selector="paper-link"]')[0];
		if (paperLinkElement) {
			var paperLink = paperLinkElement.href;
			// Sometimes the link is to a website where you can download it elsewhere
			if (paperLink.endsWith('.pdf')) {
				item.attachments.push({
					url: paperLink,
					title: item.title,
					mimeType: "application/pdf"
				});
			} else {
				/*
				// Otherwise this is the div that needs to be clicked (if it exists) to show more paper links
		var dropdownElement = ZU.xpath(doc, '//div[@class="flex-container flex-paper-actions"]//div[@class="dropdown-menu"]');
				if (dropdownElement) {
					// TODO Somehow simulate a click on it
					// Once that div is clicked, a new div is added (hopefully) containing new paper links
					// Example: https://www.semanticscholar.org/paper/Foundations-of-Statistical-Natural-Language-Proces-Manning-Sch%C3%BCtze/06fd7d924d499fbc62ccbcc2e458fb6c187bcf6f
					// The below code should then work
					var paperLinks = ZU.xpath(doc, '//div[@class="flex-container flex-paper-actions"]//a[@data-selenium-selector="paper-link"]');
					paperLinks = paperLinks.map(element => element.href)
										   .filter(link => link.endsWith('.pdf'));
					var link = paperLinks[0];

					if (link) {
						item.attachments.push({
							url: paperLink,
							title: item.title,
							mimeType: "application/pdf"
						});
					}
				}*/
			}
		}

		// Add the abstract
		var abstractSection = ZU.xpath(doc, '//section[@class="page-section paper-detail paper-abstract"]/p')[0];
		if (abstractSection) {
			item.abstractNote = abstractSection.textContent;
		}

		// Add DOI
		var doiSection = ZU.xpath(doc, '//section[@class="doi"]/a')[0];
		if (doiSection) {
			item.doi = doiSection.text;
		}

		item.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/TectoMT-Modular-NLP-Framework-Popel-Zabokrtsk%C3%BD/89fbfabca6b605e2b00a9d57880c241c17e84001",
		"defer": true,
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Martin",
						"lastName": "Popel",
						"creatorType": "author"
					},
					{
						"firstName": "Zdenek",
						"lastName": "Zabokrtský",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "TectoMT: Modular NLP Framework",
						"mimeType": "application/pdf"
					}
				],
				"itemID": "Popel2010TectoMTMN",
				"title": "TectoMT: Modular NLP Framework",
				"publicationTitle": "IceTAL",
				"date": "2010",
				"abstractNote": "In the present paper we describe TectoMT, a multi-purpose open-source NLP framework. It allows for fast and efficient development of NLP applications by exploiting a wide range of software modules already integrated in TectoMT, such as tools for sentence segmentation, tokenization, morphological analysis, POS tagging, shallow and deep syntax parsing, named entity recognition, anaphora resolution, tree-to-tree translation, natural language generation, word-level alignment of parallel corpora, and other tasks. One of the most complex applications of TectoMT is the English-Czech machine translation system with transfer on deep syntactic (tectogrammatical) layer. Several modules are available also for other languages (German, Russian, Arabic). Where possible, modules are implemented in a language-independent way, so they can be reused in many applications.",
				"doi": "10.1007/978-3-642-14770-8_33",
				"libraryCatalog": "Semantic Scholar",
				"shortTitle": "TectoMT",
				"proceedingsTitle": "IceTAL"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.semanticscholar.org/paper/The-spring-in-the-arch-of-the-human-foot-Ker-Bennett/d37500a6a58fd55f0998ad0394bf076484e08fe8",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Robert F.",
						"lastName": "Ker",
						"creatorType": "author"
					},
					{
						"firstName": "Michael Brian",
						"lastName": "Bennett",
						"creatorType": "author"
					},
					{
						"firstName": "Susan R. S.",
						"lastName": "Bibby",
						"creatorType": "author"
					},
					{
						"firstName": "Ralph C.",
						"lastName": "Kester",
						"creatorType": "author"
					},
					{
						"firstName": "R. McNeill",
						"lastName": "Alexander",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Semantic Scholar Link",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"itemID": "Ker1987TheSI",
				"title": "The spring in the arch of the human foot.",
				"publicationTitle": "Nature",
				"date": "1987",
				"volume": "325 7000",
				"pages": "147-9",
				"abstractNote": "Large mammals, including humans, save much of the energy needed for running by means of elastic structures in their legs and feet. Kinetic and potential energy removed from the body in the first half of the stance phase is stored briefly as elastic strain energy and then returned in the second half by elastic recoil. Thus the animal runs in an analogous fashion to a rubber ball bouncing along. Among the elastic structures involved, the tendons of distal leg muscles have been shown to be important. Here we show that the elastic properties of the arch of the human foot are also important.",
				"libraryCatalog": "Semantic Scholar"
			}
		]
	}
]
/** END TEST CASES **/
