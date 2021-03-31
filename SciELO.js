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
	"lastUpdated": "2021-03-31 09:36:46"
}

/*
	Translator
	Copyright (C) 2013 Sebastian Karcher
	Modified 2020 Timotheus Kim
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


function scrape(doc, url) {
	var abstract = ZU.xpathText(doc, '//div[@class="abstract"]');
	var transAbstract = ZU.xpath(doc, '//div[@class="trans-abstract"]');
	var translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	const keywordsInAbstractsPrefix = /\n*(Palabras claves?|Key\s?words|Stichworte)\s*:.*/i;
	const abstractPrefix = /^\s*(ABSTRACT:?|RESUMO:?|RESUMEN:?|ZUSAMMENFASSUNG:?)/i;
	translator.setHandler('itemDone', function(obj, item) {
		if (abstract) item.abstractNote = abstract.replace(abstractPrefix, "").replace(/[\n\t]/g, "").
												   replace(keywordsInAbstractsPrefix, "");
		if (Array.isArray(transAbstract) && transAbstract.length) {
			item.notes.push({note: "abs:" + transAbstract[0].innerText.replace(abstractPrefix, "").
											replace(keywordsInAbstractsPrefix, "")});
			// we can currently handle one additional language
			if (transAbstract.length > 1)
				item.notes.push({note: "abs1:" + transAbstract[1].innerText.replace(abstractPrefix, "").
												 replace(keywordsInAbstractsPrefix, "")});
		}
		//abstract in orginal language
		if (!abstract && item.ISSN === '0049-3449') {
 			item.abstractNote = text(doc, ' p:nth-child(4)');
 		}
		if (!item.creators[0] && extractAuthors(doc)) {
			for (let author of extractAuthors(doc))
				item.creators.push(ZU.cleanAuthor(author));
		}
		// remove duplicate authors
		let itemCreators = item.creators;
		item.creators = Array.from(new Set(itemCreators.map(JSON.stringify))).map(JSON.parse);
		var keywords = ZU.xpath(doc, '//b[contains(text(), "Keywords:") or contains(text(), "Key words")]/..');
		if (!keywords || keywords.length === 0) keywords = ZU.xpath(doc, '//strong[contains(text(), "Keywords:") or contains(text(), "Key words")]/.. | /html/body/div[1]/div[2]/div[2]/p[5]');
		if (keywords && keywords.length > 0) {
			item.tags = keywords[0].textContent
						.trim()
						.replace(/\n/g, "")
						.replace(/key\s?words\s*:\s*/ig, "")
						.split(";")
						.map(function(x) { return x.trim(); })
						.map(function(y) { return y.charAt(0).toUpperCase() + y.slice(1); });
		}
		item.libraryCatalog = "SciELO"
		var domAbstract = ZU.xpath(doc, "//a[text()='abstract in  English']/@href");
		if (domAbstract.length > 0) {
			var secondUrlAbstract = domAbstract[0].value;//Z.debug(lookupAbstract)	
			ZU.processDocuments(secondUrlAbstract, function (scrapeAbstract){
				var secondAbstract = text(scrapeAbstract, ' p:nth-child(4)');
				if (secondAbstract && item.ISSN === '0049-3449')  {
					item.notes.push({note: "abs:" + secondAbstract});
				}
			});
		}
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Impressões sobre o teste rápido para o HIV entre usuários de drogas injetáveis no Brasil",
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
				"date": "2007-12",
				"DOI": "10.1590/S0034-89102007000900015",
				"ISSN": "0034-8910, 0034-8910, 1518-8787",
				"abstractNote": "OBJETIVO: Descrever as impressões, experiências, conhecimentos, crenças e a receptividade de usuários de drogas injetáveis para participar das estratégias de testagem rápida para HIV. MÉTODOS: Estudo qualitativo exploratório foi conduzido entre usuários de drogas injetáveis, de dezembro de 2003 a fevereiro de 2004, em cinco cidades brasileiras, localizadas em quatro regiões do País. Um roteiro de entrevista semi-estruturado contendo questões fechadas e abertas foi usado para avaliar percepções desses usuários sobre procedimentos e formas alternativas de acesso e testagem. Foram realizadas 106 entrevistas, aproximadamente 26 por região. RESULTADOS: Características da população estudada, opiniões sobre o teste rápido e preferências por usar amostras de sangue ou saliva foram apresentadas junto com as vantagens e desvantagens associadas a cada opção. Os resultados mostraram a viabilidade do uso de testes rápidos entre usuários de drogas injetáveis e o interesse deles quanto à utilização destes métodos, especialmente se puderem ser equacionadas questões relacionadas à confidencialidade e confiabilidade dos testes. CONCLUSÕES: Os resultados indicam que os testes rápidos para HIV seriam bem recebidos por essa população. Esses testes podem ser considerados uma ferramenta valiosa, ao permitir que mais usuários de drogas injetáveis conheçam sua sorologia para o HIV e possam ser referidos para tratamento, como subsidiar a melhoria das estratégias de testagem entre usuários de drogas injetáveis.",
				"journalAbbreviation": "Rev. Saúde Pública",
				"language": "pt",
				"libraryCatalog": "SciELO",
				"pages": "94-100",
				"publicationTitle": "Revista de Saúde Pública",
				"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/",
				"volume": "41",
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
						"tag": "Abuso de substâncias por via intravenosa"
					},
					{
						"tag": "Brasil"
					},
					{
						"tag": "Pesquisa qualitativa"
					},
					{
						"tag": "Serviços de diagnóstico"
					},
					{
						"tag": "Sorodiagnóstico da Aids"
					},
					{
						"tag": "Síndrome de imunodeficiência adquirida"
					},
					{
						"tag": "Técnicas de diagnóstico e procedimentos"
					},
					{
						"tag": "Vulnerabilidade em saúde"
					}
				],
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
				"title": "Como se escolhe um candidato a Presidente?: Regras e práticas nos partidos políticos da América Latina",
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
				"language": "pt",
				"libraryCatalog": "SciELO",
				"pages": "158-188",
				"publicationTitle": "Opinião Pública",
				"shortTitle": "Como se escolhe um candidato a Presidente?",
				"url": "http://www.scielo.br/scielo.php?script=sci_abstract&pid=S0104-62762002000200002&lng=en&nrm=iso&tlng=pt",
				"volume": "8",
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
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://search.scielo.org/?q=&lang=pt&count=15&from=0&output=site&sort=&format=summary&fb=&page=1&q=zotero&lang=pt&page=1",
		"items": "multiple"
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
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Palabras clave\t\t:\t\tPapado"
					},
					{
						"tag": "Potestad apostólica."
					},
					{
						"tag": "Teoría omni-insular"
					}
				],
				"notes": [
					{
						"note": "abs:The article explains the so-called ‘omni-insular’ theory based on the donation of Constantine. We conclude that the references to this Donation are few and circumstantial. Just in some cases can be testified that the Pope demanded an economical and periodical amount based on his rights over the whole Occident islands. This amount seems derived from the feudal context, the prestige of being the successor of Peter, and the recognition of apostolic protection. The intervention of the popes in the Portuguese and Castilian overseas expansion was based firstly on their condition of Vicar of Christ (apostolic authority) and secondly on the hierocratic doctrine of the Lordship of the World (Dominium Mundi)."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=es",
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
				"abstractNote": "La aproximación antropológica de Sacrosanctum concilium a la sagrada liturgia exige adentrarse en el universo del lenguaje simbólico y su proceso semiótico. Este arroja una luz importante para re-pensar el ex opere operato desprendiéndose de una visión ontológica-estática para adentrarse en la dinámica de una acción re-presentada gracias a la acción del Espíritu Santo. La reflexión semiótica del siglo pasado, especialmente en los autores estadounidenses Charles Peirce y Charles Morris, ayuda seriamente para comprender cómo los ritus et preces de la celebración litúrgica son un lugar teológico de la acción del Espíritu que posibilita el encuentro de lo humano y lo divino.",
				"issue": "4",
				"libraryCatalog": "SciELO",
				"pages": "457-474",
				"publicationTitle": "Teología y vida",
				"shortTitle": "Re-pensar el ex opere operato II",
				"url": "https://scielo.conicyt.cl/scielo.php?script=sci_abstract&pid=S0049-34492019000400457&lng=en&nrm=iso&tlng=es",
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
						"tag": "Ex opere operato."
					},
					{
						"tag": "Lenguaje simbólico"
					},
					{
						"tag": "Liturgia"
					},
					{
						"tag": "Performativo"
					},
					{
						"tag": "Ritualidad"
					},
					{
						"tag": "Sacramentos"
					},
					{
						"tag": "Semiótica"
					}
				],
				"notes": [
					{
						"note": "abs:The anthropological approach of Sacrosanctum concilium to the sacred liturgy requires entering into the universe of symbolic language and its semiotic process. It casts an important light to re-think the ex opere operato, detaching itself from an ontological-static vision to enter into the dynamics of an action re-presented thanks to the action of the Holy Spirit. The semiotic reflection of the last century, especially in American authors Charles Peirce and Charles Morris, helps seriously to understand how the ritus et preces of the liturgical celebration are a theological place of the action of the Spirit that makes possible the encounter of the human and the divine."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
