{
	"translatorID": "3aedd2ab-113b-4bb0-8c74-ccb47b3b9deb",
	"label": "arXiv Vanity",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.arxiv-vanity\\.com/papers/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-17 23:58:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('nav a.btn[href*="arxiv.org"]')) {
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
	var rows = doc.querySelectorAll('.paper-list-item h3 > a');
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

function scrape(doc, _url) {
	let arxivURL = attr(doc, 'nav a.btn[href*="arxiv.org"]', 'href');
	ZU.processDocuments(arxivURL, function (arxivDoc) {
		var translator = Zotero.loadTranslator('web');
		// arXiv
		translator.setTranslator('ecddda2e-4fc6-4aea-9f17-ef3b56d7377a');
		translator.setDocument(arxivDoc);
		
		translator.setHandler('itemDone', function (obj, item) {
			item.libraryCatalog = 'arXiv';
			item.complete();
		});
	
		translator.getTranslatorObject(function (trans) {
			trans.doWeb(arxivDoc, arxivURL);
		});
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.arxiv-vanity.com/papers/1708.05866/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Brief Survey of Deep Reinforcement Learning",
				"creators": [
					{
						"firstName": "Kai",
						"lastName": "Arulkumaran",
						"creatorType": "author"
					},
					{
						"firstName": "Marc Peter",
						"lastName": "Deisenroth",
						"creatorType": "author"
					},
					{
						"firstName": "Miles",
						"lastName": "Brundage",
						"creatorType": "author"
					},
					{
						"firstName": "Anil Anthony",
						"lastName": "Bharath",
						"creatorType": "author"
					}
				],
				"date": "11/2017",
				"DOI": "10.1109/MSP.2017.2743240",
				"ISSN": "1053-5888",
				"abstractNote": "Deep reinforcement learning is poised to revolutionise the field of AI and represents a step towards building autonomous systems with a higher level understanding of the visual world. Currently, deep learning is enabling reinforcement learning to scale to problems that were previously intractable, such as learning to play video games directly from pixels. Deep reinforcement learning algorithms are also applied to robotics, allowing control policies for robots to be learned directly from camera inputs in the real world. In this survey, we begin with an introduction to the general field of reinforcement learning, then progress to the main streams of value-based and policy-based methods. Our survey will cover central algorithms in deep reinforcement learning, including the deep $Q$-network, trust region policy optimisation, and asynchronous advantage actor-critic. In parallel, we highlight the unique advantages of deep neural networks, focusing on visual understanding via reinforcement learning. To conclude, we describe several current areas of research within the field.",
				"extra": "arXiv: 1708.05866",
				"issue": "6",
				"journalAbbreviation": "IEEE Signal Process. Mag.",
				"libraryCatalog": "arXiv",
				"pages": "26-38",
				"publicationTitle": "IEEE Signal Processing Magazine",
				"url": "http://arxiv.org/abs/1708.05866",
				"volume": "34",
				"attachments": [
					{
						"title": "arXiv Fulltext PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "arXiv.org Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Computer Science - Artificial Intelligence"
					},
					{
						"tag": "Computer Science - Computer Vision and Pattern Recognition"
					},
					{
						"tag": "Computer Science - Machine Learning"
					},
					{
						"tag": "Statistics - Machine Learning"
					}
				],
				"notes": [
					{
						"note": "Comment: IEEE Signal Processing Magazine, Special Issue on Deep Learning for Image Understanding (arXiv extended version)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.arxiv-vanity.com/papers/2108.06338/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Graph2MDA: a multi-modal variational graph embedding model for predicting microbe-drug associations",
				"creators": [
					{
						"firstName": "Lei",
						"lastName": "Deng",
						"creatorType": "author"
					},
					{
						"firstName": "Yibiao",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Xuejun",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Hui",
						"lastName": "Liu",
						"creatorType": "author"
					}
				],
				"date": "2021-08-14",
				"abstractNote": "Accumulated clinical studies show that microbes living in humans interact closely with human hosts, and get involved in modulating drug efficacy and drug toxicity. Microbes have become novel targets for the development of antibacterial agents. Therefore, screening of microbe-drug associations can benefit greatly drug research and development. With the increase of microbial genomic and pharmacological datasets, we are greatly motivated to develop an effective computational method to identify new microbe-drug associations. In this paper, we proposed a novel method, Graph2MDA, to predict microbe-drug associations by using variational graph autoencoder (VGAE). We constructed multi-modal attributed graphs based on multiple features of microbes and drugs, such as molecular structures, microbe genetic sequences, and function annotations. Taking as input the multi-modal attribute graphs, VGAE was trained to learn the informative and interpretable latent representations of each node and the whole graph, and then a deep neural network classifier was used to predict microbe-drug associations. The hyperparameter analysis and model ablation studies showed the sensitivity and robustness of our model. We evaluated our method on three independent datasets and the experimental results showed that our proposed method outperformed six existing state-of-the-art methods. We also explored the meaningness of the learned latent representations of drugs and found that the drugs show obvious clustering patterns that are significantly consistent with drug ATC classification. Moreover, we conducted case studies on two microbes and two drugs and found 75\\%-95\\% predicted associations have been reported in PubMed literature. Our extensive performance evaluations validated the effectiveness of our proposed method.\\",
				"extra": "arXiv: 2108.06338",
				"libraryCatalog": "arXiv",
				"publicationTitle": "arXiv:2108.06338 [cs, q-bio]",
				"shortTitle": "Graph2MDA",
				"url": "http://arxiv.org/abs/2108.06338",
				"attachments": [
					{
						"title": "arXiv Fulltext PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "arXiv.org Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Computer Science - Machine Learning"
					},
					{
						"tag": "Quantitative Biology - Quantitative Methods"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.arxiv-vanity.com/papers/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
