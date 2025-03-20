{
	"translatorID": "88cc789a-bd88-4d40-8caf-4a81138e72c6",
	"label": "ubtue_Edinburgh University Press Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.euppublishing\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-20 16:46:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Edinburg University Press Journals Translator
	(Closely based on the ESA journals translator)
	Copyright © 2013 Sebastian Karcher

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
	if (url.match(/\/doi\/10\.|\/doi\/abs\/10\.|\/doi\/full\/10\./)) return "journalArticle";
	else if (url.match(/\/action\/doSearch|\/toc\//) && getSearchResults(doc).length) return "multiple";
}

function getSearchResults(doc) {
	return ZU.xpath(doc,
		'//div[@class="articleInfo"]/p[@class="title"]/a[contains(@href, "/doi/abs/")][1]|\
		//div[contains(@class, "art_title")]/a[contains(@href, "/doi/abs/")][1]');
}

function doWeb(doc, url) {
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var rows = getSearchResults(doc);
		for (var i=0, n=rows.length; i<n; i++) {
			items[rows[i].href] = rows[i].textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			urls = new Array();
			for (var itemurl in items) {
				//some search results have some "baggage" at the end - remove
				urls.push(itemurl.replace(/\?prev.+/, ""));
			}
			ZU.processDocuments(urls, scrape)
		});

	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	url = url.replace(/[?#].+/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var exportUrl = '/action/downloadCitation';
	var post = 'downloadFileName=export.ris&format=ris&direct=true&include=cit&doi=' + doi;
	Zotero.Utilities.HTTP.doPost(exportUrl, post, function (text) {
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.url = url;
			item.notes = [];

			var tagentry = ZU.xpathText(doc, '//meta[@name="keywords"]/@content');

			if (tagentry){
				var tags = tagentry.split(/\s*,\s*/);
				for (var i in tags) {
					item.tags.push(tags[i].replace(/^\w/gi,function(m){return m.toUpperCase();}));
				}
			}
			item.abstractNote = ZU.xpathText(doc, '//meta[@name="dc.Description"]/@content');
			let abstractFromDOM = ZU.xpathText(doc, '//div[contains(@class, "abstractInFull")]//p[not(@class="summary-title")]');
			if (abstractFromDOM && item.abstractNote.length < abstractFromDOM.length)
				item.abstractNote = abstractFromDOM.replace(/^Abstract/,'').replace(/\w\.,\s/, '.\\n4207 ');

			item.attachments = [];
			
			let docType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content | //*[contains(concat( " ", @class, " " ), concat( " ", "abs", " " ))]');
			if (docType === "book-review" || docType === "review-article" || docType === "First Page")
				item.tags.push("RezensionstagPica");
			
			if (ZU.xpathText(doc, '//img[contains(@title, "Free Access") or contains(@title, "Open Access")]') !== null) {
				item.notes.push({'note': 'LF'});
			}
			for (let creatorTag of ZU.xpath(doc, '//span[@class="contribDegrees"]')) {
				if (ZU.xpathText(creatorTag, './a[contains(@href, "orcid")]/@href')) {
						item.notes.push("orcid:" + ZU.xpathText(creatorTag, './a[contains(@href, "orcid")]/@href').replace(/https?:\/\/orcid.org\//, "") + ' | ' + ZU.xpathText(creatorTag, './a[@class="entryAuthor"]'));
					}
			}

			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0019",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Church for Scotland? The Free Church and Scottish Nationalism after the Disruption",
				"creators": [
					{
						"lastName": "Mallon",
						"firstName": "Ryan",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2020",
				"DOI": "10.3366/sch.2020.0019",
				"ISSN": "2516-6298",
				"abstractNote": "The 1843 Disruption of the Church of Scotland, which split the national church in two, was one of the most important events in Victorian Britain. The evangelical ministers who seceded from the Kirk to form the Free Church of Scotland did so in protest against the British state's intrusion in the church's affairs. The anti-English and patriotic rhetoric of the Disruption has led historians such as David Bebbington to argue that it represented something close to a nationalist movement. This paper questions this claim by assessing the nationalist characteristics of the Disruption and their role in shaping the political ‘unionist-nationalism’ of the mid-nineteenth century. It examines the kind of nationalist sentiment, if any, evident at the Disruption, the role of Free Church members in the National Association for the Vindication of Scottish Rights, the short-lived proto-nationalist pressure group, and the nationalism of the Free Church minister James Begg, who called for Home Rule for Scotland in 1850. By assessing the influence of the Disruption's constructionist critique of the union on political nationalism, the paper argues that the religious nationalism evident in 1843 failed to translate to a political context in the mid-nineteenth century. The new religiously pluralist environment of the post-Disruption period saw the Free Church turn inwards and begin to focus upon its own denominational fortunes as a single Scottish national identity was replaced by a variety of competing confessional identities, each with their own claim to nationhood.",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "1-24",
				"publicationTitle": "Scottish Church History",
				"shortTitle": "A Church for Scotland?",
				"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0019",
				"volume": "49",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Disruption"
					},
					{
						"tag": "Free Church of Scotland"
					},
					{
						"tag": "James Begg"
					},
					{
						"tag": "National Association for the Vindication of Scottish Rights"
					},
					{
						"tag": "Nationalism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0020",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Rhetoric of Empire in the Scottish Mission in North America, 1732–63",
				"creators": [
					{
						"lastName": "Kelly",
						"firstName": "Jamie J.",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2020",
				"DOI": "10.3366/sch.2020.0020",
				"ISSN": "2516-6298",
				"abstractNote": "In 1755, William Robertson delivered a sermon before the Society in Scotland for Propagating Christian Knowledge, entitled The Situation of the World at the Time of Christ's Appearance…. He addresses British imperial expansion and its prospects for civil and moral improvement, while denouncing the moral decay manifest in the growth of slavery and exploitation of natives. Through advocating a considered balance between submission to revealed religious principles and the exercise of reason, Robertson stresses the necessity of both for promoting virtue and preventing vice. The SSPCK, an organisation dedicated to spreading ‘reformed Christianity’ as a catalyst of cultural progress (and thus the growth of virtue) among rural Scots and Natives in North America, was responding to a perceived lack of government commitment to this very task. Empire provided the framework for mission, yet the government's secular agenda often outweighed religious commitments. This article makes use of SSPCK sermons from the eighteenth century to trace the attitudes of Scottish churchmen and missionaries towards the institutions and motives driving empire, in a period when they too were among its most prominent agents. This will shed light on the Scottish church's developing views on empire, evangelism, race, improvability and the role of government.",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "25-37",
				"publicationTitle": "Scottish Church History",
				"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0020",
				"volume": "49",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Church of Scotland"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "Eighteenth Century"
					},
					{
						"tag": "Empire"
					},
					{
						"tag": "Missionaries"
					},
					{
						"tag": "Sermons"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0021",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Industrial Gospel of Robert Laws and the Livingstonia Expedition",
				"creators": [
					{
						"lastName": "Jeffrey",
						"firstName": "Kenneth S.",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2020",
				"DOI": "10.3366/sch.2020.0021",
				"ISSN": "2516-6298",
				"abstractNote": "It has been widely assumed that academic education lay at the heart of nineteenth century Scottish missions in Africa. This article will argue that a particular form of education that included artisan skills-based, commercial and industrial training was the basis of the Livingstonia expedition led by Robert Laws in Nyasaland from 1875. Inspired by Dr James Stewart of Lovedale, financed by Free Church businessmen from Glasgow and led by teams of tradesmen, the aim of this mission was to establish small settlements that would create a network of trading centres from which commerce, civilisation and Christianity would spread across Africa. The ambitions and character of these first missionaries, not least Laws, exercised a fundamental influence upon the nature and purpose of this enterprise. Livingstonia was the most industrial mission of the modern era in Africa. A practical skills-based education was central to the gospel according to Robert Laws.",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "38-50",
				"publicationTitle": "Scottish Church History",
				"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0021",
				"volume": "49",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Christianity"
					},
					{
						"tag": "Commerce"
					},
					{
						"tag": "Gospel"
					},
					{
						"tag": "Industry"
					},
					{
						"tag": "Livingstonia"
					},
					{
						"tag": "Mission"
					},
					{
						"tag": "Robert Laws"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0022",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Elizabeth Ewan, Rose Pipes, Jane Rendall and Siân Reynolds (eds), The New Biographical Dictionary of Scottish Women",
				"creators": [
					{
						"lastName": "Thor",
						"firstName": "Jowita A.",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2020",
				"DOI": "10.3366/sch.2020.0022",
				"ISSN": "2516-6298",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "51-53",
				"publicationTitle": "Scottish Church History",
				"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0022",
				"volume": "49",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0023",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Alexander D. Campbell, The Life and Works of Robert Baillie (1602–1662): Politics, Religion and Record-Keeping in the British Civil Wars",
				"creators": [
					{
						"lastName": "Schultz",
						"firstName": "Karie",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2020",
				"DOI": "10.3366/sch.2020.0023",
				"ISSN": "2516-6298",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "53-55",
				"publicationTitle": "Scottish Church History",
				"shortTitle": "Alexander D. Campbell, The Life and Works of Robert Baillie (1602–1662)",
				"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0023",
				"volume": "49",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0024",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Alasdair Raffe, Scotland in Revolution, 1685–1690",
				"creators": [
					{
						"lastName": "Langley",
						"firstName": "Christopher R.",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2020",
				"DOI": "10.3366/sch.2020.0024",
				"ISSN": "2516-6298",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "55-57",
				"publicationTitle": "Scottish Church History",
				"url": "https://www.euppublishing.com/doi/full/10.3366/sch.2020.0024",
				"volume": "49",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/more.2021.0092",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An Exemplary Defense: Livy's Illustrative Exemplum in Thomas More's Apology",
				"creators": [
					{
						"lastName": "Dion",
						"firstName": "Noah M.",
						"creatorType": "author"
					}
				],
				"date": "June 1, 2021",
				"DOI": "10.3366/more.2021.0092",
				"ISSN": "0047-8105",
				"abstractNote": "In this article, I intend to show how Thomas More's use of a seemingly obscure episode from Livy's Ab Urbe Condita in his Apology provides important insights into the major themes of the polemical project that was to consume his final years. More's adaptation of the episode situates him among other Renaissance luminaries who saw in it a means to explore how group dynamics affect individual judgement and shape common opinion. The adaptation also serves to provide thematic cohesion in a polemic long considered excessively excursive and without merit, literary or otherwise. This exploration will further shed light upon the ways in which Renaissance authors appropriated classical histories to address contemporary concern.\\n4207 Dans cet article, je souhaite montrer comment l'usage par Thomas More dans son Apologie d'un épisode apparemment obscur du Ab Urbe Condita de Tite-Live fournit un éclairage important sur les thèmes majeurs du projet polémique qui allait accaparer les ultimes années de sa vie. L'adaptation que fait More de cet épisode le place au rang d'autres penseurs de la Renaissance qui y ont vu un moyen d’étudier comment la dynamique de groupe affecte le jugement individuel et façonne l'opinion générale. Cette adaptation sert également à fournir une cohésion thématique dans une polémique considérée depuis longtemps excessivement digressive et sans mérite, littéraire ou autre. Cette exploration s'intéressera en outre à la façon dont les auteurs de la Renaissance se sont appropriés les histoires de l'Antiquité pour traiter leurs problèmes contemporains.",
				"issue": "1",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "53-74",
				"publicationTitle": "Moreana",
				"shortTitle": "An Exemplary Defense",
				"url": "https://www.euppublishing.com/doi/full/10.3366/more.2021.0092",
				"volume": "58",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Collective judgement"
					},
					{
						"tag": "Deliberative rhetoric"
					},
					{
						"tag": "Heresy"
					},
					{
						"tag": "Historiographie"
					},
					{
						"tag": "Historiography"
					},
					{
						"tag": "Hérésie"
					},
					{
						"tag": "Jugement collectif"
					},
					{
						"tag": "Livy"
					},
					{
						"tag": "Polemics"
					},
					{
						"tag": "Polémique"
					},
					{
						"tag": "Renaissance reception"
					},
					{
						"tag": "Rhétorique délibérative"
					},
					{
						"tag": "Réception à la Renaissance"
					},
					{
						"tag": "Thomas More"
					},
					{
						"tag": "Thomas More"
					},
					{
						"tag": "Tite-Live"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.euppublishing.com/doi/full/10.3366/jqs.2022.0489",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Approaches to the Investigation of Speech Genres in the Qur'an",
				"creators": [
					{
						"lastName": "Stewart",
						"firstName": "Devin J.",
						"creatorType": "author"
					}
				],
				"date": "February 1, 2022",
				"DOI": "10.3366/jqs.2022.0489",
				"ISSN": "1465-3591",
				"abstractNote": "This contribution provides a methodological overview of the investigation of speech genres in the Qur’an. Drawing on Biblical form criticism, the ethnography of speech, and Bakhtin's theory of speech genres, as well as recent studies devoted to the form criticism of the Qur’an and earlier Qur’anic studies scholarship on individual genres, it points out the importance of generic conventions for the interpretation of Qur’anic passages, highlights the types of evidence on which investigators ought to focus in the investigation of genres, and identifies oversights and pitfalls that have affected earlier scholarship and should be taken into account in future work. Close attention must be paid to generic labels, meta-generic discourse, repeated elements, conventional features of individual genres such as introductory formulas, concluding formulas, and characteristic words, phrases, and constructions. The discussion highlights the ways in which texts that belong to individual genres are embedded in suras or longer passages within suras and points out that the Qur’an not only draws on pre-existing genres but also modifies and transforms them.",
				"issue": "1",
				"journalAbbreviation": "J Qur'anic Studies",
				"libraryCatalog": "ubtue_Edinburgh University Press Journals",
				"pages": "1-45",
				"publicationTitle": "Journal of Qur'anic Studies",
				"url": "https://www.euppublishing.com/doi/full/10.3366/jqs.2022.0489",
				"volume": "24",
				"attachments": [
					{
						"title": "EUP Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Formulas"
					},
					{
						"tag": "Generic labels"
					},
					{
						"tag": "Speech genres"
					}
				],
				"notes": [
					{
						"note": "LF"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
