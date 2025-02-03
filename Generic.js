{
	"translatorID": "7b09d360-409f-4663-b1ca-248d6c488a9d",
	"label": "Generic",
	"creator": "Martynas Bagdonas",
	"target": "",
	"minVersion": "5.0.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-21 19:44:53"
}

function detectWeb(doc, url) {
	// TODO: Make some kind of item count guessing logic to prevent always returning 'multiple'
	return 'multiple';
}

/**
 * Clean invalid parentheses
 *
 * I.e "(10.1016/s1474-5151(03)00108-7)" is extracted as "10.1016/s1474-5151(03)00108-7)"
 * and this functions fixes it to "10.1016/s1474-5151(03)00108-7"
 * @param text
 * @return {string}
 */
function cleanInvalidParentheses(text) {
	let text2 = '';
	let depth = 0;
	for (let c of text) {
		if ([']', ')', '}'].includes(c)) {
			depth--;
			if (depth < 0) break;
		}
		if (['[', '(', '{'].includes(c)) {
			depth++;
		}
		text2 += c;
	}
	return text2;
}

/**
 * Extract DOIs from the URL
 *
 * @param url
 * @return {Array}
 */
function getUrlDois(url) {
	let dois = [];
	
	// Extract DOIs from the current URL
	let re = /10.[0-9]{4,}?\/[^\s&?#,]*[^\s&?#\/.,]/g;
	let m;
	while (m = re.exec(decodeURIComponent(url))) {
		let doi = m[0];
		// ASCII letters in DOI are case insensitive
		doi = doi.split('').map(c => (c >= 'A' && c <= 'Z') ? c.toLowerCase() : c).join('');
		if (!dois.includes(doi)) {
			dois.push(doi);
		}
	}
	
	return dois;
}

/**
 * Extract DOIs from text nodes (visible text) in the whole document.
 * Because it's very unlikely to encounter the correct DOI in attributes
 * but not in the visible text
 *
 * @param doc
 * @return {Array}
 */
function getVisibleDois(doc) {
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;
	const DOIXPath = "//text()[contains(., '10.')]\
						[not(parent::script or parent::style)]";
	
	let dois = [];
	
	let node, m;
	let results = doc.evaluate(DOIXPath, doc, null, XPathResult.ANY_TYPE, null);
	while (node = results.iterateNext()) {
		DOIre.lastMatch = 0;
		while (m = DOIre.exec(node.nodeValue)) {
			let doi = m[0];
			doi = cleanInvalidParentheses(doi);
			
			// Normalize by lowercasing ASCII letters
			doi = doi.split('').map(c => (c >= 'A' && c <= 'Z') ? c.toLowerCase() : c).join('');
			
			// Only add new DOIs
			if (!dois.includes(doi)) {
				dois.push(doi);
			}
		}
	}
	
	return dois;
}

/**
 * Extract DOIs from the HEAD.
 * We could get a DOI from the EM translator returned DOI field,
 * but in this direct way we are extracting DOIs in whatever way they are provided
 *
 * @param doc
 * @return {Array}
 */
function getHeadDois(doc) {
	let dois = [];
	
	let re = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;
	let text = doc.head.innerHTML;
	
	let m;
	while (m = re.exec(text)) {
		let doi = m[0];
		doi = cleanInvalidParentheses(doi);
		
		// Normalize by lowercasing ASCII letters
		doi = doi.split('').map(c => (c >= 'A' && c <= 'Z') ? c.toLowerCase() : c).join('');
		
		// Only add new DOIs
		if (!dois.includes(doi)) {
			dois.push(doi);
		}
	}
	
	return dois;
}

function matchTitle(text, pattern) {
	text = Zotero.Utilities.asciify(text).toLowerCase();
	pattern = Zotero.Utilities.asciify(pattern).toLowerCase();
	
	if (text.length < pattern.length) {
		pattern = pattern.slice(0, text.length);
	}
	
	let charsMin = 18;
	let charsPerError = 2;
	
	if (pattern.length < charsMin) return false;
	
	let errors = Math.floor((pattern.length - charsMin) / charsPerError);
	let matches = Zotero.Utilities.approximateMatch(text, pattern, errors);
	return !!matches.length;
}

/**
 * Get titles that are representing the main entity of the page
 * @param doc
 * @return {Array}
 */
function getPotentialTitles(doc) {
	let titles = [];
	
	titles.push(doc.title);
	
	let nodes = doc.querySelectorAll('h1');
	for (let node of nodes) {
		titles.push(node.textContent);
	}
	
	nodes = doc.querySelectorAll('h2');
	if (nodes.length === 1) {
		titles.push(nodes[0].textContent);
	}
	
	nodes = doc.querySelectorAll('h3');
	if (nodes.length === 1) {
		titles.push(nodes[0].textContent);
	}
	
	return titles;
}

// DOI
async function getDoiItem(doi) {
	try {
		let translator = Zotero.loadTranslator("search");
		translator.setTranslator('b28d0d42-8549-4c6d-83fc-8382874a5cb9');
		translator.setSearch({"itemType": "journalArticle", "DOI": doi});
		translator.setHandler("itemDone", function (obj, item) {
		});
		translator.setHandler('error', function () {
		});
		return (await translator.translate())[0];
	}
	catch (err) {
	
	}
	return null;
}

// Embedded Metadata
async function getEmItem(doc) {
	try {
		let translator = Zotero.loadTranslator("web");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (obj, item) {
		});
		translator.setHandler('error', function () {
		});
		return (await translator.translate())[0];
	}
	catch (err) {
	
	}
	return null;
}

