{
	"translatorID": "4b0b42df-76b7-4a61-91aa-b15bc553b77d",
	"label": "Fachportal Pädagogik",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.fachportal-paedagogik\\.de/literatur/|www\\.pedocs\\.de/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-26 03:34:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

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
	if (url.indexOf('/vollanzeige.html?FId=')>-1
		|| url.indexOf('source_opus=')>-1) {
		var coins = doc.getElementsByClassName("Z3988");
		if (coins.length > 0) {
			var info = coins[0].title;
			if (info.indexOf("rft.genre=bookitem") > -1) {
				return "bookSection";
			}
			if (info.indexOf("rft.genre=book") > -1) {
				return "book";
			}
		}
		return "journalArticle";
	} else if (getSearchResults(doc, true)) {
		//searches will perform POST calls and therefore
		//we don't have a test case here; test manually
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li//a[contains(@href, "/literatur/vollanzeige.html")]|//ol[contains(@class, "pedocs_ergebnisliste")]/li/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		return Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		return scrape(doc, url);
	}
}

function scrape(doc, url) {
	var m = url.match(/FId=([\w\d]+)(&|$|#)/);
	if (m) {
		//e.g. http://www.fachportal-paedagogik.de/literatur/fis_ausgabe.html?FId%5B%5D=1041537&lart=BibTeX&senden=Exportieren&senden_an=
		var bibUrl = "/literatur/fis_ausgabe.html?FId[]=" + m[1] + "&lart=BibTeX";
		return ZU.doGet(bibUrl, function(text){
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");//BibTex translator
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				finalize(doc, item);
			});
			translator.translate();
		});
	} else {
		let pedocsId = url.match(/[?&]source_opus=(\d+)/);
		if (pedocsId) return scrapePedocs(doc, pedocsId[1]);
		return scrapeCOinS(doc);
	}
}

async function scrapePedocs(doc, id) {
	let completed = false;
	try {
		// The direct EndNote export contains publication details missing from COinS.
		let text = await requestText('/lucene_ergebnis.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `listeneintrag%5B%5D=${id}&la=de&exportart=endnote_direkt`
		});
		if (!/^%0 /m.test(text)) throw new Error('Invalid pedocs export');

		let doi = text.match(/^%R DOI:\s*(.+)$/m)?.[1];
		let issns = [];
		// Refer/BibIX treats %R as type and %@ as ISBN, but pedocs also puts
		// identifiers and ISSNs in those fields.
		text = text.replace(/^%R (?:DOI|URN):[^\r\n]*\r?\n/gm, '');
		text = text.replace(/^%@ ([^\r\n]+)\r?\n/gm, (line, value) => {
			let issn = ZU.cleanISSN(value);
			if (!issn) return line;
			issns.push(issn);
			return '';
		});

		let translator = Zotero.loadTranslator('import');
		translator.setTranslator('881f60f2-0802-411a-9228-ce5f47b64c7d'); // Refer/BibIX
		translator.setString(text);
		translator.setHandler('itemDone', (_obj, item) => {
			if (item.abstractNote) item.abstractNote = ZU.unescapeHTML(item.abstractNote);
			let coinsItem = parseCOinS(doc);
			if (coinsItem) {
				for (let field of [
					'pages',
					'numPages',
					'date',
					'publicationTitle',
					'bookTitle',
					'volume',
					'issue',
					'publisher',
					'place',
					'ISSN',
					'ISBN',
					'abstractNote',
					'language'
				]) {
					if (!item[field] && coinsItem[field]) item[field] = coinsItem[field];
				}
				if (!item.creators.length) item.creators = coinsItem.creators;
				if (!item.tags.length) item.tags = coinsItem.tags;
			}
			if (doi) {
				doi = ZU.cleanDOI(doi);
				if (doi && ZU.fieldIsValidForType('DOI', item.itemType)) {
					item.DOI = doi;
				} else if (doi) {
					item.extra = (item.extra ? item.extra + '\n' : '') + `DOI: ${doi}`;
				}
			}
			if (issns.length && item.itemType == 'journalArticle') item.ISSN = issns.join(', ');
			if (item.itemType == 'book' && item.pages) {
				item.numPages = item.pages;
				delete item.pages;
			}
			let pdfUrl = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
			if (pdfUrl) {
				item.attachments.push({ url: pdfUrl, title: 'Full Text PDF', mimeType: 'application/pdf' });
			}
			finalize(doc, item);
			completed = true;
		});
		await translator.translate();
		if (!completed) throw new Error('No item in pedocs export');
	}
	catch (e) {
		Z.debug(`Could not import pedocs export: ${e}`);
		if (!completed) scrapeCOinS(doc);
	}
}

