{
	"translatorID": "70dc2609-d6fd-415a-822c-a2c04293cb5a",
	"label": "UpToDate References",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.uptodate\\.com/contents/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcv",
	"lastUpdated": "2014-06-12 18:56:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	UpToDate Translator
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
	if (ZU.xpathText(doc, '//ol[@id="reference"]//a')) return "multiple";
	else if (ZU.xpathText(doc, '//div[@class="abstractRow"]/div[@class="label" and contains(text(), "TI")]')) return "journalArticle";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		items = {}
		var titles = ZU.xpath(doc, '//ol[@id="reference"]//a');
		for (var i in titles) {
			items[titles[i].href] = titles[i].textContent
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape)
		});
	} else scrape(doc, url)
}

function scrape(doc, url) {
	var PMID = ZU.xpathText(doc, '//div[@class="abstractRow"]/div[@class="label" and contains(text(), "PMID")]/following-sibling::div');
	if (PMID) PMID = PMID.trim();
	Z.debug(PMID)
	if (!PMID) {
		Z.debug("We don't have a PMID parsing item from page")
		var item = new Zotero.Item("journalArticle");
		item.title = ZU.xpathText(doc, '//div[@class="abstractRow"]/div[@class="label" and contains(text(), "TI")]/following-sibling::div');
		var authors = ZU.xpathText(doc, '//div[@class="abstractRow"]/div[@class="label" and contains(text(), "AU")]/following-sibling::div')
		authors = authors.split(/\s*,\s*/);
		for (var i in authors) {
			var author = authors[i].match(/^([^\s]+)\s+(.+)/)
			item.creators.push({
				"creatorType": "author",
				"lastName": author[1],
				"firstName": author[2]
			})
		}
		var citation = ZU.xpathText(doc, '//div[@class="abstractRow"]/div[@class="label" and contains(text(), "SO")]/following-sibling::div');
		Z.debug(citation);
		item.publicationTitle = item.journalAbbreviation = citation.match(/.+?\./)[0];
		var date = citation.match(/(\d{4})\s*;/);
		if (date) item.date = date[1];
		var volume = citation.match(/;\s*(\d+)/);
		if (volume) item.volume = volume[1];
		var issue = citation.match(/\((\d+)\)/);
		if (issue) item.issue = issue[1];
		var pages = citation.match(/\:([\d\-]+)/);
		if (pages) item.pages = pages[1];
		item.attachments.push({
			document: doc,
			title: "UpToDate Record",
			mimeType: "text/html"
		})
		item.complete();
	} else {
		var url = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=" + PMID;
		Zotero.Utilities.HTTP.doGet(url, function (text) {
			// load translator for PubMed	
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("fcf41bed-0cbc-3704-85c7-8062a0068a7a");
			translator.setString(text);

			// don't save when item is done
			translator.setHandler("itemDone", function (obj, item) {
				item.attachments.push({
					document: doc,
					title: "UpToDate Record",
					mimeType: "text/html"
				})
				item.complete()
			});
			translator.translate();
		});
	}

} 
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.uptodate.com/contents/cancer-prevention/abstract/1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Jemal",
						"firstName": "Ahmedin"
					},
					{
						"creatorType": "author",
						"lastName": "Bray",
						"firstName": "Freddie"
					},
					{
						"creatorType": "author",
						"lastName": "Center",
						"firstName": "Melissa M"
					},
					{
						"creatorType": "author",
						"lastName": "Ferlay",
						"firstName": "Jacques"
					},
					{
						"creatorType": "author",
						"lastName": "Ward",
						"firstName": "Elizabeth"
					},
					{
						"creatorType": "author",
						"lastName": "Forman",
						"firstName": "David"
					}
				],
				"notes": [],
				"tags": [
					"Humans",
					"Internationality",
					"Neoplasms"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "UpToDate Record",
						"mimeType": "text/html"
					}
				],
				"title": "Global cancer statistics",
				"pages": "69-90",
				"ISSN": "1542-4863",
				"journalAbbreviation": "CA Cancer J Clin",
				"publicationTitle": "CA: a cancer journal for clinicians",
				"volume": "61",
				"issue": "2",
				"date": "2011 Mar-Apr",
				"language": "eng",
				"abstractNote": "The global burden of cancer continues to increase largely because of the aging and growth of the world population alongside an increasing adoption of cancer-causing behaviors, particularly smoking, in economically developing countries. Based on the GLOBOCAN 2008 estimates, about 12.7 million cancer cases and 7.6 million cancer deaths are estimated to have occurred in 2008; of these, 56% of the cases and 64% of the deaths occurred in the economically developing world. Breast cancer is the most frequently diagnosed cancer and the leading cause of cancer death among females, accounting for 23% of the total cancer cases and 14% of the cancer deaths. Lung cancer is the leading cancer site in males, comprising 17% of the total new cancer cases and 23% of the total cancer deaths. Breast cancer is now also the leading cause of cancer death among females in economically developing countries, a shift from the previous decade during which the most common cause of cancer death was cervical cancer. Further, the mortality burden for lung cancer among females in developing countries is as high as the burden for cervical cancer, with each accounting for 11% of the total female cancer deaths. Although overall cancer incidence rates in the developing world are half those seen in the developed world in both sexes, the overall cancer mortality rates are generally similar. Cancer survival tends to be poorer in developing countries, most likely because of a combination of a late stage at diagnosis and limited access to timely and standard treatment. A substantial proportion of the worldwide burden of cancer could be prevented through the application of existing cancer control knowledge and by implementing programs for tobacco control, vaccination (for liver and cervical cancers), and early detection and treatment, as well as public health campaigns promoting physical activity and a healthier dietary intake. Clinicians, public health professionals, and policy makers can play an active role in accelerating the application of such interventions globally.",
				"DOI": "10.3322/caac.20107",
				"extra": "PMID: 21296855",
				"libraryCatalog": "UpToDate References"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.uptodate.com/contents/approach-to-the-diagnosis-and-evaluation-of-low-back-pain-in-adults?source=search_result&search=back+pain&selectedTitle=1%7E150",
		"items": "multiple"
	}
]
/** END TEST CASES **/