// COinS
async function getCoinsItems(doc) {
	try {
		let translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (obj, item) {
		});
		translator.setHandler('error', function () {
		});
		return await translator.translate();
	}
	catch (err) {
	}
	return [];
}

// unAPI
async function getUnapiItems(doc) {
	try {
		let translator = Zotero.loadTranslator("web");
		translator.setTranslator("e7e01cac-1e37-4da6-b078-a0e8343b0e98");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (obj, item) {
		});
		translator.setHandler('error', function () {
		});
		return await translator.translate();
	}
	catch (err) {
	}
	return [];
}

// Linked Metadata
async function getLmItems(doc) {
	try {
		let translator = Zotero.loadTranslator("web");
		translator.setTranslator("02378e28-8a35-440c-b5d2-7eaca74615b6");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (obj, item) {
		});
		translator.setHandler('error', function () {
		});
		return await translator.translate();
	}
	catch (err) {
	}
	return [];
}

// JSON-LD
async function getJsonldItems(doc) {
	try {
		let translator = Zotero.loadTranslator("web");
		translator.setTranslator("5ea2edd6-b836-490a-841f-d9274da308f9");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (obj, item) {
		});
		translator.setHandler('error', function () {
		});
		return await translator.translate();
	}
	catch (err) {
	}
	return [];
}

/**
 * Combine two items
 *
 * @param existingItem
 * @param newItem
 * @return {Zotero.Item}
 */
function combineItems(existingItem, newItem) {
	if (existingItem.itemType === 'webpage' && newItem.itemType !== 'webpage') {
		Zotero.debug('Switching to item type ' + newItem.itemType);
		existingItem.itemType = newItem.itemType;
	}

	for (let fieldName in newItem) {
		if (
			Zotero.Utilities.fieldIsValidForType(fieldName, existingItem.itemType) ||
			['attachments', 'creators', 'tags', 'notes'].includes(fieldName)
		) {
			// Add all newItem fields that doesn't exist in existingItem or
			// string/array length is higher
			// Todo: Implement a smarter logic
			if (
				!existingItem[fieldName] ||
				existingItem[fieldName].length < newItem[fieldName].length
			) {
				existingItem[fieldName] = newItem[fieldName];
			}
		}
	}
	
	return existingItem;
}

/**
 * Match multiple items and combine their fields.
 * Return only unique items
 *
 * @param existingItems
 * @param newItems
 * @param single
 */
function combineMultipleItems(existingItems, newItems, single) {
	// Todo: Optimize
	let additionalItems = [];
	for (let newItem of newItems) {
		let matched = false;
		for (let existingItem of existingItems) {
			// Currently this is only matching item titles, and while that works quite well,
			// it would be good to utilize other fields too.
			// Some pages can even have multiple items with very similar titles i.e.
			// "Introdution 1", "1. Introduction", "Introduction IV", etc.
			if (
				existingItem.title &&
				newItem.title &&
				matchTitle(existingItem.title, newItem.title)
			) {
				combineItems(existingItem, newItem);
				matched = true;
			}
		}
		
		// If not in the single mode, and the item is not matched, add it
		if (!matched && !single) {
			additionalItems.push(newItem);
		}
	}
	
	existingItems.push(...additionalItems);
}

/**
 * Try to match each item with potential titles
 *
 * @param titles
 * @param items
 * @return {Array}
 */
function matchItemsWithTitles(titles, items) {
	let matchedItems = [];
	// Todo: Optimize
	for (let item of items) {
		for (let title of titles) {
			Zotero.debug(`Trying to match titles '${item.title}' and '${title}'`);
			if (title && item.title && matchTitle(title, item.title)) {
				Zotero.debug(`Matched '${item.title}' and '${title}'`);
					matchedItems.push(item);
					break;
			}
		}
	}
	
	return matchedItems;
}

