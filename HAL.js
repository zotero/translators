{
	"translatorID": "f20f91fe-d875-47e7-9656-0abb928be472",
	"label": "HAL",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https://([^/.]+\\.)?hal\\.science/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-23 17:03:48"
}

/*
	***** BEGIN LICENSE BLOCK *****
	HAL translator
	Copyright © 2012-2014 Sebastian Karcher and contributors
	
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
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (doc.querySelector('.typdoc')) {
		return findItemType(doc, url);
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.results-table td > a:first-child');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function findItemType(doc, url) {
	var itemType = text(doc, '.typdoc')
		// do some preliminary cleaning
		.split("(")[0].trim() // discard parenthesized text
		.split(", ")[0].trim() // simplify "Pré-publication, Document de travail" and " Preprints, Working Papers, ..."
		.toLowerCase();
	var typeMap = {
		/* eslint-disable quote-props */
		"books": "book",
		"ouvrages": "book",
		"book sections": "bookSection",
		"chapitre d'ouvrage": "bookSection",
		"conference papers": "conferencePaper",
		"communication dans un congrès": "conferencePaper",
		"directions of work or proceedings": "book",
		"direction d'ouvrage": "book",
		"journal articles": "journalArticle",
		"article dans une revue": "journalArticle",
		"lectures": "presentation",
		"cours": "presentation",
		"other publications": "book", // this could also be report, not sure here but bibtex guesses book
		"autre publication scientifique": "book", // this could also be report, not sure here but bibtex guesses book
		"patents": "patent",
		"brevet": "patent",
		"preprints": "preprint",
		"pré-publication": "preprint",
		"reports": "report",
		"rapport": "report",
		"scientific blog post": "blogPost",
		"article de blog scientifique": "blogPost",
		"theses": "thesis",
		"thèse": "thesis",
		"poster communications": "presentation",
		"poster de conférence": "presentation",
		/* eslint-enable quote-props */
	};
	if (typeMap[itemType]) return typeMap[itemType];
	else if (url.includes("medihal-")) return "artwork";
	else return "journalArticle";
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	if (/\/document$/.test(url)) { // work on PDF pages
		var articleURL = url.replace(/\/document$/, "");
		// Z.debug(articleURL)
		await scrape(await requestDocument(articleURL));
		return;
	}

	var bibtexUrl = url.replace(/#.+|\/$/, "") + "/bibtex";
	var abstract = text(doc, '.abstract-content');
	var pdfUrl = attr(doc, "#viewer-detailed a[download]", "href");
	// Z.debug("pdfURL " + pdfUrl)
	let bibtex = await requestText(bibtexUrl);
	// Z.debug(bibtex)
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtex);
	translator.setHandler("itemDone", function (obj, item) {
		if (abstract) {
			item.abstractNote = abstract.replace(/^(Abstract|Résumé)\s*:/, "");
		}
		if (pdfUrl) {
			item.attachments = [{
				url: pdfUrl,
				title: "HAL PDF Full Text",
				mimeType: "application/pdf"
			}];
		}
		else {
			item.attachments = [{
				document: doc,
				title: "HAL Snapshot",
				mimeType: "text/html"
			}];
		}
		let detectedType = detectWeb(doc, url);
		if (detectedType == "artwork" || detectedType == "presentation") {
			item.itemType = detectedType;
		}
		if (detectedType == 'presentation' && text(doc, 'div.label-POSTER')) {
			item.presentationType = 'Poster';
		}
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://hal.archives-ouvertes.fr/hal-00328427",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Tropopause referenced ozone climatology and inter-annual variability (1994–2003) from the MOZAIC programme",
				"creators": [
					{
						"firstName": "V.",
						"lastName": "Thouret",
						"creatorType": "author"
					},
					{
						"firstName": "Jean-Pierre",
						"lastName": "Cammas",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Sauvage",
						"creatorType": "author"
					},
					{
						"firstName": "G.",
						"lastName": "Athier",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Zbinden",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Nédélec",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Simon",
						"creatorType": "author"
					},
					{
						"firstName": "Fernand",
						"lastName": "Karcher",
						"creatorType": "author"
					}
				],
				"date": "2006-03",
				"DOI": "10.5194/acp-6-1033-2006",
				"abstractNote": "The MOZAIC programme collects ozone and water vapour data using automatic equipment installed on board five long-range Airbus A340 aircraft flying regularly all over the world since August 1994. Those measurements made between September 1994 and August 1996 allowed the first accurate ozone climatology at 9–12 km altitude to be generated. The seasonal variability of the tropopause height has always provided a problem when constructing climatologies in this region. To remove any signal from the seasonal and synoptic scale variability in tropopause height we have chosen in this further study of these and subsequent data to reference our climatology to the altitude of the tropopause. We define the tropopause as a mixing zone 30 hPa thick across the 2 pvu potential vorticity surface. A new ozone climatology is now available for levels characteristic of the upper troposphere (UT) and the lower stratosphere (LS) regardless of the seasonal variations of the tropopause over the period 1994–2003. Moreover, this new presentation has allowed an estimation of the monthly mean climatological ozone concentration at the tropopause showing a sine seasonal variation with a maximum in May (120 ppbv) and a minimum in November (65 ppbv). Besides, we present a first assessment of the inter-annual variability of ozone in this particular critical region. The overall increase in the UTLS is about 1%/yr for the 9 years sampled. However, enhanced concentrations about 10–15 % higher than the other years were recorded in 1998 and 1999 in both the UT and the LS. This so-called \"1998–1999 anomaly\" may be attributed to a combination of different processes involving large scale modes of atmospheric variability, circulation features and local or global pollution, but the most dominant one seems to involve the variability of the North Atlantic Oscillation (NAO) as we find a strong positive correlation (above 0.60) between ozone recorded in the upper troposphere and the NAO index. A strong anti-correlation is also found between ozone and the extremes of the Northern Annular Mode (NAM) index, attributing the lower stratospheric variability to dynamical anomalies. Finally this analysis highlights the coupling between the troposphere, at least the upper one, and the stratosphere, at least the lower one.",
				"issue": "4",
				"itemID": "thouret:hal-00328427",
				"libraryCatalog": "HAL Archives Ouvertes",
				"pages": "1051",
				"publicationTitle": "Atmospheric Chemistry and Physics",
				"url": "https://hal.science/hal-00328427",
				"volume": "6",
				"attachments": [
					{
						"title": "HAL PDF Full Text",
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
		"url": "https://hal.archives-ouvertes.fr/hal-00472553v1",
		"items": [
			{
				"itemType": "book",
				"title": "Les sites préhistoriques de la région de Fejej, Sud-Omo, Éthiopie, dans leur contexte stratigraphique et paléontologique.",
				"creators": [
					{
						"firstName": "Henry",
						"lastName": "de Lumley",
						"creatorType": "author"
					},
					{
						"firstName": "Beyene",
						"lastName": "Yonas",
						"creatorType": "author"
					}
				],
				"date": "2004",
				"abstractNote": "Parmi les nombreux sites paléontologiques et préhistoriques de la région de Fejej, dans la région Sud-Omo, en Éthiopie, le site FJ-1, situé à seulement 5 km au nord de la frontière avec le Kenya et daté de 1,96 Ma, parfaitement en place, très riche en faune et en industrie, étudié avec une approche interdisciplinaire, apporte des informations exceptionnelles pour reconstituer l'habitat, le comportement et le mode de vie, ainsi que les paléoenvironnements des premiers hommes. Des Homo habilis s'étaient installés sur un bourrelet de sables fluviatiles, grossier et meuble, bordé par un dénivelé de 50 cm de hauteur, à proximité de la berge d'une rivière, pendant une période d'étiage, et au coeur d'une plaine d'inondation. Peu de temps sans doute après leur départ, en période de pluie une remontée des eaux de la rivière a provoqué l'enfouissement du sol d'occupation par de nouveaux dépôt de sables qui ont protégé l'ensemble sans le déplacer. La bonne conservation du matériel archéologique et paléontologique, l'enfouissement rapide et le maintien des objets en place, les nombreux remontages effectués, que ce soit en ce qui concerne las artefacts lithiques ou les reste fauniques, les traces de fracturations anthropiques et la non-intervention d'autres prédateurs carnivores, sont, entre autre les conditions exceptionnelles de mise en place et d'étude de ce gisement, qui nous apporte autant de renseignements rares et précieux sur un épisode de la vie des hominidés d'il y a presque 2 millions d'années.",
				"itemID": "delumley:hal-00472553",
				"libraryCatalog": "HAL Archives Ouvertes",
				"numPages": "637 p.",
				"publisher": "Éditions Recherche sur les Civilisations",
				"url": "https://hal.science/hal-00472553",
				"attachments": [
					{
						"title": "HAL Snapshot",
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
		"url": "https://hal.archives-ouvertes.fr/hal-00973502",
		"items": [
			{
				"itemType": "report",
				"title": "Learning Centre de l'UHA : comment accompagner son ouverture et inciter les futurs usagers à exploiter ce nouveau centre de ressources ?",
				"creators": [
					{
						"firstName": "Bernard",
						"lastName": "Coulibaly",
						"creatorType": "author"
					},
					{
						"firstName": "Hélène",
						"lastName": "Hermann",
						"creatorType": "author"
					}
				],
				"date": "2014-03",
				"abstractNote": "It seems that the Caisse des Dépôts et Consignations in partnership with the Conference of University Presidents have well taken the measure of this inexorable trend. That is why it \"is committed to supporting higher education institutions\" in the definition and implementation of their digital strategy and wider support them in their efforts to modernize. \" It is indeed in this modernization process that the University of Haute Alsace is committed to registration by engaging in a project to build a Learning Centre. The objective of this project is the modernization and rationalization of these support teaching and research services. There has to work at UHA innovation process its accompanying device in teaching learning and research which it is likely that this change will not be without effect on profit actors are students but also teachers. This research report aims to provide some ideas for reflection to support accompanying the opening of the Learning Centre to encourage future users to operate the premises.",
				"itemID": "coulibaly:hal-00973502",
				"libraryCatalog": "HAL Archives Ouvertes",
				"shortTitle": "Learning Centre de l'UHA",
				"url": "https://hal.science/hal-00973502",
				"attachments": [
					{
						"title": "HAL PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bibliothèque universitaire"
					},
					{
						"tag": "ICT appropriation"
					},
					{
						"tag": "Learning Centre"
					},
					{
						"tag": "Pedagogy"
					},
					{
						"tag": "University Library"
					},
					{
						"tag": "appropriation TICE"
					},
					{
						"tag": "innovation"
					},
					{
						"tag": "pédagogie universitaire"
					}
				],
				"notes": [
					{
						"note": "<p>140 pages</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hal.archives-ouvertes.fr/medihal-00772952v1",
		"items": [
			{
				"itemType": "artwork",
				"title": "Children playing in a park",
				"creators": [
					{
						"firstName": "François",
						"lastName": "Gipouloux",
						"creatorType": "author"
					}
				],
				"date": "2012-03",
				"abstractNote": "Children performing for a crowd of passersby in a park in Kunming. (Enfants jouant dans un parc à Kunming Photo d'enfants jouant dans un parc à Kunming",
				"itemID": "gipouloux:medihal-00772952",
				"libraryCatalog": "HAL Archives Ouvertes",
				"url": "https://media.hal.science/medihal-00772952",
				"attachments": [
					{
						"title": "HAL Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "China"
					},
					{
						"tag": "Kunming"
					},
					{
						"tag": "children"
					},
					{
						"tag": "park"
					},
					{
						"tag": "town"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hal.science/search/index?q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://hal.archives-ouvertes.fr/hal-01600136v1",
		"items": [
			{
				"itemType": "presentation",
				"title": "First results about in vitro bud neoformation on haploid apple leaves",
				"creators": [
					{
						"firstName": "Michel",
						"lastName": "Duron",
						"creatorType": "author"
					}
				],
				"date": "1989-06",
				"abstractNote": "First results about[i] in vitro[/i] bud neoformation on haploid apple leaves. The impact of biotechnology in agriculture. The meeting point between fundamental and applied in vitro culture research",
				"extra": "Published: The impact of biotechnology in agriculture. The meeting point between fundamental and applied in vitro culture research",
				"itemID": "duron:hal-01600136",
				"url": "https://hal.science/hal-01600136",
				"attachments": [
					{
						"title": "HAL PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "apple tree"
					},
					{
						"tag": "bourgeon"
					},
					{
						"tag": "budwood"
					},
					{
						"tag": "culture in vitro"
					},
					{
						"tag": "diffusion des résultats"
					},
					{
						"tag": "haploid"
					},
					{
						"tag": "haploïdie"
					},
					{
						"tag": "in vitro culture"
					},
					{
						"tag": "plant leaf"
					},
					{
						"tag": "plante néoformee"
					},
					{
						"tag": "pommier"
					},
					{
						"tag": "système foliaire"
					}
				],
				"notes": [
					{
						"note": "<p>Poster</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theses.hal.science/tel-05056628",
		"items": [
			{
				"itemType": "thesis",
				"title": "Modélisation et simulation des impacts de gouttes et de sprays sur des surfaces liquides",
				"creators": [
					{
						"firstName": "Syphax",
						"lastName": "Fereka",
						"creatorType": "author"
					}
				],
				"date": "2025-01",
				"abstractNote": "Sprays are ubiquitous in various industrial applications, such as combustion, surface coating, and system cooling. Understanding the dynamics associated with these phenomena is crucial for energy optimization and industrial safety. Several aspects warrant further study and comprehension. However, this thesis primarily focuses on the interactions between sprays and deep liquid substrates, with particular attention to the disturbance of the liquid substrate (deposition and re-ejection).Classical modeling approaches for spray/surface interactions, often based on experimental data or empirical extrapolations from isolated droplet impact data, have limitations when applied across a wide range of regimes (substrate quality, We, Re, etc.). To overcome these constraints, we use multiphase numerical simulations with the in-house code Fugu, employing direct numerical simulation (DNS) at the droplet scale. This methodology provides precise control over key parameters (impact velocity, polydispersity, etc.) and enables an in-depth analysis of the associated physical and statistical phenomena. This thesis presents: (1) a literature review on droplet and spray impacts, (2) details of the numerical methods used, (3) validation of simulations for cases involving isolated or multiple droplet impacts, and (4) results on spray impacts on thick liquid films under various impact regimes. This work paves the way for a deeper understanding of spray/substrate interaction phenomena and advances in their numerical modeling",
				"itemID": "fereka:tel-05056628",
				"libraryCatalog": "HAL Archives Ouvertes",
				"thesisType": "Theses",
				"university": "Université Gustave Eiffel",
				"url": "https://theses.hal.science/tel-05056628",
				"attachments": [
					{
						"title": "HAL PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bubbles"
					},
					{
						"tag": "Bulles"
					},
					{
						"tag": "Drops"
					},
					{
						"tag": "Gouttes"
					},
					{
						"tag": "Multi-Scale"
					},
					{
						"tag": "Multi-Échelle"
					},
					{
						"tag": "Multiphase flow"
					},
					{
						"tag": "Spray"
					},
					{
						"tag": "Spray"
					},
					{
						"tag": "Vof"
					},
					{
						"tag": "Volume of fluid"
					},
					{
						"tag": "Écoulement polyphasique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
