{
	"translatorID": "5f22bd25-5b70-11e1-bb1d-c4f24aa18c1e",
	"label": "Annual Reviews",
	"creator": "Aurimas Vinckevicius and Abe Jellinek",
	"target": "^https?://[^/]*annualreviews\\.org/(content/journals|search|page)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-05 16:25:41"
}

/**
	Copyright (c) 2012-2021 Aurimas Vinckevicius and Abe Jellinek
	Modified 2026

	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public
	License along with this program.  If not, see
	<http://www.gnu.org/licenses/>.
*/

// Add article using BibTeX
function addByBibTex(doi, tags, doc) {
	var baseUrl = 'https://www.annualreviews.org';
	var bibtexUrl = baseUrl + '/content/journals/' + doi + '/cite/bibtex';
	var pdfUrl = baseUrl + '/doi/pdf/' + doi;
	
	Zotero.Utilities.HTTP.doGet(bibtexUrl, function (text) {
		if (!text || text.length < 10) return;
		
		var translator = Zotero.loadTranslator('import');
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); // BibTeX
		translator.setString(text);
		
		translator.setHandler('itemDone', function (obj, item) {
			// title is sometimes in all caps
			if (item.title == item.title.toUpperCase()) {
				item.title = ZU.capitalizeTitle(item.title, true);
			}
			
			if (item.abstractNote) {
				item.abstractNote = item.abstractNote.replace(/^...?Abstract/, "");
			}
			
			// Wrong metadata provided in "number"
			if (item.issue) item.issue = undefined;
			
			if (item.DOI && item.DOI.startsWith('https://')) {
				// Match both hyphen and dot formats
				let doiMatch = item.DOI.match(/10\.\d+\/(?:annurev[.-])[^/]+/);
				if (doiMatch) {
					item.DOI = doiMatch[0];
				}
			}
			
			// Remove the citation key
			if (item.itemID) item.itemID = undefined;

			// Remove the "type" field
			if (item.type) item.type = undefined;
			
			// Add tags
			if (tags) item.tags = tags;
			
			// Build attachments array
			var attachments = [
				{ url: pdfUrl, title: 'Full Text PDF', mimeType: 'application/pdf' }
			];
			
			// Only add snapshot if doc exists (single article)
			if (doc) {
				attachments.push({
					url: doc.URL,
					title: 'Snapshot',
					mimeType: 'text/html',
					snapshot: true
				});
			}
			
			item.attachments = attachments;
			
			item.complete();
		});
		
		translator.translate();
	});
}

function detectWeb(doc, url) {
	// Single article
	if (url.match(/10\.\d+\/annurev[.-]/)) {
		return 'journalArticle';
	}
	
	// Listing pages: journal issues/browse/home, search results, and curated
	// topic collections (/page/...)
	if (url.match(/\/content\/journals\/[^/]+\/\d+\/\d+/) // volume/issue
			|| url.match(/\/content\/journals\/[^/]+\/fasttrack/) // early publication
			|| url.match(/\/content\/journals\/[^/]+\/browse/) // browse
			|| url.match(/\/content\/journals\/[^/]+$/) // journal home
			|| url.includes('/page/') // topic collections
			|| url.includes('/search')) {
		if (getListingEntries(doc).some(entry => entry.doi)) {
			return 'multiple';
		}
	}

	return false;
}

