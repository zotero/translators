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
	"lastUpdated": "2021-11-29 18:28:53"
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

/*
	Translator for Swiss legal research site swisslex.ch

	The site is accessible by paid accounts (and university access) only. The UI is
	available in German and French - metadata is partly localized to language.

	As each document access is billed, search and batch import is not supported by choice.

	As a paid option, EU case law and legal documents are available on the site.
	It is, however, only a half-reasonable import of EUR-lex/Celex.
	I therefore do not support the EU documents in swisslex.
 */

/* eslint quote-props: ["error", "consistent"] */

/**
 * translation table from human readable metadata labels to fields
 *
 * @type {{}}
 */
const translationMetaLabel = {
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
	"urteilsbesprechung": "number",
	"commentaire du jugement": "number",
	"date du jugement": "date",
	"jahr": "date",
	"année": "date",
	"seiten": "pages",
	"seite": "pages",
	"pages": "pages",
	"page": "pages",
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
 *
 * @type {{}}
 */
const translationCanton = {
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
	"Obwalden": "OW",
	"Obwald": "OW",
	"Nidwalden": "NW",
	"Nidwald": "NW",
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
 * institutional editors that should not be included in metadata
 *
 * @type {string[]}
 */
const institutionalEditors = [
	"Neue Zürcher Zeitung",
	"Europa Institut an der Universität Zürich",
	"Institut für deutsches und europäisches Gesellschafts- und Wirtschaftsrecht an der Universität Heidelberg"
];

/**
 * translation table from court names to abbreviations
 *
 * @type {{}}
 */
const translationCourt = {
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
	"Bundesstaatsanwaltschaft": "BA",
	"Steuerekurskommission": "StRK",
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
	"Cour de justice de l'Union européenne": "ECJ"
};

/**
 * federal case compilations
 *
 * @type {string[]}
 */
const topLevelCaseCompilations = [
	"BGE ",
	"ATF ",
	"BVGE ",
	"ATAF ",
	"EVGE ",
	"ATFA ",
	"TPF "
];

/**
 * data class holding web document information
 *
 * @typedef DocumentData
 * @type {Object}
 * @property {Element}           dom
 * @property {String}            url
 * @property {String}            lang
 * @property {String}            id
 * @property {Zotero.ItemType}   type
 */

/**
 * data class representing collected metadata fields
 *
 * Internal/Temporary fields are named starting with '_'.
 *
 * @typedef Metas
 * @type {Object}
 * @property {String} _magic
 * @property {String} _article
 * @property {String} _author
 * @property {String} _editor
 * @property {Array}  creators
 * @property {String} title
 * @property {String} shortTitle
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

/**
 * convert swiss date to ISO date (numerical only version)
 *
 * @param {string} date
 */
function swissStrToISO(date) {
	let parts = date.split(/\.\s*|\s+/);
	parts = parts.map(value => parseInt(value).toString().padStart(2, '0'));
	return parts.reverse().join('-');
}

/**
 * interpret a document URL and extract web document information
 *
 * @param   {Document} doc   Document as received from Zotero
 * @param   {String}   url   URL string as received from Zotero
 * @returns {DocumentData}
 */
function extractDocumentData(doc, url) {
	const urlRegexp = "^https://www.swisslex.ch/(de|fr|it|en)/doc/([a-z]+)/([-0-9a-f]+)";
	const translationType = {
		"bookdoc": "bookSection",
		"essay": "journalArticle",
		"clawrev": "journalArticle",
		"commentarydoc": "encyclopediaArticle",
		"claw": "case"
	};

	let parts;
	let result = {};

	url = decodeURI(url);
	parts = url.match(urlRegexp);

	if (parts !== null) {
		result = {
			dom: doc.querySelector("div[id='" + parts[3] + "']"),
			url: parts[0],
			lang: parts[1],
			id: parts[3],
			type: translationType[parts[2]]
		};
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
 * @param   {DocumentData}         docData
 * @returns {Metas}
 */
function extractRawItemData(docData) {
	const domMetas = docData.dom.querySelectorAll("li.meta-entry");
	let result = {};

	result.url = docData.url;
	for (let i = 0, l = domMetas.length; i < l; i++) {
		let label = domMetas[i].children[0].innerText.toLowerCase();
		if (translationMetaLabel[label] !== undefined) {
			result[translationMetaLabel[label]] = domMetas[i].children[1].innerText;
		}
		else if (label.length > 0) {
			Z.debug("Unknown swisslex metadata label: '" + label + "'");
		}
		// else empty label - happens with two line values we ignore
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
 * @param {DocumentData} docData
 * @param {Metas}        metas
 */
function patchupMetaCommon(docData, metas) {
	if (metas.date !== undefined) {
		// all dates are presented in both languages as "dd.mm.yyyy"
		metas.date = swissStrToISO(metas.date);
	}
	if (metas.edition !== undefined) {
		// all editions start with the numeric - parseInt ignores everything thereafter ;)
		metas.edition = parseInt(metas.edition).toString();
	}
	if (metas._tags !== undefined) {
		// tags, if available are presented as "tag1, tag2, tag3/subtag3"
		let tags = metas._tags.split(',');
		delete metas._tags;
		metas.tags = [];
		for (let tag of tags) {
			let tagParts = tag.split("/");
			metas.tags.push(ZU.trimInternal(tagParts[0]));
			if (tagParts.length > 1) {
				metas.tags.push(ZU.trimInternal(tag));
			}
		}
	}
	if (metas._editor !== undefined) {
		let editors = metas._editor.split(',');
		metas.creators = metas.creators || [];
		for (let editor of editors) {
			editor = editor.trim();
			if (!institutionalEditors.includes(editor)) {
				metas.creators.push(ZU.cleanAuthor(editor, "editor", false));
			}
		}
	}
	if (metas._author !== undefined) {
		// authors are presented in "lastname firstname" format but without a comma
		// (which doesn't split names but authors)
		let authors = metas._author.split(',');
		metas.creators = metas.creators || [];
		for (let author of authors) {
			let cleanAuthor = ZU.cleanAuthor(author, "author", false);
			[cleanAuthor.firstName, cleanAuthor.lastName] = [cleanAuthor.lastName, cleanAuthor.firstName];
			metas.creators.push(cleanAuthor);
		}
	}
}

function patchupMetaMagicJournal(docData, metas) {
	let magic = metas._magic;

	// the magic field should compare to "abbreviation (volume/)year page"
	// except for online journals that may have 'Nr.' for pages
	// except for the newspaper NZZ that has 'Nr.' with issue numbers
	let tokens = magic.split(/,\s+|\s+|-/);

	metas.journalAbbreviation = tokens[0];

	if (tokens[1] === "Nr." || tokens[1] === "n°") { // newspaper format
		metas.issue = tokens[2];
		metas.date = swissStrToISO(tokens[3]);
	}
	else if (tokens.length > 1) { // journal format
		tokens[1] = tokens[1].match(/^(?:(\d+)\/)?(\d{2,4})$/);
		metas.issue = tokens[1][1];
		if (metas.date === undefined) { // sometime year is not set in its own field
			metas.date = tokens[1][2];
		}

		if (tokens.length > 2 && metas.pages === undefined) {
			if (tokens[2] === "S." || tokens[2] === "p.") {
				metas.pages = tokens[3];
			}
			else {
				metas.pages = tokens.slice(2).join(' ');
			}
		}
	}
}

/**
 * patchup metas with information from field _magic
 *
 * depending on document type, _magic will hold different information.
 *
 * @TODO  the data extraction of _magic is rather brittle and not well tested
 * @param {DocumentData} docData
 * @param {Metas}        metas
 */
function patchupMetaMagic(docData, metas) {
	let magic = metas._magic;
	if (magic === undefined) {
		return;
	}

	if (docData.type === "journalArticle") {
		patchupMetaMagicJournal(docData, metas);
	}
	else if (docData.type === "case") {
		// court case compilations and journal case listings are both tagged with "publication"
		// - we distinguish them by the presence of a logo banner for journals
		// the magic field contains the docket for "real" case documents, but
		// a journalArticle reference for cases in journals.
		let publicationLogo = docData.dom.querySelector("img.ng-star-inserted");
		if (publicationLogo) {
			patchupMetaMagicJournal(docData, metas);
			metas.reporter = metas.journalAbbreviation;
			delete metas.journalAbbreviation;
			metas.reporterVolume = (metas.issue ? metas.issue + "/" : "") + metas.date.substring(0, 4);
			delete metas.issue;
		}
		else {
			delete metas.publicationTitle;
			metas.number = magic;
			metas.title = magic;
		}
	}
	else if (docData.type === "bookSection") {
		// at least one bookSection I found did not give the book's edition in
		// a separate field but included it in the magic field conundrum...
		// @TODO deduce when edition is presented separately
		// @TODO verify for french
		let value = magic.match('([0-9]+)\\.A.,');
		if (value) {
			metas.edition = value[1];
		}
	}
	else {
		Z.debug("don't know _magic for type " + docData.type);
	}

	delete metas._magic;
}

/**
 * patchup metas for document type 'bookSection' or 'book'
 *
 * We cannot differentiate between actual bookSections (e.g. a collection of distinct texts)
 * and chapters of a book - both are presented in the same way... :(
 * Therefore we try some heuristics to detect books:
 *   * no editor
 *   * 'chapter' title beginning with ordinals or '§'
 *
 * NB: we change the Zotero.ItemType for books - quite late in the process, but should work.
 *
 * @param {DocumentData}  docData
 * @param {Metas}         metas
 */
function patchupForBookSection(docData, metas) {
	const bookRegex = "^(\\d+\\.|§\\s*\\d+)";
	const collectionRegex = "^[IVX]+\\.?\\s+";

	if (metas._editor === undefined || metas.title.match(bookRegex)) {
		docData.type = "book";
		metas.title = metas.publicationTitle;
		delete metas.publicationTitle;
		delete metas.pages;
		return;
	}

	let collectionParts = metas.title.match(collectionRegex);
	if (collectionParts) {
		metas.title = metas.title.substring(collectionParts[0].length);
	}
}

/**
 * patchup metas for document type 'case'
 *
 * @param {DocumentData}  docData
 * @param {Metas}         metas
 */
function patchupForCase(docData, metas) {
	const docketInTitleRegex = /(?:\s-\s+|\s\(|;\s+)((?:(?!\s-\s|\s\()[^;)])+)\)?\.?$/;
	const docketInTextRegex = /Urteil (\S+) vom ([0-9.\s]+)/;

	if (metas.number === undefined) { // case discussion in journal -- looking for docket in prose
		let parts;
		if ((parts = (text(docData.dom, "p.documenttitle") || "").match(docketInTitleRegex))) {
			metas.title = parts[1];
			metas.number = parts[1];
		}
		else if ((parts = (text(docData.dom, ".doc-content-innerHTML p:last-of-type") || "").match(docketInTextRegex))) {
			metas.title = parts[1];
			metas.number = parts[1];
			metas.date = swissStrToISO(parts[2]);
		}
	}

	// all courts are named "canton, court" - with options for canton including Switzerland,
	// and Luxembourg/Strasbourg for the nationally relevant European Courts ;)
	let court = metas.court.split(",");
	let title = metas.title;

	// Certain federal dockets are well-known and already include a
	// court designation.
	for (let compilation of topLevelCaseCompilations) {
		if (title.startsWith(compilation)) {
			return;
		}
	}

	// All other cases are uniformly referenced by "court-abbreviation (canton) docket"
	if (title.substring(0, 4) !== "BGE ") {
		let temp = court[0].trim();
		if (translationCanton[temp] !== undefined) {
			if (translationCanton[temp]) {
				temp = translationCanton[temp] + " ";
			}
			else {
				temp = "";
			}
		}
		else {
			Z.debug("unknown canton: " + temp);
			temp += " ";
		}
		title = temp + title;

		temp = court[1].trim();
		if (translationCourt[temp] !== undefined) {
			temp = translationCourt[temp];
		}
		else {
			Z.debug("unknown court: " + temp);
		}
		title = temp + " " + title;

		metas.title = title;
	}
}

/**
 * patchup metas for document type 'legalCommentary' - mapped to 'encyclopediaArticle'
 *
 * @param {DocumentData}  docData
 * @param {Metas}         metas
 */
function patchupForLegalCommentary(docData, metas) {
	metas.encyclopediaTitle = metas.title;

	// legal commentaries are referenced in two distinct ways in Switzerland
	//   * certain 'big' series are quoted by their abbreviation and the author of the referenced part
	//     (e.g. a commentary by Mr. Meier in the "Berner Kommentar" -> "BK-MEIER")
	//   * smaller and individual commentaries are quote like books with statute articles as chapters
	//     (pages are omitted)
	let seriesParts = metas.series ? metas.series.split(" - ", 2) : [];
	if (seriesParts.length > 1) {
		metas.series = ZU.trimInternal(seriesParts[0]);
		metas.encyclopediaTitle = ZU.trimInternal(seriesParts[1]) + ", " + metas.title;
	}

	// if its a commentary to a specific articles
	// swisslex designates it as '[statute-abbreviation] [article number]'
	if (metas._article !== undefined) {
		let commentary = metas.series || metas.publisher.split(" ")[0];
		let articleParts = metas._article.split(" ");
		metas.title = metas._article + " (" + commentary + ")";
		metas.shortTitle = (docData.lang === "fr" ? "art. " : "Art. ") + articleParts[1] + " " + articleParts[0];
		delete metas._article;
		delete metas._subtitle;
		delete metas.pages;
	}

	// if its a non-article commentary, handle like a bookSection
	if (metas._subtitle) {
		metas.title = metas._subtitle;
		delete metas._subtitle;
	}
}

function detectWeb(doc, url) {
	return extractDocumentData(doc, url).type;
}

function doWeb(doc, url) {
	let docData = extractDocumentData(doc, url);

	let metas = extractRawItemData(docData);
	patchupMetaCommon(docData, metas);
	patchupMetaMagic(docData, metas);

	if (docData.type === "encyclopediaArticle") {
		patchupForLegalCommentary(docData, metas);
	}
	if (docData.type === "case") {
		patchupForCase(docData, metas);
	}
	if (docData.type === "bookSection") {
		patchupForBookSection(docData, metas);
	}
	delete metas._author; // late deletion - has been converted in MetaCommon
	delete metas._editor;

	let item = new Zotero.Item(docData.type);
	item.abstractNote = text(docData.dom, "div.abstract", 0);
	for (let one in metas) {
		if (one.substring(0, 1) !== "_") {
			item[one] = metas[one];
		}
		else {
			Z.debug("ignoring still existing internal metadata field + " + one);
		}
	}

	// as long as we cannot get the PDF, save the website
	// even as the snapshot will contain whole hidden documents and not-working app elements
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});

	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
