{
	"translatorID": "802aa72e-80dd-459d-8712-131f6eeccd4c",
	"label": "TIND Repository",
	"creator": "Thomas Rambø",
	"target": "/record/[0-9]+",
	"minVersion": "7.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsi",
	"lastUpdated": "2024-11-15 09:52:21"
}

/*
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
*/

const SCHEMA_ORG_ZOTERO_TYPE_MAPPING = {
	"CreativeWork": "document",
    "Article": "journalArticle",
    "Book": "book",
    "Chapter": "bookSection"
};

/**
 *
 * @param {Document} doc The page document
 * @param {string} url The page url
 */
function detectWeb(doc, url) {
	const schemaOrgElement = /** @type {HTMLScriptElement | null} */ (
        doc.getElementById("detailed-schema-org")
    );

    if (schemaOrgElement === null) {
        return;
    }

    let schemaOrg;
    try {
        schemaOrg = JSON.parse(schemaOrgElement.textContent);
    } catch (error) {
        return;
    }

    const schemaOrgType = schemaOrg["@type"];
    const type = SCHEMA_ORG_ZOTERO_TYPE_MAPPING[schemaOrgType];

    if (type !== undefined) {
        return type;
    }
}

/**
 *
 * @param {Document} doc The page document
 * @param {string} url The page url
 */
function doWeb(doc, url) {
    const schemaOrgElement = /** @type {HTMLScriptElement | null} */ (
        doc.getElementById("detailed-schema-org")
    );

    if (schemaOrgElement === null) {
        return;
    }

    let schemaOrg;
    try {
        schemaOrg = JSON.parse(schemaOrgElement.textContent);
    } catch (error) {
        return;
    }

    const schemaOrgType = schemaOrg["@type"];
    const type = SCHEMA_ORG_ZOTERO_TYPE_MAPPING[schemaOrgType];

    if (type === undefined) {
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
