{
	"translatorID": "908c1ca2-59b6-4ad8-b026-709b7b927bda",
	"label": "SAGE Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://journals\\.sagepub\\.com(?:/doi/((?:abs|full)/)?10\\.|/action/doSearch\\?|/toc/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-30 11:03:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

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

//SAGE uses Atypon, but as of now this is too distinct from any existing Atypon sites to make sense in the same translator.

function detectWeb(doc, url) {
	if (url.indexOf('/abs/10.') != -1 || url.indexOf('/full/10.') != -1) {
		return "journalArticle";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "art_title")]/a[contains(@href, "/doi/full/10.") or contains(@href, "/doi/abs/10.")][1]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function(items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var risURL = "//journals.sagepub.com/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	var filename = ZU.xpathText(doc, '//input[@name="downloadFileName"]/@value');
	var post = "doi=" + encodeURIComponent(doi) + "&downloadFileName=" + filename + "&include=abs&format=ris&direct=false&submit=Download+Citation";
	var pdfurl = "//" + doc.location.host + "/doi/pdf/" + doi;
	//Z.debug(pdfurl);
	//Z.debug(post);
	ZU.doPost(risURL, post, function(text) {
		//The publication date is saved in DA and the date first
		//appeared online is in Y1. Thus, we want to prefer DA over T1
		//and will therefore simply delete the later in cases both
		//dates are present.
		if (text.indexOf("DA  - ")>-1) {
			text = text.replace(/Y1  - .*\r?\n/, '');
		}
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			//The subtitle will be neglected in RIS and is only present in
			//the website itself. Moreover, there can be problems with
			//encodings of apostrophs.
			var subtitle = ZU.xpathText(doc, '//div[contains(@class, "publicationContentSubTitle")]/h1');
			var title = ZU.xpathText(doc, '//div[contains(@class, "publicationContentTitle")]/h1');
			if (title) {
				item.title = title.trim();
				if (subtitle) {
					item.title += ': ' + subtitle.trim();
				}
			}
			//The encoding of apostrophs in the RIS are incorrect and
			//therefore we extract the abstract again from the website.
			var abstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			if (abstract) {
				item.abstractNote = abstract;
			}
			item.notes = [];
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
						"lastName": "Kappas",
						"firstName": "Arvid",
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
				"url": "http://journals.sagepub.com/doi/abs/10.1177/1754073910380971",
				"volume": "3",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
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
						"lastName": "Berry",
						"firstName": "RJ",
						"creatorType": "author"
					},
					{
						"lastName": "Bradley",
						"firstName": "MSA",
						"creatorType": "author"
					},
					{
						"lastName": "McGregor",
						"firstName": "RG",
						"creatorType": "author"
					}
				],
				"date": "August 1, 2015",
				"DOI": "10.1177/0954408914525387",
				"ISSN": "0954-4089",
				"abstractNote": "A low cost powder flowability tester for industry has been developed at The Wolfson Centre for Bulk Solids Handling Technology, University of Greenwich in collaboration with Brookfield Engineering and four food manufacturers: Cadbury, Kerry Ingredients, GSK and United Biscuits. Anticipated uses of the tester are primarily for quality control and new product development, but it can also be used for storage vessel design., This paper presents the preliminary results from ‘round robin’ trials undertaken with the powder flow tester using the BCR limestone (CRM-116) standard test material. The mean flow properties have been compared to published data found in the literature for the other shear testers.",
				"issue": "3",
				"journalAbbreviation": "Proceedings of the IMechE",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "215-230",
				"publicationTitle": "Proceedings of the Institution of Mechanical Engineers, Part E: Journal of Process Mechanical Engineering",
				"url": "http://journals.sagepub.com/doi/abs/10.1177/0954408914525387",
				"volume": "229",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
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
						"lastName": "Petkovsek",
						"firstName": "Melissa A.",
						"creatorType": "author"
					},
					{
						"lastName": "Boutwell",
						"firstName": "Brian B.",
						"creatorType": "author"
					},
					{
						"lastName": "Barnes",
						"firstName": "J. C.",
						"creatorType": "author"
					},
					{
						"lastName": "Beaver",
						"firstName": "Kevin M.",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2016",
				"DOI": "10.1177/1541204015581389",
				"ISSN": "1541-2040",
				"abstractNote": "Moffitt’s taxonomy remains an influential theoretical framework within criminology. Despite much empirical scrutiny, comparatively less time has been spent testing the snares component of Moffitt’s work. Specifically, are there factors that might engender continued criminal involvement for individuals otherwise likely to desist? The current study tested whether gang membership increased the odds of contact with the justice system for each of the offender groups specified in Moffitt’s original developmental taxonomy. Our findings provided little evidence that gang membership increased the odds of either adolescence-limited or life-course persistent offenders being processed through the criminal justice system. Moving forward, scholars may wish to shift attention to alternative variables—beyond gang membership—when testing the snares hypothesis.",
				"issue": "4",
				"journalAbbreviation": "Youth Violence and Juvenile Justice",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "335-349",
				"publicationTitle": "Youth Violence and Juvenile Justice",
				"shortTitle": "Moffitt’s Developmental Taxonomy and Gang Membership",
				"url": "http://journals.sagepub.com/doi/abs/10.1177/1541204015581389",
				"volume": "14",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
