{
	"translatorID": "f46cc903-c447-47d6-a2cf-c75ed22dc96b",
	"label": "Cairn.info",
	"creator": "Sebastian Karcher, Sylvain Machefert and Nicolas Chachereau",
	"target": "^https?://www\\.cairn\\.info/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-31 18:42:02"
}

/*
   CAIRN.info Translator
   Copyright (C) 2013-2022 Sebastian Karcher

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

function detectWeb(doc, _url) {
	let breadcrumbPage = text(doc, '#tab-article, #tab-resume');
	// Z.debug(breadcrumbPage)
	if (breadcrumbPage == "Ouvrage collectif") {
		return "book";
	}
	else if (breadcrumbPage == "Article") {
		return "journalArticle";
	}
	else if (breadcrumbPage == "Chapitre") {
		return "bookSection";
	}
	else if (breadcrumbPage == "Résumé") {
		let typeDocument = ZU.xpathText(doc, '//ol[@class="breadcrumb"]/li[2]/a');
		// Z.debug(typeDocument)
		if (typeDocument == "Revues") {
			return "journalArticle";
		}
		else if (typeDocument == "Ouvrages") {
			return "bookSection";
		}
	}

	if (doc.querySelectorAll('.article-list-item .titre-article')) {
		return "multiple";
	}
	
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('.article-list-item .titre-article');
	for (let row of rows) {
		let href = attr(row, 'a', 'href');
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (await detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc);
	}
}

async function scrape(doc) {
	let risURL = attr(doc, '#export-citation [data-webtrends-action="clickOnExportZotero"]', 'href');
	// Z.debug(risURL)

	let pdfLink = attr('[name="citation_pdf_url"]', 'content');
	let keywords = attr('[name="article-mot_cle"]', 'content');
	let issn = attr('[name="citation_issn"]', 'content');
	let risText = await requestText(risURL);
	// Z.debug(risText);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {
		if (item.ISSN) {
			item.ISSN = ZU.cleanISSN(item.ISSN);
		}
		if (!item.ISSN && issn) {
			item.ISSN = issn;
		}
		if (keywords) {
			let keywordArray = keywords.split(/\s*;\s*/);
			item.tags = keywordArray;
		}
		if (item.language) {
			item.language = item.language.toLowerCase();
		}

		item.archive = "";
		// There's some attachement information in the RIS that we discard
		item.attachments = [];

		if (pdfLink) {
			item.attachments.push({
				url: pdfLink.href,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});

		item.complete();
	});
	await translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-economie-du-developpement-2012-4.htm",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/resultats_recherche.php?searchTerm=artiste",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/publications-de-Topalov-Christian--1020.htm",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/resume.php?ID_ARTICLE=RESS_521_0065",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Les enjeux normatifs et politiques de la diffusion de la recherche. Bénéfices sociaux et libre accès",
				"creators": [
					{
						"lastName": "Landes",
						"firstName": "Xavier",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.4000/ress.2663",
				"ISSN": "0048-8046",
				"abstractNote": "Le savoir est une activité coopérative essentielle pour les sociétés industrielles. Base de leur modèle économique, il produit par ailleurs de nombreux bénéfices matériels, socio-politiques et distants, en particulier au travers de sa diffusion. Dans ce contexte, il devient important de déterminer les principes qui devraient orienter la répartition des coûts qu’une telle diffusion implique. La Recommandation de la Commission européenne du 17 juillet 2012 va dans ce sens en proposant de rendre gratuit l’accès aux résultats des recherches financées par des fonds publics. Elle offre ainsi un cadre idéal pour discuter de la juste répartition des coûts de diffusion du savoir.",
				"issue": "1",
				"journalAbbreviation": "Revue européenne des sciences sociales",
				"language": "fr",
				"libraryCatalog": "Cairn.info",
				"pages": "65-92",
				"publicationTitle": "Revue européenne des sciences sociales",
				"shortTitle": "Les enjeux normatifs et politiques de la diffusion de la recherche",
				"url": "https://www.cairn.info/revue-europeenne-des-sciences-sociales-2014-1-page-65.htm",
				"volume": "52-1",
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
						"tag": "bénéfices sociaux"
					},
					{
						"tag": "libre accès"
					},
					{
						"tag": "publications académiques"
					},
					{
						"tag": "recherche"
					},
					{
						"tag": "État"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/resume.php?ID_ARTICLE=RHIS_121_0049",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le mouvement pétitionnaire pour la restauration d'Henri V (automne 1873-hiver 1874). Tactique politique et expression d'un légitimisme populaire",
				"creators": [
					{
						"lastName": "Derennes",
						"firstName": "Éric",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.3917/rhis.121.0049",
				"ISSN": "0035-3264",
				"abstractNote": "Résumé1873 marque le dernier temps du possible pour une éventuelle restauration monarchique dans la personne du comte de Chambord. Le mouvement pétitionnaire populaire qui naît à l’automne 1873 permet à un peuple royaliste de faire irruption sur la scène politique, en s’appropriant un des outils codifiés sous la Révolution : le droit de pétition. Au-delà du refus du prince exprimé dans sa lettre de Salzbourg (27 octobre 1873) d’abandonner son drapeau blanc et qui empêche la restauration monarchique, les milliers de pétitions royalistes tentèrent de faire entendre les voix habituellement muettes d’artisans et d’agriculteurs, de citadins et de ruraux, d’intellectuels et d’illettrés, d’hommes et de femmes du peuple de la diversité française. L’Ouest bocager et le Midi, le Nord et les pays riverains de la Garonne affirment leur foi « inséparatiste » suivant en cela celle du prince en exil : à la fois royaliste en politique et catholique en religion. Malgré son importance, ce mouvement pétitionnaire apparaît comme le dernier sursaut d’une époque révolue ; quelques pétitions seulement ont un écho à la Chambre des députés. Cela explique en partie son échec à faire pression sur des parlementaires qui sont davantage attentifs à tracer une voie médiane entre monarchie et république dans le dessein de préserver l’avenir du pays.",
				"issue": "1",
				"journalAbbreviation": "Revue historique",
				"language": "fr",
				"libraryCatalog": "Cairn.info",
				"pages": "49-99",
				"publicationTitle": "Revue historique",
				"url": "https://www.cairn.info/revue-historique-2012-1-page-49.htm",
				"volume": "661",
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
						"tag": "assemblée nationale"
					},
					{
						"tag": "député"
					},
					{
						"tag": "légitimisme"
					},
					{
						"tag": "pétition"
					},
					{
						"tag": "restauration"
					},
					{
						"tag": "royaliste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/resume.php?ID_ARTICLE=RFS_523_0537",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Transformation de l'État ou changement de régime ? De quelques confusions en théorie et sociologie de l'État",
				"creators": [
					{
						"lastName": "Du Gay",
						"firstName": "Paul",
						"creatorType": "author"
					},
					{
						"lastName": "Scott",
						"firstName": "Alan",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.3917/rfs.523.0537",
				"ISSN": "0035-2969",
				"abstractNote": "Cet article a pour objet la question de la définition de l’État afin de rendre compte de ses transformations contemporaines. Fermement inscrits dans la tradition wébérienne, les auteurs développent une critique des travaux, qu’ils soient néomarxistes ou néowébériens, mesurant le changement de l’État contemporain par rapport à l’État tel qu’il a été défini pendant les Trente Glorieuses. La critique porte à la fois sur la périodisation et sur la conceptualisation. Partant d’une conception minimaliste de l’État défini en termes de fonctions (sécurité) et de ses moyens, de ses institutions, ils mettent en évidence la confusion d’une partie de la littérature et suggèrent de bien différencier la question de l’État de celle du gouvernement. Soucieux de réhabiliter la longue durée de l’État, ils s’appuient tout d’abord sur les travaux de l’École de Cambridge d’histoire de la pensée politique et leur méthode dite « Ideas in context », afin de montrer la lente émergence de l’État et de l’idée de l’État, invalidant ainsi toute perspective de transformation radicale de période courte. Prenant des points de comparaison plus espacés dans le passé, ils suggèrent au contraire la remarquable permanence de l’État. Ils s’appuient ensuite sur la théorie de l’État constitutionnel de Gianfranco Poggi pour affiner leur conception minimaliste de l’État. Enfin, ils mobilisent la notion de régime développée par Raymond Aron pour caractériser une partie des transformations observées, labellisées transformations de l’État de manière erronée puisqu’elles concernent le gouvernement et la politique. Cette proposition est testée à partir des travaux de Colin Crouch sur le keynésianisme privé.",
				"issue": "3",
				"journalAbbreviation": "Revue française de sociologie",
				"language": "fr",
				"libraryCatalog": "Cairn.info",
				"pages": "537-557",
				"publicationTitle": "Revue française de sociologie",
				"shortTitle": "Transformation de l'État ou changement de régime ?",
				"url": "https://www.cairn.info/revue-francaise-de-sociologie-1-2011-3-page-537.htm",
				"volume": "52",
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
		"url": "https://www.cairn.info/jeu-d-echecs-comme-representation--9782728835904-page-111.htm?contenu=resume",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Des figurines de chair et de sang (sur l'échiquier de la passion), d'après une mise en scène de Daniel Mesguich : La Seconde Surprise de l'amour de Marivaux",
				"creators": [
					{
						"lastName": "Lenglet",
						"firstName": "Sébastien",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"ISBN": "9782728835904",
				"abstractNote": "Sous le titre Le Jeu d’échecs comme représentation : univers clos ou reflet du monde ?, une publication en ligne dans la collection « Actes de la recherche à l’ENS » vient saluer le travail accompli par une équipe de jeunes chercheurs sous la direction d’Amandine Mussou (2002) et Sarah Troche.\nCapables d’absorber le joueur au point de l’abstraire du monde dans lequel il évolue, les échecs reposent d’une part sur le spectacle captivant de figurines en mouvement, d’autre part sur une structure géométrique renvoyant à un nombre infini de combinaisons. Entre incarnation et abstraction, les échecs fascinent : la richesse de leurs représentations dans la littérature et les arts en est le témoin. La dimension spéculaire des échecs est souvent admise comme une évidence. Bien plus qu’un pur divertissement de la pensée, les échecs sont là pour désigner autre chose, un ailleurs, un au-delà qui reflèterait, fidèlement ou en le déformant, le monde réel. Cette puissance allégorique des échecs a été perçue dès leur implantation en Occident. Le Moyen Âge exploite en effet les possibilités du jeu en proposant plusieurs types d’interprétations symboliques, que l’on trouve notamment décrites au début du Livre des eschez amoureux moralisés, dans les premières années du XVe siècle : les pièces de l’échiquier peuvent reproduire la société civile, être à l’image de la stratégie militaire, représenter les combinaisons infinies du ciel et des planètes, ou servir d’allégorie aux batailles amoureuses. La lecture allégorique du jeu a perduré, il suffit de se rappeler la partie que le Chevalier Block joue contre la Mort dans Le Septième Sceau d’Ingmar Bergman pour s’en convaincre. L’origine des échecs remonte au début de notre ère, en Inde, où le jeu s’appelait Tchaturanga, « le jeu des quatre rois ». Il passe ensuite en Perse et se transforme au cours de ses pérégrinations, s’adaptant aux nouvelles sociétés dans lesquelles il s’implante. Les échecs n’ont plus grand-chose à voir avec le jeu indien lorsqu’ils arrivent en Occident autour du Xe siècle.",
				"bookTitle": "Le jeu d'échecs comme représentation",
				"extra": "DOI: 10.3917/ulm.musso.2009.01.0111",
				"language": "fr",
				"libraryCatalog": "Cairn.info",
				"pages": "111-119",
				"place": "Paris",
				"publisher": "Éditions Rue d'Ulm",
				"series": "Actes de la recherche à l’Ens",
				"shortTitle": "Des figurines de chair et de sang (sur l'échiquier de la passion), d'après une mise en scène de Daniel Mesguich",
				"url": "https://www.cairn.info/jeu-d-echecs-comme-representation--9782728835904-p-111.htm",
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
