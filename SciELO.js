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
	"lastUpdated": "2020-06-25 10:18:23"
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


function postProcess(doc, item) {
	// the author fields are repeated in the website's embedded metadata
	// so, the duplicates need to be removed
	item.creators = item.creators.reduce((unique, o) => {
		if(!unique.some(obj => obj.firstName === o.firstName && obj.lastName === o.lastName &&
			obj.creatorType === o.creatorType && obj.fieldMode === o.fieldMode)) {
		  unique.push(o);
		}
		return unique;
	},[]);
	
	var abstractParagraphs = ZU.xpath(doc, '//div[@class="abstract"]//p[not(@class="sec")] | //div[@class="trans-abstract"]//p[not(@class="sec")]');Z.debug(abstractParagraphs)
	if (abstractParagraphs && abstractParagraphs.length > 0) {
		item.abstractNote = "";
		for (var paragraph in abstractParagraphs) {
			var node = abstractParagraphs[paragraph];
			item.abstractNote += ZU.xpathText(node, ".") + "\n\n";
		}
	} else {
		abstractParagraphs = ZU.xpath(doc, '//h4[contains(text(), "Abstract")]/following::p[not(@xmlns)] | /html/body/div/div[2]/div[2]/p[3]');
		if (abstractParagraphs && abstractParagraphs.length > 0)
			item.abstractNote = abstractParagraphs[0].textContent;
	}

	var keywords = ZU.xpath(doc, '//b[contains(text(), "Keywords:") or contains(text(), "Keywords")]/..');
	if (!keywords || keywords.length == 0)
		keywords = ZU.xpath(doc, '//strong[contains(text(), "Keywords:") or contains(text(), "Keywords")]/.. | /html/body/div[1]/div[2]/div[2]/p[5]');

	if (keywords && keywords.length > 0) {
		item.tags = keywords[0].textContent
						.trim()
						.replace(/keywords\s*\:\s*/ig, "")
						.split(";")
						.map(function(x) { return x.trim(); })
						.map(function(y) { return y.charAt(0).toUpperCase() + y.slice(1);})
	}

	if (item.date) {
		let dateMatches = item.date.match(/(\d{2})\/(\d{4})/);
		if (dateMatches && dateMatches[1] == "00")
			item.date = dateMatches[2];
	}

	var titleSpanMatch = ZU.xpathText(doc, '//span[@class="article-title"]//following-sibling::i//following-sibling::text()');
	if (titleSpanMatch)
		titleSpanMatch = titleSpanMatch.match(/\d{4},\sn\.(\d+),\spp/);

	if (titleSpanMatch) {
		let volume = item.volume;
		item.volume = item.issue;
		item.issue = volume;
	}
	item.libraryCatalog = "SciELO"
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
		item.libraryCatalog = "SciELO"
		postProcess(doc, item);
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
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
					}
				],
				"date": "12/2019",
				"DOI": "10.4067/S0049-34492019000400457",
				"ISSN": "0049-3449",
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.\n\nPalabras claves: performativo; sacramentos; liturgia; semiótica; lenguaje simbólico; ritualidad; ex opere operato\n\nThe anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine.\n\nKeywords: performative; sacraments; liturgy; semiotics; symbolic language; rituality; ex opere operato",
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
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "ex opere operato"
					},
					{
						"tag": "liturgy"
					},
					{
						"tag": "performative"
					},
					{
						"tag": "rituality"
					},
					{
						"tag": "sacraments"
					},
					{
						"tag": "semiotics"
					},
					{
						"tag": "symbolic language"
					}
				],
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
					}
				],
				"date": "12/2019",
				"DOI": "10.4067/S0049-34492019000400457",
				"ISSN": "0049-3449",
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.\n\nPalabras claves: performativo; sacramentos; liturgia; semiótica; lenguaje simbólico; ritualidad; ex opere operato\n\nThe anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine.\n\nKeywords: performative; sacraments; liturgy; semiotics; symbolic language; rituality; ex opere operato",
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
						"title": "Snapshot"
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
					},
					{
						"tag": "Undefinederformative"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492020000100047&lng=es&nrm=iso&tlng=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "El Papado bajo-medieval, dueño de todas las islas A 70 años de la teoría omni-insular de Luis Weckmann",
				"creators": [
					{
						"firstName": "Luis",
						"lastName": "Rojas-Donat",
						"creatorType": "author"
					}
				],
				"date": "03/2020",
				"DOI": "10.4067/S0049-34492020000100047",
				"ISSN": "0049-3449",
				"abstractNote": "El artículo expone la teoría omni-insular fundada en la donación de Constantino. Se concluye que: las menciones a la donación son muy pocas y circunstanciales; si el Papa exigió un censo basado en que tenía potestad sobre todas las islas de Occidente está probado en algunos casos, pero no en todos; el censo parece explicarse por el contexto feudal, el prestigio de ser el sucesor de Pedro y el reconocimiento de la protección apostólica; la intervención de los papas en la expansión ultramarina portuguesa y castellana se funda, primero, en su condición de Vicario de Cristo (potestad apostólica), y segundo, en la doctrina hierocrática del Señorío del Mundo (Dominium Mundi).",
				"issue": "1",
				"libraryCatalog": "SciELO",
				"pages": "47-72",
				"publicationTitle": "Teología y vida",
				"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492020000100047&lng=es&nrm=iso&tlng=es",
				"volume": "61",
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
					{
						"tag": "Potestad apostólica."
					},
					{
						"tag": "Teoría omni-insular"
					},
					{
						"tag": "Undefinedalabras clave\n\t\t:\n\t\tPapado"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492020000100047&lng=es&nrm=iso&tlng=es",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "El Papado bajo-medieval, dueño de todas las islas A 70 años de la teoría omni-insular de Luis Weckmann",
				"creators": [
					{
						"firstName": "Luis",
						"lastName": "Rojas-Donat",
						"creatorType": "author"
					}
				],
				"date": "03/2020",
				"DOI": "10.4067/S0049-34492020000100047",
				"ISSN": "0049-3449",
				"abstractNote": "El artículo expone la teoría omni-insular fundada en la donación de Constantino. Se concluye que: las menciones a la donación son muy pocas y circunstanciales; si el Papa exigió un censo basado en que tenía potestad sobre todas las islas de Occidente está probado en algunos casos, pero no en todos; el censo parece explicarse por el contexto feudal, el prestigio de ser el sucesor de Pedro y el reconocimiento de la protección apostólica; la intervención de los papas en la expansión ultramarina portuguesa y castellana se funda, primero, en su condición de Vicario de Cristo (potestad apostólica), y segundo, en la doctrina hierocrática del Señorío del Mundo (Dominium Mundi).",
				"issue": "1",
				"libraryCatalog": "SciELO",
				"pages": "47-72",
				"publicationTitle": "Teología y vida",
				"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492020000100047&lng=es&nrm=iso&tlng=es",
				"volume": "61",
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
					{
						"tag": "Potestad apostólica."
					},
					{
						"tag": "Teoría omni-insular"
					},
					{
						"tag": "Undefinedalabras clave\n\t\t:\n\t\tPapado"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
