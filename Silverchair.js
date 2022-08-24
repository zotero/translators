{
	"translatorID": "3bae3a55-f021-4b59-8a14-43701f336adf",
	"label": "Silverchair",
	"creator": "Sebastian Karcher",
	"target": "/(article|fullarticle|advance-article|advance-article-abstract|article-abstract|book|edited-volume)(/|\\.aspx)|search-results?|\\/issue(/|s\\.aspx|$)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 280,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-23 13:00:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020-2022 Sebastian Karcher and Abe Jellinek
	
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
	let articleRegex = /\/(article|fullarticle|advance-article|advance-article-abstract|article-abstract|chapter|chapter-abstract)(\/|\.aspx)/;
	if (articleRegex.test(url)) {
		if (getArticleId(doc)) {
			if (url.includes("/chapter/") || url.includes("/chapter-abstract/")) {
				return "bookSection";
			}
			else {
				return "journalArticle";
			}
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// First one is issue, 2nd one search results
	var rows = doc.querySelectorAll('#ArticleList h5.item-title>a, .al-title a[href*="article"], .al-article-items > .customLink > a[href*="article"], a[class="tocLink"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function getArticleId(doc) {
	let id = attr(doc, '.citation-download-wrap input[name="resourceId"]', "value");
	if (!id) {
		id = attr(doc, 'a[data-article-id]', 'data-article-id');
	}
	if (!id) {
		id = attr(doc, '[data-resource-id]', 'data-resource-id');
	}
	// Z.debug(id)
	return id;
}

function scrape(doc, url) {
	let id = getArticleId(doc);
	let type = attr(doc, '.citation-download-wrap input[name="resourceType"]', "value");
	// Z.debug(type)
	if (!type) {
		if (detectWeb(doc, url) == "bookSection") {
			type = "5";
		}
		else {
			type = "3";
		}
	}
	let chapterTitle = text(doc, '.chapter-title-without-label');
	var risURL = "/Citation/Download?resourceId=" + id + "&resourceType=" + type + "&citationFormat=0";
	// Z.debug(risURL);

	var pdfURL = attr(doc, 'a.article-pdfLink', 'href');
	// Z.debug("pdfURL: " + pdfURL);
	ZU.doGet(risURL, function (text) {
		if (text.includes('We are sorry, but we are experiencing unusual traffic at this time.')) {
			throw new Error('Rate-limited');
		}
		
		// Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.pages) {
				// if item.pages only spans one page (4-4), replace the range
				// with a single page number (4).
				item.pages = item.pages.trim().replace(/^([^-]+)-\1$/, '$1');
			}
			if (item.itemType == "bookSection" && chapterTitle) {
				item.title = chapterTitle;
			}
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
			}
			item.attachments.push({
				title: "Snapshot",
				document: doc
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
		"url": "https://academic.oup.com/isq/article-abstract/57/1/128/1796931?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Assessing the Causes of Capital Account Liberalization: How Measurement Matters1",
				"creators": [
					{
						"lastName": "Karcher",
						"firstName": "Sebastian",
						"creatorType": "author"
					},
					{
						"lastName": "Steinberg",
						"firstName": "David A.",
						"creatorType": "author"
					}
				],
				"date": "March 1, 2013",
				"DOI": "10.1111/isqu.12001",
				"ISSN": "0020-8833",
				"abstractNote": "Why do countries open their economies to global capital markets? A number of recent articles have found that two types of factors encourage politicians to liberalize their capital accounts: strong macroeconomic fundamentals and political pressure from proponents of open capital markets. However, these conclusions need to be re-evaluated because the most commonly used measure of capital account openness, Chinn and Ito's (2002) Kaopen index, suffers from systematic measurement error. We modify the Chinn–Ito variable and replicate two studies (Brooks and Kurtz 2007; Chwieroth 2007) to demonstrate that our improved measure overturns some prior findings. Some political variables have stronger effects on capital account policy than previously recognized, while macroeconomic fundamentals are less important than previous research suggests.",
				"issue": "1",
				"journalAbbreviation": "International Studies Quarterly",
				"libraryCatalog": "Silverchair",
				"pages": "128-137",
				"publicationTitle": "International Studies Quarterly",
				"shortTitle": "Assessing the Causes of Capital Account Liberalization",
				"url": "https://doi.org/10.1111/isqu.12001",
				"volume": "57",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://academic.oup.com/isq/article/64/2/419/5808900",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Civil Conflict and Agenda-Setting Speed in the United Nations Security Council",
				"creators": [
					{
						"lastName": "Binder",
						"firstName": "Martin",
						"creatorType": "author"
					},
					{
						"lastName": "Golub",
						"firstName": "Jonathan",
						"creatorType": "author"
					}
				],
				"date": "June 1, 2020",
				"DOI": "10.1093/isq/sqaa017",
				"ISSN": "0020-8833",
				"abstractNote": "The United Nations Security Council (UNSC) can respond to a civil conflict only if that conflict first enters the Council's agenda. Some conflicts reach the Council's agenda within days after they start, others after years (or even decades), and some never make it. So far, only a few studies have looked at the crucial UNSC agenda-setting stage, and none have examined agenda-setting speed. To fill this important gap, we develop and test a novel theoretical framework that combines insights from realist and constructivist theory with lessons from institutionalist theory and bargaining theory. Applying survival analysis to an original dataset, we show that the parochial interests of the permanent members (P-5) matter, but they do not determine the Council's agenda-setting speed. Rather, P-5 interests are constrained by normative considerations and concerns for the Council's organizational mission arising from the severity of a conflict (in terms of spillover effects and civilian casualties); by the interests of the widely ignored elected members (E-10); and by the degree of preference heterogeneity among both the P-5 and the E-10. Our findings contribute to a better understanding of how the United Nations (UN) works, and they have implications for the UN's legitimacy.",
				"issue": "2",
				"journalAbbreviation": "International Studies Quarterly",
				"libraryCatalog": "Silverchair",
				"pages": "419-430",
				"publicationTitle": "International Studies Quarterly",
				"url": "https://doi.org/10.1093/isq/sqaa017",
				"volume": "64",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/isq/advance-article-abstract/doi/10.1093/isq/sqaa085/5999080?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Angling for Influence: Institutional Proliferation in Development Banking",
				"creators": [
					{
						"lastName": "Pratt",
						"firstName": "Tyler",
						"creatorType": "author"
					}
				],
				"date": "November 23, 2020",
				"DOI": "10.1093/isq/sqaa085",
				"ISSN": "0020-8833",
				"abstractNote": "Why do states build new international organizations (IOs) in issue areas where many institutions already exist? Prevailing theories of institutional creation emphasize their ability to resolve market failures, but adding new IOs can increase uncertainty and rule inconsistency. I argue that institutional proliferation occurs when existing IOs fail to adapt to shifts in state power. Member states expect decision-making rules to reflect their underlying power; when it does not, they demand greater influence in the organization. Subsequent bargaining over the redistribution of IO influence often fails due to credibility and information problems. As a result, under-represented states construct new organizations that provide them with greater institutional control. To test this argument, I examine the proliferation of multilateral development banks since 1944. I leverage a novel identification strategy rooted in the allocation of World Bank votes at Bretton Woods to show that the probability of institutional proliferation is higher when power is misaligned in existing institutions. My results suggest that conflict over shifts in global power contribute to the fragmentation of global governance.",
				"issue": "sqaa085",
				"journalAbbreviation": "International Studies Quarterly",
				"libraryCatalog": "Silverchair",
				"publicationTitle": "International Studies Quarterly",
				"shortTitle": "Angling for Influence",
				"url": "https://doi.org/10.1093/isq/sqaa085",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://rupress.org/jcb/article-abstract/220/1/e202004184/211570/Katanin-p60-like-1-sculpts-the-cytoskeleton-in?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Katanin p60-like 1 sculpts the cytoskeleton in mechanosensory cilia",
				"creators": [
					{
						"lastName": "Sun",
						"firstName": "Landi",
						"creatorType": "author"
					},
					{
						"lastName": "Cui",
						"firstName": "Lihong",
						"creatorType": "author"
					},
					{
						"lastName": "Liu",
						"firstName": "Zhen",
						"creatorType": "author"
					},
					{
						"lastName": "Wang",
						"firstName": "Qixuan",
						"creatorType": "author"
					},
					{
						"lastName": "Xue",
						"firstName": "Zhaoyu",
						"creatorType": "author"
					},
					{
						"lastName": "Wu",
						"firstName": "Menghua",
						"creatorType": "author"
					},
					{
						"lastName": "Sun",
						"firstName": "Tianhui",
						"creatorType": "author"
					},
					{
						"lastName": "Mao",
						"firstName": "Decai",
						"creatorType": "author"
					},
					{
						"lastName": "Ni",
						"firstName": "Jianquan",
						"creatorType": "author"
					},
					{
						"lastName": "Pastor-Pareja",
						"firstName": "José Carlos",
						"creatorType": "author"
					},
					{
						"lastName": "Liang",
						"firstName": "Xin",
						"creatorType": "author"
					}
				],
				"date": "December 2, 2020",
				"DOI": "10.1083/jcb.202004184",
				"ISSN": "0021-9525",
				"abstractNote": "Mechanoreceptor cells develop a specialized cytoskeleton that plays structural and sensory roles at the site of mechanotransduction. However, little is known about how the cytoskeleton is organized and formed. Using electron tomography and live-cell imaging, we resolve the 3D structure and dynamics of the microtubule-based cytoskeleton in fly campaniform mechanosensory cilia. Investigating the formation of the cytoskeleton, we find that katanin p60-like 1 (kat-60L1), a neuronal type of microtubule-severing enzyme, serves two functions. First, it amplifies the mass of microtubules to form the dense microtubule arrays inside the sensory cilia. Second, it generates short microtubules that are required to build the nanoscopic cytoskeleton at the mechanotransduction site. Additional analyses further reveal the functional roles of Patronin and other potential factors in the local regulatory network. In all, our results characterize the specialized cytoskeleton in fly external mechanosensory cilia at near-molecular resolution and provide mechanistic insights into how it is formed.",
				"issue": "e202004184",
				"journalAbbreviation": "Journal of Cell Biology",
				"libraryCatalog": "Silverchair",
				"publicationTitle": "Journal of Cell Biology",
				"url": "https://doi.org/10.1083/jcb.202004184",
				"volume": "220",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://ashpublications.org/blood/article-abstract/doi/10.1182/blood.2019004397/474417/Preleukemic-and-Leukemic-Evolution-at-the-Stem?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Preleukemic and Leukemic Evolution at the Stem Cell Level",
				"creators": [
					{
						"lastName": "Stauber",
						"firstName": "Jacob",
						"creatorType": "author"
					},
					{
						"lastName": "Greally",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Steidl",
						"firstName": "Ulrich",
						"creatorType": "author"
					}
				],
				"date": "December 4, 2020",
				"DOI": "10.1182/blood.2019004397",
				"ISSN": "0006-4971",
				"abstractNote": "Hematological malignancies are an aggregate of diverse populations of cells that arise following a complex process of clonal evolution and selection. Recent approaches have facilitated the study of clonal populations and their evolution over time across multiple phenotypic cell populations. In this review, we present current concepts on the role of clonal evolution in leukemic initiation, disease progression, and relapse. We highlight recent advances and unanswered questions on the contribution of the hemopoietic stem cell population on these processes.",
				"issue": "blood.2019004397",
				"journalAbbreviation": "Blood",
				"libraryCatalog": "Silverchair",
				"publicationTitle": "Blood",
				"url": "https://doi.org/10.1182/blood.2019004397",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://ashpublications.org/search-results?page=1&q=blood",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/isq/search-results?page=1&q=test&fl_SiteID=5394&SearchSourceType=1&allJournals=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://rupress.org/jcb/issue",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ashpublications.org/hematology/issue/2019/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jamanetwork.com/journals/jama/fullarticle/2645104",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Clinicopathological Evaluation of Chronic Traumatic Encephalopathy in Players of American Football",
				"creators": [
					{
						"lastName": "Mez",
						"firstName": "Jesse",
						"creatorType": "author"
					},
					{
						"lastName": "Daneshvar",
						"firstName": "Daniel H.",
						"creatorType": "author"
					},
					{
						"lastName": "Kiernan",
						"firstName": "Patrick T.",
						"creatorType": "author"
					},
					{
						"lastName": "Abdolmohammadi",
						"firstName": "Bobak",
						"creatorType": "author"
					},
					{
						"lastName": "Alvarez",
						"firstName": "Victor E.",
						"creatorType": "author"
					},
					{
						"lastName": "Huber",
						"firstName": "Bertrand R.",
						"creatorType": "author"
					},
					{
						"lastName": "Alosco",
						"firstName": "Michael L.",
						"creatorType": "author"
					},
					{
						"lastName": "Solomon",
						"firstName": "Todd M.",
						"creatorType": "author"
					},
					{
						"lastName": "Nowinski",
						"firstName": "Christopher J.",
						"creatorType": "author"
					},
					{
						"lastName": "McHale",
						"firstName": "Lisa",
						"creatorType": "author"
					},
					{
						"lastName": "Cormier",
						"firstName": "Kerry A.",
						"creatorType": "author"
					},
					{
						"lastName": "Kubilus",
						"firstName": "Caroline A.",
						"creatorType": "author"
					},
					{
						"lastName": "Martin",
						"firstName": "Brett M.",
						"creatorType": "author"
					},
					{
						"lastName": "Murphy",
						"firstName": "Lauren",
						"creatorType": "author"
					},
					{
						"lastName": "Baugh",
						"firstName": "Christine M.",
						"creatorType": "author"
					},
					{
						"lastName": "Montenigro",
						"firstName": "Phillip H.",
						"creatorType": "author"
					},
					{
						"lastName": "Chaisson",
						"firstName": "Christine E.",
						"creatorType": "author"
					},
					{
						"lastName": "Tripodis",
						"firstName": "Yorghos",
						"creatorType": "author"
					},
					{
						"lastName": "Kowall",
						"firstName": "Neil W.",
						"creatorType": "author"
					},
					{
						"lastName": "Weuve",
						"firstName": "Jennifer",
						"creatorType": "author"
					},
					{
						"lastName": "McClean",
						"firstName": "Michael D.",
						"creatorType": "author"
					},
					{
						"lastName": "Cantu",
						"firstName": "Robert C.",
						"creatorType": "author"
					},
					{
						"lastName": "Goldstein",
						"firstName": "Lee E.",
						"creatorType": "author"
					},
					{
						"lastName": "Katz",
						"firstName": "Douglas I.",
						"creatorType": "author"
					},
					{
						"lastName": "Stern",
						"firstName": "Robert A.",
						"creatorType": "author"
					},
					{
						"lastName": "Stein",
						"firstName": "Thor D.",
						"creatorType": "author"
					},
					{
						"lastName": "McKee",
						"firstName": "Ann C.",
						"creatorType": "author"
					}
				],
				"date": "2017-07-25",
				"DOI": "10.1001/jama.2017.8334",
				"ISSN": "0098-7484",
				"abstractNote": "Players of American football may be at increased risk of long-term neurological conditions, particularly chronic traumatic encephalopathy (CTE).To determine the neuropathological and clinical features of deceased football players with CTE.Case series of 202 football players whose brains were donated for research. Neuropathological evaluations and retrospective telephone clinical assessments (including head trauma history) with informants were performed blinded. Online questionnaires ascertained athletic and military history.Participation in American football at any level of play.Neuropathological diagnoses of neurodegenerative diseases, including CTE, based on defined diagnostic criteria; CTE neuropathological severity (stages I to IV or dichotomized into mild [stages I and II] and severe [stages III and IV]); informant-reported athletic history and, for players who died in 2014 or later, clinical presentation, including behavior, mood, and cognitive symptoms and dementia.Among 202 deceased former football players (median age at death, 66 years [interquartile range, 47-76 years]), CTE was neuropathologically diagnosed in 177 players (87%; median age at death, 67 years [interquartile range, 52-77 years]; mean years of football participation, 15.1 [SD, 5.2]), including 0 of 2 pre–high school, 3 of 14 high school (21%), 48 of 53 college (91%), 9 of 14 semiprofessional (64%), 7 of 8 Canadian Football League (88%), and 110 of 111 National Football League (99%) players. Neuropathological severity of CTE was distributed across the highest level of play, with all 3 former high school players having mild pathology and the majority of former college (27 [56%]), semiprofessional (5 [56%]), and professional (101 [86%]) players having severe pathology. Among 27 participants with mild CTE pathology, 26 (96%) had behavioral or mood symptoms or both, 23 (85%) had cognitive symptoms, and 9 (33%) had signs of dementia. Among 84 participants with severe CTE pathology, 75 (89%) had behavioral or mood symptoms or both, 80 (95%) had cognitive symptoms, and 71 (85%) had signs of dementia.In a convenience sample of deceased football players who donated their brains for research, a high proportion had neuropathological evidence of CTE, suggesting that CTE may be related to prior participation in football.",
				"issue": "4",
				"journalAbbreviation": "JAMA",
				"libraryCatalog": "Silverchair",
				"pages": "360-370",
				"publicationTitle": "JAMA",
				"url": "https://doi.org/10.1001/jama.2017.8334",
				"volume": "318",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://pubs.geoscienceworld.org/georef/search-results?page=1&q=test&SearchSourceType=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://jov.arvojournals.org/article.aspx?articleid=2503433",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Testing models of peripheral encoding using metamerism in an oddity paradigm",
				"creators": [
					{
						"lastName": "Wallis",
						"firstName": "Thomas S. A.",
						"creatorType": "author"
					},
					{
						"lastName": "Bethge",
						"firstName": "Matthias",
						"creatorType": "author"
					},
					{
						"lastName": "Wichmann",
						"firstName": "Felix A.",
						"creatorType": "author"
					}
				],
				"date": "2016-03-11",
				"DOI": "10.1167/16.2.4",
				"ISSN": "1534-7362",
				"abstractNote": "Most of the visual field is peripheral, and the periphery encodes visual input with less fidelity compared to the fovea. What information is encoded, and what is lost in the visual periphery? A systematic way to answer this question is to determine how sensitive the visual system is to different kinds of lossy image changes compared to the unmodified natural scene. If modified images are indiscriminable from the original scene, then the information discarded by the modification is not important for perception under the experimental conditions used. We measured the detectability of modifications of natural image structure using a temporal three-alternative oddity task, in which observers compared modified images to original natural scenes. We consider two lossy image transformations, Gaussian blur and Portilla and Simoncelli texture synthesis. Although our paradigm demonstrates metamerism (physically different images that appear the same) under some conditions, in general we find that humans can be capable of impressive sensitivity to deviations from natural appearance. The representations we examine here do not preserve all the information necessary to match the appearance of natural scenes in the periphery.",
				"issue": "2",
				"journalAbbreviation": "Journal of Vision",
				"libraryCatalog": "Silverchair",
				"pages": "4",
				"publicationTitle": "Journal of Vision",
				"url": "https://doi.org/10.1167/16.2.4",
				"volume": "16",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://jov.arvojournals.org/issues.aspx?issueid=934904&journalid=178#issueid=934904",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/book/26783/chapter/195715678",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Statistical inference with probabilistic graphical models",
				"creators": [
					{
						"lastName": "Shah",
						"firstName": "Devavrat",
						"creatorType": "author"
					},
					{
						"lastName": "Krzakala",
						"firstName": "Florent",
						"creatorType": "editor"
					},
					{
						"lastName": "Ricci-Tersenghi",
						"firstName": "Federico",
						"creatorType": "editor"
					},
					{
						"lastName": "Zdeborova",
						"firstName": "Lenka",
						"creatorType": "editor"
					},
					{
						"lastName": "Zecchina",
						"firstName": "Riccardo",
						"creatorType": "editor"
					},
					{
						"lastName": "Tramel",
						"firstName": "Eric W.",
						"creatorType": "editor"
					},
					{
						"lastName": "Cugliandolo",
						"firstName": "Leticia F.",
						"creatorType": "editor"
					}
				],
				"date": "2015-12-01",
				"ISBN": "9780198743736",
				"abstractNote": "This chapter introduces graphical models as a powerful tool to derive efficient algorithms for inference problems. When dealing with complex interdependent variables, inference problems may become of huge complexity. In this context, the structure of the variables is of great interest. In this chapter, directed and undirected graphical models are first defined, before some crucial results are stated, such as the Hammersley–Clifford theorem of Markov random fields and the junction tree property aimed at finding groupings under which a graphical model becomes a tree. Taking advantage of the structure of the variables, belief propagation is then described, including two particular instances: the sum–product and max–sum algorithms. In the final section, the learning problem is addressed in three different contexts: parameter learning, graphical model learning, and latent graphical model learning.",
				"bookTitle": "Statistical Physics, Optimization, Inference, and Message-Passing Algorithms: Lecture Notes of the Les Houches School of Physics: Special Issue, October 2013",
				"extra": "DOI: 10.1093/acprof:oso/9780198743736.003.0001",
				"libraryCatalog": "Silverchair",
				"pages": "0",
				"publisher": "Oxford University Press",
				"url": "https://doi.org/10.1093/acprof:oso/9780198743736.003.0001",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://academic.oup.com/book/26783",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://pubs.geoscienceworld.org/books/book/2212/chapter-abstract/123622472/Understanding-subsurface-fluvial-architecture-from?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Understanding subsurface fluvial architecture from a combination of geological well test models and well test data",
				"creators": [
					{
						"lastName": "Corbett",
						"firstName": "Patrick William Michael",
						"creatorType": "author"
					},
					{
						"lastName": "Duarte",
						"firstName": "Gleyden Lucila Benítez",
						"creatorType": "author"
					},
					{
						"lastName": "Corbett",
						"firstName": "P. W. M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Owen",
						"firstName": "A.",
						"creatorType": "editor"
					},
					{
						"lastName": "Hartley",
						"firstName": "A. J.",
						"creatorType": "editor"
					},
					{
						"lastName": "Pla-Pueyo",
						"firstName": "S.",
						"creatorType": "editor"
					},
					{
						"lastName": "Barreto",
						"firstName": "D.",
						"creatorType": "editor"
					},
					{
						"lastName": "Hackney",
						"firstName": "C.",
						"creatorType": "editor"
					},
					{
						"lastName": "Kape",
						"firstName": "S. J.",
						"creatorType": "editor"
					}
				],
				"date": "2019-12-02",
				"ISBN": "9781786204318",
				"abstractNote": "Two decades of geological modelling have resulted in the ability to study single-well geological models at a sufficiently high resolution to generate synthetic well test responses from numerical simulations in realistic geological models covering a range of fluvial styles. These 3D subsurface models are useful in aiding our understanding and mapping of the geological variation (as quantified by porosity and permeability contrasts) in the near-wellbore region. The building and analysis of these models enables many workflow steps, from matching well test data to improving history-matching. Well testing also has a key potential role in reservoir characterization for an improved understanding of the near-wellbore subsurface architecture in fluvial systems. Developing an understanding of well test responses from simple through increasingly more complex geological scenarios leads to a realistic, real-life challenge: a well test in a small fluvial reservoir. The geological well testing approach explained here, through a recent fluvial case study in South America, is considered to be useful in improving our understanding of reservoir performance. This approach should lead to more geologically and petrophysically consistent models, and to geologically assisted models that are both more correct and quicker to match to history, and thus, ultimately, to more useful reservoir models. It also allows the testing of a more complex geological model through the well test response.",
				"bookTitle": "River to Reservoir: Geoscience to Engineering",
				"extra": "DOI: 10.1144/SP488.7",
				"libraryCatalog": "Silverchair",
				"pages": "0",
				"publisher": "Geological Society of London",
				"url": "https://doi.org/10.1144/SP488.7",
				"volume": "488",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://academic.oup.com/edited-volume/28005",
		"items": "multiple"
	}
]
/** END TEST CASES **/
