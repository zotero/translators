{
	"translatorID": "a288df9e-ce56-40ca-a205-bc32182ced4c",
	"label": "ubtue_Tidsskrift",
	"creator": "Madeesh Kannan and Timotheus Kim",
	"target": "^https?://tidsskrift.dk/[^/]+/(article|issue)/view.*/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-07 11:59:45"
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
				if (paragraph === 0) item.abstractNote = extractedText;
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
	
	var matchFirstAbstract = item.abstractNote.match(/\s+.*/);//Z.debug(matchFirstAbstract)
	let matchSecondAbstract = item.abstractNote.match(/(DANSK RESUMÉ|DANSK RESUME).*/);
	if (matchSecondAbstract) {
		item.notes.push({
			note: "abs:" + matchSecondAbstract,
		});
	}
	if (item.notes.length > 0) {
		item.notes = item.notes[0].note.replace(/(DANSK RESUMÉ: |DANSK RESUME: |,DANSK RESUMÉ|,DANSK RESUME)/g, '');
	}
	item.abstractNote = matchFirstAbstract[0].replace(/ENGLISH ABSTRACT:/, '');
	
	// swap Band and Ausgabe
	let issue = item.issue;
	item.issue = item.volume;
	item.volume = issue;
	
	let sidebarVals = ZU.xpath(doc, '//div[@class="value"]');
	if (sidebarVals && sidebarVals.length) {
		for (let val in sidebarVals) {
			let node = sidebarVals[val]; //Z.debug(node.textContent);
			if (node.textContent.trim().match(/Anmeldelser|Review-artikel/)) {
				item.tags.push('Book Review');
				break;
			}
		}
	}
	item.complete();
}

