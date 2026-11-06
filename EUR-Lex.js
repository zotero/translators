{
	"translatorID": "bf053edc-a8c3-458c-93db-6d04ead2e636",
	"label": "EUR-Lex",
	"creator": "Philipp Zumstein, Pieter van der Wees",
	"target": "^https://eur-lex\\.europa\\.eu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-06 13:54:29"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Abe Jellinek
	
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
	DIR: "statute", // directive
	REG: "statute", // regulation
	DEC: "statute", // decision
	RECO: "report", // recommendation
	OPI: "report", // opinion
	CONS: "statute", // consolidated text
	TREATY: "statute", // treaty
};

// the note "(Text with EEA relevance)" and its variants, in all official languages:
// it must contain both the local abbreviation of EEA and a word for "text", and no digits
// (Croatian "EEZ" also means EEC, as in "... Direktive 89/391/EEZ")
const eeaNoteRegex = /\s*\(+(?=[^()\d]*(?:EEA|EWR|EEE|EER|EES|ETA|EØS|ЕИП|ΕΟΧ|EGT|EGP|EHP|EMP|EOG|LEE|SEE|EEZ|ŻEE))(?=[^()\d]*(?:[Tt]e(?:kst|xt)|[Tt]est|[Tt]éacs|szöveg|[Bb]esedilo|[Dd]okuments|[Тт]екст|[Κκ]είμενο))[^()\d]*\)+[\s.]*$/;

