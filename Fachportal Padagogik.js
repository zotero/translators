{
	"translatorID": "4b0b42df-76b7-4a61-91aa-b15bc553b77d",
	"label": "Fachportal Pädagogik",
	"creator": "Philipp Zumstein",
	"target": "^https?://www\\.fachportal-paedagogik\\.de/fis_bildung/|^https?://www?\\.pedocs\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-04-09 21:49:30"
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
	if (url.indexOf('/suche/fis_set.html?FId=')>-1 || url.indexOf('/suche/fis_set_e.html?FId=')>-1 || url.indexOf('source_opus=')>-1) {
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
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "ergebnisliste")]/a|//ol[contains(@class, "pedocs_ergebnisliste")]/li/a');
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
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var m = url.match(/FId=([\w\d]+)(&|$)/);
	if (m) {
		//e.g. http://www.fachportal-paedagogik.de/fis_bildung/suche/fis_ausg.html?FId=A18196&lart=BibTeX
		var bibUrl = "/fis_bildung/suche/fis_ausg.html?FId=" + m[1] + "&lart=BibTeX";
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");//BibTex translator
		ZU.doGet(bibUrl, function(text){
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				finalize(doc, item);
			});
			translator.translate();
		});
	} else {
		var pdfUrl = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
		Z.debug(pdfUrl);

		/*
		//fails on http://www.pedocs.de/frontdoor.php?source_opus=9491&la=de
		Z.debug(ZU.xpathText(doc, '//span[@class="Z3988"]/@title'));
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");//COinS translator
		translator.setDocument(doc);//TODO encoding is normally Western and not utf8
		translator.setHandler("itemDone", function (obj, item) {
			if (pdfUrl) {
				item.attachments.push({
					url: pdfUrl,
					title: "Full Text PDF",
				});
			}
			
			finalize(doc, item);
		});
		translator.translate();
		*/
		
		var coins = ZU.xpathText(doc, '//span[@class="Z3988"]/@title');
		if (coins) {
			//Z.debug(coins);
			if (coins.indexOf('rft.genre=article') > -1 || coins.indexOf('rft.genre=bookitem') > -1) {//TODO condition here
				coins = coins.replace('rft.title', 'rft.atitle');
			}
			var item = new Zotero.Item();
			ZU.parseContextObject(coins, item);
			
			if (pdfUrl) {
				item.attachments.push({
					url: pdfUrl,
					title: "Full Text PDF",
				});
			}
			finalize(doc, item);
		}
	}
}