function doWeb(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388");// Open Journal Systems
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
	},
	{
		"type": "web",
		"url": "https://tidsskrift.dk/rvt/article/view/120416",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fornuftens fyrtårn. Om Jürgen Habermas: Auch eine Geschichte der Philosophie,",
				"creators": [
					{
						"firstName": "Lars",
						"lastName": "Albinus",
						"creatorType": "author"
					}
				],
				"date": "2020/05/19",
				"DOI": "10.7146/rt.v0i70.120416",
				"ISSN": "1904-8181",
				"abstractNote": "\n\t\t\t\t\tAnmeldelse og diskussion af Jürgen Habermas, Auch eine Geschichte der Philosophie, Band 1: Die okzidentale Konstellation von Glauben und Wissen, Band 2: Vernünftige Freiheit. Spuren des Diskurses über Glauben und Wissen, Suhrkamp 2019",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "1-15",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Ophavsret (c) 2020 Forfatter og Tidsskrift",
				"shortTitle": "Fornuftens fyrtårn. Om Jürgen Habermas",
				"url": "https://tidsskrift.dk/rvt/article/view/120416",
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
		"url": "https://tidsskrift.dk/rvt/article/view/120397",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religion og medier i et religionsvidenskabeligt perspektiv",
				"creators": [
					{
						"firstName": "Armin W.",
						"lastName": "Geertz",
						"creatorType": "author"
					},
					{
						"firstName": "Laura",
						"lastName": "Feldt",
						"creatorType": "author"
					}
				],
				"date": "2020/05/18",
				"ISSN": "1904-8181",
				"abstractNote": "The religion and media field has grown strongly as an academic subject in recent years, especially regarding studies of religion in contemporary mass media, TV, film, internet, social media etc., and in relation to popular culture. Scholars of religion have also begun to pay attention to the important role that media, mediation, and mediatization have played in the history of religions. It is this growing awareness that we wish to examine here. Our focus is not intended to signal the abandonment of interest in contemporary religion, media and popular culture; rather we wish to place this development in the deep and broad perspective of the study of religion. Media, mediation, and the more recent phenomenon of mediatization, are processes that are inseparable from the ways in which religion functions and is passed on from generation to generation. Thus, from a general study of religion perspective, we promote the argument that media and mediation processes are central aspects of how all religions function because all communication, including religious communication, can be seen as mediated. In this article, we reflect on and discuss the roles that media have played in the deep history of religions and continue to play in the present by bringing religion and media studies in conversation with cultural evolution and cognitive perspectives.",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "1-32",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Ophavsret (c)",
				"url": "https://tidsskrift.dk/rvt/article/view/120397",
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
						"tag": "cognition"
					},
					{
						"tag": "evolution."
					},
					{
						"tag": "history"
					},
					{
						"tag": "media"
					},
					{
						"tag": "mediation"
					},
					{
						"tag": "religion"
					}
				],
				"notes": [
					"abs:Religion og medier er blomstret stærkt op som emnefelt i de seneste år, særligt med fokus på religion i samtidens massemedier, tv, film, internet, sociale medier m.m. og i relation til populærkultur. Samtidigt er religionsforskere blevet opmærksomme på at medier og mediering har spillet vigtige roller for religionshistorien og det er dén udvikling vi her vil gribe fat i. Dermed ønsker vi ikke på nogen måde at signalere en opgiven af interessen for religion, medier og populærkultur i samtiden, men snarere at vi ønsker at indsætte denne udvikling i et langt og bredt religionsvidenskabeligt perspektiv. Medier og mediering er uadskilleligt fra hvordan religion fungerer og videreføres fra generation til generation. Derfor anlægger vi det overordnede perspektiv her, at medier og mediering udgør centrale aspekter af hvordan alle religioner fungerer, da al kommunikation, inklusiv religiøs kommunikation, kan anskues som medieret. I denne artikel reflekterer vi over og diskuterer den rolle medier, mediering og medialisering har spillet i religionshistorien og i samtiden bl.a. med inddragelse af kulturevolutionære og kognitive perspektiver.,DANSK RESUMÉ"
				],
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
				"abstractNote": "This article discusses the nexus of religion and media on the basis of an analysis of one example of religion in popular culture: the expansion of J.K. Rowling’s Harry Potter series in the book Fantastic Beasts and Where to Find Them (2001) and the subsequent film by the same title connected to the book (directed by David Yates, screenplay by J.K. Rowling 2016). I present a study of religion-based, media-focused approach to film analysis that distinguishes between verbal and non-verbal aspects of mediation. The analysis treats the mediation of religion – traditional religion, magic and monstrous beings – in the film, as well as the mediality of the film. The analysis shows that the film forms part of a broader trend that portrays traditional religion as ossified and authoritative, while magic, monsters and green religion are represented as fascinating and attractive. Moreover, I argue that the mediality of the film sustains a blurring of boundaries between worlds in terms of the film-internal world structure, in terms of the diegetic vs. the afilmic world, and in terms of the hu-man vs. the nonhuman world. The key argument of the article is that pop-cultural me-dia constitute an important arena for religion, as media such as fantasy films both re-flect and form religious transformations today. This arena needs more attention in the study of religion.",
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
					"abs:Denne artikel diskuterer religion og medier ud fra en analyse af et eksempel på religion i populærkultur, nemlig en videreudvikling relateret til J.K. Row-lings Harry Potter univers: udgivelsen af bogen Fantastic Beasts and Where to Find Them (2001), en bog der er fiktivt indlejret som undervisningsbog på Hogwarts School of Wizardry and Witchcraft, og den senere filmatisering der knytter sig til bo-gen, Fantastic Beasts and Where to Find Them (instrueret af David Yates, screenplay af J.K. Rowling 2016). Artiklen præsenterer en religionsvidenskabelig, mediefokuseret tilgang til filmanalyse, der inkluderer både verbale og non-verbale medierings-aspekter. Analysen behandler fremstillingen af religion – hhv. traditionel religion, magi og det monstrøse – i det filmiske univers, samt filmens medialitet. Analysen viser, at filmen indlejrer sig i en bredere trend, hvor traditionel religion fremstilles som forstenet og autoritær, mens magi, monstre og grøn religion fremstilles positivt og tiltrækkende, samt endvidere at filmens medialitet understøtter en udviskning af grænserne mellem verdener både i den tekst-interne verdensstruktur, mellem den diegetiske og den afilmi-ske verden, samt mellem den humane og den non-humane verden. Artiklen argumente-rer grundlæggende for at populærkulturelle medier såsom fantasyfilm udgør en vigtig arena for religion, og at denne arena bør behandles religionsvidenskabeligt, da den både afspejler og former religiøse forandringer i samtiden.,DANSK RESUME"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tidsskrift.dk/rvt/article/view/112747",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Kāmākhya, den menstruerende gudinde: Tantrisme for lægfolk og elite",
				"creators": [
					{
						"firstName": "Marianne Qvortrup",
						"lastName": "Fibiger",
						"creatorType": "author"
					}
				],
				"date": "2019/03/05",
				"DOI": "10.7146/rt.v0i69.112747",
				"ISSN": "1904-8181",
				"abstractNote": "Based on an analysis of the cult around the tantric goddess Kāmākhya from Assam, I will discuss her appeal for both laypeople and ascetics. A special feature is that she menstruates and that her blood is held to have thaumaturgical as well as transformative properties. For laypeople the hope is that it will have a positive effect on their lives here and now, and for the ascetics that it will give rise to an internal process with a soteriological goal in mind. Consequently, I shall present a differentiation between a hardcore and a softcore tantrism and, furthermore, their interrelationship.",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "135-147",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Ophavsret (c) 2019 Forfatter og Tidsskrift",
				"shortTitle": "Kāmākhya, den menstruerende gudinde",
				"url": "https://tidsskrift.dk/rvt/article/view/112747",
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
						"tag": "Kāmākhya tantrism"
					},
					{
						"tag": "thamaturgical and tranformative properties"
					},
					{
						"tag": "śaktism"
					}
				],
				"notes": [
					"abs:Med udgangspunkt i en analyse af kulten omkring den tantriske gudinde Kāmakhya fra Assam diskuteres hendes brede appeal for både lægfolk og asketer. Det specielle ved gudinden er, at hun menstruerer, og at blodet tillægges både thaumaturgiske og transformative egenskaber. For lægfolk er håbet, at det kan have positiv effekt for deres liv nu og her, for asketer at det vil sætte gang i en individuel proces med et soteriologisk mål for øje. I den forbindelse vil en skelnen imellem en hard core- og en soft core-tantrisme og deres interrelation blive præsenteret."
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
