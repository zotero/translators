{
	"translatorID": "acf93a17-a83b-482b-a45e-0c64cfd49bee",
	"label": "MDPI Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.mdpi\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-11 08:13:22"
}

/*
	MDPI Translator
	Copyright (C) 2013 Sebastian Karcher
	
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
*/


function detectWeb(doc, url) {
	var xpath='//meta[@name="citation_journal_title"]';
	if (ZU.xpath(doc, xpath).length > 0) {
		return "journalArticle";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "article-content")]/a[contains(@class, "title-link")]');
	for (var i=0; i<rows.length; i++) {
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
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
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
	var translator = Zotero.loadTranslator('web');
	//use Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler('itemDone', function(obj, item) {
		if (!item.abstractNote) item.abstractNote = item.extra;
		// prefer citation_authors if present for the initials
		let authors = attr(doc, 'meta[name="citation_authors"]', 'content');
		if (authors) {
			let i=0;
			for (let author of authors.split(';')) {
				if (author.includes(item.creators[i].lastName)) {
					item.creators[i] = ZU.cleanAuthor(author, "author", true);
				}
				i++;
			}
		}
		for (let authorSpan of ZU.xpath(doc, '//div[contains(@Class, "art-authors")]/span')) {
			let name = ZU.xpathText(authorSpan, './/span[contains(@Class, "__name")]');
			let orcid = ZU.xpathText(authorSpan, './/a[contains(@href, "orcid")]/@href');
				if (orcid != null) {
				item.notes.push({note: "orcid: " + orcid.replace("https://orcid.org/", "") + " | " + name + " | taken from website"});
				}
			}
		let toReplace = (item.title + item.abstractNote).match(/(&#\d+;)/g);
		if (toReplace != null) {
			for (let charCode of toReplace) {
				let char = String.fromCharCode(parseInt(charCode.match(/\d+/)[0]));
				item.title = item.title.replace(charCode, char);
				item.abstractNote = item.abstractNote.replace(charCode, char);
			}
			}
		item.title = item.title.replace(/&[lr][sd]quo;/g, "'");
		delete item.extra;
		let reviewtag = text(doc, '.articletype')
		if (reviewtag.match(/Review/)) {
			item.tags.push('Book Review');
		}
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.mdpi.com/2075-4418/2/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/2076-3387/3/3/32",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Autonomy, Conformity and Organizational Learning",
				"creators": [
					{
						"firstName": "Nobuyuki",
						"lastName": "Hanaki",
						"creatorType": "author"
					},
					{
						"firstName": "Hideo",
						"lastName": "Owan",
						"creatorType": "author"
					}
				],
				"date": "2013/9",
				"DOI": "10.3390/admsci3030032",
				"ISSN": "2076-3387",
				"abstractNote": "There is often said to be a tension between the two types of organizational learning activities, exploration and exploitation. The argument goes that the two activities are substitutes, competing for scarce resources when firms need different capabilities and management policies. We present another explanation, attributing the tension to the dynamic interactions among search, knowledge sharing, evaluation and alignment within organizations. Our results show that successful organizations tend to bifurcate into two types: those that always promote individual initiatives and build organizational strengths on individual learning and those good at assimilating the individual knowledge base and exploiting shared knowledge. Straddling the two types often fails. The intuition is that an equal mixture of individual search and assimilation slows down individual learning, while at the same time making it difficult to update organizational knowledge because individuals’ knowledge base is not sufficiently homogenized. Straddling is especially inefficient when the operation is sufficiently complex or when the business environment is sufficiently turbulent.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "www.mdpi.com",
				"pages": "32-52",
				"publicationTitle": "Administrative Sciences",
				"rights": "http://creativecommons.org/licenses/by/3.0/",
				"url": "https://www.mdpi.com/2076-3387/3/3/32",
				"volume": "3",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "NK landscape"
					},
					{
						"tag": "ambidexterity"
					},
					{
						"tag": "complexity"
					},
					{
						"tag": "exploitation"
					},
					{
						"tag": "exploration"
					},
					{
						"tag": "organizational learning"
					},
					{
						"tag": "turbulence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.mdpi.com/search?q=preference&journal=algorithms&volume=&authors=&section=&issue=&article_type=&special_issue=&page=&search=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/1420-3049/23/10/2454",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Measuring Artificial Sweeteners Toxicity Using a Bioluminescent Bacterial Panel",
				"creators": [
					{
						"firstName": "Dorin",
						"lastName": "Harpaz",
						"creatorType": "author"
					},
					{
						"firstName": "Loo Pin",
						"lastName": "Yeo",
						"creatorType": "author"
					},
					{
						"firstName": "Francesca",
						"lastName": "Cecchini",
						"creatorType": "author"
					},
					{
						"firstName": "Trish H. P.",
						"lastName": "Koon",
						"creatorType": "author"
					},
					{
						"firstName": "Ariel",
						"lastName": "Kushmaro",
						"creatorType": "author"
					},
					{
						"firstName": "Alfred I. Y.",
						"lastName": "Tok",
						"creatorType": "author"
					},
					{
						"firstName": "Robert S.",
						"lastName": "Marks",
						"creatorType": "author"
					},
					{
						"firstName": "Evgeni",
						"lastName": "Eltzov",
						"creatorType": "author"
					}
				],
				"date": "2018/10",
				"DOI": "10.3390/molecules23102454",
				"ISSN": "1420-3049",
				"abstractNote": "Artificial sweeteners have become increasingly controversial due to their questionable influence on consumers&rsquo; health. They are introduced in most foods and many consume this added ingredient without their knowledge. Currently, there is still no consensus regarding the health consequences of artificial sweeteners intake as they have not been fully investigated. Consumption of artificial sweeteners has been linked with adverse effects such as cancer, weight gain, metabolic disorders, type-2 diabetes and alteration of gut microbiota activity. Moreover, artificial sweeteners have been identified as emerging environmental pollutants, and can be found in receiving waters, i.e., surface waters, groundwater aquifers and drinking waters. In this study, the relative toxicity of six FDA-approved artificial sweeteners (aspartame, sucralose, saccharine, neotame, advantame and acesulfame potassium-k (ace-k)) and that of ten sport supplements containing these artificial sweeteners, were tested using genetically modified bioluminescent bacteria from E. coli. The bioluminescent bacteria, which luminesce when they detect toxicants, act as a sensing model representative of the complex microbial system. Both induced luminescent signals and bacterial growth were measured. Toxic effects were found when the bacteria were exposed to certain concentrations of the artificial sweeteners. In the bioluminescence activity assay, two toxicity response patterns were observed, namely, the induction and inhibition of the bioluminescent signal. An inhibition response pattern may be observed in the response of sucralose in all the tested strains: TV1061 (MLIC = 1 mg/mL), DPD2544 (MLIC = 50 mg/mL) and DPD2794 (MLIC = 100 mg/mL). It is also observed in neotame in the DPD2544 (MLIC = 2 mg/mL) strain. On the other hand, the induction response pattern may be observed in its response in saccharin in TV1061 (MLIndC = 5 mg/mL) and DPD2794 (MLIndC = 5 mg/mL) strains, aspartame in DPD2794 (MLIndC = 4 mg/mL) strain, and ace-k in DPD2794 (MLIndC = 10 mg/mL) strain. The results of this study may help in understanding the relative toxicity of artificial sweeteners on E. coli, a sensing model representative of the gut bacteria. Furthermore, the tested bioluminescent bacterial panel can potentially be used for detecting artificial sweeteners in the environment, using a specific mode-of-action pattern.",
				"issue": "10",
				"language": "en",
				"libraryCatalog": "www.mdpi.com",
				"pages": "2454",
				"publicationTitle": "Molecules",
				"rights": "http://creativecommons.org/licenses/by/3.0/",
				"url": "https://www.mdpi.com/1420-3049/23/10/2454",
				"volume": "23",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "artificial sweeteners"
					},
					{
						"tag": "bioluminescent bacteria"
					},
					{
						"tag": "environmental pollutants"
					},
					{
						"tag": "gut microbiota"
					},
					{
						"tag": "sport supplements"
					},
					{
						"tag": "toxic effect"
					}
				],
				"notes": [
					{
						"note": "orcid: 0000-0003-4119-6284 | Dorin Harpaz | taken from website"
					},
					{
						"note": "orcid: 0000-0003-3546-7180 | Alfred I. Y. Tok | taken from website"
					},
					{
						"note": "orcid: 0000-0002-3047-9425 | Evgeni Eltzov | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.mdpi.com/2077-1444/13/6/474",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Translation and Interaction: A New Examination of the Controversy over the Translation and Authenticity of the Śūraṃgama-sūtra",
				"creators": [
					{
						"firstName": "Jinhua",
						"lastName": "Jia",
						"creatorType": "author"
					}
				],
				"date": "2022/6",
				"DOI": "10.3390/rel13060474",
				"ISSN": "2077-1444",
				"abstractNote": "From the Tang era (618&ndash;907) to the present day, controversy over the translation and authenticity of the Chinese version of the Śūraṃgama-sūtra, which appeared at the end of the early Tang, has been ongoing. The scholar-official Fang Rong (d. 705) has been considered either the translator or the forger of the sutra, while its Chinese elements, especially those from Daoism, have been used as major evidence that the text is apocryphal. By uncovering new historical sources and critically analysing the arguments of modern scholars, this article undertakes a new examination of this old controversy from the perspective of cultural interaction through scriptural translation. The attribution of translators seen in the version of the sutra preserved in the Fangshan stone-canon, as well as the historical context of the translation, proves that&mdash;for specific politico-historical reasons&mdash;the two early accounts by Buddhist bibliographer Zhisheng (fl. 669&ndash;740) do not contradict but rather complement each other. New and solid evidence also supports the argument that Fang Rong indeed participated in the sutra&rsquo;s translation; moreover, he contributed its Chinese cultural, intellectual and religious elements, and graceful literary style during the process. Additionally, the relationship between early Chan Buddhism, Fang Rong, and Chan master Huaidi, who verified the translation, may have motivated them to make certain embellishments upon the sutra&rsquo;s central theme of Tathāgatagarbha doctrine. This article thus confirms the Śūraṃgama-sūtra to be a major Mahāyāna scripture that contains elements of the Chinese cultural tradition, and that it in turn has exerted tremendous influence on this tradition.",
				"issue": "6",
				"language": "en",
				"libraryCatalog": "www.mdpi.com",
				"pages": "474",
				"publicationTitle": "Religions",
				"rights": "http://creativecommons.org/licenses/by/3.0/",
				"shortTitle": "Translation and Interaction",
				"url": "https://www.mdpi.com/2077-1444/13/6/474",
				"volume": "13",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "<i>Śūraṃgama-sūtra</i>"
					},
					{
						"tag": "Chan Buddhism"
					},
					{
						"tag": "Chinese Buddhism"
					},
					{
						"tag": "Fang Rong"
					},
					{
						"tag": "Huaidi"
					},
					{
						"tag": "Zhisheng"
					}
				],
				"notes": [
					{
						"note": "orcid: 0000-0003-3398-909X | Jinhua Jia | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