function finalize(doc, item) {
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	if (item.url) {
		item.attachments.push({
			url: item.url,
			title: "Link",
			snapshot: false
		});
		delete item.url;
	}
	if (item.numPages) {
		item.numPages = parseInt(item.numPages);
	}
	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/fis_bildung/suche/fis_set.html?FId=A18195",
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
				"abstractNote": "Teaching learning strategies is one important aspect of the consistently claimed promotion of self-regulated learning in classrooms. This study investigated the role of instructional context and teacher beliefs for teachers' promotion of learning strategies. Twenty mathematics teachers were videotaped for five lessons in the ninth grade. Three lessons on the Pythagorean Theorem (introductory unit) and two lessons on word problems (practice unit) represented the two different instructional contexts. An observation instrument was used to code the teachers' promotion of cognitive strategies (organization, elaboration) and metacognitive strategies (planning, monitoring and evaluation). Teacher beliefs were captured by questionnaire. Results show a tendency to teach cognitive strategies more in introductory lessons compared to practice lessons, while planning strategies are more often taught in practice lessons. Regarding teacher beliefs, traditional beliefs (e.g., a formalist view of mathematics) were negatively related to the promotion of some types of strategies (e.g., elaboration), while progressive beliefs (e.g., emphasis on an individual reference norm) were positively associated with teaching several strategy types (e.g., monitoring and evaluation). Thus, teacher beliefs seem to play a role for strategy teaching, which makes them a possible starting point for enhancing the promotion of self-regulated learning and a potential key factor in teacher training. (DIPF/Orig.).;;;Die Vermittlung von Lernstrategien ist ein wichtiger Bestandteil der Förderung von selbstreguliertem Lernen im Unterricht. Diese Studie untersucht, welche Rolle Unterrichtskontext und Lehrerüberzeugungen für die Vermittlung von Lernstrategien spielen. Von 20 Mathematiklehrkräften wurden jeweils fünf Unterrichtsstunden in der neunten Jahrgangsstufe gefilmt. Drei Unterrichtsstunden zum Thema Satz des Pythagoras (Einführungseinheit) und zwei Unterrichtsstunden zu Textaufgaben (Übungseinheit) stellten verschiedene Unterrichtskontexte dar. Mittels eines Beobachtungsinstruments wurde die Vermittlung von kognitiven Strategien (Organisation, Elaboration) und metakognitiven Strategien (Planung sowie Monitoring und Evaluation) kodiert. Lehrerüberzeugungen wurden mittels Fragebogen erfasst. Es zeigte sich, dass kognitive Strategien tendenziell häufiger in den Einführungsstunden vermittelt wurden, wogegen Planungsstrategien häufiger in den Übungsstunden zum Einsatz kamen. Bezüglich der Lehrerüberzeugungen korrelierten traditionelle Überzeugungen (z. B. formalistische Sicht von Mathematik) negativ mit der Vermittlung von einigen Strategiearten (z. B. Elaboration), fortschrittlichere Überzeugungen dagegen positiv. Lehrerüberzeugungen scheinen demnach eine Rolle für die Strategievermittlung zu spielen. Sie stellen somit einen möglichen Ansatzpunkt dar, um die Förderung von selbstreguliertem Lernen zu verbreiten und sollten in entsprechenden Lehrertrainings berücksichtigt werden. (DIPF/Orig.).",
				"issue": "1",
				"itemID": "article",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "176-197",
				"publicationTitle": "Journal for educational research online",
				"volume": "7",
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Link",
						"snapshot": false
					}
				],
				"tags": [
					"Deutschland",
					"Einstellung (Psy)",
					"Empirische Untersuchung",
					"Fragebogen",
					"Lehrer",
					"Lernförderung",
					"Lernmethode",
					"Mathematikunterricht",
					"Schuljahr 09",
					"Selbstgesteuertes Lernen",
					"Unterrichtsforschung",
					"Überzeugung"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/fis_bildung/suche/fis_set_e.html?FId=A18490&mstn=3&ckd=no&mtz=100&facets=y&maxg=5&suche=erweitert&ohneSynonyme=y&feldname1=Freitext&feldinhalt1=MATHEMATIK&bool1=and&nHits=19233&next=A18569,A19036,1065678&prev=A18195,A18196&marker=1",
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
				"abstractNote": "\"Regelmäßige Schulleistungsstudien erfassen Stärken und Schwächen des Bildungswesens und geben Hinweise für gezielte Maßnahmen zur Qualitätsverbesserung. Die Internationale Grundschul-Lese-Untersuchung (IGLU) findet seit 2001 alle fünf Jahre statt und richtet den Fokus auf die Lesekompetenz von Schülerinnen und Schülern am Ende der Grundschulzeit. An der Trends in International Mathematics and Science Study (TIMSS) im Grundschulbereich, die alle vier Jahre die Mathematik- sowie die Naturwissenschaftskompetenz beleuchtet, beteiligt sich Deutschland seit 2007. 2011 wurden IGLU und TIMSS erstmals parallel durchgeführt, daher können hier vertiefende Analysen beider Studien zusammengeführt werden. Zudem liegen mit der dritten Beteiligung an IGLU Trenddaten vor, die es erlauben, Entwicklungen der Grundschule in Deutschland der letzten zehn Jahre nachzuzeichnen.\" [Zusammenfassung: Angaben des Autors der Webseite].;;;This book analyses 10 years (2001-2011) of international assessment studies with TIMSS (Trends in International Mathematics and Science Study) and PIRLS (Progress in International Reading Literacy Study) with focus on Germany and Europe. [Abstract: Editors of Education Worldwide]",
				"itemID": "book",
				"libraryCatalog": "Fachportal Pädagogik",
				"numPages": 262,
				"place": "Münster",
				"publisher": "Waxmann",
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Link",
						"snapshot": false
					}
				],
				"tags": [
					"",
					"Deutschland",
					"Europa",
					"Grundschule",
					"IGLU (Internationale Grundschul-Lese-Untersuchung)",
					"Internationaler Vergleich",
					"Kompetenzmessung",
					"Leistungsmessung",
					"Lesekompetenz",
					"Mathematik",
					"Mathematische Kompetenz",
					"Naturwissenschaften",
					"Naturwissenschaftliche Kompetenz",
					"Schule",
					"Schulleistungsmessung",
					"Schülerleistung",
					"Sekundarstufe I",
					"Sekundarstufe II",
					"TIMSS (Third International Mathematics and Science Study)",
					"Vergleichende Erziehungswissenschaft"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/fis_bildung/suche/fis_set.html?FId=A18569&mstn=1&ckd=no&mtz=100&facets=y&maxg=6&suche=erweitert&ohneSynonyme=y&feldname1=Freitext&feldinhalt1=MATHEMATIK&bool1=and&feldname2=Dokumenttyp&feldinhalt2=swb&BoolSelect_2=AND&bool2=or&next=1058612,1061165,1064007,1064853,A17755&prev=&nHits=1890&marker=1",
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
				"abstractNote": "In diesem Beitrag wird die Vorgehensweise beim Auf- und Ausbau eines Online-Vorkurses Mathematik für technische Studiengänge beschrieben, der jährlich auf Basis der Evaluationsergebnisse angepasst und erweitert wurde. Die Entwicklung der interaktiven Lernmaterialien und formativen E-Assessments erforderte die Kombination mathematik-, physik- und mediendidaktischer Kenntnisse. Umfangreiche Abfragen auf dem datenbankbasierten Lernmanagementsystem (LMS) ermöglichten die Analyse der Qualität und Wirksamkeit des Angebots; hier kamen insbesondere testtheoretische Methoden und Verfahren zum Einsatz. Die entwickelten Instrumente sowie Erkenntnisse über Vor wissen und Lernverhalten der angehenden Studierenden fließen in das Hochschulverbundprojekt optes ein. Im Gegenzug konnte die dort vorhandene Expertise im Bereich des E-Mentoring zum Aufbau eines Betreuungskonzepts genutzt werden. Die Evaluationsergebnisse des Jahrgangs 2014 werden vor dem Hintergrund der Frage dokumentiert, welche Betreuungsangebote für welche Lernenden geeignet erscheinen. (DIPF/Orig.)",
				"bookTitle": "Digitale Medien und Interdisziplinarität",
				"itemID": "incollection",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "186-196",
				"place": "Münster, u.a.",
				"publisher": "Waxmann",
				"series": "Medien in der Wissenschaft. 68",
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Link",
						"snapshot": false
					}
				],
				"tags": [
					"Evaluation",
					"Lernmaterial",
					"Mathematik",
					"Mentoring",
					"Online-Angebot",
					"Technische Hochschule",
					"Virtuelle Lehre",
					"Vorkurs"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.fachportal-paedagogik.de/fis_bildung/fis_list.html?suche=erweitert&action=Suchen&feldname1=Freitext&feldinhalt1=Mathematikunterricht&ur_wert_feldinhalt1=mat&bool1=and&BoolSelect_2=AND&feldname2=Schlagw%F6rter&feldinhalt2=&bool2=and&BoolSelect_3=AND&feldname3=Titel&feldinhalt3=&bool3=and&BoolSelect_4=AND&feldname4=Jahr&feldinhalt4=&BoolSelect_5=AND&feldname5=Personen&feldinhalt5=&bool5=and&dokumenttyp%5B%5D=1&dokumenttyp%5B%5D=2&dokumenttyp%5B%5D=3&sprache%5B%5D=1&sprache%5B%5D=2&sprache%5B%5D=3&sprache%5B%5D=4&facets=y&fromForm=2",
		"items": "multiple"
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
				"ISSN": "0032-7034",
				"issue": "10",
				"language": "Deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"pages": "379",
				"publicationTitle": "Praxis der Kinderpsychologie und Kinderpsychiatrie",
				"shortTitle": "Hooper, S.R./ Willis, G. (1989)",
				"volume": "38",
				"attachments": [
					{
						"title": "Full Text PDF"
					},
					{
						"title": "Snapshot"
					},
					{
						"title": "Link",
						"snapshot": false
					}
				],
				"tags": [
					"Book review",
					"Classification",
					"Classification system",
					"Klassifikationssystem",
					"Learning Difficulties",
					"Learning Difficulty",
					"Learning disorder",
					"Lerndefizit",
					"Lernschwierigkeit",
					"Lernschwäche",
					"Review",
					"Rezension"
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
				"abstractNote": "Ziel der diskursanalytischen Betrachtung von politischen Dokumenten (hierzu gehören: Pläne, Programme und Berichte in bildungs&#8208; und kindheitsrelevanten Politikfeldern) und des darin auftretenden Diskurses zum Thema gute Kindheit und Bildung ist es, sie daraufhin zu untersuchen, welche Vorstellungen/Wissensbestände von guter Kindheit (und damit verbunden richtiger  Erziehung und Bildung, guter Elternschaft, guter pädagogischer Arbeit in Bildungsinstitutionen) transportiert werden. Das Projekt beabsichtigt daher, die politisch hervorgebrachten Leitbilder einer frühen und öffentlich verantworteten Bildungskindheit (vgl. Betz 2010) und ihre Konnotationen zu rekonstruieren. Ein Ausgangspunkt ist, dass die in den Dokumenten erzeugten Annahmen, Strategien und Maßnahmen einen weitreichenden Einfluss auf bildungspolitische Veränderungen und die Ausgestaltung der öffentlich verantworteten (Früh&#8208;) Erziehung/Bildung haben, also soziale Prozesse aktiv mitgestalten, wie dies beispielhaft an der Implementierung der Bildungs&#8208; und Erziehungspläne oder der Initiierung von Elternbildungsprogrammen veranschaulicht werden kann (siehe auch Kapitel 4.3.2)). Weiter wird davon ausgegangen, dass diese wirkmächtigen Annahmen auch Einfluss auf die Strukturierung der Vorstellungen, Haltungen und Praktiken der sozialen Akteure haben, was es empirisch einzufangen gilt. Der Frage, ob und in welcher Art und Weise dies der Fall ist, inwieweit hier die sozial situierten im Sinne von milieuspezifisch unterschiedlich geprägten Vorstellungen guter Kindheit mit den Vorstellungen in politischen Berichten korrespondieren und welche Bedeutung dies wiederum für die Reproduktion von Bildungsungleichheiten hat, soll [hier] explorativ nachgegangen werden. (DIPF/Orig.)",
				"language": "Deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"numPages": 49,
				"place": "Frankfurt",
				"publisher": "pedocs",
				"attachments": [
					{
						"title": "Full Text PDF"
					},
					{
						"title": "Snapshot"
					},
					{
						"title": "Link",
						"snapshot": false
					}
				],
				"tags": [
					"Beispiel",
					"Discourse",
					"Discourse Analysis",
					"Diskurs",
					"Diskursanalyse",
					"Empirical study",
					"Empirische Untersuchung",
					"Forschungsstand",
					"Ideal (model)",
					"Kindheitsbild",
					"Leitbild",
					"Method",
					"Methode",
					"Politics",
					"Politik",
					"Text analysis",
					"Textanalyse",
					"Textual analysis",
					"Theorie",
					"Theory",
					"Zwischenbericht"
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
				"abstractNote": "Berufliche Bildung hat einen anderen Bezugspunkt zur Gesellschaft als das allgemeine Bildungswesen. Im folgenden Beitrag werden ausgehend von der Smith'schen Analyse der Wirtschaft und Gesellschaft Perspektiven ökonomischer und pädagogischer Theoriebildung auf Bildung und berufliches Lernen nachgezeichnet. Es zeigt sich, daß von Elementar- bzw. Volksschulbildung zu unterscheidende berufliche Bildung in ihrer Spezifität von seiten der Ökonomen nach Adam Smith kaum die gebührende Beachtung fand und andererseits auch von Pädagogenseite das berufliche Lernen nur wenig gesellschaftlich kontextualisiert wurde. Der Auseinandersetzung mit den Smith'schen Thesen zur beruflichen Bildung ist es jedoch u. a. auch zu verdanken, daß sich konzeptionell eine modernisierte Berufslehre im deutschsprachigen Raum etablierte. (DIPF/Orig.)",
				"language": "Deutsch",
				"libraryCatalog": "Fachportal Pädagogik",
				"publisher": "pedocs",
				"attachments": [
					{
						"title": "Full Text PDF"
					},
					{
						"title": "Snapshot"
					},
					{
						"title": "Link",
						"snapshot": false
					}
				],
				"tags": [
					"Berufsausbildung",
					"Berufsbildung",
					"Bildung",
					"Bildungspolitik",
					"Bildungsreform",
					"Bildungswesen",
					"Bildungsökonomie",
					"Deutschland",
					"Economics of education",
					"Economy",
					"Education",
					"Education system",
					"Educational Economics",
					"Educational policy",
					"Educational reform",
					"Freedom",
					"Freiheit",
					"Germany",
					"Gesellschaft",
					"Learning",
					"Lernen",
					"Reform",
					"Society",
					"Soziale Lage",
					"The public",
					"Theorie",
					"Theory",
					"Vocational Education",
					"Vocational education and training",
					"Vocational training",
					"Wirtschaft",
					"Öffentlichkeit"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/