// the same note without parentheses, which many acts have, e.g. Regulation (EU) No 492/2011
const bareEeaNoteRegex = /\s*(?:Text with EEA relevance|Текст от значение за ЕИП|Text s významem pro EHP|EØS-relevant tekst|Text von Bedeutung für den EWR|Κείμενο που παρουσιάζει ενδιαφέρον για τον ΕΟΧ|Texto pertinente a (?:efectos|los fines) del EEE|EMPs kohaldatav tekst|ETA:n kannalta merkityksellinen teksti|Texte présentant de l['’]intérêt pour l['’]EEE|Téacs atá ábhartha maidir le(?:is an)? LEE|Tekst značajan za EGP|EGT[- ]vonatkozású szöveg|Testo rilevante ai fini del SEE|Dokuments attiecas uz EEZ|Tekstas svarbus EEE|Test b['’]r[ei]levanza għaż-ŻEE|Voor de EER relevante tekst|Tekst mający znaczenie dla EOG|Texto relevante para efeitos do EEE|Text cu relevanță pentru SEE|Text cu relevanţă pentru SEE|Text s (?:významom|platnosťou) pre EHP|Besedilo (?:velja za|se nanaša na) EGP|Text av betydelse för EES)[\s.]*$/i;

// a short title at the end of an English title, e.g. "(Artificial Intelligence Act)".
// Most parentheses in that position are something else, e.g. "(recast)" or "(EUPOL COPPS)"
const shortTitleRegex = /\(([A-Z][^()]*\b(?:Act|Code|Directive|Regulation))\)$/;

// the pages at the end of an OJ reference, before the list of languages
const ojPagesRegex = /,\s*\D*(\d+)\.?(?:\s*[-–—]\s*(\d+)\.?)?[^,\d(]*(?:\(|$)/;

// the pages of a special edition, which are the last thing after its volume
const specialEditionPagesRegex = /(\d+)(?:\s*[-–—]\s*(\d+))?\s*$/;


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
	var viewingLanguage = (doc.documentElement.lang || "en").toUpperCase();
	// Cases only return language; discard everything else
	item.language = viewingLanguage.toLowerCase();

	if (eliTypeUri) {
		// type: everything with ELI (see var typeMapping: bill, statute, report)
		item.title = ZU.trimInternal(attr(doc, 'meta[property="eli:title"][lang=' + viewingLanguage.toLowerCase() + "]", "content"))
			.replace(eeaNoteRegex, "")
			.replace(bareEeaNoteRegex, "");
		// decisions and purely amending acts use this position for the act they refer to,
		// e.g. "Regulation (EU) 2019/1155 ... amending Regulation (EC) No 810/2009 ... (Visa Code)"
		if (viewingLanguage == "EN" && /\/(?:DIR|REG)[^/]*$/.test(eliTypeUri) && !/\d{4},? amending\b/i.test(item.title)) {
			let shortTitle = item.title.match(shortTitleRegex);
			if (shortTitle) {
				item.shortTitle = shortTitle[1];
			}
		}
		// since October 2023, acts are published individually and only have the second link
		var uri = attr(doc, "#format_language_table_digital_sign_act_" + viewingLanguage.toUpperCase(), "href")
			|| attr(doc, "#format_language_table_digital_sign_" + viewingLanguage.toUpperCase(), "href");
		if (uri) {
			var uriParts = uri.split("/").pop().replace("?uri=", "")
.split(":");
			// e.g. uriParts =  ["OJ", "L", "1995", "281", "TOC"]
			// e.g. uriParts = ["DD", "03", "061", "TOC", "FI"]
			// e.g. uriParts = ["OJ", "L_202401689"]
			let actByAct = uriParts.length == 2 && uriParts[1].match(/^([A-Z]+)_(\d{4})0*(\d+)$/);
			if (actByAct) {
				item.code = uriParts[0] + " " + actByAct[1];
				// these acts have no issue or page number, only an identifier, like an article number:
				// cited as "OJ L, 2024/1689" but "OJ C, C/2024/3400"
				item.pages = (actByAct[1] == "C" ? "C/" : "") + actByAct[2] + "/" + actByAct[3];
			}
			else if (uriParts.length >= 4) {
				let isSpecialEdition = uriParts[0] == "DD";
				if (isSpecialEdition) {
					item.code = uriParts[0];
					item.codeNumber = uriParts[1] + ", " + uriParts[2];
				}
				else {
					item.code = uriParts[0] + " " + uriParts[1];
					item.codeNumber = uriParts[3].replace(/^0+/, "");
				}
				// the reference is localized, e.g.
				// "OJ L 158, 30.4.2004, pp. 77–123 (ES, DA, ...)" or "HL L 333., 2022.12.27., 80–152. o. (BG, ...)"
				// a special edition follows it, e.g. "... (ES, DA, ...)Polskie wydanie specjalne: Rozdział 05 Tom 005 P. 46 - 61"
				// or "... (DE, FR, ...)English Special Edition: Series I Volume 1968(II) P. 475 - 484"
				let reference = text(doc, "#originalTitle ~ p em");
				let pages = isSpecialEdition
					? reference.includes(uriParts[2]) && reference.split(uriParts[2]).pop().match(specialEditionPagesRegex)
					: reference.match(ojPagesRegex);
				if (pages) {
					item.pages = pages[2] ? pages[1] + "-" + pages[2] : pages[1];
				}
			}
			if (type == "bill") {
				item.codeVolume = item.codeNumber;
				item.codeNumber = null;
				item.codePages = item.pages;
				item.pages = null;
			}
		}

		var publicationDate = attr(doc, 'meta[property="eli:date_publication"]', "content");
		item.date = attr(doc, 'meta[property="eli:date_document"]', "content") || publicationDate;
		if (publicationDate) {
			// the date of the Official Journal, which often differs from the date of the act
			item.extra = "available-date: " + publicationDate;
		}
		
		var passedBy = doc.querySelectorAll('meta[property="eli:passed_by"]');
		var passedByArray = [];
		for (let i = 0; i < passedBy.length; i++) {
			passedByArray.push(passedBy[i].getAttribute("resource").split("/").pop());
		}
		item.legislativeBody = passedByArray.join(", ");
		
		item.url = attr(doc, 'meta[typeOf="eli:LegalResource"]', "about");
	}
		
	else if (item.itemType == "case") {
		// type: case
		// pretty hacky stuff, as there's little metadata available
		var docCourt = docType.substr(0, 1);
		if (docCourt == "C") {
			item.court = languageMapping[viewingLanguage].ECJ || languageMapping.EN.ECJ;
		}
		else if (docCourt == "T") {
			item.court = languageMapping[viewingLanguage].GC || languageMapping.EN.GC;
		}
		else if (docCourt == "F") {
			item.court = languageMapping[viewingLanguage].CST || languageMapping.EN.CST;
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
	var pdfurl = "https://eur-lex.europa.eu/legal-content/" + viewingLanguage + "/TXT/PDF/?uri=CELEX:" + celex;
	var htmlurl = "https://eur-lex.europa.eu/legal-content/" + viewingLanguage + "/TXT/HTML/?uri=CELEX:" + celex;
	item.attachments = [{ url: pdfurl, title: "EUR-Lex PDF (" + viewingLanguage + ")", mimeType: "application/pdf" }];
	item.attachments.push({ url: htmlurl, title: "EUR-Lex HTML (" + viewingLanguage + ")", mimeType: "text/html", snapshot: true });
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31995L0046",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Directive 95/46/EC of the European Parliament and of the Council of 24 October 1995 on the protection of individuals with regard to the processing of personal data and on the free movement of such data",
				"creators": [],
				"dateEnacted": "1995-10-24",
				"code": "OJ L",
				"codeNumber": "281",
				"extra": "available-date: 1995-11-23",
				"language": "en",
				"pages": "31-50",
				"url": "http://data.europa.eu/eli/dir/1995/46/oj",
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
				"nameOfAct": "Commission Regulation (EC) No 2257/94 of 16 September 1994 laying down quality standards for bananas",
				"creators": [],
				"dateEnacted": "1994-09-16",
				"code": "OJ L",
				"codeNumber": "245",
				"extra": "available-date: 1994-09-20",
				"language": "en",
				"pages": "6-10",
				"url": "http://data.europa.eu/eli/reg/1994/2257/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32004L0038",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Directive 2004/38/EC of the European Parliament and of the Council of 29 April 2004 on the right of citizens of the Union and their family members to move and reside freely within the territory of the Member States amending Regulation (EEC) No 1612/68 and repealing Directives 64/221/EEC, 68/360/EEC, 72/194/EEC, 73/148/EEC, 75/34/EEC, 75/35/EEC, 90/364/EEC, 90/365/EEC and 93/96/EEC",
				"creators": [],
				"dateEnacted": "2004-04-29",
				"code": "OJ L",
				"codeNumber": "158",
				"extra": "available-date: 2004-04-30",
				"language": "en",
				"pages": "77-123",
				"url": "http://data.europa.eu/eli/dir/2004/38/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 on the protection of natural persons with regard to the processing of personal data and on the free movement of such data, and repealing Directive 95/46/EC (General Data Protection Regulation)",
				"creators": [],
				"dateEnacted": "2016-04-27",
				"code": "OJ L",
				"codeNumber": "119",
				"extra": "available-date: 2016-05-04",
				"language": "en",
				"pages": "1-88",
				"shortTitle": "General Data Protection Regulation",
				"url": "http://data.europa.eu/eli/reg/2016/679/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence and amending Regulations (EC) No 300/2008, (EU) No 167/2013, (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1139 and (EU) 2019/2144 and Directives 2014/90/EU, (EU) 2016/797 and (EU) 2020/1828 (Artificial Intelligence Act)",
				"creators": [],
				"dateEnacted": "2024-06-13",
				"code": "OJ L",
				"language": "en",
				"pages": "2024/1689",
				"shortTitle": "Artificial Intelligence Act",
				"url": "http://data.europa.eu/eli/reg/2024/1689/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regulation (EU) 2022/2065 of the European Parliament and of the Council of 19 October 2022 on a Single Market For Digital Services and amending Directive 2000/31/EC (Digital Services Act)",
				"creators": [],
				"dateEnacted": "2022-10-19",
				"code": "OJ L",
				"codeNumber": "277",
				"extra": "available-date: 2022-10-27",
				"language": "en",
				"pages": "1-102",
				"shortTitle": "Digital Services Act",
				"url": "http://data.europa.eu/eli/reg/2022/2065/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R0492",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regulation (EU) No 492/2011 of the European Parliament and of the Council of 5 April 2011 on freedom of movement for workers within the Union",
				"creators": [],
				"dateEnacted": "2011-04-05",
				"code": "OJ L",
				"codeNumber": "141",
				"extra": "available-date: 2011-05-27",
				"language": "en",
				"pages": "1-12",
				"url": "http://data.europa.eu/eli/reg/2011/492/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32003R0001",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Council Regulation (EC) No 1/2003 of 16 December 2002 on the implementation of the rules on competition laid down in Articles 81 and 82 of the Treaty",
				"creators": [],
				"dateEnacted": "2002-12-16",
				"code": "OJ L",
				"codeNumber": "1",
				"extra": "available-date: 2003-01-04",
				"language": "en",
				"pages": "1-25",
				"url": "http://data.europa.eu/eli/reg/2003/1/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:C_202403400",
		"items": [
			{
				"itemType": "bill",
				"title": "Verbatim report of proceedings of 3 July 2018",
				"creators": [],
				"date": "2018-07-03",
				"code": "OJ C",
				"codePages": "C/2024/3400",
				"language": "en",
				"legislativeBody": "EP",
				"url": "http://data.europa.eu/eli/C/2024/3400/oj",
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
		"url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31968R1612",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Regulation (EEC) No 1612/68 of the Council of 15 October 1968 on freedom of movement for workers within the Community",
				"creators": [],
				"dateEnacted": "1968-10-15",
				"code": "DD",
				"codeNumber": "I, 1968(II)",
				"extra": "available-date: 1968-10-19",
				"language": "en",
				"pages": "475-484",
				"url": "http://data.europa.eu/eli/reg/1968/1612/oj",
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
				"language": "nl",
				"url": "https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=uriserv%3AOJ.C_.2021.014.01.0001.01.CES&toc=OJ%3AC%3A2021%3A014%3ATOC",
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
		"url": "https://eur-lex.europa.eu/legal-content/MT/TXT/?uri=CELEX%3A62009TJ0201",
		"items": [
			{
				"itemType": "case",
				"caseName": "Rügen Fisch AG vs l-Uffiċċju għall-Armonizzazzjoni fis-Suq Intern (trademarks u disinni) (UASI)",
				"creators": [],
				"dateDecided": "21 ta' Settembru 2011",
				"abstractNote": "Trade mark Komunitarja - Proċedimenti għal dikjarazzjoni ta’ invalidità - Trade mark Komunitarja verbali SCOMBER MIX - Raġuni assoluta għal rifjut - Karattru deskrittiv - Artikolu 7(1)(b) u (ċ) tar-Regolament (KE) Nru 40/94 [li sar l-Artikolu 7(1)(b) u (c) tar-Regolament (KE) Nru 207/2009]",
				"court": "Gerecht EU",
				"docketNumber": "Kawża T-201/09",
				"language": "nl",
				"url": "https://eur-lex.europa.eu/legal-content/MT/TXT/?uri=CELEX%3A62009TJ0201",
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
		"url": "https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32004L0038&locale=pl",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Dyrektywa 2004/38/WE Parlamentu Europejskiego i Rady z dnia 29 kwietnia 2004 r. w sprawie prawa obywateli Unii i członków ich rodzin do swobodnego przemieszczania się i pobytu na terytorium Państw Członkowskich, zmieniająca rozporządzenie (EWG) nr 1612/68 i uchylająca dyrektywy 64/221/EWG, 68/360/EWG, 72/194/EWG, 73/148/EWG, 75/34/EWG, 75/35/EWG, 90/364/EWG, 90/365/EWG i 93/96/EWG",
				"creators": [],
				"dateEnacted": "2004-04-29",
				"code": "DD",
				"codeNumber": "05, 005",
				"extra": "available-date: 2004-04-30",
				"language": "pl",
				"pages": "46-61",
				"url": "http://data.europa.eu/eli/dir/2004/38/oj",
				"attachments": [
					{
						"title": "EUR-Lex PDF (PL)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (PL)",
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
		"url": "https://eur-lex.europa.eu/legal-content/HU/TXT/?uri=CELEX:32022L2555&locale=hu",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Az Európai Parlament és a Tanács (EU) 2022/2555 irányelve (2022. december 14.) az Unió egész területén egységesen magas szintű kiberbiztonságot biztosító intézkedésekről, valamint a 910/2014/EU rendelet és az (EU) 2018/1972 irányelv módosításáról és az (EU) 2016/1148 irányelv hatályon kívül helyezéséről (NIS 2 irányelv)",
				"creators": [],
				"dateEnacted": "2022-12-14",
				"code": "OJ L",
				"codeNumber": "333",
				"extra": "available-date: 2022-12-27",
				"language": "hu",
				"pages": "80-152",
				"url": "http://data.europa.eu/eli/dir/2022/2555/oj",
				"attachments": [
					{
						"title": "EUR-Lex PDF (HU)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (HU)",
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
		"url": "https://eur-lex.europa.eu/legal-content/DA/TXT/?uri=CELEX:31968R1612&locale=da",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Rådets forordning nr. 1612/68/EØF af 15. oktober 1968 om arbejdskraftens frie bevægelighed inden for Fællesskabet",
				"creators": [],
				"dateEnacted": "1968-10-15",
				"code": "DD",
				"codeNumber": "I, 1968(II)",
				"extra": "available-date: 1968-10-19",
				"language": "da",
				"pages": "467-476",
				"url": "http://data.europa.eu/eli/reg/1968/1612/oj",
				"attachments": [
					{
						"title": "EUR-Lex PDF (DA)",
						"mimeType": "application/pdf"
					},
					{
						"title": "EUR-Lex HTML (DA)",
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