// Collect the articles linked from a listing page (TOC, browse, search
// results, topic collection), in page order. Articles linked through the
// publisher's arevie.ws URL shortener don't expose their DOI in the DOM;
// those entries have `shortUrl` set instead of `doi` and are resolved in
// doWeb (see resolveShortLinks).
function getListingEntries(doc) {
	var entries = [];
	var seenDOIs = {};
	var links = doc.querySelectorAll('a[href*="10.1146/annurev"], a[href*="//arevie.ws/"]');

	var seenShortUrls = {};
	for (let link of links) {
		var href = link.getAttribute('href');
		// Each article also has an external "https://doi.org/..." link with the
		// same DOI; skip it so the title link (not the DOI URL) is used as the label.
		if (/doi\.org/.test(href)) continue;

		var title = ZU.trimInternal(link.textContent);
		// Skip anchors whose visible text is itself a URL rather than a title
		if (/^https?:\/\//.test(title)) continue;

		var entry;
		if (href.includes('arevie.ws/')) {
			// Short links may have no usable anchor text (e.g. empty image
			// tiles); the title is filled in from the resolved article page.
			// The same short URL can appear both as a text-less tile and as
			// the article's title link: keep the anchor that has the title.
			var existing = seenShortUrls[link.href];
			if (existing) {
				if (existing.hadText || !title) continue;
				entries.splice(entries.indexOf(existing), 1);
			}
			entry = { title: title, shortUrl: link.href };
			seenShortUrls[link.href] = entry;
		}
		else {
			if (!title || title.length < 3) continue;
			var doiMatch = href.match(/10\.\d+\/(?:annurev[.-])[^/]+/);
			if (!doiMatch || seenDOIs[doiMatch[0]]) continue;
			seenDOIs[doiMatch[0]] = true;
			entry = { title: title, doi: doiMatch[0] };
		}
		// Remember whether the anchor itself carried a title: promotional
		// tiles without text shouldn't outrank an article's real title link
		// when both point to the same article (see doWeb)
		entry.hadText = !!title;

		// Record the link's rendered position: the markup order of these pages
		// doesn't always match the visual order, so the entries are sorted by
		// position below. Links with no layout (hidden document, display:none)
		// keep their relative markup order at the end.
		entry.pos = Infinity;
		var rect = link.getBoundingClientRect ? link.getBoundingClientRect() : null;
		if (rect && (rect.top || rect.bottom || rect.left || rect.right)) {
			entry.pos = rect.top + (doc.defaultView ? doc.defaultView.scrollY : 0);
		}
		entries.push(entry);
	}

	// Stable sort: entries with equal/unknown positions stay in markup order
	entries.sort(function (a, b) {
		if (a.pos === b.pos) return 0;
		return a.pos < b.pos ? -1 : 1;
	});

	return entries;
}

// Resolve arevie.ws short links (in parallel) to find the DOI of the article
// each one points to. The resolved document's URL can still be the short URL
// in some environments (e.g. the connector), so prefer the DOI declared by
// the page itself. Entries that don't resolve to an article keep no `doi`
// and are dropped when the results are assembled.
async function resolveShortLinks(entries) {
	await Promise.all(entries.filter(entry => entry.shortUrl).map(async function (entry) {
		var resolvedDoc;
		try {
			resolvedDoc = await requestDocument(entry.shortUrl);
		}
		catch (e) {
			// A short link that doesn't resolve leaves the entry without a DOI;
			// it must not abort the rest of the translation.
			return;
		}
		var doiSource = attr(resolvedDoc, 'meta[name="dc.identifier"]', 'content')
			|| attr(resolvedDoc, 'meta[property="og:url"]', 'content')
			|| resolvedDoc.location.href;
		var doiMatch = doiSource.match(/10\.\d+\/(?:annurev[.-])[^/?#]+/);
		if (doiMatch) {
			entry.doi = doiMatch[0];
			var metaTitle = attr(resolvedDoc, 'meta[name="dc.title"]', 'content');
			if (metaTitle) entry.title = metaTitle;
		}
	}));
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var entries = getListingEntries(doc);
		await resolveShortLinks(entries);

		// When several anchors point to the same article (e.g. a text-less
		// promotional tile plus the real title link), keep the one whose
		// anchor carried a title, at its own page position
		var chosen = {};
		for (let entry of entries) {
			if (!entry.doi || !entry.title) continue;
			var current = chosen[entry.doi];
			if (!current || (!current.hadText && entry.hadText)) {
				chosen[entry.doi] = entry;
			}
		}
		var results = {};
		for (let entry of entries) {
			if (entry.doi && chosen[entry.doi] === entry) {
				results[entry.doi] = entry.title;
			}
		}
		if (!Object.keys(results).length) return;
		Zotero.selectItems(results, function (items) {
			if (items) {
				Object.keys(items).forEach(function (doi) {
					addByBibTex(doi, [], null);
				});
			}
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	// Extract the DOI from the article URL
	var doiMatch = url.match(/(10\.\d+\/annurev[^/?#]+)/);
	if (!doiMatch) return;

	var doi = doiMatch[1];

	// Tags from page metadata, when present
	var tags = [];
	var subjectMeta = attr(doc, 'meta[name="dc.Subject"]', 'content');
	if (subjectMeta) {
		tags = subjectMeta.split('; ').map(tag => ({ tag }));
	}

	addByBibTex(doi, tags, doc);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.annualreviews.org/search?pageSize=5&value1=something&option1=fulltext&operator2=AND&value2=&option2=fulltext&operator3=AND&value3=&option3=fulltext&operator4=AND&value4=&option4=fulltext&operator5=AND&value5=&option5=fulltext&operator6=AND&value6=&option6=fulltext&operator7=AND&value7=&option7=fulltext&operator8=AND&value8=&option8=fulltext&facetNames=&facetOptions=&operator11=AND&option11=date_from&value11=&operator10=AND&option10=date_to&value10=&sortField=default&sortDescending=&operator12=AND&option12=pub_collection&value12=&operator15=AND&option15=contenttype&value15=&operator14=AND&option14=dcterms_type&value14=&advancedSearch=true",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/fluid",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/fluid/browse",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/fluid/fasttrack",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/page/top-2024",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/page/climate-behavior",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/biophys/40/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/10.1146/annurev.biophys.29.1.545",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Molecular Mechanisms Controlling Actin Filament Dynamics in Nonmuscle Cells",
				"creators": [
					{
						"firstName": "Thomas D.",
						"lastName": "Pollard",
						"creatorType": "author"
					},
					{
						"firstName": "Laurent",
						"lastName": "Blanchoin",
						"creatorType": "author"
					},
					{
						"firstName": "R. Dyche",
						"lastName": "Mullins",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"DOI": "10.1146/annurev.biophys.29.1.545",
				"ISSN": "1936-1238",
				"abstractNote": "We review how motile cells regulate actin filament assembly at their leading edge. Activation of cell surface receptors generates signals (including activated Rho family GTPases) that converge on integrating proteins of the WASp family (WASp, N-WASP, and Scar/WAVE). WASP family proteins stimulate Arp2/3 complex to nucleate actin filaments, which grow at a fixed 70° angle from the side of pre-existing actin filaments. These filaments push the membrane forward as they grow at their barbed ends. Arp2/3 complex is incorporated into the network, and new filaments are capped rapidly, so that activated Arp2/3 complex must be supplied continuously to keep the network growing. Hydrolysis of ATP bound to polymerized actin followed by phosphate dissociation marks older filaments for depolymerization by ADF/cofilins. Profilin catalyzes exchange of ADP for ATP, recycling actin back to a pool of unpolymerized monomers bound to profilin and thymosin-β4 that is poised for rapid elongation of new barbed ends.",
				"libraryCatalog": "Annual Reviews",
				"pages": "545-576",
				"publicationTitle": "Annual Review of Biophysics",
				"publisher": "Annual Reviews",
				"url": "https://www.annualreviews.org/content/journals/10.1146/annurev.biophys.29.1.545",
				"volume": "29",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.annualreviews.org/content/journals/anchem/5/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/linguistics/browse",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.annualreviews.org/content/journals/10.1146/annurev-linguistics-081720-111352",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Linguistics Then and Now: Some Personal Reflections",
				"creators": [
					{
						"firstName": "Noam",
						"lastName": "Chomsky",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.1146/annurev-linguistics-081720-111352",
				"ISSN": "2333-9691",
				"abstractNote": "By mid-twentieth century, a working consensus had been reached in the linguistics community, based on the great achievements of preceding years. Synchronic linguistics had been established as a science, a “taxonomic” science, with sophisticated procedures of analysis of data. Taxonomic science has limits. It does not ask “why?” The time was ripe to seek explanatory theories, using insights provided by the theory of computation and studies of explanatory depth. That effort became the generative enterprise within the biolinguistics framework. Tensions quickly arose: The elements of explanatory theories (generative grammars) were far beyond the reach of taxonomic procedures. The structuralist principle that language is a matter of training and habit, extended by analogy, was unsustainable. More generally, the mood of “virtually everything is known” became “almost nothing is understood,” a familiar phenomenon in the history of science, opening a new and exciting era for a flourishing discipline.",
				"libraryCatalog": "Annual Reviews",
				"pages": "1-11",
				"publicationTitle": "Annual Review of Linguistics",
				"publisher": "Annual Reviews",
				"shortTitle": "Linguistics Then and Now",
				"url": "https://www.annualreviews.org/content/journals/10.1146/annurev-linguistics-081720-111352",
				"volume": "7",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.annualreviews.org/content/journals/10.1146/annurev-physchem-040513-103712",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Phase Separation in Bulk Heterojunctions of Semiconducting Polymers and Fullerenes for Photovoltaics",
				"creators": [
					{
						"firstName": "Neil D.",
						"lastName": "Treat",
						"creatorType": "author"
					},
					{
						"firstName": "Michael L.",
						"lastName": "Chabinyc",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1146/annurev-physchem-040513-103712",
				"ISSN": "1545-1593",
				"abstractNote": "Thin-film solar cells are an important source of renewable energy. The most efficient thin-film solar cells made with organic materials are blends of semiconducting polymers and fullerenes called the bulk heterojunction (BHJ). Efficient BHJs have a nanoscale phase-separated morphology that is formed during solution casting. This article reviews recent work to understand the nature of the phase-separation process resulting in the formation of the domains in polymer-fullerene BHJs. The BHJ is now viewed as a mixture of polymer-rich, fullerene-rich, and mixed polymer-fullerene domains. The formation of this structure can be understood through fundamental knowledge of polymer physics. The implications of this structure for charge transport and charge generation are given.",
				"libraryCatalog": "Annual Reviews",
				"pages": "59-81",
				"publicationTitle": "Annual Review of Physical Chemistry",
				"publisher": "Annual Reviews",
				"url": "https://www.annualreviews.org/content/journals/10.1146/annurev-physchem-040513-103712",
				"volume": "65",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.annualreviews.org/content/journals/10.1146/annurev-fluid-010814-014651",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Ocean Spray",
				"creators": [
					{
						"firstName": "Fabrice",
						"lastName": "Veron",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"DOI": "10.1146/annurev-fluid-010814-014651",
				"ISSN": "1545-4479",
				"abstractNote": "Ocean spray consists of small water droplets ejected from the ocean surface following surface breaking wave events. These drops get transported in the marine atmospheric boundary layer, in which they exchange momentum and heat with the atmosphere. Small spray droplets are transported over large distances and can remain in the atmosphere for several days, where they will scatter radiation; evaporate entirely, leaving behind sea salt; participate in the aerosol chemical cycle; and act as cloud condensation nuclei. Large droplets remain close to the ocean surface and affect the air-sea fluxes of momentum and enthalpy, thereby enhancing the intensity of tropical cyclones. This review summarizes recent progress and the emerging consensus about the number flux and implications of small sea spray droplets. I also summarize shortcomings in our understanding of the impact of large spray droplets on the meteorology of storm systems.",
				"libraryCatalog": "Annual Reviews",
				"pages": "507-538",
				"publicationTitle": "Annual Review of Fluid Mechanics",
				"publisher": "Annual Reviews",
				"url": "https://www.annualreviews.org/content/journals/10.1146/annurev-fluid-010814-014651",
				"volume": "47",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
