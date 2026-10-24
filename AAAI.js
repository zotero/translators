{
	"translatorID": "dae6aaeb-61c7-42f0-bb6f-cf52afb38af8",
	"label": "AAAI",
	"creator": "Fabian Schilling",
	"target": "^https?://(www\\.)?aaai\\.org/(papers|proceeding)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-08 15:49:41"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Fabian Schilling

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
	if (url.includes('/papers/') && doc.querySelector('.author-output')) {
		return 'conferencePaper';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.paper-wrap h5 > a[href*="/papers/"]');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

// Returns the paragraphs of a labeled section, e.g. "Published:"
function getSection(doc, label) {
	for (let section of doc.querySelectorAll('.paper-section-wrap')) {
		if (text(section, 'h4').startsWith(label)) {
			return Array.from(section.querySelectorAll('.attribute-output p'), p => ZU.trimInternal(p.textContent))
				.filter(Boolean);
		}
	}
	return [];
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('conferencePaper');
	item.title = ZU.trimInternal(text(doc, 'h1.entry-title'));

	// Some older papers list several authors in one element, e.g. "A and B"
	for (let author of doc.querySelectorAll('.author-output p.bold')) {
		for (let name of author.textContent.split(/,(?!\s*(?:Jr\.?|Sr\.?|II|III|IV)\b)|(?:^|\s+)and\s+/)) {
			name = ZU.trimInternal(name);
			if (!name) continue;
			// Keep name suffixes with their author, in Zotero's first-name field.
			let suffix = name.match(/,?\s+(Jr\.?|Sr\.?|II|III|IV)$/);
			if (suffix) name = name.slice(0, suffix.index);
			let creator = ZU.cleanAuthor(name, 'author');
			if (suffix) creator.firstName += ', ' + suffix[1];
			item.creators.push(creator);
		}
	}

	// e.g. "Proceedings of the AAAI Conference on Artificial Intelligence, 32"
	let crumbs = doc.querySelectorAll('.breadcrumb a[href*="/proceeding/"]');
	let proceedings = ZU.trimInternal(crumbs[0]?.textContent || '')
		|| getSection(doc, 'Proceedings:')[0] || '';

	// AAAI 2010-2016 pages have no date, but the proceedings link has the
	// year, e.g. "/proceeding/aaai-30-2016/" or "AAAI Workshop Papers 2018"
	item.date = getSection(doc, 'Published:')[0]
		|| attr(doc, 'meta[name="DC.issued"]', 'content')
		|| (crumbs[0] ? `${crumbs[0].href} ${proceedings}` : '').match(/\b(?:19|20)\d{2}\b/)?.[0];

	let volumeMatch = proceedings.match(/^(.+),\s*(\d{1,3})$/);
	if (volumeMatch) {
		[, proceedings, item.volume] = volumeMatch;
	}
	item.proceedingsTitle = proceedings;

	// e.g. "Thirty-Second AAAI Conference on Artificial Intelligence 2018" or
	// "No. 1: Thirtieth AAAI Conference On Artificial Intelligence". The site
	// sometimes swaps the Proceedings and Issue sections, and other issues are
	// labels like "Book One" or "Vol. 34 No. 04: AAAI-20 Technical Tracks 4".
	let conference = [crumbs[1]?.textContent, ...getSection(doc, 'Issue:'), ...getSection(doc, 'Proceedings:')]
		.map(name => ZU.trimInternal(name || ''))
		.find(name => /\bConference\b/i.test(name) && !/^Proceedings\b/i.test(name));
	if (conference) {
		item.conferenceName = conference.replace(/^No\.\s*\d+:\s*/, '').replace(/\s+\d{4}$/, '');
	}

	item.abstractNote = getSection(doc, 'Abstract:').join('\n\n');
	let doi = getSection(doc, 'DOI:')[0];
	if (doi) item.DOI = ZU.cleanDOI(doi);

	let publisher = text(doc, '.blue-box-attributes').match(/Published by (.+?), (.+)/);
	if (publisher) {
		item.publisher = publisher[1];
		item.place = publisher[2].trim();
	}
	item.url = url;

	let pdfURL = attr(doc, '.pdf-button a', 'href');
	if (pdfURL) {
		item.attachments.push({ url: pdfURL, title: 'Full Text PDF', mimeType: 'application/pdf' });
	}
	item.complete();
}

// Test cases:
// 1. AAAI 2018: volume, conference name, DOI, publisher
// 2. KDD 1996: no "Published:" or "Proceedings:" sections, generic "Book One" issue
// 3. ISMB 1995: several authors in one element, joined by "and"
// 4. AAAI 2018 issue page: multiple
// 5. ISMB 1995: author paragraphs with a leading "and"
// 6. AAAI 2016: no date except in the proceedings link, conference name in the breadcrumb
// 7. AAAI 2020: issue is a label, not a conference name

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://aaai.org/papers/12276-unflow-unsupervised-learning-of-optical-flow-with-a-bidirectional-census-loss/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "UnFlow: Unsupervised Learning of Optical Flow With a Bidirectional Census Loss",
				"creators": [
					{
						"firstName": "Simon",
						"lastName": "Meister",
						"creatorType": "author"
					},
					{
						"firstName": "Junhwa",
						"lastName": "Hur",
						"creatorType": "author"
					},
					{
						"firstName": "Stefan",
						"lastName": "Roth",
						"creatorType": "author"
					}
				],
				"date": "2018-02-08",
				"DOI": "10.1609/aaai.v32i1.12276",
				"abstractNote": "In the era of end-to-end deep learning, many advances in computer vision are driven by large amounts of labeled data. In the optical flow setting, however, obtaining dense per-pixel ground truth for real scenes is difficult and thus such data is rare. Therefore, recent end-to-end convolutional networks for optical flow rely on synthetic datasets for supervision, but the domain mismatch between training and test scenarios continues to be a challenge. Inspired by classical energy-based optical flow methods, we design an unsupervised loss based on occlusion-aware bidirectional flow estimation and the robust census transform to circumvent the need for ground truth flow. On the KITTI benchmarks, our unsupervised approach outperforms previous unsupervised deep networks by a large margin, and is even more accurate than similar supervised methods trained on synthetic datasets alone. By optionally fine-tuning on the KITTI training data, our method achieves competitive optical flow accuracy on the KITTI 2012 and 2015 benchmarks, thus in addition enabling generic pre-training of supervised networks for datasets with limited amounts of ground truth.",
				"conferenceName": "Thirty-Second AAAI Conference on Artificial Intelligence",
				"libraryCatalog": "AAAI",
				"place": "Palo Alto, California USA",
				"proceedingsTitle": "Proceedings of the AAAI Conference on Artificial Intelligence",
				"publisher": "AAAI Press",
				"shortTitle": "UnFlow",
				"url": "https://aaai.org/papers/12276-unflow-unsupervised-learning-of-optical-flow-with-a-bidirectional-census-loss/",
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
		"url": "https://aaai.org/papers/kdd96-014-knowledge-discovery-and-data-mining-towards-a-unifying-framework/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Knowledge Discovery and Data Mining: Towards a Unifying Framework",
				"creators": [
					{
						"firstName": "Usama",
						"lastName": "Fayyad",
						"creatorType": "author"
					},
					{
						"firstName": "Gregory",
						"lastName": "Piatetsky-Shapiro",
						"creatorType": "author"
					},
					{
						"firstName": "Padhraic",
						"lastName": "Smyth",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"abstractNote": "This paper presents a first step towards a unifying framework for Knowledge Discovery in Databases. We describe links between data mining, knowledge discovery, and other related fields. We then define the KDD process and basic data mining algorithms, discuss application issues and conclude with an analysis of challenges facing practitioners in the field.",
				"libraryCatalog": "AAAI",
				"proceedingsTitle": "Proceedings of the Second International Conference on Knowledge Discovery and Data Mining",
				"shortTitle": "Knowledge Discovery and Data Mining",
				"url": "https://aaai.org/papers/kdd96-014-knowledge-discovery-and-data-mining-towards-a-unifying-framework/",
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
		"url": "https://aaai.org/papers/ismb95-022-3-d-lookup-fast-protein-structure-database-searches-at-90-reliability/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "3-D Lookup: Fast Protein Structure Database Searches at 90 % Reliability",
				"creators": [
					{
						"firstName": "Liisa",
						"lastName": "Holm",
						"creatorType": "author"
					},
					{
						"firstName": "Chris",
						"lastName": "Sander",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"abstractNote": "There are far fewer classes of three-dimensional protein folds than sequence families but the problem of detecting three-dimensional similarities is NP-complete. We present a novel heuristic for identifying 3-D similarities between a query structure and the database of known protein structures. Many methods for structure alignment use a bottom-up approach, identifying first local matches and then solving a combinatorial problem in building up larger clusters of matching substructures. Here, the top-down approach is to start with the global comparison and select a rough superimposition using a fast 3-D lookup of secondary structure motifs. The superimposition is then extended to an alignment of Ca atoms by an iterative dynamic programming step. An all-against-all comparison of 385 representative proteins (150,000 pair comparisons) took 1 day of computer time on a single R8000 processor. In other words, one query structure is scanned against the database in a matter of minutes. The method is rated at 90 % reliability at capturing statistically significant similarities. It is useful as a rapid preprocessor to a comprehensive protein structure database search system.",
				"libraryCatalog": "AAAI",
				"proceedingsTitle": "Proceedings of the Twentieth International Conference on Machine Learning, 1995",
				"shortTitle": "3-D Lookup",
				"url": "https://aaai.org/papers/ismb95-022-3-d-lookup-fast-protein-structure-database-searches-at-90-reliability/",
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
		"url": "https://aaai.org/proceeding/01-thirty-second-aaai-conference-on-artificial-intelligence-2018/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://aaai.org/papers/ismb95-018-parallelsequence-alignment-in-limited-space/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Parallel Sequence Alignment in Limited Space",
				"creators": [
					{
						"firstName": "J. Alicia",
						"lastName": "Grice",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Hughey",
						"creatorType": "author"
					},
					{
						"firstName": "Don",
						"lastName": "Speck",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"abstractNote": "Sequence comparison with affine gap costs is a problem that is readily parallelizable on simple single-instruction, multiple-data stream (SIMD) parallel processors using only constant space per processing element. Unfortunately, the twin problem of sequence alignment, finding the optimal character-by-character correspondence between two sequences, is more complicated. While the innovative O(n**2)-time and O(n)-space serial algorithm has been parallelized for multiple-instruction, multiple-data stream (MIMD) computers with only a communication-time slowdown, typically O(log n), it is not suitable for hardware-efficient SIMD parallel processors with only local communication. This paper proposes several methods of computing sequence alignments with limited memory per processing element. The algorithms are also well-suited to serial implementation. The simpler algorithms feature, for an arbitrary integer L, a factor of L slowdown in exchange for reducing space requirements from O(n) to O(n**(1/L)) per processing element. Taking this series to the limit, we describe an O(n log n) parallel time algorithm that requires O(log n) space per processing element on O(n) SIMD processing elements with only a mesh or linear interconnection network.",
				"libraryCatalog": "AAAI",
				"proceedingsTitle": "Proceedings of the Twentieth International Conference on Machine Learning, 1995",
				"url": "https://aaai.org/papers/ismb95-018-parallelsequence-alignment-in-limited-space/",
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
		"url": "https://aaai.org/papers/10295-deep-reinforcement-learning-with-double-q-learning/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Deep Reinforcement Learning with Double Q-Learning",
				"creators": [
					{
						"firstName": "Hado van",
						"lastName": "Hasselt",
						"creatorType": "author"
					},
					{
						"firstName": "Arthur",
						"lastName": "Guez",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Silver",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"conferenceName": "Thirtieth AAAI Conference On Artificial Intelligence",
				"libraryCatalog": "AAAI",
				"proceedingsTitle": "Proceedings of the AAAI Conference on Artificial Intelligence",
				"url": "https://aaai.org/papers/10295-deep-reinforcement-learning-with-double-q-learning/",
				"volume": "30",
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
		"url": "https://aaai.org/papers/04948-collaborative-sampling-in-generative-adversarial-networks/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Collaborative Sampling in Generative Adversarial Networks",
				"creators": [
					{
						"firstName": "Yuejiang",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Parth",
						"lastName": "Kothari",
						"creatorType": "author"
					},
					{
						"firstName": "Alexandre",
						"lastName": "Alahi",
						"creatorType": "author"
					}
				],
				"date": "2020-06-02",
				"DOI": "10.1609/aaai.v34i04.5933",
				"abstractNote": "The standard practice in Generative Adversarial Networks (GANs) discards the discriminator during sampling. However, this sampling method loses valuable information learned by the discriminator regarding the data distribution. In this work, we propose a collaborative sampling scheme between the generator and the discriminator for improved data generation. Guided by the discriminator, our approach refines the generated samples through gradient-based updates at a particular layer of the generator, shifting the generator distribution closer to the real data distribution. Additionally, we present a practical discriminator shaping method that can smoothen the loss landscape provided by the discriminator for effective sample refinement. Through extensive experiments on synthetic and image datasets, we demonstrate that our proposed method can improve generated samples both quantitatively and qualitatively, offering a new degree of freedom in GAN sampling.",
				"libraryCatalog": "AAAI",
				"place": "Palo Alto, California USA",
				"proceedingsTitle": "Proceedings of the AAAI Conference on Artificial Intelligence",
				"publisher": "AAAI Press",
				"url": "https://aaai.org/papers/04948-collaborative-sampling-in-generative-adversarial-networks/",
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
