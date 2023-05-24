{
	"translatorID": "ade18ffe-62a6-4392-9853-eb658faf36e4",
	"label": "ubtue_Brepols",
	"creator": "Timotheus Kim",
	"target": "https?://www\\.brepolsonline\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-05-24 06:57:27"
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
	else if (url.includes('toc') && getSearchResults(doc, true)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.ref.nowrap');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].text.replace(/pdf|abstract|references|first\s?page|\(\d+\s?kb\)/gi, ''));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	}
	else {
		invokeEMTranslator(doc, url);
	}
}

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (t, i) {
		let abstractsEntry = doc.querySelectorAll('.abstractSection, abstractInFull');
		let abstractNr = 0;
		for (abstract of abstractsEntry) {
			if (abstractNr == 0) i.abstractNote = abstract.innerText;
			else i.notes.push('abs:' + abstract.innerText);
			abstractNr += 1;
		}
		if (i.reportType === "book-review") i.tags.push('Book review') && delete i.abstractNote;	
		let pagesEntry = text(doc, '.publicationContentPages');
		if (pagesEntry.match(/\s\d+\w?-\d+/) != null) i.pages = pagesEntry.match(/\s\d+\w?-\d+/)[0];
		let volumes = text(doc, '.breadcrumbs');
		if (volumes) i.volume = volumes.match(/Volume\s?\d+/)[0].replace('Volume', '');
		let issue = text(doc, '.breadcrumbs');
		let issueError = issue.toString();
		i.archive = i.issue;
		if (issueError) i.issue = issueError.split('>')[3].split('Issue')[1];
		let year = attr(doc, 'ul.breadcrumbs li:nth-child(4) a', 'href');
		if (year && year.match(/\w+\/\d+/)) i.date = year.split('/')[3];
		let issn = text(doc, '.serialDetailsEissn');
		if (issn) i.ISSN = issn.replace('Online ISSN:', '');
		let openAccessTag = doc.querySelector('.accessIconLocation[src]');
		if (openAccessTag && openAccessTag.src.match(/open\s?access/gi)) i.notes.push({note: 'LF:'});
		// mark articles as "LF" (MARC=856 |z|kostenfrei), that are free accessible e.g. conference report 10.30965/25890433-04902001 
		let freeAccess = text(doc, '.color-access-free');
		if (freeAccess && freeAccess.match(/(free|freier)\s+(access|zugang)/gi)) i.notes.push('LF:');
		i.itemType = "journalArticle";
		i.complete();
	});
	translator.translate();
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.REA.5.122730",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zu Ambrosius, Explanatio in psalm. 61: Titel, Anfangsworte, ‚Veröffentlichung‘ und Corpus-Bildung",
				"creators": [
					{
						"firstName": "Victoria",
						"lastName": "Zimmerl-Panagl",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1484/J.REA.5.122730",
				"ISSN": "2428-3606",
				"abstractNote": "Ambrosius, in psalm. 61 gilt als zwölfter und letzter Text seiner Explanatio in psalmos XII. Ihr gewissermaßen zweigeteilter Inhalt – einerseits christologische Psalmenexegese, andererseits Bezugnahmen auf politische Ereignisse – hat in der Überlieferung allerdings auch zu anderen Werkzusammenstellungen geführt. Der vorliegende Beitrag untersucht Probleme und Fragen, die sich im Rahmen der Editionsarbeit dieses Textes stellen. Es ist unklar, ob Ambrosius dem Werk einen Titel gab und ob der Text von Ambrosius selbst ‚veröffentlicht‘ wurde. Der Beitrag untersucht unterschiedliche Werkzusammenstellungen und geht der Frage nach, ob der Mailänder Kanoniker Martinus Corbo Urheber der Verbindung der Explanatio in psalmos XII war und ob ein Codex, den Corbo aus Verona erhielt (Milano, Bibl. Ambr. I 145 inf., s. xii), tatsächlich Vorlage für Corbos Text war.",
				"archiveLocation": "Paris, France",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "17-52",
				"publicationTitle": "Revue d'Etudes Augustiniennes et Patristiques",
				"shortTitle": "Zu Ambrosius, Explanatio in psalm. 61",
				"url": "https://www.brepolsonline.net/doi/10.1484/J.REA.5.122730",
				"volume": "66",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"abs:Ambrosius’ in psalm. 61 is known as twelfth and last part of his Explanatio in psalmos XII. The twofold content – on the one hand, Christological exegesis, on the other hand, political implications – led, however, also to combinations with other works. This contribution focuses on problems and questions that arise when preparing a new critical edition of the text. It is unclear whether Ambrose gave the work a title and whether the text was ‘published’ by Ambrose himself. The article examines how in psalm. 61 was transmitted and asks if it was Martinus Corbo who was the first to add in psalm. 61 to the Explanatio in psalmos XII and whether a manuscript that Corbo received from Verona (Milano, Bibl. Ambr. I 145 inf., s. xii) could indeed have been the exemplar of Corbo’s text.",
					"abs:L’In psalm. 61 d’Ambroise est connu comme la douzième et dernière partie de son Explanatio in psalmos XII. Son contenu en deux parties – d’une part, l’exégèse christologique des psaumes, d’autre part, les références aux événements politiques – a également suscité, dans la transmission, des combinaisons avec d’autres œuvres. Cet article examine les problèmes et les questions qui se posent lors de la préparation d’une nouvelle édition critique. Il n’est pas certain que ce soit Ambroise qui ait donné un titre à l’œuvre, ni même qu’il ait « publié » luimême le texte. L’article examine comment In psalm. 61 a été transmis et étudie l’hypothèse selon laquelle ce serait en fait Martinus Corbo qui aurait le premier ajouté In psalm. 61 à l’Explanatio in psalmos XII. En outre, est posée la question de savoir si un manuscrit de Vérone (Milano, Bibl. Ambr. I 145 inf., s. xii) était réellement le modèle de Corbo."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.SE.5.119445",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Alles habt ihr mit Grabmälern angefüllt …” Kaiser Julian und die Transformation spätantiker Funeralkultur",
				"creators": [
					{
						"firstName": "Thomas R.",
						"lastName": "Karmann",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1484/J.SE.5.119445",
				"ISSN": "2295-9025",
				"abstractNote": "Mediterranean funeral culture underwent a fundamental metamorphosis in late antiquity. Despite a few scholarly objections it appears that this transformation can be explained by the gradual rise of Christianity. This article provides a sort of test of this theory by asking whether the attempt to restore pagan culture under Emperor Julian (361-363) had any effect on practices concerning death and burial. Of utmost interest are, on the one hand, Julian’s objections to the Christian martyr cults which led among other things to the removal of the Babylas relics from the Temple of Apollo in Daphne, and, on the other hand, his Burial Law with a particular interest in the often-overlooked Letter 136b. Also to be considered are the burial of Constantius II, the death of Julian himself, and various associated eschatological conceptions. One notices a culture-defining difference in the way in which late antique pagans such as Julian, Libanius, and Eunapius of Sardes assume a strict division between life and death, cult and burial, purity and impurity. With late antique Christianity this could slowly be overturned through faith in the resurrection.",
				"archiveLocation": "Turnhout, Belgium",
				"language": "de",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "7-66",
				"publicationTitle": "Sacris Erudiri",
				"url": "https://www.brepolsonline.net/doi/10.1484/J.SE.5.119445",
				"volume": "58",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"abs:Die Sepulkralkultur der Mittelmeerwelt erlebte in der Spätantike eine grundlegende Metamorphose. Auch wenn es hierzu in der Forschung gewichtige Gegenstimmen gibt, so ist dieser Wandel doch mit dem sukzessiven Aufstieg des Christentums zu erklären. Der Beitrag führt hierzu eine Art Gegenprobe durch und setzt sich deshalb mit der Frage auseinander, ob der pagane Restaurationsversuch unter Kaiser Julian (361-363) Auswirkungen auf die Bereiche von Tod und Bestattung hatte. Im Mittelpunkt des Interesses stehen dabei zum einen Julians massive Vorbehalte gegen den christlichen Märtyrerkult, die u.a. in der Entfernung der Babylas-Reliquien aus dem Apoll-Heiligtum von Daphne sichtbar wurden. Zum anderen wird Julians Bestattungsgesetz in den Blick genommen, der Aufsatz kommentiert dazu ausführlich die bislang weitgehend vernachlässigte Epistola 136b. Daneben werden die Bestattung Konstantius’ II., Julians eigener Tod sowie dabei aufscheinende eschatologische Vorstellungen untersucht. Als kulturell prägende Grunddifferenz zeigt sich, dass spätantike Heiden wie Julian, aber auch Libanios oder Eunapios von Sardes von einer strikten Trennung zwischen Leben und Tod, Kult und Bestattung bzw. Reinheit und Befleckung ausgingen. Im spätantiken Christentum konnte diese hingegen nach und nach überwunden werden, der Grund dafür liegt vor allem im Osterglauben."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.SE.5.119450",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "New Identifications Among the Sixth-Century Fragments of Augustine in Cambridge University Library",
				"creators": [
					{
						"firstName": "H. A. G.",
						"lastName": "Houghton",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1484/J.SE.5.119450",
				"ISSN": "2295-9025",
				"abstractNote": "This article offers a re-examination of the palimpsest fragments from a sixth-century codex of Augustine which were found in the Cairo Genizah and are now held in Cambridge University Library. The three largest fragments, with the shelfmark MS Add. 4320a-c, have already been identified as containing the end of De sermone domini and the beginning of Sermo 118. More recently, a smaller fragment of this manuscript was discovered in the Taylor-Schechter collection, also with text from De sermone domini (T-S AS 139.1). A full transcription of this fragment is published here for the first time. In addition, this article identifies the undertext on the two remaining substantial fragments of this manuscript (MS Add. 4320d). These contain part of Sermo 225 auct. and Contra sermonem Arrianorum, which means that they provide the oldest surviving witness to these works by several centuries. In addition to the editio princeps and images of these fragments, the article offers a small correction to Mutzenbecher’s edition of De sermone domini and briefly considers the nature of the original codex as a compilation of multiple writings by Augustine.",
				"archiveLocation": "Turnhout, Belgium",
				"language": "en",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "171-180",
				"publicationTitle": "Sacris Erudiri",
				"url": "https://www.brepolsonline.net/doi/10.1484/J.SE.5.119450",
				"volume": "58",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.REA.4.2019002",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Une appropriation habile de Numénius : Eusèbe de Césarée et son emploi critique de l'adjectif ὁμοούσιος en PE XI 21-22",
				"creators": [
					{
						"firstName": "Fabienne",
						"lastName": "Jourdan",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.1484/J.REA.4.2019002",
				"ISSN": "2428-3606",
				"abstractNote": "En PE XI 21, Eusèbe produit une série de citations de Platon visant à convaincre de l'accord du philosophe avec Moïse sur la définition du Bien identifié à Dieu. Ces citations donnent lieu à une paraphrase affirmant l'accord de Platon et des Hébreux sur le monothéisme, tout en dénonçant le polythéisme philosophique. Or, dans cette critique, Eusèbe a un emploi fort problématique du terme ὁμοούσιος (PE XI 21 6). Le rejet de la notion qu'il véhicule à propos du Bien (identifié à Dieu) et de ce qui provient de lui crée une double difficulté : la compréhension de ce refus lui-même, alors qu'Eusèbe acceptera le terme ὁμοούσιος après Nicée pour évoquer la relation entre le Père et le Fils ; la remise en cause apparente de la divinité du Fils provoquée notamment par ce rejet lorsque le discours d'Eusèbe est envisagé d'un point de vue théologique. Dans sa paraphrase de Platon, Eusèbe s'approprie par avance le propos des quatre fragments de Numénius qu'il cite au chapitre suivant (PE XI 22). Ce premier article montre ce que sa paraphrase doit à ces fragments et comment la double difficulté théologique trouve une première solution grâce à un rappel du sens pris par l'adjectif ὁμοούσιος à l'époque d'Eusèbe et chez Eusèbe lui-même.",
				"archiveLocation": "Paris",
				"issue": "2",
				"language": "fr",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "215-242",
				"publicationTitle": "Revue d'Etudes Augustiniennes et Patristiques",
				"shortTitle": "Une appropriation habile de Numénius",
				"url": "https://www.brepolsonline.net/doi/10.1484/J.REA.4.2019002",
				"volume": "64",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"abs:In PE XI 21 Eusebius quotes a series of Plato's texts in order to prove the philosopher's agreement with Moses on the definition of the Good identified with God. These quotations are paraphrased to assert the agreement of Plato and Hebrews on monotheism, while condemning philosophical polytheism. Now, in this criticism, Eusebius has a very problematic use of the term ὁμοούσιος (PE XI 21, 6). The rejection of the notion it conveys about the Good (identified to God) and what comes from it creates a double difficulty: the understanding of this rejection itself, although Eusebius will accept the word ὁμοούσιος after the Council of Nicaea to refer to the relation between the Father and the Son ; and the apparent calling into question of the divinity of the Son produced notably by this rejection, when Eusebius' discourse is considered from a theological point of view. In his paraphrase of Plato Eusebius appropriates in advance the contents of Numenius' four fragments that he quotes in the following chapter (PE XI 22). This first paper shows what his paraphrase owes to these fragments and how the dual theological difficulty finds a first solution by reminding the meaning of the adjective ὁμοούσιος in Eusebius' time and how he used it in his writings."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.brepolsonline.net/doi/abs/10.1484/J.REA.4.2019004",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Iacobus episcopus\", Ambrosius von Mailand und die Bibliothek von Lorsch",
				"creators": [
					{
						"firstName": "Lukas J.",
						"lastName": "Dorfbauer",
						"creatorType": "author"
					},
					{
						"firstName": "Victoria",
						"lastName": "Zimmerl-Panagl",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.1484/J.REA.4.2019004",
				"ISSN": "2428-3606",
				"abstractNote": "Der vorliegende Aufsatz klärt in seinem ersten Teil ein altes Missverständnis auf: Aus Einträgen in den karolingischen Bibliothekskatalogen von Lorsch hat man zu Unrecht auf verlorene Werke eines unbekannten Autors \"Iacobus episcopus\" geschlossen. Tatsächlich bezeugen jene Einträge eine Sammlung von Werken des Ambrosius von Mailand, wie sie ähnlich sonst nur aus einem einzigen, späteren Codex bekannt ist (Karlsruhe, BLB Aug. perg. 130, s. x1). Das für Lorsch bezeugte Ambrosius-Corpus ist für die Überlieferungsund Editionsgeschichte der enthaltenen Texte, besonders der Satyrus-Reden, von Interesse. Entsprechende Fragen werden im zweiten Teil des Aufsatzes diskutiert.",
				"archiveLocation": "Paris",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "www.brepolsonline.net",
				"pages": "287-308",
				"publicationTitle": "Revue d'Etudes Augustiniennes et Patristiques",
				"url": "https://www.brepolsonline.net/doi/10.1484/J.REA.4.2019004",
				"volume": "64",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					"abs:La première partie de l'article éclaire une vieille erreur : à partir des entrées dans les catalogues carolingiens de la bibliothèque de Lorsch on a déduit, à tort, qu'étaient perdues les œuvres d'un auteur inconnu, « Iacobus episcopus ». En fait, ces entrées témoignent de la présence d'une collection des œuvres d'Ambroise de Milan, collection qui est autrement connue, dans une forme comparable, par un seul codex plus tardif (Karlsruhe, BLB Aug. perg. 130, s. x1). Le corpus ambrosien attesté à Lorsch est intéressant en ce qui concerne la transmission et l'édition des textes en cause, notamment les oraisons funèbres pour Satyrus. Ces sujets sont discutés dans la deuxième partie de l'article.",
					"abs:The first part of the present article clears up an old mistake: lost works of an unknown author \"Iacobus episcopus\" have been wrongly deduced from entries in some Carolingian library catalogues from Lorsch. Actually, these entries testify to a certain collection of works by Ambrose of Milan which, in a comparable form, is otherwise known from only one later codex (Karlsruhe, BLB Aug. perg. 130, s. x1). The Ambrosian corpus attested for Lorsch is of interest for the transmission and edition of the relevant texts, especially the speeches on the death of Satyrus. These matters are discussed in the second part of the present article."
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
