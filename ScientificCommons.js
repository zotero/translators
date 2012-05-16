{
	"translatorID": "19643c25-a4b2-480d-91b7-4e0b761fb6ad",
	"label": "ScientificCommons",
	"creator": "Sebastian Karcher",
	"target": "^https?://(?:en|de|www)\\.scientificcommons\\.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-03-14 17:51:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Sebastian Karcher
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	return itemtype(doc);
}

function scrape(doc, url) {
	var type = itemtype(doc);
	var newItem = new Zotero.Item(type);

	//url
	var downloadurl = ZU.xpathText(doc, '//td[@class="dc_identifier"]/a');
	if (downloadurl) newItem.url = downloadurl;
	else newItem.url = url;

	//title
	newItem.title = ZU.trimInternal(ZU.xpathText(doc, '//td[@class="dc_title"]').replace(/\([0-9]{4}\)/, ""));

	//author
	var author = ZU.xpathText(doc, '//ul[@class="dc_creator"]').trim();
	author = author.split(/\n|\r/);
	for (var i in author) {
		if (author[i].match(/,/)) {
			// need to distinguish between authors with and w/o comma
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author[i], "author", "true"));
		} else {
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author[i], "author"));
		}
	}

	// abstract
	newItem.abstractNote = ZU.xpathText(doc, '//td[@class="dc_description"]');

	// Date - it's appended in parentheses at the ned of the tile
	newItem.date = ZU.xpathText(doc, '//td[@class="dc_title"]').match(/[0-9]{4}\)/)[0].replace(/\)/, "");

	//language
	newItem.language = ZU.xpathText(doc, '//meta[@name="DC.language"]/@content');

	//for Journal articles we need to parse a string
	if (type == "journalArticle") {
		var citation = ZU.xpathText(doc, '//td[@class="dc_relation"]').trim();
		if (citation.match(/^(.*),/)) {
			var journaltitle = citation.match(/^(.*?),/)[0].replace(/,/, "");
			newItem.publication = journaltitle;
		}
		if (citation.match(/Vol\.\s*[0-9]*/)) {
			var volume = citation.match(/Vol\.\s*[0-9]*/)[0].replace(/Vol\./, "").trim();
			newItem.volume = volume;
		}
		if (citation.match(/No\.\s*[0-9]*/)) {
			var issue = citation.match(/No\.\s*[0-9]*/)[0].replace(/No\./, "").trim();
			newItem.issue = issue;
		}
		if (citation.match(/pp\.\s*[0-9]*(-[0-9]*)?/)) {
			var pages = citation.match(/pp\.\s*[0-9]*(-[0-9]*)?/)[0].replace(/pp\./, "").trim();
			newItem.pages = pages;
		}
		if (citation.match(/[0-9]+(-[0-9]*)?(\s)*pp\./)) {
			var pages = citation.match(/[0-9]+(-[0-9]*)?\s*pp\./)[0].replace(/pp\./, "").trim();
			newItem.pages = pages;
		}
	}

	//Publisher - assume the "Mitarbeiter"/contributor is a good publisher for reports
	if (type == "report") {
		newItem.publisher = ZU.xpathText(doc, '//td[@class="dc_contributor"]');
	}

	// Tags
	var tags = ZU.xpathText(doc, '//td[@class="dc_subject"]');
	if (tags) {
		tags = tags.split(/, /);
		for (var i in tags) {
			tags[i] = tags[i].trim();
			newItem.tags.push(tags[i]);
		}
	}
	//try to get t
	newItem.attachments.push({
		url: url,
		title: "Scientific Commons Snapshot",
		mimeType: "text/html"
	});
	newItem.complete();
}

