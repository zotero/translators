{
	"translatorID": "ab077e98-50bd-4fa2-9843-33f28b4b5e2e",
	"label": "Perceiving Systems",
	"creator": "Abe Jellinek",
	"target": "^https?://ps\\.is\\.tuebingen\\.mpg\\.de/publications",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-09 04:00:49"
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
	if (doc.querySelector('.pre-container > .pre-no-wrap')) {
		if (text(doc, '.publication-show-header-label').includes('Conference')) {
			return 'conferencePaper';
		}
		else {
			return 'journalArticle';
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
	var rows = doc.querySelectorAll('h5.publicationGridTitle > a');
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

function scrape(doc, url) {
	let bibText = text(doc, '.pre-container > .pre-no-wrap');
	
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibText);
	translator.setHandler("itemDone", function (obj, item) {
		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle
				.replace(/Proc\./g, 'Proceedings of the')
				.replace(/Conf\./g, 'Conference');
		}
		
		let pdfURL;
		for (let icon of doc.querySelectorAll('.link-attachment-icon')) {
			let link = icon.parentNode.querySelector('a');
			if (!link) continue;
			
			if (link.textContent.includes('official pdf')) {
				pdfURL = link.href;
				break;
			}
			else if (link.textContent.includes('pdf')
				|| icon.className.includes('pdf')) {
				pdfURL = link.href;
			}
		}
		
		if (pdfURL) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
			
			if (!item.url) {
				item.url = url.replace(/[?#].*$/, '');
			}
		}
		
		if (!item.abstractNote) {
			item.abstractNote = text(doc, 'p > .text-muted');
		}
		
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ps.is.tuebingen.mpg.de/publications/kocabas_spec_2021",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "SPEC: Seeing People in the Wild with an Estimated Camera",
				"creators": [
					{
						"firstName": "Muhammed",
						"lastName": "Kocabas",
						"creatorType": "author"
					},
					{
						"firstName": "Chun-Hao P.",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Joachim",
						"lastName": "Tesch",
						"creatorType": "author"
					},
					{
						"firstName": "Lea",
						"lastName": "Müller",
						"creatorType": "author"
					},
					{
						"firstName": "Otmar",
						"lastName": "Hilliges",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Black",
						"creatorType": "author"
					}
				],
				"date": "2021-10",
				"itemID": "Kocabas_SPEC_2021",
				"libraryCatalog": "Perceiving Systems",
				"proceedingsTitle": "Proceedings of the International Conference on Computer Vision (ICCV)",
				"shortTitle": "SPEC",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ps.is.tuebingen.mpg.de/publications/kalyan_fermiproblems_2021",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "How much coffee was consumed during EMNLP 2019? Fermi Problems: A New Reasoning Challenge for AI",
				"creators": [
					{
						"firstName": "Ashwin",
						"lastName": "Kalyan",
						"creatorType": "author"
					},
					{
						"firstName": "Abhinav",
						"lastName": "Kumar",
						"creatorType": "author"
					},
					{
						"firstName": "Arjun",
						"lastName": "Chandrasekaran",
						"creatorType": "author"
					},
					{
						"firstName": "Ashish",
						"lastName": "Sabharwal",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Clark",
						"creatorType": "author"
					}
				],
				"date": "2021-11",
				"abstractNote": "Many real-world problems require the combined application of multiple reasoning abilities -- employing suitable abstractions, commonsense knowledge, and creative synthesis of problem-solving strategies. To help advance AI systems towards such capabilities, we propose a new reasoning challenge, namely Fermi Problems (FPs), which are questions whose answers can only be approximately estimated because their precise computation is either impractical or impossible. For example, \"How much would the sea level rise if all ice in the world melted?\" FPs are commonly used in quizzes and interviews to bring out and evaluate the creative reasoning abilities of humans. To do the same for AI systems, we present two datasets: 1) A collection of 1k real-world FPs sourced from quizzes and olympiads; and 2) a bank of 10k synthetic FPs of intermediate complexity to serve as a sandbox for the harder real-world challenge. In addition to question-answer pairs, the datasets contain detailed solutions in the form of an executable program and supporting facts, helping in supervision and evaluation of intermediate steps. We demonstrate that even extensively fine-tuned large-scale language models perform poorly on these datasets, on average making estimates that are off by two orders of magnitude. Our contribution is thus the crystallization of several unsolved AI problems into a single, new challenge that we hope will spur further advances in building systems that can reason.",
				"itemID": "Kalyan_FermiProblems_2021",
				"libraryCatalog": "Perceiving Systems",
				"proceedingsTitle": "Proceedings of the Conference on Empirical Methods in Natural Language Processing (EMNLP)",
				"shortTitle": "How much coffee was consumed during EMNLP 2019?",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ps.is.tuebingen.mpg.de/publications/smplpix-wacv-2020",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "SMPLpix: Neural Avatars from 3D Human Models",
				"creators": [
					{
						"firstName": "Sergey",
						"lastName": "Prokudin",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Black",
						"creatorType": "author"
					},
					{
						"firstName": "Javier",
						"lastName": "Romero",
						"creatorType": "author"
					}
				],
				"date": "2021-01",
				"abstractNote": "Recent advances in deep generative models have led to an unprecedented level of realism for synthetically generated images of humans. However, one of the remaining fundamental limitations of these models is the ability to flexibly control the generative process, e.g. change the camera and human pose while retaining the subject identity. At the same time, deformable human body models like SMPL \\cite{loper2015smpl} and its successors provide full control over pose and shape, but rely on classic computer graphics pipelines for rendering. Such rendering pipelines require explicit mesh rasterization  that (a) does not have the potential to fix  artifacts or lack of realism in the original 3D geometry and (b) until recently, were not fully incorporated into deep learning frameworks. In this work, we propose to bridge the gap between classic geometry-based rendering and the latest generative networks operating in pixel space. We train a network that directly converts a sparse set of 3D mesh vertices into photorealistic images, alleviating the need for traditional rasterization mechanism. We train our model on a large corpus of human 3D models and corresponding real photos, and show the advantage over conventional differentiable renderers both in terms of the level of photorealism and rendering efficiency.",
				"itemID": "SMPLpix:WACV:2020",
				"libraryCatalog": "Perceiving Systems",
				"pages": "1810–1819",
				"proceedingsTitle": "Winter Conference on Applications of Computer Vision (WACV)",
				"shortTitle": "SMPLpix",
				"url": "https://ps.is.tuebingen.mpg.de/publications/smplpix-wacv-2020",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://ps.is.tuebingen.mpg.de/publications/aircaprl",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "AirCapRL: Autonomous Aerial Human Motion Capture Using Deep Reinforcement Learning",
				"creators": [
					{
						"firstName": "Rahul",
						"lastName": "Tallamraju",
						"creatorType": "author"
					},
					{
						"firstName": "Nitin",
						"lastName": "Saini",
						"creatorType": "author"
					},
					{
						"firstName": "Elia",
						"lastName": "Bonetto",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Pabst",
						"creatorType": "author"
					},
					{
						"firstName": "Yu Tang",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Black",
						"creatorType": "author"
					},
					{
						"firstName": "Aamir",
						"lastName": "Ahmad",
						"creatorType": "author"
					}
				],
				"date": "2020-10",
				"DOI": "https://doi.org/10.1109/LRA.2020.3013906",
				"abstractNote": "In this letter, we introduce a deep reinforcement learning (DRL) based multi-robot formation controller for the task of autonomous aerial human motion capture (MoCap). We focus on vision-based MoCap, where the objective is to estimate the trajectory of body pose, and shape of a single moving person using multiple micro aerial vehicles. State-of-the-art solutions to this problem are based on classical control methods, which depend on hand-crafted system, and observation models. Such models are difficult to derive, and generalize across different systems. Moreover, the non-linearities, and non-convexities of these models lead to sub-optimal controls. In our work, we formulate this problem as a sequential decision making task to achieve the vision-based motion capture objectives, and solve it using a deep neural network-based RL method. We leverage proximal policy optimization (PPO) to train a stochastic decentralized control policy for formation control. The neural network is trained in a parallelized setup in synthetic environments. We performed extensive simulation experiments to validate our approach. Finally, real-robot experiments demonstrate that our policies generalize to real world conditions.",
				"issue": "4",
				"itemID": "aircaprl",
				"libraryCatalog": "Perceiving Systems",
				"pages": "6678 - 6685",
				"publicationTitle": "IEEE Robotics and Automation Letters",
				"shortTitle": "AirCapRL",
				"url": "https://ieeexplore.ieee.org/document/9158379",
				"volume": "5",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Also accepted and presented in the 2020 IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS).</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ps.is.tuebingen.mpg.de/publications",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ps.is.tuebingen.mpg.de/publications?utf8=%E2%9C%93&query=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
