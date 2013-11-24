{
	"translatorID": "79c3d292-0afc-42a1-bd86-7e706fc35aa5",
	"label": "EIDR",
	"creator": "Aurimas Vinckevicius",
	"target": "",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsi",
	"lastUpdated": "2013-10-23 07:30:55"
}

var typeMap = {
//	'Series'
//	'Season'
//	'Supplemental'
	'TV Show': 'tvBroadcast',
	'Movie': 'film',
	'Short': 'videoRecording',
	'Web': 'videoRecording'
};

var creatorMap = {
	'Director': 'director',
	'Actor': 'castMember'
};

function checkEIDR(eidr) {
	var suffix = eidr.trim().match(/10.5240\/((?:[0-9A-F]{4}-){5})([0-9A-Z])/i);
	if(!suffix) return false;

	//checksum
	//ISO 7064 Mod 37,36
	var id = suffix[1].replace(/-/g,'').toUpperCase().split('');
	var sum = 0;
	for(var i=0, n=id.length; i<n; i++) {
		sum += '0123456789ABCDEF'.indexOf(id[i]);
		sum = ( ((sum % 36) || 36) * 2 ) % 37;
	}

	sum += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(suffix[2]);

	return (sum % 36)===1;
}

function getValue(parentNode, node) {
	var n = parentNode.getElementsByTagName(node)[0];

	return n !== undefined ? n.textContent : undefined;
}

function detectSearch(item) {
	if(!items) return false;
	
	if(!items.directSearch) {
		Z.debug("EIDR: directSearch was not true. Will not attempt to search directly.")
		return false;
	}
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	for(var i=0, n=items.length; i<n; i++) {
		if(!items[i]) continue;
		
		var doi;
		if( ( items[i].DOI && ( doi = ZU.cleanDOI(items[i].DOI) ) )
			|| ( typeof items[i] == 'string' && ( doi = ZU.cleanDOI(items[i]) ) ) ) {
			//we should detect party and user but return an error later
			//this way other translators don't need to process the DOI
			var prefix = doi.split('/')[0];
			if(prefix == '10.5237' || prefix == '10.5238' || prefix == '10.5240') {
				return true;
			}
		}
	}
	
	return false;
}

/**
 * Filter out invalid queries
 */
function filterQuery(items) {
	if(!items) return [];
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	//filter out invalid queries
	var query = [];
	var doi;
	for(var i=0, n=items.length; i<n; i++) {
		if( ( ( items[i].DOI && ( doi = ZU.cleanDOI(items[i].DOI) ) )
				|| ( typeof items[i] == 'string' && ( doi = ZU.cleanDOI(items[i]) ) ) )
			&& checkEIDR(doi) ) {
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
	if(!query.length) return;
	
	var dois = [];
	var queryTracker = {};
	for(var i=0, n=query.length; i<n; i++) {
		var doi = ZU.cleanDOI(query[i].DOI || query[i]);
		if(queryTracker[doi]) continue;
		
		queryTracker[doi] = query[i];
		dois.push(doi);
	}
	
	if(!dois.length) return;
	
	processDOIs(dois, queryTracker);
}

function fail(query, status) {
	var newItem = new Zotero.Item();
	newItem._query = query;
	newItem._status = status;
	newItem.complete();
}

function processDOIs(dois, queryTracker) {
	var doi = dois.pop();
	var query = queryTracker[doi];
	
	var request = 'https://resolve.eidr.org/EIDR/object/' + doi
					+ '/?type=Full&followAlias=true';
Z.debug(request);
	ZU.doGet(request, function(text) {
		var parser = new DOMParser();
		var res = parser.parseFromString(text, "application/xml");

		var ns = {
			'n' : 'http://www.eidr.org/schema/1.0',
			'md': 'http://www.movielabs.com/md'
		};

		if(res.getElementsByTagName('Response').length) {
			Z.debug("Server returned error: ("
				+ getValue(res, 'Code') + ") "
				+ getValue(res, 'Type'));
			fail(query, 'fail');
			return;
		}

		var base = res.getElementsByTagName('BaseObjectData')[0];

		if(getValue(base, 'StructuralType') != 'Performance'
			&& getValue(base, 'StructuralType') != 'Abstraction') {
			Z.debug("Unhandled StructuralType: "
				+ getValue(base, 'StructuralType'));
			fail(query, 'unimplemented');
			return;
		}

		var type = typeMap[getValue(base,'ReferentType')];
		if(!type) {
			Z.debug("Unhandled ReferentType: " + getValue(base,'ReferentType'));
			fail(query, 'unimplemented');
			return
		}
		var item = new Zotero.Item(type);

		//localize?
		item.title = getValue(base,'ResourceName');
		item.language = ZU.xpathText(base, './n:PrimaryLanguage/n:Language', ns);
		item.date = getValue(base,'ReleaseDate');
		item.place = getValue(base,'CountryOfOrigin');

		//running time
		var time = getValue(base,'ApproximateLength')
					.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
		item.runningTime = ((time[1] || 0) * 3600 +
							(time[2] || 0) * 60 +
							(time[3] || 0)) + 's';

		//creators
		var creators = base.getElementsByTagName('Credits')[0];
		var c, t;
		if(creators) {
			c = creators.firstChild;
			while(c) {
				t = creatorMap[c.nodeName];
				if(!t) continue;

				item.creators.push(
					ZU.cleanAuthor(getValue(c,'md:DisplayName'), t)
				);

				c = c.nextSibling;
			}
		}

		/**TODO: Handle producers*/
		
		item.DOI = doi;
		item._query = query;
		item._status = 'success';
		item.complete();
	}, function() {
		if(dois.length) processDOIs(dois, queryTracker);
	});
}