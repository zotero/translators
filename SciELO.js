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
	"lastUpdated": "2024-12-06 18:29:19"
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


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
		let abstract = item.language === 'en'
			? innerText(doc, '.articleSection--abstract')
			: innerText(doc, '.articleSection--resumo');
		if (abstract) {
			item.abstractNote = abstract.replace(/^\s*(ABSTRACT|RESUMO|RESUMEN)/i, "").replace(/[\n\t]/g, "");
		}
		item.DOI = attr(doc, 'a._doi', 'href') || item.DOI;
		item.libraryCatalog = "SciELO";
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
		"url": "https://www.scielo.br/j/op/a/JNgwxBLSnHQnSJbzhkRbCBq/?lang=pt",
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
				"date": "2002-10",
				"DOI": "https://doi.org/10.1590/S0104-62762002000200002",
				"ISSN": "0104-6276, 1807-0191",
				"abstractNote": "Este trabalho examina a maneira como os partidos políticos da América Latina selecionam seus candidatos às eleições presidenciais. A análise está baseada no estudo de 44 partidos de 16 países da América Latina, e mostra que apesar da crescente tendência para o emprego de processos mais inclusivos na seleção dos candidatos nas últimas décadas, predomina a centralização do processo de tomada de decisões dos partidos da região. O material empírico provém da pesquisa sobre Partidos Políticos e Governabilidade na América Latina da Universidad de Salamanca.",
				"journalAbbreviation": "Opin. Publica",
				"language": "pt",
				"libraryCatalog": "SciELO",
				"pages": "158-188",
				"publicationTitle": "Opinião Pública",
				"shortTitle": "Como se escolhe um candidato a Presidente?",
				"url": "https://www.scielo.br/j/op/a/JNgwxBLSnHQnSJbzhkRbCBq/?lang=pt",
				"volume": "8",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "América Latina"
					},
					{
						"tag": "eleições internas"
					},
					{
						"tag": "partidos políticos"
					},
					{
						"tag": "seleção de candidatos"
					}
				],
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
		"url": "https://www.scielo.br/j/rbfis/a/69tz8bYzpn36wcdTNSGWKyj/?lang=en",
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
					}
				],
				"date": "2013-08-01",
				"DOI": "https://doi.org/10.1590/S1413-35552013005000097",
				"ISSN": "1413-3555, 1809-9246",
				"abstractNote": "BACKGROUND: The concepts of quality management have increasingly been introduced into the health sector. Methods to measure satisfaction and quality are examples of this trend. OBJECTIVE: This study aimed to identify the level of customer satisfaction in a physical therapy department involved in the public area and to analyze the key variables that impact the usersâ€(tm) perceived quality. METHOD: A cross-sectional observational study was conducted, and 95 patients from the physical therapy department of the Hospital Universitário Gaffrée e Guinle - Universidade Federal do Estado do Rio de Janeiro (HUGG/UNIRIO) - Rio de Janeiro, Brazil, were evaluated by the SERVQUAL questionnaire. A brief questionnaire to identify the sociocultural profile of the patients was also performed. RESULTS: Patients from this health service presented a satisfied status with the treatment, and the population final average value in the questionnaire was 0.057 (a positive value indicates satisfaction). There was an influence of the educational level on the satisfaction status (χ‡Â²=17,149; p=0.002). A correlation was found between satisfaction and the dimensions of tangibility (rho=0.56, p=0.05) and empathy (rho=0.46, p=0.01) for the Unsatisfied group. Among the Satisfied group, the dimension that was correlated with the final value of the SERVQUAL was responsiveness (rho=0.44, p=0.01). CONCLUSIONS: The final values of the GGUH physical therapy department showed that patients can be satisfied even in a public health service. Satisfaction measures must have a multidimensional approach, and we found that people with more years of study showed lower values of satisfaction.",
				"journalAbbreviation": "Braz. J. Phys. Ther.",
				"language": "en",
				"libraryCatalog": "SciELO",
				"pages": "328-335",
				"publicationTitle": "Brazilian Journal of Physical Therapy",
				"url": "https://www.scielo.br/j/rbfis/a/69tz8bYzpn36wcdTNSGWKyj/?lang=en",
				"volume": "17",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "health management"
					},
					{
						"tag": "physical therapy"
					},
					{
						"tag": "user satisfaction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.br/j/estpsi/a/RD9ttYPdZ9p8GfdmrXXNtKn/?lang=en",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Challenges of Indigenous Psychology in providing assistance to university students",
				"creators": [
					{
						"firstName": "Érica Soares",
						"lastName": "Assis",
						"creatorType": "author"
					},
					{
						"firstName": "Leandro Pires",
						"lastName": "Gonçalves",
						"creatorType": "author"
					},
					{
						"firstName": "Flávio Henrique",
						"lastName": "Rodrigues",
						"creatorType": "author"
					},
					{
						"firstName": "Kellen Natalice",
						"lastName": "Vilharva",
						"creatorType": "author"
					},
					{
						"firstName": "Nelson Filice de",
						"lastName": "Barros",
						"creatorType": "author"
					}
				],
				"date": "2024-07-15",
				"DOI": "https://doi.org/10.1590/1982-0275202441e230095en",
				"ISSN": "0103-166X, 1982-0275",
				"abstractNote": "Objective  This article aims to discuss the approach of indigenous psychology in the care of indigenous students in a university framework.Method  Using a qualitative method, this article presents a case study detailing the formation trajectory of the Rede de Escuta e Desaprendizagens Étnico-Subjetivas (Network of Ethno-Subjective Listen-ing and Unlearning) to review the application of the principles of indigenous psychology in sup-porting indigenous students and their families at Universidade Estadual de Campinas (Unicamp, State University of Campinas), Brazil.Results  The study highlighted the need to recognize different epistemologies for respectful therapeutic connections. Challenges were faced in the application of practices aligned with indigenous psychology, emphasizing co-authorship in sessions, valuing patients’ perspectives, and continuous unlearning. The study of the cultural elements of the ethnicities involved proved crucial to avoid the pathologization of indigenous worldviews and subjectivities.Conclusion  Indigenous psychology presents itself as a tool for the changes in the cultural struggles, highlighting the gap in clinical approaches and the urgent need for further studies to develop personalized interven-tions for the care of the diverse indigenous ethnicities.Keywords Mental health in ethnic groups; Mental health services; Psychology; Psychosocial support systems; Students",
				"journalAbbreviation": "Estud. psicol. (Campinas)",
				"language": "en",
				"libraryCatalog": "SciELO",
				"pages": "e230095",
				"publicationTitle": "Estudos de Psicologia (Campinas)",
				"url": "https://www.scielo.br/j/estpsi/a/RD9ttYPdZ9p8GfdmrXXNtKn/?lang=en",
				"volume": "41",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Mental health in ethnic groups"
					},
					{
						"tag": "Mental health services"
					},
					{
						"tag": "Psychology"
					},
					{
						"tag": "Psychosocial support systems"
					},
					{
						"tag": "Students"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scielo.br/j/estpsi/a/RD9ttYPdZ9p8GfdmrXXNtKn/?lang=pt",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Desafios da Psicologia Indígena no atendimento a estudantes universitários",
				"creators": [
					{
						"firstName": "Érica Soares",
						"lastName": "Assis",
						"creatorType": "author"
					},
					{
						"firstName": "Leandro Pires",
						"lastName": "Gonçalves",
						"creatorType": "author"
					},
					{
						"firstName": "Flávio Henrique",
						"lastName": "Rodrigues",
						"creatorType": "author"
					},
					{
						"firstName": "Kellen Natalice",
						"lastName": "Vilharva",
						"creatorType": "author"
					},
					{
						"firstName": "Nelson Filice de",
						"lastName": "Barros",
						"creatorType": "author"
					}
				],
				"date": "2024-07-15",
				"DOI": "https://doi.org/10.1590/1982-0275202441e230095pt",
				"ISSN": "0103-166X, 1982-0275",
				"abstractNote": "Objetivo  Este artigo tem como objetivo discutir a abordagem da psicologia indígena no cuidado de estudantes indígenas em contexto universitário.Método  Utilizando o método qualitativo, este artigo apresenta um estudo de caso detalhando a trajetória de formação da Rede de Escuta e Desaprendizagens Étnico-Subjetivas, para analisar a aplicação dos pressupostos da psicologia indígena no suporte a estudantes indígenas e seus familiares na Universidade Estadual de Campinas.Resultados  Evidenciou-se a necessidade de reconhecer diferentes epistemologias para uma conexão terapêutica respeitosa. Foram observados desafios na aplicação de práticas alinhadas com a psicologia indígena, destacando a coautoria nas sessões, a valorização das perspectivas dos pacientes e as desaprendizagens contínuas. O estudo dos elementos culturais das etnias envolvidas mostrou-se crucial para evitar a patologização das cosmovisões e subjetividades indígenas.Conclusão  A psicologia indígena apresenta-se como um vetor de mudança nas disputas de narrativas culturais, destacando a lacuna na abordagem clínica e a necessidade urgente de estudos para desenvolver intervenções personalizadas para o atendimento das diferentes etnias indígenas.Palavras-chave Estudantes; Psicologia; Saúde mental em grupos étnicos; Serviços de saúde mental; Sistemas de apoio psicossocial",
				"journalAbbreviation": "Estud. psicol. (Campinas)",
				"language": "pt",
				"libraryCatalog": "SciELO",
				"pages": "e230095",
				"publicationTitle": "Estudos de Psicologia (Campinas)",
				"url": "https://www.scielo.br/j/estpsi/a/RD9ttYPdZ9p8GfdmrXXNtKn/?lang=pt",
				"volume": "41",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Estudantes"
					},
					{
						"tag": "Psicologia"
					},
					{
						"tag": "Saúde mental em grupos étnicos"
					},
					{
						"tag": "Serviços de saúde mental"
					},
					{
						"tag": "Sistemas de apoio psicossocial"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
