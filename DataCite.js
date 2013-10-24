{
	"translatorID": "9f1fb86b-92c8-4db7-b8ee-0b481d456428",
	"label": "DataCite",
	"creator": "Aurimas Vinckevicius",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcs",
	"lastUpdated": "2013-10-24 05:11:41"
}

function detectSearch(items) {
	if(!items) return false;
	
	if(!items.directSearch) {
		Z.debug("DataCite: directSearch was not true. Will not attempt to search directly.")
		return false;
	}
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	for(var i=0, n=items.length; i<n; i++) {
		if(!items[i]) continue;
		
		if(items[i].DOI && ZU.cleanDOI(items[i].DOI)) return true;
		if(typeof items[i] == 'string' && ZU.cleanDOI(items[i])) return true;
	}
	
	return false;
}

function filterQuery(items) {
	if(!items) return [];
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	//filter out invalid queries
	var query = [];
	for(var i=0, n=items.length; i<n; i++) {
		if( ( items[i].DOI && ZU.cleanDOI(items[i].DOI) )
			|| ( typeof items[i] == 'string' && ZU.cleanDOI(items[i]) ) ) {
			query.push(items[i]);
		} else {
			var newItem = new Zotero.Item();
			newItem._status = 'invalid';
			newItem._query = items[i];
			newItem.complete();
		}
	}
	return query;
}

function doSearch(items) {
	var query = filterQuery(items);
	var queryTracker = {};
	var dois = [];
	for(var i=0, n=query.length; i<n; i++) {
		var doi = ZU.cleanDOI(query[i].DOI || query[i]);
		queryTracker[doi] = query[i];
		dois.push(doi);
	}
	
	if(!dois.length) return;
	
	processDOIs(dois, queryTracker);
}

function fixJSON(text) {
	try {
		var item = JSON.parse(text);
		
		if(item.type == 'misc') item.type = 'article-journal';
		
		if(item.issued && item.issued.raw) item.issued.literal = item.issued.raw;
		if(item.accessed && item.accessed.raw) item.accessed.literal = item.accessed.raw;
		
		return JSON.stringify([item]);
	} catch(e) {
		return false;
	}
}

function processDOIs(dois, queryTracker) {
	var doi = dois.pop();
	var query = queryTracker[doi];
	ZU.doGet('http://data.datacite.org/application/citeproc+json/' + doi, function(text) {
		text = fixJSON(text);
		if(!text) {
			var newItem = new Zotero.Item();
			newItem._query = query;
			newItem._status = 'invalid';
			newItem.complete();
			return;
		}
		
		// use CSL JSON translator
		var trans = Zotero.loadTranslator('import');
		trans.setTranslator('bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7');
		trans.setString(text);
		var done = false;
		trans.setHandler('itemDone', function(obj, item) {
			item._query = query;
			item._status = 'success';
			item.complete();
			done = true;
		})
		trans.setHandler('done', function() {
			if(!done) {
				var newItem = new Zotero.Item();
				newItem._query = query;
				newItem._status = 'fail';
				newItem.complete();
			}
		});
		trans.setHandler('error', function() {
			var newItem = new Zotero.Item();
			newItem._query = query;
			newItem._status = 'fail';
			newItem.complete();
			done = true;
		});
		trans.translate();
	}, function() {
		if(dois.length) processDOIs(dois, queryTracker);
	});
}