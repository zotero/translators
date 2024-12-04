{
	"translatorID": "5e81b2f5-fd88-427b-9e0c-53809de98582",
	"label": "Schema.org",
	"creator": "Thomas Rambø",
	"target": "json",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 750,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2024-12-04 09:32:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

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

const SCHEMA_ORG_ZOTERO_TYPE_MAPPING = {
	"CreativeWork": "document",
	"Article": "journalArticle",
	"ScholarlyArticle": "journalArticle",
	"Book": "book",
	"Chapter": "bookSection"
};

/**
 * @returns {object | undefined}
 */
function getSchemaOrg() {
	const schemaOrgText = [];

	while (true) {
		const line = Zotero.read();

		if (!line) {
			break;
		}

		schemaOrgText.push(line);
	}

	let schemaOrg;

	try {
		schemaOrg = JSON.parse(schemaOrgText.join(""));
	} catch (error) {
		return;
	}

	return schemaOrg;
}

/**
 * 
 * @param {object | undefined} schemaOrg 
 * @returns {string | undefined}
 */
function getSchemaOrgType(schemaOrg) {
	if (!schemaOrg) {
		return;
	}

	const schemaOrgType = schemaOrg["@type"];

	if (!schemaOrgType) {
		return;
	}

	const type = SCHEMA_ORG_ZOTERO_TYPE_MAPPING[schemaOrgType];

	if (!type) {
		return;
	}

	return type;
}

/**
 * @returns {boolean}
 */
function detectImport() {
	const schemaOrg = getSchemaOrg();

	const type = getSchemaOrgType(schemaOrg);

	if (!type) {
		return false;
	}

	return true;
}

function doImport() {
	const schemaOrg = getSchemaOrg();

	const type = getSchemaOrgType(schemaOrg);

	if (!type) {
		return;
	}

	const item = new Zotero.Item(type);

	item.url = schemaOrg["@id"];

	if (schemaOrg.isbn) {
		item.ISBN = schemaOrg.isbn;
	}

	for (const { value, propertyID } of schemaOrg.identifier || []) {
		if (propertyID === "DOI") {
			item.DOI = value;
		}

		if (propertyID === "ISSN") {
			item.ISSN = value;
		}
	}

	for (const { alternateName } of schemaOrg.inLanguage || []) {
		if (!alternateName) {
			continue;
		}

		item.language = alternateName;
		break;
	}

	item.title = schemaOrg.name;

	for (const { name: authorName } of schemaOrg.author || []) {
		if (!authorName) {
			continue;
		}

		item.creators.push({ lastName: authorName, creatorType: "author", fieldMode: 1 });
	}

	for (const { name: publisherName } of schemaOrg.publisher || []) {
		if (!publisherName) {
			continue;
		}

		item.publisher = publisherName;
		break;
	}

	if (schemaOrg.datePublished) {
		item.date = schemaOrg.datePublished;
	}

	if (schemaOrg.description) {
		item.abstract = schemaOrg.description;
	}

	for (const keyword of [...schemaOrg.keywords || [], schemaOrg.keyword]) {
		if (!keyword) {
			continue;
		}

		item.tags.push(keyword);
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "{\"name\": \"Study of a dE/dx measurement and the gas-gain saturation by a prototype drift chamber for the BELLE-CDC\", \"@context\": \"https://schema.org\", \"@type\": \"CreativeWork\", \"author\": [{\"@type\": \"Person\", \"affiliation\": \"KEK\", \"name\": \"Emi, K\"}, {\"@type\": \"Person\", \"name\": \"Tsukamoto, T\"}, {\"@type\": \"Person\", \"name\": \"Hirano, H\"}, {\"@type\": \"Person\", \"name\": \"Mamada, H\"}, {\"@type\": \"Person\", \"name\": \"Sakai, Y\"}, {\"@type\": \"Person\", \"name\": \"Uno, S\"}, {\"@type\": \"Person\", \"name\": \"Itami, S\"}, {\"@type\": \"Person\", \"name\": \"Kajikawa, R\"}, {\"@type\": \"Person\", \"name\": \"Nitoh, O\"}, {\"@type\": \"Person\", \"name\": \"Ohishi, N\"}, {\"@type\": \"Person\", \"name\": \"Sugiyama, A\"}, {\"@type\": \"Person\", \"name\": \"Suzuki, S\"}, {\"@type\": \"Person\", \"name\": \"Takahashi, T\"}, {\"@type\": \"Person\", \"name\": \"Tamagawa, Y\"}, {\"@type\": \"Person\", \"name\": \"Tomoto, M\"}, {\"@type\": \"Person\", \"name\": \"Yamaki, T\"}], \"datePublished\": \"Jan 1996\", \"inLanguage\": [{\"@type\": \"Language\", \"alternateName\": \"eng\"}], \"publisher\": [{\"@type\": \"Organization\", \"name\": \"KEK\"}], \"@id\": \"https://cicero.tind.io/record/71\"}\n",
		"items": [
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "Emi, K",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Tsukamoto, T",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Hirano, H",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Mamada, H",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Sakai, Y",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Uno, S",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Itami, S",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Kajikawa, R",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Nitoh, O",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Ohishi, N",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Sugiyama, A",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Suzuki, S",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Takahashi, T",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Tamagawa, Y",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Tomoto, M",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Yamaki, T",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"language": "eng",
				"title": "Study of a dE/dx measurement and the gas-gain saturation by a prototype drift chamber for the BELLE-CDC",
				"publisher": "KEK",
				"date": "Jan 1996",
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "https://cicero.tind.io/record/71"
			}
		]
	},
	{
		"type": "import",
		"input": "{\"name\": \"Influence of processing parameters on the manufacturing of anode-supported solid oxide fuel cells by different wet chemical routes\", \"description\": \"Anode-supported solid oxide fuel cells (SOFC) are manufactured at Forschungszentrum J\\u00fclich by different wet chemical powder processes and subsequent sintering at high temperatures. Recently, the warm pressing of Coat-Mix powders has been replaced by tape casting as the shaping technology for the NiO/8YSZ-containing substrate in order to decrease the demand for raw materials due to lower substrate thickness and in order to increase reproducibility and fabrication capacities (scalable process). Different processing routes for the substrates require the adjustment of process parameters for further coating with functional layers. Therefore, mainly thermal treatment steps have to be adapted to the properties of the new substrate types in order to obtain high-performance cells with minimum curvature (for stack assembly). In this presentation, the influence of selected process parameters during cell manufacturing will be characterized with respect to the resulting physical parameters such as slurry viscosity, green tape thickness, relative density, substrate strength, electrical conductivity, and shrinkage of the different newly developed substrate types. The influencing factors during manufacturing and the resulting characteristics will be presented and possible applications for the various substrates identified.\", \"identifier\": [{\"@type\": \"PropertyValue\", \"value\": \"10.4028/www.scientific.net/MSF.638-642.1098\", \"propertyID\": \"DOI\"}, {\"@type\": \"PropertyValue\", \"value\": \"VDB:125298\", \"propertyID\": \"VDB\"}, {\"@type\": \"PropertyValue\", \"value\": \"0255-5476\", \"propertyID\": \"ISSN\"}, {\"@type\": \"PropertyValue\", \"propertyID\": \"inh\"}], \"@context\": \"https://schema.org\", \"@type\": \"CreativeWork\", \"author\": [{\"@type\": \"Person\", \"@id\": \"PER:96536\", \"name\": \"Menzler, N.H.\"}, {\"@type\": \"Person\", \"@id\": \"PER:76694\", \"name\": \"Schafbauer, W.\"}, {\"@type\": \"Person\", \"@id\": \"PER:96316\", \"name\": \"Buchkremer, H.P.\"}], \"datePublished\": \"2010\", \"inLanguage\": [{\"@type\": \"Language\", \"alternateName\": \"English\"}], \"@id\": \"https://cicero.tind.io/record/128\"}\n",
		"items": [
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "Menzler, N.H.",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Schafbauer, W.",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Buchkremer, H.P.",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "https://cicero.tind.io/record/128",
				"DOI": "10.4028/www.scientific.net/MSF.638-642.1098",
				"ISSN": "0255-5476",
				"language": "English",
				"title": "Influence of processing parameters on the manufacturing of anode-supported solid oxide fuel cells by different wet chemical routes",
				"date": "2010",
				"abstract": "Anode-supported solid oxide fuel cells (SOFC) are manufactured at Forschungszentrum Jülich by different wet chemical powder processes and subsequent sintering at high temperatures. Recently, the warm pressing of Coat-Mix powders has been replaced by tape casting as the shaping technology for the NiO/8YSZ-containing substrate in order to decrease the demand for raw materials due to lower substrate thickness and in order to increase reproducibility and fabrication capacities (scalable process). Different processing routes for the substrates require the adjustment of process parameters for further coating with functional layers. Therefore, mainly thermal treatment steps have to be adapted to the properties of the new substrate types in order to obtain high-performance cells with minimum curvature (for stack assembly). In this presentation, the influence of selected process parameters during cell manufacturing will be characterized with respect to the resulting physical parameters such as slurry viscosity, green tape thickness, relative density, substrate strength, electrical conductivity, and shrinkage of the different newly developed substrate types. The influencing factors during manufacturing and the resulting characteristics will be presented and possible applications for the various substrates identified."
			}
		]
	}
]
/** END TEST CASES **/