async function doWeb(doc, url) {
	// TODO: Parallelize
	// Get all potential titles to match the main item
	let potentialTitles = getPotentialTitles(doc);
	
	// Get DOIs from the web page URL
	let urlDois = getUrlDois(url);
	// Get DOIs from the document HEAD - we trust metadata in the HEAD more than in the BODY
	let headDois = getHeadDois(doc);
	// Get DOIs from document text nodes - visible text
	let visibleDois = getVisibleDois(doc);
	// If we have DOIs in the HEAD, use those
	let documentDois = headDois.length ? headDois : visibleDois;
	
	// Combine all DOIs and filter the unique ones
	let allDois = [...new Set([...urlDois, ...documentDois])];
	
	// Try to get the main item of the page
	let mainItem;
	
	// Try to get the main item from the Embedded Metadata translator,
	// if it has a title (EM translator must not to use document.title
	// and should only extract quality metadata)
	let emItem = await getEmItem(doc);
	if (emItem && emItem.title) {
		mainItem = emItem;
	}
	
	// Try to get the main item by using the DOI in the URL
	if (!mainItem && urlDois.length === 1) {
		mainItem = await getDoiItem(urlDois[0]);
	}
	
	// Try to get the main item from the DOI in the EM item
	if (!mainItem && emItem && emItem.DOI) {
		mainItem = await getDoiItem(emItem.DOI);
	}
	
	// Translate items by using various generic translators.
	// All of the child translators can theoretically return multiple items,
	// although for some of them it's more common than for others
	// But none of them can 100% determine which item is the main item of the page.
	// Therefore later we are trying to match items with the page title
	
	// Fetch metadata for all DOIs. TODO: Optimize
	let doiItems = (await Promise.all(allDois.map(async doi => await getDoiItem(doi)))).filter(x => x);
	// COinS translator can fetch DOI metadata by itself,
	// which results to duplicated requests for some DOIs. TODO: Optimize
	let coinsItems = await getCoinsItems(doc);
	let unapiItems = await getUnapiItems(doc);
	// Linked Metadata translator normally returns single item, but
	// the translators behind the LM translator are capable for multiple items too.
	// Therefore we treat it as multiple
	let lmItems = await getLmItems(doc);
	// JSON-LD translator can return multiple items and we don't know which one is the main one.
	// Although, theoretically, schema.org keywords `mainEntity` and `mainEntityOfPage`
	// can be utilized
	let jsonldItems = await getJsonldItems(doc);
	
	// Make item groups from the items returned from different translators
	let itemGroups = [
		doiItems,
		coinsItems,
		unapiItems,
		lmItems,
		jsonldItems
	];
	
	// Try to determine the main item by matching items from each group with the potential titles
	if (!mainItem) {
		for (let itemGroup of itemGroups) {
			let matchedItems = matchItemsWithTitles(potentialTitles, itemGroup);
			if (matchedItems.length === 1) {
				mainItem = matchedItems[0];
				break;
			}
			else if (matchedItems.length > 1) {
				// Something is wrong, multiple items were matched
				break;
			}
		}
	}
	
	let single = false;
	let items = [];
	
	// If the main item exists, we are in the single item mode, otherwise multiple
	if (mainItem) {
		single = true;
		items = [mainItem];
	}
	
	// Try to match and combine items from all groups:
	// 1) In the single item mode try to enrich its fields
	//    with the items matched in other groups
	// 2) In the multi item mode try to match and enrich multiple and unique items
	for (let itemGroup of itemGroups) {
		combineMultipleItems(items, itemGroup, single);
	}
	
	Zotero.debug(JSON.stringify({
		url,
		urlDois,
		headDois,
		visibleDois,
		emItem,
		mainItem,
		coinsItems,
		unapiItems,
		lmItems,
		jsonldItems
	}, null, 2));
	
	for (let item of items) {
		item.complete();
	}
}

