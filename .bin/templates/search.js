function detectSearch(items) { // eslint-disable-line no-unused-vars
	// TODO: check items for valid search input (e.g. DOI, ISBN)
	return false;
}

async function doSearch(item) { // eslint-disable-line no-unused-vars
	// TODO: perform search and create result items
	let newItem = new Zotero.Item('journalArticle');
	// TODO: populate item fields
	newItem.complete();
}
