{
	"translatorID": "60888261-7f17-41bd-95be-6982f05c01b3",
	"label": "Dreier Neuerscheinungsdienst",
	"creator": "Denis Maier",
	"target": "^https?://www\\.dietmardreier\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-25 08:40:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Denis Maier
	
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
	if (url.includes('/detail/ISBN')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h4.biblioTitle a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc) {
	var item = new Zotero.Item("book");
	// Set the title
	item.title = ZU.xpathText(doc, '//h1[@class="biblioTitle"]');
	if (ZU.xpathText(doc, '//div[@class="titles"]/div[@class="biblioSubTitle"]')) item.title += ": " + ZU.xpathText(doc, '//div[@class="titles"]/div[@class="biblioSubTitle"]');
	// ISBN
	item.ISBN = text(doc, '.biblioId .value');
	// Publisher
	item.publisher = text(doc, '.biblioPublisher .value');
	// Publisher Location
	item.place = text(doc, '.biblioPublicationTown .value');
	// Publication Date
	item.date = text(doc, '.biblioPublishingYear .value');
	// Number of pages
	item.numPages = text(doc, '.biblioPages .value');
	// Abstract
	item.abstractNote = text(doc, '.description .blurb .value');
	// Get Creators
	var creators = doc.querySelectorAll('.authorMain .biblioAuthor');
	for (let creator of creators) {
		let creatorName = creator.querySelector('.value').textContent;
		let creatorRole;
		// check for editors
		if ((creator.textContent.includes("Hrsg.")) || (creator.textContent.includes("Editor")) || (creator.textContent.includes("Editeur")))  {
			creatorRole = "editor";
		}
		// check for translators
		else if ((creator.textContent.includes("Übersetzung")) || (creator.textContent.includes("Translator")) || (creator.textContent.includes("Traduction"))) {
			creatorRole = "translator";
		}
		// everything else will be treated as authors
		else {
			creatorRole = "author";
		}
		item.creators.push(Zotero.Utilities.cleanAuthor(creatorName, creatorRole, creatorName.includes(', ')));
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.dietmardreier.de/de/detail/ISBN-9781792457418/Suehr-Christopher-J./A-Firm-Foundation",
		"items": [
			{
				"itemType": "book",
				"title": "A Firm Foundation: A Simple Introduction to the Christian Bible",
				"creators": [
					{
						"firstName": "Christopher J.",
						"lastName": "Suehr",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9781792457418",
				"abstractNote": "The Bible is big, complicated, and one of the most important books in human history.A Firm Foundation introduces the book that many call sacred, but few have studied.This versatile resource presents the Bible in plain language, with straightforward summaries, questions to facilitate discussion and reflection, and clearly defined terminology. It can stand alone, but works best as a companion to the bible.The material within has been used to teach a variety of students, including nonreligious beginners, clergy-in-training, English-language learners, and followers of other major world religions.Build a stronger understanding with A Firm Foundation.",
				"libraryCatalog": "Dreier Neuerscheinungsdienst",
				"numPages": "277 Seiten",
				"place": "Iowa",
				"publisher": "Kendall/Hunt Publishing Co ,U.S.Kendall",
				"shortTitle": "A Firm Foundation",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.dietmardreier.de/de/detail/ISBN-9781626168084/Mosher-Lucinda/A-World-of-Inequalities",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Lucinda",
						"lastName": "Mosher",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "A World of Inequalities: Christian and Muslim Perspectives",
				"ISBN": "9781626168084",
				"publisher": "Georgetown University Press",
				"place": "Washington, DC",
				"date": "2021",
				"numPages": "253 Seiten",
				"abstractNote": "In this volume, leading Christian and Muslim scholars respond to the global crisis of inequality by demanding and modeling interreligious dialogue. Essays explore the roots of these realities, how they are treated in Christian and Muslim traditions and texts, and how the two faiths can work together to address inequality.",
				"libraryCatalog": "Dreier Neuerscheinungsdienst",
				"shortTitle": "A World of Inequalities"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.dietmardreier.de/de/detail/ISBN-9783806240580/Nussbaum-Martha/Kosmopolitismus",
		"items": [
			{
				"itemType": "book",
				"title": "Kosmopolitismus: Revision eines Ideals",
				"creators": [
					{
						"firstName": "Martha",
						"lastName": "Nussbaum",
						"creatorType": "author"
					},
					{
						"firstName": "Manfred",
						"lastName": "Weltecke",
						"creatorType": "translator"
					}
				],
				"date": "2020",
				"ISBN": "9783806240580",
				"abstractNote": "Was bedeutet die Würde des Menschen? Ein philosophischer Essay Der kynische Philosoph Diogenes bezeichnete sich selbst einen kosmopolitês, einen \"Bürger der Welt\". Damit war der Kosmopolitismus geboren. Ein Kosmopolit definiert sich als Mensch - unabhängig von seiner Abstammung, seinem Geschlecht oder seiner sozialen Herkunft. Diese Haltung ist die Geburtsstunde der Menschenwürde in der abendländischen Kultur. Die amerikanische Philosophin Martha Nussbaum erörtert in ihrem Essay die kulturelle Tradition des Kosmopolitismus in Europa seit der Antike. Sie erläutert die philosophische Idee grundlegend und zeigt Querverbindungen zu aktuellen gesellschaftlichen Debatten auf. Entwicklung der Idee einer universellen Menschenwürde von der Antike bis in die Gegenwart Ethische Dilemmas aus Pluralismus & Globalisierung: Kosmopolitismus als Lösung? Weiterentwicklung der philosophischen Idee: der Fähigkeitenansatz von Martha Nussbaum Tiefgründig und inspirierend: Die Autorin gilt als einflussreichste Philosophin der Gegenwart Die Grundlagen herausfordern: Viele Wesen, viele Arten von Würde Kann in Zeiten des Globalismus und Pluralismus der Kosmopolitismus eine Lösung für die aktuellen politisch-gesellschaftlichen Herausforderungen sein? Auf der Suche nach der Antwort untersucht Martha Nussbaum in ihrem Sachbuch die philosophische Strömung von den griechischen Stoikern und Cicero über Hugo Grotius, Immanuel Kant bis zu Adam Smith. Sie analysiert so den Einfluss des Kosmopolitismus in der politischen Theorie und benennt konsequent die Stärken und Defizite. Mit dem von ihr mitentwickelten Fähigkeitenansatz erweitert sie zudem den modernen Kosmopolitismus radikal über die menschliche Spezies hinaus. Eine tiefgründige Analyse sowohl für Philosophen als auch für politisch Interessierte: Dieses Buch regt zum Nachdenken an!",
				"libraryCatalog": "Dreier Neuerscheinungsdienst",
				"numPages": "352 Seiten",
				"place": "Darmstadt",
				"publisher": "wbg Theiss in Wissenschaftliche Buchgesellschaft (WBG)",
				"shortTitle": "Kosmopolitismus",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
