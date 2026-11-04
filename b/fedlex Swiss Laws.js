{
	"translatorID": "0e53af77-2ffe-4d1e-9271-0c712acbd3e4",
	"label": "fedlex Swiss Laws",
	"creator": "Hans-Peter Oeri",
	"target": "^https://www\\.fedlex\\.admin\\.ch/eli/(cc|oc|fga)/[\\dIVX]+/[\\d_-]+/(de|fr|it|rm|en)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-23 19:42:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Hans-Peter Oeri

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

/* eslint quote-props: ["error", "consistent"] */

// fedlex translator remarks
//  * search is not available as result links are not available in DOM
//  * different revisions and manifestations are not represented in the URL - we can only test 'current' and 'HTML'

const metadataLabels = {
	"Abkürzung": "abbreviation",
	"Abréviation": "abbreviation",
	"Abbreviazione": "abbreviation",
	"Inkrafttreten": "enacted",
	"Entrée en vigueur": "enacted",
	"Entrata in vigore": "enacted",
	"Entrada en vigur": "enacted",
	"In force": "enacted",
	"Beschluss": "date",
	"Décision": "date",
	"Decisione": "date",
	"Erlasstyp": "type",
	"Genre d'acte": "type",
	"Genere di atti": "type",
	"Grunderlass": "origin",
	"Acte de base": "origin",
	"Atto di base": "origin",
	"Änderungserlass": "revision",
	"Acte portant modification": "revision",
	"Atto modificatore": "revision",
	"Autorità competente": "body",
	"Autorité compétente": "body",
	"Zuständige Behörde": "body"
};

const numberLabel = {
	de: "SR ",
	fr: "RS ",
	it: "RS ",
	en: "SR ",
	rm: "SR "
};

const revisionLabel = {
	de: "Änderung vom ",
	fr: "Modification du ",
	it: "Modifica del "
};

const bodyLabel = {
	de: "Bundesrat",
	fr: "Conseil fédéral",
	it: "Consiglio federale",
	rm: "Cussegl federal",
	en: "Federal Council"
};

/**
 * convert a common Swiss date into ISO format
 *
 * Dates follow the "d.m.y" format in all Swiss languages - months are presend in numerical an in text form
 * on fedlex. There are two exceptional cases:
 *   * english fedlex follows the US "m d,y" format - but only in text format, numerical dates stay 'normal'
 *   * rumantsch has two word month indications (e.g. 21 da december 1937)
 *
 * As the displayed language is not represented in a locale setting, we have to interpret dates manually.
 *
 * @param   {string} date
 * @returns {string}
 */
function swissStrToISO(date) {
	const splitter = /\s*\.\s*|\s+/;
	const months = [
		/^ja|ge|sc/,
		/^fe|fé|fav/,
		/^mär|mar/,
		/^apr|avr/,
		/^mai|may|mag|mat/,
		/^jun|juin|giu|zer/,
		/^jul|juil|lug|fan/,
		/^au|ao|ag|avu/,
		/^se/,
		/^ok|oc|ot+/,
		/^no/,
		/^de|dé|di/
	];

	let res = [];
	let parts = date.trim().split(splitter);

	if (parts.length === 4) { // Rumantsch is has an additional word in second place
		parts.splice(1, 1);
	}
	if (parts[0].match(/^\D/)) { // English text format
		[parts[0], parts[1]] = [parts[1], parts[0]];
	}
	res.push(parts.pop());
	if (parts.length > 1) {
		let month = parts.pop().toLocaleLowerCase();
		let monthInt = Number.parseInt(month);
		if (!Number.isInteger(monthInt)) {
			for (let i = 0; i < months.length; i++) {
				if (month.match(months[i])) {
					monthInt = i + 1;
					break;
				}
			}
		}
		res.push(monthInt.toString().padStart(2, '0'));
	}
	if (parts.length > 0) {
		// parseInt ignores ordinal suffixes :)
		res.push(parseInt(parts.pop()).toString().padStart(2, '0'));
	}
	return res.join('-');
}

/**
 * helper function to post a json query and get json back
 *
 * @param {string} url
 * @param {{}} jsonObject
 * @param {jsonPost~Callback} ondone
 */
function jsonPost(url, jsonObject, ondone) {
	ZU.HTTP.doPost(url, JSON.stringify(jsonObject), function (text) {
		ondone(JSON.parse(text));
	},
	{
		"Content-Type": "application/json"
	});
}

/**
 * callback for jsonPost
 * @callback jsonPost~Callback
 * @param {{}} jsonObject
 */

/**
 * interpret url
 *
 * @param {string} url
 * @returns {{collection, lang, type}}
 */
function interpretURL(url) {
	const types = {
		cc: "statute",
		oc: "bill",
		fga: "hearing"
	};
	let parts = url.match("^https://www\\.fedlex\\.admin\\.ch/eli/(cc|oc|fga)/[\\dIVX]+/[\\d_-]+/(de|fr|it|rm|en)");
	return {
		collection: parts[1],
		lang: parts[2],
		type: types[parts[1]]
	};
}

/**
 * collect data presented in the sidebar
 *
 * @param {Document} doc
 * @returns {{abbreviation, enacted, date, type, origin, revision, body}}
 */
function collectAnnexeData(doc) {
	let annexe = doc.querySelectorAll("#annexeContent > div");
	let res = {};

	for (let row of annexe) {
		let label = row.children[0].innerHTML;
		let value = row.children[1].innerHTML;
		if (metadataLabels[label] !== undefined) {
			res[metadataLabels[label]] = value;
		}
	}
	return res;
}

/**
 * find PDF url for statutes
 *
 * If the statute is not already presented in PDF form, finding the PDF URL is quite tricky.
 * We need two SPARQL queries.
 *
 * @param {Document} doc
 * @param {String} url
 * @param {{}} parameters
 * @param {extractPDFURL~Callback} ondone
 */
function extractPDFURL(doc, url, parameters, ondone) {
	let eliPath = "https://fedlex.data.admin.ch/" + url.split('/').splice(3, 4).join('/');
	let date = text(doc, "table#versionContent td.is-active", 0); // only available on desktop site :(
	if (date) {
		date = date.split(/\.\s*/).reverse().join('');
	}
	else {
		let dateString = text(doc, "div#preface > p:last-of-type");
		let dateStringParts = dateString.match("^[^(]+\\([^\\d]+(\\d[^)]+)\\)");
		date = swissStrToISO(dateStringParts[1]).replace(/-/g, "");
	}
	let identification = eliPath + '/' + date;
	let query = {
		"query": {
			"term": {
				"facets.classifies.keyword": eliPath
			}
		}
	};
	jsonPost('https://www.fedlex.admin.ch/elasticsearch/proxy/_search?index=taxonomy', query,
		function (json) {
			let taxonomy = decodeURIComponent(json.hits.hits[0]._id);
			let query = {
				"size": 10000,
				"query": {
					"bool": {
						"must": [{
							"multi_match": {
								"query": taxonomy,
								"fields": [
									"data.references.classifiedByTaxonomyEntry.keyword",
									"facets.classifiedByTaxonomyEntry.keyword"
								]
							}
						},
						{
							"terms": {
								"data.type.keyword": [
									"Consolidation"
								]
							}
						}]
					}
				}
			};
			jsonPost("https://www.fedlex.admin.ch/elasticsearch/proxy/_search?index=data", query,
				function (json) {
					let manifestationId = identification + '/' + parameters.lang + '/pdf-a';
					outerLoop:
					for (let expression of json.hits.hits) {
						if (expression._source.data.attributes.isMemberOf["rdfs:Resource"] !== eliPath) {
							continue;
						}
						if (expression._source.data.uri !== identification) {
							continue;
						}
						for (let manifestation of expression._source.included) {
							if (manifestation.uri !== manifestationId) {
								continue;
							}
							ondone(manifestation.attributes.isExemplifiedBy["rdfs:Resource"]);
							break outerLoop;
						}
					}
				});
		});
}

/**
 * extractPDFURL callback
 * @callback extractPDFURL~Callback
 * @param {String} url
 */

/**
 * scrape bill or statute into Zotero.Item
 *
 * @param {Boolean} statute
 * @param {Document} doc
 * @param {String} url
 * @param {{}} parameters
 */
function scrapeBillOrStatute(statute, doc, url, parameters) {
	let item = new Zotero.Item(statute ? "statute" : "bill");
	let annexe = collectAnnexeData(doc);

	if (statute) {
		let title = text(doc, "h2.erlasskurztitel", 0);
		if (title) {
			item.shortTitle = title.substring(1).split(',')[0];
		}
		item.title = text(doc, "h1.erlasstitel", 0);
		item.codeNumber = annexe.abbreviation;
		item.number = numberLabel[parameters.lang] + text(doc, "p.srnummer", 0);
	}
	if (item.title === undefined || item.title.length === 0) {
		item.title = text(doc, "h1.title", 0);
		let parts = item.title.match(/^([^(]+)(?:\(([^,)]+))*/);
		if (parts[1]) {
			item.title = parts[1].trim();
		}
		if (parts[2]) {
			item.shortTitle = parts[2].trim();
		}
		item.number = text(doc, "app-memorial-label", 0);
	}
	if (!statute) {
		if (metadataLabels[annexe.type] === "revision") {
			item.title += " - " + revisionLabel[parameters.lang] + annexe.date;
		}
		item.legislativeBody = "CH";
		item.date = swissStrToISO(annexe.date);
	}

	item.dateEnacted = swissStrToISO(annexe.enacted);
	item.language = parameters.lang;
	item.url = url.split('#')[0];

	item.attachments.push({
		title: "Official Link",
		url: url,
		snapshot: false
	});

	let pdfURL = attr(doc, "iframe[type='application/pdf']", "src");
	if (pdfURL.length > 0) {
		item.attachments.push({
			title: "Official PDF",
			mimeType: "application/pdf",
			url: pdfURL
		});
	}

	if (statute && pdfURL.length === 0) {
		// we need to go the long way to get the PDF URL
		extractPDFURL(doc, url, parameters, function (pdf) {
			item.attachments.push({
				title: "Official PDF",
				mimeType: "application/pdf",
				url: pdf
			});
			item.complete();
		});
	}
	else {
		item.complete();
	}
}

/**
 * scrape Federal Gazette into Zotero.Item
 *
 * @param {Document} doc
 * @param {String} url
 * @param {{}} parameters
 */
function scrapeFederalGazette(doc, url, parameters) {
	let item = new Zotero.Item("hearing");
	let annexe = collectAnnexeData(doc);

	item.title = text(doc, "h1.title", 0);
	item.documentNumber = text(doc, "app-memorial-label", 0);
	item.committee = annexe.body;
	item.legislativeBody = bodyLabel[parameters.lang];
	item.date = swissStrToISO(annexe.date);
	item.language = parameters.lang;
	item.url = url;

	let pdfURL = attr(doc, "iframe[type='application/pdf']", "src");
	if (pdfURL.length > 0) {
		item.attachments.push({
			title: "Official PDF",
			mimeType: "application/pdf",
			url: pdfURL
		});
	}

	item.complete();
}

function detectWeb(doc, url) {
	let parameters = interpretURL(url);
	return parameters.type;
}

function doWeb(doc, url) {
	let parameters = interpretURL(url);

	if (parameters.collection === "cc") {
		scrapeBillOrStatute(true, doc, url, parameters);
	}
	else if (parameters.collection === "oc") {
		scrapeBillOrStatute(false, doc, url, parameters);
	}
	else if (parameters.collection === "fga") {
		scrapeFederalGazette(doc, url, parameters);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/de",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Schweizerisches Strafgesetzbuch",
				"creators": [],
				"dateEnacted": "1942-01-01",
				"codeNumber": "StGB",
				"language": "de",
				"publicLawNumber": "SR 311.0",
				"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/de",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
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
		"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/fr",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Code pénal suisse",
				"creators": [],
				"dateEnacted": "1942-01-01",
				"codeNumber": "CP",
				"language": "fr",
				"publicLawNumber": "RS 311.0",
				"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/fr",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
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
		"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/it",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Codice penale svizzero",
				"creators": [],
				"dateEnacted": "1942-01-01",
				"codeNumber": "CP",
				"language": "it",
				"publicLawNumber": "RS 311.0",
				"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/it",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
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
		"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/rm",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Cudesch penal svizzer",
				"creators": [],
				"dateEnacted": "1942-01-01",
				"language": "rm",
				"publicLawNumber": "SR 311.0",
				"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/rm",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
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
		"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/en",
		"defer": true,
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Swiss Criminal Code",
				"creators": [],
				"dateEnacted": "1942-01-01",
				"language": "en",
				"publicLawNumber": "SR 311.0",
				"url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/en",
				"attachments": [
					{
						"title": "Official Link",
						"snapshot": false
					},
					{
						"title": "Official PDF",
						"mimeType": "application/pdf"
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