function scrapeCOinS(doc) {
	var pdfUrl = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
	var item = parseCOinS(doc);
	if (!item) return;
	if (pdfUrl) {
		item.attachments.push({ url: pdfUrl, title: 'Full Text PDF', mimeType: 'application/pdf' });
	}
	finalize(doc, item);
}

function parseCOinS(doc) {
	var coins = ZU.xpathText(doc, '//span[@class="Z3988"]/@title');
	if (coins) {
		coins = transcodeURIEncoding(coins, 'Windows-1252');
		if (coins.indexOf('rft.genre=article') > -1
			|| coins.indexOf('rft.genre=bookitem') > -1) {
			coins = coins.replace('rft.title', 'rft.atitle');
		}
		var item = new Zotero.Item();
		ZU.parseContextObject(coins, item);
		if (item.abstractNote) item.abstractNote = ZU.unescapeHTML(item.abstractNote);
		return item;
	}
	return false;
}

function finalize(doc, item) {
	if (item.url) {
		item.attachments.push({
			url: item.url,
			title: "Entry in the German Education Index",
			snapshot: false
		});
		delete item.url;
	}
	var urn = ZU.xpathText(doc, '//meta[@name="DC.Identifier" and contains(@content, "urn:nbn")]/@content');
	if (urn) {
		item.url = "http://nbn-resolving.de/" + urn;
	}
	if (item.numPages) {
		item.numPages = item.numPages.replace(/\D/g, '');
	}
	if (item.publicationTitle) {
		item.publicationTitle = item.publicationTitle.replace(/\.$/, '');
	}
	item.complete();
}


/**
 * Credit for this function: Aurimas Vinckevicius
 *
 * Transcodes non-UTF-8-encoded text that was passed through encodeURIComponent
 * (which assumed that it was UTF-8) into the UTF-8 equivalent. This makes decodeURIComponent
 * correctly decode the encoded text into UTF-8.
 *
 * E.g. 0x82 (SINGLE LOW-9 QUOTATION MARK) in Windows-1252 is treated as UTF-8 and encoded
 * as %C2%82. This would transcode it to %E2%80%9A and decodeURIComponent would then
 * decode it to "\u201A" (the same symbol)
 *
 * @param {String} s String to transcode
 * @param {String} fromEncoding String specifying source encoding. Only "Windows-1252" is
 *     currently supported.
 * @return {String} Transcoded string. Unaltered string is returned if the encoding is not recognized.
 *
 * Examples:
 * transcodeURIEncoding("%C2%82", "Windows-1252") => "%E2%80%9A"
 * transcodeURIEncoding("%26%238208%3B", "Windows-1252") => "%26%238208%3B"
 */
