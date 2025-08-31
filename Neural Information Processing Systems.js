{
	"translatorID": "c816f8ad-4c73-4f6d-914e-a6e7212746cf",
	"label": "Neural Information Processing Systems",
	"creator": "Fei Qi, Sebastian Karcher, Guy Aglionby, and Abe Jellinek",
	"target": "^https?://(papers|proceedings)\\.n(eur)?ips\\.cc/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-28 18:01:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2014-2021 Fei Qi, Sebastian Karcher, Guy Aglionby, and Abe Jellinek
	
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/paper/') && /-Paper\.pdf$|-Abstract\.html$/.test(url)) {
		return "conferencePaper";
	}
	return false;
}

function scrape(doc, url) {
	// Unfortunately, the abstract isn't semantically marked at all; this is the best we can do
	let abstract = ZU.xpathText(doc, '//h4[text()="Abstract"]/following-sibling::p[2]');
	let pdfURL = attr(doc, 'a[href$="-Paper.pdf"]', 'href');
	let bibURL = attr(doc, 'a[href$="-Bibtex.bib"], a[href$="/bibtex"]', 'href');
	if (bibURL) {
		ZU.doGet(bibURL, function (text) {
			let translator = Zotero.loadTranslator("import");
			// BibTeX
			translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				// NeurIPS puts journal/proceedings editors in the BibTeX,
				// but we don't really want them.
				item.creators = item.creators.filter(c => c.creatorType != 'editor');
				
				item.url = url;
				item.abstractNote = abstract;
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
				
				item.complete();
			});
			translator.translate();
		});
	}
	else {
		// fall back to EM for newer items (pre-conference, typically)
		let translator = Zotero.loadTranslator('web');
		// Embedded Metadata
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);
		
		translator.setHandler('itemDone', (_obj, item) => {
			item.publisher = "Curran Associates, Inc.";
			item.abstractNote = abstract;
			item.attachments = item.attachments.filter(a => a.title != 'Snapshot');
			item.complete();
		});

		translator.getTranslatorObject(function (trans) {
			trans.itemType = "conferencePaper";
			trans.doWeb(doc, url);
		});
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = getSearchResults(doc, false);
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else if (url.endsWith('-Paper.pdf')) {
		let abstractURL = url
			.replace('/file/', '/hash/')
			.replace('-Paper.pdf', '-Abstract.html');
		ZU.processDocuments(abstractURL, scrape);
	}
	else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('li a[href*="/paper/"]');
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

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/paper/2009/hash/2387337ba1e0b0249ba90f55b2ba2521-Abstract.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Information-theoretic lower bounds on the oracle complexity of convex optimization",
				"creators": [
					{
						"firstName": "Alekh",
						"lastName": "Agarwal",
						"creatorType": "author"
					},
					{
						"firstName": "Martin J",
						"lastName": "Wainwright",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Bartlett",
						"creatorType": "author"
					},
					{
						"firstName": "Pradeep",
						"lastName": "Ravikumar",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"abstractNote": "Despite the large amount of literature on upper bounds on complexity of convex analysis, surprisingly little is known about the fundamental hardness of these problems. The extensive use of convex optimization in machine learning and statistics makes such an understanding critical to understand fundamental computational limits of learning and estimation. In this paper, we study the complexity of stochastic convex optimization in an oracle model of computation. We improve upon known results and obtain tight minimax complexity estimates for some function classes. We also discuss implications of these results to the understanding the inherent complexity of large-scale learning and estimation problems.",
				"itemID": "NIPS2009_2387337b",
				"libraryCatalog": "Neural Information Processing Systems",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2009/hash/2387337ba1e0b0249ba90f55b2ba2521-Abstract.html",
				"volume": "22",
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
		"url": "https://proceedings.neurips.cc/paper/2009",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/papers/search?q=richard+zemel",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/paper/2019/hash/d0921d442ee91b896ad95059d13df618-Abstract.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Efficient Graph Generation with Graph Recurrent Attention Networks",
				"creators": [
					{
						"firstName": "Renjie",
						"lastName": "Liao",
						"creatorType": "author"
					},
					{
						"firstName": "Yujia",
						"lastName": "Li",
						"creatorType": "author"
					},
					{
						"firstName": "Yang",
						"lastName": "Song",
						"creatorType": "author"
					},
					{
						"firstName": "Shenlong",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Will",
						"lastName": "Hamilton",
						"creatorType": "author"
					},
					{
						"firstName": "David K",
						"lastName": "Duvenaud",
						"creatorType": "author"
					},
					{
						"firstName": "Raquel",
						"lastName": "Urtasun",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Zemel",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"abstractNote": "We propose a new family of efficient and expressive deep generative models of graphs, called Graph Recurrent Attention Networks (GRANs).\nOur model generates graphs one block of nodes and associated edges at a time.\nThe block size and sampling stride allow us to trade off sample quality for efficiency.\nCompared to previous RNN-based graph generative models, our framework better captures the auto-regressive conditioning between the already-generated and to-be-generated parts of the graph using Graph Neural Networks (GNNs) with attention.\nThis not only reduces the dependency on node ordering but also bypasses the long-term bottleneck caused by the sequential nature of RNNs.\nMoreover, we parameterize the output distribution per block using a mixture of Bernoulli, which captures the correlations among generated edges within the block. \nFinally, we propose to handle node orderings in generation by marginalizing over a family of canonical orderings.\nOn standard benchmarks, we achieve state-of-the-art time efficiency and sample quality compared to previous models.\nAdditionally, we show our model is capable of generating large graphs of up to 5K nodes with good quality.\nOur code is released at: \\url{https://github.com/lrjconan/GRAN}.",
				"itemID": "NEURIPS2019_d0921d44",
				"libraryCatalog": "Neural Information Processing Systems",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2019/hash/d0921d442ee91b896ad95059d13df618-Abstract.html",
				"volume": "32",
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
		"url": "https://proceedings.neurips.cc/paper/2020/hash/0060ef47b12160b9198302ebdb144dcf-Abstract.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Self-Supervised MultiModal Versatile Networks",
				"creators": [
					{
						"firstName": "Jean-Baptiste",
						"lastName": "Alayrac",
						"creatorType": "author"
					},
					{
						"firstName": "Adria",
						"lastName": "Recasens",
						"creatorType": "author"
					},
					{
						"firstName": "Rosalia",
						"lastName": "Schneider",
						"creatorType": "author"
					},
					{
						"firstName": "Relja",
						"lastName": "Arandjelović",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Ramapuram",
						"creatorType": "author"
					},
					{
						"firstName": "Jeffrey",
						"lastName": "De Fauw",
						"creatorType": "author"
					},
					{
						"firstName": "Lucas",
						"lastName": "Smaira",
						"creatorType": "author"
					},
					{
						"firstName": "Sander",
						"lastName": "Dieleman",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Zisserman",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"abstractNote": "Videos are a rich source of multi-modal supervision. In this work, we learn representations using self-supervision by leveraging three modalities naturally present in videos: visual, audio and language streams.\nTo this end, we introduce the notion of a multimodal versatile network -- a network that can ingest multiple modalities and whose representations enable downstream tasks in multiple modalities. In particular, we explore how best to combine the modalities, such that fine-grained representations of the visual and audio modalities can be maintained, whilst also integrating text into a common embedding.\nDriven by versatility, we also introduce a novel process of deflation,  so that the networks can be effortlessly applied to the visual data in the form of video or a static image.\nWe demonstrate how such networks trained on large collections of unlabelled video data can be applied on video, video-text, image and audio tasks.\nEquipped with these representations, we obtain state-of-the-art performance on multiple challenging benchmarks including UCF101, HMDB51, Kinetics600, AudioSet and ESC-50 when compared to previous self-supervised work. Our models are publicly available.",
				"itemID": "NEURIPS2020_0060ef47",
				"libraryCatalog": "Neural Information Processing Systems",
				"pages": "25–37",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2020/hash/0060ef47b12160b9198302ebdb144dcf-Abstract.html",
				"volume": "33",
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
		"url": "https://proceedings.neurips.cc/papers/search?q=Lehrach",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://proceedings.neurips.cc/paper/2021/hash/003dd617c12d444ff9c80f717c3fa982-Abstract.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Learning One Representation to Optimize All Rewards",
				"creators": [
					{
						"firstName": "Ahmed",
						"lastName": "Touati",
						"creatorType": "author"
					},
					{
						"firstName": "Yann",
						"lastName": "Ollivier",
						"creatorType": "author"
					}
				],
				"date": "2021-12-06",
				"abstractNote": "We introduce the forward-backward (FB) representation of the dynamics of a reward-free Markov decision process. It provides explicit near-optimal policies for any reward specified a posteriori. During an unsupervised phase, we use reward-free interactions with the environment to learn two representations via off-the-shelf deep learning methods and temporal difference (TD) learning. In the test phase, a reward representation is estimated either from reward observations or an explicit reward description (e.g., a target state). The optimal policy for thatreward is directly obtained from these representations, with no planning. We assume access to an exploration scheme or replay buffer for the first phase.The corresponding unsupervised loss is well-principled: if training is perfect, the policies obtained are provably optimal for any reward function.  With imperfect training, the sub-optimality is proportional to the unsupervised approximation error. The FB representation learns long-range relationships between states and actions, via a predictive occupancy map, without having to synthesize states as in model-based approaches.This is a step towards learning controllable agents in arbitrary black-box stochastic environments. This approach compares well to goal-oriented RL algorithms on discrete and continuous mazes, pixel-based MsPacman, and the FetchReach virtual robot arm. We also illustrate how the agent can immediately adapt to new tasks beyond goal-oriented RL.",
				"language": "en",
				"libraryCatalog": "proceedings.neurips.cc",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2021/hash/003dd617c12d444ff9c80f717c3fa982-Abstract.html",
				"volume": "34",
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
	}
]
/** END TEST CASES **/