function itemtype(doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;

	if (doc.evaluate('//table[@class="publication"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var type = ZU.xpathText(doc, '//td[@class="dc_type"]');
		if (!type) return "report";
		if (type.match(/[Aa]rticle/)) return "journalArticle";
		else return "report";
	} else if (doc.evaluate('//p[@class="title"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";

	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;

	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//p[@class="title"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent.trim();
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://en.scientificcommons.org/59716804",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "H.",
						"lastName": "Erhorn",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Reiß",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Scientific Commons Snapshot",
						"mimeType": "text/html"
					}
				],
				"url": "http://en.scientificcommons.org/59716804",
				"title": "Raumlufttemperaturen in Wohnungen",
				"abstractNote": "Neben den klimatischen Randbedingungen, dem Lüftungsverhalten und den bauphysikalischen Kennwerten der Gebäudekonstruktion beeinflusst die Raumlufttemperatur massgeblich den Heizwärmeverbrauch. Sie kann nicht verordnet werden, sondern wird von den Bewohnern individuell so eingestellt, dass für sie ein thermisch behagliches Raumklima vorherrscht. Für die Berechnung des Energiebedarfs und der erzielbaren Energieeinsparpotenziale ist die Kenntnis des Nutzerverhaltens hinsichtlich der Raumlufttemperaturen und Fensteröffnungszeiten in bewohnten Gebäuden von zentraler Bedeutung.",
				"date": "2010",
				"language": "en",
				"publication": "EnEV aktuell",
				"volume": "4",
				"issue": "1",
				"pages": "3-4",
				"libraryCatalog": "ScientificCommons",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://en.scientificcommons.org/59716802",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "R.",
						"lastName": "Mauermann",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Müller",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Scientific Commons Snapshot",
						"mimeType": "text/html"
					}
				],
				"url": "http://en.scientificcommons.org/59716802",
				"title": "Synchroziehen - Eine Tiefziehvariante",
				"abstractNote": "Bleche wurden früher traditionell partiell durch Hämmern geformt. Bei der seit 100 Jahren üblichen Praxis des Tiefziehens wird in einem Fertigungsschritt mit Form-werkzeugen in Tiefziehpressen gearbeitet. Jetzt erinnert eine neue Verfahrens-variante, das Synchroziehen, wieder an die partielle Umformung. Die seit 2007 viel diskutierten Servopressen auf Basis von Kurbel-/Exenterwellen führen hauptsächlich zu Zeitvorteilen im technologiefernen - blechkontaktfreien - Pressenhub, der zum Teiletransport notwendig ist. Der eigentliche Umformvorgang bleibt jedoch weitgehend unverändert. Die Ergebnisse der bisher durchgeführten experimentellen Untersuchungen zeigten vor allem die Notwendigkeit weitere Untersuchungen in den Bereichen der Prozess-führung und der Maschinentechnik auf. Die Akzeptanz neuer hochdynamischer Technologien hängt im Wesentlichen von den verfügbaren Methoden zur Prozess-auslegung und vom Anwendungspotenzial der Maschinentechnik ab. In diesem Spannungsfeld besteht beispielsweise die Herausforderung hochdynamische Vorgänge zutreffend beurteilen und prognostizieren zu können. Aus maschinen-technischer Sicht bestehen Fragestellungen zum verfahrensgerechten Betrieb und zur Gestaltung von Servo-Spindelpressen. In verschiedenen aktuellen Forschungs-vorhaben untersucht das Fraunhofer IWU gemeinsam mit dem Institut für Werkzeug-maschinen und Steuerungstechnik der TU Dresden Methoden zur Auslegung hoch-dynamischer Prozesse sowie das Anwendungspotenzial von Servo-Spindelpressen",
				"date": "2010",
				"language": "en",
				"publication": "UTF science. Online journal",
				"issue": "2",
				"pages": "5",
				"libraryCatalog": "ScientificCommons",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://en.scientificcommons.org/59739904",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Ralf",
						"lastName": "Bendrath",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Social sciences",
					"sociology",
					"anthropology (300)",
					"Political science (320)",
					"Peace and Conflict Research",
					"International Conflicts",
					"Security Policy (10507)",
					"Special areas of Departmental Policy (10508)",
					"Technology Assessment (20800)",
					"Computer",
					"Digitalisierung",
					"Informationsgesellschaft",
					"innere Sicherheit",
					"Staat",
					"Technikfolgen",
					"Überwachung"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Scientific Commons Snapshot",
						"mimeType": "text/html"
					}
				],
				"url": "http://nbn-resolving.de/urn:nbn:de:0228-200708035",
				"title": "Der gläserne Bürger und der vorsorgliche Staat . zum Verhältnis von Überwachung und Sicherheit in der Informationsgesellschaft",
				"abstractNote": "'Das Sicherheitsparadigma des Präventionsstaates im 'Kampf gegen den Terror' unterscheidet sich in zweierlei Hinsicht von dem des Gefahrenabwehrstaates im Kalten Krieg. In zeitlicher Hinsicht geht es nicht mehr um die Abwehr gegenwärtiger Bedrohungen, sondern um die Vorbeugung zukünftiger Risiken. Auf der Akteursebene sind die Träger dieser Risiken nicht mehr Staaten, sondern Individuen. Damit gelten nun alle als potenziell verdächtig. Hier spielt der Computer eine entscheidende Rolle, indem er die alten Überwachungstechniken des Aufzeichnens und Verbreitens von Informationen durch die Möglichkeit des automatischen Entscheidens ergänzt. Aus 'Überwachen und Stragitale Diskriminierung auf der Basis von vernetzten Datenbanken und in Algorithmen gegossenen Vorurteilen. Mit diesem Verfahren sind jenseits juristischer und politischer Schwierigkeiten drei strukturelle Probleme verbunden: das Problem der Modellbildung, das Problem der Probabilistik und das Problem der Definitionsmacht. Dennoch scheint der Trend zum weiteren Ausbau der Überwachungsinfrastrukturen nicht aufzuhören. Mögliche Erklärungen, aber auch Hinweise auf weiteren Forschungsbedarf, liefern dafür jeweils auf unterschiedlichen Ebenen die Gesellschaftsdiagnose, die Techniksoziologie und die politische Ökonomie. In normativer Hinsicht geht es hier letztlich auch um die Sicherheitsvorsorge der Bürger gegenüber dem Staat und damit um die Frage: Wie köfen' wird damit 'Überwachen und Sortieren', aus individuellen Bewertungen wird massenhafte dinnen wir unsere technischen Infrastrukturen so aufbauen, dass unfähige und unredliche Machthaber damit keinen großen Schaden anrichten können?' (Autorenreferat)",
				"date": "2007",
				"language": "en",
				"publisher": "SSOAR - Social Science Open Access Repository",
				"libraryCatalog": "ScientificCommons",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://en.scientificcommons.org/ralf_bendrath",
		"items": "multiple"
	}
]
/** END TEST CASES **/