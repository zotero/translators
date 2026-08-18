function detectImport() {
	// TODO: read first few lines with Zotero.read() and return true if format matches
	return false;
}

async function doImport() {
	// TODO: read full input with Zotero.read(), parse, create items
	let item = new Zotero.Item('journalArticle');
	// TODO: populate item fields from parsed input
	item.complete();
}
