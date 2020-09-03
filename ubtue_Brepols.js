{
	"translatorID": "ade18ffe-62a6-4392-9853-eb658faf36e4",
	"label": "ubtue_Brepols",
	"creator": "Timotheus Kim",
	"target": "https?://www\\.brepolsonline\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-27 10:56:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
// attr()/text() v2
function attr(docOrElem ,selector ,attr ,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.textContent:null; }

function detectWeb(doc, url) {
	if (url.match(/doi/)) return "journalArticle";
		else if (url.match(/toc/) && getSearchResults(doc, true)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.hlFld-Title');
	for (let row of rows) {
		let href = row.parentElement;
		let title = ZU.trimInternal(row.innerHTML);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (t, i) {
		var rows = doc.querySelectorAll('.hlFld-Abstract');
		for (let row of rows) {
			var abstractsEntry = row.innerText; //Z.debug(abstractsEntry)
		}
		let abstractsOneTwo = abstractsEntry.split('\n\n'); //Z.debug(abstractsOneTwo)
		if (i.abstractNote) i.abstractNote = abstractsOneTwo[1];
		if (abstractsOneTwo[2]) {
			i.notes.push({
				note: "abs:" + abstractsOneTwo[2],
		});
	}
		if (i.reportType === "book-review") i.tags.push('Book Review') && delete i.abstractNote;
		i.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.JAAJ.5.119152",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Faith in a Silent God: The Characterization of Hannah in Pseudo-Philo",
				"creators": [
					{
						"firstName": "Tavis A.",
						"lastName": "Bohlinger",
						"creatorType": "author"
					}
				],
				"date": "2020-02-18",
				"DOI": "10.1484/J.JAAJ.5.119152",
				"abstractNote": "Le caractère biblique d’Anne dans Liber Antiquitatum Biblicarum est un exemple révélateur de la façon dont le Pseudo-Philo transforme ses héros en modèles de foi radicale en Dieu. Pourtant, l’ampleur de la réécriture de son histoire par LAB n’a pas reçu toute l’attention qu’elle mérite. La caractérisation d’Anne dans LAB est remarquable car elle est une femme opprimée dans un récit dominé par des personnages masculins. Sa situation, telle que décrite par le Pseudo-Philo, dépasse de loin la situation désastreuse du personnage biblique d’Anne dans les premiers chapitres de 1 Samuel. En effet, sa situation exige une plus grande foi en Dieu que toutes les autres figures masculines du récit, à l’exception peut-être d’Abraham dans l’épisode de la fournaise ardente (LAB 6). D’un point de vue sociologique dans l’Israël ancien, Anne se trouve à l’opposé des dirigeants masculins dans le LAB : elle est stérile, une seconde femme sans enfant, sans aucun rôle de leadership. Pourtant, les attentions multiples qu’elle reçoit de Dieu, sans jamais entendre une seule parole de sa part, lui donne une place d’honneur inattendue dans la liste des exemples de la vraie foi en Dieu en Israël. Bien que les exégètes aient remarqué l’importance d’Anne dans le récit, l’article offre un compte-rendu complet du modèle de foi qu’Anne incarne. Cet aspect est évident chez les autres dirigeants masculins dans le LAB, mais chez Anne, il est différent : non seulement Dieu ne lui parle jamais directement, mais elle n’a également jamais la possibilité d’entendre les paroles de Dieu rapportés par d’autres. Le récit du Pseudo-Philo est encadré par la parole divine indiquant la gravité théologique de la suppression de la parole divine pour Anne avant la naissance de Samuel. À travers Anne, le Pseudo-Philo livre un message poignant à un public juif en attente d’être délivré de l’oppression romaine : elle se tient aux côtés d’Abraham comme exemple éminent de foi radicale en Dieu qui semble être délibérément silencieux.",
				"archiveLocation": "Turnhout, Belgium",
				"language": "en",
				"libraryCatalog": "www.brepolsonline.net",
				"publicationTitle": "Judaïsme Ancien - Ancient Judaism",
				"shortTitle": "Faith in a Silent God",
				"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.JAAJ.5.119152",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "abs:The biblical character of Hannah in Liber Antiquitatum Biblicarum is a telling example of how Pseudo-Philo reworks his heroes into models of radical trust in God. And yet, the magnitude of LAB’s rewriting of her story has not received the attention it warrants. Hannah’s characterization in LAB is remarkable for the fact that she is an oppressed woman in a narrative dominated by prominent male figures. Her circumstances, as portrayed by Pseudo-Philo, far exceed the dire situation of the biblical Hannah in the opening chapters of 1 Samuel. Indeed, her situation demands greater trust in God than any of the male figures in the narrative, with the possible exception of Abraham at the fiery furnace (LAB 6). In terms of Israel’s social spectrum, Hannah lies at the complete opposite end of the male leaders in LAB; she is sterile, a childless second wife with no leadership role whatsoever. Yet the multifarious vindication she receives from God, without ever hearing a word from him, warrants her a place of unexpected honor on the list of Israel’s exemplars of true faith in God. Whilst previous interpreters have noticed Hannah’s importance to the narrative, my paper offers a comprehensive account of the pattern of faith that Hannah models. This pattern is evident in the other male leaders in LAB, but Hannah’s pattern is different in one significant aspect: God never speaks to her, nor does she hear his words secondhand. Pseudo-Philo’s narrative is framed by divine speech, indicating the theological gravity of the author’s removal of a divine word for Hannah prior to the birth of Samuel. Through Hannah, Pseudo-Philo delivers a poignant message to a Jewish audience awaiting deliverance from Roman oppression: she stands with Abraham as a preeminent example of radical faith in the God who at times seems deliberately silent."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
