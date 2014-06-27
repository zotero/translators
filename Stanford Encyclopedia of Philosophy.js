{
	"translatorID": "5aabfa6e-79e6-4791-a9d2-46c9cb137561",
	"label": "Stanford Encyclopedia of Philosophy",
	"creator": "Sebastian Karcher",
	"target": "^https?://plato\\.stanford\\.edu/(?:entries|search)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-03-11 19:17:32"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2011 Sebastian Karcher and the Center for History and New Media
					 George Mason University, Fairfax, Virginia, USA
					 http://zotero.org
	
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
	if (url.match(/\/search\//)) return "multiple";
	if (url.match(/\entries\//)) return "bookSection";
}
	

function doWeb(doc, url){

	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
		var items = {};
		var titles = doc.evaluate('//div[@class="result_title"]/a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);	
		});
	} else {
		scrape(doc, url);
	}
}

// help function
function scrape(doc, url){
	//get abstract and tags from article plage
	//the xpaths aren't great , but seem reliable across pages
	var abs = ZU.xpathText(doc,'//p[1]').replace(/\n/g, "");
	var tags = ZU.xpathText(doc, '//div[@id="article-content"]//h2[a[@name="Rel" or @id="Rel"]]/following-sibling::p');
	if (tags) tags = tags.replace(/\n/g, "").split(/\|/);
	for (i in tags){
		tags[i] = ZU.trimInternal(tags[i])
			}
	//get BibTex Link
	var bibtexurl = url.replace(/entries\//,"cgi-bin/encyclopedia/archinfo.cgi?entry=").replace(/\/(index\.html)?$/, "");
	//Z.debug(bibtexurl)
	Zotero.Utilities.HTTP.doGet(bibtexurl, function (text) {
	//Z.debug(text)
	//remove line breaks, then match match the bibtex, then remove the odd /t in it.
	bibtex = text.replace(/\n/g, "").match(/<pre>.+<\/pre>/)[0].replace(/\/t/g, "")
	//Zotero.debug(bibtex)

		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);
		translator.setHandler("itemDone", function(obj, item) {
			if (abs) item.abstractNote = abs;
			if (tags) item.tags = tags;
			item.attachments = [{url:item.url, title: "SEP - Snapshot", mimeType: "text/html"}];
			item.complete();
		});	
		translator.translate();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://plato.stanford.edu/search/searcher.py?query=epistemology",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://plato.stanford.edu/entries/plato/",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Kraut",
						"creatorType": "author"
					},
					{
						"firstName": "Edward N.",
						"lastName": "Zalta",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"Aristotle",
					"Plato: ethics and politics in The Republic",
					"Socrates",
					"Socratic Dialogues",
					"abstract objects",
					"education, philosophy of",
					"epistemology",
					"metaphysics",
					"religion: and morality"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "SEP - Snapshot",
						"mimeType": "text/html"
					}
				],
				"itemID": "sep-plato",
				"title": "Plato",
				"url": "http://plato.stanford.edu/archives/fall2013/entries/plato/",
				"date": "2013",
				"edition": "Fall 2013",
				"abstractNote": "Plato (429–347 B.C.E.) is, by any reckoning, one of the mostdazzling writers in the Western literary tradition and one of the mostpenetrating, wide-ranging, and influential authors in the history ofphilosophy. An Athenian citizen of high status, he displays in hisworks his absorption in the political events and intellectual movementsof his time, but the questions he raises are so profound and thestrategies he uses for tackling them so richly suggestive andprovocative that educated readers of nearly every period have in someway been influenced by him, and in practically every age there havebeen philosophers who count themselves Platonists in some importantrespects. He was not the first thinker or writer to whom the word“philosopher” should be applied. But he was soself-conscious about how philosophy should be conceived, and what itsscope and ambitions properly are, and he so transformed theintellectual currents with which he grappled, that the subject ofphilosophy, as it is often conceived—a rigorous and systematicexamination of ethical, political, metaphysical, and epistemologicalissues, armed with a distinctive method—can be called hisinvention. Few other authors in the history of Western philosophy approximatehim in depth and range: perhaps only Aristotle (who studied with him),Aquinas, and Kant would be generally agreed to be of the same rank., Many people associate Plato with a few central doctrines that areadvocated in his writings: The world that appears to our senses is insome way defective and filled with error, but there is a more real andperfect realm, populated by entities (called “forms” or“ideas”) that are eternal, changeless, and in some senseparadigmatic for the structure and character of the world presented to our senses. Among themost important of these abstract objects (as they are now called,because they are not located in space or time) are goodness, beauty,equality, bigness, likeness, unity, being, sameness, difference,change, and changelessness. (These terms—“goodness”, “beauty”, and so on—areoften capitalized by those who write about Plato, in order to callattention to their exalted status; similarly for “Forms”and “Ideas.”) The most fundamental distinction in Plato'sphilosophy is between the many observable objects that appear beautiful(good, just, unified, equal, big) and the one object that is whatbeauty (goodness, justice, unity) really is, from which those manybeautiful (good, just, unified, equal, big) things receive their namesand their corresponding characteristics. Nearly every major work ofPlato is, in some way, devoted to or dependent on this distinction.Many of them explore the ethical and practical consequences ofconceiving of reality in this bifurcated way. We are urged to transformour values by taking to heart the greater reality of the forms and thedefectiveness of the corporeal world. We must recognize that the soulis a different sort of object from the body—so much so that itdoes not depend on the existence of the body for its functioning, andcan in fact grasp the nature of the forms far more easily when it isnot encumbered by its attachment to anything corporeal. In a few ofPlato's works, we are told that the soul always retains the ability torecollect what it once grasped of the forms, when it was disembodied prior to its possessor's birth(see especially Meno), and that the lives we lead are to someextent a punishment or reward for choices we made in a previousexistence (see especially the final pages of Republic). But inmany of Plato's writings, it is asserted or assumed that truephilosophers—those who recognize how important it is todistinguish the one (the one thing that goodness is, or virtue is, orcourage is) from the many (the many things that are called good orvirtuous or courageous )—are in a position to become ethicallysuperior to unenlightened human beings, because of the greater degreeof insight they can acquire. To understand which things are good andwhy they are good (and if we are not interested in such questions, howcan we become good?), we must investigate the form of good., The bibliography below is meant as a highly selective and limitedguide for readers who want to learn more about the issues coveredabove. Further discussion of these and other issues regarding Plato’sphilosophy, and far more bibliographical information, is available inthe other entries on Plato.,  abstract objects | Aristotle | education, philosophy of | epistemology | metaphysics | Plato: ethics and politics in The Republic | religion: and morality | Socrates | Socratic Dialogues,  Copyright © 2013 byRichard Kraut<rkraut1@northwestern.edu>    , View this site from another server:,",
				"libraryCatalog": "Stanford Encyclopedia of Philosophy",
				"bookTitle": "The Stanford Encyclopedia of Philosophy"
			}
		]
	}
]
/** END TEST CASES **/