{
	"translatorID": "9a0deb91-85ad-414d-a094-ec5296fa996c",
	"label": "BDTD JSON",
	"creator": "Felipe Alexande Ferreira",
	"target": "json",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2022-07-16 05:14:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Felipe Alexandre Ferreira
	
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

/**
 * Import json files that were exported from "Biblioteca Digital Brasileira de Teses e Dissertações" (https://bdtd.ibict.br).
 * Do a search and then import as JSON.
 */

function readWholeInput() {
	var str, json = "";
	
	//Other JSON translators are reading whole file too.
	//TODO parse json as stream (there are some npm modules implementing this.)
	while ((str = Z.read(1048576*10)) !== false) json += str;
	
	return json;
}

function validBDTDItem(item) {
	if(!item.id) return false;
	if(!item.title) return false;
	if(!item.authors) return false;
	if(typeof(item.id) !== 'string') return false;
	if(typeof(item.title) !== 'string') return false;
	if(typeof(item.authors) !== 'object') return false;
	if(Array.isArray(item.authors)) return false;
	return true;
}

function validBDTD(data) {
	let obj;
	try {
		obj = JSON.parse(data);
	} catch (e) {
		return false;
	}
	if(typeof(obj) !== 'object') return false;
	if(!obj.resultCount) return false;
	if(!obj.status) return false
	if(!obj.records) return false;
	if(!Array.isArray(obj.records)) return false;
	if(!obj.records.length > 0) return false;
	if(!validBDTDItem(obj.records[0])) return false;
	return true;
}

function detectImport() {
	var input = readWholeInput();
	return validBDTD(input);
}

function doImport() {
	let parsedData = JSON.parse(readWholeInput());
	if (typeof Promise == 'undefined') {
		parsedData.records.forEach(r => importItem(r));
	} else {
		return Promise.all(parsedData.records.map(r => importItem(r)));
	}
}

mapThesisType = {
	"masterThesis": "Master's Thesis",
	"doctoralThesis": "Doctoral Thesis"
}

function setThesisType(item,r) {
	if(Array.isArray(r.types) && r.types[0] && mapThesisType[r.types[0]]) {
		item.thesisType = mapThesisType[r.types[0]];
	} else if(Array.isArray(r.formats) && r.formats[0] && mapThesisType[r.formats[0]]) {
		item.thesisType = mapThesisType[r.formats[0]];
	}
}



const mapLanguage = {
	"eng": "English",
	"por": "Portuguese"
}

function importSubjectsValue(subjectsValue,item) {
	if(!Array.isArray(subjectsValue)) return;
	subjectsValue.forEach(x => {
		if(Array.isArray(x)) {
			x.forEach(tag => item.tags.push(tag));
		} else {
			if(typeof(x) == 'string') {
				item.tags.push(x);
			}
		}
	});
}

function importAllSubjects(r,item) {
	Object.keys(r).filter(key => key.startsWith("subjects") &&  Array.isArray(r[key])).forEach(key => importSubjectsValue(r[key], item));
}

function importItem(r) {
	let item = new Z.Item("thesis");//default to thesis
	item.title = r.title;
	
	setThesisType(item,r);
	
	if(Array.isArray(r.languages) && r.languages[0]) {
		let langCode = r.languages[0].toLowerCase();
		item.language = mapLanguage[langCode];
		item.abstractNote = r["abstract_"+langCode] || r.abstract_eng || r.abstract_por;
	}

	if(r.authors && r.authors.primary) {
		Object.keys(r.authors.primary).forEach(authorName => item.creators.push(Zotero.Utilities.cleanAuthor(authorName, "author", authorName.includes(","))));
	}

	if(r.authors && r.contributors && r.contributors.advisor) {
		Object.keys(r.contributors.advisor).forEach(authorName => item.creators.push(Zotero.Utilities.cleanAuthor(authorName, "advisor", authorName.includes(","))));
	}

	if(r.authors && r.contributors && r.contributors.referee) {
		Object.keys(r.contributors.referee).forEach(authorName => item.creators.push(Zotero.Utilities.cleanAuthor(authorName, "referee", authorName.includes(","))));
	}

	importAllSubjects(r,item);

	if(Array.isArray(r.urls)) {
		item.url = r.urls[0];
	}

	if(Array.isArray(r.publicationDates)) {
		item.date = r.publicationDates=[0]
	}

	if(Array.isArray(r.institutions)) {
		item.institution = r.institutions[0]
	}

	return item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "{\n    \"resultCount\": 1,\n    \"records\": [\n        {\n            \"id\": \"UFMG_2006d9b96daca23b0e5d22ef3e6d2fed\",\n            \"title\": \"Avalia\\u00e7\\u00e3o da arquitetura da informa\\u00e7\\u00e3o de bibliotecas digitais de teses e disserta\\u00e7\\u00f5es: o caso da BDTD do IBICT\",\n                        \"abstract_por\": [\n                \"Os estudos e as pesquisas acad\\u00eamico-cient\\u00edficas sobre media\\u00e7\\u00e3o pedag\\u00f3gica t\\u00eam sido gradativamente ampliados, sobretudo, nos \\u00faltimos vinte anos com a introdu\\u00e7\\u00e3o de recursos tecnol\\u00f3gicos nas diversas esferas sociais e, em especial no campo educacional. A intensa prolifera\\u00e7\\u00e3o de informa\\u00e7\\u00f5es, as mudan\\u00e7as nas rela\\u00e7\\u00f5es de comunica\\u00e7\\u00e3o e a\\u00e7\\u00f5es das pessoas, as novas configura\\u00e7\\u00f5es e modalidades de ensino, de alguma forma indicam a necessidade de mudan\\u00e7a na educa\\u00e7\\u00e3o escolar, no perfil e na atua\\u00e7\\u00e3o docente e discente, constituindo-se por meio de uma orienta\\u00e7\\u00e3o pedag\\u00f3gica de intera\\u00e7\\u00e3o mediatizada um dos marcos referenciais do aumento de utiliza\\u00e7\\u00e3o do termo Media\\u00e7\\u00e3o Pedag\\u00f3gica nas produ\\u00e7\\u00f5es acad\\u00eamicas das \\u00e1reas de humanas e sociais e, em especial, de educa\\u00e7\\u00e3o. Esta pesquisa interpreta as produ\\u00e7\\u00f5es acad\\u00eamico-cient\\u00edficas que versam sobre as TDICs na educa\\u00e7\\u00e3o e as bases te\\u00f3ricas que fundamentam o uso dos termos e as concep\\u00e7\\u00f5es de media\\u00e7\\u00e3o e media\\u00e7\\u00e3o pedag\\u00f3gica. O corpus \\u00e9 composto de documentos (teses e disserta\\u00e7\\u00f5es) extra\\u00eddos da BDTD e a an\\u00e1lise de conte\\u00fado tem como base a orienta\\u00e7\\u00e3o de Bardin (2010). A escolha deste corpus deu-se, sobretudo, a partir da verifica\\u00e7\\u00e3o de que nesse per\\u00edodo houve um aumento significativo do uso desse termo nas publica\\u00e7\\u00f5es acad\\u00eamicas brasileiras sobre o uso das TDICs na educa\\u00e7\\u00e3o e que o uso do termo estava fundamentado na base te\\u00f3rica referente \\u00e0s TDICs e n\\u00e3o ao pr\\u00f3prio termo, o que provocou a curiosidade e a inten\\u00e7\\u00e3o de torn\\u00e1-lo um objeto de estudo de tese. A perspectiva te\\u00f3rica para discutir o conceito de media\\u00e7\\u00e3o adotado se pauta nas Teorias de Vygotsky (2007), especificamente, a Teoria do Desenvolvimento e da Aprendizagem que se constitui de forma essencialmente social e dial\\u00e9tica. As an\\u00e1lises evidenciam que o termo e as concep\\u00e7\\u00f5es de media\\u00e7\\u00e3o pedag\\u00f3gica ainda est\\u00e3o sendo progressivamente e conceitualmente constitu\\u00eddas em suas bases te\\u00f3rico-metodol\\u00f3gicas e que s\\u00e3o as rela\\u00e7\\u00f5es de ensino e aprendizagem estabelecidas nas a\\u00e7\\u00f5es docentes e discentes da pr\\u00e1tica pedag\\u00f3gica e o uso das TDICs na educa\\u00e7\\u00e3o que efetivam a constitui\\u00e7\\u00e3o de media\\u00e7\\u00e3o pedag\\u00f3gica.\"\n            ],\n            \"abstract_eng\": [\n                \"Studies and research on academic-scientific pedagogical mediation have been gradually expanded, especially in the last twenty years with the introduction of technological resources in various social spheres and particulary in the educational field. The intense proliferation of information, changes in communication relations and actions of people, the new settings and modalities, somehow indicate the need for change in school education, in profile and in teaching performance and student, becoming through a pedagogical orientation interaction mediated one of the benchmarks of the increased use of the term \\\"Pedagogical Mediation\\\" in academic productions the areas of human and social, in particular, education. This research aims to analyze the concepts of pedagogical mediation set out in theses and dissertations produced in the years 2000-2010, available at Brazilian Digital Library of Theses and Dissertations - BDTD. The corpus consists of documents (theses and dissertations) extracted from BDTD and analysis is based on the orientation of Bardin (2010) on the content analysis. The choice of this corpus was given mainly from verification that in that time period there was a significant increase in the use of this term in the Brazilian academic publications on the use of TDICs in education and the use of the term was based on the theoretical basis relating to TDICs not the term itself, sparking the curiosity and the intention to make it an object of study thesis. The theoretical perspective adopted is guided in the theories of Vygotsky (2007), specifically the Theory of Development and Learning that is so essentially social and dialectical. Analyses have shown that the term and the concepts of \\\"pedagogical mediation\\\" are still being progressively incorporated conceptually and in their theoretical and methodological bases and the relationships that are teaching and learning in the actions established teachers and students of pedagogical practices that actualize the constitution pedagogical mediation and not the use of TDCIs in education as identified in the publications.\"\n            ],\n            \"authors\": {\n                \"primary\": {\n                    \"Kelly Cristiane Santos Morais\": {\n                        \"profile\": [\n                            [\n                                \"NA\"\n                            ]\n                        ]\n                    }\n                }\n            },\n            \"contributors\": {\n                \"advisor\": {\n                    \"Gercina Angela Borem de Oliveira Lima\": {\n                        \"profile\": [\n                            [\n                                \"NA\"\n                            ]\n                        ]\n                    }\n                },\n                \"referee\": {\n                    \"Luiz Claudio Gomes Maia\": {\n                        \"profile\": [\n                            [\n                                \"NA\"\n                            ]\n                        ]\n                    },\n                    \"Celia da Consolacao Dias\": {\n                        \"profile\": [\n                            [\n                                \"NA\"\n                            ]\n                        ]\n                    }\n                }\n            },\n            \"subjectsPOR\": [\n                [\n                    \"Biblioteca digital de\"\n                ],\n                [\n                    \"Arquitetura da Informa\\u00e7\\u00e3o\"\n                ],\n                [\n                    \"Organiza\\u00e7\\u00e3o e representa\\u00e7\\u00e3o da informa\\u00e7\\u00e3o\"\n                ],\n                [\n                    \"Busca e recupera\\u00e7\\u00e3o da informa\\u00e7\\u00e3o\"\n                ]\n            ],\n            \"institutions\": [\n                \"UFMG\"\n            ],\n            \"types\": [\n                \"masterThesis\"\n            ],\n            \"accesslevel\": \"openAccess\",\n            \"publicationDates\": [\n                \"2014\"\n            ],\n            \"urls\": [\n                \"http:\\/\\/hdl.handle.net\\/1843\\/BUBD-9VYFMG\"\n            ],\n            \"formats\": [\n                \"masterThesis\"\n            ],\n            \"languages\": [\n                \"por\"\n            ]\n        }\n    ],\n    \"status\": \"OK\"\n}",
		"items": [
			{
				"itemType": "thesis",
				"title": "Avaliação da arquitetura da informação de bibliotecas digitais de teses e dissertações: o caso da BDTD do IBICT",
				"creators": [
					{
						"firstName": "Kelly Cristiane Santos",
						"lastName": "Morais",
						"creatorType": "author"
					},
					{
						"firstName": "Gercina Angela Borem de Oliveira",
						"lastName": "Lima",
						"creatorType": "advisor"
					},
					{
						"firstName": "Luiz Claudio Gomes",
						"lastName": "Maia",
						"creatorType": "referee"
					},
					{
						"firstName": "Celia da Consolacao",
						"lastName": "Dias",
						"creatorType": "referee"
					}
				],
				"date": "0",
				"abstractNote": "Os estudos e as pesquisas acadêmico-científicas sobre mediação pedagógica têm sido gradativamente ampliados, sobretudo, nos últimos vinte anos com a introdução de recursos tecnológicos nas diversas esferas sociais e, em especial no campo educacional. A intensa proliferação de informações, as mudanças nas relações de comunicação e ações das pessoas, as novas configurações e modalidades de ensino, de alguma forma indicam a necessidade de mudança na educação escolar, no perfil e na atuação docente e discente, constituindo-se por meio de uma orientação pedagógica de interação mediatizada um dos marcos referenciais do aumento de utilização do termo Mediação Pedagógica nas produções acadêmicas das áreas de humanas e sociais e, em especial, de educação. Esta pesquisa interpreta as produções acadêmico-científicas que versam sobre as TDICs na educação e as bases teóricas que fundamentam o uso dos termos e as concepções de mediação e mediação pedagógica. O corpus é composto de documentos (teses e dissertações) extraídos da BDTD e a análise de conteúdo tem como base a orientação de Bardin (2010). A escolha deste corpus deu-se, sobretudo, a partir da verificação de que nesse período houve um aumento significativo do uso desse termo nas publicações acadêmicas brasileiras sobre o uso das TDICs na educação e que o uso do termo estava fundamentado na base teórica referente às TDICs e não ao próprio termo, o que provocou a curiosidade e a intenção de torná-lo um objeto de estudo de tese. A perspectiva teórica para discutir o conceito de mediação adotado se pauta nas Teorias de Vygotsky (2007), especificamente, a Teoria do Desenvolvimento e da Aprendizagem que se constitui de forma essencialmente social e dialética. As análises evidenciam que o termo e as concepções de mediação pedagógica ainda estão sendo progressivamente e conceitualmente constituídas em suas bases teórico-metodológicas e que são as relações de ensino e aprendizagem estabelecidas nas ações docentes e discentes da prática pedagógica e o uso das TDICs na educação que efetivam a constituição de mediação pedagógica.",
				"language": "Portuguese",
				"thesisType": "Master's Thesis",
				"url": "http://hdl.handle.net/1843/BUBD-9VYFMG",
				"attachments": [],
				"tags": [
					{
						"tag": "Arquitetura da Informação"
					},
					{
						"tag": "Biblioteca digital de"
					},
					{
						"tag": "Busca e recuperação da informação"
					},
					{
						"tag": "Organização e representação da informação"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
