{
	"translatorID": "3f73f0aa-f91c-4192-b0d5-907312876cb9",
	"label": "ThesesFR",
	"creator": "TFU, Mathis EON",
	"target": "^https?://(www\\.)?theses\\.fr/([a-z]{2}/)?((s\\d+|\\d{4}.{8}|\\d{8}X|\\d{9})(?!\\.(rdf|xml)$)|resultats)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-09-11 15:43:56"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	theses.fr

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

function detectWeb(doc, _url) {
	if (doc.querySelector('#thesis-title')) {
		return 'thesis';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(':is(.colonnes-resultats, .theses) a.first-half');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, '.card-title'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
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
	let pathname = new URL(url).pathname;
	let xmlDocumentUrl = `${pathname}.rdf`;
	
	// Each thesis record has an underlying .rdf file
	let xmlDoc;
	try {
		xmlDoc = await requestDocument(xmlDocumentUrl);
	}
	catch {}

	// Skiping invalid or empty RDF files : prevents crashes while importing multiple records
	if (!xmlDoc || xmlDoc.children[0].childElementCount === 0) {
		Z.debug('Invalid or empty RDF file');
		return;
	}
	
	// Importing XML namespaces for parsing purposes
	let ns = {
		bibo: 'http://purorg/ontology/bibo/',
		dc: 'http://purl.org/dc/elements/1.1/',
		dcterms: 'http://purl.org/dc/terms/',
		foaf: 'http://xmlns.com/foaf/0.1/',
		marcrel: 'http://www.loc.gov/loc.terms/relators/',
		rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
	};

	let title = ZU.xpathText(xmlDoc, '//dc:title', ns);
	
	if (!title) throw new Error("Reccord must contains a title to be imported");

	let newItem = new Zotero.Item();
	newItem.itemType = 'thesis';
	newItem.title = title;

	ZU.xpath(xmlDoc, '//marcrel:aut//foaf:Person/foaf:name | //marcrel:dis//foaf:Person/foaf:name', ns).forEach((auth) => {
		let author = ZU.cleanAuthor(auth.textContent, 'author', true);
		newItem.creators.push(author);
	});

	// Supervisor(s) must be considered as contributor(s) for french thesis
	ZU.xpath(xmlDoc, '//marcrel:ths//foaf:Person/foaf:name', ns).forEach((sup) => {
		let supervisor = ZU.cleanAuthor(sup.textContent, 'contributor', true);
		newItem.creators.push(supervisor);
	});

	newItem.abstractNote = ZU.xpathText(xmlDoc, '(//dcterms:abstract)[1]', ns);

	// '/s + digit' in url means thesis in preparation
	newItem.thesisType = url.match(/\/s\d+/) ? 'These en préparation' : 'These de doctorat';

	newItem.university = ZU.xpathText(xmlDoc, '(//marcrel:dgg/foaf:Organization/foaf:name)[1]', ns);

	let fullDate = ZU.xpathText(xmlDoc, '//dcterms:dateAccepted', ns);
	let year = ZU.xpathText(xmlDoc, '//dc:date', ns);

	// Some old records doesn't have a full date instead we can use the defense year
	newItem.date = fullDate ? fullDate : year;
	newItem.url = url;
	newItem.libraryCatalog = 'theses.fr';
	newItem.rights = 'Licence Etalab';

	// Keep extra information such as laboratory, graduate schools, etc. in a note for thesis not yet defended
	let notePrepa = Array.from(doc.getElementsByClassName('donnees-ombreprepa2')).map((description) => {
		return Array.from(description.getElementsByTagName('p')).map(description => description.textContent.replace(/\n/g, ' ').trim());
	}).join(' ');

	if (notePrepa) {
		newItem.notes.push({ note: notePrepa });
	}

	// Keep extra information such as laboratory, graduate schools, etc. in a note for defended thesis
	let note = Array.from(doc.getElementsByClassName('donnees-ombre')).map((description) => {
		return Array.from(description.getElementsByTagName('p')).map(description => description.textContent.replace(/\n/g, ' ').trim());
	}).join(' ');

	if (note) {
		newItem.notes.push({ note: note });
	}

	ZU.xpath(xmlDoc, '//dc:subject', ns).forEach((t) => {
		let tag = t.textContent;
		newItem.tags.push(tag);
	});

	// Try to get a PDF link from the page, fall back to API endpoint
	// that will usually (but not always) work
	let pdfURL = attr(doc, 'a.thesis-access-buttons[href$=".pdf"]', 'href')
		|| '/api/v1/document' + pathname;
	newItem.attachments.push({
		title: 'Full Text PDF',
		url: pdfURL,
		mimeType: 'application/pdf',
	});

	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://theses.fr/resultats?q=Mesure+de+masse+de+noyau&page=1&nb=10&tri=pertinence&domaine=theses",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.theses.fr/2016SACLS590",
		"items": [
			{
				"itemType": "thesis",
				"title": "Measurement of the W boson mass with the ATLAS detector",
				"creators": [
					{
						"firstName": "Oleh",
						"lastName": "Kivernyk",
						"creatorType": "author"
					},
					{
						"firstName": "Maarten",
						"lastName": "Boonekamp",
						"creatorType": "contributor"
					}
				],
				"date": "2016-09-19",
				"abstractNote": "Cette thèse décrit une mesure de la masse du boson W avec le détecteur ATLAS. La mesure exploite les données enregistrées par ATLAS en 2011, a une énergie dans le centre de masse de 7 TeV et correspondant à une luminosité intégrée de 4.6 inverse femtobarn. Les mesures sont faites par ajustement aux données de distributions en énergie transverse des leptons charges et en masse transverse du boson W obtenues par simulation, dans les canaux électron et muon, et dans plusieurs catégories cinématiques. Les différentes mesures sont en bon accord et leur combinaison donne une valeur de m_W = 80371.1 ± 18.6 MeV. La valeur mesurée est compatible avec la moyenne mondiale des mesures existantes, m_W = 80385 ± 15 MeV, et l'incertitude obtenue est compétitive avec les mesures les plus précises réalisées par les collaborations CDF et D0.",
				"libraryCatalog": "theses.fr",
				"rights": "Licence Etalab",
				"thesisType": "These de doctorat",
				"university": "Université Paris-Saclay (ComUE)",
				"url": "https://theses.fr/2016SACLS590",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "ATLAS"
					},
					{
						"tag": "ATLAS"
					},
					{
						"tag": "Bosons W -- Masse"
					},
					{
						"tag": "Grand collisionneur de hadrons"
					},
					{
						"tag": "LHC"
					},
					{
						"tag": "LHC"
					},
					{
						"tag": "Masse du boson W"
					},
					{
						"tag": "Modèle standard"
					},
					{
						"tag": "Modèle standard (physique)"
					},
					{
						"tag": "Standard Model"
					},
					{
						"tag": "W boson mass"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.theses.fr/s128743",
		"items": [
			{
				"itemType": "thesis",
				"title": "Les relations bilatérales France – Québec à l’épreuve de l’OMC et de l’Union Européenne",
				"creators": [
					{
						"firstName": "Alice",
						"lastName": "Cartier",
						"creatorType": "author"
					},
					{
						"firstName": "Gilles J.",
						"lastName": "Guglielmi",
						"creatorType": "contributor"
					}
				],
				"date": "2022-09-16",
				"abstractNote": "Pour étudier l’évolution des relations France – Québec, nous empruntons le regard historique – retraçant le temps long et les différents cycles historiques, économiques, sociaux et culturels de nos civilisations – qui éclaire l’évolution de nos institutions, les formes et les bases du droit. Comprendre d’où l’on vient pour éclairer le présent et le futur. Les échanges commerciaux et le développement du droit international engendrent de nouvelles règles de droit ayant de fortes incidences sur notre monde en évolution, tant àl’OMC qu’au sein de l’Union Européenne. Ces accords et traités, certains dits de « nouvelle génération », dont le CETA, participent à la multi-polarisation du monde, modifiant les règles et accords de droits internationaux, révélant de nouveaux partenariats et enjeux internationaux. La relation bilatérale France – Québec s’en voit malheureusement affaiblie.",
				"libraryCatalog": "theses.fr",
				"rights": "Licence Etalab",
				"thesisType": "These de doctorat",
				"university": "Université Paris-Panthéon-Assas",
				"url": "https://theses.fr/2022ASSA0021",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Accord économique et commercial global (2016)"
					},
					{
						"tag": "Comprehensive Economic and Trade Agreement (CETA)"
					},
					{
						"tag": "Comprehensive Economic and Trade Agreement (CETA)"
					},
					{
						"tag": "Droit international"
					},
					{
						"tag": "Droit public"
					},
					{
						"tag": "European Union"
					},
					{
						"tag": "France"
					},
					{
						"tag": "France"
					},
					{
						"tag": "International Law"
					},
					{
						"tag": "Organisation Mondiale du Commerce (OMC)"
					},
					{
						"tag": "Organisation mondiale du commerce"
					},
					{
						"tag": "Public Law"
					},
					{
						"tag": "Quebec"
					},
					{
						"tag": "Québec"
					},
					{
						"tag": "Relations -- France -- Québec (Canada ; province)"
					},
					{
						"tag": "Relations extérieures -- France -- Québec (Canada ; province)"
					},
					{
						"tag": "Relations économiques extérieures -- France -- Québec (Canada ; province)"
					},
					{
						"tag": "Union Européenne"
					},
					{
						"tag": "World Trade Organization (WTO)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theses.fr/2005REIMS006",
		"items": [
			{
				"itemType": "thesis",
				"title": "Quelques aspects de la nucléation des bulles de Champagne dans une flûte et de leur ascension à petits nombres de Reynolds",
				"creators": [
					{
						"firstName": "Cédric",
						"lastName": "Voisin",
						"creatorType": "author"
					},
					{
						"firstName": "Philippe",
						"lastName": "Jeandet",
						"creatorType": "contributor"
					}
				],
				"date": "2005-01-01",
				"abstractNote": "Ce travail de trois ans s'est focalisé sur la genèse et les premiers instants des bulles de Champagne en conditions de consommation, c'est-à-dire dans une flûte. Cette thèse suit chronologiquement la naissance de la bulle. Après un court chapitre (chapitre 2) consacré au matériel et aux méthodes utilisés, la naissance des bulles est présentée en détail (chapitre 3). Ce chapitre amène sous les projecteurs de petits objets solides, les fibres, dans lesquels la formation de la bulle a lieu. L'étude de cette formation dans certains cas simples fait l'objet du chapitre 4 et montre l'importance de la connaissance de la forme des fibres, qui est donc étudiée au chapitre 5. Lorsque la bulle est mûre pour sortir de sa fibre, elle éclot et se libère soudainement. Cette éjection de la bulle est décrite en détail au chapitre 6. Enfin, après sa libération, la bulle commence son ascension vers la surface du verre. Il apparaît que les tout débuts de cette ascension sont marqués par la proximité d'un environnement perturbant jusqu'ici ignoré. Le chapitre 7 est donc dédié aux deux premiers millimètres de la vie de la bulle sevrée. Le dernier chapitre (chapitre 8) dresse un bilan du travail effectué et des perspectives ouvertes.",
				"libraryCatalog": "theses.fr",
				"rights": "Licence Etalab",
				"thesisType": "These de doctorat",
				"university": "Reims",
				"url": "https://theses.fr/2005REIMS006",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bulles"
					},
					{
						"tag": "Effervescence,interfaces,optique"
					},
					{
						"tag": "Fibres cellulosiques"
					},
					{
						"tag": "Nucléation"
					},
					{
						"tag": "Vin de Champagne"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
