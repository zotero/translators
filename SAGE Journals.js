{
	"translatorID": "908c1ca2-59b6-4ad8-b026-709b7b927bda",
	"label": "ubtue_SAGE Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://journals\\.sagepub\\.com(/doi/((abs|full|pdf)/)?10\\.|/action/doSearch\\?|/toc/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-30 10:12:38"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2016 Philipp Zumstein
	Modiefied 2020 Timotheus Kim
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

// SAGE uses Atypon, but as of now this is too distinct from any existing Atypon sites to make sense in the same translator.

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.includes('/abs/10.') || url.includes('/full/10.') || url.includes('/pdf/10.') || url.includes('/doi/10.')) {
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
	var rows = ZU.xpath(doc, '//span[contains(@class, "art_title")]/a[contains(@href, "/doi/full/10.") or contains(@href, "/doi/abs/10.") or contains(@href, "/doi/pdf/10.")][1] | //a[contains(concat( " ", @class, " " ), concat( " ", "ref", " " )) and contains(concat( " ", @class, " " ), concat( " ", "nowrap", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "hlFld-Title", " " ))]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent.replace(/Citation|ePub.*|Abstract/, ''));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		href = href.replace("/doi/pdf/", "/doi/abs/");
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var risURL = "//journals.sagepub.com/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (!doi) {
		doi = url.match(/10\.[^?#]+/)[0];
	}
	var post = "doi=" + encodeURIComponent(doi) + "&include=abs&format=ris&direct=false&submit=Download+Citation";
	var pdfurl = "//" + doc.location.host + "/doi/pdf/" + doi;
	var articleType = ZU.xpath(doc, '//span[@class="ArticleType"]/span');
	//Z.debug(pdfurl);
	//Z.debug(post);
	ZU.doPost(risURL, post, function (text) {
		//The publication date is saved in DA and the date first
		//appeared online is in Y1. Thus, we want to prefer DA over T1
		//and will therefore simply delete the later in cases both
		//dates are present.
		//Z.debug(text);
		if (text.includes("DA  - ")) {
			text = text.replace(/Y1\s{2}- .*\r?\n/, '');
		} // Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// The subtitle will be neglected in RIS and is only present in
			// the website itself. Moreover, there can be problems with
			// encodings of apostrophs.
			var subtitle = ZU.xpathText(doc, '//div[contains(@class, "publicationContentSubTitle")]/h1');
			var title = ZU.xpathText(doc, '//div[contains(@class, "publicationContentTitle")]/h1');
			if (title) {
				item.title = title.trim();
				if (subtitle) {
					item.title += ': ' + subtitle.trim();
				}
			}
			
			// ubtue: extract translated and other abstracts from the different xpath
			var ubtueabstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			var otherabstract = ZU.xpathText(doc, '//article//div[contains(@class, "tabs-translated-abstract")]/p');
			var abstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			if (ubtueabstract && otherabstract) {
				item.abstractNote = ubtueabstract;
				item.notes.push({
					note: "abs:" + otherabstract.replace(/^Résumé/, ''),
				});
			} else if (ubtueabstract && !otherabstract) {
				ubtueabstract = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]');
				item.abstractNote = ubtueabstract;
			} else {
				item.abstractNote = abstract;
			}

			var tagentry = ZU.xpathText(doc, '//kwd-group[1] | //*[contains(concat( " ", @class, " " ), concat( " ", "hlFld-KeywordText", " " ))]');
			if (tagentry) {
				item.tags = tagentry.replace(/.*Keywords/, ',').replace(/Mots-clés/, ',').split(",");
			}
			// ubtue: add tags "Book Review" if "Review Article"
			if (articleType) {
				for (let r of articleType) {
					let reviewDOIlink = r.innerHTML;
					if (reviewDOIlink.match(/Review Article|(product|book)\s+review/i)) {
						item.tags.push('Book Review');
					}
				}
			}
			// Workaround while Sage hopefully fixes RIS for authors
			for (let i = 0; i < item.creators.length; i++) {
				if (!item.creators[i].firstName) {
					let type = item.creators[i].creatorType;
					let comma = item.creators[i].lastName.includes(",");
					item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, type, comma);
				}
			}

			// scrape tags
			if (!item.tags || item.tags.length === 0) {
				var embedded = ZU.xpathText(doc, '//meta[@name="keywords"]/@content');
				if (embedded) item.tags = embedded.split(",");
				if (!item.tags) {
					var tags = ZU.xpath(doc, '//div[@class="abstractKeywords"]//a');
					if (tags) item.tags = tags.map(n => n.textContent);
				}
			}
			
			item.language = ZU.xpathText(doc, '//meta[@name="dc.Language"]/@content');
			item.attachments.push({
				url: pdfurl,
				title: "SAGE PDF Full Text",
				mimeType: "application/pdf"
			});
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://journals.sagepub.com/doi/abs/10.1177/1754073910380971",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Emotion and Regulation are One!",
				"creators": [
					{
						"firstName": "Arvid",
						"lastName": "Kappas",
						"creatorType": "author"
					}
				],
				"date": "January 1, 2011",
				"DOI": "10.1177/1754073910380971",
				"ISSN": "1754-0739",
				"abstractNote": "Emotions are foremost self-regulating processes that permit rapid responses and adaptations to situations of personal concern. They have biological bases and are shaped ontogenetically via learning and experience. Many situations and events of personal concern are social in nature. Thus, social exchanges play an important role in learning about rules and norms that shape regulation processes. I argue that (a) emotions often are actively auto-regulating—the behavior implied by the emotional reaction bias to the eliciting event or situation modifies or terminates the situation; (b) certain emotion components are likely to habituate dynamically, modifying the emotional states; (c) emotions are typically intra- and interpersonal processes at the same time, and modulating forces at these different levels interact; (d) emotions are not just regulated—they regulate. Important conclusions of my arguments are that the scientific analysis of emotion should not exclude regulatory processes, and that effortful emotion regulation should be seen relative to a backdrop of auto-regulation and habituation, and not the ideal notion of a neutral baseline. For all practical purposes unregulated emotion is not a realistic concept.",
				"issue": "1",
				"journalAbbreviation": "Emotion Review",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "17-25",
				"publicationTitle": "Emotion Review",
				"url": "https://doi.org/10.1177/1754073910380971",
				"volume": "3",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "emotion regulation"
					},
					{
						"tag": "facial expression"
					},
					{
						"tag": "facial feedback"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals.sagepub.com/toc/rera/86/3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals.sagepub.com/doi/full/10.1177/0954408914525387",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Brookfield powder flow tester – Results of round robin tests with CRM-116 limestone powder",
				"creators": [
					{
						"firstName": "R. J.",
						"lastName": "Berry",
						"creatorType": "author"
					},
					{
						"firstName": "M. S. A.",
						"lastName": "Bradley",
						"creatorType": "author"
					},
					{
						"firstName": "R. G.",
						"lastName": "McGregor",
						"creatorType": "author"
					}
				],
				"date": "August 1, 2015",
				"DOI": "10.1177/0954408914525387",
				"ISSN": "0954-4089",
				"abstractNote": "A low cost powder flowability tester for industry has been developed at The Wolfson Centre for Bulk Solids Handling Technology, University of Greenwich in collaboration with Brookfield Engineering and four food manufacturers: Cadbury, Kerry Ingredients, GSK and United Biscuits. Anticipated uses of the tester are primarily for quality control and new product development, but it can also be used for storage vessel design., This paper presents the preliminary results from ‘round robin’ trials undertaken with the powder flow tester using the BCR limestone (CRM-116) standard test material. The mean flow properties have been compared to published data found in the literature for the other shear testers.",
				"issue": "3",
				"journalAbbreviation": "Proceedings of the Institution of Mechanical Engineers, Part E: Journal of Process Mechanical Engineering",
				"libraryCatalog": "SAGE Journals",
				"pages": "215-230",
				"publicationTitle": "Proceedings of the Institution of Mechanical Engineers, Part E: Journal of Process Mechanical Engineering",
				"url": "https://doi.org/10.1177/0954408914525387",
				"volume": "229",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Shear cell"
					},
					{
						"tag": "BCR limestone powder (CRM-116)"
					},
					{
						"tag": "flow function"
					},
					{
						"tag": "characterizing powder flowability"
					},
					{
						"tag": "reproducibility"
					},
					{
						"tag": "Brookfield powder flow tester"
					},
					{
						"tag": "Jenike shear cell"
					},
					{
						"tag": "Schulze ring shear tester"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://journals.sagepub.com/action/doSearch?AllField=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://journals.sagepub.com/doi/full/10.1177/1541204015581389",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Moffitt’s Developmental Taxonomy and Gang Membership: An Alternative Test of the Snares Hypothesis",
				"creators": [
					{
						"firstName": "Melissa A.",
						"lastName": "Petkovsek",
						"creatorType": "author"
					},
					{
						"firstName": "Brian B.",
						"lastName": "Boutwell",
						"creatorType": "author"
					},
					{
						"firstName": "J. C.",
						"lastName": "Barnes",
						"creatorType": "author"
					},
					{
						"firstName": "Kevin M.",
						"lastName": "Beaver",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2016",
				"DOI": "10.1177/1541204015581389",
				"ISSN": "1541-2040",
				"abstractNote": "Moffitt’s taxonomy remains an influential theoretical framework within criminology. Despite much empirical scrutiny, comparatively less time has been spent testing the snares component of Moffitt’s work. Specifically, are there factors that might engender continued criminal involvement for individuals otherwise likely to desist? The current study tested whether gang membership increased the odds of contact with the justice system for each of the offender groups specified in Moffitt’s original developmental taxonomy. Our findings provided little evidence that gang membership increased the odds of either adolescence-limited or life-course persistent offenders being processed through the criminal justice system. Moving forward, scholars may wish to shift attention to alternative variables—beyond gang membership—when testing the snares hypothesis.",
				"issue": "4",
				"journalAbbreviation": "Youth Violence and Juvenile Justice",
				"libraryCatalog": "SAGE Journals",
				"pages": "335-349",
				"publicationTitle": "Youth Violence and Juvenile Justice",
				"shortTitle": "Moffitt’s Developmental Taxonomy and Gang Membership",
				"url": "https://doi.org/10.1177/1541204015581389",
				"volume": "14",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Moffitt’s developmental taxonomy"
					},
					{
						"tag": "gang membership"
					},
					{
						"tag": "snares"
					},
					{
						"tag": "delinquency"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0037768620922122",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Religious reconfiguration in Mexico: Beliefs and Practices National Survey, 2016",
				"creators": [
					{
						"lastName": "De la Torre",
						"firstName": "Renée",
						"creatorType": "author"
					},
					{
						"lastName": "Gutiérrez",
						"firstName": "Cristina",
						"creatorType": "author"
					},
					{
						"lastName": "Hernández",
						"firstName": "Alberto",
						"creatorType": "author"
					}
				],
				"date": "September 1, 2020",
				"DOI": "10.1177/0037768620922122",
				"ISSN": "0037-7686",
				"abstractNote": "Although Mexico is one of the countries with the most number of Catholics, it is experiencing a rapid and intense religious diversification. The religious field in Mexico now comprises a myriad of denominations that are transforming the supposed socioreligious homogeneity of Mexicans. Among the Catholics, novel practices often associated with new spiritualities, including neopagan and indigenous rituals, are another feature of this diversity, along with a trend toward religious deinstitutionalization. Findings from the ENCREER, a national survey on religious practices and beliefs, allow for a comparative analysis of the main religious identifications (Catholics, Protestants and Evangelicals, Seventh Day Adventists/Jehovah’s Witnesses/Latter Day Saints, and unaffiliated). With an eye to facilitating international comparisons, this article describes the survey design and the principal findings of the analysis of the contemporary religious diversity in Mexico.",
				"issue": "3",
				"journalAbbreviation": "Social Compass",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "349-371",
				"publicationTitle": "Social Compass",
				"shortTitle": "Religious reconfiguration in Mexico",
				"url": "https://doi.org/10.1177/0037768620922122",
				"volume": "67",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Mexico"
					},
					{
						"tag": " Mexique"
					},
					{
						"tag": " enquêtes"
					},
					{
						"tag": " pluralisme religieux"
					},
					{
						"tag": " pratiques religieuses"
					},
					{
						"tag": " religious beliefs"
					},
					{
						"tag": " religious pluralism"
					},
					{
						"tag": " religious practices"
					},
					{
						"tag": " surveyscroyances religieuses"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0037768620922122</p>"
					},
					{
						"note": "abs:Bien que le Mexique soit l’un des pays les plus catholiques du monde, il connaît une diversification religieuse rapide et intense. Le champ religieux au Mexique est désormais constitué d’une myriade de confessions qui transforment la prétendue homogénéité socio-religieuse des Mexicains. Chez les catholiques, les nouvelles pratiques souvent associées à de nouvelles spiritualités, notamment les rituels néopaïens et indigènes, sont une autre caractéristique de cette diversité, ainsi qu’une tendance à la désinstitutionnalisation religieuse. Les résultats de l’ENCREER, une enquête nationale sur les pratiques et les croyances religieuses, permettent une analyse comparative des principales identifications religieuses (Catholiques, Protestants et Évangéliques, Adventistes du septième jour/Témoins de Jéhovah/Saints des derniers jours et non affiliés). En vue de faciliter les comparaisons internationales, cet article décrit la conception de l’enquête et les principales conclusions de l’analyse de la diversité religieuse contemporaine au Mexique."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/2056997120926099",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Learning for Life: An Imaginative Approach to Worldview Education in the Context of Diversity",
				"creators": [
					{
						"lastName": "Baumann",
						"firstName": "Eddie K",
						"creatorType": "author"
					}
				],
				"date": "November 1, 2020",
				"DOI": "10.1177/2056997120926099",
				"ISSN": "2056-9971",
				"issue": "3",
				"journalAbbreviation": "International Journal of Christianity & Education",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "317-318",
				"publicationTitle": "International Journal of Christianity & Education",
				"shortTitle": "Learning for Life",
				"url": "https://doi.org/10.1177/2056997120926099",
				"volume": "24",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/2056997120926099</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0091647120908017",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "How to Discuss Controversial Sexual Issues with Christians Who Don’t (and Do) Agree with You",
				"creators": [
					{
						"lastName": "Worthington",
						"firstName": "Everett L.",
						"creatorType": "author"
					}
				],
				"date": "September 1, 2020",
				"DOI": "10.1177/0091647120908017",
				"ISSN": "0091-6471",
				"abstractNote": "I review the book, Geoffrey W. Sutton, A house divided: Sexuality, morality, and Christian cultures (Pickwick, 2016). After identifying the main premise as helping people understand the variety of positions (and what are behind them) on sexual issues, I summarize each chapter. Then, while I approve of promoting more understanding, I suggest that cognitive psychology shows that understanding alone will probably not promote societal peace or peace among Christians. Rather, unconscious and intuitive factors must also be considered.",
				"issue": "3",
				"journalAbbreviation": "Journal of Psychology and Theology",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "229-233",
				"publicationTitle": "Journal of Psychology and Theology",
				"url": "https://doi.org/10.1177/0091647120908017",
				"volume": "48",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " conflict"
					},
					{
						"tag": " conservatives"
					},
					{
						"tag": " gender"
					},
					{
						"tag": " moral foundations"
					},
					{
						"tag": " progressives"
					},
					{
						"tag": " sex"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0091647120908017</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
