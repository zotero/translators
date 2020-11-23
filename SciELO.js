{
	"translatorID": "3eabecf9-663a-4774-a3e6-0790d2732eed",
	"label": "SciELO",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?(socialscience\\.|proceedings\\.|biodiversidade\\.|caribbean\\.|comciencia\\.|inovacao\\.|search\\.)?(scielo|scielosp)\\.",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-11-23 12:46:46"
}

/*
	Translator
   Copyright (C) 2013 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc,url) {
	if (ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content')) {
		return "journalArticle";
	}
	if (url.indexOf("search.")!=-1 && getSearchResults(doc, true)){
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "results")]//div[contains(@class, "line")]/a[strong[contains(@class, "title")]]');
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
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


// called translator sometimes isn't able to extract authors
function extractAuthors(doc) {
	let itemCreators = doc.querySelectorAll('.author-name');
	let authorNames = [];
	for (let i = 0; i < itemCreators.length; i++) {
		authorNames[i] = itemCreators[i].innerText;
	}
	return authorNames;
}


// called translator would sometimes add duplicate authors
function checkAuthorDiff (author1, author2) {
	if (author1.lastName == author2.lastName && author1.firstName == author2.firstName) {
		return true;
	}
	return false;
}


function scrape(doc, url) {
	var abstract = ZU.xpathText(doc, '//div[@class="abstract"]');
	var transAbstract = ZU.xpathText(doc, '//div[@class="trans-abstract"]');
	var translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
		if (abstract) item.abstractNote = abstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, "").replace(/[\n\t]/g, "");
		if (transAbstract) item.notes.push({note: "abs:" + transAbstract.replace(/^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?)/i, ""),
		});
		if (!item.creators[0] && extractAuthors(doc)) {
			for (let author of extractAuthors(doc))
				item.creators.push(ZU.cleanAuthor(author));
		}
		if (item.creators.length >= 2) {
			for (let i = 0; i < item.creators.length - 1; i++) {
				if (checkAuthorDiff(item.creators[i], item.creators[i+1])) {
					item.creators.splice(i, 1);
				}
			}
		}
		var keywords = ZU.xpath(doc, '//b[contains(text(), "Keywords:") or contains(text(), "Keywords")]/..');
		if (!keywords || keywords.length == 0) keywords = ZU.xpath(doc, '//strong[contains(text(), "Keywords:") or contains(text(), "Keywords")]/.. | /html/body/div[1]/div[2]/div[2]/p[5]');
		if (keywords && keywords.length > 0) {
			item.tags = keywords[0].textContent
						.trim()
						.replace(/\n/g, "")
						.replace(/keywords\s*:\s*/ig, "")
						.split(";")
						.map(function(x) { return x.trim(); })
						.map(function(y) { return y.charAt(0).toUpperCase() + y.slice(1); });
	}

		item.libraryCatalog = "SciELO"
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.scielosp.org/scielo.php?script=sci_arttext&pid=S0034-89102007000900015&lang=pt",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perceptions of HIV rapid testing among injecting drug users in Brazil",
				"creators": [
					{
						"firstName": "P. R.",
						"lastName": "Telles-Dias",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Westman",
						"creatorType": "author"
					},
					{
						"firstName": "A. E.",
						"lastName": "Fernandez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sanchez",
						"creatorType": "author"
					}
				],
				"date": "12/2007",
				"DOI": "10.1590/S0034-89102007000900015",
				"ISSN": "0034-8910",
				"libraryCatalog": "SciELO",
				"pages": "94-100",
				"publicationTitle": "Revista de Saúde Pública",
				"url": "http://www.scielosp.org/scielo.php?script=sci_abstract&pid=S0034-89102007000900015&lng=en&nrm=iso&tlng=pt",
				"volume": "41",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "http://www.scielo.br/scielo.php?script=sci_arttext&pid=S0104-62762002000200002&lang=pt",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "How candidates for the Presidency are nominated?: Rules and procedures in the Latin American political parties",
				"creators": [
					{
						"firstName": "Flavia",
						"lastName": "Freidenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Francisco",
						"lastName": "Sánchez López",
						"creatorType": "author"
					}
				],
				"date": "10/2002",
				"DOI": "10.1590/S0104-62762002000200002",
				"ISSN": "0104-6276",
				"issue": "2",
				"libraryCatalog": "SciELO",
				"pages": "158-188",
				"publicationTitle": "Opinião Pública",
				"shortTitle": "How candidates for the Presidency are nominated?",
				"url": "http://www.scielo.br/scielo.php?script=sci_abstract&pid=S0104-62762002000200002&lng=en&nrm=iso&tlng=pt",
				"volume": "8",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "http://search.scielo.org/?q=&lang=pt&count=15&from=0&output=site&sort=&format=summary&fb=&page=1&q=zotero&lang=pt&page=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.scielo.br/scielo.php?script=sci_arttext&pid=S1413-35552013000400328&lang=pt",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analysis of the user satisfaction level in a public physical therapy service",
				"creators": [
					{
						"firstName": "Renato S.",
						"lastName": "Almeida",
						"creatorType": "author"
					},
					{
						"firstName": "Leandro A. C.",
						"lastName": "Nogueira",
						"creatorType": "author"
					},
					{
						"firstName": "Stéphane",
						"lastName": "Bourliataux-Lajoine",
						"creatorType": "author"
					},
					{
						"firstName": "Renato S.",
						"lastName": "Almeida",
						"creatorType": "author"
					},
					{
						"firstName": "Leandro A. C.",
						"lastName": "Nogueira",
						"creatorType": "author"
					},
					{
						"firstName": "Stéphane",
						"lastName": "Bourliataux-Lajoine",
						"creatorType": "author"
					}
				],
				"date": "08/2013",
				"DOI": "10.1590/S1413-35552013005000097",
				"ISSN": "1413-3555",
				"abstractNote": "BACKGROUND: The concepts of quality management have increasingly been introduced into the health sector. Methods to measure satisfaction and quality are examples of this trend.  OBJECTIVE: This study aimed to identify the level of customer satisfaction in a physical therapy department involved in the public area and to analyze the key variables that impact the usersâ€(tm) perceived quality. METHOD: A cross-sectional observational study was conducted, and 95 patients from the physical therapy department of the Hospital Universitário Gaffrée e Guinle - Universidade Federal do Estado do Rio de Janeiro (HUGG/UNIRIO) - Rio de Janeiro, Brazil, were evaluated by the SERVQUAL questionnaire. A brief questionnaire to identify the sociocultural profile of the patients was also performed.  RESULTS: Patients from this health service presented a satisfied status with the treatment, and the population final average value in the questionnaire was 0.057 (a positive value indicates satisfaction). There was an influence of the educational level on the satisfaction status (χ‡Â²=17,149; p=0.002). A correlation was found between satisfaction and the dimensions of tangibility (rho=0.56, p=0.05) and empathy (rho=0.46, p=0.01) for the Unsatisfied group. Among the Satisfied group, the dimension that was correlated with the final value of the SERVQUAL was responsiveness (rho=0.44, p=0.01).  CONCLUSIONS: The final values of the GGUH physical therapy department showed that patients can be satisfied even in a public health service. Satisfaction measures must have a multidimensional approach, and we found that people with more years of study showed lower values of satisfaction.Key words: health management; physical therapy; user satisfaction",
				"issue": "4",
				"libraryCatalog": "SciELO",
				"pages": "328-335",
				"publicationTitle": "Brazilian Journal of Physical Therapy",
				"url": "http://www.scielo.br/scielo.php?script=sci_abstract&pid=S1413-35552013000400328&lng=en&nrm=iso&tlng=en",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_arttext&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Re-pensar el ex opere operato II: Per signa sensibilia significantur (SC 7). Quid enim?",
				"creators": [
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					},
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					}
				],
				"date": "12/2019",
				"DOI": "10.4067/S0049-34492019000400457",
				"ISSN": "0049-3449",
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.Palabras claves: performativo; sacramentos; liturgia; semiótica; lenguaje simbólico; ritualidad; ex opere operato",
				"issue": "4",
				"libraryCatalog": "SciELO",
				"pages": "457-474",
				"publicationTitle": "Teología y vida",
				"shortTitle": "Re-pensar el ex opere operato II",
				"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
				"volume": "60",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "abs:\nThe anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine.\nKeywords: performative; sacraments; liturgy; semiotics; symbolic language; rituality; ex opere operato\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_arttext&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Re-pensar el ex opere operato II: Per signa sensibilia significantur (SC 7). Quid enim?",
				"creators": [
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					},
					{
						"firstName": "Gonzalo",
						"lastName": "Guzmán",
						"creatorType": "author"
					}
				],
				"date": "12/2019",
				"DOI": "10.4067/S0049-34492019000400457",
				"ISSN": "0049-3449",
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.Palabras claves: performativo; sacramentos; liturgia; semiótica; lenguaje simbólico; ritualidad; ex opere operato",
				"issue": "4",
				"libraryCatalog": "SciELO",
				"pages": "457-474",
				"publicationTitle": "Teología y vida",
				"shortTitle": "Re-pensar el ex opere operato II",
				"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=en",
				"volume": "60",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Ex opere operato"
					},
					{
						"tag": "Liturgy"
					},
					{
						"tag": "Performative"
					},
					{
						"tag": "Rituality"
					},
					{
						"tag": "Sacraments"
					},
					{
						"tag": "Semiotics"
					},
					{
						"tag": "Symbolic language"
					}
				],
				"notes": [
					{
						"note": "abs:\nThe anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine.\nKeywords: performative; sacraments; liturgy; semiotics; symbolic language; rituality; ex opere operato\n"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
