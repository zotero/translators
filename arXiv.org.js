{
	"translatorID": "ecddda2e-4fc6-4aea-9f17-ef3b56d7377a",
	"label": "arXiv.org",
	"creator": "Sean Takats and Michael Berkowitz",
	"target": "^https?://([^\\.]+\\.)?(arxiv\\.org|xxx\\.lanl\\.gov)/(search|find|catchup|list/\\w|abs/|pdf/)",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-12-03 15:53:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Sean Takats and Michael Berkowitz

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

const arXivCategories = {
	// Technically not categories, but added here to allow tags with "Archive - Sub-Field" structure
	cs: "Computer Science",
	econ: "Economics",
	eess: "Electrical Engineering and Systems Science",
	math: "Mathematics",
	nlin: "Nonlinear Sciences",
	physics: "Physics",
	"q-fin": "Quantitative Finance",
	stat: "Statistics",

	"acc-phys": "Accelerator Physics",
	"adap-org": "Adaptation, Noise, and Self-Organizing Systems",
	"alg-geom": "Algebraic Geometry",
	"ao-sci": "Atmospheric-Oceanic Sciences",
	"astro-ph": "Astrophysics",
	"astro-ph.CO": "Cosmology and Nongalactic Astrophysics",
	"astro-ph.EP": "Earth and Planetary Astrophysics",
	"astro-ph.GA": "Astrophysics of Galaxies",
	"astro-ph.HE": "High Energy Astrophysical Phenomena",
	"astro-ph.IM": "Instrumentation and Methods for Astrophysics",
	"astro-ph.SR": "Solar and Stellar Astrophysics",
	"atom-ph": "Atomic, Molecular and Optical Physics",
	"bayes-an": "Bayesian Analysis",
	"chao-dyn": "Chaotic Dynamics",
	"chem-ph": "Chemical Physics",
	"cmp-lg": "Computation and Language",
	"comp-gas": "Cellular Automata and Lattice Gases",
	"cond-mat": "Condensed Matter",
	"cond-mat.dis-nn": "Disordered Systems and Neural Networks",
	"cond-mat.mes-hall": "Mesoscale and Nanoscale Physics",
	"cond-mat.mtrl-sci": "Materials Science",
	"cond-mat.other": "Other Condensed Matter",
	"cond-mat.quant-gas": "Quantum Gases",
	"cond-mat.soft": "Soft Condensed Matter",
	"cond-mat.stat-mech": "Statistical Mechanics",
	"cond-mat.str-el": "Strongly Correlated Electrons",
	"cond-mat.supr-con": "Superconductivity",
	"cs.AI": "Artificial Intelligence",
	"cs.AR": "Hardware Architecture",
	"cs.CC": "Computational Complexity",
	"cs.CE": "Computational Engineering, Finance, and Science",
	"cs.CG": "Computational Geometry",
	"cs.CL": "Computation and Language",
	"cs.CR": "Cryptography and Security",
	"cs.CV": "Computer Vision and Pattern Recognition",
	"cs.CY": "Computers and Society",
	"cs.DB": "Databases",
	"cs.DC": "Distributed, Parallel, and Cluster Computing",
	"cs.DL": "Digital Libraries",
	"cs.DM": "Discrete Mathematics",
	"cs.DS": "Data Structures and Algorithms",
	"cs.ET": "Emerging Technologies",
	"cs.FL": "Formal Languages and Automata Theory",
	"cs.GL": "General Literature",
	"cs.GR": "Graphics",
	"cs.GT": "Computer Science and Game Theory",
	"cs.HC": "Human-Computer Interaction",
	"cs.IR": "Information Retrieval",
	"cs.IT": "Information Theory",
	"cs.LG": "Machine Learning",
	"cs.LO": "Logic in Computer Science",
	"cs.MA": "Multiagent Systems",
	"cs.MM": "Multimedia",
	"cs.MS": "Mathematical Software",
	"cs.NA": "Numerical Analysis",
	"cs.NE": "Neural and Evolutionary Computing",
	"cs.NI": "Networking and Internet Architecture",
	"cs.OH": "Other Computer Science",
	"cs.OS": "Operating Systems",
	"cs.PF": "Performance",
	"cs.PL": "Programming Languages",
	"cs.RO": "Robotics",
	"cs.SC": "Symbolic Computation",
	"cs.SD": "Sound",
	"cs.SE": "Software Engineering",
	"cs.SI": "Social and Information Networks",
	"cs.SY": "Systems and Control",
	"dg-ga": "Differential Geometry",
	"econ.EM": "Econometrics",
	"econ.GN": "General Economics",
	"econ.TH": "Theoretical Economics",
	"eess.AS": "Audio and Speech Processing",
	"eess.IV": "Image and Video Processing",
	"eess.SP": "Signal Processing",
	"eess.SY": "Systems and Control",
	"funct-an": "Functional Analysis",
	"gr-qc": "General Relativity and Quantum Cosmology",
	"hep-ex": "High Energy Physics - Experiment",
	"hep-lat": "High Energy Physics - Lattice",
	"hep-ph": "High Energy Physics - Phenomenology",
	"hep-th": "High Energy Physics - Theory",
	"math-ph": "Mathematical Physics",
	"math.AC": "Commutative Algebra",
	"math.AG": "Algebraic Geometry",
	"math.AP": "Analysis of PDEs",
	"math.AT": "Algebraic Topology",
	"math.CA": "Classical Analysis and ODEs",
	"math.CO": "Combinatorics",
	"math.CT": "Category Theory",
	"math.CV": "Complex Variables",
	"math.DG": "Differential Geometry",
	"math.DS": "Dynamical Systems",
	"math.FA": "Functional Analysis",
	"math.GM": "General Mathematics",
	"math.GN": "General Topology",
	"math.GR": "Group Theory",
	"math.GT": "Geometric Topology",
	"math.HO": "History and Overview",
	"math.IT": "Information Theory",
	"math.KT": "K-Theory and Homology",
	"math.LO": "Logic",
	"math.MG": "Metric Geometry",
	"math.MP": "Mathematical Physics",
	"math.NA": "Numerical Analysis",
	"math.NT": "Number Theory",
	"math.OA": "Operator Algebras",
	"math.OC": "Optimization and Control",
	"math.PR": "Probability",
	"math.QA": "Quantum Algebra",
	"math.RA": "Rings and Algebras",
	"math.RT": "Representation Theory",
	"math.SG": "Symplectic Geometry",
	"math.SP": "Spectral Theory",
	"math.ST": "Statistics Theory",
	"mtrl-th": "Materials Theory",
	"nlin.AO": "Adaptation and Self-Organizing Systems",
	"nlin.CD": "Chaotic Dynamics",
	"nlin.CG": "Cellular Automata and Lattice Gases",
	"nlin.PS": "Pattern Formation and Solitons",
	"nlin.SI": "Exactly Solvable and Integrable Systems",
	"nucl-ex": "Nuclear Experiment",
	"nucl-th": "Nuclear Theory",
	"patt-sol": "Pattern Formation and Solitons",
	"physics.acc-ph": "Accelerator Physics",
	"physics.ao-ph": "Atmospheric and Oceanic Physics",
	"physics.app-ph": "Applied Physics",
	"physics.atm-clus": "Atomic and Molecular Clusters",
	"physics.atom-ph": "Atomic Physics",
	"physics.bio-ph": "Biological Physics",
	"physics.chem-ph": "Chemical Physics",
	"physics.class-ph": "Classical Physics",
	"physics.comp-ph": "Computational Physics",
	"physics.data-an": "Data Analysis, Statistics and Probability",
	"physics.ed-ph": "Physics Education",
	"physics.flu-dyn": "Fluid Dynamics",
	"physics.gen-ph": "General Physics",
	"physics.geo-ph": "Geophysics",
	"physics.hist-ph": "History and Philosophy of Physics",
	"physics.ins-det": "Instrumentation and Detectors",
	"physics.med-ph": "Medical Physics",
	"physics.optics": "Optics",
	"physics.plasm-ph": "Plasma Physics",
	"physics.pop-ph": "Popular Physics",
	"physics.soc-ph": "Physics and Society",
	"physics.space-ph": "Space Physics",
	"plasm-ph": "Plasma Physics",
	"q-alg": "Quantum Algebra and Topology",
	"q-bio": "Quantitative Biology",
	"q-bio.BM": "Biomolecules",
	"q-bio.CB": "Cell Behavior",
	"q-bio.GN": "Genomics",
	"q-bio.MN": "Molecular Networks",
	"q-bio.NC": "Neurons and Cognition",
	"q-bio.OT": "Other Quantitative Biology",
	"q-bio.PE": "Populations and Evolution",
	"q-bio.QM": "Quantitative Methods",
	"q-bio.SC": "Subcellular Processes",
	"q-bio.TO": "Tissues and Organs",
	"q-fin.CP": "Computational Finance",
	"q-fin.EC": "Economics",
	"q-fin.GN": "General Finance",
	"q-fin.MF": "Mathematical Finance",
	"q-fin.PM": "Portfolio Management",
	"q-fin.PR": "Pricing of Securities",
	"q-fin.RM": "Risk Management",
	"q-fin.ST": "Statistical Finance",
	"q-fin.TR": "Trading and Market Microstructure",
	"quant-ph": "Quantum Physics",
	"solv-int": "Exactly Solvable and Integrable Systems",
	"stat.AP": "Applications",
	"stat.CO": "Computation",
	"stat.ME": "Methodology",
	"stat.ML": "Machine Learning",
	"stat.OT": "Other Statistics",
	"stat.TH": "Statistics Theory",
	"supr-con": "Superconductivity",
	test: "Test",
	"test.dis-nn": "Test Disruptive Networks",
	"test.mes-hall": "Test Hall",
	"test.mtrl-sci": "Test Mtrl-Sci",
	"test.soft": "Test Soft",
	"test.stat-mech": "Test Mechanics",
	"test.str-el": "Test Electrons",
	"test.supr-con": "Test Superconductivity",
	"bad-arch.bad-cat": "Invalid Category"
};

var version;
// this variable will be set in doWeb and
// can be used then afterwards in the parseXML

function detectSearch(item) {
	return !!item.arXiv;
}

async function doSearch(item) {
	let url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(item.arXiv)}&max_results=1`;
	let doc = await requestAtom(url);
	parseAtom(doc);
}

function detectWeb(doc, url) {
	var searchRe = /^https?:\/\/(?:([^.]+\.))?(?:arxiv\.org|xxx\.lanl\.gov)\/(?:search|find|list|catchup)\b/;
	var relatedDOI = text(doc, '.doi > a');
	if (searchRe.test(url)) {
		return getSearchResults(doc, true/* checkOnly */) && "multiple";
	}
	else if (relatedDOI) {
		return "journalArticle";
	}
	else {
		return "preprint";
	}
}

function getSearchResults(doc, checkOnly = false) {
	if (doc.location.pathname.startsWith('/search/')) {
		return getSearchResultsNew(doc, checkOnly);
	}
	else {
		return getSearchResultsLegacy(doc, checkOnly);
	}
}

// New search results at https://arxiv.org/search/[advanced]
function getSearchResultsNew(doc, checkOnly = false) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll(".arxiv-result");
	for (let row of rows) {
		let id = text(row, ".list-title a").trim().replace(/^arXiv:/, "");
		let title = ZU.trimInternal(text(row, "p.title"));
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found && items;
}

// Listings, catchup, and legacy search results (at https://arxiv.org/find/)
function getSearchResultsLegacy(doc, checkOnly = false) {
	let items = {};
	let found = false;
	let root = doc.querySelector("#dlpage");
	if (!root) return false;
	// Alternating rows of <dt> and <dd> elements
	// NOTE: For listing and legacy search, there's one <dl> per page and the
	// <dt>/<dd> elements are direct children. For catchup, there is a <dl> for
	// each item with a pair of <dt>/<dd> children.
	let dts = root.querySelectorAll("dl > dt");
	let dds = root.querySelectorAll("dl > dd");
	if (dts.length !== dds.length) {
		Z.debug(`Warning: unexpected number of <dt> and <dd> elements: ${dts.length} !== ${dds.length}`);
	}
	let length = Math.min(dts.length, dds.length);
	for (let i = 0; i < length; i++) {
		let id = text(dts[i], "a[title='Abstract']")
			.trim()
			.replace(/^arXiv:/, "");
		let title = ZU.trimInternal(text(dds[i], ".list-title"))
			.replace(/^Title:\s*/, "");
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found && items;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		var items = getSearchResults(doc);
		
		let selectedItems = await Z.selectItems(items);
		if (selectedItems) {
			let apiURL = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(Object.keys(selectedItems).join(','))}`;
			let document = await requestAtom(apiURL);
			parseAtom(document);
		}
	}
	else {
		let id = url.match(/(?:pdf|abs)\/([^?#]+)(?:\.pdf)?/)[1];
		let versionMatch = url.match(/v(\d+)(\.pdf)?([?#].+)?$/);
		if (versionMatch) {
			version = versionMatch[1];
		}

		if (!id) { // Honestly not sure where this might still be needed
			id = text(doc, 'span.arxivid > a');
		}

		if (!id) throw new Error('Could not find arXiv ID on page.');
		// Do not trim version
		//id = id.trim().replace(/^arxiv:\s*|v\d+|\s+.*$/ig, '');
		id = id.trim().replace(/^arxiv:\s*|\s+.*$/ig, '');
		let apiURL = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}&max_results=1`;
		await requestAtom(apiURL).then(parseAtom);
	}
}

// Temp workaround for https://github.com/zotero/zotero-connectors/issues/526
async function requestAtom(url) {
	let text = await requestText(url);
	return new DOMParser().parseFromString(text, 'application/xml');
}

function parseAtom(doc) {
	let entries = doc.querySelectorAll("feed > entry");
	entries.forEach(parseSingleEntry);
}

function parseSingleEntry(entry) {
	let newItem = new Zotero.Item("preprint");

	newItem.title = ZU.trimInternal(text(entry, "title"));
	newItem.date = ZU.strToISO(text(entry, "updated"));
	entry.querySelectorAll(`author > name`).forEach(node => newItem.creators.push(ZU.cleanAuthor(node.textContent, 'author', false)));

	newItem.abstractNote = ZU.trimInternal(text(entry, "summary"));

	let comments = entry.querySelectorAll("comment");

	for (let comment of comments) {
		let noteStr = ZU.trimInternal(comment.textContent);
		newItem.notes.push({ note: `Comment: ${noteStr}` });
	}

	let categories = Array.from(entry.querySelectorAll("category"))
		.map(el => el.getAttribute("term"))
		.map((sub) => {
			let mainCat = sub.split('.')[0];
			if (mainCat !== sub && arXivCategories[mainCat]) {
				return arXivCategories[mainCat] + " - " + arXivCategories[sub];
			}
			else {
				return arXivCategories[sub];
			}
		})
		.filter(Boolean);
	newItem.tags.push(...categories);

	let arxivURL = text(entry, "id").replace(/v\d+/, '');
	let doi = text(entry, "doi");
	if (doi) {
		newItem.DOI = doi;
	}
	newItem.url = arxivURL;

	let articleID = arxivURL.match(/\/abs\/(.+)$/)[1];

	let articleField = attr(entry, "primary_category", "term").replace(/^.+?:/, "").replace(/\..+?$/, "");
	if (articleField) articleField = "[" + articleField + "]";

	if (articleID && articleID.includes("/")) {
		newItem.extra = "arXiv:" + articleID;
	}
	else {
		newItem.extra = "arXiv:" + articleID + " " + articleField;
	}

	let pdfURL = attr(entry, "link[title='pdf']", "href");

	newItem.attachments.push({
		title: "Preprint PDF",
		url: pdfURL,
		mimeType: "application/pdf"
	});
	newItem.attachments.push({
		title: "Snapshot",
		url: newItem.url,
		mimeType: "text/html"
	});

	// retrieve and supplement publication data for published articles via DOI
	if (newItem.DOI) {
		var translate = Zotero.loadTranslator("search");
		// DOI Content Negotiation
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");

		var item = { itemType: "journalArticle", DOI: newItem.DOI };
		translate.setSearch(item);
		translate.setHandler("itemDone", function (obj, item) {
			newItem.itemType = item.itemType;
			newItem.volume = item.volume;
			newItem.issue = item.issue;
			newItem.pages = item.pages;
			newItem.date = item.date;
			newItem.ISSN = item.ISSN;
			if (item.publicationTitle) {
				newItem.publicationTitle = item.publicationTitle;
				newItem.journalAbbreviation = item.journalAbbreviation;
			}
			newItem.date = item.date;
		});
		translate.setHandler("done", function () {
			newItem.complete();
		});
		translate.setHandler("error", function () { });
		translate.translate();
	}
	else {
		newItem.publisher = "arXiv";
		newItem.number = "arXiv:" + articleID;
		if (version) {
			newItem.extra += '\nversion: ' + version;
		}
		// https://blog.arxiv.org/2022/02/17/new-arxiv-articles-are-now-automatically-assigned-dois/
		newItem.DOI = "10.48550/arXiv." + articleID;
		newItem.archiveID = "arXiv:" + articleID;
		newItem.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://arxiv.org/list/astro-ph/new",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/1107.4612",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Model For Polarised Microwave Foreground Emission From Interstellar Dust",
				"creators": [
					{
						"firstName": "D. T.",
						"lastName": "O'Dea",
						"creatorType": "author"
					},
					{
						"firstName": "C. N.",
						"lastName": "Clark",
						"creatorType": "author"
					},
					{
						"firstName": "C. R.",
						"lastName": "Contaldi",
						"creatorType": "author"
					},
					{
						"firstName": "C. J.",
						"lastName": "MacTavish",
						"creatorType": "author"
					}
				],
				"date": "2012-01-11",
				"DOI": "10.1111/j.1365-2966.2011.19851.x",
				"ISSN": "00358711",
				"abstractNote": "The upcoming generation of cosmic microwave background (CMB) experiments face a major challenge in detecting the weak cosmic B-mode signature predicted as a product of primordial gravitational waves. To achieve the required sensitivity these experiments must have impressive control of systematic effects and detailed understanding of the foreground emission that will influence the signal. In this paper, we present templates of the intensity and polarisation of emission from one of the main Galactic foregrounds, interstellar dust. These are produced using a model which includes a 3D description of the Galactic magnetic field, examining both large and small scales. We also include in the model the details of the dust density, grain alignment and the intrinsic polarisation of the emission from an individual grain. We present here Stokes parameter template maps at 150GHz and provide an on-line repository (http://www.imperial.ac.uk/people/c.contaldi/fgpol) for these and additional maps at frequencies that will be targeted by upcoming experiments such as EBEX, Spider and SPTpol.",
				"extra": "arXiv:1107.4612 [astro-ph]",
				"issue": "2",
				"libraryCatalog": "arXiv.org",
				"pages": "1795-1803",
				"publicationTitle": "Monthly Notices of the Royal Astronomical Society",
				"url": "http://arxiv.org/abs/1107.4612",
				"volume": "419",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Astrophysics - Astrophysics of Galaxies"
					},
					{
						"tag": "Astrophysics - Cosmology and Nongalactic Astrophysics"
					}
				],
				"notes": [
					{
						"note": "Comment: 7 pages, 4 figures"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/astro-ph/0603274",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Properties of the $δ$ Scorpii Circumstellar Disk from Continuum Modeling",
				"creators": [
					{
						"firstName": "A. C.",
						"lastName": "Carciofi",
						"creatorType": "author"
					},
					{
						"firstName": "A. S.",
						"lastName": "Miroshnichenko",
						"creatorType": "author"
					},
					{
						"firstName": "A. V.",
						"lastName": "Kusakin",
						"creatorType": "author"
					},
					{
						"firstName": "J. E.",
						"lastName": "Bjorkman",
						"creatorType": "author"
					},
					{
						"firstName": "K. S.",
						"lastName": "Bjorkman",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "Marang",
						"creatorType": "author"
					},
					{
						"firstName": "K. S.",
						"lastName": "Kuratov",
						"creatorType": "author"
					},
					{
						"firstName": "P. Garcí",
						"lastName": "a-Lario",
						"creatorType": "author"
					},
					{
						"firstName": "J. V. Perea",
						"lastName": "Calderón",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Fabregat",
						"creatorType": "author"
					},
					{
						"firstName": "A. M.",
						"lastName": "Magalhães",
						"creatorType": "author"
					}
				],
				"date": "12/2006",
				"DOI": "10.1086/507935",
				"ISSN": "0004-637X, 1538-4357",
				"abstractNote": "We present optical $WBVR$ and infrared $JHKL$ photometric observations of the Be binary system $\\delta$ Sco, obtained in 2000--2005, mid-infrared (10 and $18 \\mu$m) photometry and optical ($\\lambda\\lambda$ 3200--10500 \\AA) spectropolarimetry obtained in 2001. Our optical photometry confirms the results of much more frequent visual monitoring of $\\delta$ Sco. In 2005, we detected a significant decrease in the object's brightness, both in optical and near-infrared brightness, which is associated with a continuous rise in the hydrogen line strenghts. We discuss possible causes for this phenomenon, which is difficult to explain in view of current models of Be star disks. The 2001 spectral energy distribution and polarization are succesfully modeled with a three-dimensional non-LTE Monte Carlo code which produces a self-consistent determination of the hydrogen level populations, electron temperature, and gas density for hot star disks. Our disk model is hydrostatically supported in the vertical direction and radially controlled by viscosity. Such a disk model has, essentially, only two free parameters, viz., the equatorial mass loss rate and the disk outer radius. We find that the primary companion is surrounded by a small (7 $R_\\star$), geometrically-thin disk, which is highly non-isothermal and fully ionized. Our model requires an average equatorial mass loss rate of $1.5\\times 10^{-9} M_{\\sun}$ yr$^{-1}$.",
				"extra": "arXiv:astro-ph/0603274",
				"issue": "2",
				"journalAbbreviation": "ApJ",
				"libraryCatalog": "arXiv.org",
				"pages": "1617-1625",
				"publicationTitle": "The Astrophysical Journal",
				"url": "http://arxiv.org/abs/astro-ph/0603274",
				"volume": "652",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Astrophysics"
					}
				],
				"notes": [
					{
						"note": "Comment: 27 pages, 9 figures, submitted to ApJ"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/1307.1469",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Precision of a Low-Cost InGaAs Detector for Near Infrared Photometry",
				"creators": [
					{
						"firstName": "Peter W.",
						"lastName": "Sullivan",
						"creatorType": "author"
					},
					{
						"firstName": "Bryce",
						"lastName": "Croll",
						"creatorType": "author"
					},
					{
						"firstName": "Robert A.",
						"lastName": "Simcoe",
						"creatorType": "author"
					}
				],
				"date": "09/2013",
				"DOI": "10.1086/672573",
				"ISSN": "00046280, 15383873",
				"abstractNote": "We have designed, constructed, and tested an InGaAs near-infrared camera to explore whether low-cost detectors can make small (<1 m) telescopes capable of precise (<1 mmag) infrared photometry of relatively bright targets. The camera is constructed around the 640x512 pixel APS640C sensor built by FLIR Electro-Optical Components. We designed custom analog-to-digital electronics for maximum stability and minimum noise. The InGaAs dark current halves with every 7 deg C of cooling, and we reduce it to 840 e-/s/pixel (with a pixel-to-pixel variation of +/-200 e-/s/pixel) by cooling the array to -20 deg C. Beyond this point, glow from the readout dominates. The single-sample read noise of 149 e- is reduced to 54 e- through up-the-ramp sampling. Laboratory testing with a star field generated by a lenslet array shows that 2-star differential photometry is possible to a precision of 631 +/-205 ppm (0.68 mmag) hr^-0.5 at a flux of 2.4E4 e-/s. Employing three comparison stars and de-correlating reference signals further improves the precision to 483 +/-161 ppm (0.52 mmag) hr^-0.5. Photometric observations of HD80606 and HD80607 (J=7.7 and 7.8) in the Y band shows that differential photometry to a precision of 415 ppm (0.45 mmag) hr^-0.5 is achieved with an effective telescope aperture of 0.25 m. Next-generation InGaAs detectors should indeed enable Poisson-limited photometry of brighter dwarfs with particular advantage for late-M and L types. In addition, one might acquire near-infrared photometry simultaneously with optical photometry or radial velocity measurements to maximize the return of exoplanet searches with small telescopes.",
				"extra": "arXiv:1307.1469 [astro-ph]",
				"issue": "931",
				"journalAbbreviation": "Publications of the Astronomical Society of the Pacific",
				"libraryCatalog": "arXiv.org",
				"pages": "1021-1030",
				"publicationTitle": "Publications of the Astronomical Society of the Pacific",
				"url": "http://arxiv.org/abs/1307.1469",
				"volume": "125",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Astrophysics - Earth and Planetary Astrophysics"
					},
					{
						"tag": "Astrophysics - Instrumentation and Methods for Astrophysics"
					}
				],
				"notes": [
					{
						"note": "Comment: Accepted to PASP"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/find/cs/1/au:+Hoffmann_M/0/1/0/all/0/1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://arxiv.org/pdf/1402.1516",
		"items": [
			{
				"itemType": "preprint",
				"title": "A dual pair for free boundary fluids",
				"creators": [
					{
						"firstName": "Francois",
						"lastName": "Gay-Balmaz",
						"creatorType": "author"
					},
					{
						"firstName": "Cornelia",
						"lastName": "Vizman",
						"creatorType": "author"
					}
				],
				"date": "2014-02-06",
				"DOI": "10.48550/arXiv.1402.1516",
				"abstractNote": "We construct a dual pair associated to the Hamiltonian geometric formulation of perfect fluids with free boundaries. This dual pair is defined on the cotangent bundle of the space of volume preserving embeddings of a manifold with boundary into a boundaryless manifold of the same dimension. The dual pair properties are rigorously verified in the infinite dimensional Fr\\'echet manifold setting. It provides an example of a dual pair associated to actions that are not completely mutually orthogonal.",
				"archiveID": "arXiv:1402.1516",
				"extra": "arXiv:1402.1516 [math]",
				"libraryCatalog": "arXiv.org",
				"repository": "arXiv",
				"url": "http://arxiv.org/abs/1402.1516",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Mathematical Physics"
					},
					{
						"tag": "Mathematics - Mathematical Physics"
					},
					{
						"tag": "Mathematics - Symplectic Geometry"
					}
				],
				"notes": [
					{
						"note": "Comment: 17 pages"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/1810.04805v1",
		"items": [
			{
				"itemType": "preprint",
				"title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
				"creators": [
					{
						"firstName": "Jacob",
						"lastName": "Devlin",
						"creatorType": "author"
					},
					{
						"firstName": "Ming-Wei",
						"lastName": "Chang",
						"creatorType": "author"
					},
					{
						"firstName": "Kenton",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Kristina",
						"lastName": "Toutanova",
						"creatorType": "author"
					}
				],
				"date": "2018-10-11",
				"DOI": "10.48550/arXiv.1810.04805",
				"abstractNote": "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT representations can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference, without substantial task-specific architecture modifications. BERT is conceptually simple and empirically powerful. It obtains new state-of-the-art results on eleven natural language processing tasks, including pushing the GLUE benchmark to 80.4% (7.6% absolute improvement), MultiNLI accuracy to 86.7 (5.6% absolute improvement) and the SQuAD v1.1 question answering Test F1 to 93.2 (1.5% absolute improvement), outperforming human performance by 2.0%.",
				"archiveID": "arXiv:1810.04805",
				"extra": "arXiv:1810.04805 [cs]\nversion: 1",
				"libraryCatalog": "arXiv.org",
				"repository": "arXiv",
				"shortTitle": "BERT",
				"url": "http://arxiv.org/abs/1810.04805",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Computer Science - Computation and Language"
					}
				],
				"notes": [
					{
						"note": "Comment: 13 pages"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/1810.04805v2",
		"items": [
			{
				"itemType": "preprint",
				"title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
				"creators": [
					{
						"firstName": "Jacob",
						"lastName": "Devlin",
						"creatorType": "author"
					},
					{
						"firstName": "Ming-Wei",
						"lastName": "Chang",
						"creatorType": "author"
					},
					{
						"firstName": "Kenton",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Kristina",
						"lastName": "Toutanova",
						"creatorType": "author"
					}
				],
				"date": "2019-05-24",
				"DOI": "10.48550/arXiv.1810.04805",
				"abstractNote": "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference, without substantial task-specific architecture modifications. BERT is conceptually simple and empirically powerful. It obtains new state-of-the-art results on eleven natural language processing tasks, including pushing the GLUE score to 80.5% (7.7% point absolute improvement), MultiNLI accuracy to 86.7% (4.6% absolute improvement), SQuAD v1.1 question answering Test F1 to 93.2 (1.5 point absolute improvement) and SQuAD v2.0 Test F1 to 83.1 (5.1 point absolute improvement).",
				"archiveID": "arXiv:1810.04805",
				"extra": "arXiv:1810.04805 [cs]\nversion: 2",
				"libraryCatalog": "arXiv.org",
				"repository": "arXiv",
				"shortTitle": "BERT",
				"url": "http://arxiv.org/abs/1810.04805",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Computer Science - Computation and Language"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/2201.00738",
		"items": [
			{
				"itemType": "preprint",
				"title": "Single Phonon Detection for Dark Matter via Quantum Evaporation and Sensing of $^3$Helium",
				"creators": [
					{
						"firstName": "S. A.",
						"lastName": "Lyon",
						"creatorType": "author"
					},
					{
						"firstName": "Kyle",
						"lastName": "Castoria",
						"creatorType": "author"
					},
					{
						"firstName": "Ethan",
						"lastName": "Kleinbaum",
						"creatorType": "author"
					},
					{
						"firstName": "Zhihao",
						"lastName": "Qin",
						"creatorType": "author"
					},
					{
						"firstName": "Arun",
						"lastName": "Persaud",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Schenkel",
						"creatorType": "author"
					},
					{
						"firstName": "Kathryn",
						"lastName": "Zurek",
						"creatorType": "author"
					}
				],
				"date": "2023-02-07",
				"DOI": "10.48550/arXiv.2201.00738",
				"abstractNote": "Dark matter is five times more abundant than ordinary visible matter in our Universe. While laboratory searches hunting for dark matter have traditionally focused on the electroweak scale, theories of low mass hidden sectors motivate new detection techniques. Extending these searches to lower mass ranges, well below 1 GeV/c$^2$, poses new challenges as rare interactions with standard model matter transfer progressively less energy to electrons and nuclei in detectors. Here, we propose an approach based on phonon-assisted quantum evaporation combined with quantum sensors for detection of desorption events via tracking of spin coherence. The intent of our proposed dark matter sensors is to extend the parameter space to energy transfers in rare interactions to as low as a few meV for detection of dark matter particles in the keV/c$^2$ mass range.",
				"archiveID": "arXiv:2201.00738",
				"extra": "arXiv:2201.00738 [hep-ex]",
				"libraryCatalog": "arXiv.org",
				"repository": "arXiv",
				"url": "http://arxiv.org/abs/2201.00738",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Condensed Matter - Mesoscale and Nanoscale Physics"
					},
					{
						"tag": "High Energy Physics - Experiment"
					},
					{
						"tag": "Quantum Physics"
					}
				],
				"notes": [
					{
						"note": "Comment: 8 pages, 3 figures. Updated various parts"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/search/advanced?advanced=&terms-0-operator=AND&terms-0-term=%22desire+production%22&terms-0-field=all&classification-physics_archives=all&classification-include_cross_list=exclude&date-year=&date-filter_by=date_range&date-from_date=2005-01-01&date-to_date=2008-12-31&date-date_type=submitted_date&abstracts=show&size=50&order=-announced_date_first",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://arxiv.org/search/?query=australopithecus&searchtype=title&abstracts=show&order=-announced_date_first&size=25",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "search",
		"input": {
			"arXiv": "math/0211159"
		},
		"items": [
			{
				"itemType": "preprint",
				"title": "The entropy formula for the Ricci flow and its geometric applications",
				"creators": [
					{
						"firstName": "Grisha",
						"lastName": "Perelman",
						"creatorType": "author"
					}
				],
				"date": "2002-11-11",
				"DOI": "10.48550/arXiv.math/0211159",
				"abstractNote": "We present a monotonic expression for the Ricci flow, valid in all dimensions and without curvature assumptions. It is interpreted as an entropy for a certain canonical ensemble. Several geometric applications are given. In particular, (1) Ricci flow, considered on the space of riemannian metrics modulo diffeomorphism and scaling, has no nontrivial periodic orbits (that is, other than fixed points); (2) In a region, where singularity is forming in finite time, the injectivity radius is controlled by the curvature; (3) Ricci flow can not quickly turn an almost euclidean region into a very curved one, no matter what happens far away. We also verify several assertions related to Richard Hamilton's program for the proof of Thurston geometrization conjecture for closed three-manifolds, and give a sketch of an eclectic proof of this conjecture, making use of earlier results on collapsing with local lower curvature bound.",
				"archiveID": "arXiv:math/0211159",
				"extra": "arXiv:math/0211159",
				"libraryCatalog": "arXiv.org",
				"repository": "arXiv",
				"url": "http://arxiv.org/abs/math/0211159",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Mathematics - Differential Geometry"
					}
				],
				"notes": [
					{
						"note": "Comment: 39 pages"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arxiv.org/abs/2305.16311#",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Break-A-Scene: Extracting Multiple Concepts from a Single Image",
				"creators": [
					{
						"firstName": "Omri",
						"lastName": "Avrahami",
						"creatorType": "author"
					},
					{
						"firstName": "Kfir",
						"lastName": "Aberman",
						"creatorType": "author"
					},
					{
						"firstName": "Ohad",
						"lastName": "Fried",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Cohen-Or",
						"creatorType": "author"
					},
					{
						"firstName": "Dani",
						"lastName": "Lischinski",
						"creatorType": "author"
					}
				],
				"date": "2023-12-10",
				"DOI": "10.1145/3610548.3618154",
				"abstractNote": "Text-to-image model personalization aims to introduce a user-provided concept to the model, allowing its synthesis in diverse contexts. However, current methods primarily focus on the case of learning a single concept from multiple images with variations in backgrounds and poses, and struggle when adapted to a different scenario. In this work, we introduce the task of textual scene decomposition: given a single image of a scene that may contain several concepts, we aim to extract a distinct text token for each concept, enabling fine-grained control over the generated scenes. To this end, we propose augmenting the input image with masks that indicate the presence of target concepts. These masks can be provided by the user or generated automatically by a pre-trained segmentation model. We then present a novel two-phase customization process that optimizes a set of dedicated textual embeddings (handles), as well as the model weights, striking a delicate balance between accurately capturing the concepts and avoiding overfitting. We employ a masked diffusion loss to enable handles to generate their assigned concepts, complemented by a novel loss on cross-attention maps to prevent entanglement. We also introduce union-sampling, a training strategy aimed to improve the ability of combining multiple concepts in generated images. We use several automatic metrics to quantitatively compare our method against several baselines, and further affirm the results using a user study. Finally, we showcase several applications of our method. Project page is available at: https://omriavrahami.com/break-a-scene/",
				"extra": "arXiv:2305.16311 [cs]",
				"libraryCatalog": "arXiv.org",
				"pages": "1-12",
				"proceedingsTitle": "SIGGRAPH Asia 2023 Conference Papers",
				"shortTitle": "Break-A-Scene",
				"url": "http://arxiv.org/abs/2305.16311",
				"attachments": [
					{
						"title": "Preprint PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Computer Science - Computer Vision and Pattern Recognition"
					},
					{
						"tag": "Computer Science - Graphics"
					},
					{
						"tag": "Computer Science - Machine Learning"
					}
				],
				"notes": [
					{
						"note": "Comment: SIGGRAPH Asia 2023. Project page: at: https://omriavrahami.com/break-a-scene/ Video: https://www.youtube.com/watch?v=-9EA-BhizgM"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