function transcodeURIEncoding(s, fromEncoding) {
	// Only differing code points need to be specified
	var map = {
		// http://unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WINDOWS/CP1252.TXT
		'Windows-1252': {
			0x80: 0x20AC,
			0x81: null,
			0x82: 0x201A,
			0x83: 0x0192,
			0x84: 0x201E,
			0x85: 0x2026,
			0x86: 0x2020,
			0x87: 0x2021,
			0x88: 0x02C6,
			0x89: 0x2030,
			0x8A: 0x0160,
			0x8B: 0x2039,
			0x8C: 0x0152,
			0x8D: null,
			0x8E: 0x017D,
			0x8F: null,
			0x90: null,
			0x91: 0x2018,
			0x92: 0x2019,
			0x93: 0x201C,
			0x94: 0x201D,
			0x95: 0x2022,
			0x96: 0x2013,
			0x97: 0x2014,
			0x98: 0x02DC,
			0x99: 0x2122,
			0x9A: 0x0161,
			0x9B: 0x203A,
			0x9C: 0x0153,
			0x9D: null,
			0x9E: 0x017E,
			0x9F: 0x0178
		}
	}[fromEncoding];

	if (!map) return s;

	// Match two-byte UTF-8 patterns from 0x80 (%C2%80) to 0xFF (%C3%BF) code point, since
	// that would cover all 8-bit encodings. Note that in UTF-8 the two bytes are always in the
	// 0b110xxxxx 0b10xxxxxx format, so the second byte is limited to [89AB][0-9A-F] hex codes
	return s.replace(/%C[23]%[89AB][0-9A-F]/g, function(m) {
		var codePoint = decodeURIComponent(m).codePointAt(0);

		if (!(codePoint in map)) return m;

		codePoint = map[codePoint];
		if (codePoint === null) {
			// Code point was not defined. Shouldn't really happen, unless
			// an incorrect fromEncoding was specified.
			return '';
		}

		return encodeURIComponent(String.fromCodePoint(codePoint));
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/literatur/vollanzeige.html?FId=A18195#vollanzeige",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Teaching learning strategies. The role of instructional context and teacher beliefs.",
				"creators": [
					{
						"firstName": "Saskia",
						"lastName": "Kistner",
						"creatorType": "author"
					},
					{
						"firstName": "Katrin",
						"lastName": "Rakoczy",
						"creatorType": "author"
					},
					{
						"firstName": "Barbara",
						"lastName": "Otto",
						"creatorType": "author"
					},
					{
						"firstName": "Eckhard",
						"lastName": "Klieme",
						"creatorType": "author"
					},
					{
						"firstName": "Gerhard",
						"lastName": "Büttner",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"ISSN": "1866-6671",
				"abstractNote": "Die Vermittlung von Lernstrategien ist ein wichtiger Bestandteil der Förderung von selbstreguliertem Lernen im Unterricht. Diese Studie untersucht, welche Rolle Unterrichtskontext und Lehrerüberzeugungen für die Vermittlung von Lernstrategien spielen. Von 20 Mathematiklehrkräften wurden jeweils fünf Unterrichtsstunden in der neunten Jahrgangsstufe gefilmt. Drei Unterrichtsstunden zum Thema Satz des Pythagoras (Einführungseinheit) und zwei Unterrichtsstunden zu Textaufgaben (Übungseinheit) stellten verschiedene Unterrichtskontexte dar. Mittels eines Beobachtungsinstruments wurde die Vermittlung von kognitiven Strategien (Organisation, Elaboration) und metakognitiven Strategien (Planung sowie Monitoring und Evaluation) kodiert. Lehrerüberzeugungen wurden mittels Fragebogen erfasst. Es zeigte sich, dass kognitive Strategien tendenziell häufiger in den Einführungsstunden vermittelt wurden, wogegen Planungsstrategien häufiger in den Übungsstunden zum Einsatz kamen. Bezüglich der Lehrerüberzeugungen korrelierten traditionelle Überzeugungen (z. B. formalistische Sicht von Mathematik) negativ mit der Vermittlung von einigen Strategiearten (z. B. Elaboration), fortschrittlichere Überzeugungen dagegen positiv. Lehrerüberzeugungen scheinen demnach eine Rolle für die Strategievermittlung zu spielen. Sie stellen somit einen möglichen Ansatzpunkt dar, um die Förderung von selbstreguliertem Lernen zu verbreiten und sollten in entsprechenden Lehrertrainings berücksichtigt werden. (DIPF/Orig.).;;;Teaching learning strategies is one important aspect of the consistently claimed promotion of self-regulated learning in classrooms. This study investigated the role of instructional context and teacher beliefs for teachers' promotion of learning strategies. Twenty mathematics teachers were videotaped for five lessons in the ninth grade. Three lessons on the Pythagorean Theorem (introductory unit) and two lessons on word problems (practice unit) represented the two different instructional contexts. An observation instrument was used to code the teachers' promotion of cognitive strategies (organization, elaboration) and metacognitive strategies (planning, monitoring and evaluation). Teacher beliefs were captured by questionnaire. Results show a tendency to teach cognitive strategies more in introductory lessons compared to practice lessons, while planning strategies are more often taught in practice lessons. Regarding teacher beliefs, traditional beliefs (e.g., a formalist view of mathematics) were negatively related to the promotion of some types of strategies (e.g., elaboration), while progressive beliefs (e.g., emphasis on an individual reference norm) were positively associated with teaching several strategy types (e.g., monitoring and evaluation). Thus, teacher beliefs seem to play a role for strategy teaching, which makes them a possible starting point for enhancing the promotion of self-regulated learning and a potential key factor in teacher training. (DIPF/Orig.).",
				"issue": "1",
				"itemID": "article",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "176-197",
				"publicationTitle": "Journal for educational research online",
				"volume": "7",
				"attachments": [
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Empirische Untersuchung"
					},
					{
						"tag": "Fragebogen"
					},
					{
						"tag": "Einstellung (Psychologie)"
					},
					{
						"tag": "Schuljahr 9"
					},
					{
						"tag": "Lehrer"
					},
					{
						"tag": "Lernförderung"
					},
					{
						"tag": "Lernmethode"
					},
					{
						"tag": "Unterrichtsforschung"
					},
					{
						"tag": "Selbstgesteuertes Lernen"
					},
					{
						"tag": "Mathematikunterricht"
					},
					{
						"tag": "Überzeugung"
					},
					{
						"tag": "Deutschland"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/literatur/vollanzeige.html?FId=1080505&mstn=1&next=&prev=&ckd=no&mtz=20&facets=y&maxg=12&fisPlus=y&db=fis&tab=1&searchIn[]=fis&suche=erweitert&feldname1=Freitext&feldinhalt1=10+JAHRE+INTERNATIONAL+VERGLEICHENDE+SCHULLEISTUNGSFORSCHUNG&bool1=and&nHits=1&marker=1#vollanzeige",
		"items": [
			{
				"itemType": "book",
				"title": "10 Jahre international vergleichende Schulleistungsforschung in der Grundschule. Vertiefende Analysen zu IGLU und TIMSS 2001 bis 2011.",
				"creators": [
					{
						"firstName": "Heike",
						"lastName": "Wendt",
						"creatorType": "editor"
					},
					{
						"firstName": "Tobias C.",
						"lastName": "Stubbe",
						"creatorType": "editor"
					},
					{
						"firstName": "Knut",
						"lastName": "Schwippert",
						"creatorType": "editor"
					},
					{
						"firstName": "Wilfried",
						"lastName": "Bos",
						"creatorType": "editor"
					}
				],
				"date": "2015",
				"ISBN": "9783830933335",
				"abstractNote": "\"Regelmäßige Schulleistungsstudien erfassen Stärken und Schwächen des Bildungswesens und geben Hinweise für gezielte Maßnahmen zur Qualitätsverbesserung. Die Internationale Grundschul-Lese-Untersuchung (IGLU) findet seit 2001 alle fünf Jahre statt und richtet den Fokus auf die Lesekompetenz von Schülerinnen und Schülern am Ende der Grundschulzeit. An der Trends in International Mathematics and Science Study (TIMSS) im Grundschulbereich, die alle vier Jahre die Mathematik- sowie die Naturwissenschaftskompetenz beleuchtet, beteiligt sich Deutschland seit 2007. 2011 wurden IGLU und TIMSS erstmals parallel durchgeführt, daher können hier vertiefende Analysen beider Studien zusammengeführt werden. Zudem liegen mit der dritten Beteiligung an IGLU Trenddaten vor, die es erlauben, Entwicklungen der Grundschule in Deutschland der letzten zehn Jahre nachzuzeichnen.\" [Zusammenfassung: Angaben des Autors der Webseite].;;;This book analyses 10 years (2001-2011) of international assessment studies with TIMSS (Trends in International Mathematics and Science Study) and PIRLS (Progress in International Reading Literacy Study) with focus on Germany and Europe. [Abstract: Editors of Education Worldwide].",
				"itemID": "book",
				"libraryCatalog": "Fachportal Pädagogik",
				"numPages": "262",
				"place": "Münster",
				"publisher": "Waxmann",
				"attachments": [
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Vergleichende Erziehungswissenschaft"
					},
					{
						"tag": "TIMSS (Third International Mathematics and Science Study)"
					},
					{
						"tag": "Kompetenzmessung"
					},
					{
						"tag": "Schule"
					},
					{
						"tag": "Sekundarstufe I"
					},
					{
						"tag": "Sekundarstufe II"
					},
					{
						"tag": "Grundschule"
					},
					{
						"tag": "Schulleistungsmessung"
					},
					{
						"tag": "Schülerleistung"
					},
					{
						"tag": "Lesekompetenz"
					},
					{
						"tag": "Mathematik"
					},
					{
						"tag": "Mathematische Kompetenz"
					},
					{
						"tag": "Naturwissenschaften"
					},
					{
						"tag": "Naturwissenschaftliche Kompetenz"
					},
					{
						"tag": "Internationaler Vergleich"
					},
					{
						"tag": "Leistungsmessung"
					},
					{
						"tag": "IGLU (Internationale Grundschul-Lese-Untersuchung)"
					},
					{
						"tag": "Deutschland"
					},
					{
						"tag": "Europa"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/literatur/vollanzeige.html?FId=1080581&mstn=1&next=&prev=&ckd=no&mtz=20&facets=y&maxg=12&fisPlus=y&db=fis&tab=1&searchIn[]=fis&suche=erweitert&feldname1=Freitext&feldinhalt1=FORMATIVE+EVALUATION+DATENANALYSEN+BASIS+SCHRITTWEISEN+OPTIMIERUNG&bool1=and&nHits=1&marker=1#vollanzeige",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Formative Evaluation und Datenanalysen als Basis zur schrittweisen Optimierung eines Online-Vorkurses Mathematik.",
				"creators": [
					{
						"firstName": "Katja",
						"lastName": "Derr",
						"creatorType": "author"
					},
					{
						"firstName": "Reinhold",
						"lastName": "Hübl",
						"creatorType": "author"
					},
					{
						"firstName": "Tatyana",
						"lastName": "Podgayetskaya",
						"creatorType": "author"
					},
					{
						"firstName": "Nicolae",
						"lastName": "Nistor",
						"creatorType": "editor"
					},
					{
						"firstName": "Sabine",
						"lastName": "Schirlitz",
						"creatorType": "editor"
					}
				],
				"date": "2015",
				"ISBN": "9783830933380",
				"abstractNote": "In diesem Beitrag wird die Vorgehensweise beim Auf- und Ausbau eines Online-Vorkurses Mathematik für technische Studiengänge beschrieben, der jährlich auf Basis der Evaluationsergebnisse angepasst und erweitert wurde. Die Entwicklung der interaktiven Lernmaterialien und formativen E-Assessments erforderte die Kombination mathematik-, physik- und mediendidaktischer Kenntnisse. Umfangreiche Abfragen auf dem datenbankbasierten Lernmanagementsystem (LMS) ermöglichten die Analyse der Qualität und Wirksamkeit des Angebots; hier kamen insbesondere testtheoretische Methoden und Verfahren zum Einsatz. Die entwickelten Instrumente sowie Erkenntnisse über Vor wissen und Lernverhalten der angehenden Studierenden fließen in das Hochschulverbundprojekt optes ein. Im Gegenzug konnte die dort vorhandene Expertise im Bereich des E-Mentoring zum Aufbau eines Betreuungskonzepts genutzt werden. Die Evaluationsergebnisse des Jahrgangs 2014 werden vor dem Hintergrund der Frage dokumentiert, welche Betreuungsangebote für welche Lernenden geeignet erscheinen. (DIPF/Orig.).",
				"bookTitle": "Digitale Medien und Interdisziplinarität",
				"itemID": "incollection",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "186-196",
				"place": "Münster u.a.",
				"publisher": "Waxmann",
				"series": "Medien in der Wissenschaft. 68",
				"attachments": [
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Evaluation"
					},
					{
						"tag": "Mentoring"
					},
					{
						"tag": "Lernmaterial"
					},
					{
						"tag": "Mathematik"
					},
					{
						"tag": "Virtuelle Lehre"
					},
					{
						"tag": "Technische Hochschule"
					},
					{
						"tag": "Vorkurs"
					},
					{
						"tag": "Online-Angebot"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.pedocs.de/frontdoor.php?source_opus=2746&la=de",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hooper, S.R./ Willis, G. (1989): Learning disability subtyping. Berlin: Springer (259 Seiten; DM 85,-) [Rezension]",
				"creators": [
					{
						"firstName": "Dieter",
						"lastName": "Gröschke",
						"creatorType": "author"
					}
				],
				"date": "1989",
				"DOI": "10.25656/01:2746",
				"ISSN": "0032-7034",
				"archiveLocation": "DIPF | Leibniz-Institut für Bildungsforschung und Bildungsinformation",
				"issue": "10",
				"language": "deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "379",
				"publicationTitle": "Praxis der Kinderpsychologie und Kinderpsychiatrie",
				"shortTitle": "Hooper, S.R./ Willis, G. (1989)",
				"url": "http://nbn-resolving.de/urn:nbn:de:0111-opus-27462",
				"volume": "38",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Book review"
					},
					{
						"tag": "Classification"
					},
					{
						"tag": "Classification system"
					},
					{
						"tag": "Klassifikationssystem"
					},
					{
						"tag": "Learning Difficulties"
					},
					{
						"tag": "Learning Difficulty"
					},
					{
						"tag": "Learning disorder"
					},
					{
						"tag": "Lerndefizit"
					},
					{
						"tag": "Lernschwierigkeit"
					},
					{
						"tag": "Lernschwäche"
					},
					{
						"tag": "Review"
					},
					{
						"tag": "Rezension"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.pedocs.de/frontdoor.php?source_opus=11837",
		"items": [
			{
				"itemType": "book",
				"title": "Die diskursanalytische Rekonstruktion von politischen Leitbildern bildungsbezogener 'guter Kindheit'",
				"creators": [
					{
						"firstName": "Stefanie",
						"lastName": "Bischoff",
						"creatorType": "author"
					},
					{
						"firstName": "Tanja",
						"lastName": "Betz",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "Ziel der diskursanalytischen Betrachtung von politischen Dokumenten (hierzu gehören: Pläne, Programme und Berichte in bildungs‐ und kindheitsrelevanten Politikfeldern) und des darin auftretenden Diskurses zum Thema gute Kindheit und Bildung ist es, sie daraufhin zu untersuchen, welche Vorstellungen/Wissensbestände von ‚guter Kindheit‘ (und damit verbunden richtiger  Erziehung und Bildung, guter Elternschaft, guter pädagogischer Arbeit in Bildungsinstitutionen) transportiert werden. Das Projekt beabsichtigt daher, die politisch hervorgebrachten Leitbilder einer frühen und öffentlich verantworteten ‚Bildungskindheit‘ (vgl. Betz 2010) und ihre Konnotationen zu rekonstruieren. Ein Ausgangspunkt ist, dass die in den Dokumenten erzeugten Annahmen, Strategien und Maßnahmen einen weitreichenden Einfluss auf bildungspolitische Veränderungen und die Ausgestaltung der öffentlich verantworteten (Früh‐) Erziehung/Bildung haben, also soziale Prozesse aktiv mitgestalten, wie dies beispielhaft an der Implementierung der Bildungs‐ und Erziehungspläne oder der Initiierung von Elternbildungsprogrammen veranschaulicht werden kann (siehe auch Kapitel 4.3.2)). Weiter wird davon ausgegangen, dass diese wirkmächtigen Annahmen auch Einfluss auf die Strukturierung der Vorstellungen, Haltungen und Praktiken der sozialen Akteure haben, was es empirisch einzufangen gilt. Der Frage, ob und in welcher Art und Weise dies der Fall ist, inwieweit hier die sozial situierten im Sinne von milieuspezifisch unterschiedlich geprägten Vorstellungen ‚guter Kindheit‘ mit den Vorstellungen in politischen Berichten korrespondieren und welche Bedeutung dies wiederum für die Reproduktion von Bildungsungleichheiten hat, soll [hier] explorativ nachgegangen werden. (DIPF/Orig.)",
				"archiveLocation": "DIPF | Leibniz-Institut für Bildungsforschung und Bildungsinformation",
				"extra": "DOI: 10.25656/01:11837",
				"language": "deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"numPages": "49",
				"place": "Frankfurt",
				"publisher": "Goethe-Universität",
				"series": "Educare Working Paper",
				"url": "http://nbn-resolving.de/urn:nbn:de:0111-pedocs-118379",
				"volume": "1/2011",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Beispiel"
					},
					{
						"tag": "Discourse"
					},
					{
						"tag": "Discourse Analysis"
					},
					{
						"tag": "Diskurs"
					},
					{
						"tag": "Diskursanalyse"
					},
					{
						"tag": "Empirical study"
					},
					{
						"tag": "Empirische Untersuchung"
					},
					{
						"tag": "Forschungsstand"
					},
					{
						"tag": "Ideal (model)"
					},
					{
						"tag": "Kindheitsbild"
					},
					{
						"tag": "Leitbild"
					},
					{
						"tag": "Method"
					},
					{
						"tag": "Methode"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Politik"
					},
					{
						"tag": "Text analysis"
					},
					{
						"tag": "Textanalyse"
					},
					{
						"tag": "Textual analysis"
					},
					{
						"tag": "Theorie"
					},
					{
						"tag": "Theory"
					},
					{
						"tag": "Zwischenbericht"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.pedocs.de/frontdoor.php?source_opus=9491&la=de",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Berufliche Bildung und Gesellschaft in ökonomischer und pädagogischer Theoriebildung",
				"creators": [
					{
						"firstName": "Philipp",
						"lastName": "Gonon",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"abstractNote": "Berufliche Bildung hat einen anderen Bezugspunkt zur Gesellschaft als das allgemeine Bildungswesen. Im folgenden Beitrag werden ausgehend von der Smith'schen Analyse der Wirtschaft und Gesellschaft Perspektiven ökonomischer und pädagogischer Theoriebildung auf Bildung und berufliches Lernen nachgezeichnet. Es zeigt sich, daß von Elementar- bzw. Volksschulbildung zu unterscheidende berufliche Bildung in ihrer Spezifität von seiten der Ökonomen nach Adam Smith kaum die gebührende Beachtung fand und andererseits auch von Pädagogenseite das berufliche Lernen nur wenig gesellschaftlich kontextualisiert wurde. Der Auseinandersetzung mit den Smith'schen Thesen zur beruflichen Bildung ist es jedoch u. a. auch zu verdanken, daß sich konzeptionell eine modernisierte Berufslehre im deutschsprachigen Raum etablierte. (DIPF/Orig.)",
				"archiveLocation": "DIPF | Leibniz-Institut für Bildungsforschung und Bildungsinformation",
				"bookTitle": "Bildung, Öffentlichkeit und Demokratie",
				"extra": "DOI: 10.25656/01:9491",
				"language": "deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "251-266",
				"place": "Weinheim u.a.",
				"publisher": "Beltz",
				"series": "Zeitschrift für Pädagogik, Beiheft",
				"url": "http://nbn-resolving.de/urn:nbn:de:0111-pedocs-94912",
				"volume": "38",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Berufsausbildung"
					},
					{
						"tag": "Berufsbildung"
					},
					{
						"tag": "Bildung"
					},
					{
						"tag": "Bildungspolitik"
					},
					{
						"tag": "Bildungsreform"
					},
					{
						"tag": "Bildungswesen"
					},
					{
						"tag": "Bildungsökonomie"
					},
					{
						"tag": "Deutschland"
					},
					{
						"tag": "Economics of education"
					},
					{
						"tag": "Economy"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Education system"
					},
					{
						"tag": "Educational Economics"
					},
					{
						"tag": "Educational policy"
					},
					{
						"tag": "Educational reform"
					},
					{
						"tag": "Freedom"
					},
					{
						"tag": "Freiheit"
					},
					{
						"tag": "Germany"
					},
					{
						"tag": "Gesellschaft"
					},
					{
						"tag": "Learning"
					},
					{
						"tag": "Lernen"
					},
					{
						"tag": "Reform"
					},
					{
						"tag": "Society"
					},
					{
						"tag": "Soziale Lage"
					},
					{
						"tag": "The public"
					},
					{
						"tag": "Theorie"
					},
					{
						"tag": "Theory"
					},
					{
						"tag": "Vocational Education"
					},
					{
						"tag": "Vocational education and training"
					},
					{
						"tag": "Vocational training"
					},
					{
						"tag": "Wirtschaft"
					},
					{
						"tag": "Öffentlichkeit"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pedocs.de/frontdoor.php?source_opus=7914",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Bildung und Demokratie",
				"creators": [
					{
						"firstName": "Dietrich",
						"lastName": "Benner",
						"creatorType": "author"
					}
				],
				"date": "2001",
				"abstractNote": "Der Autor geht von einer Äußerung P. Wandels aus, der auf die \"historische Tatsache\" hinweist, \"dass es bisher kein Schulsystem ... gab und gibt, das nicht in seinem Erziehungsziel und in seinem ganzen Charakter auf den jeweiligen Staat, auf die jeweils herrschenden gesellschaftlichen Verhältnisse eingestellt gewesen wäre. Das kann nicht anders sein.\" Dagegen vertritt und begründet der Autor seine These, dass dies für eine freiheitliche Demokratie nicht gelten kann: \"Diese ist unter den bekannten Staatsformen die einzige, die sich ihren eigenen Grundsätzen zufolge ein Verbot auferlegen muss, die Lebensformen der Menschen zu normieren und Pädagogik durch die Setzung von Erziehungszielen und Bildungsidealen als einen angewandten Teil der Politik zu konzipieren.\" Es werden 4 klassische Positionen über das Verhältnis (Primat oder Dualität) von Politik und Pädagogik diskutiert. (DIPF/Bi.)",
				"archiveLocation": "DIPF | Leibniz-Institut für Bildungsforschung und Bildungsinformation",
				"bookTitle": "Zukunftsfragen der Bildung",
				"extra": "DOI: 10.25656/01:7914",
				"language": "deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "49-65",
				"place": "Weinheim",
				"publisher": "Beltz",
				"series": "Zeitschrift für Pädagogik, Beiheft",
				"url": "http://nbn-resolving.de/urn:nbn:de:0111-opus-79142",
				"volume": "43",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Entry in the German Education Index",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Aims of education"
					},
					{
						"tag": "Democracy"
					},
					{
						"tag": "Demokratie"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Erziehung"
					},
					{
						"tag": "Erziehungsziel"
					},
					{
						"tag": "National state"
					},
					{
						"tag": "Pedagogics"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Politik"
					},
					{
						"tag": "Pädagogik"
					},
					{
						"tag": "Sciences of education"
					},
					{
						"tag": "Staat"
					},
					{
						"tag": "State"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
