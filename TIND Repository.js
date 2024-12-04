{
	"translatorID": "802aa72e-80dd-459d-8712-131f6eeccd4c",
	"label": "TIND Repository",
	"creator": "Thomas Rambø",
	"target": "/record/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
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
 * @param {Document} doc The page document
 * @returns	{HTMLElement | null}
 */
function getSchemaOrgElement(doc) {
	return doc.getElementById("detailed-schema-org");
}

/**
 * @param {HTMLElement | null} schemaOrgElement
 * @returns {object | undefined}
 */
function getSchemaOrg(schemaOrgElement) {
	let schemaOrg;

	try {
		schemaOrg = JSON.parse(schemaOrgElement.innerText);
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
 *
 * @param {Document} doc The page document
 * @param {string} url The page url
 */
function detectWeb(doc, url) {
	const schemaOrgElement = getSchemaOrgElement(doc);
	const schemaOrg = getSchemaOrg(schemaOrgElement);

	return getSchemaOrgType(schemaOrg);
}

/**
 *
 * @param {Document} doc The page document
 * @param {string} url The page url
 */
function doWeb(doc, url) {
	const schemaOrgElement = getSchemaOrgElement(doc);

	if (schemaOrgElement === null) {
		return;
	}

	const translator = Zotero.loadTranslator("import");
	translator.setTranslator("5e81b2f5-fd88-427b-9e0c-53809de98582");
	translator.setString(schemaOrgElement.textContent);

	translator.setHandler("debug", function (translate, message) {
		Zotero.debug(message);
	});

	translator.translate();
}
