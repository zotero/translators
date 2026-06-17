{
	"translatorID": "dd5761aa-4145-4911-b45c-16c78cfc24c8",
	"label": "Ined",
	"creator": "Mysciencework",
	"target": "^https?://archined\\.ined\\.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-04 18:32:52"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2025 Mysciencework
	
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

function detectWeb(doc, url) {
	if (url.includes("/view/")) {
		Z.monitorDOMChanges(doc.body);

		const typeMap = {
			"Article in journals listed by research assessment bodies": "journalArticle",
			"Article in other scientific journals": "journalArticle",
			"Article in journals of debate": "journalArticle",
			"Article in popular science journal": "journalArticle",
			"Editor of special issue": "journalArticle",
			"Book review": "journalArticle",
			Book: "book",
			"Editor or co-editor of books, proceedings": "book",
			"Dictionary/Encyclopedia article": "dictionaryEntry",
			"Book chapter": "bookSection",
			"Conference proceedings": "bookSection",
			"Working paper (published in Working paper series)": "report",
			"Unpublished working paper": "report",
			"Official report": "report",
			"Research report": "report",
			"Institutional report": "report",
			"Plan de gestion de données": "report",
			"Doctoral thesis": "thesis",
			"Habilitation thesis (HDR)": "thesis",
			"Seminar paper / lecture": "conferencePaper",
			"Conference paper": "conferencePaper",
			"Conference poster": "conferencePaper",
			"Contribution to newspaper / non-academic periodical": "newspaperArticle",
			Map: "map",
			"Teaching material": "report",
			"Software (computer program, package, etc)": "computerProgram",
			"Online publication": "blogPost",
			Image: "figure",
			"Movie, video": "videoRecording",
			"Audio-file": "audioRecording",
			"Other documents": "report",
			Dataset: "report",
			"Article dans des revues référencées par les instances d’évaluation": "journalArticle",
			"Article dans d’autres revues scientifiques": "journalArticle",
			"Article dans des revues de débat": "journalArticle",
			"Article de vulgarisation scientifique": "journalArticle",
			"Direction de numéros spéciaux de revues": "journalArticle",
			"Recension d'ouvrages": "journalArticle",
			Ouvrage: "book",
			"Direction ou co-direction d'ouvrages, actes de colloque": "book",
			"Article de dictionnaire/d'encyclopédie": "dictionaryEntry",
			"Chapitre d'ouvrage": "bookSection",
			"Chapitre d'actes de colloque": "bookSection",
			"Document de travail (publié dans une collection institutionnelle) ": "report",
			"Document de travail non-publié": "report",
			"Rapport aux financeurs ou aux ministères de tutelle": "report",
			"Rapport de recherche": "report",
			"Rapport institutionnel": "report",
			"Data Management Plan": "report",
			"Thèse de doctorat": "thesis",
			"Mémoire d'habilitation (HDR)": "thesis",
			"Communication dans un séminaire scientifique": "conferencePaper",
			"Communication dans un colloque": "conferencePaper",
			"Poster dans un colloque": "conferencePaper",
			"Contribution dans la presse": "newspaperArticle",
			Carte: "map",
			"Matériel pédagogique": "report",
			"Logiciel (programme, package informatique, etc.)": "computerProgram",
			"Publication en ligne (article de blog, site web, etc)": "blogPost",
			Vidéo: "videoRecording",
			Audio: "audioRecording",
			"Autres documents": "report",
			"Jeu de données": "report",
		};

		return typeMap[text(doc, ".hero-body .card-header .tag")] || "journalArticle";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var risUrl = url.replace(/[#?].*$/, "").replace("/view/", "/api/public/v2/view/") + "/ris";

	ZU.doGet(risUrl, function (ris) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(ris);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.place) {
				item.place = item.place.replace(/"/g, '');
			}
			if (item.archiveLocation) {
				if (item.url) {
					item.attachments = [{
						title: 'Catalog Page',
						url: item.url,
						mimeType: "text/html",
						snapshot: false,
					}];
				}
				item.url = item.archiveLocation;
				delete item.archiveLocation;
			}
			if (item.tags && item.tags.length > 0) {
				let filteredTags = [];
				let allTags = '';
				item.tags.sort((a, b) => b.length - a.length)
					.forEach((tag) => {
						if (!allTags.includes(tag.toLowerCase())) {
							allTags += ' ' + tag.toLowerCase();
							filteredTags.push({ tag: ZU.capitalizeTitle(tag.toLowerCase(), true) });
						}
					});
				item.tags = filteredTags;
			}
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://archined.ined.fr/view/AXKZJjYfqpl52aYY4O-h",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Three sub-Saharan migration systems in times of policy restriction",
				"creators": [
					{
						"lastName": "Beauchemin",
						"firstName": "Cris",
						"creatorType": "author"
					},
					{
						"lastName": "Flahaux",
						"firstName": "Marie-Laurence",
						"creatorType": "author"
					},
					{
						"lastName": "Schoumaker",
						"firstName": "Bruno",
						"creatorType": "author"
					}
				],
				"date": "2020-05-30",
				"DOI": "10.1186/s40878-020-0174-y",
				"abstractNote": "This paper reviews new evidence on the trends and patterns of migration between Africa and Europe since the mid-1970s, and discusses their congruency with the changing context of migration policy. Using data from the Determinants of International Migration (DEMIG) and the Migration between Africa and Europe (MAFE) projects, we compare flows and policies of three African and six European destination countries (Democratic Republic of Congo, Ghana, and Senegal, on the one hand; and Belgium, France, Italy, Spain, the Netherlands, and the UK, on the other). The paper focuses on topics that quantitative studies usually overlook due to the lack of data, namely the propensity to out-migrate, legal status at entry, routes of migration, and propensity to return. We show that times of restrictions in Europe do not correspond to less African out-migration, but rather to more unauthorized migration and fewer returns. We further show that trends in African migration differ greatly between historical and new destination countries in Europe.",
				"issue": "19",
				"journalAbbreviation": "Comparative Migration Studies",
				"language": "EN",
				"libraryCatalog": "Ined",
				"pages": "1-27",
				"publicationTitle": "Comparative Migration Studies",
				"url": "http://hdl.handle.net/20.500.12204/AXKZJjYfqpl52aYY4O-h",
				"volume": "8",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Afrique Subsaharienne / Sub-Saharan Africa"
					},
					{
						"tag": "Europe / Europe"
					},
					{
						"tag": "Flux Migratoire / Migration Flows"
					},
					{
						"tag": "Legal Status"
					},
					{
						"tag": "Migration Internationale / International Migration"
					},
					{
						"tag": "Migration Policies"
					},
					{
						"tag": "Migration Routes"
					},
					{
						"tag": "Migration Systems"
					},
					{
						"tag": "Migration Trends"
					},
					{
						"tag": "Out-Migration"
					},
					{
						"tag": "Politique Migratoire / Migration Policy"
					},
					{
						"tag": "Quantitative Approach"
					},
					{
						"tag": "Return"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archined.ined.fr/view/AXTjrQ0MkgKZhr-blfp9",
		"defer": true,
		"items": [
			{
				"itemType": "thesis",
				"title": "Urban bias in Latin American causes of death patterns",
				"creators": [
					{
						"lastName": "Garcia",
						"firstName": "Jenny",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"abstractNote": "In 1977, Michael Lipton introduced the Urban Bias Thesis as a framework for understanding how most macro- and microeconomic policy initiatives have historically benefited the overdevelopment of urban areas and the underdevelopment of rural areas, as a result of the historical urban bias in resource reallocation. In Latin America, urbanization and mortality decline have historically been positively related: the health transition in the region has been initiated in the main cities and has tended to proceed more rapidly in countries with higher levels of urbanization. Given this context, this research looks for evidence on two phenomena: the persistence of an urban advantage in mortality; and traces of an “urban bias” in the causes of death patterns in the region. Using a sample of Latin American countries over the period 2000-2010, I apply decomposition methods on life expectancy at birth to analyze the disparities in mortality patterns and causes of death when urban and rural areas are considered separately. Urban is defined as a continuum category instead of a dichotomous concept. Hence, three types of spatial groups are recognizable in each country: main and large cities (more than 500,000 inhabitants); medium-sized and small cities (20,000 to 499,000 inhabitants); and towns and purely rural areas combined (less than 20,000 inhabitants). The countries under analysis are Brazil, Chile, Colombia, Ecuador, Mexico, Peru and Venezuela. Because comparability across time and countries is needed to ensure a high standard of data quality, two major issues are taken into consideration: coverage errors identified as underreporting levels; and quality errors in reported age, sex, residence and causes of death. The results indicate that the urban advantage is persistent and that rural-urban mortality differentials have consistently favored cities. Hardly any improvement in declining mortality exists in older adult ages outside the main and large cities. This urban advantage in mortality comes as an outcome of lower rates for causes of death that are amenable to primary interventions, meaning they are made amenable by the existence of basic public infrastructures as well as by the provision of basic goods and services. Countries and subpopulations are benefiting differently from progress: in the most urbanized countries, spatial-group mortality patterns are converging; while differentials remain in the least urbanized countries.",
				"language": "EN",
				"libraryCatalog": "Ined",
				"numPages": "339",
				"place": "Paris, France",
				"thesisType": "Thèse de doctorat en démographie",
				"university": "Université Paris 1 Panthéon-Sorbonne",
				"url": "http://hdl.handle.net/20.500.12204/AXTjrQ0MkgKZhr-blfp9",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Amerique Latine / Latin America"
					},
					{
						"tag": "Baisse De La Mortalite / Mortality Decline"
					},
					{
						"tag": "Bresil / Brazil"
					},
					{
						"tag": "Cause De Deces / Causes of Death"
					},
					{
						"tag": "Chili / Chile"
					},
					{
						"tag": "Colombie / Colombia"
					},
					{
						"tag": "Difference Urbain-Rural / Rural-Urban Differentials"
					},
					{
						"tag": "Ecuador"
					},
					{
						"tag": "Esperance De Vie En Sante / Health Expectancy"
					},
					{
						"tag": "Health Transition"
					},
					{
						"tag": "International Comparison"
					},
					{
						"tag": "Mexique / Mexico"
					},
					{
						"tag": "Mortalite Evitable / Avoidable Mortality"
					},
					{
						"tag": "Perou / Peru"
					},
					{
						"tag": "These / Theses"
					},
					{
						"tag": "Thesis"
					},
					{
						"tag": "Urban Advantage"
					},
					{
						"tag": "Urban Biais"
					},
					{
						"tag": "Urban Growth"
					},
					{
						"tag": "Urbanisation / Urbanization"
					},
					{
						"tag": "Venezuela / Venezuela"
					},
					{
						"tag": "Ville / Cities"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archined.ined.fr/view/AXlC5r7ikgKZhr-bl2oh",
		"defer": true,
		"items": [
			{
				"itemType": "report",
				"title": "Emploi discontinu et indemnisation du chômage : quels usages des contrats courts ?",
				"creators": [
					{
						"lastName": "Grégoire",
						"firstName": "Mathieu",
						"creatorType": "author"
					},
					{
						"lastName": "Remillon",
						"firstName": "Delphine",
						"creatorType": "author"
					},
					{
						"lastName": "Baguelin",
						"firstName": "Olivier",
						"creatorType": "author"
					},
					{
						"lastName": "Vivès",
						"firstName": "Claire",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Ji Young",
						"creatorType": "author"
					},
					{
						"lastName": "Dulac",
						"firstName": "Julie",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"abstractNote": "Entre 2000 et 2016, le nombre d’embauches en CDD de moins d’un mois a progressé de 161 % et celui en intérim de 32 % alors que sur la même période, le nombre d’embauches en CDI ou CDD de plus d’un mois n’a progressé que de 15 %. La forte progression des contrats temporaires dans les embauches s’explique ainsi depuis le début des années 2000 par un raccourcissement de la durée des contrats. Fin 2016, les embauches en CDD de moins d’un mois représentent 69 % des embauches hors intérim. \n\nCette évolution apparaît assez spécifique au marché du travail français : la part des contrats temporaires dans l’emploi salarié du secteur concurrentiel excède la moyenne européenne et la part des contrats de moins de 3 mois y est beaucoup plus élevée qu’en Allemagne, au Danemark ou même en Italie.\n\nPour comprendre les mécanismes à l’œuvre, la Dares a lancé un appel à projet de recherche (APR) autour de trois axes :\n\n- Pourquoi, dans quels cas et selon quelles modalités, les entreprises recourent-elles au contrats courts ?\n- Quelle réalité recouvre la succession de contrats courts pour les travailleurs en France et quel est le rôle des dispositifs publics et de la réglementation des contrats dans ce développement ?\n- Quelles sont les caractéristiques des personnes recrutées en contrats courts et quelles conséquences le passage par un ou plusieurs contrats courts a-t-il sur leurs trajectoires professionnelles à plus long terme ?\n\nJusqu’ici, dans les travaux qualitatifs et/ou sociologiques, la question de l’interaction entre l’usage de contrats courts et l’assurance chômage se limite aux différents métiers du spectacle, parfois comparés à la situation des pigistes. IDHE-S (Institutions et dynamiques historiques de l’économie et de la société) de l’Université de Nanterre et le CEET-CNAM étudient le spectre des usages possibles des contrats courts et des dispositifs d’activité réduite de l’assurance chômage. En effet, l’augmentation des contrats courts pourrait relever à la fois d’une logique générale applicable à tout le marché du travail et aussi de contextes sectoriels : D’un côté, l’augmentation générale des contrats courts semble bien indiquer une tendance commune. De l’autre, le recours au CDD d’usage semble concentré sur certains secteurs.",
				"institution": "DARES - Ministère de travail",
				"language": "FR",
				"libraryCatalog": "Ined",
				"pages": "263",
				"place": "Paris, France",
				"reportNumber": "004",
				"reportType": "Rapport d'études, Dares",
				"seriesTitle": "Rapport d'études, Dares",
				"shortTitle": "Emploi discontinu et indemnisation du chômage",
				"url": "http://hdl.handle.net/20.500.12204/AXlC5r7ikgKZhr-bl2oh",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Analyse De Séquences"
					},
					{
						"tag": "Cdd"
					},
					{
						"tag": "Chomage / Unemployment"
					},
					{
						"tag": "Contrat De Travail / Labour Contracts"
					},
					{
						"tag": "Contrats Courts"
					},
					{
						"tag": "Contrats De Travail"
					},
					{
						"tag": "Emploi / Employment"
					},
					{
						"tag": "Fh-Dads"
					},
					{
						"tag": "France / France"
					},
					{
						"tag": "Indemnisation Chômage"
					},
					{
						"tag": "Méthodes Mixtes"
					},
					{
						"tag": "Precarite / Social Precariousness"
					},
					{
						"tag": "Rapport De Recherche / Research Reports"
					},
					{
						"tag": "Trajectoires Professionnelles"
					},
					{
						"tag": "Travail Temporaire / Temporary Work"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archined.ined.fr/view/AXucNy80kgKZhr-bmEo_",
		"defer": true,
		"items": [
			{
				"itemType": "report",
				"title": "Ranking the burden of disease attributed to known risk factors",
				"creators": [
					{
						"lastName": "Lionello",
						"firstName": "Lorenzo",
						"creatorType": "author"
					},
					{
						"lastName": "Counil",
						"firstName": "Emilie",
						"creatorType": "author"
					},
					{
						"lastName": "Henry",
						"firstName": "Emmanuel",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"abstractNote": "The Global Burden of Disease’s (GBD) comparative risk assessment analysis (CRA) is a quantitative estimation of the contribution of known risk factors to the injuries and sequelae\nenumerated by the study each year. The CRA was introduced in 2002 and has a complex methodology that builds on the epidemiologic concept of attributable risk, or population\nattributable fractions (PAFs). This work, second of two volumes on the GBD’s evolution, is focused on explaining and tracing the methodological choices of its risk assessment\ncomponent, with a specific focus on environmental and occupational risk factors. We explore the estimates provided by the Institute of Health Metrics and Evaluation (IHME) and\nunderstand how they were calculated. Then, we assess some of the most pressing critiques, and conclude by reflecting on its influence, methodological choices, and future outlook as the IHME sets itself a leading institution in health estimates. This work is part of a broader research analyzing the role of population health metrics, in particular PAFs, on the definition of public health problems and influencing their agendas. The research relies on a literature review (nonstructured) of published studies and commentaries. It follows a chronological development of the CRA estimates since their first publication in 2002 to the version released in 2019.",
				"institution": "Ined",
				"language": "EN",
				"libraryCatalog": "Ined",
				"pages": "44",
				"place": "Aubervilliers, France",
				"reportNumber": "266",
				"reportType": "Documents de travail",
				"url": "http://hdl.handle.net/20.500.12204/AXucNy80kgKZhr-bmEo_",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Accident Du Travail / Occupational Accidents"
					},
					{
						"tag": "Comparaison Internationale / International Comparison"
					},
					{
						"tag": "Comparative Risk Assessment"
					},
					{
						"tag": "Environmental Health"
					},
					{
						"tag": "Environnement / Environment"
					},
					{
						"tag": "Epidemiology"
					},
					{
						"tag": "Facteur De Risque / Risk Factor"
					},
					{
						"tag": "Gates Foundation"
					},
					{
						"tag": "Global Burden of Disease"
					},
					{
						"tag": "Institute of Health Metrics and Evaluations (ihme)"
					},
					{
						"tag": "Occupational Health"
					},
					{
						"tag": "Profession / Occupations"
					},
					{
						"tag": "Risk Factors"
					},
					{
						"tag": "Sante / Health"
					},
					{
						"tag": "Sante Publique / Public Health"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
