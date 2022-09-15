{
	"translatorID": "bf053edc-a8c3-458c-93db-6d04ead2e636",
	"label": "EUR-Lex",
	"creator": "Philipp Zumstein, Pieter van der Wees",
	"target": "^https?://(www\\.)?eur-lex\\.europa\\.eu/(legal-content/[A-Z][A-Z]/(TXT|ALL)/|search\\.html\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-31 02:00:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Philipp Zumstein, Pieter van der Wees
	
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

// the eli resource types are described at:
// https://op.europa.eu/en/web/eu-vocabularies/at-dataset/-/resource/dataset/resource-type
// all types not mapped below are saved as bills
const typeMapping = {
	DIR: "bill", // directive
	REG: "statute", // regulation
	DEC: "statute", // decision
	RECO: "report", // recommendation
	OPI: "report", // opinion
	CONS: "statute", // consolidated text
	TREATY: "statute", // treaty
};


function detectWeb(doc, _url) {
	var docSector = attr(doc, 'meta[name="WT.z_docSector"]', 'content');
	var eliTypeURI = attr(doc, 'meta[property="eli:type_document"]', 'resource');
	if (eliTypeURI) {
		var eliType = eliTypeURI.split("/").pop();
		var eliCategory = eliType.split("_")[0];
		var type = typeMapping[eliCategory];
		if (type) {
			return type;
		}
		else {
			Z.debug("Unknown eliType: " + eliType);
			return "bill";
		}
	}
	else if (docSector == "6") {
		return "case";
	}
	else if (docSector && docSector !== "other") {
		return "bill";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("a.title");
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


// we need to remember the language in search page to use the same for
// individual entry page
var autoLanguage;


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var m = url.match(/\blocale=([a-z][a-z])/);
		if (m) {
			autoLanguage = m[1];
		}
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


// this maps language codes from ISO 639-1 to 639-3 and adds court names
// see https://op.europa.eu/en/web/eu-vocabularies/at-dataset/-/resource/dataset/court-type
function LMObj(iso, ECJ, GC, CST) {
	this.iso = iso;
	this.ECJ = ECJ;
	this.GC = GC;
	this.CST = CST;
}

const languageMapping = {
	BG: new LMObj("BUL", "Съд", "Общ съд", "Съд на публичната служба"),
	CS: new LMObj("CES", "Soudní dvůr", "Tribunál", "Soud pro veřejnou službu"),
	DA: new LMObj("DAN", "EU-Domstolen", "EU-Retten", "EU-Personalretten"),
	DE: new LMObj("DEU", "EuGH", "Gerichtshof", "Gericht für den öffentlichen Dienst"),
	EL: new LMObj("ELL", "Δικαστήριο", "Γενικό Δικαστήριο", "Δικαστήριο Δημόσιας Διοίκησης"),
	EN: new LMObj("ENG", "ECJ", "GC", "CST"),
	ES: new LMObj("SPA", "TJUE", "Tribunal General", "Tribunal de la Función Pública"),
	ET: new LMObj("EST", "Euroopa Kohus", "Üldkohus", "Avaliku Teenistuse Kohus"),
	FI: new LMObj("FIN", "Unionin tuomioistuin", "Unionin yleinen tuomioistuin", "Virkamiestuomioistuin"),
	FR: new LMObj("FRA", "Cour de justice", "Tribunal", "Tribunal de la fonction publique"),
	GA: new LMObj("GLE", "An Chúirt Bhreithiúnais", "Cúirt Ghinearálta", "An Binse um Sheirbhís Shibhialta"),
	HR: new LMObj("HRV", "Europski sud", "Opći sud", "Službenički sud"),
	HU: new LMObj("HUN", "A Bíróság", "Törvényszék", "Közszolgálati Törvényszék"),
	IT: new LMObj("ITA", "Corte di giustizia", "Tribunale", "Tribunale della funzione pubblica"),
	LV: new LMObj("LAV", "Tiesa", "Vispārējā tiesa", "Civildienesta tiesa"),
	LT: new LMObj("LIT", "Teisingumo Teismas", "Bendrasis Teismas", "Tarnautojų teismas"),
	MT: new LMObj("MLT", "Il-Qorti tal-Ġustizzja", "Il-Qorti Ġenerali", "Il-Tribunal għas-Servizz Pubbliku"),
	NL: new LMObj("NLD", "HvJ EU", "Gerecht EU", "GvA EU"),
	PL: new LMObj("POL", "Trybunał Sprawiedliwości", "Sąd", "Sąd do spraw Służby Publicznej"),
	PT: new LMObj("POR", "Tribunal Europeu de Justiça", "Tribunal Geral", "Tribunal da Função Pública"),
	RO: new LMObj("RON", "Curtea Europeană de Justiție", "Tribunalul", "Tribunalul Funcţiei Publice"),
	SK: new LMObj("SLK", "Súdny dvor", "Všeobecný súd", "Súd pre verejnú službu"),
	SL: new LMObj("SLV", "Sodišče", "Splošno sodišče", "Sodišče za uslužbence"),
	SV: new LMObj("SWE", "Domstolen", "Tribunalen", "Personaldomstolen")
};

function scrape(doc, url) {
	// declare meta variables present for all sectors
	// var docSector = attr(doc, 'meta[name="WT.z_docSector"]', 'content');
	var docType = attr(doc, 'meta[name="WT.z_docType"]', 'content');
	var celex = attr(doc, 'meta[name="WT.z_docID"]', 'content');
	
	var eliTypeUri = (attr(doc, 'meta[property="eli:type_document"]', "resource"));
	
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	// determine the language in which we are currently viewing the document
	var languageUrl = url.split("/")[4].toUpperCase();
	if (languageUrl == "AUTO") {
		languageUrl = autoLanguage || "EN";
	}
	var language = languageMapping[languageUrl].iso || "eng";
	// Cases only return language; discard everything else
	item.language = languageUrl.toLowerCase();
	

	if (eliTypeUri) {
		// type: everything with ELI (see var typeMapping: bill, statute, report)
		item.title = attr(doc, 'meta[property="eli:title"][lang=' + languageUrl.toLowerCase() + "]", "content");
		var uri = attr(doc, "#format_language_table_digital_sign_act_" + languageUrl.toUpperCase(), "href");
		if (uri) {
			var uriParts = uri.split("/").pop().replace("?uri=", "")
.split(":");
			// e.g. uriParts =  ["OJ", "L", "1995", "281", "TOC"]
			// e.g. uriParts = ["DD", "03", "061", "TOC", "FI"]
			if (uriParts.length >= 4) {
				if (/\d+/.test(uriParts[1])) {
					item.code = uriParts[0];
					item.codeNumber = uriParts[1] + ", " + uriParts[2];
				}
				else {
					item.code = uriParts[0] + " " + uriParts[1];
					item.codeNumber = uriParts[3];
				}
			}
			if (type == "bill") {
				item.codeVolume = item.codeNumber;
				item.codeNumber = null;
			}
		}

		item.date = attr(doc, 'meta[property="eli:date_document"]', "content");
		if (!item.date) {
			item.date = attr(doc, 'meta[property="eli:date_publication"]', "content");
		}
		
		var passedBy = doc.querySelectorAll('meta[property="eli:passed_by"]');
		var passedByArray = [];
		for (let i = 0; i < passedBy.length; i++) {
			passedByArray.push(passedBy[i].getAttribute("resource").split("/").pop());
		}
		item.legislativeBody = passedByArray.join(", ");
		
		item.url = attr(doc, 'meta[typeOf="eli:LegalResource"]', "about") + "/" + language.toLowerCase();
	}
		
	else if (item.itemType == "case") {
		// type: case
		// pretty hacky stuff, as there's little metadata available
		var docCourt = docType.substr(0, 1);
		if (docCourt == "C") {
			item.court = languageMapping[languageUrl].ECJ || languageMapping.EN.ECJ;
		}
		else if (docCourt == "T") {
			item.court = languageMapping[languageUrl].GC || languageMapping.EN.GC;
		}
		else if (docCourt == "F") {
			item.court = languageMapping[languageUrl].CST || languageMapping.EN.CST;
		}
		item.url = url;

		if (docType.substr(1) == "J") { // Judgments
			var titleParts = attr(doc, 'meta[name="WT.z_docTitle"]', "content").replace(/\./g, "").split("#");
			if (titleParts.length > 1) {
				item.caseName = titleParts[1];
				item.abstractNote = titleParts[titleParts.length - 2];
				item.docketNumber = titleParts.pop();
				item.dateDecided = titleParts[0].substr(titleParts[0].search(/[0-9]/g));
			}
		}
		else { // Orders, summaries, etc.
			item.caseName = attr(doc, 'meta[name="WT.z_docTitle"]', "content").replace(/#/g, " ");
			item.dateDecided = celex.substr(1, 4);
		}
	}
	else {
		// type: bill
		item.title = attr(doc, 'meta[name="WT.z_docTitle"]', "content");
		item.date = celex.substr(1, 4);
		item.url = url;
		if (docType == "C") {
			var celexCParts = celex.substr(1).split("/");
			item.code = "OJ C";
			item.codeVolume = celexCParts[1];
			item.codePages = celexCParts[2];
		}
	}
	// attachments
	// type: all
	var pdfurl = "https://eur-lex.europa.eu/legal-content/" + languageUrl + "/TXT/PDF/?uri=CELEX:" + celex;
	var htmlurl = "https://eur-lex.europa.eu/legal-content/" + languageUrl + "/TXT/HTML/?uri=CELEX:" + celex;
	item.attachments = [{ url: pdfurl, title: "EUR-Lex PDF (" + languageUrl + ")", mimeType: "application/pdf" }];
	item.attachments.push({ url: htmlurl, title: "EUR-Lex HTML (" + languageUrl + ")", mimeType: "text/html", snapshot: true });
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31995L0046",
		"items": [
			{
				"itemType": "bill",
				"title": "Directive 95/46/EC of the European Parliament and of the Council of 24 October 1995 on the protection of individuals with regard to the processing of personal data and on the free movement of such data",
				"creators": [],
				"date": "1995-10-24",
				"code": "OJ L",
				"codeVolume": "281",
				"language": "en",
				"legislativeBody": "EP, CONSIL",
				"url": "http://data.europa.eu/eli/dir/1995/46/oj/eng",
				"attachments": [
					{
						"title": "EUR-Lex PDF (EN)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (EN)",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:31994R2257",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Règlement (CE) n° 2257/94 de la Commission, du 16 septembre 1994, fixant des normes de qualité pour les bananes (Texte présentant de l'intérêt pour l'EEE)",
				"creators": [],
				"dateEnacted": "1994-09-16",
				"code": "OJ L",
				"codeNumber": "245",
				"language": "fr",
				"url": "http://data.europa.eu/eli/reg/1994/2257/oj/fra",
				"attachments": [
					{
						"title": "EUR-Lex PDF (FR)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (FR)",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://eur-lex.europa.eu/search.html?lang=en&text=%22open+access%22&qid=1513887127793&type=quick&scope=EURLEX&locale=nl",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:62019CJ0245",
		"items": [
			{
				"itemType": "case",
				"caseName": "État luxembourgeois tegen B en État luxembourgeois tegen B ea",
				"creators": [],
				"dateDecided": "6 oktober 2020",
				"abstractNote": "Prejudiciële verwijzing – Richtlijn 2011/16/EU – Administratieve samenwerking op het gebied van de belastingen – Artikelen 1 en 5 – Bevel tot het verstrekken van inlichtingen aan de bevoegde autoriteit van een lidstaat, die handelt naar aanleiding van een verzoek tot uitwisseling van inlichtingen van de bevoegde autoriteit van een andere lidstaat – Persoon die in het bezit is van de informatie waarvan de bevoegde autoriteit van eerstbedoelde lidstaat heeft bevolen dat deze moet worden verstrekt – Belastingplichtige tegen wie het onderzoek loopt dat aanleiding heeft gegeven tot het verzoek van de bevoegde autoriteit van de tweede lidstaat – Derden met wie deze belastingplichtige juridische, bancaire, financiële of, meer in het algemeen, economische banden onderhoudt – Rechtsbescherming – Handvest van de grondrechten van de Europese Unie – Artikel 47 – Recht op een doeltreffende voorziening in rechte – Artikel 52, lid 1 – Beperking – Rechtsgrondslag – Eerbiediging van de wezenlijke inhoud van het recht op een doeltreffende voorziening in rechte – Bestaan van een rechtsmiddel dat de betrokken justitiabelen de mogelijkheid biedt alle relevante feitelijke en juridische kwesties doeltreffend te laten toetsen en een daadwerkelijke rechtsbescherming van hun door het Unierecht gewaarborgde rechten te genieten – Door de Unie erkende doelstelling van algemeen belang – Bestrijding van internationale belastingfraude en ‑ontwijking – Evenredigheid – Criterium dat de informatie waarop het bevel tot het verstrekken van inlichtingen betrekking heeft ‚naar verwachting van belang is’ – Rechterlijke toetsing – Omvang – In aanmerking te nemen persoonlijke, temporele en materiële gegevens",
				"court": "HvJ EU",
				"docketNumber": "Gevoegde zaken C-245/19 en C-246/19",
				"language": "nl",
				"url": "https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:62019CJ0245",
				"attachments": [
					{
						"title": "EUR-Lex PDF (NL)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (NL)",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=uriserv%3AOJ.C_.2021.014.01.0001.01.CES&toc=OJ%3AC%3A2021%3A014%3ATOC",
		"items": [
			{
				"itemType": "bill",
				"title": "Bez námitek k navrhovanému spojení (Věc M.10068 — Brookfield/Mansa/Polenergia) (Text s významem pro EHP) 2021/C 14/01",
				"creators": [],
				"date": "2021",
				"language": "cs",
				"url": "https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=uriserv%3AOJ.C_.2021.014.01.0001.01.CES&toc=OJ%3AC%3A2021%3A014%3ATOC",
				"attachments": [
					{
						"title": "EUR-Lex PDF (CS)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (CS)",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://eur-lex.europa.eu/legal-content/MT/TXT/?uri=CELEX%3A62009TJ0201",
		"items": [
			{
				"itemType": "case",
				"caseName": "Rügen Fisch AG vs l-Uffiċċju għall-Armonizzazzjoni fis-Suq Intern (trademarks u disinni) (UASI)",
				"creators": [],
				"dateDecided": "21 ta' Settembru 2011",
				"abstractNote": "Trade mark Komunitarja - Proċedimenti għal dikjarazzjoni ta’ invalidità - Trade mark Komunitarja verbali SCOMBER MIX - Raġuni assoluta għal rifjut - Karattru deskrittiv - Artikolu 7(1)(b) u (ċ) tar-Regolament (KE) Nru 40/94 [li sar l-Artikolu 7(1)(b) u (c) tar-Regolament (KE) Nru 207/2009]",
				"court": "Il-Qorti Ġenerali",
				"docketNumber": "Kawża T-201/09",
				"language": "mt",
				"url": "https://eur-lex.europa.eu/legal-content/MT/TXT/?uri=CELEX%3A62009TJ0201",
				"attachments": [
					{
						"title": "EUR-Lex PDF (MT)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (MT)",
						"mimeType": "text/html",
						"snapshot": true
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
