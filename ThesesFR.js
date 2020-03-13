{
	"translatorID": "3f73f0aa-f91c-4192-b0d5-907312876cb9",
	"label": "ThesesFR",
	"creator": "TFU, Mathis EON",
	"target": "^https?://(www\\.)?theses\\.fr/.",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-03-12 16:49:00"
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

function detectWeb(doc, url) {
	// Match against a results page or a Ph. D/supervisor/organization page which might contains multiple records e.g.
	// http://www.theses.fr/fr/?q=zotero
	// http://www.theses.fr/fr/154750417
	if (url.includes('/?q=') || url.match(/\d{8}(\d|X)/)) {
		return 'multiple';
	}
	else {
		return 'thesis';
	}
}

function getSearchResults(doc, checkOnly) {
	const items = {};
	let found = false;
	const rows = ZU.xpath(doc, '//div[contains(@class, "encart arrondi-10")]//h2/a');

	rows.forEach((row) => {
		const href = row.href;
		const title = ZU.trimInternal(row.textContent);
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	})

	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;

			const records = [];
			for (item in items) {
				records.push(item);
			}
			
			ZU.processDocuments(records, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	const xmlDocumentUrl = `${url}.rdf`;
	
	// Each thesis record has an underlying .rdf file
	Zotero.Utilities.HTTP.doGet(xmlDocumentUrl, function (text) {		
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(text, 'application/xml');

		// Skiping invalid or empty RDF files : prevents crashes while importing multiple records
		if (xmlDoc.getElementsByTagName('parsererror')[0] || xmlDoc.children[0].childElementCount === 0) {
			Z.debug('Skiping: Invalid or empty RDF file.');
			return
		}
		
		// Importing XML namespaces for parsing purposes
		const ns = {
			'bibo': 'http://purl.org/ontology/bibo/',
			'dc': 'http://purl.org/dc/elements/1.1/',
			'dcterms': 'http://purl.org/dc/terms/',
			'foaf': 'http://xmlns.com/foaf/0.1/',
			'marcrel': 'http://www.loc.gov/loc.terms/relators/',
			'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
		};
	
		const title = ZU.xpathText(xmlDoc, '//dc:title', ns);
		
		// The case should't exists : prevents crashes while importing multiple records
		if (!title) return;

		const newItem = new Zotero.Item();
		newItem.itemType = 'thesis';
		newItem.title = title;

		ZU.xpath(xmlDoc, '//marcrel:aut//foaf:Person/foaf:name | //marcrel:dis//foaf:Person/foaf:name', ns).forEach((auth) => {
			const author = ZU.cleanAuthor(auth.textContent, 'author', true);
			newItem.creators.push(author);
		});

		// Supervisor(s) must be considered as contributor(s) for french thesis
		ZU.xpath(xmlDoc, '//marcrel:ths//foaf:Person/foaf:name', ns).forEach((sup) => {
			const supervisor = ZU.cleanAuthor(sup.textContent, 'contributor', true);
			newItem.creators.push(supervisor);
		});

		const abstractNotes = ZU.xpath(xmlDoc, '//dcterms:abstract', ns);
		newItem.abstractNote = abstractNotes.length > 0 ? abstractNotes[0].textContent : undefined ;

		// '/s + digit' in url means thesis in preparation	
		newItem.thesisType = url.match(/\/s\d+/) ? 'These en préparation' : 'These de doctorat';

		const organizations = ZU.xpath(xmlDoc, '//marcrel:dgg/foaf:Organization/foaf:name', ns);
		newItem.university = organizations.length > 0 ? organizations[0].textContent : undefined;

		const fullDate = ZU.xpathText(xmlDoc, '//dcterms:dateAccepted', ns);
		const year = ZU.xpathText(xmlDoc, '//dc:date', ns);

		// Some old records doesn't have a full date instead we can use the defense year
		newItem.date = fullDate ? fullDate : year;

		const permalink = ZU.xpath(xmlDoc, '//bibo:Document', ns);
		newItem.url = permalink.length > 0 ? permalink[0].getAttribute('rdf:about') : url;
		newItem.libraryCatalog = 'theses.fr'
		newItem.rights = 'Les données de Theses.fr sont sous licence Etalab';

		// Keep extra information such as laboratory, graduate schools, etc.
		newItem.extra = Array.from(doc.getElementsByClassName('donnees-ombre')).map((description) => {
			return Array.from(description.getElementsByTagName('p')).map((description) => description.textContent.replace(/\n/g, ' '))
		}).join(' ');

		ZU.xpath(xmlDoc, '//dc:subject', ns).forEach((t) => {
			const tag =  t.textContent;
			newItem.tags.push(tag);
		});

		newItem.complete()
	})
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://theses.fr/?q=Mesure+de+masse+de+noyau#",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://theses.fr/2016SACLS590",
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
				"thesisType": "These de doctorat",
				"university": "Université Paris-Saclay (ComUE)",
				"url": "http://www.theses.fr/2016SACLS590",
				"attachments": [],
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
						"tag": "Modèle standard (physique nucléaire)"
					},
					{
		 				"tag": "Standard Model"
					},
			   		{
						"tag": "W boson mass"
			   		}
				],
				"extra": "Sous la direction de  Maarten Boonekamp.  Soutenue le 19-09-2016,à l'Université Paris-Saclay (ComUE) , dans le cadre de   École doctorale Particules, Hadrons, Énergie et Noyau : Instrumentation, Imagerie, Cosmos et Simulation (Orsay, Essonne ; 2015-....) , en partenariat avec  Département de physique des particules (Gif-sur-Yvette, Essonne)   (laboratoire)  ,  Centre européen pour la recherche nucléaire   (laboratoire)   et de  Université Paris-Sud (1970-2019)   (établissement opérateur d'inscription)  .",
				"rights": "Les données de Theses.fr sont sous licence Etalab",
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://theses.fr/s128743",
		"items": [
			{
				"itemType": "thesis",
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
			"notes": [],
			"tags": [],
			"seeAlso": [],
			"attachments": [],
			"title": "Les relations bilatérales France-Québec à l'épreuve de l'OMC et de l'UE",
			"abstractNote": "Champ territorial: les fondements juridiques France/Québec/Canada/Europe, approches croisées européen/international. 1ère partie orientée histoire du droit: analyse relation bilatérale France/Québec: prémices enjeux diplomatiques et culturels pour la France de \"Gesta Dei per Francos\" aux échanges particuliers France/Québec (1910-1860), puis enjeux diplomatiques et culturels pour la France dans les années 1960 de Gaulle, Malraux, Québec et francophonie), Trente Glorieuses et période de guerre froide, tournant sur le plan international influant et restructurant les bases juridiques. Pour le Canada: période de \"crise majeure de son histoire\" avec la Révolution tranquille et remise en cause des rapports/accords diplomatiques avec la France qui existaient depuis Napoléon III, apparition ouverte d'un rapport triangulaire (Paris-Ottawa-Québec). Le Québec s'éveille, s'affirme, rêve d'indépendance.",
			"thesisType": "These en préparation",
			"university": "Paris 2",
			"date": "2014",
			"url": "http://www.theses.fr/s128743",
			"libraryCatalog": "theses.fr",
			"rights": "Les données de Theses.fr sont sous licence Etalab"
		   }
		]
	}
]
/** END TEST CASES **/
