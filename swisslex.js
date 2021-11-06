{
	"translatorID": "0fc8deb5-fba2-4471-8d99-97698e2e4060",
	"label": "swisslex",
	"creator": "Hans-Peter Oeri",
	"target": "^https://www\\.swisslex\\.ch/(de|fr)/doc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-06 17:53:27"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Hans-Peter Oeri

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
 * translation table from human readable metadata labels to fields
 * @type {{}}
 */
const metadata_label_translation = {
	"artikelkommentar": "_article",
	"commentaire d'article": "_article",
	"dokument": "_magic",
	"document": "_magic",
	"dokumenttitel": "_subtitle",
	"titre du document": "_subtitle",
	"auflage": "edition",
	"édition": "edition",
	"autor": "_author",
	"auteur": "_author",
	"autoren": "_author",
	"auteurs": "_author",
	"titel": "title",
	"titre": "title",
	"buchtitel": "publicationTitle",
	"titre du livre": "publicationTitle",
	"serie/reihe": "series",
	"série / collection": "series",
	"reihe": "series",
	// "collection": "series",
	"collection": "series",
	"urteilsdatum": "date",
	"date du jugement": "date",
	"jahr": "date",
	"année": "date",
	"seiten": "pages",
	"pages": "pages",
	"herausgeber": "_editor",
	"éditeur(s)": "_editor",
	"isbn": "ISBN",
	"verlag": "publisher",
	"maison d’édition": "publisher",
	"publikation": "publicationTitle",
	"publication": "publicationTitle",
	"issn": "ISSN",
	"gericht": "court",
	"tribunal": "court",
	"betreff": "abstractNote",
	"objet": "abstractNote",
	"rechtsgebiete": "_tags",
	"domaines du droit": "_tags"
};

/**
 * translation table from canton to its abbreviation
 * @type {{}}
 */
const canton_translation = {
	"Schweiz": "",
	"Suisse": "",
	"Zürich": "ZH",
	"Zurich": "ZH",
	"Bern": "BE",
	"Berne": "BE",
	"Luzern": "LU",
	"Lucerne": "LU",
	"Uri": "UR",
	"Schwyz": "SZ",
	"Obwalden": "OW",  // FR
	"Nidwalden": "NW",  // FR
	"Glarus": "GL",
	"Glaris": "GL",
	"Zug": "ZG",
	"Zoug": "ZG",
	"Freiburg": "FR",
	"Fribourg": "FR",
	"Solothurn": "SO",
	"Soleure": "SO",
	"Basel-Stadt": "BS",
	"Bâle-Ville": "BS",
	"Basel-Land": "BL",
	"Bâle-Campagne": "BL",
	"Schaffhausen": "SH",
	"Schaffhouse": "SH",
	"Appenzell Ausserrhoden": "AR",
	"Appenzell Rhodes-Extérieures": "AR",
	"Appenzell Innerrhoden": "AR",
	"Appenzell Rhodes-Intérieures": "AR",
	"St. Gallen": "SG",
	"St-Gall": "SG",
	"Graubünden": "GR",
	"Grisons": "GR",
	"Aargau": "AG",
	"Argovie": "AG",
	"Thurgau": "TG",
	"Thurgovie": "TG",
	"Tessin": "TI",
	"Waadt": "VD",
	"Vaud": "VD",
	"Wallis": "VS",
	"Valais": "VS",
	"Neuenburg": "NE",
	"Neuchâtel": "NE",
	"Genf": "GE",
	"Genève": "GE",
	"Jura": "JU",
	"Strassburg": "",
	"Strasbourg": "",
	"Luxemburg": "",
	"Luxembourg": "",
};

/**
 * translation table from court names to abbreviations
 * @type {{}}
 */
const court_translation = {
	"Bundesstrafgericht": "BStrG",
	"Tribunal pénal fédéral": "TPF",
	"Bundesverwaltungsgericht": "BVerwG",
	"Tribunal administratif fédéral": "TAF",
	"Bundesgericht": "BGer",
	"Tribunal fédéral": "TF",
	"Eidgenössisches Versicherungsgericht": "EVGer",
	"Tribunal fédéral des assurances": "TFA",
	"Eidgenössische Bankenkommission": "EBK",
	"Commission fédérale des banques": "CFB",
	"Bundesamt": "BJ",
	// "Division de la justice": ""
	"Bundesstaatsanwaltschaft": "BA",
	// FR
	"Steuerekurskommission": "StRK",
	// "Commission de recours en matière fiscale": ""
	"Obergericht": "OGer",
	"Cour suprème": "CS",
	"Handelsgericht": "HGer",
	"Kantonsgericht": "KGer",
	"Tribunal cantonal": "TC",
	"Cour de justice": "CJ",
	"Appellationsgericht": "AppG",
	"Appellationshof": "AppH",
	"Cour d'appel": "CA",
	"Kassationsgericht": "KassG",
	"Kreisgericht": "KrG",
	// "Tribunal d'arrondissement": ""
	"Bezirksgericht": "BezG",
	"Tribunal de district": "TD",
	"Tribunal régional": "TR",
	"Zivilgericht": "ZG",
	"Cour Civile": "CC",
	"Versicherungsgericht": "VG",
	"Sozialversicherungsgericht": "SozVG",
	"Verwaltungsgericht": "VwG",
	"Verwaltungsrekurskommission": "VRK",
	"Tribunal administratif": "TA",
	"Cour européenne des droits de l'homme": "CEDH",
	"Europäischer Gerichtshof für Menschenrechte": "EGMR",
	"Europäischer Gerichtshof": "ECJ",
	// FR
};

/**
 * data class holding web document information
 * @property {Element}           dom
 * @property {String}            url
 * @property {String}            lang
 * @property {String}            id
 * @property {Zotero.ItemType}   type
 */
class DocumentData {}

/**
 * data class representing collected metadata fields
 *
 * Internal/Temporary fields are named starting with '_'.
 *
 * @property {String} _magic
 * @property {String} _article
 * @property {String} _author
 * @property {String} _editor
 * @property {Array}  creators
 * @property {String} title
 * @property {String} _subtitle
 * @property {String} publicationTitle
 * @property {String} series
 * @property {String} date
 * @property {String} pages
 * @property {String} ISBN
 * @property {String} publisher
 * @property {String} ISSN
 * @property {String} court
 * @property {String} abstractNote
 * @property {String} edition
 * @property {String} _tags
 * @property {Array}  tags
 * @property {String} journalAbbreviation
 * @property {String} issue
 * @property {String} number
 * @property {String} encyclopediaTitle
 */
class Metas {}

/**
 * interpret a document URL and extract web document information
 *
 * @param   {Document} doc   Document as received from Zotero
 * @param   {String}   url   URL string as received from Zotero
 * @returns {DocumentData}
 */
function extractDocumentData(doc, url) {
	const url_regexp = "^https://www.swisslex.ch/(de|fr|it|en)/doc/([a-z]+)/([-0-9a-f]+)";
	const type_translation = {
		"bookdoc": "bookSection",
		"essay": "journalArticle",
		"clawrev": "journalArticle",
		"commentarydoc": "encyclopediaArticle",
		"claw": "case"
	};

	let parts;
	let result = new DocumentData();

	url = decodeURI(url);
	parts = url.match(url_regexp);

	if (parts !== null) {
		result = {
			dom: doc.documentElement,
			url: parts[0],
			lang: parts[1],
			id: parts[3],
			type: type_translation[parts[2]]
		}
	}

	return result;
}

/**
 * extract and collect possible metadata fields
 *
 * Metadata is presented in LIs of class 'meta-entry', encompassing
 * two SPANs: the first for a label, the second for the metadata value
 *
 * After extraction the fields are collected in 'raw' format. They will have to
 * be parsed/patched for machine readability and transfer to Zotero.
 *
 * @param   {DocumentData}         doc_data
 * @returns {Metas}
 */
function extractRawItemData(doc_data) {
	const dom_metas = ZU.xpath(doc_data.dom, '//div[@id="' + doc_data.id + '"]//li[contains(@class,"meta-entry")]');
	let result = new Metas();

	result.url = doc_data.url;
	for (let i=0, l=dom_metas.length; i<l; i++) {
		let label = dom_metas[i].children[0].innerText.toLowerCase();
		if (metadata_label_translation[label] !== undefined) {
			result[metadata_label_translation[label]] = dom_metas[i].children[1].innerText;
		}
		else if (label.length > 0) {
			Z.debug( "Unknown swisslex metadata label: '" + label + "'" );
		}
		// else empty label
	}

	return result;
}

/**
 * patchup common extracted metadata fields
 *
 * Common metadata fiels that have to be patched are:
 *   * date     convert to ISO
 *   * edition  extract numerical value
 *   * _tags    split string by comma for tags, by slash for subtags
 *   * _author  add to creators array - format: lastname firstname
 *   * _editor  add to creators array - format: firstname lastname
 *
 * @param {DocumentData} doc_data
 * @param {Metas}        metas
 */
function patchupMetaCommon(doc_data, metas) {
	if (metas.date !== undefined) {
		metas.date = ZU.strToISO(metas.date);
	}
	if (metas.edition !== undefined) {
		metas.edition = metas.edition.split('.')[0];
	}
	if (metas._tags !== undefined) {
		let tags = metas._tags.split(',');
		delete metas._tags;
		metas.tags = [];
		for (let i = 0; i < tags.length; i++) {
			let tag_parts = tags[i].split("/");
			metas.tags.push( ZU.trimInternal( tag_parts[0] ) );
			if ( tag_parts.length > 1 ) {
				metas.tags.push( ZU.trimInternal( tags[i] ) );
			}
		}
	}
	if (metas._editor !== undefined) {
		let editors = metas._editor.split(',');
		delete metas._editor;
		metas.creators = metas.creators || [];
		for (let i = 0; i < editors.length; i++) {
			metas.creators.push( ZU.cleanAuthor( editors[i], "editor", false) );
		}
	}
	if (metas._author !== undefined) {
		let authors = metas._author.split(',');
		delete metas._author;
		metas.creators = metas.creators || [];
		for (let i = 0; i < authors.length; i++) {
			let one_author = ZU.cleanAuthor( authors[i], "author", false);
			[ one_author.firstName, one_author.lastName ] = [ one_author.lastName, one_author.firstName ];
			metas.creators.push( one_author );
		}
	}
}

/**
 * patchup metas with information from field _magic
 *
 * depending on document type, _magic will hold different information.
 *
 * @TODO  the data extraction of _magic is rather brittle and not well tested
 * @param {DocumentData} doc_data
 * @param {Metas}        metas
 */
function patchupMetaMagic(doc_data, metas) {
	let magic = metas._magic;
	delete metas._magic;

	if (magic === undefined) {
		return;
	}

	if (doc_data.type === "journalArticle") {
		let value = magic.split(' ');
		metas.journalAbbreviation = value[0];
		if (value[1].includes("/")) {
			metas.issue = value[1].split("/")[0];
		}
	}
	else if (doc_data.type === "bookSection") {
		let value = magic.match( '([0-9]+)\.A.,' );
		if (value) {
			metas.edition = value[1];
		}
	}
	else if (doc_data.type === "case") {
		metas.number = magic;
		metas.title = magic;
	}
	else {
		Z.debug("don't know _magic for type " + doc_data.type);
	}
}

/**
 * patchup metas for document type 'bookSection'
 * @param {DocumentData}  doc_data
 * @param {Metas}         metas
 */
function patchupForBookSection(doc_data, metas) {
	if (metas.publicationTitle !== undefined) {
		metas.title = metas.publicationTitle + " - " + metas.title;
	}
	// @TODO
}

/**
 * patchup metas for document type 'case'
 * @param {DocumentData}  doc_data
 * @param {Metas}         metas
 */
function patchupForCase(doc_data, metas) {
	let court = metas.court.split(",");
	let title = metas.title;

	if (title.substring(0,4) !== "BGE ") {
		let temp = court[0].trim();
		if (canton_translation[temp] !== undefined) {
			if (canton_translation[temp]) {
				temp = canton_translation[temp] + " ";
			}
			else {
				temp = "";
			}
		}
		else {
			Z.debug( "unknown canton: " + temp );
			temp = temp + " ";
		}
		title = temp + title;

		temp = court[1].trim();
		if (court_translation[temp] !== undefined ) {
			temp = court_translation[temp];
		}
		else {
			Z.debug( "unknown court: " + temp );
		}
		title = temp + " " + title;

		metas.title = title;
	}
}

/**
 * patchup metas for document type 'legalCommentary' - mapped to 'ecyclopediaArtice'
 * @param {DocumentData}  doc_data
 * @param {Metas}         metas
 */
function patchupForLegalCommentary(doc_data, metas) {
	if (metas._article !== undefined) {
		metas.encyclopediaTitle = metas.title;
		metas.title = metas._article;
		delete metas._article;
		delete metas._subtitle;
	}
	if (metas._subtitle) {
		metas.title = metas.title + " - " + metas._subtitle;
		delete metas._subtitle;
	}
	if (metas.series !== undefined && metas.series.match( "^[A-Z]{2,5} - ")) {
		metas.series = metas.series.split("-")[0];
	}
}

function detectWeb(doc, url) {
	return extractDocumentData(doc, url).type;
}

function doWeb(doc, url) {
	let doc_data = extractDocumentData(doc, url);

	let metas = extractRawItemData(doc_data);
	patchupMetaCommon(doc_data, metas);
	patchupMetaMagic(doc_data, metas);

	if (doc_data.type === "encyclopediaArticle") {
		patchupForLegalCommentary(doc_data, metas);
	}
	if (doc_data.type === "case") {
		patchupForCase(doc_data, metas);
	}
	if (doc_data.type === "bookSection") {
		patchupForBookSection(doc_data, metas);
	}

	let item = new Zotero.Item(doc_data.type);
	for (let one in metas) {
		if (one.substring(0, 1) !== "_") {
			item[one] = metas[one];
		}
		else {
			Z.debug("ignoring still existing internal metadata field + " + one);
		}
	}
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