var exports = {
	"doWeb": doWeb,
	"detectWeb": detectWeb
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://apnews.com/article/nebraska-libraries-obscenity-bill-2dc43c6f4f1bc602a02d7bb66b6d137f",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "A Nebraska bill to subject librarians to charges for giving 'obscene material' to children fails",
				"creators": [
					{
						"firstName": "MARGERY A.",
						"lastName": "BECK",
						"creatorType": "author"
					}
				],
				"date": "2024-03-20T21:30:38Z",
				"abstractNote": "A bill that would have held school librarians and teachers criminally responsible for providing “obscene material” to Nebraska students in grades K-12 failed to advance Wednesday in the Legislature. State Sen. Joni Albrecht, who introduced the bill, said it simply would close a “loophole” in the state’s existing obscenity laws that prohibit adults from giving such material to minors. But critics panned it as a way for a vocal minority to ban books they don’t like from school and public library shelves. The heated debate over the bill led the body’s Republican Speaker of the Legislature to slash debate times in half on bills he deemed as covering “social issues” for the remaining 13 days of the session.",
				"language": "en",
				"libraryCatalog": "apnews.com",
				"publicationTitle": "AP News",
				"section": "U.S. News",
				"url": "https://apnews.com/article/nebraska-libraries-obscenity-bill-2dc43c6f4f1bc602a02d7bb66b6d137f",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Censorship"
					},
					{
						"tag": "Children"
					},
					{
						"tag": "Education"
					},
					{
						"tag": "General news"
					},
					{
						"tag": "Law enforcement"
					},
					{
						"tag": "Nebraska"
					},
					{
						"tag": "Political debates"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Sex education"
					},
					{
						"tag": "U.S. News"
					},
					{
						"tag": "U.S. news"
					},
					{
						"tag": "a"
					},
					{
						"tag": "n"
					},
					{
						"tag": "nebraska libraries obscenity bill"
					},
					{
						"tag": "p"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"creators": [
					{
						"firstName": "Akinwumi A.",
						"lastName": "Akinyede",
						"creatorType": "author"
					},
					{
						"firstName": "Alade",
						"lastName": "Akintonwa",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Okany",
						"creatorType": "author"
					},
					{
						"firstName": "Olufunsho",
						"lastName": "Awodele",
						"creatorType": "author"
					},
					{
						"firstName": "Duro C.",
						"lastName": "Dolapo",
						"creatorType": "author"
					},
					{
						"firstName": "Adebimpe",
						"lastName": "Adeyinka",
						"creatorType": "author"
					},
					{
						"firstName": "Ademola",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2011/10/17",
				"DOI": "10.4314/thrb.v13i4.63347",
				"ISSN": "1821-9241",
				"abstractNote": "The synergistic interaction between Human Immunodeficiency virus (HIV) disease and Malaria makes it mandatory for patients with HIV to respond appropriately in preventing and treating malaria. Such response will help to control the two diseases. This study assessed the knowledge of 495 patients attending the HIV clinic, in Lagos University Teaching Hospital, Nigeria.&nbsp; Their treatment seeking, preventive practices with regards to malaria, as well as the impact of socio &ndash; demographic / socio - economic status were assessed. Out of these patients, 245 (49.5 %) used insecticide treated bed nets; this practice was not influenced by socio &ndash; demographic or socio &ndash; economic factors.&nbsp; However, knowledge of the cause, knowledge of prevention of malaria, appropriate use of antimalarial drugs and seeking treatment from the right source increased with increasing level of education (p &lt; 0.05). A greater proportion of the patients, 321 (64.9 %) utilized hospitals, pharmacy outlets or health centres when they perceived an attack of malaria. Educational intervention may result in these patients seeking treatment from the right place when an attack of malaria fever is perceived.",
				"issue": "4",
				"journalAbbreviation": "Tanzania J Hlth Res",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"publicationTitle": "Tanzania Journal of Health Research",
				"rights": "Copyright (c)",
				"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
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
						"tag": "HIV patients"
					},
					{
						"tag": "Nigeria"
					},
					{
						"tag": "knowledge"
					},
					{
						"tag": "malaria"
					},
					{
						"tag": "prevention"
					},
					{
						"tag": "treatment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Session F: Contributed Oral Papers – F2: Energy, Climate, Nuclear Medicine: Reducing Energy Consumption and CO2 One Street Lamp at a Time",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Somssich",
						"creatorType": "author"
					}
				],
				"date": "2011-11-19",
				"abstractNote": "Why wait for federal action on incentives to reduce energy use and address  Greenhouse Gas (GHG) reductions (e.g. CO2), when we can take personal  actions right now in our private lives and in our communities? One such  initiative by private citizens working with Portsmouth NH officials resulted  in the installation of energy reducing lighting products on Court St. and  the benefits to taxpayers are still coming after over 4 years of operation.  This citizen initiative to save money and reduce CO2 emissions, while only  one small effort, could easily be duplicated in many towns and cities.  Replacing old lamps in just one street fixture with a more energy efficient  (Non-LED) lamp has resulted after 4 years of operation ($\\sim $15,000 hr.  life of product) in real electrical energy savings of $>$ {\\$}43. and CO2  emission reduction of $>$ 465 lbs. The return on investment (ROI) was less  than 2 years. This is much better than any financial investment available  today and far safer. Our street only had 30 such lamps installed; however,  the rest of Portsmouth (population 22,000) has at least another 150 street  lamp fixtures that are candidates for such an upgrade. The talk will also  address other energy reduction measures that green the planet and also put  more green in the pockets of citizens and municipalities.",
				"conferenceName": "Climate Change and the Future of Nuclear Power",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"shortTitle": "Session F",
				"url": "https://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34",
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
		"url": "https://scholarworks.umass.edu/lov/vol2/iss1/2/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wabanaki Resistance and Healing: An Exploration of the Contemporary Role of an Eighteenth Century Bounty Proclamation in an Indigenous Decolonization Process",
				"creators": [
					{
						"firstName": "Bonnie D.",
						"lastName": "Newsom",
						"creatorType": "author"
					},
					{
						"firstName": "Jamie",
						"lastName": "Bissonette-Lewey",
						"creatorType": "author"
					}
				],
				"date": "2012-03-09",
				"DOI": "10.7275/R5KW5CXB",
				"ISSN": "1947-508X",
				"abstractNote": "The purpose of this paper is to examine the contemporary role of an eighteenth century bounty proclamation issued on the Penobscot Indians of Maine. We focus specifically on how the changing cultural context of the 1755 Spencer Phips Bounty Proclamation has transformed the document from serving as a tool for sanctioned violence to a tool of decolonization for the Indigenous peoples of Maine. We explore examples of the ways indigenous and non-indigenous people use the Phips Proclamation to illustrate past violence directed against Indigenous peoples. This exploration is enhanced with an analysis of the re-introduction of the Phips Proclamation using concepts of decolonization theory.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"pages": "2",
				"publicationTitle": "Landscapes of Violence",
				"shortTitle": "Wabanaki Resistance and Healing",
				"url": "https://scholarworks.umass.edu/lov/vol2/iss1/2",
				"volume": "2",
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
						"tag": "Bounty Proclamations"
					},
					{
						"tag": "Decolonization"
					},
					{
						"tag": "Wabanaki"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scholarworks.umass.edu/open_access_dissertations/508/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "thesis",
				"title": "Decision-Theoretic Meta-reasoning in Partially Observable and Decentralized Settings",
				"creators": [
					{
						"firstName": "Alan Scott",
						"lastName": "Carlin",
						"creatorType": "author"
					}
				],
				"date": "2012-02-01",
				"abstractNote": "This thesis examines decentralized meta-reasoning. For a single agent or multiple agents, it may not be enough for agents to compute correct decisions if they do not do so in a timely or resource efficient fashion. The utility of agent decisions typically increases with decision quality, but decreases with computation time. The reasoning about one's computation process is referred to as meta-reasoning. Aspects of meta-reasoning considered in this thesis include the reasoning about how to allocate computational resources, including when to stop one type of computation and begin another, and when to stop all computation and report an answer. Given a computational model, this translates into computing how to schedule the basic computations that solve a problem. This thesis constructs meta-reasoning strategies for the purposes of monitoring and control in multi-agent settings, specifically settings that can be modeled by the Decentralized Partially Observable Markov Decision Process (Dec-POMDP). It uses decision theory to optimize computation for efficiency in time and space in communicative and non-communicative decentralized settings. Whereas base-level reasoning describes the optimization of actual agent behaviors, the meta-reasoning strategies produced by this thesis dynamically optimize the computational resources which lead to the selection of base-level behaviors.",
				"extra": "DOI: 10.7275/n8e9-xy93",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"university": "University of Massachusetts Amherst",
				"url": "https://scholarworks.umass.edu/cgi/viewcontent.cgi?article=1506&context=open_access_dissertations",
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
						"tag": "Agents"
					},
					{
						"tag": "Dec-POMDP"
					},
					{
						"tag": "MDP"
					},
					{
						"tag": "Meta-reasoning"
					},
					{
						"tag": "Multiagent"
					},
					{
						"tag": "Partial Observability"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/en/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perceptions of HIV rapid testing among injecting drug users in Brazil",
				"creators": [
					{
						"firstName": "P. R.",
						"lastName": "Telles-Dias",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Westman",
						"creatorType": "author"
					},
					{
						"firstName": "A. E.",
						"lastName": "Fernandez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sanchez",
						"creatorType": "author"
					}
				],
				"date": "2007-12",
				"ISSN": "0034-8910, 0034-8910, 1518-8787",
				"abstractNote": "OBJETIVO: Descrever as impressões, experiências, conhecimentos, crenças e a receptividade de usuários de drogas injetáveis para participar das estratégias de testagem rápida para HIV. MÉTODOS: Estudo qualitativo exploratório foi conduzido entre usuários de drogas injetáveis, de dezembro de 2003 a fevereiro de 2004, em cinco cidades brasileiras, localizadas em quatro regiões do País. Um roteiro de entrevista semi-estruturado contendo questões fechadas e abertas foi usado para avaliar percepções desses usuários sobre procedimentos e formas alternativas de acesso e testagem. Foram realizadas 106 entrevistas, aproximadamente 26 por região. RESULTADOS: Características da população estudada, opiniões sobre o teste rápido e preferências por usar amostras de sangue ou saliva foram apresentadas junto com as vantagens e desvantagens associadas a cada opção. Os resultados mostraram a viabilidade do uso de testes rápidos entre usuários de drogas injetáveis e o interesse deles quanto à utilização destes métodos, especialmente se puderem ser equacionadas questões relacionadas à confidencialidade e confiabilidade dos testes. CONCLUSÕES: Os resultados indicam que os testes rápidos para HIV seriam bem recebidos por essa população. Esses testes podem ser considerados uma ferramenta valiosa, ao permitir que mais usuários de drogas injetáveis conheçam sua sorologia para o HIV e possam ser referidos para tratamento, como subsidiar a melhoria das estratégias de testagem entre usuários de drogas injetáveis.",
				"journalAbbreviation": "Rev. Saúde Pública",
				"language": "en",
				"libraryCatalog": "scielosp.org",
				"pages": "94-100",
				"publicationTitle": "Revista de Saúde Pública",
				"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/en/",
				"volume": "41",
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
						"tag": "AIDS serodiagnosis"
					},
					{
						"tag": "Acquired immunodeficiency syndrome"
					},
					{
						"tag": "Brazil"
					},
					{
						"tag": "Diagnostic services"
					},
					{
						"tag": "Diagnostic techniques and procedures"
					},
					{
						"tag": "Health vulnerability"
					},
					{
						"tag": "Qualitative research"
					},
					{
						"tag": "Substance abuse"
					},
					{
						"tag": "intravenous"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.hindawi.com/journals/mpe/2013/868174/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Robust Filtering for Networked Stochastic Systems Subject to Sensor Nonlinearity",
				"creators": [
					{
						"firstName": "Guoqiang",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Jianwei",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Yuguang",
						"lastName": "Bai",
						"creatorType": "author"
					}
				],
				"date": "2013/2/20",
				"DOI": "10.1155/2013/868174",
				"ISSN": "1024-123X, 1563-5147",
				"abstractNote": "The problem of network-based robust filtering for stochastic systems with sensor nonlinearity is investigated in this paper. In the network environment, the effects of the sensor saturation, output quantization, and network-induced delay are taken into simultaneous consideration, and the output measurements received in the filter side are incomplete. The random delays are modeled as a linear function of the stochastic variable described by a Bernoulli random binary distribution. The derived criteria for performance analysis of the filtering-error system and filter design are proposed which can be solved by using convex optimization method. Numerical examples show the effectiveness of the design method.",
				"journalAbbreviation": "Mathematical Problems in Engineering",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "1-11",
				"publicationTitle": "Mathematical Problems in Engineering",
				"url": "https://www.hindawi.com/journals/mpe/2013/868174/",
				"volume": "2013",
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
		"url": "https://volokh.com/2013/12/22/northwestern-cant-quit-asa-boycott-member/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Northwestern Can't Quit ASA Over Boycott Because it is Not a Member",
				"creators": [
					{
						"firstName": "Eugene",
						"lastName": "Kontorovich",
						"creatorType": "author"
					}
				],
				"date": "2013-12-22T16:58:34+00:00",
				"abstractNote": "Northwestern University recently condemned the American Studies Association boycott of Israel. Unlike some other schools that quit their institutional membership in the ASA over the boycott, Northwestern has not. Many of my Northwestern colleagues were about to start urging a similar withdrawal. Then we learned from our administration that despite being listed as in institutional […]",
				"blogTitle": "The Volokh Conspiracy",
				"language": "en-US",
				"url": "https://volokh.com/2013/12/22/northwestern-cant-quit-asa-boycott-member/",
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
		"url": "https://hbr.org/2015/08/how-to-do-walking-meetings-right",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "webpage",
				"title": "How to Do Walking Meetings Right",
				"creators": [
					{
						"firstName": "Russell",
						"lastName": "Clayton",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher",
						"lastName": "Thomas",
						"creatorType": "author"
					},
					{
						"firstName": "Jack",
						"lastName": "Smothers",
						"creatorType": "author"
					}
				],
				"date": "2015-08-05T12:05:17Z",
				"abstractNote": "New research finds creativity benefits.",
				"url": "https://hbr.org/2015/08/how-to-do-walking-meetings-right",
				"websiteTitle": "Harvard Business Review",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Managing yourself"
					},
					{
						"tag": "Meeting management"
					},
					{
						"tag": "Workspaces design"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://olh.openlibhums.org/article/id/4400/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Opening the Open Library of Humanities",
				"creators": [
					{
						"firstName": "Martin Paul",
						"lastName": "Eve",
						"creatorType": "author"
					},
					{
						"firstName": "Caroline",
						"lastName": "Edwards",
						"creatorType": "author"
					}
				],
				"date": "2015-09-28",
				"DOI": "10.16995/olh.46",
				"ISSN": "2056-6700",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "olh.openlibhums.org",
				"publicationTitle": "Open Library of Humanities",
				"url": "https://olh.openlibhums.org/article/id/4400/",
				"volume": "1",
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
		"url": "https://www.vox.com/2016/1/7/10726296/wheres-rey-star-wars-monopoly",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "#WheresRey and the big Star Wars toy controversy, explained",
				"creators": [
					{
						"firstName": "Caroline",
						"lastName": "Framke",
						"creatorType": "author"
					}
				],
				"date": "2016-01-07T08:20:02-05:00",
				"abstractNote": "Excluding female characters in merchandise is an ongoing pattern.",
				"language": "en",
				"libraryCatalog": "www.vox.com",
				"publicationTitle": "Vox",
				"url": "https://www.vox.com/2016/1/7/10726296/wheres-rey-star-wars-monopoly",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Culture"
					},
					{
						"tag": "Front Page"
					},
					{
						"tag": "Movies"
					},
					{
						"tag": "Star Wars"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.diva-portal.org/smash/record.jsf?pid=diva2%3A766397&dswid=-5161",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Mobility modeling for transport efficiency : Analysis of travel characteristics based on mobile phone data",
				"creators": [
					{
						"firstName": "Vangelis",
						"lastName": "Angelakis",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Gundlegård",
						"creatorType": "author"
					},
					{
						"firstName": "Clas",
						"lastName": "Rydergren",
						"creatorType": "author"
					},
					{
						"firstName": "Botond",
						"lastName": "Rajna",
						"creatorType": "author"
					},
					{
						"firstName": "Katerina",
						"lastName": "Vrotsou",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Carlsson",
						"creatorType": "author"
					},
					{
						"firstName": "Julien",
						"lastName": "Forgeat",
						"creatorType": "author"
					},
					{
						"firstName": "Tracy H.",
						"lastName": "Hu",
						"creatorType": "author"
					},
					{
						"firstName": "Evan L.",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Simon",
						"lastName": "Moritz",
						"creatorType": "author"
					},
					{
						"firstName": "Sky",
						"lastName": "Zhao",
						"creatorType": "author"
					},
					{
						"firstName": "Yaotian",
						"lastName": "Zheng",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "DiVA portal is a finding tool for research publications and student theses written at the following 50 universities and research institutions.",
				"conferenceName": "Netmob 2013 - Third International Conference on the Analysis of Mobile Phone Datasets, May 1-3, 2013, MIT, Cambridge, MA, USA",
				"language": "eng",
				"libraryCatalog": "www.diva-portal.org",
				"shortTitle": "Mobility modeling for transport efficiency",
				"url": "https://urn.kb.se/resolve?urn=urn:nbn:se:liu:diva-112443",
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
						"tag": "Transport Systems and Logistics"
					},
					{
						"tag": "Transportteknik och logistik"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://link.springer.com/article/10.1023/A:1021669308832",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Why Bohm's Quantum Theory?",
				"creators": [
					{
						"firstName": "H. D.",
						"lastName": "Zeh",
						"creatorType": "author"
					}
				],
				"date": "2014-01-06T00:00:00Z",
				"DOI": "10.1023/A:1021669308832",
				"ISSN": "1572-9524",
				"abstractNote": "This is a brief reply to S. Goldstein's article “Quantum theory without observers” in Physics Today. It is pointed out that Bohm's pilot wave theory is successful only because it keeps Schrödinger's (exact) wave mechanics unchanged, while the rest of it is observationally meaningless and solely based on classical prejudice.",
				"issue": "2",
				"journalAbbreviation": "Found Phys Lett",
				"language": "en",
				"libraryCatalog": "link.springer.com",
				"pages": "197-200",
				"publicationTitle": "Foundations of Physics Letters",
				"rights": "1999 Plenum Publishing Corporation",
				"url": "https://link.springer.com/article/10.1023/A:1021669308832",
				"volume": "12",
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
						"tag": "Biological and Medical Physics"
					},
					{
						"tag": "Biophysics"
					},
					{
						"tag": "Classical Mechanics"
					},
					{
						"tag": "Classical and Quantum Gravitation"
					},
					{
						"tag": "Condensed Matter Physics"
					},
					{
						"tag": "Physics"
					},
					{
						"tag": "Relativity Theory"
					},
					{
						"tag": "general"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/234097",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Serfs on the Move: Peasant Seasonal Migration in Pre-Reform Russia, 1800–61",
				"creators": [
					{
						"firstName": "Boris B.",
						"lastName": "Gorshkov",
						"creatorType": "author"
					}
				],
				"date": "09/2000",
				"DOI": "10.1353/kri.2008.0061",
				"ISSN": "1538-5000",
				"issue": "4",
				"journalAbbreviation": "kri",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "627-656",
				"publicationTitle": "Kritika: Explorations in Russian and Eurasian History",
				"shortTitle": "Serfs on the Move",
				"url": "https://muse.jhu.edu/pub/28/article/234097",
				"volume": "1",
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
		"url": "https://media.ccc.de/v/35c3-9386-introduction_to_deep_learning",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Introduction to Deep Learning",
				"creators": [
					{
						"firstName": "",
						"lastName": "teubi",
						"creatorType": "author"
					}
				],
				"date": "2018-12-27 01:00:00 +0100",
				"abstractNote": "This talk will teach you the fundamentals of machine learning and give you a sneak peek into the internals of the mystical black box. You...",
				"language": "en",
				"libraryCatalog": "media.ccc.de",
				"url": "https://media.ccc.de/v/35c3-9386-introduction_to_deep_learning",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "35c3"
					},
					{
						"tag": "9386"
					},
					{
						"tag": "Chaos Computer Club"
					},
					{
						"tag": "Hacker"
					},
					{
						"tag": "Media"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Streaming"
					},
					{
						"tag": "TV"
					},
					{
						"tag": "Video"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://upcommons.upc.edu/handle/2117/114657",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Necesidad y morfología: la forma racional",
				"creators": [
					{
						"firstName": "Antonio A.",
						"lastName": "García García",
						"creatorType": "author"
					}
				],
				"date": "2015-06",
				"ISBN": "9788460842118",
				"abstractNote": "Abstracts aceptados sin presentacion / Accepted abstracts without presentation",
				"conferenceName": "International Conference Arquitectonics Network: Architecture, Education and Society, Barcelona, 3-5 June 2015: Abstracts",
				"language": "spa",
				"libraryCatalog": "upcommons.upc.edu",
				"publisher": "GIRAS. Universitat Politècnica de Catalunya",
				"rights": "Open Access",
				"shortTitle": "Necesidad y morfología",
				"url": "https://upcommons.upc.edu/handle/2117/114657",
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
						"tag": "Architectural theory"
					},
					{
						"tag": "Teoria arquitectònica"
					},
					{
						"tag": "Àrees temàtiques de la UPC::Arquitectura"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pewresearch.org/short-reads/2019/12/12/u-s-children-more-likely-than-children-in-other-countries-to-live-with-just-one-parent/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "blogPost",
				"title": "U.S. has world’s highest rate of children living in single-parent households",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Kramer",
						"creatorType": "author"
					}
				],
				"abstractNote": "Almost a quarter of U.S. children under 18 live with one parent and no other adults, more than three times the share of children around the world who do so.",
				"blogTitle": "Pew Research Center",
				"language": "en-US",
				"url": "https://www.pewresearch.org/short-reads/2019/12/12/u-s-children-more-likely-than-children-in-other-countries-to-live-with-just-one-parent/",
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
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "book",
				"title": "Conservation Research, Policy and Practice",
				"creators": [
					{
						"firstName": "William J.",
						"lastName": "Sutherland",
						"creatorType": "editor"
					},
					{
						"firstName": "Peter N. M.",
						"lastName": "Brotherton",
						"creatorType": "editor"
					},
					{
						"firstName": "Zoe G.",
						"lastName": "Davies",
						"creatorType": "editor"
					},
					{
						"firstName": "Nancy",
						"lastName": "Ockendon",
						"creatorType": "editor"
					},
					{
						"firstName": "Nathalie",
						"lastName": "Pettorelli",
						"creatorType": "editor"
					},
					{
						"firstName": "Juliet A.",
						"lastName": "Vickery",
						"creatorType": "editor"
					}
				],
				"date": "2020-04-16",
				"ISBN": "9781108638210 9781108714587",
				"abstractNote": "Conservation research is essential for advancing knowledge but to make an impact scientific evidence must influence conservation policies, decision making and practice. This raises a multitude of challenges. How should evidence be collated and presented to policymakers to maximise its impact? How can effective collaboration between conservation scientists and decision-makers be established? How can the resulting messages be communicated to bring about change? Emerging from a successful international symposium organised by the British Ecological Society and the Cambridge Conservation Initiative, this is the first book to practically address these questions across a wide range of conservation topics. Well-renowned experts guide readers through global case studies and their own experiences. A must-read for practitioners, researchers, graduate students and policymakers wishing to enhance the prospect of their work 'making a difference'. This title is also available as Open Access on Cambridge Core.",
				"edition": "1",
				"extra": "DOI: 10.1017/9781108638210",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"publisher": "Cambridge University Press",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
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
		"url": "https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/4468",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Robin Hood approach to forced alignment: English-trained algorithms and their use on Australian languages",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Babinski",
						"creatorType": "author"
					},
					{
						"firstName": "Rikker",
						"lastName": "Dockum",
						"creatorType": "author"
					},
					{
						"firstName": "J. Hunter",
						"lastName": "Craft",
						"creatorType": "author"
					},
					{
						"firstName": "Anelisa",
						"lastName": "Fergus",
						"creatorType": "author"
					},
					{
						"firstName": "Dolly",
						"lastName": "Goldenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Claire",
						"lastName": "Bowern",
						"creatorType": "author"
					}
				],
				"date": "2019/03/15",
				"DOI": "10.3765/plsa.v4i1.4468",
				"ISSN": "2473-8689",
				"abstractNote": "Forced alignment automatically aligns audio recordings of spoken language with transcripts at the segment level, greatly reducing the time required to prepare data for phonetic analysis. However, existing algorithms are mostly trained on a few well-documented languages. We test the performance of three algorithms against manually aligned data. For at least some tasks, unsupervised alignment (either based on English or trained from a small corpus) is sufficiently reliable for it to be used on legacy data for low-resource languages. Descriptive phonetic work on vowel inventories and prosody can be accurately captured by automatic alignment with minimal training data. Consonants provided significantly more challenges for forced alignment.",
				"issue": "1",
				"journalAbbreviation": "Proc Ling Soc Amer",
				"language": "en",
				"libraryCatalog": "journals.linguisticsociety.org",
				"pages": "3:1-12",
				"publicationTitle": "Proceedings of the Linguistic Society of America",
				"rights": "Copyright (c) 2019 Sarah Babinski, Rikker Dockum, J. Hunter Craft, Anelisa Fergus, Dolly Goldenberg, Claire Bowern",
				"shortTitle": "A Robin Hood approach to forced alignment",
				"url": "https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/4468",
				"volume": "4",
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
						"tag": "Australian languages"
					},
					{
						"tag": "Yidiny"
					},
					{
						"tag": "forced alignment"
					},
					{
						"tag": "language documentation"
					},
					{
						"tag": "phonetics"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.swr.de/wissen/1000-antworten/woher-kommt-redensart-ueber-die-wupper-gehen-102.html",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "webpage",
				"title": "Woher kommt \"über die Wupper gehen\"?",
				"creators": [
					{
						"firstName": "",
						"lastName": "SWRWissen",
						"creatorType": "author"
					}
				],
				"abstractNote": "Es gibt eine Vergleichsredensart: \"Der ist über den Jordan gegangen.\" Das heißt, er ist gestorben. Das bezieht sich auf die alten Grenzen Israels. In Wuppertal jedoch liegt jenseits des Flusses das Gefängnis. Von Rolf-Bernhard Essig",
				"language": "de",
				"url": "https://www.swr.de/wissen/1000-antworten/woher-kommt-redensart-ueber-die-wupper-gehen-102.html",
				"websiteTitle": "swr.online",
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
		"url": "https://www.azatliq.org/a/24281041.html",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Татар яшьләре татарлыкны сакларга тырыша",
				"creators": [
					{
						"firstName": "гүзәл",
						"lastName": "мәхмүтова",
						"creatorType": "author"
					}
				],
				"date": "2011-07-29 13:00:00Z",
				"abstractNote": "Бу көннәрдә “Идел” җәйләвендә XXI Татар яшьләре көннәре үтә. Яшьләр вакытларын төрле чараларда катнашып үткәрә.",
				"language": "tt-BA",
				"libraryCatalog": "www.azatliq.org",
				"publicationTitle": "Азатлык Радиосы",
				"url": "https://www.azatliq.org/a/24281041.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "татарстан"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.hackingarticles.in/windows-privilege-escalation-kernel-exploit/",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Windows Privilege Escalation: Kernel Exploit",
				"creators": [
					{
						"firstName": "Raj",
						"lastName": "Chandel",
						"creatorType": "author"
					}
				],
				"date": "2021-12-30T17:41:33+00:00",
				"abstractNote": "As this series was dedicated to Windows Privilege escalation thus I’m writing this Post to explain command practice for kernel-mode exploitation. Table of Content What",
				"blogTitle": "Hacking Articles",
				"language": "en",
				"shortTitle": "Windows Privilege Escalation",
				"url": "https://www.hackingarticles.in/windows-privilege-escalation-kernel-exploit/",
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
	}
]
/** END TEST CASES **/
