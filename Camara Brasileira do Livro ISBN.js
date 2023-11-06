{
	"translatorID": "cdb5c893-ab69-4e96-9b5c-f4456d49ddd8",
	"label": "Câmara Brasileira do Livro ISBN",
	"creator": "Abe Jellinek",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2023-09-26 16:11:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Abe Jellinek

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectSearch(items) {
	items = cleanData(items);
	return !!items.length;
}

async function doSearch(items) {
	items = cleanData(items);
	for (let { ISBN } of items) {
		let search = ISBN;
		if (ISBN.length == 10) {
			search += ' OR ' + ZU.toISBN13(ISBN);
		}
		let body = {
			count: true,
			facets: [],
			filter: '',
			orderby: null,
			queryType: 'full',
			search,
			searchFields: 'FormattedKey,RowKey',
			searchMode: 'any',
			select: '*',
			skip: 0,
			top: 1
		};
		let response = await requestJSON('https://isbn-search-br.search.windows.net/indexes/isbn-index/docs/search?api-version=2016-09-01', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				'api-key': '100216A23C5AEE390338BBD19EA86D29',
				Origin: 'https://www.cblservicos.org.br',
				Referer: 'https://www.cblservicos.org.br/'
			},
			body: JSON.stringify(body)
		});
		let results = response.value;
		for (let result of results) {
			translateResult(result);
		}
	}
}

function translateResult(result) {
	Z.debug(result)
	let item = new Zotero.Item('book');
	item.title = result.Title;
	if (result.Subtitle && !item.title.includes(':') && !result.Subtitle.includes(':')) {
		item.title += ': ' + result.Subtitle;
	}
	item.title = fixCase(item.title);
	item.abstractNote = result.Sinopse;
	item.series = fixCase(result.Colection);
	// TODO: Need example data for:
	// item.seriesNumber
	// item.volume
	// item.numberOfVolumes
	item.edition = result.Edicao;
	if (item.edition == '1') {
		item.edition = '';
	}
	item.place = (result.Cidade || '') + (result.UF ? ', ' + result.UF : '');
	item.publisher = fixCase(result.Imprint);
	item.date = ZU.strToISO(result.Date);
	item.numPages = result.Paginas;
	if (item.numPages == '0') {
		item.numPages = '';
	}
	item.language = (result.IdiomasObra && result.IdiomasObra[0]) || 'pt-BR';
	if (item.language == 'português (Brasil)') {
		item.language = 'pt-BR';
	}
	item.ISBN = ZU.cleanISBN(result.FormattedKey);
	for (let [i, author] of result.Authors.entries()) {
		if (author == author.toUpperCase()) {
			author = ZU.capitalizeName(author);
		}
		let creatorType;
		if (result.Profissoes && result.Profissoes.length === result.Authors.length) {
			switch (result.Profissoes[i]) {
				case 'Coordenador':
				case 'Autor':
				case 'Roteirista':
					creatorType = 'author';
					break;
				case 'Revisor':
				case 'Organizador':
				case 'Editor':
					creatorType = 'editor';
					break;
				case 'Tradutor':
					creatorType = 'translator';
					break;
				case 'Ilustrador': // TODO: Used?
				case 'Projeto Gráfico':
					creatorType = 'illustrator';
					break;
				default:
					// First creator is probably an author,
					// even if the Profissoes string is something weird
					creatorType = i == 0 ? 'author' : 'contributor';
					break;
			}
		}
		// No/mismatched-length Profissoes array, so we have to guess that this non-primary creator
		// is a contributor
		else if (i > 0) {
			creatorType = 'contributor';
		}
		// No/mismatched-length Profissoes array, so we have to guess that this primary creator
		// is an author
		else {
			creatorType = 'author';
		}
		// Brazilian names often contain many surnames, but determining which names are surnames
		// and which are given names is outside the scope of this translator.
		// Chicago indexes by the final element of the name alone, and so will we:
		//   https://en.wikipedia.org/wiki/Portuguese_name#Indexing
		let creator = ZU.cleanAuthor(author, creatorType, author.includes(','));
		if (!creator.firstName) creator.fieldMode = 1;
		
		// That said, we will handle name suffixes, which should be combined with the last "middle"
		// name particle in the last name
		if (creator.firstName && creator.lastName
				&& ['filho', 'junior', 'neto', 'sobrinho', 'segundo', 'terceiro']
					.includes(ZU.removeDiacritics(creator.lastName.toLowerCase()))) {
			let firstNameSplit = creator.firstName.split(/\s+/);
			if (firstNameSplit.length) {
				let lastParticleFirstName = firstNameSplit[firstNameSplit.length - 1];
				creator.lastName = lastParticleFirstName + ' ' + creator.lastName;
				creator.firstName = firstNameSplit.slice(0, firstNameSplit.length - 1).join(' ');
			}
		}
		item.creators.push(creator);
	}
	if (result.Subject) {
		item.tags.push({ tag: result.Subject });
	}
	for (let tag of result.PalavrasChave) {
		item.tags.push({ tag });
	}
	item.complete();
}

