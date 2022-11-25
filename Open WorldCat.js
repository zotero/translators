{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith, Sebastian Karcher, Abe Jellinek",
	"target": "^https?://([^/]+\\.)?worldcat\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-01 19:40:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Simon Kornblith, Sebastian Karcher, and Abe Jellinek

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

// http://www.loc.gov/marc/relators/relaterm.html
// From MARC.js
const RELATORS = {
	act: "castMember",
	asn: "contributor", // Associated name
	aut: "author",
	cmp: "composer",
	ctb: "contributor",
	drt: "director",
	edt: "editor",
	pbl: "SKIP", // publisher
	prf: "performer",
	pro: "producer",
	pub: "SKIP", // publication place
	trl: "translator"
};

const RECORD_MAPPING = {
	oclcNumber: (item, value) => item.extra = (item.extra || '') + `\nOCLC: ${value}`,
	title: (item, value) => item.title = value.replace(' : ', ': '),
	edition: 'edition',
	publisher: 'publisher',
	publicationPlace: 'place',
	publicationDate: (item, value) => item.date = ZU.strToISO(value),
	catalogingLanguage: 'language',
	summary: 'abstractNote',
	physicalDescription: (item, value) => {
		item.numPages = (value.match(/\d+(?= pages?)/) || value.match(/\d+/) || [])[0];
	},
	series: 'series',
	subjectsText: 'tags',
	cartographicData: 'scale',
	// genre: 'genre',
	doi: (item, value) => item.DOI = ZU.cleanDOI(value),
	mediumOfPerformance: 'medium',
	issns: (item, value) => item.ISSN = ZU.cleanISSN(value),
	sourceIssn: (item, value) => item.ISSN = ZU.cleanISSN(value),
	digitalAccessAndLocations: (item, value) => {
		if (value.length) {
			item.url = value[0].uri;
		}
	},
	isbns: (item, value) => item.ISBN = ZU.cleanISBN(value.join(' ')),
	isbn13: (item, value) => item.ISBN = ZU.cleanISBN(value),
	publication: (item, value) => {
		try {
			let [, publicationTitle, volume, date, page] = value.match(/^(.+), (.+), (.+), (.+)$/);
			item.publicationTitle = publicationTitle;
			item.volume = volume;
			item.date = ZU.strToISO(date);
			item.pages = page;
		}
		catch (e) {
			Z.debug(e);
		}
	},
	contributors: (item, value) => {
		for (let contrib of value) {
			let creatorType;
			if (contrib.relatorCodes && contrib.relatorCodes[0]) {
				creatorType = RELATORS[contrib.relatorCodes[0]] || 'contributor';
				if (creatorType == 'SKIP') continue;
			}
			else {
				creatorType = ZU.getCreatorsForType(item.itemType)[0];
			}
			let creator = {
				firstName: contrib.firstName && contrib.firstName.text,
				lastName: contrib.secondName && contrib.secondName.text,
				creatorType
			};
			// If only firstName field, set as single-field name
			if (creator.firstName && !creator.lastName) {
				creator.lastName = creator.firstName;
				delete creator.firstName;
				creator.fieldMode = 1;
			}
			item.creators.push(creator);
		}
	}
};

function detectWeb(doc, url) {
	let nextData = doc.querySelector('#__NEXT_DATA__');
	if (url.includes('/title/') && nextData) {
		try {
			return getItemType(JSON.parse(nextData.textContent).props.pageProps.record);
		}
		catch (e) {
			return 'book';
		}
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (url.includes('/search?')) {
		Z.monitorDOMChanges(doc.body, { childList: true, subtree: true });
	}

	return false;
}

function getItemType(record) {
	if (record.generalFormat == 'ArtChap') {
		if (record.specificFormat == 'Artcl') {
			return 'journalArticle';
		}
		else {
			return 'bookSection';
		}
	}
	else {
		return 'book';
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.MuiGrid-item a[href*="/title/"]:not([data-testid^="format-link"])');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
	let record = null;
	try {
		record = JSON.parse(text(doc, '#__NEXT_DATA__')).props.pageProps.record;
	}
	catch (e) {}
	if (!record || !url.includes('/' + record.oclcNumber)) {
		Zotero.debug('__NEXT_DATA__ is stale; requesting page again');
		doc = await requestDocument(url);
		record = JSON.parse(text(doc, '#__NEXT_DATA__')).props.pageProps.record;
	}
	scrapeRecord([record]);
}

function scrapeRecord(records) {
	for (let record of records) {
		Z.debug(record);

		if (record.doi) {
			let translate = Z.loadTranslator('search');
			translate.setSearch({ DOI: record.doi });
			translate.setTranslator('b28d0d42-8549-4c6d-83fc-8382874a5cb9'); // DOI Content Negotiation
			translate.translate();
			continue;
		}

		let item = new Zotero.Item(getItemType(record));
		for (let [key, mapper] of Object.entries(RECORD_MAPPING)) {
			if (!record[key]) continue;
			if (typeof mapper == 'string') {
				item[mapper] = record[key];
			}
			else {
				mapper(item, record[key]);
			}
		}

		for (let keyToFix of ['title', 'publisher', 'place']) {
			if (item[keyToFix]) {
				item[keyToFix] = item[keyToFix].replace(/^\[(.+)\]$/, '$1');
			}
		}

		item.complete();
	}
}

function sanitizeInput(items, checkOnly) {
	if (items.length === undefined || typeof items == 'string') {
		items = [items];
	}
	
	var cleanItems = [];
	for (let i = 0; i < items.length; i++) {
		var item = ZU.deepCopy(items[i]),
			valid = false;
		if (item.ISBN && typeof item.ISBN == 'string'
			&& (item.ISBN = ZU.cleanISBN(item.ISBN))
		) {
			valid = true;
		}
		else {
			delete item.ISBN;
		}
		
		if (item.identifiers && typeof item.identifiers.oclc == 'string'
			&& /^\d+$/.test(item.identifiers.oclc.trim())
		) {
			valid = true;
			item.identifiers.oclc = item.identifiers.oclc.trim();
		}
		else if (item.identifiers) {
			delete item.identifiers.oclc;
		}
		
		if (valid) {
			if (checkOnly) return true;
			cleanItems.push(item);
		}
	}
	
	return checkOnly ? !!cleanItems.length : cleanItems;
}

function detectSearch(items) {
	return sanitizeInput(items, true);
}

function doSearch(items) {
	items = sanitizeInput(items);
	if (!items.length) {
		Z.debug("Search query does not contain valid identifiers");
		return;
	}
	
	var ids = [], isbns = [];
	for (let i = 0; i < items.length; i++) {
		if (items[i].identifiers && items[i].identifiers.oclc) {
			ids.push(items[i].identifiers.oclc);
			continue;
		}
		
		isbns.push(items[i].ISBN);
	}
	
	ZU.processDocuments('https://www.worldcat.org/', function (homepageDoc) {
		let buildID = JSON.parse(text(homepageDoc, '#__NEXT_DATA__')).buildId;
		ZU.doGet(`https://www.worldcat.org/_next/data/${buildID}/en/search.json`, function (jsonText) {
			let json = JSON.parse(jsonText);
			let { secureToken } = json.pageProps;
			let cookie = `wc_tkn=${encodeURIComponent(secureToken)}`;
			fetchIDs(isbns, ids, cookie, function (ids) {
				if (!ids.length) {
					Z.debug("Could not retrieve any OCLC IDs");
					Zotero.done(false);
					return;
				}
				var url = "https://www.worldcat.org/api/search?q=no%3A"
					+ ids.map(encodeURIComponent).join('+OR+no%3A');
				ZU.doGet(url, function (respText) {
					let json = JSON.parse(respText);
					if (json.briefRecords) {
						scrapeRecord(json.briefRecords);
					}
				}, null, null, {
					Referer: 'https://worldcat.org/search?q=',
					Cookie: cookie
				});
			});
		});
	});
}

function fetchIDs(isbns, ids, cookie, callback) {
	if (!isbns.length) {
		callback(ids);
		return;
	}
	
	var isbn = isbns.shift();
	// As of 10/19/2022, WorldCat's API seems to do an unindexed lookup for ISBNs without hyphens,
	// with requests taking 40+ seconds, so we hyphenate them
	isbn = wcHyphenateISBN(isbn);
	var url = "https://www.worldcat.org/api/search?q=bn%3A"
		+ encodeURIComponent(isbn);
	ZU.doGet(url,
		function (respText) {
			let json = JSON.parse(respText);
			if (json.briefRecords && json.briefRecords.length) {
				scrapeRecord([json.briefRecords[0]]);
			}
		},
		function () {
			fetchIDs(isbns, ids, cookie, callback);
		},
		null,
		{
			Referer: 'https://worldcat.org/search?q=',
			Cookie: cookie
		}
	);
}

// Copied from Zotero.Utilities.Internal.hyphenateISBN()
function wcHyphenateISBN(isbn) {
	// Copied from isbn.js
	var ISBN = {};
	ISBN.ranges = (function() {
		var ranges = {"978":{"0":["00","19","200","699","7000","8499","85000","89999","900000","949999","9500000","9999999"],"1":["00","09","100","329","330","399","4000","5499","55000","86979","869800","998999","9990000","9999999"],"2":["00","19","200","349","400","699","7000","8399","35000","39999","84000","89999","900000","949999","9500000","9999999"],"3":["00","02","04","19","030","033","200","699","0340","0369","7000","8499","03700","03999","85000","89999","95400","96999","99000","99499","99500","99999","900000","949999","9500000","9539999","9700000","9899999"],"5":["01","19","200","420","430","430","440","440","450","699","0050","0099","4210","4299","4310","4399","4410","4499","7000","8499","9200","9299","9501","9799","9910","9999","00000","00499","85000","89999","91000","91999","93000","94999","98000","98999","900000","909999","9500000","9500999","9900000","9909999"],"600":["00","09","100","499","5000","8999","90000","99999"],"601":["00","19","85","99","200","699","7000","7999","80000","84999"],"602":["00","07","200","699","0800","0899","0900","1099","1100","1199","1200","1399","1500","1699","7500","7999","8000","9499","14000","14999","17000","17999","18000","18999","19000","19999","70000","74999","95000","99999"],"603":["00","04","05","49","500","799","8000","8999","90000","99999"],"604":["0","4","50","89","900","979","9800","9999"],"605":["01","02","04","09","030","039","100","399","4000","5999","9000","9999","60000","89999"],"606":["0","0","10","49","500","799","8000","9199","92000","99999"],"607":["00","39","400","749","7500","9499","95000","99999"],"608":["0","0","7","9","10","19","200","449","4500","6499","65000","69999"],"609":["00","39","400","799","8000","9499","95000","99999"],"612":["00","29","50","99","300","399","4000","4499","45000","49999"],"613":["0","9"],"615":["00","09","100","499","5000","7999","80000","89999"],"616":["00","19","200","699","7000","8999","90000","99999"],"617":["00","49","500","699","7000","8999","90000","99999"],"618":["00","19","200","499","5000","7999","80000","99999"],"619":["00","14","150","699","7000","8999","90000","99999"],"621":["00","29","400","599","8000","8999","95000","99999"],"7":["00","09","100","499","5000","7999","80000","89999","900000","999999"],"80":["00","19","200","699","7000","8499","85000","89999","900000","999999"],"82":["00","19","200","689","7000","8999","90000","98999","690000","699999","990000","999999"],"83":["00","19","200","599","7000","8499","60000","69999","85000","89999","900000","999999"],"84":["00","13","140","149","200","699","7000","8499","9000","9199","9700","9999","15000","19999","85000","89999","92400","92999","95000","96999","920000","923999","930000","949999"],"85":["00","19","200","549","5500","5999","7000","8499","60000","69999","85000","89999","98000","99999","900000","979999"],"86":["00","29","300","599","6000","7999","80000","89999","900000","999999"],"87":["00","29","400","649","7000","7999","85000","94999","970000","999999"],"88":["00","19","200","599","910","929","6000","8499","9300","9399","85000","89999","95000","99999","900000","909999","940000","949999"],"89":["00","24","250","549","990","999","5500","8499","85000","94999","97000","98999","950000","969999"],"90":["00","19","90","90","94","94","200","499","5000","6999","8500","8999","70000","79999","800000","849999"],"91":["0","1","20","49","500","649","7000","7999","85000","94999","970000","999999"],"92":["0","5","60","79","800","899","9000","9499","95000","98999","990000","999999"],"93":["00","09","100","499","5000","7999","80000","94999","950000","999999"],"94":["000","599","6000","8999","90000","99999"],"950":["00","49","500","899","9000","9899","99000","99999"],"951":["0","1","20","54","550","889","8900","9499","95000","99999"],"952":["00","19","60","65","80","94","200","499","5000","5999","6600","6699","7000","7999","9500","9899","67000","69999","99000","99999"],"953":["0","0","10","14","51","54","150","509","6000","9499","55000","59999","95000","99999"],"954":["00","28","300","799","2900","2999","8000","8999","9300","9999","90000","92999"],"955":["20","40","550","749","0000","1999","4500","4999","7500","7999","8000","9499","41000","43999","44000","44999","50000","54999","95000","99999"],"956":["00","19","200","699","7000","9999"],"957":["00","02","05","19","21","27","31","43","440","819","0300","0499","2000","2099","8200","9699","28000","30999","97000","99999"],"958":["00","56","600","799","8000","9499","57000","59999","95000","99999"],"959":["00","19","200","699","7000","8499","85000","99999"],"960":["00","19","93","93","200","659","690","699","6600","6899","7000","8499","9400","9799","85000","92999","98000","99999"],"961":["00","19","200","599","6000","8999","90000","94999"],"962":["00","19","200","699","900","999","7000","8499","8700","8999","85000","86999"],"963":["00","19","200","699","7000","8499","9000","9999","85000","89999"],"964":["00","14","150","249","300","549","970","989","2500","2999","5500","8999","9900","9999","90000","96999"],"965":["00","19","200","599","7000","7999","90000","99999"],"966":["00","12","14","14","130","139","170","199","279","289","300","699","910","949","980","999","1500","1699","2000","2789","2900","2999","7000","8999","90000","90999","95000","97999"],"967":["00","00","60","89","300","499","900","989","0100","0999","5000","5999","9900","9989","10000","19999","99900","99999"],"968":["01","39","400","499","800","899","5000","7999","9000","9999"],"969":["0","1","20","22","24","39","400","749","7500","9999","23000","23999"],"970":["01","59","600","899","9000","9099","9700","9999","91000","96999"],"971":["02","02","06","49","97","98","000","015","500","849","0160","0199","0300","0599","8500","9099","9600","9699","9900","9999","91000","95999"],"972":["0","1","20","54","550","799","8000","9499","95000","99999"],"973":["0","0","20","54","100","169","550","759","1700","1999","7600","8499","8900","9499","85000","88999","95000","99999"],"974":["00","19","200","699","7000","8499","9500","9999","85000","89999","90000","94999"],"975":["02","24","250","599","990","999","6000","9199","00000","01999","92000","98999"],"976":["0","3","40","59","600","799","8000","9499","95000","99999"],"977":["00","19","90","99","200","499","700","849","5000","6999","85000","89999"],"978":["000","199","900","999","2000","2999","8000","8999","30000","79999"],"979":["20","29","000","099","400","799","1000","1499","3000","3999","8000","9499","15000","19999","95000","99999"],"980":["00","19","200","599","6000","9999"],"981":["00","11","200","289","290","299","310","399","3000","3099","4000","9999","17000","19999"],"982":["00","09","70","89","100","699","9000","9799","98000","99999"],"983":["00","01","45","49","50","79","020","199","800","899","2000","3999","9000","9899","40000","44999","99000","99999"],"984":["00","39","400","799","8000","8999","90000","99999"],"985":["00","39","400","599","6000","8999","90000","99999"],"986":["00","11","120","559","5600","7999","80000","99999"],"987":["00","09","30","35","40","44","500","899","1000","1999","3600","3999","9000","9499","20000","29999","45000","49999","95000","99999"],"988":["00","11","200","799","8000","9699","12000","14999","15000","16999","17000","19999","97000","99999"],"9925":["0","2","30","54","550","734","7350","9999"],"9926":["0","1","20","39","400","799","8000","9999"],"9927":["00","09","100","399","4000","4999"],"9929":["0","3","40","54","550","799","8000","9999"],"9930":["00","49","500","939","9400","9999"],"9931":["00","29","300","899","9000","9999"],"9932":["00","39","400","849","8500","9999"],"9933":["0","0","10","39","400","899","9000","9999"],"9934":["0","0","10","49","500","799","8000","9999"],"9937":["0","2","30","49","500","799","8000","9999"],"9938":["00","79","800","949","9500","9999"],"9939":["0","4","50","79","800","899","9000","9999"],"9940":["0","1","20","49","500","899","9000","9999"],"9942":["00","84","900","984","8500","8999","9850","9999"],"9943":["00","29","300","399","975","999","4000","9749"],"9944":["60","69","80","89","100","499","700","799","900","999","0000","0999","5000","5999"],"9945":["00","00","08","39","57","57","010","079","400","569","580","849","8500","9999"],"9946":["0","1","20","39","400","899","9000","9999"],"9947":["0","1","20","79","800","999"],"9949":["0","0","10","39","75","89","400","749","9000","9999"],"9950":["00","29","300","849","8500","9999"],"9953":["0","0","10","39","60","89","400","599","9000","9999"],"9955":["00","39","400","929","9300","9999"],"9957":["00","39","70","84","88","99","400","699","8500","8799"],"9958":["00","01","10","18","20","49","020","029","040","089","500","899","0300","0399","0900","0999","1900","1999","9000","9999"],"9959":["0","1","20","79","98","99","800","949","970","979","9500","9699"],"9960":["00","59","600","899","9000","9999"],"9961":["0","2","30","69","700","949","9500","9999"],"9962":["00","54","56","59","600","849","5500","5599","8500","9999"],"9963":["0","1","30","54","250","279","550","734","2000","2499","2800","2999","7350","7499","7500","9999"],"9964":["0","6","70","94","950","999"],"9965":["00","39","400","899","9000","9999"],"9966":["20","69","000","149","750","959","1500","1999","7000","7499","9600","9999"],"9971":["0","5","60","89","900","989","9900","9999"],"9972":["1","1","00","09","30","59","200","249","600","899","2500","2999","9000","9999"],"9973":["00","05","10","69","060","089","700","969","0900","0999","9700","9999"],"9974":["0","2","30","54","95","99","550","749","7500","9499"],"9975":["0","0","45","89","100","299","900","949","3000","3999","4000","4499","9500","9999"],"9977":["00","89","900","989","9900","9999"],"9978":["00","29","40","94","300","399","950","989","9900","9999"],"9979":["0","4","50","64","66","75","650","659","760","899","9000","9999"],"9980":["0","3","40","89","900","989","9900","9999"],"9981":["00","09","20","79","100","159","800","949","1600","1999","9500","9999"],"9982":["00","79","800","989","9900","9999"],"9983":["80","94","950","989","9900","9999"],"9984":["00","49","500","899","9000","9999"],"9986":["00","39","97","99","400","899","940","969","9000","9399"],"9987":["00","39","400","879","8800","9999"],"9988":["0","2","30","54","550","749","7500","9999"],"9989":["0","0","30","59","100","199","600","949","2000","2999","9500","9999"],"99901":["00","49","80","99","500","799"],"99903":["0","1","20","89","900","999"],"99904":["0","5","60","89","900","999"],"99905":["0","3","40","79","800","999"],"99906":["0","2","30","59","70","89","90","94","600","699","950","999"],"99908":["0","0","10","89","900","999"],"99909":["0","3","40","94","950","999"],"99910":["0","2","30","89","900","999"],"99911":["00","59","600","999"],"99912":["0","3","60","89","400","599","900","999"],"99913":["0","2","30","35","600","604"],"99914":["0","4","50","89","900","999"],"99915":["0","4","50","79","800","999"],"99916":["0","2","30","69","700","999"],"99919":["0","2","40","69","70","79","300","399","800","849","850","899","900","999"],"99921":["0","1","8","8","20","69","90","99","700","799"],"99922":["0","3","40","69","700","999"],"99926":["0","0","10","59","87","89","90","99","600","869"],"99927":["0","2","30","59","600","999"],"99928":["0","0","10","79","800","999"],"99932":["0","0","7","7","10","59","80","99","600","699"],"99935":["0","2","7","8","30","59","90","99","600","699"],"99936":["0","0","10","59","600","999"],"99937":["0","1","20","59","600","999"],"99938":["0","1","20","59","90","99","600","899"],"99940":["0","0","10","69","700","999"],"99941":["0","2","30","79","800","999"],"99953":["0","2","30","79","94","99","800","939"],"99954":["0","2","30","69","88","99","700","879"],"99955":["0","1","20","59","80","99","600","799"],"99956":["00","59","86","99","600","859"],"99958":["0","4","50","93","940","949","950","999"],"99960":["0","0","10","94","950","999"],"99961":["0","3","40","89","900","999"],"99963":["00","49","92","99","500","919"],"99966":["0","2","30","69","80","94","700","799"],"99967":["0","1","20","59","600","899"],"99971":["0","5","60","84","850","999"],"99974":["40","79","800","999"],"99976":["0","1","20","59","600","799"]},"979":{"10":["00","19","200","699","7000","8999","90000","97599","976000","999999"],"11":["00","24","250","549","5500","8499","85000","94999","950000","999999"],"12":["200","200"]}};
		ranges['978']['99968']=ranges['978']['99912'];ranges['978']['9935']=ranges['978']['9941']=ranges['978']['9956']=ranges['978']['9933'];ranges['978']['9976']=ranges['978']['9971'];ranges['978']['99949']=ranges['978']['99903'];ranges['978']['9968']=ranges['978']['9930'];ranges['978']['99929']=ranges['978']['99930']=ranges['978']['99931']=ranges['978']['99942']=ranges['978']['99944']=ranges['978']['99948']=ranges['978']['99950']=ranges['978']['99952']=ranges['978']['99962']=ranges['978']['99969']=ranges['978']['99915'];ranges['978']['99917']=ranges['978']['99910'];ranges['978']['99920']=ranges['978']['99970']=ranges['978']['99972']=ranges['978']['99914'];ranges['978']['99933']=ranges['978']['99943']=ranges['978']['99946']=ranges['978']['99959']=ranges['978']['99927'];ranges['978']['81']=ranges['978']['80'];ranges['978']['9967']=ranges['978']['9970']=ranges['978']['9965'];ranges['978']['9936']=ranges['978']['9952']=ranges['978']['9954']=ranges['978']['9926'];ranges['978']['99965']=ranges['978']['99922'];ranges['978']['9928']=ranges['978']['9927'];ranges['978']['99947']=ranges['978']['99916'];ranges['978']['9985']=ranges['978']['9939'];ranges['978']['99918']=ranges['978']['99925']=ranges['978']['99973']=ranges['978']['99975']=ranges['978']['99905'];ranges['978']['99939']=ranges['978']['99945']=ranges['978']['99904'];ranges['978']['989']=ranges['978']['972'];ranges['978']['620']=ranges['978']['613'];ranges['978']['4']=ranges['978']['0'];ranges['978']['99923']=ranges['978']['99924']=ranges['978']['99934']=ranges['978']['99957']=ranges['978']['99964']=ranges['978']['9947'];ranges['978']['614']=ranges['978']['609'];ranges['978']['9948']=ranges['978']['9951']=ranges['978']['9932'];
		return ranges;
	})();
	var ranges = ISBN.ranges,
		parts = [],
		uccPref,
		i = 0;
	if (isbn.length == 10) {
		uccPref = '978';
	} else {
		uccPref = isbn.substr(0,3);
		if (!ranges[uccPref]) return ''; // Probably invalid ISBN, but the checksum is OK
		parts.push(uccPref);
		i = 3; // Skip ahead
	}
	
	var group = '',
		found = false;
	while (i < isbn.length-3 /* check digit, publication, registrant */) {
		group += isbn.charAt(i);
		if (ranges[uccPref][group]) {
			parts.push(group);
			found = true;
			break;
		}
		i++;
	}
	
	if (!found) return ''; // Did not find a valid group
	
	// Array of registrant ranges that are valid for a group
	// Array always contains an even number of values (as string)
	// From left to right, the values are paired so that the first indicates a
	// lower bound of the range and the right indicates an upper bound
	// The ranges are sorted by increasing number of characters
	var regRanges = ranges[uccPref][group];
	
	var registrant = '';
	found = false;
	i++; // Previous loop 'break'ed early
	while (!found && i < isbn.length-2 /* check digit, publication */) {
		registrant += isbn.charAt(i);
		
		for(let j=0; j < regRanges.length && registrant.length >= regRanges[j].length; j+=2) {
			if(registrant.length == regRanges[j].length
				&& registrant >= regRanges[j] && registrant <= regRanges[j+1] // Falls within the range
			) {
				parts.push(registrant);
				found = true;
				break;
			}
		}
		
		i++;
	}
	
	if (!found) return ''; // Outside of valid range, but maybe we need to update our data
	
	parts.push(isbn.substring(i,isbn.length-1)); // Publication is the remainder up to last digit
	parts.push(isbn.charAt(isbn.length-1)); // Check digit
	
	return parts.join('-');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/489605",
		"items": [
			{
				"itemType": "book",
				"title": "Argentina",
				"creators": [
					{
						"firstName": "Arthur Preston",
						"lastName": "Whitaker",
						"creatorType": "author"
					}
				],
				"date": "1964",
				"abstractNote": "\"This book delves into the Argentine past seeking the origins of the political, social, and economic conflicts that have stunted Argentina's development after her spectacular progress during the late nineteenth and early twentieth centuries\"--From book jacket",
				"extra": "OCLC: 489605",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "184",
				"place": "Englewood Cliffs, N.J.",
				"publisher": "Prentice-Hall",
				"series": "Spectrum book",
				"attachments": [],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Argentina Historia 1810-"
					},
					{
						"tag": "Argentina History"
					},
					{
						"tag": "Argentina History 1810-"
					},
					{
						"tag": "Argentine Histoire"
					},
					{
						"tag": "Argentine Histoire 1810-"
					},
					{
						"tag": "Economic history Argentina"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Politics and government Argentina"
					},
					{
						"tag": "Since 1810"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/42854423",
		"items": [
			{
				"itemType": "book",
				"title": "A dynamic systems approach to the development of cognition and action",
				"creators": [
					{
						"firstName": "Esther",
						"lastName": "Thelen",
						"creatorType": "author"
					},
					{
						"firstName": "Linda B.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780585030159",
				"abstractNote": "Annotation. A Dynamic Systems Approach to the Development of Cognition and Action presents a comprehensive and detailed theory of early human development based on the principles of dynamic systems theory. Beginning with their own research in motor, perceptual, and cognitive development, Thelen and Smith raise fundamental questions about prevailing assumptions in the field. They propose a new theory of the development of cognition and action, unifying recent advances in dynamic systems theory with current research in neuroscience and neural development. In particular, they show how by processes of exploration and selection, multimodal experiences form the bases for self-organizing perception-action categories. Thelen and Smith offer a radical alternative to current cognitive theory, both in their emphasis on dynamic representation and in their focus on processes of change. Among the first attempt to apply complexity theory to psychology, they suggest reinterpretations of several classic issues in early cognitive development. The book is divided into three sections. The first discusses the nature of developmental processes in general terms, the second covers dynamic principles in process and mechanism, and the third looks at how a dynamic theory can be applied to enduring puzzles of development. Cognitive Psychology series",
				"edition": "1st MIT pbk. ed",
				"extra": "OCLC: 42854423",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "376",
				"place": "Cambridge, Mass.",
				"publisher": "MIT Press",
				"series": "MIT Press/Bradford Books series in cognitive psychology",
				"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
				"attachments": [],
				"tags": [
					{
						"tag": "Activité motrice"
					},
					{
						"tag": "Activité motrice chez le nourrisson"
					},
					{
						"tag": "Child"
					},
					{
						"tag": "Child Development"
					},
					{
						"tag": "Child development"
					},
					{
						"tag": "Children"
					},
					{
						"tag": "Cognition"
					},
					{
						"tag": "Cognition chez le nourrisson"
					},
					{
						"tag": "Cognition in infants"
					},
					{
						"tag": "Developmental psychobiology"
					},
					{
						"tag": "Electronic books"
					},
					{
						"tag": "Enfants"
					},
					{
						"tag": "Enfants Développement"
					},
					{
						"tag": "FAMILY & RELATIONSHIPS Life Stages Infants & Toddlers"
					},
					{
						"tag": "Infant"
					},
					{
						"tag": "Infants"
					},
					{
						"tag": "Motor Skills"
					},
					{
						"tag": "Motor ability"
					},
					{
						"tag": "Motor ability in infants"
					},
					{
						"tag": "Nourrissons"
					},
					{
						"tag": "Perceptual-motor processes"
					},
					{
						"tag": "Processus perceptivomoteurs"
					},
					{
						"tag": "Psychobiologie du développement"
					},
					{
						"tag": "System theory"
					},
					{
						"tag": "Systems Theory"
					},
					{
						"tag": "Théorie des systèmes"
					},
					{
						"tag": "children (people by age group)"
					},
					{
						"tag": "cognition"
					},
					{
						"tag": "infants"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/60321422",
		"items": [
			{
				"itemType": "book",
				"title": "The Cambridge companion to Adam Smith",
				"creators": [
					{
						"firstName": "Knud",
						"lastName": "Haakonssen",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISBN": "9780521770590",
				"abstractNote": "\"Adam Smith is best known as the founder of scientific economics and as an early proponent of the modern market economy. Political economy, however, was only one part of Smith's comprehensive intellectual system. Consisting of a theory of mind and its functions in language, arts, science, and social intercourse, Smith's system was a towering contribution to the Scottish Enlightenment. His ideas on social intercourse, in fact, also served as the basis for a moral theory that provided both historical and theoretical accounts of law, politics, and economics. This companion volume provides an up-to-date examination of all aspects of Smith's thought. Collectively, the essays take into account Smith's multiple contexts - Scottish, British, European, Atlantic, biographical, institutional, political, philosophical - and they draw on all his works, including student notes from his lectures. Pluralistic in approach, the volume provides a contextualist history of Smith, as well as direct philosophical engagement with his ideas.\"--Jacket",
				"extra": "OCLC: 60321422",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "409",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"series": "Cambridge companions to philosophy",
				"url": "http://catdir.loc.gov/catdir/toc/ecip0512/2005011910.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Aufsatzsammlung"
					},
					{
						"tag": "Filosofie"
					},
					{
						"tag": "Smith, Adam"
					},
					{
						"tag": "Smith, Adam 1723-1790"
					},
					{
						"tag": "Smith, Adam Philosoph"
					},
					{
						"tag": "Smith, Adam, 1723-1790"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/from-lanka-eastwards-the-ramayana-in-the-literature-and-visual-arts-of-indonesia/oclc/765821302",
		"items": [
			{
				"itemType": "book",
				"title": "From Laṅkā eastwards: the Rāmāyaṇa in the literature and visual arts of Indonesia",
				"creators": [
					{
						"firstName": "Andrea",
						"lastName": "Acri",
						"creatorType": "author"
					},
					{
						"firstName": "Helen",
						"lastName": "Creese",
						"creatorType": "author"
					},
					{
						"firstName": "Arlo",
						"lastName": "Griffiths",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISBN": "9789067183840",
				"extra": "OCLC: 765821302",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "259",
				"place": "Leiden",
				"publisher": "KITLV Press",
				"series": "Verhandelingen van het Koninklijk Instituut voor Taal-, Land- en Volkenkunde",
				"shortTitle": "From Laṅkā eastwards",
				"attachments": [],
				"tags": [
					{
						"tag": "Art indonésien Congrès"
					},
					{
						"tag": "Art, Indonesian"
					},
					{
						"tag": "Art, Indonesian Congresses"
					},
					{
						"tag": "Conference papers and proceedings"
					},
					{
						"tag": "Epen (teksten)"
					},
					{
						"tag": "History Sources"
					},
					{
						"tag": "Kakawin Ramayana"
					},
					{
						"tag": "Kunst"
					},
					{
						"tag": "Literatur"
					},
					{
						"tag": "Râmâyaṇa (Old Javanese kakawin)"
					},
					{
						"tag": "Râmâyaṇa (Old Javanese kakawin) Congresses"
					},
					{
						"tag": "Râmâyaṇa (Old Javanese kakawin) Sources Congresses"
					},
					{
						"tag": "Rezeption"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/newmans-relation-to-modernism/oclc/676747555",
		"items": [
			{
				"itemType": "book",
				"title": "Newman's relation to modernism",
				"creators": [
					{
						"firstName": "Sydney F.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1912",
				"extra": "OCLC: 847984210",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "1",
				"place": "London",
				"publisher": "publisher not identified",
				"url": "https://archive.org/details/a626827800smituoft/",
				"attachments": [],
				"tags": [
					{
						"tag": "Modernism (Christian theology) Catholic Church"
					},
					{
						"tag": "Newman, John Henry, Saint, 1801-1890"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/48394842",
		"items": [
			{
				"itemType": "book",
				"title": "Cahokia Mounds replicas",
				"creators": [
					{
						"firstName": "Martha LeeAnn",
						"lastName": "Grimont",
						"creatorType": "author"
					},
					{
						"firstName": "Claudia Gellman",
						"lastName": "Mink",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"ISBN": "9781881563020",
				"extra": "OCLC: 48394842",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "10",
				"place": "Collinsville, Ill.",
				"publisher": "Cahokia Mounds Museum Society",
				"attachments": [],
				"tags": [
					{
						"tag": "Antiquities"
					},
					{
						"tag": "Cahokia Mounds State Historic Park (Ill.)"
					},
					{
						"tag": "Cahokia Mounds State Historic Park (Ill.) Antiquities Pottery"
					},
					{
						"tag": "Illinois"
					},
					{
						"tag": "Illinois Antiquities Pottery"
					},
					{
						"tag": "Illinois Cahokia Mounds State Historic Park"
					},
					{
						"tag": "Indians of North America Antiquities"
					},
					{
						"tag": "Indians of North America Illinois Antiquities"
					},
					{
						"tag": "Mound-builders"
					},
					{
						"tag": "Mound-builders Illinois"
					},
					{
						"tag": "Mounds"
					},
					{
						"tag": "Mounds Illinois"
					},
					{
						"tag": "Pottery"
					},
					{
						"tag": "Pottery Illinois"
					},
					{
						"tag": "Tumulus Illinois"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9780585030159"
		},
		"items": [
			{
				"itemType": "book",
				"title": "A dynamic systems approach to the development of cognition and action",
				"creators": [
					{
						"firstName": "Esther",
						"lastName": "Thelen",
						"creatorType": "author"
					},
					{
						"firstName": "Linda B.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780585030159",
				"abstractNote": "Annotation. A Dynamic Systems Approach to the Development of Cognition and Action presents a comprehensive and detailed theory of early human development based on the principles of dynamic systems theory. Beginning with their own research in motor, perceptual, and cognitive development, Thelen and Smith raise fundamental questions about prevailing assumptions in the field. They propose a new theory of the development of cognition and action, unifying recent advances in dynamic systems theory with current research in neuroscience and neural development. In particular, they show how by processes of exploration and selection, multimodal experiences form the bases for self-organizing perception-action categories. Thelen and Smith offer a radical alternative to current cognitive theory, both in their emphasis on dynamic representation and in their focus on processes of change. Among the first attempt to apply complexity theory to psychology, they suggest reinterpretations of several classic issues in early cognitive development. The book is divided into three sections. The first discusses the nature of developmental processes in general terms, the second covers dynamic principles in process and mechanism, and the third looks at how a dynamic theory can be applied to enduring puzzles of development. Cognitive Psychology series",
				"edition": "1st MIT pbk. ed",
				"extra": "OCLC: 42854423",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"place": "Cambridge, Mass.",
				"publisher": "MIT Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"identifiers": {
				"oclc": "42854423"
			}
		},
		"items": [
			{
				"itemType": "book",
				"title": "A dynamic systems approach to the development of cognition and action",
				"creators": [
					{
						"firstName": "Esther",
						"lastName": "Thelen",
						"creatorType": "author"
					},
					{
						"firstName": "Linda B.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780585030159",
				"abstractNote": "Annotation. A Dynamic Systems Approach to the Development of Cognition and Action presents a comprehensive and detailed theory of early human development based on the principles of dynamic systems theory. Beginning with their own research in motor, perceptual, and cognitive development, Thelen and Smith raise fundamental questions about prevailing assumptions in the field. They propose a new theory of the development of cognition and action, unifying recent advances in dynamic systems theory with current research in neuroscience and neural development. In particular, they show how by processes of exploration and selection, multimodal experiences form the bases for self-organizing perception-action categories. Thelen and Smith offer a radical alternative to current cognitive theory, both in their emphasis on dynamic representation and in their focus on processes of change. Among the first attempt to apply complexity theory to psychology, they suggest reinterpretations of several classic issues in early cognitive development. The book is divided into three sections. The first discusses the nature of developmental processes in general terms, the second covers dynamic principles in process and mechanism, and the third looks at how a dynamic theory can be applied to enduring puzzles of development. Cognitive Psychology series",
				"edition": "1st MIT pbk. ed",
				"extra": "OCLC: 42854423",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"place": "Cambridge, Mass.",
				"publisher": "MIT Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/4933578953",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Navigating the trilemma: Capital flows and monetary policy in China",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Reuven",
						"lastName": "Glick"
					},
					{
						"creatorType": "author",
						"firstName": "Michael",
						"lastName": "Hutchison"
					}
				],
				"date": "5/2009",
				"DOI": "10.1016/j.asieco.2009.02.011",
				"ISSN": "10490078",
				"issue": "3",
				"journalAbbreviation": "Journal of Asian Economics",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "205-224",
				"publicationTitle": "Journal of Asian Economics",
				"shortTitle": "Navigating the trilemma",
				"url": "https://linkinghub.elsevier.com/retrieve/pii/S104900780900013X",
				"volume": "20",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?q=isbn%3A7112062314",
		"items": [
			{
				"itemType": "book",
				"title": "中囯园林假山",
				"creators": [
					{
						"lastName": "毛培琳",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "朱志红",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2005",
				"ISBN": "9787112062317",
				"extra": "OCLC: 77641948",
				"language": "Chinese",
				"libraryCatalog": "Open WorldCat",
				"place": "北京",
				"publisher": "中囯建筑工业出版社",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/994342191",
		"items": [
			{
				"itemType": "book",
				"title": "Medieval science, technology and medicine: an encyclopedia",
				"creators": [
					{
						"firstName": "Thomas F.",
						"lastName": "Glick",
						"creatorType": "editor"
					},
					{
						"firstName": "Steven J.",
						"lastName": "Livesey",
						"creatorType": "editor"
					},
					{
						"firstName": "Faith",
						"lastName": "Wallis",
						"creatorType": "editor"
					}
				],
				"date": "2017",
				"ISBN": "9781315165127",
				"abstractNote": "\"First published in 2005, this encyclopedia demonstrates that the millennium from the fall of the Roman Empire to the Renaissance was a period of great intellectual and practical achievement and innovation. In Europe, the Islamic world, South and East Asia, and the Americas, individuals built on earlier achievements, introduced sometimes radical refinements and laid the foundations for modern development. Medieval Science, Technology, and Medicine details the whole scope of scientific knowledge in the medieval period in more than 300 A to Z entries. This comprehensive resource discusses the research, application of knowledge, cultural and technology exchanges, experimentation, and achievements in the many disciplines related to science and technology. It also looks at the relationship between medieval science and the traditions it supplanted. Written by a select group of international scholars, this reference work will be of great use to scholars, students, and general readers researching topics in many fields, including medieval studies, world history, history of science, history of technology, history of medicine, and cultural studies.\"--Provided by publisher",
				"extra": "OCLC: 994342191",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "598",
				"place": "London",
				"publisher": "Routledge",
				"series": "Routledge revivals",
				"shortTitle": "Medieval science, technology and medicine",
				"url": "https://www.taylorfrancis.com/books/e/9781315165127",
				"attachments": [],
				"tags": [
					{
						"tag": "Electronic books"
					},
					{
						"tag": "Encyclopedias"
					},
					{
						"tag": "Medicine, Medieval"
					},
					{
						"tag": "Medicine, Medieval Encyclopedias"
					},
					{
						"tag": "Médecine médiévale Encyclopédies"
					},
					{
						"tag": "Science, Medieval"
					},
					{
						"tag": "Science, Medieval Encyclopedias"
					},
					{
						"tag": "Sciences médiévales Encyclopédies"
					},
					{
						"tag": "Technologie Encyclopédies"
					},
					{
						"tag": "Technology"
					},
					{
						"tag": "Technology Encyclopedias"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://worldcat.org/title/1023201734",
		"items": [
			{
				"itemType": "book",
				"title": "Alices adventures in wonderland",
				"creators": [
					{
						"firstName": "Lewis",
						"lastName": "Carroll",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Ingpen",
						"creatorType": "contributor"
					}
				],
				"date": "2017",
				"ISBN": "9781786751041",
				"abstractNote": "This edition brings together the complete and unabridged text with more than 70 stunning illustrations by Robert Ingpen, each reflecting his unique style and extraordinary imagination in visualising this enchanting story.",
				"extra": "OCLC: 1023201734",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "192",
				"publisher": "Palazzo Editions Ltd",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/fr/title/960449363",
		"items": [
			{
				"itemType": "book",
				"title": "غرفة واحدة لا تكفي: رواية",
				"creators": [
					{
						"lastName": "سلطان العميمي.",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "عميمي، سلطان علي بن بخيت، 1974-",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2016",
				"ISBN": "9786140214255",
				"edition": "al-Ṭabʻah al-thāniyah",
				"extra": "OCLC: 960449363",
				"language": "ara",
				"libraryCatalog": "Open WorldCat",
				"numPages": "212",
				"place": "Bayrūt, al-Jazāʼir al-ʻĀṣimah",
				"publisher": "منشورات ضفاف ؛ منشورات الاختلاف،",
				"shortTitle": "غرفة واحدة لا تكفي",
				"attachments": [],
				"tags": [
					{
						"tag": "2000-2099"
					},
					{
						"tag": "Arabic fiction"
					},
					{
						"tag": "Arabic fiction 21st century"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Novels"
					},
					{
						"tag": "Roman arabe 21e siècle"
					},
					{
						"tag": "Romans"
					},
					{
						"tag": "novels"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
