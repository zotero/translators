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
	"lastUpdated": "2018-11-01 19:46:46"
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
	text = Zotero.Utilities.normalize(text);
	pattern = Zotero.Utilities.normalize(pattern);
	
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
		translator.setTranslator('11645bd1-0420-45c1-badb-53fb41eeb753');
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
	
	// Combine all DOIs and filter the unique ones
	let allDois = [...new Set([...urlDois, ...visibleDois])];
	
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
	
	console.log('ITEMMS', items);
	
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
var testCases = [];
/** END TEST CASES **/