function fixCase(s) {
	if (s && s == s.toUpperCase()) {
		s = ZU.capitalizeTitle(s, true);
	}
	return s;
}

function cleanData(items) {
	if (!Array.isArray(items)) {
		items = [items];
	}
	return items
		.map((item) => {
			if (typeof item === 'string') {
				item = { ISBN: item };
			}
			if (item.ISBN) {
				item.ISBN = ZU.cleanISBN(item.ISBN);
			}
			return item;
		})
		.filter(item => item.ISBN && (
			item.ISBN.startsWith('97865')
			|| item.ISBN.startsWith('65')
			|| item.ISBN.startsWith('97885')
			|| item.ISBN.startsWith('85')));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "9786599594755"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Mercadores da Insegurança: conjuntura e riscos do hacking governamental no Brasil",
				"creators": [
					{
						"firstName": "André",
						"lastName": "Ramiro",
						"creatorType": "author"
					},
					{
						"firstName": "Pedro",
						"lastName": "Amaral",
						"creatorType": "contributor"
					},
					{
						"firstName": "Mariana",
						"lastName": "Canto",
						"creatorType": "contributor"
					},
					{
						"firstName": "Marcos César M.",
						"lastName": "Pereira",
						"creatorType": "contributor"
					},
					{
						"firstName": "Raquel",
						"lastName": "Saraiva",
						"creatorType": "contributor"
					},
					{
						"firstName": "Clara",
						"lastName": "Guimarães",
						"creatorType": "contributor"
					}
				],
				"date": "2022-10-11",
				"ISBN": "9786599594755",
				"abstractNote": "Em políticas públicas, o debate sobre como as técnicas de investigações criminais devem responder à digitalização das dinâmicas sociais tem se sobressaído e caminha em uma linha tênue entre otimização dos processos administrativos e possíveis transgressões em relação aos direitos fundamentais. Nesse sentido, técnicas de hacking governamental, ou seja, de superação de recursos de segurança em dispositivos pessoais, vem ganhando uma escalabilidade crescente e envolve a ampliação de fabricantes, revendedores e contratos com a administração pública, ao passo em que seus efeitos colaterais aos direitos fundamentais, sobretudo em relação à sociedade civil, vêm sendo denunciados internacionalmente.",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"place": "Recife, PE",
				"publisher": "IP.rec",
				"shortTitle": "Mercadores da Insegurança",
				"attachments": [],
				"tags": [
					{
						"tag": "Digital"
					},
					{
						"tag": "Direito"
					},
					{
						"tag": "Governamental"
					},
					{
						"tag": "Insegurança"
					},
					{
						"tag": "dados"
					},
					{
						"tag": "hacking"
					},
					{
						"tag": "vazamento"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "8532511015"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Harry Potter E a Pedra Filosofal",
				"creators": [
					{
						"firstName": "J. K.",
						"lastName": "Rowling",
						"creatorType": "author"
					}
				],
				"date": "2000-05-29",
				"ISBN": "9788532511010",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"publisher": "Rocco",
				"attachments": [],
				"tags": [
					{
						"tag": "Biblioteconomia e ciência da informação"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786555320275"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Harry Potter e o Prisioneiro de Azkaban",
				"creators": [
					{
						"firstName": "J. K.",
						"lastName": "Rowling",
						"creatorType": "author"
					},
					{
						"firstName": "Lia",
						"lastName": "Wyler",
						"creatorType": "contributor"
					},
					{
						"firstName": "Arch",
						"lastName": "Apolar",
						"creatorType": "contributor"
					}
				],
				"date": "2020-03-04",
				"ISBN": "9786555320275",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"publisher": "Rocco",
				"series": "Harry Potter",
				"attachments": [],
				"tags": [
					{
						"tag": "Harry-Potter"
					},
					{
						"tag": "Literatura infanto-juvenil"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786587233956"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Einstein Socialista: Entrevistas, manifestos e artigos do maior cientista do século XX",
				"creators": [
					{
						"firstName": "Albert",
						"lastName": "Einstein",
						"creatorType": "author"
					},
					{
						"firstName": "Hugo",
						"lastName": "Albuquerque",
						"creatorType": "editor"
					},
					{
						"firstName": "Lígia Magalhães",
						"lastName": "Marinho",
						"creatorType": "translator"
					}
				],
				"date": "2023-04-12",
				"ISBN": "9786587233956",
				"abstractNote": "Por serem supostamente purgadas da “ideologia”, as ciências exatas alcançaram entre nós um status de demasiada confiabilidade, objetividade e verdade, Entretanto, Albert Einstein, o maior físico do século XX, não compactuava com essa crença e defendia abertamente os valores socialistas, colocando a própria narrativa cientificista, quase sempre favorável à ordem capitalista, em curto-circuito.\n\nEinstein era um militante e não se calou diante das falaciosas equiparações entre a Alemanha Nazista e a União Soviética. Nem se calou, como judeu, diante das violências cometidas contra os palestinos, pouco depois do Holocausto, pelos colonos judeus no nascente Estado de Israel. Tampouco poupou críticas à segregação racial nos Estados Unidos, onde foi lecionar em seus últimos anos.\n\nQuando a Guerra Fria estava a todo vapor, Einstein escreveu “Por que o Socialismo?” –, um de seus artigos mais conhecidos sobre política e frequentemente esquecido e dissociado de sua imagem. Não à toa, este texto, vez ou outra, é apresentado como “novidade” e não cansa de surpreender geração após geração. E que não se diga que era uma forma atenuada de socialismo que Einstein estava falando:\n\n“Numa economia planificada, em que a produção é ajustada às necessidades da comunidade, o trabalho a ser feito seria distribuído entre todas as pessoas aptas ao trabalho e garantiria condições de vida a todo homem, mulher e criança.”\n\nOu mesmo que, especificamente sobre a Revolução Russa, ele tenha confessado a Viereck que: \n\n“O bolchevismo é uma experiência extraordinária. Não é impossível que a deriva da evolução social daqui para a frente seja em direção ao comunismo. O experimento bolchevista talvez valha a pena.”\n\nCom uma certa dose de utopismo e um enorme enigma de como o socialismo pode ser alcançado e mantido, Einstein Socialista nos apresenta uma série de artigos, entrevistas e manifestos que revelam um lado muitas vezes negligenciado e “esquecido” de um dos maiores cientistas do mundo.",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "96",
				"place": "São Paulo, SP",
				"publisher": "Autonomia Literaria",
				"shortTitle": "Einstein Socialista",
				"attachments": [],
				"tags": [
					{
						"tag": "Ciências sociais"
					},
					{
						"tag": "einstein"
					},
					{
						"tag": "nazismo"
					},
					{
						"tag": "relatividade"
					},
					{
						"tag": "socialismo"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9788565053082"
		},
		"items": [
			{
				"itemType": "book",
				"title": "State of the Art in Health and Knowledge",
				"creators": [
					{
						"firstName": "Sociedade Beneficente Israelita Brasileira Albert",
						"lastName": "Einstein",
						"creatorType": "author"
					},
					{
						"firstName": "Juliana",
						"lastName": "Samel",
						"creatorType": "translator"
					}
				],
				"date": "2023-02-02",
				"ISBN": "9788565053082",
				"abstractNote": "The book presents the Albert Einstein Teaching and Research Center - Campus Cecilia and Abram Szajman, an architectural work in the city of São Paulo, created to be one of the most advanced teaching and research centers in the world. Students and researchers interact in this building to generate knowledge, with the aim of boosting Brazilian research and all this in an environment integrated with greenery, with the use of natural light and renewable energy technology.",
				"language": "Inglês (EUA)",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "58",
				"place": "São Paulo, SP",
				"publisher": "Sociedade Beneficente Israelita Brasileira Albert Einstein",
				"attachments": [],
				"tags": [
					{
						"tag": "Arquitetura"
					},
					{
						"tag": "Landscaping"
					},
					{
						"tag": "architecture"
					},
					{
						"tag": "health"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786580341221"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Filipson: Memórias de uma menina na primeira colônia judaica no Rio Grande do Sul (1904-1920)",
				"creators": [
					{
						"firstName": "Frida",
						"lastName": "Alexandr",
						"creatorType": "author"
					},
					{
						"firstName": "Regina",
						"lastName": "Zilberman",
						"creatorType": "contributor"
					}
				],
				"date": "2023-05-11",
				"ISBN": "9786580341221",
				"abstractNote": "“Já ouviram falar de Filipson? Um nome esquisito. Nem parece brasileiro. Mas, dentro do Brasil imenso, constituía um pontinho minúsculo que ficava lá nas bandas do Sul, perdido no meio de diversas colônias prósperas compostas em sua maioria de imigrantes espanhóis, italianos e alemães e uma ou outra fazenda de brasileiros.”\n\nDesde a primeira linha, Frida Alexandr surpreende o leitor, interpelando-o com uma pergunta. Mesmo em 1967, quando suas memórias foram publicadas em edição restrita, provavelmente poucos responderiam afirmativamente à sua questão.\n\nFilipson foi a primeira colônia judaica oficial do Brasil, formada por imigrantes judeus provenientes da Bessarábia (na região onde atualmente se localiza a Moldávia). Os pais e irmãos mais velhos de Frida chegaram ao Brasil com o grupo pioneiro, em 1904, e em \"Filipson: memórias de uma menina na primeira colônia judaica no Rio Grande do Sul (1904-1920)\". Frida deixa um registro que vai dos primeiros dias da colônia à melancólica despedida, em 1920, quando sua família decide partir novamente.\n\nEntre os dois pontos, desliza a memória de Frida, que organiza os fatos sem a preocupação de ordená-los no tempo. O importante é como essas cenas — que envolvem seus familiares, sua passagem pela escola, as dificuldades financeiras da família, as ameaças representadas por uma natureza nem sempre hospitaleira — repercutem em sua sensibilidade. Frida se vale da linguagem para transmitir a emoção na forma como a vivenciou.\n\n\"Filipson\", com posfácio da pesquisadora e escritora Regina Zilberman, é um testemunho de uma etapa do processo de adaptação e preservação dos judeus do leste da Europa no Brasil. Mas esse caráter documental é acompanhado pela recuperação sensível daqueles momentos fundadores, como se a autora, à maneira de Proust, fosse em busca das vivências daquele tempo, para transmiti-lo a um leitor que pouco conhece sobre o período.",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "360",
				"place": "SÃO PAULO, SP",
				"publisher": "Chão Editora",
				"shortTitle": "Filipson",
				"attachments": [],
				"tags": [
					{
						"tag": "Biografias"
					},
					{
						"tag": "judeus"
					},
					{
						"tag": "memórias"
					},
					{
						"tag": "mulheres"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786555250053"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Ilíada = Ἰλιάς",
				"creators": [
					{
						"firstName": "",
						"lastName": "Homero",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Trajano",
						"lastName": "Vieira",
						"creatorType": "translator"
					}
				],
				"date": "2020-03-23",
				"ISBN": "9786555250053",
				"abstractNote": "Composta no século VIII a.C., a Ilíada é considerada o marco inaugural da literatura ocidental. Tradicionalmente atribuída a Homero, a obra aborda o período de algumas semanas no último ano da Guerra de Troia, durante o cerco final dos contingentes gregos à cidadela do rei Príamo, na Ásia Menor. Com seus mais de 15 mil versos, a Ilíada ganha agora uma nova tradução — das mãos de Trajano Vieira, professor livre-docente da Unicamp e premiado tradutor da Odisseia —, rigorosamente metrificada, que busca recriar em nossa língua a excelência do original, com seus símiles e invenções vocabulares. A presente edição, bilíngue, traz ainda uma série de aparatos, como um índice onomástico completo, um posfácio do tradutor, excertos da crítica, e o célebre ensaio de Simone Weil, “A Ilíada ou o poema da força”.",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "1048",
				"place": "São Paulo, SP",
				"publisher": "Editora 34",
				"attachments": [],
				"tags": [
					{
						"tag": "Literatura grega"
					},
					{
						"tag": "Literatura."
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786556752631"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Manual de Sentença Trabalhista: Compreendendo a técnica da setença trabalhista para concurso",
				"creators": [
					{
						"firstName": "Aline",
						"lastName": "Leporaci",
						"creatorType": "author"
					},
					{
						"firstName": "Adriana Leandro de Sousa",
						"lastName": "Freitas",
						"creatorType": "contributor"
					}
				],
				"date": "2023-03-02",
				"ISBN": "9786556752631",
				"abstractNote": "Nesse livro sobre sentença trabalhista, fase tão concorrida do concurso para a Magistratura do Trabalho, procuramos trazer os aspectos mais importantes a serem observados pelo candidato. O leitor poderá verificar a ordem de julgamento a seguir e a importância da fixação da prejudicialidade entre as matérias a serem analisadas. Além disso, também aprenderá as técnicas de distribuição do ônus da prova, e suas diversas teorias, sempre ressaltando qual deva ser de aplicação preferencial pelo candidato. O livro traz diversos aspectos teóricos, que são essenciais para a preparação de todos os interessados em efetivamente aprender a técnica da elaboração da sentença trabalhista, sempre com leitura fácil e direta. E não nos esquecemos dos aspectos práticos, pois o leitor terá exercícios de fixação de jornada de trabalho, e sentenças inéditas elaboradas pelas Autoras, com os respectivos gabaritos e sugestão de redação.",
				"edition": "2",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "232",
				"place": "Rio de Janeiro, RJ",
				"publisher": "Freitas Bastos Editora",
				"shortTitle": "Manual de Sentença Trabalhista",
				"attachments": [],
				"tags": [
					{
						"tag": "Direito"
					},
					{
						"tag": "Elaboração"
					},
					{
						"tag": "Jornada"
					},
					{
						"tag": "Magistratura"
					},
					{
						"tag": "Trabalhista"
					},
					{
						"tag": "Trabalho"
					},
					{
						"tag": "Técnica"
					},
					{
						"tag": "concurso"
					},
					{
						"tag": "juiz"
					},
					{
						"tag": "modelos"
					},
					{
						"tag": "sentença"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786559602513"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Batman",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Ridley",
						"creatorType": "author"
					},
					{
						"firstName": "James Tynion",
						"lastName": "IV",
						"creatorType": "contributor"
					},
					{
						"firstName": "Dandara",
						"lastName": "Palankof",
						"creatorType": "contributor"
					},
					{
						"firstName": "Pedro",
						"lastName": "Catarino",
						"creatorType": "contributor"
					},
					{
						"firstName": "Travel",
						"lastName": "Foreman",
						"creatorType": "contributor"
					},
					{
						"firstName": "Riccardo",
						"lastName": "Federici",
						"creatorType": "contributor"
					},
					{
						"firstName": "Jorge",
						"lastName": "Jimenez",
						"creatorType": "contributor"
					}
				],
				"date": "2022-03-11",
				"ISBN": "9786559602513",
				"abstractNote": "Aventuras do Batman",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "100",
				"place": "Barueri, SP",
				"publisher": "Panini Comics",
				"attachments": [],
				"tags": [
					{
						"tag": "Cartoons; caricaturas e quadrinhos"
					},
					{
						"tag": "quadrinhos"
					},
					{
						"tag": "super-herois"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9786559605101"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Superman",
				"creators": [
					{
						"firstName": "Sean",
						"lastName": "Lewis",
						"creatorType": "author"
					},
					{
						"firstName": "Phillip Kennedy",
						"lastName": "Johnson",
						"creatorType": "contributor"
					},
					{
						"firstName": "Gabriel",
						"lastName": "Faria",
						"creatorType": "contributor"
					},
					{
						"firstName": "Rodrigo",
						"lastName": "Barros",
						"creatorType": "contributor"
					},
					{
						"firstName": "Sami",
						"lastName": "Basri",
						"creatorType": "contributor"
					},
					{
						"firstName": "Phil",
						"lastName": "Hester",
						"creatorType": "contributor"
					},
					{
						"firstName": "Daniel",
						"lastName": "Sampere",
						"creatorType": "contributor"
					}
				],
				"date": "2022-03-10",
				"ISBN": "9786559605101",
				"abstractNote": "Aventuras do Superman",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"numPages": "100",
				"place": "Barueri, SP",
				"publisher": "Panini Comics",
				"attachments": [],
				"tags": [
					{
						"tag": "Cartoons; caricaturas e quadrinhos"
					},
					{
						"tag": "quadrinhos"
					},
					{
						"tag": "super-herois"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "8576664984"
		},
		"items": [
			{
				"itemType": "book",
				"title": "A Religião Nos Limites Da Simples Razão",
				"creators": [],
				"date": "2006-01-02",
				"ISBN": "9788576664987",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"publisher": "Escala Educacional",
				"series": "Série Filosofar",
				"attachments": [],
				"tags": [
					{
						"tag": "Literatura"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9788591597512"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Visões da áfrica: angola e moçambiqueJorge Alves de Lima Filho",
				"creators": [
					{
						"firstName": "Jorge Alves de",
						"lastName": "Lima Filho",
						"creatorType": "author"
					}
				],
				"date": "2015-09-29",
				"ISBN": "9788591597512",
				"language": "pt-BR",
				"libraryCatalog": "Câmara Brasileira do Livro ISBN",
				"publisher": "Jorge Alves de Lima Filho",
				"shortTitle": "Visões da áfrica",
				"attachments": [],
				"tags": [
					{
						"tag": "Coleções de obras diversas sem assunto específico"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
