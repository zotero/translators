{
	"translatorID": "a288df9e-ce56-40ca-a205-bc32182ced4c",
	"label": "tidsskrift.dk",
	"creator": "Madeesh Kannan and Timotheus Kim",
	"target": "^https*://tidsskrift.dk/[^/]+/(article|issue)/view.*/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-09 11:40:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	// placeholder, the OJS translator fills in the correct item type
	return "journalArticle";
}


function postProcess(doc, item) {
	if (!item.abstractNote) {
		// iterate through the different abstracts until we find one in English
		// if we don't find one for English, we'll just use the first one we processed
		var abstractParagraphs = ZU.xpath(doc, '//div[@class="item abstract"]//p');
		if (abstractParagraphs && abstractParagraphs.length > 0) {
			for (var paragraph in abstractParagraphs) {
				var extractedText = ZU.xpathText(abstractParagraphs[paragraph], ".").trim();
				if (paragraph == 0)
					item.abstractNote = extractedText;

				// check if it's in English
				var prologue = extractedText.match(/^(\w)*\s\w*:(.*)/i);
				if (prologue) {
					var language = prologue[1];
					if (language.match(/english/i)) {
						item.abstractNote = prologue[2].trim();
						break;
					}
				}
			}
		}

	if (item.abstractNote) {
		if (matchFirstAbstract) 
			item.abstractNote = matchFirstAbstract[2].trim();
		}
	}
	
	var matchFirstAbstract = item.abstractNote.match(/\s.*/);
	var matchSecondAbstract = item.abstractNote.match(/(DANSK RESUMÉ|DANSK RESUME).*/);
	if (matchSecondAbstract) {
		item.notes.push({
			note: "abs:" + matchSecondAbstract,
		});
	}
	
	// swap Band and Ausgabe
	var issue = item.issue;
	item.issue = item.volume;
	item.volume = issue;
	item.abstractNote = matchFirstAbstract;
	
	let sidebarVals = ZU.xpath(doc, '//div[@class="value"]');
    if (sidebarVals && sidebarVals.length) {
        for (let val in sidebarVals) {
            let node = sidebarVals[val];
            if (node.textContent.trim().match(/Anmeldelser/)) {
                item.tags.push('Book Review');
                break;
            }
        }
    }
    
	item.complete();
}

