{
	"translatorID": "7044e7f7-2c35-4b25-9755-ee87cdb7f599",
	"label": "NASA ADS 2",
	"creator": "Tim Hostetler",
	"target": "^https://ui.adsabs.harvard.edu/(search|abs)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-06 20:31:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Tim Hostetler

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

function getSearchResults(doc) {
	const results = doc.querySelectorAll("a[href$=abstract]");
	const entries = {};
	for (let el of results) {
		const titleEl = el.querySelector(":scope h3");
		if (!titleEl) {
			continue;
		}
		const hrefParts = el.getAttribute("href").split("/");
		if (hrefParts.length > 2) {
			const identifier = hrefParts[hrefParts.length - 2];
			entries[identifier] = ZU.trimInternal(titleEl.textContent);
		}
	}
	return entries;
}

function detectWeb(doc, url) {
	if (url.includes("/search/")) {
		return "multiple";
	}
	else if (url.includes("/abs/")) {
		return "journalArticle";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) return true;
			return scrape(Object.keys(items), doc);
		});
	}
	else {
		const id = /\/abs\/(.*)\/abstract/.exec(url)[1];
		scrape([id], url, doc);
	}
}

function makePdfUrl(id) {
	return 'https://ui.adsabs.harvard.edu/link_gateway/' + id + '/ARTICLE';
}

function scrape(ids, doc) {
	const exportUrl
		= "http://adsabs.harvard.edu/cgi-bin/nph-bib_query?"
		+ ids.join("&")
		+ "&data_type=REFMAN&nocookieset=1";
	ZU.doGet(exportUrl, function (text) {
		const translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.attachments.push({
				url: makePdfUrl(ids.pop()),
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
			item.attachments.push({ title: "Snapshot", document: doc });
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/search/q=star&sort=date%20desc%2C%20bibcode%20desc&p_=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/abs/2020CNSNS..8205014M/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Modeling excitability in cerebellar stellate cells: Temporal changes in threshold, latency and frequency of firing",
				"creators": [
					{
						"lastName": "Mitry",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Alexander",
						"firstName": "Ryan P. D.",
						"creatorType": "author"
					},
					{
						"lastName": "Farjami",
						"firstName": "Saeed",
						"creatorType": "author"
					},
					{
						"lastName": "Bowie",
						"firstName": "Derek",
						"creatorType": "author"
					},
					{
						"lastName": "Khadra",
						"firstName": "Anmar",
						"creatorType": "author"
					}
				],
				"date": "March 1, 2020",
				"DOI": "10.1016/j.cnsns.2019.105014",
				"ISSN": "1007-5704",
				"abstractNote": "Cerebellar stellate cells are inhibitory molecular interneurons that \nregulate the firing properties of Purkinje cells, the sole output of\ncerebellar cortex. Recent evidence suggests that these cells exhibit\ntemporal increase in excitability during whole-cell patch-clamp\nconfiguration in a phenomenon termed runup. They also exhibit a\nnon-monotonic first-spike latency profile as a function of the holding\npotential in response to a fixed step-current. In this study, we use\nmodeling approaches to unravel the dynamics of runup and categorize the\nfiring behavior of cerebellar stellate cells as either type I or type II\noscillators. We then extend this analysis to investigate how the\nnon-monotonic latency profile manifests itself during runup. We employ a\npreviously developed, but revised, Hodgkin-Huxley type model to show\nthat stellate cells are indeed type I oscillators possessing a saddle\nnode on an invariant cycle (SNIC) bifurcation. The SNIC in the model\nacts as a \"threshold\" for tonic firing and produces a slow region in the\nphase space called the ghost of the SNIC. The model reveals that (i) the\nSNIC gets left-shifted during runup with respect to Iapp\n=Itest in the current-step protocol, and (ii) both the\ndistance from the stable limit cycle along with the slow region produce\nthe non-monotonic latency profile as a function of holding potential.\nUsing the model, we elucidate how latency can be made arbitrarily large\nfor a specific range of holding potentials close to the SNIC during\npre-runup (post-runup). We also demonstrate that the model can produce\ntransient single spikes in response to step-currents entirely below\nISNIC, and that a pair of dynamic inhibitory and excitatory\npost-synaptic inputs can robustly evoke action potentials, provided that\nthe magnitude of the inhibition is either low or high but not\nintermediate. Our results show that the topology of the SNIC is the key\nto explaining such behaviors.",
				"journalAbbreviation": "Communications in Nonlinear Science and Numerical Simulations",
				"libraryCatalog": "NASA ADS 2",
				"pages": "105014",
				"publicationTitle": "Communications in Nonlinear Science and Numerical Simulations",
				"shortTitle": "Modeling excitability in cerebellar stellate cells",
				"url": "http://adsabs.harvard.edu/abs/2020CNSNS..8205014M",
				"volume": "82",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Non-monotonic first-spike latency"
					},
					{
						"tag": "Runup"
					},
					{
						"tag": "Transient single spiking"
					},
					{
						"tag": "Type I oscillator with a SNIC"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
