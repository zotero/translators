{
	"translatorID": "4338eead-a8b7-431f-8533-ea53062c9f89",
	"label": "Cambridge Engage Preprints",
	"creator": "Sebastian Karcher",
	"target": "/engage/[^/]+/(article-details/|search-dashboard\\?)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-08 18:55:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher

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

const preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function detectWeb(doc, url) {
	if (url.includes('/article-details/')) {
		return preprintType;
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.MatchResult > a');
	for (let row of rows) {
		let href = row.href;

		let title = ZU.trimInternal(text(row, 'h3'));
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
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.publisher = attr(doc, 'meta[property="og:site_name"]', 'content');
		item.libraryCatalog = "Cambridge Engage Preprints";
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = preprintType;
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://chemrxiv.org/engage/chemrxiv/search-dashboard?text=acid",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://chemrxiv.org/engage/chemrxiv/article-details/615ee2142aca5367575b8e49",
		"items": [
			{
				"itemType": "preprint",
				"title": "Manganese Catalyzed Reformation of Ethylene Glycol to Glycolic acid and Lactic Acid",
				"creators": [
					{
						"firstName": "Satyadeep",
						"lastName": "Waiba",
						"creatorType": "author"
					},
					{
						"firstName": "BIplab",
						"lastName": "Maji",
						"creatorType": "author"
					}
				],
				"date": "2021/10/08",
				"DOI": "10.26434/chemrxiv-2021-mjpkz",
				"abstractNote": "Conversion of readily available feedstocks to valuable platform chemicals via a sustainable catalytic pathway has always been one of the key focuses of synthetic chemists. Cheaper, less toxic, and more abundant base metals as a catalyst for performing such transformations provide an additional boost. In this context, herein, we report a reformation of readily available feedstock, ethylene glycol, to value-added platform molecules, glycolic acid, and lactic acid. A bench stable base metal complex {[HN(C2H4PPh2)2]Mn(CO)2Br}, Mn-I, known as Mn-PhMACHO, catalyzed the reformation of ethylene glycol to glycolic acid at 140 oC in high selectivity with a turnover number TON = 2400, surpassing previously used homogeneous catalysts for such a reaction. Pure hydrogen gas is evolved without the need for an acceptor. On the other hand, a bench stable Mn(I)-complex, {(iPrPN5P)Mn(CO)2Br}, Mn-III, with a triazine backbone, efficiently catalyzed the acceptorless dehydrogenative coupling of ethylene glycol and methanol for the synthesis of lactic acid, even at a ppm level of catalyst loading, reaching the TON of 11,500. Detailed mechanistic studies were performed to elucidate the involvements of different manganese(I)-species during the catalysis.",
				"language": "en",
				"libraryCatalog": "Cambridge Engage Preprints",
				"repository": "ChemRxiv",
				"url": "https://chemrxiv.org/engage/chemrxiv/article-details/615ee2142aca5367575b8e49",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Dehydrogenative coupling"
					},
					{
						"tag": "Glycolic acid"
					},
					{
						"tag": "Hydrogen"
					},
					{
						"tag": "Lactic Acid"
					},
					{
						"tag": "Manganese catalysis"
					},
					{
						"tag": "Sustainable synthesis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://preprints.apsanet.org/engage/apsa/article-details/5d94c7762f41c7001256af6d",
		"items": [
			{
				"itemType": "preprint",
				"title": "Transparency in Practice in Qualitative Research",
				"creators": [
					{
						"firstName": "Diana",
						"lastName": "Kapiszewski",
						"creatorType": "author"
					},
					{
						"firstName": "Sebastian",
						"lastName": "Karcher",
						"creatorType": "author"
					}
				],
				"date": "2019/10/02",
				"DOI": "10.33774/apsa-2019-if2he-v2",
				"abstractNote": "The discipline of political science has been engaged in discussion about when, why, and how to make scholarship more transparent for at least three decades. This piece argues that qualitative researchers can achieve transparency in diverse ways, using techniques and strategies that allow them to balance and optimize among competing considerations that affect the pursuit of transparency.. We begin by considering the “state of the debate,” briefly outlining the contours of the scholarship on transparency in political and other social sciences, which so far has focussed mostly on questions of “whether” and “what” to share. We investigate competing considerations that researchers have to consider when working towards transparent research. The heart of the piece considers various strategies, illustrated by exemplary applications, for making qualitative research more transparent.",
				"language": "en",
				"libraryCatalog": "Cambridge Engage Preprints",
				"repository": "APSA Preprints",
				"url": "https://preprints.apsanet.org/engage/apsa/article-details/5d94c7762f41c7001256af6d",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "open science"
					},
					{
						"tag": "qualitative data"
					},
					{
						"tag": "research transparency"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/engage/miir/article-details/60d6688fafe54f7050a526e4",
		"items": [
			{
				"itemType": "preprint",
				"title": "New Techiques for Composite Wing Manufacture",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Barton",
						"creatorType": "author"
					},
					{
						"firstName": "Hilary",
						"lastName": "Ockendon",
						"creatorType": "author"
					},
					{
						"firstName": "Bernard",
						"lastName": "Piette",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Whittaker",
						"creatorType": "author"
					}
				],
				"date": "2021/07/20",
				"DOI": "10.33774/miir-2021-7cdx1",
				"abstractNote": "This report addresses the construction of carbon fibre wing boxes and the problems associated with using carbon fibre sheets rather than individual carbon fibre tapes. In the case that the wing boxes are developable surfaces the lay up of carbon fibre sheets is straightforward, since the fibres can follow the contours of the surface without any need for shearing or extension of the fibres. To further expand the potential design space for the wing boxes, this report investigates the lay up of sheets over non-developable surfaces where some shearing of the sheet is required to achieve the desired results. In this report, three analytical approaches are considered, driven by the results from numerical studies on different surface geometries. Each of the approaches offers insights as to the type of geometric perturbations achievable when constrained by a maximum shear angle.",
				"language": "en",
				"libraryCatalog": "Cambridge Engage Preprints",
				"repository": "Mathematics in Industry Reports",
				"url": "https://www.cambridge.org/engage/miir/article-details/60d6688fafe54f7050a526e4",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Chebychev nets"
					},
					{
						"tag": "carbon fibre"
					},
					{
						"tag": "deformation of woven materials"
					},
					{
						"tag": "differential geometry"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
