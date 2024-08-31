{
	"translatorID": "fb23f4a4-d1be-4c41-9f74-4a6fe964a5bf",
	"label": "Herder",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.herder\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-06 21:21:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.body.matches('.page-article')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('ul.article-list h4 a');
	if (!rows.length) rows = doc.querySelectorAll('ul.link-list h4 a');
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

function scrape(doc, url) {
	let item = new Zotero.Item('journalArticle');
	
	item.title = text(doc, '.headline');
	if (text(doc, '.subline')) item.title += ': ' + text(doc, '.subline');
	item.abstractNote = text(doc, '.article-summary')
		.replace(/^\s*Zusammenfassung \/ Summary\s*/, '')
		.replace(/\s*\n\s*/, '\n\n');
	item.publicationTitle = attr(doc, 'img.header__logo-image', 'alt')
		|| text(doc, 'a[id$="linkBreadcrumb_0"]');
	
	let infoline = text(doc, '.article-infoline')
		.match(/[^\s]+ ([^\s]+) \(([0-9]+)\) ([^\s]+)?/);
	if (infoline) {
		item.volume = infoline[1];
		item.date = infoline[2];
		item.pages = infoline[3];
	}
	
	item.language = 'de-DE';
	item.url = attr(doc, 'link[rel="canonical"]', 'href') || url;
	
	for (let author of doc.querySelectorAll('.byline a')) {
		item.creators.push(ZU.cleanAuthor(author.innerText, 'author'));
	}
	
	item.attachments.push({
		title: 'Full Text PDF',
		url: attr(doc, 'a[id$="_linkPDF"]', 'href'),
		mimeType: 'application/pdf'
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.herder.de/thph/hefte/archiv/92-2017/4-2017/aristoteles-metaphysik-des-guten/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aristoteles’ Metaphysik des Guten: Gottes Existenz und Eigenschaften aus der Perspektive einer Relationalen Ontologie",
				"creators": [
					{
						"firstName": "Stephan",
						"lastName": "Herzberg",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"abstractNote": "Metaethische Fragen, die die Ontologie der Moral berühren, stehen nicht gerade im Zentrum von Aristoteles’ Ethik. Wo sie aufgeworfen werden, verschiebt Aristoteles eine genauere Erörterung und verweist auf eine andere Disziplin der Philosophie, die hierfür geeigneter scheint. Ein berühmtes Beispiel ist seine These, dass die Güter nicht zu denjenigen Dingen gehören, die bloß aufgrund eines Zufalls denselben Namen tragen. Aber wie sollen wir eine solche nicht-zufällige Homonymie im Fall des Guten verstehen? Aristoteles lässt die Frage offen, ob die Güter denselben Namen tragen aufgrund einer Hinordnung zu einer ersten Instanz (pros hen) oder aufgrund einer Analogie. Das ist kein zweitrangiges Interpretationsproblem, sondern betrifft die metaphysischen Grundlagen menschlicher Praxis: Wie lassen sich die Vielfalt der Güter und ihre Abhängigkeit von einer ersten Instanz (eudaimonia) konsistent zusammendenken? Welcher Art ist die Beziehung zwischen diesem höchsten menschlichen Gut und dem absolut höchsten Gut im ganzen Universum? Wie ist der Bereich menschlicher Praxis in das Ganze des Seienden eingebettet? Ausgehend von einer Neubewertung der Kritik des Aristoteles an Platons Theorie des Guten entwickelt dieser Aufsatz eine Rekonstruktion von Aristoteles’ Metaphysik des Guten.\n\nQuestions regarding moral metaphysics are not at the core of Aristotle’s ethics. Where they are raised, Aristotle postpones a detailed inquiry and points to another branch of philosophy that would be more appropriate. A famous example is his view that good things do not belong to the things that just happen to have the same name. But how should we conceive this non-coincidental homonymy? Aristotle leaves it open whether the things that are good have the same name by reason of being related to a first instance (pros hen) or by analogy (in the strict sense). This is not a merely marginal problem of interpretation. It strikes the metaphysical underpinning of human action: How can we reconcile the variety of “goods” with their dependence from a first instance (eudaimonia)? What is the relation between this highest human good and the supreme good of the universe, which is God? How is the realm of human praxis embedded in the whole realm of being? Based on a reassessment of Aristotle’s criticism of Plato’s theory of the good, this article develops a reconstruction of Aristotle’s metaphysics of goodness.",
				"language": "de-DE",
				"libraryCatalog": "Herder",
				"pages": "535-559",
				"publicationTitle": "Theologie und Philosophie",
				"shortTitle": "Aristoteles’ Metaphysik des Guten",
				"url": "https://www.herder.de/thph/hefte/archiv/92-2017/4-2017/aristoteles-metaphysik-des-guten/",
				"volume": "92",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://www.herder.de/stz/hefte/archiv/146-2021/7-2021/praevention-von-sexuellem-missbrauch-eine-daueraufgabe-die-beharrlichkeit-und-nachhaltige-prozesse-braucht/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Prävention von sexuellem Missbrauch: Eine Daueraufgabe, die Beharrlichkeit und nachhaltige Prozesse braucht",
				"creators": [
					{
						"firstName": "Hans",
						"lastName": "Zollner",
						"creatorType": "author"
					},
					{
						"firstName": "Jörg",
						"lastName": "Fegert",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"language": "de-DE",
				"libraryCatalog": "Herder",
				"pages": "483-497",
				"publicationTitle": "Stimmen der Zeit",
				"shortTitle": "Prävention von sexuellem Missbrauch",
				"url": "https://www.herder.de/stz/hefte/archiv/146-2021/7-2021/praevention-von-sexuellem-missbrauch-eine-daueraufgabe-die-beharrlichkeit-und-nachhaltige-prozesse-braucht/",
				"volume": "146",
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "",
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
		"url": "https://www.herder.de/el/hefte/archiv/2021/7-2021/meine-zeit-mein-leben-begegnungen/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Meine Zeit, mein Leben: Die Sonne",
				"creators": [
					{
						"firstName": "Rudolf",
						"lastName": "Walter",
						"creatorType": "author"
					},
					{
						"firstName": "Karlheinz A.",
						"lastName": "Geißler",
						"creatorType": "author"
					}
				],
				"language": "de-DE",
				"libraryCatalog": "Herder",
				"publicationTitle": "einfach leben",
				"shortTitle": "Meine Zeit, mein Leben",
				"url": "https://www.herder.de/el/hefte/archiv/2021/7-2021/meine-zeit-mein-leben-begegnungen/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "",
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
		"url": "https://www.herder.de/ek/hefte/archiv/2021/3-2021/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.herder.de/ek/suche/?s=Klassenzimmer",
		"items": "multiple"
	}
]
/** END TEST CASES **/