function doWeb(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388");   // Open Journal Systems
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://tidsskrift.dk/rvt/article/view/120479",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anmeldelse af Peter K. Westergaard, Nietzsche: Hvis man altid går til grunden: En afslutning",
				"creators": [
					{
						"firstName": "Lars",
						"lastName": "Albinus",
						"creatorType": "author"
					}
				],
				"date": "2020/05/22",
				"DOI": "10.7146/rt.v0i70.120479",
				"ISSN": "1904-8181",
				"abstractNote": "\n\t\t\t\t\tAnmeldelse af Peter K. Westergaard, Nietzsche: Hvis man altid går til grunden: En afslutning",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "1-3",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Ophavsret (c) 2020 Forfatter og Tidsskrift",
				"shortTitle": "Anmeldelse af Peter K. Westergaard, Nietzsche",
				"url": "https://tidsskrift.dk/rvt/article/view/120479",
				"volume": "70",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tidsskrift.dk/rvt/article/view/120512",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religion, fantasyfilm og fantastiske væsener:",
				"creators": [
					{
						"firstName": "Laura",
						"lastName": "Feldt",
						"creatorType": "author"
					}
				],
				"date": "2020/05/25",
				"DOI": "10.7146/rt.v0i70.120512",
				"ISSN": "1904-8181",
				"abstractNote": "\n\t\t\t\t\tENGLISH ABSTRACT: This article discusses the nexus of religion and media on the basis of an analysis of one example of religion in popular culture: the expansion of J.K. Rowling’s Harry Potter series in the book Fantastic Beasts and Where to Find Them (2001) and the subsequent film by the same title connected to the book (directed by David Yates, screenplay by J.K. Rowling 2016). I present a study of religion-based, media-focused approach to film analysis that distinguishes between verbal and non-verbal aspects of mediation. The analysis treats the mediation of religion – traditional religion, magic and monstrous beings – in the film, as well as the mediality of the film. The analysis shows that the film forms part of a broader trend that portrays traditional religion as ossified and authoritative, while magic, monsters and green religion are represented as fascinating and attractive. Moreover, I argue that the mediality of the film sustains a blurring of boundaries between worlds in terms of the film-internal world structure, in terms of the diegetic vs. the afilmic world, and in terms of the hu-man vs. the nonhuman world. The key argument of the article is that pop-cultural me-dia constitute an important arena for religion, as media such as fantasy films both re-flect and form religious transformations today. This arena needs more attention in the study of religion.",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "1-25",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Ophavsret (c) 2020 Forfatter og Tidsskrift",
				"shortTitle": "Religion, fantasyfilm og fantastiske væsener",
				"url": "https://tidsskrift.dk/rvt/article/view/120512",
				"volume": "70",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Fantastic Beasts"
					},
					{
						"tag": "Harry Potter"
					},
					{
						"tag": "Religion og populærkultur"
					},
					{
						"tag": "fantasyfilm"
					},
					{
						"tag": "grøn religion"
					},
					{
						"tag": "magi"
					},
					{
						"tag": "medier"
					},
					{
						"tag": "samtidsreligion"
					}
				],
				"notes": [
					{
						"note": "abs:DANSK RESUME: Denne artikel diskuterer religion og medier ud fra en analyse af et eksempel på religion i populærkultur, nemlig en videreudvikling relateret til J.K. Row-lings Harry Potter univers: udgivelsen af bogen Fantastic Beasts and Where to Find Them (2001), en bog der er fiktivt indlejret som undervisningsbog på Hogwarts School of Wizardry and Witchcraft, og den senere filmatisering der knytter sig til bo-gen, Fantastic Beasts and Where to Find Them (instrueret af David Yates, screenplay af J.K. Rowling 2016). Artiklen præsenterer en religionsvidenskabelig, mediefokuseret tilgang til filmanalyse, der inkluderer både verbale og non-verbale medierings-aspekter. Analysen behandler fremstillingen af religion – hhv. traditionel religion, magi og det monstrøse – i det filmiske univers, samt filmens medialitet. Analysen viser, at filmen indlejrer sig i en bredere trend, hvor traditionel religion fremstilles som forstenet og autoritær, mens magi, monstre og grøn religion fremstilles positivt og tiltrækkende, samt endvidere at filmens medialitet understøtter en udviskning af grænserne mellem verdener både i den tekst-interne verdensstruktur, mellem den diegetiske og den afilmi-ske verden, samt mellem den humane og den non-humane verden. Artiklen argumente-rer grundlæggende for at populærkulturelle medier såsom fantasyfilm udgør en vigtig arena for religion, og at denne arena bør behandles religionsvidenskabeligt, da den både afspejler og former religiøse forandringer i samtiden.,DANSK RESUME"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tidsskrift.dk/rvt/article/view/112739",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Igennem urenhed til himlen: Den tanato-kosmologiske transformation fra israelitisk religion til kristendom",
				"creators": [
					{
						"firstName": "Hans J. Lundager",
						"lastName": "Jensen",
						"creatorType": "author"
					}
				],
				"date": "2019/03/05",
				"ISSN": "1904-8181",
				"abstractNote": "\n\t\t\t\t\tENGLISH ABSTRACT: In the Hebrew Bible, there is no wish for a heavenly existence among human beings; God and his angels on the one hand and human beings on the other, normally maintain a safe distance from each other. Divine beings are potentially deadly for humans, and dead humans are the strongest source of impurity that threatens to encroach upon holy places. With the ‘ontological’ transformation in antique Judaism and early Christianity that opened up the possibility of an eternal life in heaven, followed a reversal of the value of death-impurity in a manner that resembles Indian Tantrism; no longer something to avoid, the way to heaven passed through dead bodies.",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "7-29",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Ophavsret (c) 2019 Forfatter og Tidsskrift",
				"shortTitle": "Igennem urenhed til himlen",
				"url": "https://tidsskrift.dk/rvt/article/view/112739",
				"volume": "69",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Heaven and Hell"
					},
					{
						"tag": "Sheol"
					},
					{
						"tag": "archaic, axial and post-axial religions"
					},
					{
						"tag": "impurity"
					},
					{
						"tag": "saints"
					},
					{
						"tag": "tantrism"
					},
					{
						"tag": "thanatology"
					}
				],
				"notes": [
					{
						"note": "abs:DANSK RESUMÉ: I Det Gamle Testamente er der ingen forventning eller ønske om et liv i himlen efter døden. Gud og guddommelige væsener på den ene side og mennesker på den anden bevarer normalt en rimelig afstand til hinanden. Guddommelige væsener er potentielt dræbende, og døde mennesker er den stærkeste form for urenhed der truer med at invadere hellige steder. Med den ‘ontologiske’ transformation der fandt sted i antik Jødedom og som åbnede for muligheden for et liv i himlen efter døden, fulgte en omvending af synet på døde menneskers kroppe, der på nogle punkter minder om den indiske tantrisme. Døde kroppe skulle ikke længere undgås, men opsøges på vejen til himlen.,DANSK RESUMÉ"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
